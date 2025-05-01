const client = require('../config/db');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Predict car price based on features
exports.predictPrice = async (req, res) => {
  try {
    const { userId, brand, model, year, mileage, fuelType, transmission } = req.body;

    // Validate required fields
    if (!userId || !brand || !model || !year || !mileage) {
      return res.status(400).json({ message: 'Missing required fields: userId, brand, model, year, mileage' });
    }

    // Prepare features for prediction
    const features = {
      brand,
      model,
      year: parseInt(year),
      mileage: parseInt(mileage),
      fuel_type: fuelType || null,
      transmission: transmission || null
    };

    // Call external ML model endpoint (e.g., Flask or Spark ML service)
    // Replace with your actual ML service URL
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001/predict';
    let predictedPrice;
    try {
      const response = await axios.post(mlServiceUrl, features);
      predictedPrice = response.data.predicted_price;
    } catch (mlError) {
      console.error('Error calling ML service:', mlError.message);
      return res.status(500).json({ message: 'Error generating price prediction' });
    }

    // Store prediction in Cassandra
    const predictionId = uuidv4();
    const query = `
      INSERT INTO car_predictions (
        prediction_id,
        user_id,
        car_features,
        predicted_price,
        prediction_timestamp
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      predictionId,
      userId,
      features,
      predictedPrice,
      new Date()
    ];

    await client.execute(query, params, { prepare: true });

    // Return prediction result
    res.status(200).json({
      message: 'Price predicted successfully',
      prediction: {
        predictionId,
        userId,
        features,
        predictedPrice,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error predicting price:', error);
    res.status(500).json({ message: 'Error processing prediction request' });
  }
};

// Get user's prediction history
exports.getPredictionHistory = async (req, res) => {
  try {
    const userId = req.body.userId || req.params.userId || req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Fetch predictions from Cassandra
    const query = `
      SELECT * FROM car_predictions
      WHERE user_id = ?
      LIMIT ?
    `;
    const params = [userId, limit];

    const result = await client.execute(query, params, { prepare: true });
    const predictions = result.rows;

    res.status(200).json({
      message: 'Prediction history retrieved successfully',
      predictions,
      page,
      limit,
      count: predictions.length
    });
  } catch (error) {
    console.error('Error fetching prediction history:', error);
    res.status(500).json({ message: 'Error retrieving prediction history' });
  }
};