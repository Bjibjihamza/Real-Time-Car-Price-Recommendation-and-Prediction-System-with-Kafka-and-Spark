import time
import csv
import os
import re
import json
import requests
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import secrets
import string
# Add Kafka imports
try:
    from kafka import KafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False


def setup_kafka_producer():
    """Configure and initialize the Kafka producer."""
    if not KAFKA_AVAILABLE:
        print("⚠️ Kafka library not installed. Continuing without Kafka integration.")
        return None
    
    try:
        # Configure the Kafka producer with reasonable defaults
        producer = KafkaProducer(
            bootstrap_servers=['localhost:9092'],
            value_serializer=lambda x: json.dumps(x).encode('utf-8'),
            acks='all',
            retries=3,
            retry_backoff_ms=500
        )
        print("✅ Kafka producer initialized successfully")
        return producer
    except Exception as e:
        print(f"❌ Failed to initialize Kafka producer: {e}")
        print("⚠️ Continuing without Kafka integration")
        return None


def send_to_kafka(producer, topic, data_row, headers):
    """Send car listing data to Kafka topic."""
    if producer is None:
        return
    
    try:
        # Convert row data to dictionary using headers
        data_dict = {headers[i]: data_row[i] for i in range(min(len(headers), len(data_row)))}
        
        # Include timestamp for streaming data
        data_dict['timestamp'] = datetime.now().isoformat()
        
        # Send to Kafka topic
        producer.send(topic, value=data_dict)
        print(f"✅ Data sent to Kafka topic '{topic}'")
    except Exception as e:
        print(f"❌ Error sending data to Kafka: {e}")


def setup_driver():
    """Configure and initialize the Selenium driver."""
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--log-level=3")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver


def convert_relative_date(relative_date):
    """Convertit une date relative en date exacte."""
    now = datetime.now()
    if "quelques instants" in relative_date.lower():
        return now.strftime("%Y-%m-%d %H:%M:%S")
    match = re.search(r'(\d+)', relative_date)
    if match:
        num = int(match.group(1))
    else:
        return "Date inconnue"
    if "minute" in relative_date:
        exact_date = now - timedelta(minutes=num)
        return exact_date.strftime("%Y-%m-%d %H:%M:%S")
    elif "heure" in relative_date:
        exact_date = now - timedelta(hours=num)
        return exact_date.strftime("%Y-%m-%d %H:%M:%S")
    elif "jour" in relative_date:
        exact_date = now - timedelta(days=num)
        return exact_date.strftime("%Y-%m-%d")
    elif "mois" in relative_date:
        exact_date = now - timedelta(days=30 * num)
        return exact_date.strftime("%Y-%m-%d")
    elif "an" in relative_date:
        exact_date = now - timedelta(days=365 * num)
        return exact_date.strftime("%Y-%m-%d")
    else:
        return "Date inconnue"


def create_folder_name(title, idx):
    """Crée un nom de dossier court, aléatoire et valide sans accents ni caractères spéciaux."""
    random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(12))
    folder_name = f"{random_part}_{idx}"
    return folder_name


def download_image(image_url, folder_path, image_name):
    """Télécharge une image et la sauvegarde dans le dossier spécifié."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(image_url, headers=headers, stream=True, timeout=10)
        response.raise_for_status()
        content_type = response.headers.get('Content-Type', '')
        extension = '.jpg'
        if 'png' in content_type:
            extension = '.png'
        elif 'jpeg' in content_type or 'jpg' in content_type:
            extension = '.jpg'
        image_path = os.path.join(folder_path, f"{image_name}{extension}")
        with open(image_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return os.path.basename(image_path)
    except Exception as e:
        print(f"❌ Erreur de téléchargement d'image: {e}")
        return None


def scrape_details(url, driver, listing_id, folder_name):
    """Access a car listing page and scrape additional details including images."""
    driver.get(url)
    time.sleep(3)
    images_base_folder = os.path.join("..", "backend", "images", "cars")
    os.makedirs(images_base_folder, exist_ok=True)
    listing_folder = os.path.join(images_base_folder, folder_name)
    os.makedirs(listing_folder, exist_ok=True)
    images_paths = []
    try:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        try:
            image_elements = driver.find_elements(By.CSS_SELECTOR, "div.picture img")
            if not image_elements:
                image_elements = driver.find_elements(By.CSS_SELECTOR, ".sc-1gjavk-0")
            if image_elements:
                print(f"✅ Found {len(image_elements)} images for listing {listing_id}")
                for i, img in enumerate(image_elements):
                    try:
                        img_src = img.get_attribute("src")
                        if img_src:
                            image_filename = download_image(img_src, listing_folder, f"image_{i+1}")
                            if image_filename:
                                rel_path = os.path.join(folder_name, image_filename)
                                images_paths.append(rel_path)
                                print(f"✅ Downloaded image {i+1}/{len(image_elements)} for listing {listing_id}")
                    except Exception as e:
                        print(f"⚠️ Error downloading image {i+1} for listing {listing_id}: {e}")
            else:
                print(f"⚠️ No images found for listing {listing_id}")
        except Exception as e:
            print(f"❌ Error processing images for listing {listing_id}: {e}")
        try:
            show_more_button = driver.find_element(By.XPATH, "//button[contains(., 'Voir plus')]")
            driver.execute_script("arguments[0].click();", show_more_button)
            time.sleep(1)
        except:
            pass
        car_type = "N/A"
        location = "N/A"
        mileage = "N/A"
        brand = "N/A"
        model = "N/A"
        doors = "N/A"
        origin = "N/A"
        first_hand = "N/A"
        fiscal_power = "N/A"
        condition = "N/A"
        equipment_text = "N/A"
        seller_city = "N/A"
        try:
            try:
                location_element = driver.find_element(By.XPATH, "//span[contains(@class, 'iKguVF')]")
                if location_element:
                    location = location_element.text.strip()
                    seller_city = location.split(',')[0] if ',' in location else location
            except:
                print(f"⚠️ Localisation non trouvée pour {url}")
            detail_elements = driver.find_elements(By.XPATH, "//div[contains(@class, 'sc-19cngu6-1')]")
            for element in detail_elements:
                try:
                    value_element = element.find_element(By.XPATH, ".//span[contains(@class, 'fjZBup')]")
                    label_element = element.find_element(By.XPATH, ".//span[contains(@class, 'bXFCIH')]")
                    value = value_element.text.strip()
                    label = label_element.text.strip()
                    if "Année-Modèle" in label:
                        pass
                    elif "Type de véhicule" in label or "Catégorie" in label:
                        car_type = value
                    elif "Kilométrage" in label:
                        mileage = value
                    elif "Marque" in label:
                        brand = value
                    elif "Modèle" in label:
                        model = value
                    elif "Nombre de portes" in label:
                        doors = value
                    elif "Origine" in label:
                        origin = value
                    elif "Première main" in label:
                        first_hand = value
                    elif "Puissance fiscale" in label:
                        fiscal_power = value
                    elif "État" in label:
                        condition = value
                    elif "Secteur" in label:
                        location = value
                except Exception as e:
                    continue
            if car_type == "N/A":
                try:
                    category_element = driver.find_element(By.XPATH, "//span[contains(@class, 'fjZBup') and preceding-sibling::span[contains(text(), 'Categorie')]]")
                    if category_element:
                        car_type = category_element.text.strip()
                except:
                    pass
            try:
                equipment_elements = driver.find_elements(By.XPATH, "//div[contains(@class, 'sc-19cngu6-1')]//span[contains(@class, 'fjZBup') and not(following-sibling::span)]")
                equipment_list = []
                for eq in equipment_elements:
                    parent = eq.find_element(By.XPATH, "./..")
                    if "Type de" not in parent.text and "Année" not in parent.text and "Marque" not in parent.text:
                        equipment_list.append(eq.text.strip())
                if equipment_list:
                    equipment_text = ", ".join(equipment_list)
            except Exception as e:
                print(f"⚠️ Erreur lors de l'extraction des équipements: {e}")
        except Exception as e:
            print(f"❌ Erreur lors de l'extraction des détails: {e}")
        return [car_type, location, mileage, brand, model, doors, origin, first_hand, fiscal_power, condition, equipment_text, seller_city, folder_name, ", ".join(images_paths)]
    except Exception as e:
        print(f"❌ Error scraping {url}: {e}")
        return ["N/A"] * 12 + [folder_name, ""]


def scrape_avito():
    """Scrape the car listings on Avito for page 1 only."""
    base_url = "https://www.avito.ma/fr/maroc/voitures_d_occasion-%C3%A0_vendre"
    driver = setup_driver()
    data = []
    listing_id_counter = 1
    page = 50
    url = f"{base_url}?o={page}"
    print(f"🔎 Scraping page {page}: {url}")
    driver.get(url)
    driver.set_page_load_timeout(180)
    try:
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CLASS_NAME, "sc-1nre5ec-1")))
    except Exception as e:
        print(f"❌ Timeout: Impossible de charger la page {page} ({e})")
        driver.quit()
        return []
    try:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(3)
        main_container = driver.find_element(By.CLASS_NAME, "sc-1nre5ec-1")
        listings = main_container.find_elements(By.CSS_SELECTOR, "a.sc-1jge648-0.jZXrfL")
        if not listings:
            print(f"❌ Aucune annonce trouvée sur la page {page} !")
            driver.quit()
            return []
        print(f"✅ {len(listings)} annonces trouvées sur la page {page} !")
        for listing in listings:
            try:
                title = listing.find_element(By.CSS_SELECTOR, "p.sc-1x0vz2r-0.iHApav").text.strip() if listing.find_elements(By.CSS_SELECTOR, "p.sc-1x0vz2r-0.iHApav") else "N/A"
                price = listing.find_element(By.CSS_SELECTOR, "p.sc-1x0vz2r-0.dJAfqm").text.strip() if listing.find_elements(By.CSS_SELECTOR, "p.sc-1x0vz2r-0.dJAfqm") else "Prix non spécifié"
                pub_date_raw = listing.find_element(By.CSS_SELECTOR, "p.sc-1x0vz2r-0.layWaX").text.strip() if listing.find_elements(By.CSS_SELECTOR, "p.sc-1x0vz2r-0.layWaX") else "N/A"
                pub_date = convert_relative_date(pub_date_raw)
                year = listing.find_element(By.XPATH, ".//span[contains(text(),'20')]").text.strip() if listing.find_elements(By.XPATH, ".//span[contains(text(),'20')]") else "N/A"
                fuel_type = listing.find_element(By.XPATH, ".//span[contains(text(),'Essence') or contains(text(),'Diesel') or contains(text(),'Hybride') or contains(text(),'Électrique')]").text.strip() if listing.find_elements(By.XPATH, ".//span[contains(text(),'Essence') or contains(text(),'Diesel') or contains(text(),'Hybride') or contains(text(),'Électrique')]") else "N/A"
                transmission = listing.find_element(By.XPATH, ".//span[contains(text(),'Automatique') or contains(text(),'Manuelle')]").text.strip() if listing.find_elements(By.XPATH, ".//span[contains(text(),'Automatique') or contains(text(),'Manuelle')]") else "N/A"
                link = listing.get_attribute("href") if listing.get_attribute("href") else "N/A"
                creator = "Particulier"
                try:
                    creator_element = listing.find_element(By.CSS_SELECTOR, "p.sc-1x0vz2r-0.hNCqYw.sc-1wnmz4-5.dXzQnB")
                    creator = creator_element.text.strip() if creator_element else "Particulier"
                except:
                    pass
                folder_name = create_folder_name(title, listing_id_counter)
                data.append([listing_id_counter, title, price, pub_date, year, fuel_type, transmission, creator, link, folder_name])
                listing_id_counter += 1
            except Exception as e:
                print(f"⚠️ Erreur avec l'annonce sur la page {page}: {e}")
    except Exception as e:
        print(f"❌ Erreur lors de l'extraction de la page {page}: {e}")
    driver.quit()
    return data


def save_to_csv(data, headers, filename):
    """Sauvegarde les données dans un fichier CSV dans ../data/avito/."""
    output_folder = os.path.join("..", "data", "avito")
    os.makedirs(output_folder, exist_ok=True)
    output_file = os.path.join(output_folder, filename)
    with open(output_file, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(headers)
        writer.writerows(data)
    print(f"✅ Données sauvegardées dans {output_file}")
    return output_file


def main():
    """Main function to run the complete scraper."""
    print("🚗 Starting Avito car listings scraper - Complete Process...")
    kafka_producer = setup_kafka_producer()
    kafka_topic = "avito_cars"
    output_dir = os.path.join("..", "data", "avito")
    os.makedirs(output_dir, exist_ok=True)
    print("\n📋 Step 1: Scraping basic car listings from page 1...")
    basic_data = scrape_avito()
    if basic_data is None or len(basic_data) == 0:
        print("❌ No basic data found. Exiting program.")
        return
    print(f"✅ Found {len(basic_data)} basic listings on page 1.")
    print("\n📋 Step 2: Collecting detailed information and downloading images...")
    driver = setup_driver()
    complete_headers = [
        "ID", "Titre", "Prix", "Date de publication", "Année", "Type de carburant", "Transmission", "Créateur",
        "Type de véhicule", "Secteur", "Kilométrage", "Marque", "Modèle", "Nombre de portes", "Origine", 
        "Première main", "Puissance fiscale", "État", "Équipements", "Ville du vendeur", "Dossier d'images"
    ]
    complete_data = []
    for idx, row in enumerate(basic_data, start=1):
        listing_id = row[0]
        url = row[8]
        folder_name = row[9]
        print(f"🔎 Processing listing {idx}/{len(basic_data)}: {url}")
        details = scrape_details(url, driver, listing_id, folder_name)
        combined_row = row[:8] + details
        complete_data.append(combined_row)
        if kafka_producer:
            print(f"📤 Envoi des données de l'annonce {listing_id} vers Kafka...")
            send_to_kafka(kafka_producer, kafka_topic, combined_row, complete_headers)
    driver.quit()
    if kafka_producer:
        kafka_producer.flush()
        kafka_producer.close()
        print("✅ Producteur Kafka fermé proprement")
    print("\n📋 Step 3: Saving complete data to CSV...")
    output_filename = "avito_complete.csv"
    save_to_csv(complete_data, complete_headers, output_filename)
    print("\n✅ SCRAPING PROCESS COMPLETED SUCCESSFULLY!")
    print(f"Complete data saved to: ../data/avito/{output_filename}")
    print(f"Images downloaded to: ../backend/images/cars/[listing_folders]")


if __name__ == "__main__":
    main()