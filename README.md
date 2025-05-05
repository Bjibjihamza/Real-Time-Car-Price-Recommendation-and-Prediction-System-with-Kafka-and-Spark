
[![Big Data 🛢️](https://img.shields.io/badge/Big%20Data-🛢️-blue?style=for-the-badge&logo=apache-spark)]
[![Machine Learning 🤖](https://img.shields.io/badge/Machine%20Learning-🤖-orange?style=for-the-badge&logo=python)]
[![Data Viz 📊](https://img.shields.io/badge/Data%20Viz-📊-purple?style=for-the-badge)]

# 🚗 Vehicle Listing Analysis & Recommendation System

## 🚀 Project Overview

This project leverages **Big Data**, **Machine Learning**, and **Data Visualization** to analyze vehicle listing data from two Moroccan platforms: **Avito** and **Moteur.ma**.

**Sub-projects:**
1. **Price Prediction**: Predict prices using supervised ML models with automated retraining.
2. **Recommendation System**: Provide real-time recommendations via unsupervised ML.

---

## 📦 Data Sources

- **Avito**: Moroccan classifieds platform for vehicle listings.
- **Moteur.ma**: Vehicle listing platform.

<details>
<summary>Avito Schema</summary>

```text
ID: string
Titre: string
Prix: string
...
````

</details>

<details>
<summary>Moteur.ma Schema</summary>

```text
ID: string
Titre: string
Prix: string
...
```

</details>

---

## 💰 Price Prediction

### Objective

Estimate vehicle prices based on features such as brand, model, year, and mileage, with continuous improvement through automated retraining.

### Workflow

1. **Data Collection**

   * Selenium scraping (\~60 000 listings); Airflow schedules incremental updates.
2. **Data Processing**

   * Kafka streams data; Spark cleans and preprocesses; Cassandra stores cleaned data.
3. **Machine Learning**

   * Models: LightGBM, Random Forest, XGBoost, GBM, Neural Network.
   * Retraining triggered every 20 000 new records.
   * Evaluation: MAE, RMSE, R².
4. **Visualization**

   * Power BI for internal analysis; Plotly and D3.js for user-facing graphs.

---

## 🔍 Recommendation System

### Objective

Deliver personalized vehicle recommendations in real time.

### Workflow

1. **Data Collection**

   * Hourly scraping with Airflow; synthetic user interactions.
2. **Processing**

   * Kafka for ingestion; Spark for feature aggregation.
3. **Modeling**

   * Collaborative and content-based filtering; hybrid approach.
4. **Visualization**

   * Plotly and D3.js for interactive recommendation displays.

---

## 🏗️ System Architecture

1. Selenium → Airflow → Kafka
2. Spark data transformations
3. Cassandra storage
4. ML via Airflow automation
5. Visualizations: Power BI and D3.js

---

## 🎯 Expected Outcomes

* Accurate price predictions with automated retraining.
* Real-time, personalized recommendations.
* Scalable data pipeline with MLOps integration.

---

## ✨ Future Enhancements

* Additional data sources (e.g., social media).
* Deep learning for image-based recommendations.
* Real-time chat or negotiation features.

---

## ✅ Conclusion

Transforms vehicle listing data into actionable insights and personalized recommendations through robust automation and interactive visualizations.

```
```
