import pandas as pd
import json
import re
from pathlib import Path

# Define the path to the CSV file and output JSON file
csv_file = "cleaned_data.csv"
output_json = "public/labels.json"

# Define the equipment options to extract
equipment_options = [
    'jantes_aluminium', 'airbags', 'climatisation', 'système_de_navigation_gps',
    'toit_ouvrant', 'sièges_cuir', 'radar_de_recul', 'caméra_de_recul',
    'vitres_électriques', 'abs', 'esp', 'régulateur_de_vitesse',
    'limiteur_de_vitesse', 'cd_mp3_bluetooth', 'ordinateur_de_bord',
    'verrouillage_centralisé'
]

def normalize_text(text):
    """Normalize text by converting to lowercase and removing special characters."""
    if pd.isna(text):
        return None
    text = str(text).lower().strip()
    text = re.sub(r'[^\w\s]', '-', text)  # Replace special chars with hyphen
    text = re.sub(r'\s+', ' ', text)      # Replace multiple spaces with single space
    return text

def parse_equipment(equipment):
    """Parse equipment string and return a set of valid equipment options."""
    if pd.isna(equipment) or not equipment:
        return set()
    equipment = equipment.lower()
    found_options = set()
    for option in equipment_options:
        # Check if option is present in the equipment string
        if option.replace('_', ' ') in equipment or option in equipment:
            found_options.add(option)
    return found_options

def main():
    # Read the CSV file
    try:
        df = pd.read_csv(csv_file)
    except FileNotFoundError:
        print(f"Error: {csv_file} not found.")
        return

    # Initialize sets to store unique values
    brands = set()
    fuel_types = set()
    transmissions = set()
    cities = set()
    all_equipment = set()

    # Process brands
    for brand in df['brand']:
        normalized = normalize_text(brand)
        if normalized and normalized != 'nan':
            # Handle common brand variations
            normalized = normalized.replace('alfa-romeo', 'alfa romeo').replace('aston-martin', 'aston martin')
            brands.add(normalized.title())  # Capitalize first letter of each word

    # Process fuel types
    for fuel in df['fuel_type']:
        normalized = normalize_text(fuel)
        if normalized and normalized != 'nan':
            fuel_types.add(normalized.capitalize())

    # Process transmissions
    for transmission in df['transmission']:
        normalized = normalize_text(transmission)
        if normalized and normalized != 'nan':
            transmissions.add(normalized.capitalize())

    # Process cities from sector column
    for city in df['sector']:
        normalized = normalize_text(city)
        if normalized and normalized != 'nan':
            cities.add(normalized.title())

    # Process equipment
    for equipment in df['equipment']:
        options = parse_equipment(equipment)
        all_equipment.update(options)

    # Prepare the JSON structure
    labels = {
        "brands": sorted(list(brands)),
        "fuel_types": sorted(list(fuel_types)),
        "transmissions": sorted(list(transmissions)),
        "cities": sorted(list(cities)),
        "equipment": sorted(list(all_equipment))
    }

    # Ensure output directory exists
    Path(output_json).parent.mkdir(parents=True, exist_ok=True)

    # Write to JSON file
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(labels, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {output_json}")

if __name__ == "__main__":
    main()