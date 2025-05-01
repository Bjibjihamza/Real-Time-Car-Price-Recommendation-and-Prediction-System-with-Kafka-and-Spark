from cassandra.cluster import Cluster
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create a Cassandra client
cluster = Cluster(
    contact_points=[os.getenv('CASSANDRA_CONTACT_POINT', 'localhost')],
    port=9042  # Default Cassandra port, adjust if needed
)
session = cluster.connect(os.getenv('CASSANDRA_KEYSPACE', 'cars_keyspace'))

def extract_unique_values_to_txt():
    try:
        # Query to select all records from cleaned_cars
        query = "SELECT brand, fuel_type, transmission, sector FROM cleaned_cars"
        rows = session.execute(query)

        # Extract unique values using sets
        brands = set()
        fuel_types = set()
        transmissions = set()
        sectors = set()

        for row in rows:
            brands.add(row.brand or '')  # Handle null values
            fuel_types.add(row.fuel_type or '')
            transmissions.add(row.transmission or '')
            sectors.add(row.sector or '')

        # Remove empty string if present and sort for readability
        brands = sorted([b for b in brands if b], key=str.lower)
        fuel_types = sorted([f for f in fuel_types if f], key=str.lower)
        transmissions = sorted([t for t in transmissions if t], key=str.lower)
        sectors = sorted([s for s in sectors if s], key=str.lower)

        # Prepare text content for the .txt file
        txt_content = "Unique Car Attributes Extracted from Database\n"
        txt_content += "=" * 50 + "\n\n"

        # Brands section
        txt_content += "Brands:\n"
        txt_content += "-" * 20 + "\n"
        for brand in brands:
            txt_content += f"{brand}\n"
        txt_content += "\n"

        # Fuel Types section
        txt_content += "Fuel Types:\n"
        txt_content += "-" * 20 + "\n"
        for fuel in fuel_types:
            txt_content += f"{fuel}\n"
        txt_content += "\n"

        # Transmissions section
        txt_content += "Transmissions:\n"
        txt_content += "-" * 20 + "\n"
        for transmission in transmissions:
            txt_content += f"{transmission}\n"
        txt_content += "\n"

        # Sectors section
        txt_content += "Sectors:\n"
        txt_content += "-" * 20 + "\n"
        for sector in sectors:
            txt_content += f"{sector}\n"

        # Write to text file
        with open('unique_car_attributes.txt', 'w', encoding='utf-8') as f:
            f.write(txt_content)
        print("Unique values have been exported to unique_car_attributes.txt")

    except Exception as err:
        print(f"Error: {err}")
    finally:
        # Close the connection
        cluster.shutdown()
        print("Cassandra connection closed")

# Run the function
extract_unique_values_to_txt()