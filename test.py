import pandas as pd
import json
import os

# Define the path to the CSV file
csv_path = os.path.join(os.path.dirname(__file__), 'cleaned_data.csv')

# Check if the CSV file exists
if not os.path.exists(csv_path):
    raise FileNotFoundError(f"CSV file not found at {csv_path}")

# Read the CSV file into a DataFrame
df = pd.read_csv(csv_path)

# Initialize dictionary to store unique labels
labels = {}

# Columns to extract unique values from
columns = [
    'brand', 'condition', 'door_count', 'first_owner', 'fiscal_power',
    'fuel_type', 'model', 'origin', 'sector', 'seller_city', 'transmission', 'year'
]

# Extract unique values for each column
for col in columns:
    # Drop NaN values and convert to strings for consistency
    unique_values = df[col].dropna().astype(str).unique().tolist()
    # Sort values for better UX in dropdowns
    unique_values = sorted(unique_values, key=lambda x: x.lower() if isinstance(x, str) else x)
    labels[col] = unique_values

# Special handling for equipment column
equipment_set = set()
for equip in df['equipment'].dropna():
    # Split equipment string into individual items
    items = [item.strip() for item in equip.split(',')]
    equipment_set.update(items)

# Convert equipment set to sorted list
labels['equipment'] = sorted(list(equipment_set))

# Save labels to a JSON file in the same directory
output_path = os.path.join(os.path.dirname(__file__), 'labels.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(labels, f, indent=2, ensure_ascii=False)

print(f"Labels extracted and saved to {output_path}")