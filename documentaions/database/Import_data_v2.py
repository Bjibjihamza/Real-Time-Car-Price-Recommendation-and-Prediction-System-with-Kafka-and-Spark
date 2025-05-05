import pandas as pd
from cassandra.cluster import Cluster
from cassandra.query import SimpleStatement
from uuid import UUID
from datetime import datetime
import json
import ast
import os
import sys

# Configuration
CASSANDRA_HOST = ['127.0.0.1']  # Replace with your Cassandra host
KEYSPACE = 'cars_keyspace'
CSV_DIR = '/path/to/import/'  # Replace with your actual CSV directory path using the command find ~/ -name "apache-cassandra*" -type d

# Connect to Cassandra
try:
    cluster = Cluster(CASSANDRA_HOST)
    session = cluster.connect(KEYSPACE)
    print(f"Connected to Cassandra cluster at {CASSANDRA_HOST}")
except Exception as e:
    print(f"Failed to connect to Cassandra: {str(e)}")
    sys.exit(1)

# Helper functions to parse complex types
def parse_set(value):
    if pd.isna(value) or value == '':
        return set()
    try:
        # For Cassandra, we often need to return a Python set that will be properly serialized
        if isinstance(value, set):
            return value
        # Try using ast.literal_eval first
        return set(ast.literal_eval(value))
    except:
        try:
            # If that fails, try simple string splitting
            return set(item.strip() for item in value.strip('{}').split(',') if item.strip())
        except:
            print(f"Warning: Could not parse set value: {value}")
            return set()

def parse_map(value):
    if pd.isna(value) or value == '':
        return {}
    try:
        # Try using json loads
        return json.loads(value.replace("'", '"'))
    except:
        try:
            # If that fails, try manual parsing
            result = {}
            pairs = value.strip('{}').split(',')
            for pair in pairs:
                if ':' in pair:
                    k, v = pair.split(':', 1)
                    result[k.strip()] = v.strip()
            return result
        except:
            print(f"Warning: Could not parse map value: {value}")
            return {}

def parse_uuid(value):
    if pd.isna(value) or value == '':
        return None
    try:
        return UUID(str(value))
    except:
        print(f"Warning: Could not parse UUID value: {value}")
        return None

def parse_timestamp(value):
    if pd.isna(value) or value == '':
        return None
    try:
        # Try multiple timestamp formats
        formats = [
            '%Y-%m-%d %H:%M:%S.%f%z',
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y-%m-%d %H:%M:%S%z',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(str(value), fmt)
            except:
                continue
        
        # If none of the formats work, try parsing as timestamp
        try:
            return datetime.fromtimestamp(float(value))
        except:
            print(f"Warning: Could not parse timestamp value: {value}")
            return None
    except:
        print(f"Warning: Could not parse timestamp value: {value}")
        return None

# Table configurations - excluding user_recommendations
TABLES = {
    'car_views_by_user': {
        'columns': ['user_id', 'view_date', 'view_timestamp', 'car_id', 'view_duration_seconds', 'view_source'],
        'required_columns': ['user_id', 'view_date', 'view_timestamp', 'car_id'],  # These columns must exist
        'types': {
            'view_timestamp': parse_timestamp,
            'view_duration_seconds': lambda x: int(float(x)) if pd.notna(x) else None
        },
        'query': """
        INSERT INTO car_views_by_user (user_id, view_date, view_timestamp, car_id, view_duration_seconds, view_source)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
    },
    'cleaned_cars': {
        'columns': ['id', 'brand', 'condition', 'creator', 'door_count', 'equipment', 'first_owner', 'fiscal_power',
                    'fuel_type', 'image_folder', 'mileage', 'model', 'origin', 'price', 'publication_date',
                    'sector', 'seller_city', 'source', 'title', 'transmission', 'year'],
        'required_columns': ['id'],  # These columns must exist
        'types': {
            'id': parse_uuid,
            'door_count': lambda x: int(float(x)) if pd.notna(x) else None,
            'fiscal_power': lambda x: int(float(x)) if pd.notna(x) else None,
            'mileage': lambda x: int(float(x)) if pd.notna(x) else None,
            'price': lambda x: int(float(x)) if pd.notna(x) else None,
            'year': lambda x: int(float(x)) if pd.notna(x) else None
        },
        'query': """
        INSERT INTO cleaned_cars (id, brand, condition, creator, door_count, equipment, first_owner, fiscal_power,
                                  fuel_type, image_folder, mileage, model, origin, price, publication_date,
                                  sector, seller_city, source, title, transmission, year)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
    },
    'favorite_cars_by_user': {
        'columns': ['user_id', 'added_date', 'added_timestamp', 'car_id'],
        'required_columns': ['user_id', 'added_date', 'car_id'],  # These columns must exist
        'types': {
            'added_timestamp': parse_timestamp
        },
        'query': """
        INSERT INTO favorite_cars_by_user (user_id, added_date, added_timestamp, car_id)
        VALUES (%s, %s, %s, %s)
        """
    },
    'user_preferences': {
        'columns': ['user_id', 'budget_max', 'budget_min', 'last_updated', 'mileage_max', 'mileage_min',
                    'preferred_brands', 'preferred_door_count', 'preferred_fuel_types', 'preferred_transmissions',
                    'preferred_years'],
        'required_columns': ['user_id'],  # These columns must exist
        'types': {
            'budget_max': lambda x: int(float(x)) if pd.notna(x) else None,
            'budget_min': lambda x: int(float(x)) if pd.notna(x) else None,
            'last_updated': parse_timestamp,
            'mileage_max': lambda x: int(float(x)) if pd.notna(x) else None,
            'mileage_min': lambda x: int(float(x)) if pd.notna(x) else None,
            'preferred_brands': parse_set,
            'preferred_door_count': parse_set,
            'preferred_fuel_types': parse_set,
            'preferred_transmissions': parse_set,
            'preferred_years': parse_set
        },
        'query': """
        INSERT INTO user_preferences (user_id, budget_max, budget_min, last_updated, mileage_max, mileage_min,
                                     preferred_brands, preferred_door_count, preferred_fuel_types, preferred_transmissions,
                                     preferred_years)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
    },
    'user_searches': {
        'columns': ['user_id', 'search_date', 'search_timestamp', 'filters', 'result_count', 'search_query'],
        'required_columns': ['user_id', 'search_date'],  # These columns must exist
        'types': {
            'search_timestamp': parse_timestamp,
            'filters': parse_map,
            'result_count': lambda x: int(float(x)) if pd.notna(x) else None
        },
        'query': """
        INSERT INTO user_searches (user_id, search_date, search_timestamp, filters, result_count, search_query)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
    },
    'user_similarities': {
        'columns': ['target_user_id', 'reference_user_id', 'last_updated', 'similarity_score'],
        'required_columns': ['target_user_id', 'reference_user_id'],  # These columns must exist
        'types': {
            'last_updated': parse_timestamp,
            'similarity_score': lambda x: float(x) if pd.notna(x) else None
        },
        'query': """
        INSERT INTO user_similarities (target_user_id, reference_user_id, last_updated, similarity_score)
        VALUES (%s, %s, %s, %s)
        """
    },
    'users': {
        'columns': ['user_id', 'age', 'created_at', 'email', 'location', 'password', 'username'],
        'required_columns': ['user_id'],  # These columns must exist
        'types': {
            'age': lambda x: int(float(x)) if pd.notna(x) else None,
            'created_at': parse_timestamp
        },
        'query': """
        INSERT INTO users (user_id, age, created_at, email, location, password, username)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
    }
}

# Import data from CSV files
for table_name, config in TABLES.items():
    print(f"\n{'='*80}\nImporting data into {table_name}...")
    csv_file = f"{CSV_DIR}{table_name}.csv"
    
    # Try alternate file locations if needed
    if not os.path.exists(csv_file):
        print(f"CSV file {csv_file} not found, trying alternate location...")
        csv_file = f"{table_name}.csv"
        if not os.path.exists(csv_file):
            print(f"CSV file {table_name}.csv not found either. Skipping.")
            continue
    
    try:
        # Read CSV and print first rows to debug
        print(f"Reading {csv_file}...")
        df = pd.read_csv(csv_file)
        if df.empty:
            print(f"No data in {csv_file}. Skipping.")
            continue
        
        print(f"CSV columns: {list(df.columns)}")
        print(f"Expected columns: {config['columns']}")
        print(f"Sample data (first 2 rows):\n{df.head(2)}")
        
        # Check for missing required columns
        missing_columns = [col for col in config['required_columns'] if col not in df.columns]
        if missing_columns:
            print(f"Error: Missing required columns in {table_name}: {missing_columns}")
            
            # Check for capitalization differences or similar column names
            possible_matches = {}
            for missing_col in missing_columns:
                for actual_col in df.columns:
                    if missing_col.lower() == actual_col.lower() or missing_col.lower() in actual_col.lower():
                        possible_matches[missing_col] = actual_col
            
            if possible_matches:
                print(f"Found possible column matches: {possible_matches}")
                # Rename columns
                for missing_col, actual_col in possible_matches.items():
                    print(f"Renaming column '{actual_col}' to '{missing_col}'")
                    df = df.rename(columns={actual_col: missing_col})
            else:
                print(f"Skipping {table_name} due to missing required columns.")
                continue
        
        # Add missing columns with None values
        for col in config['columns']:
            if col not in df.columns:
                print(f"Adding missing column '{col}' with None values")
                df[col] = None
        
        # Prepare query
        query = SimpleStatement(config['query'])
        
        # Print the query for debugging
        print(f"Query to execute: {config['query']}")
        print(f"Expected number of parameters: {config['query'].count('?')}")
        print(f"Number of columns: {len(config['columns'])}")
        
        # Process each row
        success_count = 0
        error_count = 0
        
        for index, row in df.iterrows():
            try:
                # Convert values based on type
                values = []
                for col in config['columns']:
                    value = row.get(col)
                    if pd.isna(value):
                        values.append(None)
                    else:
                        type_converter = config['types'].get(col, lambda x: x)
                        try:
                            converted_value = type_converter(value)
                            values.append(converted_value)
                        except Exception as e:
                            print(f"Error converting column '{col}' value '{value}' for row {index}: {str(e)}")
                            values.append(None)
                
                # Execute INSERT
                try:
                    session.execute(query, values)
                    success_count += 1
                except Exception as insertion_error:
                    error_count += 1
                    if error_count < 5:  # Only print the first few errors
                        print(f"Error executing query: {str(insertion_error)}")
                        print(f"Query: {config['query']}")
                        print(f"Values: {values}")
                        print(f"Row data: {row.to_dict()}")
                
                # Print progress every 100 rows
                if success_count % 100 == 0:
                    print(f"Imported {success_count} rows so far...")
            
            except Exception as e:
                error_count += 1
                if error_count < 5:  # Only print the first few errors to avoid flooding the console
                    print(f"Error inserting row {index}: {str(e)}")
                    print(f"Row data: {row.to_dict()}")
                    print(f"Processed values: {values}")
        
        print(f"Imported {success_count} rows into {table_name}. Errors: {error_count}")
    
    except Exception as e:
        print(f"Error processing {table_name}: {str(e)}")
        import traceback
        traceback.print_exc()

# Cleanup
cluster.shutdown()
print("\nImport completed.")
