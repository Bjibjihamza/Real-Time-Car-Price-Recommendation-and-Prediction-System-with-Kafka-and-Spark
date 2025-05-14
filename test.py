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

# Define the allowed equipment list
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
    equipment_list = df['equipment'].replace(np.nan, '').str.split(',').explode()
    equipment_list = equipment_list.str.strip().replace('', np.nan).dropna()
    filtered_equipment = [eq for eq in equipment_list if eq in allowed_equipment]
    unique_equipment = sorted(set(filtered_equipment))
    return unique_equipment

# Function to create nested structure for brands, models, and years
def get_brand_model_year_hierarchy():
    # Clean the data
    df_cleaned = df.replace(np.nan, '').astype(str)
    # Group by brand, then model, and collect years
    hierarchy = {}
    for brand in get_unique_values('brand'):
        brand_data = df_cleaned[df_cleaned['brand'] == brand]
        models = {}
        for model in sorted(set(brand_data['model'][brand_data['model'] != ''])):
            model_data = brand_data[brand_data['model'] == model]
            years = sorted(set(model_data['year'][model_data['year'] != '']))
            if years:  # Only include models with valid years
                models[model] = years
        if models:  # Only include brands with valid models
            hierarchy[brand] = {"models": models}
    return hierarchy

# Define the labels structure
labels = {
    "brands": get_brand_model_year_hierarchy(),
    "condition": get_unique_values('condition'),
    "door_count": get_unique_values('door_count'),
    "equipment": get_unique_equipment(),
    "first_owner": get_unique_values('first_owner'),
    "fiscal_power": get_unique_values('fiscal_power'),
    "fuel_type": get_unique_values('fuel_type'),
    "origin": get_unique_values('origin'),
    "sector": get_unique_values('sector'),
    "seller_city": get_unique_values('seller_city'),
    "transmission": get_unique_values('transmission')
}

# Save the labels to a JSON file
output_file = 'labels_p.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(labels, f, ensure_ascii=False, indent=4)

print(f"Generated {output_file} successfully.")