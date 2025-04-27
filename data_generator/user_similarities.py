import logging
import random
import math
from datetime import datetime, UTC
from cassandra.cluster import Cluster
from cassandra.policies import DCAwareRoundRobinPolicy
from cassandra.query import SimpleStatement

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cassandra configuration
CASSANDRA_HOST = ['localhost']
CASSANDRA_KEYSPACE = 'cars_keyspace'

# Connect to Cassandra
try:
    cluster = Cluster(
        contact_points=CASSANDRA_HOST,
        protocol_version=5,
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1')
    )
    session = cluster.connect(CASSANDRA_KEYSPACE)
    logger.info("Connected to Cassandra cluster")
except Exception as e:
    logger.error(f"Failed to connect to Cassandra: {e}")
    raise

# Fetch all user_ids
try:
    rows = session.execute(SimpleStatement("SELECT user_id FROM users"))
    user_ids = [row.user_id for row in rows]
    if not user_ids:
        logger.error("No user_ids found in users table.")
        raise ValueError("No user_ids")
    logger.info(f"Found {len(user_ids)} user_ids")
except Exception as e:
    logger.error(f"Failed to fetch user_ids: {e}")
    raise

# Fetch user preferences
try:
    rows = session.execute(SimpleStatement("SELECT user_id, preferred_brands, preferred_fuel_types, preferred_transmissions, budget_min, budget_max, preferred_door_count, mileage_min, mileage_max, preferred_years FROM user_preferences"))
    user_preferences = {row.user_id: {
        'preferred_brands': row.preferred_brands or set(),
        'preferred_fuel_types': row.preferred_fuel_types or set(),
        'preferred_transmissions': row.preferred_transmissions or set(),
        'budget_min': row.budget_min or 0,
        'budget_max': row.budget_max or 1000000,
        'preferred_door_count': row.preferred_door_count or set(),
        'mileage_min': row.mileage_min or 0,
        'mileage_max': row.mileage_max or 500000,
        'preferred_years': row.preferred_years or set()
    } for row in rows}
    logger.info(f"Found preferences for {len(user_preferences)} users")
except Exception as e:
    logger.error(f"Failed to fetch user preferences: {e}")
    user_preferences = {}

# Fetch user searches
try:
    rows = session.execute(SimpleStatement("SELECT user_id, search_query, filters, result_count FROM user_searches"))
    user_searches = {}
    for row in rows:
        if row.user_id not in user_searches:
            user_searches[row.user_id] = []
        user_searches[row.user_id].append({
            'search_query': row.search_query,
            'filters': row.filters or {},
            'result_count': row.result_count or 0
        })
    logger.info(f"Found search data for {len(user_searches)} users")
except Exception as e:
    logger.error(f"Failed to fetch user searches: {e}")
    user_searches = {}

# Fetch car views
try:
    rows = session.execute(SimpleStatement("SELECT user_id, car_id, view_duration_seconds FROM car_views_by_user"))
    user_views = {}
    for row in rows:
        if row.user_id not in user_views:
            user_views[row.user_id] = []
        user_views[row.user_id].append((row.car_id, row.view_duration_seconds))
    logger.info(f"Found view data for {len(user_views)} users")
except Exception as e:
    logger.error(f"Failed to fetch car views: {e}")
    user_views = {}

# Fetch favorite cars
try:
    rows = session.execute(SimpleStatement("SELECT user_id, car_id FROM favorite_cars_by_user"))
    user_favorites = {}
    for row in rows:
        if row.user_id not in user_favorites:
            user_favorites[row.user_id] = []
        user_favorites[row.user_id].append(row.car_id)
    logger.info(f"Found favorite data for {len(user_favorites)} users")
except Exception as e:
    logger.error(f"Failed to fetch favorite cars: {e}")
    user_favorites = {}

# Fetch car details from cleaned_cars
try:
    rows = session.execute(SimpleStatement("SELECT id, brand FROM cleaned_cars"))
    car_brands = {row.id: row.brand.strip() for row in rows if row.brand and row.brand != 'NaN' and row.brand != '"NaN"'}
    if not car_brands:
        logger.error("No valid cars found in cleaned_cars.")
        raise ValueError("No cars")
    logger.info(f"Retrieved {len(car_brands)} cars")
except Exception as e:
    logger.error(f"Failed to fetch cars: {e}")
    raise

# Fetch unique brands for vector construction
try:
    brands = list(set(car_brands.values()))
    fuel_types = ['hybride', 'essence', 'diesel']
    transmissions = ['manuelle', 'automatique']
    door_counts = [3, 5, 7]
    years = list(range(2000, 2026))
    logger.info(f"Feature space: {len(brands)} brands, {len(fuel_types)} fuel types, {len(transmissions)} transmissions, {len(door_counts)} door counts, {len(years)} years")
except Exception as e:
    logger.error(f"Failed to fetch unique attributes: {e}")
    raise

# Function to assess user data richness
def data_richness(user_id):
    score = 0
    prefs = user_preferences.get(user_id, {})
    searches = user_searches.get(user_id, [])
    views = user_views.get(str(user_id), [])
    favorites = user_favorites.get(user_id, [])
    
    # Count non-empty preference fields
    for field in ['preferred_brands', 'preferred_fuel_types', 'preferred_transmissions', 'preferred_door_count', 'preferred_years']:
        if prefs.get(field):
            score += 1
    if prefs.get('budget_min') or prefs.get('budget_max'):
        score += 1
    if prefs.get('mileage_min') or prefs.get('mileage_max'):
        score += 1
    
    # Add interaction counts
    score += len(searches) + len(views) + len(favorites)
    return score

# Function to build user feature vector
def build_user_vector(user_id):
    vector = {}
    prefs = user_preferences.get(user_id, {})
    searches = user_searches.get(user_id, [])
    views = user_views.get(str(user_id), [])
    favorites = user_favorites.get(user_id, [])

    # Preferences
    for brand in brands:
        vector[f'brand_{brand}'] = 1.0 if brand in prefs.get('preferred_brands', set()) else 0.0
    for fuel in fuel_types:
        vector[f'fuel_{fuel}'] = 1.0 if fuel in prefs.get('preferred_fuel_types', set()) else 0.0
    for trans in transmissions:
        vector[f'trans_{trans}'] = 1.0 if trans in prefs.get('preferred_transmissions', set()) else 0.0
    for door in door_counts:
        vector[f'door_{door}'] = 1.0 if door in prefs.get('preferred_door_count', set()) else 0.0
    for year in years:
        vector[f'year_{year}'] = 1.0 if year in prefs.get('preferred_years', set()) else 0.0
    budget_min = prefs.get('budget_min', 0)
    budget_max = prefs.get('budget_max', 1000000)
    mileage_min = prefs.get('mileage_min', 0)
    mileage_max = prefs.get('mileage_max', 500000)
    vector['budget'] = (budget_max - budget_min) / 1000000.0 if budget_max > budget_min else 0.0
    vector['mileage'] = (mileage_max - mileage_min) / 500000.0 if mileage_max > mileage_min else 0.0

    # Searches
    brand_search_counts = {brand: 0 for brand in brands}
    for search in searches:
        query = search['search_query'].lower()
        for brand in brands:
            if brand.lower() in query:
                brand_search_counts[brand] += search['result_count'] / 50.0
        for key, value in search['filters'].items():
            if key == 'brand' and value in brands:
                brand_search_counts[value] += 1.0
    for brand in brands:
        vector[f'search_brand_{brand}'] = brand_search_counts[brand]

    # Views and favorites
    brand_view_counts = {brand: 0 for brand in brands}
    for car_id, duration in views:
        brand = car_brands.get(car_id)
        if brand:
            brand_view_counts[brand] += duration / 300.0
    for car_id in favorites:
        brand = car_brands.get(car_id)
        if brand:
            brand_view_counts[brand] += 2.0
    for brand in brands:
        vector[f'view_fav_brand_{brand}'] = brand_view_counts[brand]

    return vector

# Function to compute cosine similarity
def cosine_similarity(vector1, vector2):
    dot_product = 0.0
    norm1 = 0.0
    norm2 = 0.0
    keys = set(vector1.keys()) & set(vector2.keys())
    for key in keys:
        dot_product += vector1[key] * vector2[key]
        norm1 += vector1[key] ** 2
        norm2 += vector2[key] ** 2
    norm1 = math.sqrt(norm1)
    norm2 = math.sqrt(norm2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)

# Function to insert similarity
def insert_similarity(target_user_id, reference_user_id, score):
    try:
        query = """
            INSERT INTO user_similarities (
                target_user_id, reference_user_id, similarity_score, last_updated
            )
            VALUES (%s, %s, %s, %s)
        """
        session.execute(query, (
            target_user_id,
            reference_user_id,
            score,
            datetime.now(UTC)
        ))
        logger.info(f"Inserted similarity between target {target_user_id} and reference {reference_user_id}: {score}")
    except Exception as e:
        logger.error(f"Failed to insert similarity for target {target_user_id} and reference {reference_user_id}: {e}")
# Main function
def main():
    try:
        # Assess data richness (optional, for logging)
        user_data_scores = {user_id: data_richness(user_id) for user_id in user_ids}
        logger.info(f"User data scores: {user_data_scores}")

        # Build vectors
        user_vectors = {user_id: build_user_vector(user_id) for user_id in user_ids}
        logger.info(f"Built vectors for {len(user_vectors)} users")

        # Compute similarities for all unique user pairs
        similarity_threshold = 0.1
        for i, target_user_id in enumerate(user_ids):
            for reference_user_id in user_ids[i+1:]:  # Avoid self-comparison and duplicates
                score = cosine_similarity(user_vectors[target_user_id], user_vectors[reference_user_id])
                if score >= similarity_threshold:
                    insert_similarity(target_user_id, reference_user_id, score)
                    insert_similarity(reference_user_id, target_user_id, score)  # Insert reciprocal for symmetry
        logger.info("Completed similarity calculations")
    except Exception as e:
        logger.error(f"Error computing similarities: {e}")
        raise


    
if __name__ == "__main__":
    try:
        main()
    finally:
        cluster.shutdown()
        logger.info("Cassandra connection closed")