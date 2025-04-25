-- Create keyspace if not exists
CREATE KEYSPACE IF NOT EXISTS avito WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3};

-- Use the keyspace
USE avito;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    location TEXT,
    preferred_brands SET<TEXT>,
    preferred_models SET<TEXT>,
    min_price INT,
    max_price INT,
    preferred_year_min INT,
    preferred_year_max INT,
    preferred_transmission SET<TEXT>,
    preferred_fuel_types SET<TEXT>,
    preferred_vehicle_types SET<TEXT>,
    preferred_features SET<TEXT>,
    registration_date TIMESTAMP,
    last_login TIMESTAMP
);

-- Create user_interactions table
CREATE TABLE IF NOT EXISTS user_interactions (
    interaction_id UUID PRIMARY KEY,
    user_id UUID,
    car_id INT,
    interaction_type TEXT, -- 'view', 'save', 'contact', 'search'
    interaction_timestamp TIMESTAMP,
    duration_seconds INT, -- for views
    search_query TEXT, -- for searches
    filters_applied MAP<TEXT, TEXT>, -- for searches with filters
    interaction_score FLOAT -- calculated engagement score
);

-- Index for efficient queries
CREATE INDEX ON user_interactions (user_id);
CREATE INDEX ON user_interactions (car_id);

-- Insert sample users
INSERT INTO users (
    user_id, name, email, location, preferred_brands, preferred_models,
    min_price, max_price, preferred_year_min, preferred_year_max,
    preferred_transmission, preferred_fuel_types, preferred_vehicle_types, preferred_features,
    registration_date, last_login
) VALUES (
    uuid(), 'Mohammed Alami', 'mohammed.alami@email.com', 'Casablanca',
    {'Mercedes-Benz', 'BMW', 'Audi'}, {'Classe C', 'Série 3', 'A4'},
    200000, 500000, 2018, 2023,
    {'Automatique'}, {'Diesel'}, {'Voitures d''occasion, à vendre'},
    {'Airbags', 'Caméra de recul', 'Système de navigation/GPS', 'Sièges cuir'},
    '2024-12-01 10:30:00', '2025-04-17 15:45:00'
);

INSERT INTO users (
    user_id, name, email, location, preferred_brands, preferred_models,
    min_price, max_price, preferred_year_min, preferred_year_max,
    preferred_transmission, preferred_fuel_types, preferred_vehicle_types, preferred_features,
    registration_date, last_login
) VALUES (
    uuid(), 'Fatima Benali', 'fatima.b@email.com', 'Rabat',
    {'Dacia', 'Renault', 'Peugeot'}, {'Lodgy', 'Clio', '208'},
    80000, 150000, 2015, 2022,
    {'Manuelle'}, {'Diesel', 'Essence'}, {'Voitures d''occasion, à vendre'},
    {'Climatisation', 'Vitres électriques', 'CD/MP3/Bluetooth'},
    '2025-01-15 14:20:00', '2025-04-18 09:10:00'
);

INSERT INTO users (
    user_id, name, email, location, preferred_brands, preferred_models,
    min_price, max_price, preferred_year_min, preferred_year_max,
    preferred_transmission, preferred_fuel_types, preferred_vehicle_types, preferred_features,
    registration_date, last_login
) VALUES (
    uuid(), 'Youssef Chahid', 'youssef.chahid@email.com', 'Marrakech',
    {'Toyota', 'Honda', 'Nissan'}, {'RAV4', 'CR-V', 'Qashqai'},
    150000, 300000, 2017, 2023,
    {'Automatique', 'Manuelle'}, {'Hybrid', 'Diesel'}, {'Voitures d''occasion, à vendre'},
    {'Caméra de recul', 'Système de navigation/GPS', 'Radar de recul'},
    '2025-02-10 08:45:00', '2025-04-16 18:30:00'
);

INSERT INTO users (
    user_id, name, email, location, preferred_brands, preferred_models,
    min_price, max_price, preferred_year_min, preferred_year_max,
    preferred_transmission, preferred_fuel_types, preferred_vehicle_types, preferred_features,
    registration_date, last_login
) VALUES (
    uuid(), 'Laila Mourad', 'laila.m@email.com', 'Tanger',
    {'Volkswagen', 'Skoda', 'Seat'}, {'Golf', 'Octavia', 'Leon'},
    120000, 220000, 2016, 2022,
    {'Manuelle'}, {'Diesel'}, {'Voitures d''occasion, à vendre'},
    {'Airbags', 'ESP', 'Climatisation', 'Limiteur de vitesse'},
    '2025-03-05 16:15:00', '2025-04-17 12:20:00'
);

INSERT INTO users (
    user_id, name, email, location, preferred_brands, preferred_models,
    min_price, max_price, preferred_year_min, preferred_year_max,
    preferred_transmission, preferred_fuel_types, preferred_vehicle_types, preferred_features,
    registration_date, last_login
) VALUES (
    uuid(), 'Karim Idrissi', 'karim.idrissi@email.com', 'Fès',
    {'Volvo', 'Jaguar', 'Land Rover'}, {'XC60', 'E-Pace', 'Range Rover Evoque'},
    250000, 600000, 2019, 2023,
    {'Automatique'}, {'Diesel'}, {'Voitures d''occasion, à vendre'},
    {'Sièges cuir', 'Système de navigation/GPS', 'Jantes aluminium', 'Caméra de recul'},
    '2025-01-25 11:50:00', '2025-04-18 10:05:00'
);

-- Get user IDs for interactions (you would need to run a SELECT and use the actual UUIDs)
-- For demonstration, I'll use placeholders and manual UUIDs

-- Sample user_interactions (using fixed UUIDs for demonstration)
INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, duration_seconds, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440000, 23, 'view',
    '2025-04-18 09:15:30', 120, null,
    null, 0.7
);

INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, duration_seconds, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440000, 5, 'save',
    '2025-04-18 09:18:45', null, null,
    null, 0.9
);

INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, duration_seconds, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440001, 33, 'view',
    '2025-04-17 14:30:10', 85, null,
    null, 0.5
);

INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, duration_seconds, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440001, 28, 'contact',
    '2025-04-17 14:40:22', null, null,
    null, 1.0
);

INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, duration_seconds, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440002, 10, 'view',
    '2025-04-18 11:05:45', 150, null,
    null, 0.8
);

INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, duration_seconds, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440002, 16, 'view',
    '2025-04-18 11:12:30', 45, null,
    null, 0.3
);

INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440003, null, 'search',
    '2025-04-17 16:25:18', 'voiture economique',
    {'marque': 'Dacia', 'année_min': '2016', 'carburant': 'Diesel'}, 0.6
);

INSERT INTO user_interactions (
    interaction_id, user_id, car_id, interaction_type, 
    interaction_timestamp, search_query, 
    filters_applied, interaction_score
) VALUES (
    uuid(), 550e8400-e29b-41d4-a716-446655440004, null, 'search',
    '2025-04-18 08:45:12', 'SUV premium',
    {'marque': 'Volvo', 'année_min': '2020', 'transmission': 'Automatique'}, 0.7
);

-- Sample queries for your recommendation system
-- 1. Get user preferences
SELECT * FROM users WHERE user_id = 550e8400-e29b-41d4-a716-446655440000;

-- 2. Get user interactions with cars
SELECT * FROM user_interactions WHERE user_id = 550e8400-e29b-41d4-a716-446655440000;

-- 3. Find most viewed cars
SELECT car_id, COUNT(*) as view_count 
FROM user_interactions 
WHERE interaction_type = 'view' 
GROUP BY car_id 
ALLOW FILTERING;

-- 4. Find cars similar to what a user has viewed
SELECT c.* 
FROM cars c 
WHERE c.marque IN (SELECT marque FROM cars WHERE id IN 
  (SELECT car_id FROM user_interactions 
   WHERE user_id = 550e8400-e29b-41d4-a716-446655440000 
   AND interaction_type IN ('view', 'save', 'contact') 
   ALLOW FILTERING))
AND c.id NOT IN 
  (SELECT car_id FROM user_interactions 
   WHERE user_id = 550e8400-e29b-41d4-a716-446655440000 
   AND car_id IS NOT NULL 
   ALLOW FILTERING);