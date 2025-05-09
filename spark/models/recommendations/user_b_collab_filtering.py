import pandas as pd
from cassandra.cluster import Cluster, EXEC_PROFILE_DEFAULT, ExecutionProfile
from cassandra.query import SimpleStatement
from cassandra.policies import DCAwareRoundRobinPolicy
from datetime import datetime
import pytz
import uuid
import os
import logging
import random
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize output directory
DATA_DIR = "../data"
os.makedirs(DATA_DIR, exist_ok=True)

# Connect to Cassandra
try:
    profile = ExecutionProfile(load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1'))
    cluster = Cluster(['localhost'], execution_profiles={EXEC_PROFILE_DEFAULT: profile}, protocol_version=4)
    session = cluster.connect('cars_keyspace')
except Exception as e:
    logging.error(f"Error connecting to Cassandra: {e}")
    exit(1)

# Fetch views and favorites
try:
    views_query = "SELECT user_id, car_id, view_timestamp FROM car_views_by_user"
    views_rows = session.execute(SimpleStatement(views_query))
    views_data = [(str(row.user_id), str(row.car_id), row.view_timestamp) for row in views_rows]
    
    favs_query = "SELECT user_id, car_id, added_timestamp FROM favorite_cars_by_user"
    favs_rows = session.execute(SimpleStatement(favs_query))
    favs_data = [(str(row.user_id), str(row.car_id), row.added_timestamp) for row in favs_rows]
except Exception as e:
    logging.error(f"Error querying Cassandra: {e}")
    cluster.shutdown()
    exit(1)

# Create DataFrames
views_df = pd.DataFrame(views_data, columns=['user_id', 'car_id', 'view_timestamp'])
favs_df = pd.DataFrame(favs_data, columns=['user_id', 'car_id', 'added_timestamp'])

# Debug: Data summary
logging.info(f"Views rows: {len(views_df)}, Unique users: {views_df['user_id'].nunique()}, Unique cars: {views_df['car_id'].nunique()}")
logging.info(f"Favorites rows: {len(favs_df)}, Unique users: {favs_df['user_id'].nunique()}, Unique cars: {favs_df['car_id'].nunique()}")

# Build user-item interaction matrix
interactions = []
current_time = datetime.now(pytz.UTC)

def recency_weight(timestamp):
    try:
        if timestamp.tzinfo is None:
            timestamp = pytz.UTC.localize(timestamp)
        days_old = (current_time - timestamp).total_seconds() / (24 * 3600)
        return max(0.5, 1.0 - (days_old / 30.0))  # Minimum weight 0.5
    except Exception as e:
        logging.warning(f"Invalid timestamp {timestamp}: {e}, using default weight 0.5")
        return 0.5

for _, row in views_df.iterrows():
    if pd.notnull(row['view_timestamp']):
        interactions.append((row['user_id'], row['car_id'], 1.0 * recency_weight(row['view_timestamp']), row['view_timestamp']))
    else:
        logging.warning(f"Skipping view for user {row['user_id']}, car {row['car_id']}: Invalid timestamp")
for _, row in favs_df.iterrows():
    if pd.notnull(row['added_timestamp']):
        interactions.append((row['user_id'], row['car_id'], 2.0 * recency_weight(row['added_timestamp']), row['added_timestamp']))
    else:
        logging.warning(f"Skipping favorite for user {row['user_id']}, car {row['car_id']}: Invalid timestamp")

interaction_df = pd.DataFrame(interactions, columns=['user_id', 'car_id', 'score', 'timestamp'])

# Pivot to create user-item matrix
user_item_matrix = pd.pivot_table(
    interaction_df,
    values='score',
    index='user_id',
    columns='car_id',
    aggfunc='sum',
    fill_value=0
)

# Compute user-to-user similarity
user_similarity_matrix = cosine_similarity(user_item_matrix)
user_ids = user_item_matrix.index
user_similarity_df = pd.DataFrame(user_similarity_matrix, index=user_ids, columns=user_ids)

# Debug: Similarity matrix info
logging.info(f"User similarity matrix shape: {user_similarity_df.shape}")

# Generate recommendations
recommendations = {}
reason = "Based on similraties with another user"
max_recs_per_user = 10
recs_to_add = 3

for user_id in user_ids:
    try:
        # Get user interactions
        user_views = set(views_df[views_df['user_id'] == user_id]['car_id'])
        user_favs = set(favs_df[favs_df['user_id'] == user_id]['car_id'])
        excluded_cars = user_views.union(user_favs)
        
        # Get existing recommendations
        existing_recs_query = """
            SELECT car_id FROM user_recommendations
            WHERE user_id = %s
        """
        existing_recs = session.execute(existing_recs_query, (uuid.UUID(user_id),))
        existing_car_ids = set(str(row.car_id) for row in existing_recs)
        excluded_cars.update(existing_car_ids)
        
        # Find similar users
        similar_users = user_similarity_df.loc[user_id].sort_values(ascending=False)[1:11]  # Top 10 similar users
        candidate_scores = {}
        
        # Aggregate scores from similar users
        for similar_user_id, sim_score in similar_users.items():
            if sim_score > 0:
                # Get cars interacted by similar user
                similar_user_views = set(views_df[views_df['user_id'] == similar_user_id]['car_id'])
                similar_user_favs = set(favs_df[favs_df['user_id'] == similar_user_id]['car_id'])
                similar_user_cars = similar_user_views.union(similar_user_favs)
                
                for car_id in similar_user_cars:
                    if car_id not in excluded_cars:
                        candidate_scores[car_id] = candidate_scores.get(car_id, 0) + sim_score
        
        # Normalize scores (0.0 to 0.9)
        if candidate_scores:
            max_score = max(candidate_scores.values())
            candidate_scores = {car_id: (score / max_score) * 0.9 for car_id, score in candidate_scores.items()}
        else:
            # Fallback: Recommend popular cars
            popular_cars_query = """
                SELECT car_id, COUNT(*) as fav_count FROM favorite_cars_by_user
                GROUP BY car_id LIMIT 10
            """
            popular_cars = session.execute(SimpleStatement(popular_cars_query))
            candidate_scores = {str(row.car_id): 0.5 for row in popular_cars if str(row.car_id) not in excluded_cars}
        
        # Select top recommendations
        top_recs = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:recs_to_add]
        recommendations[user_id] = top_recs
    except Exception as e:
        logging.error(f"Error generating recommendations for user {user_id}: {e}")
        recommendations[user_id] = []

# Debug: Sample recommendations
logging.info("\nSample recommendations:")
for user_id in list(recommendations.keys())[:3]:
    logging.info(f"User {user_id}: {recommendations[user_id]}")

# Insert recommendations
current_time = datetime.now(pytz.UTC)
for user_id, recs in recommendations.items():
    if not recs:
        logging.info(f"No recommendations for user {user_id}")
        continue
    
    try:
        user_id_uuid = uuid.UUID(user_id)
        
        # Fetch existing recommendations
        query = """
            SELECT car_id, created_at
            FROM user_recommendations
            WHERE user_id = %s
        """
        existing_recs = session.execute(query, (user_id_uuid,))
        existing_recs_list = [(row.car_id, row.created_at) for row in existing_recs]
        current_count = len(existing_recs_list)
        existing_car_ids = set(str(car_id) for car_id, _ in existing_recs_list)
        
        logging.info(f"User {user_id}: {current_count} existing recommendations")
        
        # Filter out duplicates
        new_recs = [(car_id, score) for car_id, score in recs if car_id not in existing_car_ids]
        
        # Select exactly 3 new recommendations
        recs_to_insert = new_recs[:recs_to_add]
        
        # Handle excess recommendations
        if current_count + len(recs_to_insert) > max_recs_per_user:
            excess_recs = (current_count + len(recs_to_insert)) - max_recs_per_user
            recs_to_delete = random.sample(existing_recs_list, min(excess_recs, current_count))
            logging.info(f"User {user_id}: Deleting {len(recs_to_delete)} random recommendations")
            
            for car_id, _ in recs_to_delete:
                session.execute(
                    """
                    DELETE FROM user_recommendations
                    WHERE user_id = %s AND car_id = %s
                    """,
                    (user_id_uuid, car_id)
                )
        
        # Insert new recommendations
        for rank, (car_id, score) in enumerate(recs_to_insert, 1):
            try:
                car_id_uuid = uuid.UUID(car_id)
                session.execute(
                    """
                    INSERT INTO user_recommendations (user_id, car_id, created_at, rank, similarity_score, recommendation_reason)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (user_id_uuid, car_id_uuid, current_time, rank, float(score), reason)
                )
                logging.info(f"Inserted recommendation for user {user_id}, car {car_id}, rank {rank}, score {score:.2f}")
            except Exception as e:
                logging.error(f"Error inserting recommendation for user {user_id}, car {car_id}: {e}")
        
        logging.info(f"User {user_id}: Added {len(recs_to_insert)} new recommendations")
    except Exception as e:
        logging.error(f"Error processing recommendations for user {user_id}: {e}")

# Verify insertion
try:
    rows = session.execute("SELECT user_id, car_id, rank, similarity_score, recommendation_reason FROM user_recommendations LIMIT 10")
    logging.info("\nSample recommendations in database:")
    for row in rows:
        logging.info(f"User: {row.user_id}, Car: {row.car_id}, Rank: {row.rank}, Score: {row.similarity_score:.2f}, Reason: {row.recommendation_reason}")
    
    # Count recommendations per user
    total = 0
    users = set(views_df['user_id']).union(set(favs_df['user_id']))
    for user_id in users:
        count = session.execute(
            "SELECT COUNT(*) FROM user_recommendations WHERE user_id = %s",
            [uuid.UUID(user_id)]
        ).one()[0]
        total += count
    logging.info(f"Total recommendations stored: {total}")
    
    # Validate exclusions
    logging.info("\nValidating exclusions:")
    for row in session.execute("SELECT user_id, car_id FROM user_recommendations LIMIT 100"):
        user_id, car_id = str(row.user_id), str(row.car_id)
        views = set(views_df[views_df['user_id'] == user_id]['car_id'])
        favs = set(favs_df[favs_df['user_id'] == user_id]['car_id'])
        if car_id in views or car_id in favs:
            logging.warning(f"Invalid recommendation: User {user_id}, Car {car_id} in views/favs")
except Exception as e:
    logging.error(f"Error querying user_recommendations: {e}")

# Clean up
cluster.shutdown()
logging.info("Recommendation process complete.")