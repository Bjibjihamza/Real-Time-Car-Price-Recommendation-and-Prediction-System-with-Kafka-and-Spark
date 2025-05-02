import uuid
import numpy as np
import pandas as pd
from datetime import datetime
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.decomposition import NMF
from scipy.sparse import csr_matrix
from collections import defaultdict
import logging
import warnings

warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cassandra connection
def connect_to_cassandra():
    try:
        cluster = Cluster(['localhost'], protocol_version=5)
        session = cluster.connect('cars_keyspace')
        logger.info("Connected to Cassandra")
        return session
    except Exception as e:
        logger.error(f"Failed to connect to Cassandra: {e}")
        raise

# Validate UUID
def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

# Preprocess car data with price and mileage constraints
def preprocess_car_data(session, user_features, batch_size=1000):
    cars_data = []
    car_ids = []
    last_token = None
    query_base = "SELECT * FROM cars_keyspace.cleaned_cars"
    
    budget_min = user_features.get('budget_min', 0)
    budget_max = user_features.get('budget_max', float('inf'))
    mileage_min = user_features.get('mileage_min', 0)
    mileage_max = user_features.get('mileage_max', float('inf'))
    
    while True:
        if last_token:
            query = f"{query_base} WHERE token(id) > token(?) LIMIT {batch_size}"
            stmt = SimpleStatement(query, fetch_size=batch_size)
            rows = session.execute(stmt, [last_token])
        else:
            query = f"{query_base} LIMIT {batch_size}"
            stmt = SimpleStatement(query, fetch_size=batch_size)
            rows = session.execute(stmt)
        
        batch_rows = list(rows)
        if not batch_rows:
            break
        
        for row in batch_rows:
            if not is_valid_uuid(row.id):
                logger.warning(f"Invalid car_id in cleaned_cars: {row.id}")
                continue
            
            price = row.price if row.price is not None else 0
            mileage = row.mileage if row.mileage is not None else 0
            
            # Filter cars based on user budget and mileage preferences
            if not (budget_min <= price <= budget_max and mileage_min <= mileage <= mileage_max):
                continue
            
            equipment_score = 0
            if row.equipment and row.equipment.strip() and row.equipment not in ['"NaN"', 'null', '']:
                try:
                    equipment = [item.strip() for item in row.equipment.split(',') if item.strip()]
                    equipment_score = len(equipment)
                except Exception as e:
                    logger.warning(f"Failed to parse equipment for car {row.id}: {e}")
            
            try:
                pub_date = datetime.strptime(row.publication_date, '%d/%m/%Y %H:%M') if row.publication_date else None
                publication_age = (datetime.now() - pub_date).days if pub_date else 365
            except (ValueError, TypeError):
                publication_age = 365
            
            cars_data.append({
                'car_id': str(row.id),
                'price': price,
                'mileage': mileage,
                'year': row.year if row.year is not None else 2000,
                'door_count': row.door_count if row.door_count is not None else 4,
                'fiscal_power': row.fiscal_power if row.fiscal_power is not None else 0,
                'brand': row.brand if row.brand else 'Unknown',
                'model': row.model if row.model else 'Unknown',
                'fuel_type': row.fuel_type if row.fuel_type else 'Unknown',
                'transmission': row.transmission if row.transmission else 'Unknown',
                'condition': row.condition if row.condition else 'Unknown',
                'first_owner': 1 if row.first_owner == 'Oui' else 0,
                'equipment_score': equipment_score,
                'publication_age': publication_age
            })
            car_ids.append(str(row.id))
        
        last_token = batch_rows[-1].id
        logger.info(f"Fetched {len(batch_rows)} cars, last token: {last_token}")
        
        if len(batch_rows) < batch_size:
            break
    
    if not cars_data:
        logger.warning("No cars found in cleaned_cars table within user preferences.")
        return pd.DataFrame(), [], {}, {}
    
    cars_df = pd.DataFrame(cars_data)
    
    cars_df['car_age'] = 2025 - cars_df['year']
    cars_df['luxury_score'] = cars_df['brand'].isin(['mercedes-benz', 'bmw', 'audi']).astype(int)
    
    categorical_columns = ['brand', 'model', 'fuel_type', 'transmission', 'condition']
    label_encoders = {}
    for col in categorical_columns:
        le = LabelEncoder()
        cars_df[col + '_encoded'] = le.fit_transform(cars_df[col])
        label_encoders[col] = le
    
    numerical_columns = ['price', 'mileage', 'year', 'door_count', 'fiscal_power', 'equipment_score', 
                        'publication_age', 'car_age']
    scaler = StandardScaler()
    cars_df[numerical_columns] = scaler.fit_transform(cars_df[numerical_columns])
    
    brand_map = {brand: idx for idx, brand in enumerate(cars_df['brand'].unique())}
    model_map = {model: idx for idx, model in enumerate(cars_df['model'].unique())}
    
    return cars_df, car_ids, brand_map, model_map

# User feature extraction
def get_user_features(session, user_id):
    try:
        user_id_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
    except ValueError:
        logger.error(f"Invalid user_id format: {user_id}")
        return None
    
    user_id_text = str(user_id_uuid)
    user_features = {
        'user_id': user_id_text,
        'budget_min': 0,
        'budget_max': float('inf'),
        'mileage_min': 0,
        'mileage_max': float('inf'),
        'preferred_brands': set(),
        'preferred_fuel_types': set(),
        'preferred_transmissions': set(),
        'preferred_door_count': set(),
        'preferred_years': set(),
        'views': {},
        'favorites': set(),
        'location': 'Unknown',
        'age': 30
    }

    # Fetch user data
    user_query = "SELECT age, location FROM cars_keyspace.users WHERE user_id = ?"
    try:
        user_stmt = session.prepare(user_query)
        user = session.execute(user_stmt, [user_id_uuid]).one()
        if user:
            user_features['age'] = user.age if user.age is not None else 30
            user_features['location'] = user.location if user.location else 'Unknown'
    except Exception as e:
        logger.error(f"Error fetching user data for {user_id_uuid}: {e}")

    # Fetch preferences
    pref_query = "SELECT budget_min, budget_max, mileage_min, mileage_max, preferred_brands, preferred_fuel_types, preferred_transmissions, preferred_door_count, preferred_years FROM cars_keyspace.user_preferences WHERE user_id = ?"
    try:
        pref_stmt = session.prepare(pref_query)
        prefs = session.execute(pref_stmt, [user_id_uuid]).one()
        if prefs:
            user_features.update({
                'budget_min': prefs.budget_min if prefs.budget_min is not None else 0,
                'budget_max': prefs.budget_max if prefs.budget_max is not None else float('inf'),
                'mileage_min': prefs.mileage_min if prefs.mileage_min is not None else 0,
                'mileage_max': prefs.mileage_max if prefs.mileage_max is not None else float('inf'),
                'preferred_brands': set(prefs.preferred_brands) if prefs.preferred_brands else set(),
                'preferred_fuel_types': set(prefs.preferred_fuel_types) if prefs.preferred_fuel_types else set(),
                'preferred_transmissions': set(prefs.preferred_transmissions) if prefs.preferred_transmissions else set(),
                'preferred_door_count': set(prefs.preferred_door_count) if prefs.preferred_door_count else set(),
                'preferred_years': set(prefs.preferred_years) if prefs.preferred_years else set()
            })
    except Exception as e:
        logger.error(f"Error fetching preferences for {user_id_uuid}: {e}")

    # Fetch views
    view_query = "SELECT car_id, view_duration_seconds FROM cars_keyspace.car_views_by_user WHERE user_id = ?"
    try:
        view_stmt = session.prepare(view_query)
        views = session.execute(view_stmt, [user_id_text])
        user_features['views'] = {str(view.car_id): view.view_duration_seconds for view in views}
    except Exception as e:
        logger.error(f"Error fetching views for {user_id_text}: {e}")

    # Fetch favorites
    fav_query = "SELECT car_id FROM cars_keyspace.favorite_cars_by_user WHERE user_id = ?"
    try:
        fav_stmt = session.prepare(fav_query)
        favorites = session.execute(fav_stmt, [user_id_uuid])
        user_features['favorites'] = {str(fav.car_id) for fav in favorites}
    except Exception as e:
        logger.error(f"Error fetching favorites for {user_id_uuid}: {e}")

    return user_features

# Matrix factorization with NMF
def matrix_factorization(session, car_ids, n_components=50):
    query = "SELECT user_id, car_id, view_duration_seconds FROM cars_keyspace.car_views_by_user"
    stmt = SimpleStatement(query, fetch_size=1000)
    views = session.execute(stmt)
    
    user_ids = set()
    user_item_data = []
    for view in views:
        if is_valid_uuid(view.car_id):
            user_ids.add(str(view.user_id))
            user_item_data.append((str(view.user_id), str(view.car_id), view.view_duration_seconds / 3600.0))
    
    user_ids = list(user_ids)
    user_id_map = {uid: i for i, uid in enumerate(user_ids)}
    car_id_map = {cid: i for i, cid in enumerate(car_ids)}
    
    rows, cols, data = [], [], []
    for uid, cid, rating in user_item_data:
        if cid in car_id_map:
            rows.append(user_id_map[uid])
            cols.append(car_id_map[cid])
            data.append(max(rating, 0))
    
    user_item_matrix = csr_matrix((data, (rows, cols)), shape=(len(user_ids), len(car_ids)))
    
    nmf = NMF(n_components=n_components, init='random', random_state=42, max_iter=200)
    user_factors = nmf.fit_transform(user_item_matrix)
    item_factors = nmf.components_.T
    
    return user_factors, item_factors, user_id_map, car_id_map

# Enhanced cluster-based recommendations
def cluster_based_recommendations(session, cars_df, car_ids, user_features, n_clusters=10):
    features = cars_df.drop(['car_id', 'brand', 'model', 'fuel_type', 'transmission', 'condition'], axis=1)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    car_clusters = kmeans.fit_predict(features)
    
    cluster_scores = defaultdict(float)
    query = "SELECT car_id, view_duration_seconds FROM cars_keyspace.car_views_by_user WHERE user_id = ?"
    stmt = session.prepare(query)
    views = session.execute(stmt, [user_features['user_id']])
    
    for view in views:
        if is_valid_uuid(view.car_id) and view.car_id in cars_df['car_id'].values:
            car_idx = cars_df[cars_df['car_id'] == view.car_id].index[0]
            cluster = car_clusters[car_idx]
            cluster_scores[cluster] += view.view_duration_seconds / 3600.0
    
    # Boost clusters with preferred brands
    for idx, row in cars_df.iterrows():
        cluster = car_clusters[idx]
        if row['brand'] in user_features['preferred_brands']:
            cluster_scores[cluster] += 1.0
    
    scores = []
    for idx, car_id in enumerate(car_ids):
        cluster = car_clusters[idx]
        scores.append(cluster_scores[cluster])
    
    scores = np.array(scores)
    if scores.max() > scores.min():
        scores = (scores - scores.min()) / (scores.max() - scores.min())
    
    return scores, car_clusters

# Enhanced content-based scoring
def content_based_scoring(user_features, cars_df):
    scores = []
    for _, car in cars_df.iterrows():
        score = 0
        scaled_price = car['price'] * 1000000
        if user_features['budget_min'] <= scaled_price <= user_features['budget_max']:
            score += 0.4
        scaled_mileage = car['mileage'] * 100000
        if user_features['mileage_min'] <= scaled_mileage <= user_features['mileage_max']:
            score += 0.3
        if car['brand'] in user_features['preferred_brands']:
            score += 0.25
        if car['fuel_type'] in user_features['preferred_fuel_types']:
            score += 0.15
        if car['transmission'] in user_features['preferred_transmissions']:
            score += 0.1
        if int(car['door_count'] * 10) in user_features['preferred_door_count']:
            score += 0.08
        if int(car['year']) in user_features['preferred_years']:
            score += 0.1
        if car['condition'] == 'Excellent':
            score += 0.07
        if car['first_owner'] == 1:
            score += 0.07
        if car['luxury_score'] == 1 and user_features['age'] < 30:
            score += 0.1
        if 'casablanca' in user_features['location'].lower() or 'rabat' in user_features['location'].lower():
            if car['fuel_type'] in ['hybride', 'electrique']:
                score += 0.15
        scores.append(score)
    return np.array(scores)

# Generate recommendations
def generate_recommendations(session, user_id, top_n=10):
    logger.info(f"Generating recommendations for user {user_id}")
    start_time = datetime.now()
    
    user_features = get_user_features(session, user_id)
    if not user_features:
        logger.warning(f"No user data for {user_id}, using cold start")
        query = "SELECT car_id, SUM(view_duration_seconds) as total_views FROM cars_keyspace.car_views_by_user GROUP BY car_id"
        stmt = SimpleStatement(query, fetch_size=1000)
        views = session.execute(stmt)
        view_scores = {str(view.car_id): view.total_views / 3600.0 for view in views if is_valid_uuid(view.car_id)}
        car_ids = list(view_scores.keys())
        cars_df = pd.DataFrame({'car_id': car_ids})
        final_scores = np.array([view_scores.get(car_id, 0) for car_id in car_ids])
        reasons = ["Cold start: Popular car"] * len(car_ids)
        clusters = [0] * len(car_ids)
    else:
        cars_df, car_ids, brand_map, model_map = preprocess_car_data(session, user_features)
        if len(car_ids) == 0:
            logger.warning(f"No cars available to recommend for user {user_id} within preferences.")
            return []
        
        # Matrix factorization
        user_factors, item_factors, user_id_map, car_id_map = matrix_factorization(session, car_ids)
        user_idx = user_id_map.get(str(user_id), -1)
        if user_idx != -1:
            nmf_scores = np.dot(user_factors[user_idx], item_factors.T)
            if nmf_scores.max() > nmf_scores.min():
                nmf_scores = (nmf_scores - nmf_scores.min()) / (nmf_scores.max() - nmf_scores.min())
        else:
            nmf_scores = np.zeros(len(car_ids))
        
        # Cluster-based scoring
        cluster_scores, car_clusters = cluster_based_recommendations(session, cars_df, car_ids, user_features)
        
        # Content-based scoring
        content_scores = content_based_scoring(user_features, cars_df)
        if content_scores.max() > content_scores.min():
            content_scores = (content_scores - content_scores.min()) / (content_scores.max() - content_scores.min())
        
        # Dynamic weighting based on user data availability
        weight_content = 0.5 if user_features['preferred_brands'] else 0.3
        weight_nmf = 0.3 if user_features['views'] or user_features['favorites'] else 0.1
        weight_cluster = 0.2
        final_scores = (weight_content * content_scores +
                       weight_nmf * nmf_scores +
                       weight_cluster * cluster_scores)
        
        # Generate reasons
        reasons = []
        for idx in range(len(car_ids)):
            reason_parts = []
            if content_scores[idx] > 0.5:
                reason_parts.append("Matches your preferences")
            if nmf_scores[idx] > 0.5:
                reason_parts.append("Based on your interactions")
            if cluster_scores[idx] > 0.5:
                reason_parts.append("Popular in similar car cluster")
            reasons.append("; ".join(reason_parts) or "General recommendation")
    
    # Enhanced diversity enforcement
    features = cars_df.drop(['car_id', 'brand', 'model', 'fuel_type', 'transmission', 'condition'], axis=1) if not cars_df.empty else pd.DataFrame()
    if not features.empty:
        n_clusters = min(5, len(features))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        clusters = kmeans.fit_predict(features)
    else:
        clusters = [0] * len(car_ids)
    
    cluster_counts = defaultdict(int)
    diversified_indices = []
    sorted_indices = np.argsort(final_scores)[::-1]
    
    for idx in sorted_indices:
        cluster = clusters[idx]
        if cluster_counts[cluster] < 2:  # Limit to 2 cars per cluster
            diversified_indices.append(idx)
            cluster_counts[cluster] += 1
        if len(diversified_indices) >= top_n:
            break
    
    # Prepare recommendations
    recommendations = []
    for rank, idx in enumerate(diversified_indices[:top_n]):
        try:
            car_id_uuid = uuid.UUID(car_ids[idx])
            recommendations.append({
                'car_id': str(car_id_uuid),
                'score': float(final_scores[idx]),
                'reason': reasons[idx],
                'rank': rank + 1
            })
        except ValueError:
            logger.warning(f"Invalid car_id format: {car_ids[idx]}")
            continue
    
    if not recommendations:
        logger.warning(f"No valid recommendations for user {user_id}.")
        return []
    
    # Insert recommendations
    insert_query = """
    INSERT INTO cars_keyspace.user_recommendations (user_id, car_id, recommendation_score, recommendation_reason, created_at, rank)
    VALUES (?, ?, ?, ?, ?, ?)
    """
    try:
        prepared_stmt = session.prepare(insert_query)
        for rec in recommendations:
            session.execute(prepared_stmt, (
                uuid.UUID(str(user_id)),
                uuid.UUID(rec['car_id']),
                rec['score'],
                rec['reason'],
                datetime.now(),
                rec['rank']
            ))
            logger.info(f"Inserted recommendation for car {rec['car_id']} for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to insert recommendations for user {user_id}: {e}")
    
    logger.info(f"Generated {len(recommendations)} recommendations for user {user_id} in {(datetime.now() - start_time).total_seconds()} seconds")
    return recommendations

# Main execution
if __name__ == "__main__":
    session = connect_to_cassandra()
    
    query = "SELECT user_id FROM cars_keyspace.users"
    stmt = SimpleStatement(query, fetch_size=100)
    users = session.execute(stmt)
    
    for user in users:
        try:
            recommendations = generate_recommendations(session, user.user_id)
            logger.info(f"Generated {len(recommendations)} recommendations for user {user.user_id}")
        except Exception as e:
            logger.error(f"Error for user {user.user_id}: {e}")
            continue
    
    session.cluster.shutdown()
    logger.info("Cassandra connection closed")