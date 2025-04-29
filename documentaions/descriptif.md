# Big Data and Machine Learning Project Description

## Project Overview

This project leverages Big Data technologies, Machine Learning (ML), and Data Visualization to analyze vehicle listing data from two Moroccan platforms: Avito and Moteur.ma. It is divided into two sub-projects:

1. **Price Prediction**: Scraping, cleaning, and modeling vehicle data to predict prices using supervised ML models.
2. **Recommendation System**: Real-time data collection and unsupervised ML for personalized vehicle recommendations.

The system integrates web scraping, real-time streaming, distributed storage, automated workflows, and interactive visualizations.

---

## Data Sources

Data is collected from:

- **Avito**: A Moroccan classifieds platform.
- **Moteur.ma**: A vehicle listing platform.

### Data Schema

#### Avito Schema

```
 |-- ID: string (nullable = true)
 |-- Titre: string (nullable = true)
 |-- Prix: string (nullable = true)
 |-- Date de publication: string (nullable = true)
 |-- Année: string (nullable = true)
 |-- Type de carburant: string (nullable = true)
 |-- Transmission: string (nullable = true)
 |-- Créateur: string (nullable = true)
 |-- Type de véhicule: string (nullable = true)
 |-- Secteur: string (nullable = true)
 |-- Kilométrage: string (nullable = true)
 |-- Marque: string (nullable = true)
 |-- Modèle: string (nullable = true)
 |-- Nombre de portes: string (nullable = true)
 |-- Origine: string (nullable = true)
 |-- Première main: string (nullable = true)
 |-- Puissance fiscale: string (nullable = true)
 |-- État: string (nullable = true)
 |-- Équipements: string (nullable = true)
 |-- Ville du vendeur: string (nullable = true)
 |-- Dossier d'images: string (nullable = true)
```

#### Moteur.ma Schema

```
 |-- ID: string (nullable = true)
 |-- Titre: string (nullable = true)
 |-- Prix: string (nullable = true)
 |-- Année: string (nullable = true)
 |-- Type de carburant: string (nullable = true)
 |-- Transmission: string (nullable = true)
 |-- Créateur: string (nullable = true)
 |-- Secteur: string (nullable = true)
 |-- Kilométrage: string (nullable = true)
 |-- Marque: string (nullable = true)
 |-- Modèle: string (nullable = true)
 |-- Nombre de portes: string (nullable = true)
 |-- Première main: string (nullable = true)
 |-- Puissance fiscale: string (nullable = true)
 |-- Équipements: string (nullable = true)
 |-- Ville du vendeur: string (nullable = true)
 |-- Dossier d'images: string (nullable = true)
 |-- Dédouané: string (nullable = true)
```

---

## Sub-Project 1: Price Prediction

### Objective

Develop a predictive model to estimate vehicle prices based on features like brand, model, year, mileage, and other attributes.

### Workflow

1. **Data Collection**:
    
    - **Scraping**: Selenium scrapes ~60,000 vehicle listings from Avito and Moteur.ma.
    - **Automation**: Scraping scripts are scheduled via Apache Airflow.
    - **Reporting**: Power BI generates comprehensive reports analyzing the 60,000 records, covering price distributions, popular brands, and regional variations.
2. **Data Processing**:
    
    - **Streaming**: Apache Kafka streams data for real-time processing.
    - **Processing**: Apache Spark handles distributed cleaning and preprocessing (e.g., missing values, type conversion, outlier removal).
    - **Storage**: Cleaned data is stored in Apache Cassandra (`cleaned_cars` table).
3. **Machine Learning**:
    
    - Five supervised ML models are trained:
        - **LightGBM**: A gradient boosting framework optimized for speed and performance, suitable for large datasets.
        - **Random Forest**: An ensemble method robust to overfitting, effective for capturing non-linear relationships.
        - **XGBoost**: A scalable gradient boosting algorithm known for high accuracy and feature importance analysis.
        - **Gradient Boosting Machines (GBM)**: A general gradient boosting approach, balancing accuracy and interpretability.
        - **Neural Network**: A deep learning model capable of modeling complex patterns, particularly effective with large, diverse datasets but requiring more computational resources and tuning.
    - **Neural Network Suitability**: The Neural Network is reliable ("nadi") but may underperform compared to tree-based models (e.g., LightGBM, XGBoost) if the dataset lacks sufficient complexity or size, or if feature engineering is not extensive. Its performance will be evaluated alongside other models to determine its effectiveness.
    - Models are evaluated using Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and R² score.
    - The best-performing model is integrated into a web interface.
4. **Data Visualization**:
    
    - A web interface compares model performance and displays predictions.
    - A dedicated section allows users to explore interactive visualizations (e.g., price trends, feature importance, error distributions) built using Python (e.g., Plotly, Matplotlib) and D3.js for dynamic, browser-based graphics.
    - Visualizations enable filtering by brand, year, or region, derived from Power BI insights.

### Technologies

- **Scraping**: Selenium
- **Streaming**: Apache Kafka
- **Processing**: Apache Spark
- **Storage**: Apache Cassandra
- **Automation**: Apache Airflow
- **ML Frameworks**: LightGBM, Scikit-learn (Random Forest, GBM), XGBoost, TensorFlow/PyTorch (Neural Network)
- **Visualization**: Python (Plotly, Matplotlib), D3.js, Power BI
- **Web Framework**: Flask or Django

---

## Sub-Project 2: Recommendation System

### Objective

Build a real-time system to recommend vehicles based on user preferences and behavior.

### Workflow

1. **Data Collection**:
    
    - **Real-Time Scraping**: Airflow schedules hourly scraping from Avito and Moteur.ma.
    - **Synthetic User Data**: Scripts generate user data (profiles, preferences, interactions like views, favorites, searches).
    - Data is stored in Cassandra tables (`users`, `user_preferences`, `car_views_by_user`, `favorite_cars_by_user`, `user_searches`, `user_similarities`, `user_recommendations`).
2. **Data Processing**:
    
    - **Streaming**: Kafka handles real-time data.
    - **Processing**: Spark aggregates user and vehicle data for recommendations.
    - **Storage**: Cassandra ensures low-latency access.
3. **Recommendation Models**:
    
    - Unsupervised ML models include:
        - **Collaborative Filtering**: Uses user similarities (`user_similarities`).
        - **Content-Based Filtering**: Matches vehicles to user preferences (`user_preferences`).
        - **Hybrid Approach**: Combines both for better accuracy.
    - Recommendations are ranked and stored in `user_recommendations` with scores and reasons.
4. **Data Visualization**:
    
    - The web interface displays personalized recommendations with scores and reasons.
    - A visualization section allows users to explore data insights (e.g., popular brands, preference trends) using Python (Plotly, Matplotlib) and D3.js for interactive, dynamic visualizations.
    - Users can filter by attributes like fuel type or budget.

### Cassandra Keyspace Schema

```
CREATE KEYSPACE cars_keyspace WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'} AND durable_writes = true;
```

Key tables:

- **cleaned_cars**: Cleaned vehicle data.
- **car_views_by_user**: User vehicle interactions.
- **favorite_cars_by_user**: Favorited vehicles.
- **user_preferences**: User preferences (budget, brands, etc.).
- **user_recommendations**: Generated recommendations.
- **user_searches**: User search queries.
- **user_similarities**: User similarity scores.
- **users**: User profiles.

### Technologies

- **Scraping**: Selenium
- **Streaming**: Apache Kafka
- **Processing**: Apache Spark
- **Storage**: Apache Cassandra
- **Automation**: Apache Airflow
- **ML Frameworks**: Scikit-learn, TensorFlow, or PyTorch
- **Visualization**: Python (Plotly, Matplotlib), D3.js, Power BI
- **Web Framework**: Flask or Django

---

## System Architecture

1. **Data Ingestion**:
    
    - Selenium scrapes data, managed by Airflow.
    - Kafka streams data in real-time.
2. **Data Processing**:
    
    - Spark cleans and processes data.
    - Synthetic user data is integrated.
3. **Storage**:
    
    - Cassandra stores vehicle and user data.
4. **Modeling**:
    
    - Supervised ML (LightGBM, Random Forest, XGBoost, GBM, Neural Network) for price prediction.
    - Unsupervised ML for recommendations.
5. **Visualization**:
    
    - Web interface with prediction and recommendation sections.
    - Interactive visualization section using Python and D3.js, leveraging Power BI insights.

---

## Expected Outcomes

- **Price Prediction**:
    - Accurate price predictions using LightGBM, Random Forest, XGBoost, GBM, and Neural Network.
    - Web interface for model comparison and interactive Python/D3.js visualizations.
- **Recommendation System**:
    - Real-time, personalized vehicle recommendations.
    - User-friendly visualization section for exploring car data.
- **Scalability**:
    - Automated pipeline for large-scale, real-time data processing.

---

## Future Enhancements

- Incorporate additional data sources (e.g., social media).
- Explore deep learning for image-based recommendations.
- Add real-time chat or price negotiation features to the web interface.
- Optimize Cassandra queries and Spark jobs.

This project transforms vehicle listing data into actionable insights and personalized recommendations, with robust Python and D3.js visualizations for enhanced user engagement.