import os
import time
import json
import pandas as pd
from datetime import datetime
from kafka import KafkaProducer

# Configuration
AVITO_CSV_FILE = "avito1-850.csv"
MOTEUR_CSV_FILE = "moteurAZ.csv"
KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092'
AVITO_TOPIC = 'avito_cars'
MOTEUR_TOPIC = 'moteur_cars'
BATCH_SIZE = 10  # Number of records to send in one batch
DELAY_BETWEEN_MESSAGES = 1  # Seconds between messages
DELAY_BETWEEN_BATCHES = 5  # Seconds between batches

def setup_kafka_producer():
    """Configure and initialize the Kafka producer."""
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda x: json.dumps(x, default=str).encode('utf-8'),
            key_serializer=lambda k: str(k).encode('utf-8'),
            acks='all',
            retries=3,
            retry_backoff_ms=500
        )
        print(f"✅ Successfully connected to Kafka server: {KAFKA_BOOTSTRAP_SERVERS}")
        return producer
    except Exception as e:
        print(f"❌ Error connecting to Kafka: {e}")
        return None

def send_to_kafka(producer, topic, key, value):
    """Send data to a Kafka topic with detailed logging."""
    if producer is None:
        print("⚠️ Kafka producer not available, message not sent")
        return False
    
    try:
        # Add timestamp for streaming data
        value['timestamp'] = datetime.now().isoformat()
        
        # Send message to Kafka
        future = producer.send(topic, key=key, value=value)
        
        # Wait for sending confirmation
        record_metadata = future.get(timeout=10)
        
        print(f"✅ Message sent to Kafka: topic={topic}, partition={record_metadata.partition}, offset={record_metadata.offset}")
        print(f"   Key: {key}, Values sample: {list(value.keys())[:5]}...")
        return True
    except Exception as e:
        print(f"❌ Error sending to Kafka: {e}")
        return False

def load_csv_data(file_path):
    """Load data from CSV file into pandas DataFrame."""
    try:
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return None
            
        df = pd.read_csv(file_path)
        print(f"✅ Successfully loaded {len(df)} records from {file_path}")
        return df
    except Exception as e:
        print(f"❌ Error loading CSV data from {file_path}: {e}")
        return None

def process_avito_data(producer):
    print("\n🚗 Processing Avito car listings...")
    
    df = load_csv_data(AVITO_CSV_FILE)
    if df is None or df.empty:
        return False
    
    # Clean up column names by stripping whitespace
    df.columns = df.columns.str.strip()
    
    total_records = len(df)
    sent_count = 0
    
    # Process in batches
    for i in range(0, total_records, BATCH_SIZE):
        batch = df.iloc[i:min(i+BATCH_SIZE, total_records)]
        print(f"\n📦 Processing batch {i//BATCH_SIZE + 1}/{(total_records+BATCH_SIZE-1)//BATCH_SIZE}")
        
        for _, row in batch.iterrows():
            # Convert row to dictionary
            car_data = row.to_dict()
            
            # Ensure Nombre de portes is a string and log its value
            if 'Nombre de portes' in car_data:
                car_data['Nombre de portes'] = str(car_data['Nombre de portes']) if pd.notnull(car_data['Nombre de portes']) else None
                print(f"Sending Nombre de portes (Avito): {car_data['Nombre de portes']}")
            else:
                print("Warning: Nombre de portes missing in Avito record")
            
            # Use ID as the message key
            car_id = car_data.get('ID', str(sent_count+1))
            
            # Send to Kafka
            if send_to_kafka(producer, AVITO_TOPIC, car_id, car_data):
                sent_count += 1
            
            time.sleep(DELAY_BETWEEN_MESSAGES)
        
        print(f"✅ Sent {sent_count}/{total_records} Avito listings so far")
        
        # Add delay between batches
        if i + BATCH_SIZE < total_records:
            print(f"⏱️ Waiting {DELAY_BETWEEN_BATCHES} seconds before next batch...")
            time.sleep(DELAY_BETWEEN_BATCHES)
    
    print(f"✅ Completed Avito data processing: {sent_count}/{total_records} records sent")
    return True
    
def process_moteur_data(producer):
    print("\n🚗 Processing Moteur.ma car listings...")
    
    df = load_csv_data(MOTEUR_CSV_FILE)
    if df is None or df.empty:
        return False
    
    # Clean up column names by stripping whitespace
    df.columns = df.columns.str.strip()
    
    total_records = len(df)
    sent_count = 0
    
    # Process in batches
    for i in range(0, total_records, BATCH_SIZE):
        batch = df.iloc[i:min(i+BATCH_SIZE, total_records)]
        print(f"\n📦 Processing batch {i//BATCH_SIZE + 1}/{(total_records+BATCH_SIZE-1)//BATCH_SIZE}")
        
        for _, row in batch.iterrows():
            # Convert row to dictionary
            car_data = row.to_dict()
            
            # Ensure Nombre de portes is a string and log its value
            if 'Nombre de portes' in car_data:
                car_data['Nombre de portes'] = str(car_data['Nombre de portes']) if pd.notnull(car_data['Nombre de portes']) else None
                print(f"Sending Nombre de portes (Moteur): {car_data['Nombre de portes']}")
            else:
                print("Warning: Nombre de portes missing in Moteur record")
            
            # Use ID as the message key
            car_id = car_data.get('ID', str(sent_count+1))
            
            # Send to Kafka
            if send_to_kafka(producer, MOTEUR_TOPIC, car_id, car_data):
                sent_count += 1
            
            time.sleep(DELAY_BETWEEN_MESSAGES)
        
        print(f"✅ Sent {sent_count}/{total_records} Moteur.ma listings so far")
        
        # Add delay between batches
        if i + BATCH_SIZE < total_records:
            print(f"⏱️ Waiting {DELAY_BETWEEN_BATCHES} seconds before next batch...")
            time.sleep(DELAY_BETWEEN_BATCHES)
    
    print(f"✅ Completed Moteur.ma data processing: {sent_count}/{total_records} records sent")
    return True
def main():
    """Main function to run the Kafka producer for car listings."""
    print("🚀 Starting Car Listings Kafka Producer...")
    
    # Validate CSV files exist
    for file_path in [AVITO_CSV_FILE, MOTEUR_CSV_FILE]:
        if not os.path.exists(file_path):
            print(f"❌ Required file not found: {file_path}")
            print("Please ensure both CSV files are in the same directory as this script.")
            return
    
    # Set up Kafka producer
    producer = setup_kafka_producer()
    if producer is None:
        print("❌ Failed to set up Kafka producer. Exiting...")
        return
    
    try:
        # Process Avito data
        avito_success = process_avito_data(producer)
        
        # Process Moteur data
        moteur_success = process_moteur_data(producer)
        
        # Summary
        print("\n📊 PRODUCER SUMMARY:")
        print(f"Avito data processing: {'✅ Success' if avito_success else '❌ Failed'}")
        print(f"Moteur.ma data processing: {'✅ Success' if moteur_success else '❌ Failed'}")
        
    except KeyboardInterrupt:
        print("\n⚠️ Producer interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
    finally:
        if producer:
            producer.flush()  # Ensure all messages are sent
            producer.close()  # Close the connection
            print("🔌 Kafka producer closed")
        
        print("🏁 Program completed")

if __name__ == "__main__":
    main()