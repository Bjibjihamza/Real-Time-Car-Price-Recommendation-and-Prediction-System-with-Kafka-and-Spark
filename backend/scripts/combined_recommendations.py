import pandas as pd
import numpy as np
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from datetime import datetime
import pytz
import logging
import random
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from scipy.sparse.linalg import svds
import uuid
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def setup_cassandra_session():
    try:
        cluster = Cluster(['localhost'], protocol_version=4)
        session = cluster.connect('cars_keyspace')
        logging.info("Connected to Cassandra")
        return session, cluster
    except Exception as e:
        logging.error(f"Error connecting to Cassandra: {e}")
        raise

def recency_weight(timestamp, current_time):
    try:
        if timestamp.tzinfo is None:
            timestamp = pytz.UTC.localize(timestamp)
        days_old = (current_time - timestamp).total_seconds() / (24 * 3600)
        return max(0.5, 1.0 - (days_old / 30.0))
    except Exception as e:
        logging.warning(f"Invalid timestamp {timestamp}: {e}")
        return 0.5

def fetch_data(session, user_id):
    try:
        user_id_str = str(user_id)
        views_query = "SELECT user_id, car_id, view_timestamp FROM car_views_by_user WHERE user_id = %s"
        views_rows = session.execute(SimpleStatement(views_query), [uuid.UUID(user_id)])
        views_data = [(str(row.user_id), str(row.car_id), row.view_timestamp) for row in views_rows]

        favs_query = "SELECT user_id, car_id, added_timestamp FROM favorite_cars_by_user WHERE user_id = %s"
        favs_rows = session.execute(SimpleStatement(favs_query), [uuid.UUID(user_id)])
        favs_data = [(str(row.user_id), str(row.car_id), row.added_timestamp) for row in favs_rows]

        prefs_query = """
            SELECT user_id, preferred_brands, preferred_door_count, preferred_fuel_types,
                   preferred_transmissions, budget_max, budget_min, mileage_max, mileage_min,
                   preferred_years FROM user_preferences WHERE user_id = %s
        """
        prefs_rows = session.execute(SimpleStatement(prefs_query), [uuid.UUID(user_id)])
        prefs_data = [
            (
                str(row.user_id),
                row.preferred_brands or set(),
                row.preferred_door_count or set(),
                row.preferred_fuel_types or set(),
                row.preferred_transmissions or set(),
                row.budget_max or 0.0,
                row.budget_min or 0.0,
                row.mileage_max or 0.0,
                row.mileage_min or 0.0,
                row.preferred_years or set()
            ) for row in prefs_rows
        ]

        cars_query = """
            SELECT id, brand, door_count, fuel_type, transmission, price, mileage, year
            FROM cleaned_cars
        """
        cars_rows = session.execute(SimpleStatement(cars_query))
        cars_data = [
            (
                str(row.id),
                row.brand or 'unknown',
                row.door_count,
                row.fuel_type or 'unknown',
                row.transmission or 'unknown',
                row.price or np.nan,
                row.mileage or np.nan,
                row.year or np.nan
            ) for row in cars_rows
        ]

        return views_data, favs_data, prefs_data, cars_data
    except Exception as e:
        logging.error(f"Error fetching data: {e}")
        raise

def delete_existing_recommendations(session, user_id):
    try:
        query = "DELETE FROM user_recommendations WHERE user_id = %s"
        session.execute(SimpleStatement(query), [uuid.UUID(user_id)])
        logging.info(f"Successfully deleted existing recommendations for user {user_id}")
    except Exception as e:
        logging.error(f"Failed to delete recommendations for user {user_id}: {e}")
        raise

def get_fallback_recommendations(session, used_car_ids):
    try:
        query = "SELECT id FROM cleaned_cars LIMIT 10"
        rows = session.execute(SimpleStatement(query))
        car_ids = [str(row.id) for row in rows if str(row.id) not in used_car_ids]
        if not car_ids:
            logging.warning("No cars available for fallback")
            return []
        random.shuffle(car_ids)
        return [(car_id, 0.5, "Random popular car") for car_id in car_ids[:3]]
    except Exception as e:
        logging.error(f"Error fetching fallback recommendations: {e}")
        return []

def content_based_filtering(user_id, user_prefs_df, cars_df, session, used_car_ids):
    try:
        if user_prefs_df.empty:
            logging.warning(f"No preferences for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        user_prefs_df['preferred_transmissions'] = user_prefs_df['preferred_transmissions'].apply(lambda x: {t.lower() for t in x})
        cars_df['transmission'] = cars_df['transmission'].str.lower()
        cars_df['brand'] = cars_df['brand'].str.lower()
        cars_df['fuel_type'] = cars_df['fuel_type'].str.lower()

        cars_df['door_count'] = cars_df['door_count'].fillna(5).astype(int)
        cars_df['price'] = cars_df['price'].fillna(cars_df['price'].median(skipna=True))
        cars_df['mileage'] = cars_df['mileage'].fillna(cars_df['mileage'].median(skipna=True))
        cars_df['year'] = cars_df['year'].fillna(cars_df['year'].median(skipna=True))

        all_brands = sorted(set(cars_df['brand'].unique()) | set().union(*user_prefs_df['preferred_brands']))
        door_counts = sorted(set(cars_df['door_count'].unique()) | set().union(*user_prefs_df['preferred_door_count']))
        all_fuel_types = sorted(set(cars_df['fuel_type'].unique()) | set().union(*user_prefs_df['preferred_fuel_types']))
        all_transmissions = sorted(set(cars_df['transmission'].unique()) | set().union(*user_prefs_df['preferred_transmissions']))

        numerical_cols = ['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean', 'price', 'mileage', 'year']
        categorical_cols = (
            [f'brand_{b}' for b in all_brands] +
            [f'door_count_{dc}' for dc in door_counts] +
            [f'fuel_type_{ft}' for ft in all_fuel_types] +
            [f'transmission_{tr}' for tr in all_transmissions]
        )

        user_prefs_df['preferred_years_mean'] = user_prefs_df['preferred_years'].apply(lambda x: np.mean(list(x)) if x else 2018)
        user_num_values = MinMaxScaler().fit_transform(
            user_prefs_df[['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean']]
        )
        user_num_df = pd.DataFrame(0.0, index=user_prefs_df['user_id'], columns=numerical_cols)
        user_num_df[['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean']] = user_num_values

        car_num_values = MinMaxScaler().fit_transform(cars_df[['price', 'mileage', 'year']])
        car_num_df = pd.DataFrame(0.0, index=cars_df['car_id'], columns=numerical_cols)
        car_num_df[['price', 'mileage', 'year']] = car_num_values

        user_cat_data = {col: np.zeros(len(user_prefs_df)) for col in categorical_cols}
        for i, row in user_prefs_df.iterrows():
            for brand in row['preferred_brands']:
                if brand in all_brands:
                    user_cat_data[f'brand_{brand}'][i] = 1
            for dc in row['preferred_door_count']:
                if dc in door_counts:
                    user_cat_data[f'door_count_{dc}'][i] = 1
            for ft in row['preferred_fuel_types']:
                if ft in all_fuel_types:
                    user_cat_data[f'fuel_type_{ft}'][i] = 1
            for tr in row['preferred_transmissions']:
                if tr in all_transmissions:
                    user_cat_data[f'transmission_{tr}'][i] = 1
        user_cat_df = pd.DataFrame(user_cat_data, index=user_prefs_df['user_id'])

        car_cat_data = {col: np.zeros(len(cars_df)) for col in categorical_cols}
        for i, row in cars_df.iterrows():
            if row['brand'] in all_brands:
                car_cat_data[f'brand_{row["brand"]}'][i] = 1
            if row['door_count'] in door_counts:
                car_cat_data[f'door_count_{row["door_count"]}'][i] = 1
            if row['fuel_type'] in all_fuel_types:
                car_cat_data[f'fuel_type_{row["fuel_type"]}'][i] = 1
            if row['transmission'] in all_transmissions:
                car_cat_data[f'transmission_{row["transmission"]}'][i] = 1
        car_cat_df = pd.DataFrame(car_cat_data, index=cars_df['car_id'])

        user_features_df = pd.concat([user_cat_df, user_num_df], axis=1)
        car_features_df = pd.concat([car_cat_df, car_num_df], axis=1)

        similarity_matrix = cosine_similarity(user_features_df.values, car_features_df.values)
        similarity_df = pd.DataFrame(similarity_matrix, index=user_features_df.index, columns=car_features_df.index)

        user_similarities = similarity_df.loc[user_id]
        top_cars = user_similarities.nlargest(10)
        recommendations = []
        count = 0
        for car_id, score in top_cars.items():
            if car_id not in used_car_ids and count < 3:
                user_features = user_features_df.loc[user_id]
                car_features = car_features_df.loc[car_id]
                matches = []
                for col in user_features.index:
                    if col.startswith('brand_') and user_features[col] > 0 and car_features[col] > 0:
                        matches.append(f"{col.replace('brand_', '')} brand")
                    elif col.startswith('fuel_type_') and user_features[col] > 0 and car_features[col] > 0:
                        matches.append(f"{col.replace('fuel_type_', '')} fuel")
                    elif col.startswith('transmission_') and user_features[col] > 0 and car_features[col] > 0:
                        matches.append(f"{col.replace('transmission_', '')} transmission")
                    elif col.startswith('door_count_') and user_features[col] > 0 and car_features[col] > 0:
                        matches.append(f"{col.replace('door_count_', '')} doors")
                reason = f"Matches your preferences for {', '.join(matches) if matches else 'similar features'}"
                recommendations.append((car_id, score, reason))
                used_car_ids.add(car_id)
                count += 1

        if not recommendations:
            logging.warning(f"No content-based recommendations for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        return recommendations
    except Exception as e:
        logging.error(f"Error in content-based filtering: {e}")
        return get_fallback_recommendations(session, used_car_ids)

def user_based_collaborative_filtering(user_id, views_df, favs_df, current_time, session, used_car_ids):
    try:
        interactions = []
        for _, row in views_df.iterrows():
            if pd.notnull(row['view_timestamp']):
                interactions.append((row['user_id'], row['car_id'], 1.0 * recency_weight(row['view_timestamp'], current_time)))
        for _, row in favs_df.iterrows():
            if pd.notnull(row['added_timestamp']):
                interactions.append((row['user_id'], row['car_id'], 2.0 * recency_weight(row['added_timestamp'], current_time)))

        interaction_df = pd.DataFrame(interactions, columns=['user_id', 'car_id', 'score'])
        user_item_matrix = pd.pivot_table(
            interaction_df, values='score', index='user_id', columns='car_id', aggfunc='sum', fill_value=0
        )
        logging.info(f"User-item matrix shape: {user_item_matrix.shape}")

        if user_item_matrix.shape[0] < 2:
            logging.warning(f"Only one user in matrix for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        user_similarity_matrix = cosine_similarity(user_item_matrix)
        user_ids = user_item_matrix.index
        user_similarity_df = pd.DataFrame(user_similarity_matrix, index=user_ids, columns=user_ids)

        user_views = set(views_df[views_df['user_id'] == user_id]['car_id'])
        user_favs = set(favs_df[favs_df['user_id'] == user_id]['car_id'])
        excluded_cars = user_views.union(user_favs).union(used_car_ids)

        similar_users = user_similarity_df.loc[user_id].sort_values(ascending=False)[1:11]
        candidate_scores = {}
        for similar_user_id, sim_score in similar_users.items():
            if sim_score > 0:
                similar_user_views = set(views_df[views_df['user_id'] == similar_user_id]['car_id'])
                similar_user_favs = set(favs_df[favs_df['user_id'] == similar_user_id]['car_id'])
                similar_user_cars = similar_user_views.union(similar_user_favs)
                for car_id in similar_user_cars:
                    if car_id not in excluded_cars:
                        candidate_scores[car_id] = candidate_scores.get(car_id, 0) + sim_score

        if not candidate_scores:
            logging.warning(f"No similar user recommendations for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        max_score = max(candidate_scores.values())
        candidate_scores = {car_id: (score / max_score) * 0.9 for car_id, score in candidate_scores.items()}
        top_recs = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        return [(car_id, score, "Based on similarities with another user") for car_id, score in top_recs]
    except Exception as e:
        logging.error(f"Error in user-based collaborative filtering: {e}")
        return get_fallback_recommendations(session, used_car_ids)

def item_based_collaborative_filtering(user_id, views_df, favs_df, current_time, session, used_car_ids):
    try:
        interactions = []
        for _, row in views_df.iterrows():
            if pd.notnull(row['view_timestamp']):
                interactions.append((row['user_id'], row['car_id'], 1.0 * recency_weight(row['view_timestamp'], current_time)))
        for _, row in favs_df.iterrows():
            if pd.notnull(row['added_timestamp']):
                interactions.append((row['user_id'], row['car_id'], 2.0 * recency_weight(row['added_timestamp'], current_time)))

        interaction_df = pd.DataFrame(interactions, columns=['user_id', 'car_id', 'score'])
        user_item_matrix = pd.pivot_table(
            interaction_df, values='score', index='user_id', columns='car_id', aggfunc='sum', fill_value=0
        )
        logging.info(f"User-item matrix shape: {user_item_matrix.shape}")

        car_similarity_matrix = cosine_similarity(user_item_matrix.T)
        car_ids = user_item_matrix.columns
        car_similarity_df = pd.DataFrame(car_similarity_matrix, index=car_ids, columns=car_ids)

        user_views = set(views_df[views_df['user_id'] == user_id]['car_id'])
        user_favs = set(favs_df[favs_df['user_id'] == user_id]['car_id'])
        user_interactions = user_views.union(user_favs)

        if not user_interactions:
            logging.warning(f"No interactions for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        candidate_scores = {}
        for car_id in user_interactions:
            if car_id in car_similarity_df.index:
                similar_cars = car_similarity_df.loc[car_id].dropna()
                for similar_car_id, sim_score in similar_cars.items():
                    if similar_car_id not in user_interactions.union(used_car_ids) and sim_score > 0:
                        candidate_scores[similar_car_id] = candidate_scores.get(similar_car_id, 0) + sim_score

        if not candidate_scores:
            logging.warning(f"No similar item recommendations for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        max_score = max(candidate_scores.values())
        candidate_scores = {car_id: (score / max_score) * 0.9 for car_id, score in candidate_scores.items()}
        top_recs = sorted(candidate_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        return [(car_id, score, "Based on your viewing - search and favorite patterns") for car_id, score in top_recs]
    except Exception as e:
        logging.error(f"Error in item-based collaborative filtering: {e}")
        return get_fallback_recommendations(session, used_car_ids)

def hybrid_recommendations(user_id, views_df, favs_df, user_prefs_df, cars_df, current_time, session, used_car_ids):
    try:
        interactions = []
        for _, row in views_df.iterrows():
            if pd.notnull(row['view_timestamp']):
                interactions.append((row['user_id'], row['car_id'], 0.5 * recency_weight(row['view_timestamp'], current_time)))
        for _, row in favs_df.iterrows():
            if pd.notnull(row['added_timestamp']):
                interactions.append((row['user_id'], row['car_id'], 1.0 * recency_weight(row['added_timestamp'], current_time)))

        interaction_df = pd.DataFrame(interactions, columns=['user_id', 'car_id', 'rating'])
        user_item_matrix = pd.pivot_table(
            interaction_df, values='rating', index='user_id', columns='car_id', aggfunc='max', fill_value=0
        )
        logging.info(f"User-item matrix shape: {user_item_matrix.shape}")

        if user_item_matrix.shape[0] < 2:
            logging.warning(f"Only one user in matrix for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        R = user_item_matrix.values
        min_dim = min(R.shape)
        k = min(20, min_dim - 1)
        U, sigma, Vt = svds(R, k=k)
        sigma = np.diag(sigma)
        R_pred = np.dot(np.dot(U, sigma), Vt)
        R_pred[R_pred < 0] = 0
        pred_df = pd.DataFrame(R_pred, index=user_item_matrix.index, columns=user_item_matrix.columns)

        if user_prefs_df.empty:
            logging.warning(f"No preferences for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        user_prefs_df['preferred_transmissions'] = user_prefs_df['preferred_transmissions'].apply(lambda x: {t.lower() for t in x})
        cars_df['transmission'] = cars_df['transmission'].str.lower()
        cars_df['brand'] = cars_df['brand'].str.lower()
        cars_df['fuel_type'] = cars_df['fuel_type'].str.lower()

        cars_df['door_count'] = cars_df['door_count'].fillna(5).astype(int)
        cars_df['price'] = cars_df['price'].fillna(cars_df['price'].median(skipna=True))
        cars_df['mileage'] = cars_df['mileage'].fillna(cars_df['mileage'].median(skipna=True))
        cars_df['year'] = cars_df['year'].fillna(cars_df['year'].median(skipna=True))

        all_brands = sorted(set(cars_df['brand'].unique()) | set().union(*user_prefs_df['preferred_brands']))
        door_counts = sorted(set(cars_df['door_count'].unique()) | set().union(*user_prefs_df['preferred_door_count']))
        all_fuel_types = sorted(set(cars_df['fuel_type'].unique()) | set().union(*user_prefs_df['preferred_fuel_types']))
        all_transmissions = sorted(set(cars_df['transmission'].unique()) | set().union(*user_prefs_df['preferred_transmissions']))

        numerical_cols = ['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean', 'price', 'mileage', 'year']
        categorical_cols = (
            [f'brand_{b}' for b in all_brands] +
            [f'door_count_{dc}' for dc in door_counts] +
            [f'fuel_type_{ft}' for ft in all_fuel_types] +
            [f'transmission_{tr}' for tr in all_transmissions]
        )

        user_prefs_df['preferred_years_mean'] = user_prefs_df['preferred_years'].apply(lambda x: np.mean(list(x)) if x else 2018)
        user_num_values = MinMaxScaler().fit_transform(
            user_prefs_df[['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean']]
        )
        user_num_df = pd.DataFrame(0.0, index=user_prefs_df['user_id'], columns=numerical_cols)
        user_num_df[['budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years_mean']] = user_num_values

        car_num_values = MinMaxScaler().fit_transform(cars_df[['price', 'mileage', 'year']])
        car_num_df = pd.DataFrame(0.0, index=cars_df['car_id'], columns=numerical_cols)
        car_num_df[['price', 'mileage', 'year']] = car_num_values

        user_cat_data = {col: np.zeros(len(user_prefs_df)) for col in categorical_cols}
        for i, row in user_prefs_df.iterrows():
            for brand in row['preferred_brands']:
                if brand in all_brands:
                    user_cat_data[f'brand_{brand}'][i] = 1
            for dc in row['preferred_door_count']:
                if dc in door_counts:
                    user_cat_data[f'door_count_{dc}'][i] = 1
            for ft in row['preferred_fuel_types']:
                if ft in all_fuel_types:
                    user_cat_data[f'fuel_type_{ft}'][i] = 1
            for tr in row['preferred_transmissions']:
                if tr in all_transmissions:
                    user_cat_data[f'transmission_{tr}'][i] = 1
        user_cat_df = pd.DataFrame(user_cat_data, index=user_prefs_df['user_id'])

        car_cat_data = {col: np.zeros(len(cars_df)) for col in categorical_cols}
        for i, row in cars_df.iterrows():
            if row['brand'] in all_brands:
                car_cat_data[f'brand_{row["brand"]}'][i] = 1
            if row['door_count'] in door_counts:
                car_cat_data[f'door_count_{row["door_count"]}'][i] = 1
            if row['fuel_type'] in all_fuel_types:
                car_cat_data[f'fuel_type_{row["fuel_type"]}'][i] = 1
            if row['transmission'] in all_transmissions:
                car_cat_data[f'transmission_{row["transmission"]}'][i] = 1
        car_cat_df = pd.DataFrame(car_cat_data, index=cars_df['car_id'])

        user_features_df = pd.concat([user_cat_df, user_num_df], axis=1)
        car_features_df = pd.concat([car_cat_df, car_num_df], axis=1)

        content_similarity_matrix = cosine_similarity(user_features_df.values, car_features_df.values)
        content_similarity_df = pd.DataFrame(content_similarity_matrix, index=user_features_df.index, columns=car_features_df.index)

        common_cars = pred_df.columns.intersection(content_similarity_df.columns)
        if not common_cars.size:
            logging.warning(f"No common cars for hybrid recommendations for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        pred_df = pred_df[common_cars]
        content_similarity_df = content_similarity_df[common_cars]

        collab_scores = MinMaxScaler().fit_transform(pred_df.loc[[user_id]].values.reshape(-1, 1)).reshape(pred_df.loc[[user_id]].shape)
        content_scores = MinMaxScaler().fit_transform(content_similarity_df.loc[[user_id]].values.reshape(-1, 1)).reshape(content_similarity_df.loc[[user_id]].shape)

        alpha = 0.3
        hybrid_scores = alpha * collab_scores + (1 - alpha) * content_scores
        hybrid_df = pd.DataFrame(hybrid_scores, index=[user_id], columns=common_cars)

        user_views = set(views_df[views_df['user_id'] == user_id]['car_id'])
        user_favs = set(favs_df[favs_df['user_id'] == user_id]['car_id'])
        unrated_cars = [col for col in hybrid_df.columns if col not in user_views.union(user_favs).union(used_car_ids)]
        if not unrated_cars:
            logging.warning(f"No unrated cars for hybrid recommendations for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        top_cars = hybrid_df.loc[user_id, unrated_cars].nlargest(3).index
        top_scores = hybrid_df.loc[user_id, top_cars].values

        recommendations = []
        for car_id, score in zip(top_cars, top_scores):
            collab_score = pred_df.loc[user_id, car_id]
            content_score = content_similarity_df.loc[user_id, car_id]
            reason = f"Hybrid: {alpha:.2f}*collaborative ({collab_score:.2f}) + {1-alpha:.2f}*content-based ({content_score:.2f})"
            recommendations.append((car_id, score, reason))

        if not recommendations:
            logging.warning(f"No hybrid recommendations for {user_id}, using fallback")
            return get_fallback_recommendations(session, used_car_ids)

        return recommendations
    except Exception as e:
        logging.error(f"Error in hybrid recommendations: {e}")
        return get_fallback_recommendations(session, used_car_ids)

def generate_recommendations(user_id):
    session, cluster = setup_cassandra_session()
    try:
        views_data, favs_data, prefs_data, cars_data = fetch_data(session, user_id)
        views_df = pd.DataFrame(views_data, columns=['user_id', 'car_id', 'view_timestamp'])
        favs_df = pd.DataFrame(favs_data, columns=['user_id', 'car_id', 'added_timestamp'])
        user_prefs_df = pd.DataFrame(
            prefs_data,
            columns=['user_id', 'preferred_brands', 'preferred_door_count', 'preferred_fuel_types',
                     'preferred_transmissions', 'budget_max', 'budget_min', 'mileage_max', 'mileage_min', 'preferred_years']
        )
        cars_df = pd.DataFrame(
            cars_data,
            columns=['car_id', 'brand', 'door_count', 'fuel_type', 'transmission', 'price', 'mileage', 'year']
        )

        delete_existing_recommendations(session, user_id)

        current_time = datetime.now(pytz.UTC)
        used_car_ids = set()

        content_based_recs = content_based_filtering(user_id, user_prefs_df, cars_df, session, used_car_ids)
        used_car_ids.update(car_id for car_id, _, _ in content_based_recs)

        user_based_recs = user_based_collaborative_filtering(user_id, views_df, favs_df, current_time, session, used_car_ids)
        used_car_ids.update(car_id for car_id, _, _ in user_based_recs)

        item_based_recs = item_based_collaborative_filtering(user_id, views_df, favs_df, current_time, session, used_car_ids)
        used_car_ids.update(car_id for car_id, _, _ in item_based_recs)

        hybrid_recs = hybrid_recommendations(user_id, views_df, favs_df, user_prefs_df, cars_df, current_time, session, used_car_ids)

        all_recommendations = []
        for method, recs in [
            ("content-based", content_based_recs),
            ("user-based", user_based_recs),
            ("item-based", item_based_recs),
            ("hybrid", hybrid_recs)
        ]:
            for rank, (car_id, score, reason) in enumerate(recs, 1):
                all_recommendations.append({
                    'user_id': uuid.UUID(user_id),
                    'car_id': uuid.UUID(car_id),
                    'rank': rank,
                    'similarity_score': float(score),
                    'recommendation_reason': reason,
                    'created_at': current_time
                })

        insert_query = """
            INSERT INTO user_recommendations (user_id, car_id, created_at, rank, recommendation_reason, similarity_score)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        for rec in all_recommendations:
            try:
                session.execute(
                    insert_query,
                    (
                        rec['user_id'],
                        rec['car_id'],
                        rec['created_at'],
                        rec['rank'],
                        rec['recommendation_reason'],
                        rec['similarity_score']
                    )
                )
            except Exception as e:
                logging.error(f"Error inserting recommendation for user {rec['user_id']}, car {rec['car_id']}: {e}")

        logging.info(f"Inserted {len(all_recommendations)} recommendations for user {user_id}")

    except Exception as e:
        logging.error(f"Error in recommendation process: {e}")
        sys.exit(1)
    finally:
        cluster.shutdown()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        logging.error("Usage: python combined_recommendations.py <user_id>")
        sys.exit(1)
    try:
        user_id = str(uuid.UUID(sys.argv[1]))
        generate_recommendations(user_id)
    except ValueError as e:
        logging.error(f"Invalid UUID format for user_id: {sys.argv[1]}")
        sys.exit(1)