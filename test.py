import pandas as pd
import json
import numpy as np

# Load the CSV file
csv_file = 'cleaned_data.csv'
df = pd.read_csv(csv_file)

# Function to clean and get unique values, handling NaN and converting to strings
def get_unique_values(column):
    values = df[column].replace(np.nan, '').astype(str)
    unique_values = sorted(set(values[values != '']))
    return unique_values

# Define the allowed equipment list from the image
allowed_equipment = [
    "Abs",
    "Airbags",
    "Caméra De Recul",
    "Climatisation",
    "Esp",
    "Jantes Aluminium",
    "Limiteur De Vitesse",
    "Ordinateur De Bord",
    "Radar De Recul",
    "Régulateur De Vitesse",
    "Sièges Cuir",
    "Toit Ouvrant",
    "Verrouillage Centralisé",
    "Vitres Électriques"
]

# Function to clean equipment and get only allowed equipment items
def get_unique_equipment():
    # Combine all equipment entries, split by commas, and clean
    equipment_list = df['equipment'].replace(np.nan, '').str.split(',').explode()
    # Clean each item: remove leading/trailing spaces and normalize
    equipment_list = equipment_list.str.strip().replace('', np.nan).dropna()
    # Filter to only include allowed equipment
    filtered_equipment = [eq for eq in equipment_list if eq in allowed_equipment]
    # Get unique equipment items and sort
    unique_equipment = sorted(set(filtered_equipment))
    return unique_equipment

# Define the labels structure
labels = {
    'brand': get_unique_values('brand'),
    'condition': get_unique_values('condition'),
    'door_count': get_unique_values('door_count'),
    'equipment': get_unique_equipment(),
    'first_owner': get_unique_values('first_owner'),
    'fiscal_power': get_unique_values('fiscal_power'),
    'fuel_type': get_unique_values('fuel_type'),
    'model': get_unique_values('model'),
    'origin': get_unique_values('origin'),
    'sector': get_unique_values('sector'),
    'seller_city': get_unique_values('seller_city'),
    'transmission': get_unique_values('transmission'),
    'year': get_unique_values('year')
}

# Save the labels to a JSON file
output_file = 'labels_p.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(labels, f, ensure_ascii=False, indent=4)

print(f"Generated {output_file} successfully.")