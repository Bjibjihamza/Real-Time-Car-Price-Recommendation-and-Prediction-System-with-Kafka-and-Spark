import logging
import random
from datetime import datetime, UTC, timedelta
from uuid import uuid4
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

# Fetch user_ids and preferred_brands from user_preferences table
try:
    rows = session.execute(SimpleStatement("SELECT user_id, preferred_brands FROM user_preferences"))
    user_preferences = {row.user_id: row.preferred_brands for row in rows if row.preferred_brands}
    if not user_preferences:
        logger.error("No user_ids or preferred_brands found in user_preferences table.")
        raise ValueError("No user preferences")
    logger.info(f"Found {len(user_preferences)} user preferences")
except Exception as e:
    logger.error(f"Failed to fetch user preferences: {e}")
    raise

# Fetch all car_ids from cleaned_cars table (for fallback)
try:
    rows = session.execute(SimpleStatement("SELECT id FROM cleaned_cars"))
    all_car_ids = [row.id for row in rows]
    if not all_car_ids:
        logger.error("No car_ids found in cleaned_cars table.")
        raise ValueError("No car_ids")
    logger.info(f"Found {len(all_car_ids)} car_ids for fallback")
except Exception as e:
    logger.error(f"Failed to fetch car_ids: {e}")
    raise

# Define view sources
view_sources = ['SEARCH', 'RECOMMENDATION', 'BROWSE', 'ADVERTISEMENT']

# Function to get car_ids for preferred brands
def get_car_ids_for_brands(preferred_brands):
    try:
        # Prepare query to fetch car_ids for the given brands
        query = SimpleStatement(
            "SELECT id FROM cleaned_cars WHERE brand IN %s",
            fetch_size=1000
        )
        brand_tuple = tuple(preferred_brands)
        rows = session.execute(query, [brand_tuple])
        car_ids = [row.id for row in rows]
        if not car_ids:
            logger.warning(f"No cars found for brands {preferred_brands}. Using fallback.")
            return all_car_ids  # Fallback to all car_ids
        return car_ids
    except Exception as e:
        logger.error(f"Failed to fetch car_ids for brands {preferred_brands}: {e}")
        return all_car_ids  # Fallback to all car_ids

# Function to generate a synthetic car view
def generate_car_view(user_id, preferred_brands):
    # Generate view date (within the last 30 days)
    days_ago = random.randint(0, 30)
    view_date = (datetime.now(UTC) - timedelta(days=days_ago)).date()
    
    # Generate view timestamp (random time on the view date)
    random_hour = random.randint(0, 23)
    random_minute = random.randint(0, 59)
    random_second = random.randint(0, 59)
    view_timestamp = datetime.combine(view_date, datetime.min.time()).replace(
        hour=random_hour, minute=random_minute, second=random_second, tzinfo=UTC
    )
    
    # Get car_ids for preferred brands
    car_ids = get_car_ids_for_brands(preferred_brands)
    
    # Generate view details
    car_view = {
        'user_id': user_id,
        'view_date': view_date,
        'view_timestamp': view_timestamp,
        'car_id': random.choice(car_ids),
        'view_duration_seconds': random.randint(5, 300),  # 5 seconds to 5 minutes
        'view_source': random.choice(view_sources)
    }
    return car_view

# Function to insert car view into car_views_by_user table
def insert_car_view(car_view):
    try:
        query = """
            INSERT INTO car_views_by_user (
                user_id, view_date, view_timestamp, car_id, 
                view_duration_seconds, view_source
            )
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        session.execute(query, (
            str(car_view['user_id']),
            car_view['view_date'],
            car_view['view_timestamp'],
            str(car_view['car_id']),
            car_view['view_duration_seconds'],
            car_view['view_source']
        ))
        logger.info(f"Inserted car view for user_id {car_view['user_id']} on {car_view['view_date']}")
    except Exception as e:
        logger.error(f"Failed to insert car view for user_id {car_view['user_id']}: {e}")
        raise

# Main function to generate and insert car views
def main():
    try:
        # Generate 1-5 views per user
        for user_id, preferred_brands in user_preferences.items():
            num_views = random.randint(1, 5)  # Each user has 1-5 views
            logger.info(f"Generating {num_views} views for user_id: {user_id}")
            for _ in range(num_views):
                car_view = generate_car_view(user_id, preferred_brands)
                insert_car_view(car_view)
        logger.info(f"Inserted views for {len(user_preferences)} users")
    except Exception as e:
        logger.error(f"Error generating or inserting car views: {e}")
        raise

if __name__ == "__main__":
    try:
        main()
    finally:
        cluster.shutdown()
        logger.info("Cassandra connection closed")