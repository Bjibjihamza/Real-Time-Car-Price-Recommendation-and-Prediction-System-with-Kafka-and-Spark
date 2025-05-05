````markdown
<p align="center">
  <img src="https://img.shields.io/badge/Big%20Data-🛢️-blue?style=for-the-badge&logo=apache-spark" alt="Big Data">
  <img src="https://img.shields.io/badge/Machine%20Learning-🤖-orange?style=for-the-badge&logo=python" alt="Machine Learning">
  <img src="https://img.shields.io/badge/Data%20Viz-📊-purple?style=for-the-badge" alt="Data Visualization">
</p>

---

# 🚗 Vehicle Listing Analysis & Recommendation System 🏎️

## 🚀 Project Overview

This project leverages **Big Data**, **Machine Learning**, and **Data Visualization** to analyze vehicle listing data from two Moroccan platforms: **Avito** and **Moteur.ma**. 🎯

<div style="background:#ecf0f1;border-left:6px solid #1abc9c;padding:10px;margin:10px 0;">
  <strong>Sub-projects:</strong>
  <ol>
    <li>💰 <strong>Price Prediction</strong>: Predict prices using supervised ML models with automated retraining.</li>
    <li>🔍 <strong>Recommendation System</strong>: Real-time recommendations via unsupervised ML.</li>
  </ol>
</div>

---

## 📦 Data Sources

Data is sourced from:

- 📌 **Avito**: Moroccan classifieds platform for vehicle listings.
- 🚗 **Moteur.ma**: Specialized vehicle listing platform.

<details>
<summary>📑 <strong>Avito Schema</strong></summary>

```text
ID: string
Titre: string
Prix: string
... et cetera
````

</details>

<details>
<summary>📑 <strong>Moteur.ma Schema</strong></summary>

```text
ID: string
Titre: string
Prix: string
... et cetera
```

</details>

---

## 💰 Price Prediction

### 🎯 Objective

Develop a predictive model to estimate vehicle prices based on features like brand, model, year, and mileage, with continuous improvement. 🏆

### 🔄 Workflow

1. 🛠️ **Data Collection**:

   * Selenium scraping (\~60k listings), incremental updates trigger retraining.
   * Airflow schedules scraping & retraining.
2. 🧹 **Data Processing**:

   * Kafka streams data.
   * Spark cleans & preprocesses.
   * Cassandra stores cleaned data.
3. 🤖 **Machine Learning**:

   * Models: LightGBM, Random Forest, XGBoost, GBM, Neural Network.
   * Retraining every +20k records via Airflow.
   * Metrics: MAE, RMSE, R².
4. 📊 **Visualization**:

   * Power BI for internal analysis.
   * Plotly & D3.js for user-facing graphs.

---

## 🔍 Recommendation System

### 🎯 Objective

Provide real-time, personalized vehicle recommendations. 💡

### 🔄 Workflow

1. 🛠️ **Data Collection**:

   * Hourly scraping with Airflow.
   * Synthetic user interaction data.
   * Cassandra tables for users & preferences.
2. 🧹 **Processing**:

   * Kafka ingestion.
   * Spark aggregates features.
3. 🤝 **Models**:

   * Collaborative & content-based filtering.
   * Hybrid approach.
4. 📊 **Visualization**:

   * Plotly & D3.js for interactive recommendations.

---

## 🏗️ System Architecture

1. 🔍 **Ingestion**: Selenium → Airflow → Kafka
2. 🧹 **Processing**: Spark transforms data
3. 💾 **Storage**: Cassandra for low-latency access
4. 🤖 **Modeling**: Supervised & unsupervised ML via Airflow
5. 🌐 **Visualization**: Power BI & web-based D3.js

---

## 🎯 Expected Outcomes

* 🎯 Accurate price predictions with auto-retraining.
* 💯 Real-time, personalized recommendations.
* 🚀 Scalable, automated pipeline.

---

## ✨ Future Enhancements

* ➕ Additional data sources (social media).
* 📷 Deep learning for image-based recommendations.
* 💬 Real-time chat & price negotiation features.

---

## ✅ Conclusion

This project transforms vehicle data into actionable insights and personalized recommendations, driving engagement through dynamic visualizations and robust MLOps practices. 🚀

```
```
