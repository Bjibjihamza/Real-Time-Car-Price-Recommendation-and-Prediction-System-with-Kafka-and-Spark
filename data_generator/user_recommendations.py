import uuid
import random
import numpy as np
import pandas as pd
from datetime import datetime
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from xgboost import XGBRegressor
from collections import defaultdict, Counter
import networkx as nx
import logging
import json
from scipy.sparse import csr_matrix
from gensim.models import Word2Vec
import warnings
import os
import cassandra
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Log cassandra-driver version
logger.info(f"Using cassandra-driver version: {cassandra.__version__}")

# Cassandra connection
def connect_to_cassandra():
    try:
        from cassandra.policies import DCAwareRoundRobinPolicy
        cluster = Cluster(
            ['localhost'],
            protocol_version=5,
            load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1')
        )
        session = cluster.connect('cars_keyspace')
        logger.info("Connected to Cassandra")
        return session
    except Exception as e:
        logger.error(f"Failed to connect to Cassandra: {e}")
        raise
# Create secondary indexes
def create_indexes(session):
    index_queries = [
        """
        CREATE INDEX IF NOT EXISTS car_views_by_user_user_id_idx
        ON cars_keyspace.car_views_by_user (user_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS favorite_cars_by_user_user_id_idx
        ON cars_keyspace.favorite_cars_by_user (user_id);
        """,
        """
        CREATE INDEX IF NOT EXISTS user_searches_user_id_idx
        ON cars_keyspace.user_searches (user_id);
        """
    ]
    for query in index_queries:
        try:
            session.execute(query)
            logger.info(f"Created index: {query.strip().split('ON')[1].split(';')[0]}")
        except Exception as e:
            logger.error(f"Failed to create index: {e}")

# Trigger compaction
def trigger_compaction(session, table_name):
    logger.info(f"Run 'nodetool compact cars_keyspace {table_name}' manually to reduce tombstones")

# Create recommendations table
def create_recommendations_table(session):
    create_table_query = """
    CREATE TABLE IF NOT EXISTS cars_keyspace.user_recommendations (
        user_id uuid,
        car_id uuid,
        recommendation_score float,
        recommendation_reason text,
        created_at timestamp,
        rank int,
        PRIMARY KEY (user_id, car_id)
    ) WITH CLUSTERING ORDER BY (car_id ASC);
    """
    try:
        session.execute(create_table_query)
        logger.info("Created user_recommendations table")
    except Exception as e:
        logger.error(f"Failed to create recommendations table: {e}")
        raise

# Validate UUID
def is_valid_uuid(val):
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False
    
    

# Preprocess car data
def preprocess_car_data(session, batch_size=1000):
    cars_data = []
    car_ids = []
    last_token = None
    query_base = "SELECT * FROM cars_keyspace.cleaned_cars"
    
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
            equipment = []
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
                'price': row.price if row.price is not None else 0,
                'mileage': row.mileage if row.mileage is not None else 0,
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
        logger.warning("No cars found in cleaned_cars table.")
        return pd.DataFrame(), [], {}, {}, None, {}
    
    cars_df = pd.DataFrame(cars_data)
    
    if cars_df['equipment_score'].eq(0).all():
        logger.warning("All equipment_scores are 0. Imputing based on brand and model.")
        for idx, row in cars_df.iterrows():
            similar_cars = cars_df[(cars_df['brand'] == row['brand']) & (cars_df['model'] == row['model'])]
            median_score = similar_cars['equipment_score'].median()
            cars_df.at[idx, 'equipment_score'] = median_score if not pd.isna(median_score) else 0
    
    cars_df['price_per_mile'] = cars_df['price'] / (cars_df['mileage'] + 1)
    cars_df['car_age'] = 2025 - cars_df['year']
    cars_df['luxury_score'] = cars_df['brand'].isin(['mercedes-benz', 'bmw', 'audi']).astype(int)
    
    categorical_columns = ['brand', 'model', 'fuel_type', 'transmission', 'condition']
    label_encoders = {}
    for col in categorical_columns:
        le = LabelEncoder()
        cars_df[col + '_encoded'] = le.fit_transform(cars_df[col])
        label_encoders[col] = le
    
    numerical_columns = ['price', 'mileage', 'year', 'door_count', 'fiscal_power', 'equipment_score', 
                        'publication_age', 'price_per_mile', 'car_age']
    scaler = StandardScaler()
    cars_df[numerical_columns] = scaler.fit_transform(cars_df[numerical_columns])
    
    w2v_model_file = 'w2v_model.bin'
    if os.path.exists(w2v_model_file):
        logger.info(f"Loading cached Word2Vec model from {w2v_model_file}")
        w2v_model = Word2Vec.load(w2v_model_file)
    else:
        logger.info("Training new Word2Vec model")
        sentences = [[row['brand'], row['model']] for _, row in cars_df.iterrows()]
        w2v_model = Word2Vec(sentences, vector_size=50, window=2, min_count=1, workers=4)
        w2v_model.save(w2v_model_file)
        logger.info(f"Saved Word2Vec model to {w2v_model_file}")
    
    brand_embeddings = {brand: w2v_model.wv[brand] for brand in cars_df['brand'].unique()}
    model_embeddings = {model: w2v_model.wv[model] for model in cars_df['model'].unique()}
    
    return cars_df, car_ids, brand_embeddings, model_embeddings, scaler, label_encoders

# User feature extraction
def get_user_features(session, user_id):
    logger.debug(f"Fetching features for user_id: {user_id} (type: {type(user_id)})")
    
    # Ensure user_id is a UUID object for uuid columns
    try:
        user_id_uuid = uuid.UUID(str(user_id)) if not isinstance(user_id, uuid.UUID) else user_id
    except ValueError:
        logger.error(f"Invalid user_id format: {user_id}")
        return None
    
    # Explicitly convert to string for text columns
    user_id_text = str(user_id_uuid)
    logger.debug(f"Converted user_id to text: {user_id_text} (type: {type(user_id_text)})")

    user_features = {
        'user_id': user_id_text,
        'age': 30,
        'location': 'Unknown',
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
        'searches': [],
        'similar_users': {}
    }

    # Fetch user data
    user_query = "SELECT age, location FROM cars_keyspace.users WHERE user_id = ?"
    try:
        logger.debug(f"Executing user query with user_id: {user_id_uuid} (type: {type(user_id_uuid)})")
        user_stmt = session.prepare(user_query)
        user = session.execute(user_stmt, [user_id_uuid]).one()
        if user:
            user_features['age'] = user.age if user.age is not None else 30
            user_features['location'] = user.location if user.location else 'Unknown'
            logger.debug(f"User data: age={user_features['age']}, location={user_features['location']}")
        else:
            logger.warning(f"No user found for user_id: {user_id_uuid}")
    except Exception as e:
        logger.error(f"Error fetching user data for {user_id_uuid}: {e}")
        return None

    # Fetch preferences
    pref_query = "SELECT budget_min, budget_max, mileage_min, mileage_max, preferred_brands, preferred_fuel_types, preferred_transmissions, preferred_door_count, preferred_years FROM cars_keyspace.user_preferences WHERE user_id = ?"
    try:
        logger.debug(f"Executing preferences query with user_id: {user_id_uuid} (type: {type(user_id_uuid)})")
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
            logger.debug(f"Preferences: budget={user_features['budget_min']}-{user_features['budget_max']}")
    except Exception as e:
        logger.error(f"Error fetching preferences for {user_id_uuid}: {e}")
        return None

    # Fetch views
    view_query = "SELECT car_id, view_duration_seconds, view_source FROM cars_keyspace.car_views_by_user WHERE user_id = ?"
    try:
        logger.debug(f"Executing views query with user_id: {user_id_text} (type: {type(user_id_text)})")
        view_stmt = session.prepare(view_query)
        views = session.execute(view_stmt, [user_id_text])
        user_features['views'] = {str(view.car_id): {'duration': view.view_duration_seconds, 'source': view.view_source} for view in views}
        logger.debug(f"Fetched {len(user_features['views'])} views: {list(user_features['views'].keys())[:5]}")
    except Exception as e:
        logger.error(f"Error fetching views for {user_id_text}: {e}")
        return None

    # Fetch favorites
    fav_query = "SELECT car_id FROM cars_keyspace.favorite_cars_by_user WHERE user_id = ?"
    try:
        logger.debug(f"Executing favorites query with user_id: {user_id_uuid} (type: {type(user_id_uuid)})")
        fav_stmt = session.prepare(fav_query)
        favorites = session.execute(fav_stmt, [user_id_uuid])
        user_features['favorites'] = {str(fav.car_id) for fav in favorites}
        logger.debug(f"Fetched {len(user_features['favorites'])} favorites")
    except Exception as e:
        logger.error(f"Error fetching favorites for {user_id_uuid}: {e}")
        return None

    # Fetch searches
    search_query = "SELECT filters, search_query FROM cars_keyspace.user_searches WHERE user_id = ?"
    try:
        logger.debug(f"Executing searches query with user_id: {user_id_uuid} (type: {type(user_id_uuid)})")
        search_stmt = session.prepare(search_query)
        searches = session.execute(search_stmt, [user_id_uuid])
        user_features['searches'] = [{'filters': search.filters, 'query': search.search_query} for search in searches]
        logger.debug(f"Fetched {len(user_features['searches'])} searches")
    except Exception as e:
        logger.error(f"Error fetching searches for {user_id_uuid}: {e}")
        return None

    # Fetch similarities
    sim_query = "SELECT reference_user_id, similarity_score FROM cars_keyspace.user_similarities WHERE target_user_id = ?"
    try:
        logger.debug(f"Executing similarities query with user_id: {user_id_uuid} (type: {type(user_id_uuid)})")
        sim_stmt = session.prepare(sim_query)
        similarities = session.execute(sim_stmt, [user_id_uuid])
        user_features['similar_users'] = {str(sim.reference_user_id): sim.similarity_score for sim in similarities}
        logger.debug(f"Fetched {len(user_features['similar_users'])} similar users")
    except Exception as e:
        logger.error(f"Error fetching similarities for {user_id_uuid}: {e}")
        return None

    return user_features

# Main execution (minimal example for testing)
if __name__ == "__main__":
    session = connect_to_cassandra()
    
    # Test with a single user
    test_user_id = "7547daca-ef67-4bb0-bdb3-00c132442233"
    try:
        features = get_user_features(session, uuid.UUID(test_user_id))
        if features:
            logger.info(f"Successfully fetched features for user {test_user_id}: {features}")
        else:
            logger.warning(f"No features returned for user {test_user_id}")
    except Exception as e:
        logger.error(f"Error processing user {test_user_id}: {e}")
    
    session.cluster.shutdown()
    logger.info("Cassandra connection closed")



# Collaborative filtering
def collaborative_filtering(session, user_id, cars_df, car_ids):
    query = "SELECT user_id, car_id, view_duration_seconds FROM cars_keyspace.car_views_by_user"
    stmt = SimpleStatement(query, fetch_size=1000)
    views = session.execute(stmt)
    
    user_ids = set()
    user_item_data = []
    for view in views:
        user_ids.add(str(view.user_id))
        if is_valid_uuid(view.car_id):
            user_item_data.append((str(view.user_id), str(view.car_id), view.view_duration_seconds / 3600.0))
        else:
            logger.warning(f"Invalid car_id format in car_views_by_user: {view.car_id}")
    
    user_ids = list(user_ids)
    user_id_map = {uid: i for i, uid in enumerate(user_ids)}
    car_id_map = {cid: i for i, cid in enumerate(car_ids)}
    
    rows, cols, data = [], [], []
    for uid, cid, rating in user_item_data:
        if cid in car_id_map:
            rows.append(user_id_map[uid])
            cols.append(car_id_map[cid])
            data.append(rating)
    
    user_item_matrix = csr_matrix((data, (rows, cols)), shape=(len(user_ids), len(car_ids)))
    
    svd = TruncatedSVD(n_components=50, random_state=42)
    user_factors = svd.fit_transform(user_item_matrix)
    item_factors = svd.components_.T
    
    user_idx = user_id_map.get(str(user_id), -1)
    if user_idx == -1:
        logger.warning(f"User {user_id} not found in interaction data. Returning zero scores.")
        return np.zeros(len(car_ids))
    
    collab_scores = cosine_similarity([user_factors[user_idx]], item_factors)[0]
    return collab_scores

# Graph-based preference propagation
def graph_based_propagation(session, user_id, car_ids):
    G = nx.DiGraph()
    
    view_query = "SELECT user_id, car_id, view_duration_seconds FROM cars_keyspace.car_views_by_user"
    view_stmt = SimpleStatement(view_query, fetch_size=1000)
    views = session.execute(view_stmt)
    for view in views:
        if is_valid_uuid(view.car_id):
            G.add_edge(f"user_{view.user_id}", f"car_{view.car_id}", weight=view.view_duration_seconds / 3600.0)
        else:
            logger.warning(f"Invalid car_id format in car_views_by_user: {view.car_id}")
    
    fav_query = "SELECT user_id, car_id FROM cars_keyspace.favorite_cars_by_user"
    fav_stmt = SimpleStatement(fav_query, fetch_size=1000)
    favorites = session.execute(fav_stmt)
    for fav in favorites:
        G.add_edge(f"user_{fav.user_id}", f"car_{fav.car_id}", weight=2.0)
    
    pagerank_scores = nx.pagerank(G, alpha=0.85)
    
    graph_scores = []
    for car_id in car_ids:
        score = pagerank_scores.get(f"car_{car_id}", 0.0)
        graph_scores.append(score)
    
    return np.array(graph_scores)

# Content-based filtering
def content_based_filtering(user_features, cars_df, brand_embeddings, model_embeddings):
    content_scores = []
    
    for _, car in cars_df.iterrows():
        score = 0
        
        scaled_price = car['price'] * 1000000
        if user_features['budget_min'] <= scaled_price <= user_features['budget_max']:
            score += 0.3
        elif user_features['budget_max'] != float('inf') and abs(scaled_price - user_features['budget_max']) < 50000:
            score += 0.15
        
        scaled_mileage = car['mileage'] * 100000
        if user_features['mileage_min'] <= scaled_mileage <= user_features['mileage_max']:
            score += 0.2
        elif user_features['mileage_max'] != float('inf') and abs(scaled_mileage - user_features['mileage_max']) < 20000:
            score += 0.1
        
        if car['brand'] in user_features['preferred_brands']:
            score += 0.2
        
        if user_features['favorites']:
            fav_brands = set()
            for fav_id in user_features['favorites']:
                fav_car = cars_df[cars_df['car_id'] == fav_id]
                if not fav_car.empty:
                    fav_brands.add(fav_car['brand'].iloc[0])
            if fav_brands:
                try:
                    brand_vec = np.mean([brand_embeddings[b] for b in fav_brands if b in brand_embeddings], axis=0)
                    if car['brand'] in brand_embeddings:
                        sim = cosine_similarity([brand_vec], [brand_embeddings[car['brand']]])[0][0]
                        score += 0.15 * sim
                except Exception as e:
                    logger.warning(f"Error computing brand similarity for car {car['car_id']}: {e}")
        
        if car['fuel_type'] in user_features['preferred_fuel_types']:
            score += 0.1
        if car['transmission'] in user_features['preferred_transmissions']:
            score += 0.08
        if int(car['door_count'] * 10) in user_features['preferred_door_count']:
            score += 0.05
        if int(car['year']) in user_features['preferred_years']:
            score += 0.07
        
        if car['condition'] == 'Excellent':
            score += 0.05
        if car['first_owner'] == 1:
            score += 0.05
        
        score += 0.05 * car['equipment_score']
        score += 0.05 * car['luxury_score']
        
        content_scores.append(score)
    
    return np.array(content_scores)

# Context-aware scoring
def context_aware_scoring(session, user_id, cars_df):
    user_query = "SELECT location, age FROM cars_keyspace.users WHERE user_id = ?"
    try:
        user_stmt = session.prepare(user_query)
        user = session.execute(user_stmt, [uuid.UUID(str(user_id))]).one()
        location = user.location.lower() if user and user.location else 'unknown'
        age = user.age if user and user.age is not None else 30
    except Exception as e:
        logger.error(f"Error fetching user context for {user_id}: {e}")
        location = 'unknown'
        age = 30
    
    context_scores = []
    for _, car in cars_df.iterrows():
        score = 0
        
        if 'casablanca' in location or 'rabat' in location:
            if car['fuel_type'] in ['hybride', 'electrique']:
                score += 0.2
            if car['door_count'] * 10 <= 5:
                score += 0.1
        else:
            if car['fuel_type'] == 'diesel':
                score += 0.15
            if car['door_count'] * 10 >= 5:
                score += 0.1
        
        if age < 30:
            if car['luxury_score'] == 1 or car['condition'] == 'Excellent':
                score += 0.1
        elif age > 50:
            if car['equipment_score'] > 0.5:
                score += 0.1
        
        if car['publication_age'] < 30:
            score += 0.1
        if car['car_age'] < 3:
            score += 0.05
        
        context_scores.append(score)
    
    return np.array(context_scores)

# ML-based scoring
def ml_scoring(session, user_id, cars_df, car_ids):
    query = "SELECT user_id, car_id, view_duration_seconds FROM cars_keyspace.car_views_by_user"
    stmt = SimpleStatement(query, fetch_size=1000)
    views = session.execute(stmt)
    X_train, y_train = [], []
    
    for view in views:
        if is_valid_uuid(view.car_id):
            car = cars_df[cars_df['car_id'] == view.car_id]
            if not car.empty:
                features = car.drop(['car_id', 'brand', 'model', 'fuel_type', 'transmission', 'condition'], axis=1).values[0]
                X_train.append(features)
                y_train.append(view.view_duration_seconds / 3600.0)
        else:
            logger.warning(f"Invalid car_id format in car_views_by_user: {view.car_id}")
    
    if not X_train:
        logger.warning("No training data for ML model. Returning zero scores.")
        return np.zeros(len(car_ids))
    
    model = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    model.fit(X_train, y_train)
    
    X_test = cars_df.drop(['car_id', 'brand', 'model', 'fuel_type', 'transmission', 'condition'], axis=1).values
    ml_scores = model.predict(X_test)
    ml_scores = (ml_scores - ml_scores.min()) / (ml_scores.max() - ml_scores.min() + 1e-10)
    
    return ml_scores

# Dynamic weighting
def compute_dynamic_weights(user_features, session, user_id):
    profile_completeness = 0.1
    interaction_strength = 0.0
    context_relevance = 0.1
    similarity_influence = 0.0
    
    preferences = user_features.get('preferred_brands', set())
    if len(preferences) > 0:
        profile_completeness += 0.2 * min(len(preferences) / 3, 1.0)
    if len(user_features.get('preferred_fuel_types', set())) > 0:
        profile_completeness += 0.15
    if len(user_features.get('preferred_transmissions', set())) > 0:
        profile_completeness += 0.1
    if len(user_features.get('preferred_door_count', set())) > 0:
        profile_completeness += 0.1
    if len(user_features.get('preferred_years', set())) > 0:
        profile_completeness += 0.1
    budget_range = user_features.get('budget_max', float('inf')) - user_features.get('budget_min', 0)
    if 0 < budget_range < float('inf'):
        profile_completeness += 0.15 * (1 - budget_range / 1000000)
    mileage_range = user_features.get('mileage_max', float('inf')) - user_features.get('mileage_min', 0)
    if 0 < mileage_range < float('inf'):
        profile_completeness += 0.1 * (1 - mileage_range / 200000)
    
    views = user_features.get('views', {})
    favorites = user_features.get('favorites', set())
    searches = user_features.get('searches', [])
    
    view_count = len(views)
    total_view_duration = sum(view['duration'] for view in views.values())
    interaction_strength += min(view_count / 10.0, 0.4)
    interaction_strength += min(total_view_duration / 3600.0, 0.3)
    
    source_weights = {'RECOMMENDATION': 1.0, 'SEARCH': 0.8, 'BROWSE': 0.5}
    view_source_score = sum(source_weights.get(view['source'], 0.5) * view['duration'] / 3600.0 
                           for view in views.values())
    interaction_strength += min(view_source_score, 0.2)
    
    interaction_strength += min(len(favorites) / 5.0, 0.2)
    interaction_strength += min(len(searches) / 10.0, 0.1)
    
    view_query = "SELECT view_timestamp FROM cars_keyspace.car_views_by_user WHERE user_id = ?"
    try:
        view_stmt = session.prepare(view_query)
        rows = session.execute(view_stmt, [str(user_id)])
        view_timestamps = [row.view_timestamp for row in rows]
        if view_timestamps:
            days_since_last_view = (datetime.now() - max(view_timestamps)).days
            temporal_factor = max(0.0, 1.0 - days_since_last_view / 30.0)
            interaction_strength += 0.15 * temporal_factor
    except Exception as e:
        logger.error(f"Error fetching view timestamps for {user_id}: {e}")
    
    pref_query = "SELECT last_updated FROM cars_keyspace.user_preferences WHERE user_id = ?"
    try:
        pref_stmt = session.prepare(pref_query)
        pref_row = session.execute(pref_stmt, [uuid.UUID(str(user_id))]).one()
        if pref_row and pref_row.last_updated:
            days_since_update = (datetime.now() - pref_row.last_updated).days
            profile_completeness += 0.1 * max(0.0, 1.0 - days_since_update / 60.0)
    except Exception as e:
        logger.error(f"Error fetching preference last_updated for {user_id}: {e}")
    
    sim_query = "SELECT similarity_score FROM cars_keyspace.user_similarities WHERE target_user_id = ?"
    try:
        sim_stmt = session.prepare(sim_query)
        sim_rows = session.execute(sim_stmt, [uuid.UUID(str(user_id))]).one()
        similarity_scores = [row.similarity_score for row in sim_rows]
        if similarity_scores:
            avg_similarity = np.mean(similarity_scores)
            similarity_influence = min(avg_similarity, 0.5)
    except Exception as e:
        logger.error(f"Error fetching similarity scores for {user_id}: {e}")
    
    user_query = "SELECT location, age FROM cars_keyspace.users WHERE user_id = ?"
    try:
        user_stmt = session.prepare(user_query)
        user_row = session.execute(user_stmt, [uuid.UUID(str(user_id))]).one()
        if user_row:
            location = user_row.location.lower() if user_row.location else 'unknown'
            age = user_row.age if user_row.age is not None else 30
            if 'casablanca' in location or 'rabat' in location:
                context_relevance += 0.2
            if age < 30:
                context_relevance += 0.1
            elif age > 50:
                context_relevance += 0.1
    except Exception as e:
        logger.error(f"Error fetching user location/age for {user_id}: {e}")
    
    content_weight = 0.4 * profile_completeness
    collab_weight = 0.3 * interaction_strength + 0.2 * similarity_influence
    context_weight = 0.2 * context_relevance
    ml_weight = 0.15 * min(interaction_strength + profile_completeness, 1.0)
    graph_weight = 0.1 * (interaction_strength + similarity_influence)
    
    if view_count == 0 and not favorites:
        content_weight *= 1.5
        collab_weight *= 0.5
        graph_weight *= 0.5
    if profile_completeness < 0.3:
        collab_weight += 0.2
        context_weight += 0.1
    
    total = content_weight + collab_weight + context_weight + ml_weight + graph_weight
    if total == 0:
        total = 1.0
    weights = {
        'content': content_weight / total,
        'collab': collab_weight / total,
        'context': context_weight / total,
        'ml': ml_weight / total,
        'graph': graph_weight / total
    }
    
    for key in weights:
        weights[key] = max(weights[key], 0.05)
    total = sum(weights.values())
    weights = {k: v / total for k, v in weights.items()}
    
    return weights

# Diversity enforcement
def ensure_diversity(cars_df, scores, car_ids, n_clusters=5):
    if len(cars_df) == 0:
        return [], []
    
    features = cars_df.drop(['car_id', 'brand', 'model', 'fuel_type', 'transmission', 'condition'], axis=1)
    n_clusters = min(n_clusters, len(features))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(features)
    
    cluster_counts = Counter()
    diversified_indices = []
    sorted_indices = np.argsort(scores)[::-1]
    
    for idx in sorted_indices:
        cluster = clusters[idx]
        if cluster_counts[cluster] < 2:
            diversified_indices.append(idx)
            cluster_counts[cluster] += 1
    
    return diversified_indices, clusters

# Cold start recommendations
def cold_start_recommendations(session, car_ids):
    query = "SELECT car_id, SUM(view_duration_seconds) as total_views FROM cars_keyspace.car_views_by_user GROUP BY car_id"
    stmt = SimpleStatement(query, fetch_size=1000)
    views = session.execute(stmt)
    view_scores = {}
    for view in views:
        if is_valid_uuid(view.car_id):
            view_scores[str(view.car_id)] = view.total_views
        else:
            logger.warning(f"Invalid car_id format in car_views_by_user: {view.car_id}")
    
    scores = []
    for car_id in car_ids:
        scores.append(view_scores.get(car_id, 0) / 3600.0)
    
    return np.array(scores)

# Generate recommendations
def generate_recommendations(session, user_id, top_n=10):
    logger.info(f"Generating recommendations for user {user_id}")
    start_time = datetime.now()
    
    cars_df, car_ids, brand_embeddings, model_embeddings, scaler, label_encoders = preprocess_car_data(session)
    
    if len(car_ids) == 0:
        logger.warning(f"No cars available to recommend for user {user_id}.")
        return []
    
    user_features = get_user_features(session, user_id)
    
    if not user_features:
        logger.warning(f"No user data for {user_id}, using cold start")
        final_scores = cold_start_recommendations(session, car_ids)
        reasons = ["Cold start: Popular car"] * len(car_ids)
        confidence = [0.5] * len(car_ids)
        diversified_indices = np.argsort(final_scores)[::-1][:top_n]
        clusters = [0] * len(car_ids)
    else:
        collab_scores = collaborative_filtering(session, user_id, cars_df, car_ids)
        graph_scores = graph_based_propagation(session, user_id, car_ids)
        content_scores = content_based_filtering(user_features, cars_df, brand_embeddings, model_embeddings)
        context_scores = context_aware_scoring(session, user_id, cars_df)
        ml_scores = ml_scoring(session, user_id, cars_df, car_ids)
        
        for scores in [collab_scores, graph_scores, content_scores, context_scores, ml_scores]:
            if scores.max() > scores.min():
                scores[:] = (scores - scores.min()) / (scores.max() - scores.min() + 1e-10)
        
        weights = compute_dynamic_weights(user_features, session, user_id)
        logger.info(f"Dynamic weights for user {user_id}: {weights}")
        
        final_scores = (
            weights['content'] * content_scores +
            weights['collab'] * collab_scores +
            weights['context'] * context_scores +
            weights['ml'] * ml_scores +
            weights['graph'] * graph_scores
        )
        
        diversified_indices, clusters = ensure_diversity(cars_df, final_scores, car_ids)
        
        reasons, confidence = [], []
        for idx in diversified_indices:
            reason_parts = []
            if content_scores[idx] > 0.5:
                reason_parts.append("Matches your preferences (budget, mileage, brand)")
            if collab_scores[idx] > 0.5:
                reason_parts.append("Popular among similar users")
            if context_scores[idx] > 0.5:
                reason_parts.append("Suitable for your location and age")
            if ml_scores[idx] > 0.5:
                reason_parts.append("Predicted high engagement")
            if graph_scores[idx] > 0.5:
                reason_parts.append("Trending in user network")
            
            reasons.append("; ".join(reason_parts) or "General recommendation")
            confidence.append(min(1.0, 0.5 + 0.1 * len(reason_parts)))
    
    recommendations = []
    for rank, idx in enumerate(diversified_indices[:top_n]):
        try:
            car_id_uuid = uuid.UUID(car_ids[idx])
            recommendations.append({
                'car_id': str(car_id_uuid),
                'score': float(final_scores[idx]),
                'reason': reasons[idx],
                'confidence': confidence[idx],
                'rank': rank + 1
            })
        except ValueError:
            logger.warning(f"Invalid car_id format for recommendation: {car_ids[idx]}")
            continue
    
    if not recommendations:
        logger.warning(f"No valid recommendations generated for user {user_id}.")
        return []
    
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
    create_recommendations_table(session)
    create_indexes(session)
    
    trigger_compaction(session, "cleaned_cars")
    
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