const User = require('../models/User');
const UserPreference = require('../models/UserPreference');
const Car = require('../models/Car');
const { validate: isUUID } = require('uuid');
const client = require('../config/db');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

exports.getUser = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    const user = await User.getById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({
      message: 'User retrieved successfully',
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        age: user.age,
        location: user.location,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error retrieving user' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    const { username, email, age, location } = req.body;
    const user = await User.getById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updatedUser = await User.update(userId, { username, email, age, location });
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    const preferences = await UserPreference.getByUserId(userId);
    if (!preferences) return res.status(404).json({ message: 'Preferences not found' });

    res.status(200).json({ message: 'Preferences retrieved successfully', preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ message: 'Error retrieving preferences' });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    const {
      preferred_brands,
      preferred_fuel_types,
      preferred_transmissions,
      budget_min,
      budget_max,
      mileage_min,
      mileage_max,
      preferred_years,
      preferred_door_count
    } = req.body;

    if (!Array.isArray(preferred_brands) ||
        !Array.isArray(preferred_fuel_types) ||
        !Array.isArray(preferred_transmissions) ||
        !Array.isArray(preferred_years) ||
        !Array.isArray(preferred_door_count)) {
      return res.status(400).json({ message: 'Array fields must be arrays' });
    }

    const preferences = await UserPreference.update(userId, {
      preferred_brands: preferred_brands || [],
      preferred_fuel_types: preferred_fuel_types || [],
      preferred_transmissions: preferred_transmissions || [],
      budget_min: Number.isInteger(budget_min) ? budget_min : null,
      budget_max: Number.isInteger(budget_max) ? budget_max : null,
      mileage_min: Number.isInteger(mileage_min) ? mileage_min : null,
      mileage_max: Number.isInteger(mileage_max) ? mileage_max : null,
      preferred_years: preferred_years || [],
      preferred_door_count: preferred_door_count || []
    });

    res.status(200).json({ message: 'Preferences updated successfully', preferences });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ message: 'Error updating preferences', error: error.message });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    const favorites = await Car.getFavoritesByUserId(userId);
    res.status(200).json({ message: 'Favorites retrieved successfully', cars: favorites || [] });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Error retrieving favorites' });
  }
};

exports.addFavorite = async (req, res) => {
  try {
    const userId = req.userId;
    const { carId } = req.body;
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!carId) return res.status(400).json({ message: 'Car ID is required' });
    if (!isUUID(userId) || !isUUID(carId)) return res.status(400).json({ message: 'Invalid ID format' });

    await Car.addFavorite(userId, carId);
    res.status(200).json({ message: 'Car added to favorites' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ message: 'Error adding favorite' });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.userId;
    const { carId } = req.body;
    console.log('Removing favorite for userId:', userId, 'carId:', carId);
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!carId) return res.status(400).json({ message: 'Car ID is required' });
    if (!isUUID(userId) || !isUUID(carId)) return res.status(400).json({ message: 'Invalid ID format' });

    const success = await Car.removeFavorite(userId, carId);
    if (!success) {
      return res.status(404).json({ message: 'Favorite not found' });
    }
    res.status(200).json({ message: 'Car removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error.message, 'userId:', req.userId, 'carId:', req.body.carId);
    res.status(500).json({ message: `Error removing favorite: ${error.message}` });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Fetching recommendations for userId:', userId);

    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    console.log('Querying user_recommendations for userId:', userId);
    const query = `
      SELECT car_id, similarity_score, recommendation_reason
      FROM cars_keyspace.user_recommendations
      WHERE user_id = ?
      LIMIT 20
    `;
    const result = await client.execute(query, [userId], { prepare: true });
    console.log('Fetched recommendations:', result.rows.length);

    const cars = [];
    for (const row of result.rows) {
      const carId = row.car_id.toString();
      console.log('Fetching car details for carId:', carId);
      const car = await Car.getById(carId);
      if (car) {
        console.log('Found car:', car.title);
        cars.push({
          ...car,
          recommendation_score: (row.similarity_score * 100).toFixed(0),
          recommendation_reason: row.recommendation_reason || 'Precomputed recommendation'
        });
      } else {
        console.warn(`Skipping recommendation for non-existent car ID: ${carId}`);
      }
    }

    console.log('Returning cars:', cars.length);
    res.status(200).json({ message: 'Recommendations retrieved successfully', cars });
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    res.status(500).json({ message: 'Error retrieving recommendations' });
  }
};

exports.generateRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    console.log('Generating recommendations for userId:', userId);

    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    // Path to the Python script
    const pythonScriptPath = './scripts/combined_recommendations.py';
    
    // Execute the Python script
    const command = `python3 ${pythonScriptPath} ${userId}`;
    console.log('Executing command:', command);

    try {
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        console.error('Python script stderr:', stderr);
        if (stderr.includes('Error')) {
          throw new Error('Python script execution failed');
        }
      }
      console.log('Python script output:', stdout);

      // Fetch the newly generated recommendations
      const query = `
        SELECT car_id, similarity_score, recommendation_reason
        FROM cars_keyspace.user_recommendations
        WHERE user_id = ?
        LIMIT 20
      `;
      const result = await client.execute(query, [userId], { prepare: true });
      console.log('Fetched recommendations:', result.rows.length);

      const cars = [];
      for (const row of result.rows) {
        const carId = row.car_id.toString();
        console.log('Fetching car details for carId:', carId);
        const car = await Car.getById(carId);
        if (car) {
          console.log('Found car:', car.title);
          cars.push({
            ...car,
            recommendation_score: (row.similarity_score * 100).toFixed(0),
            recommendation_reason: row.recommendation_reason || 'Precomputed recommendation'
          });
        } else {
          console.warn(`Skipping recommendation for non-existent car ID: ${carId}`);
        }
      }

      console.log('Returning cars:', cars.length);
      res.status(200).json({ message: 'Recommendations generated successfully', cars });
    } catch (pythonError) {
      console.error('Error executing Python script:', pythonError);
      return res.status(500).json({ message: 'Error generating recommendations', error: pythonError.message });
    }
  } catch (error) {
    console.error('Error in generateRecommendations:', error);
    res.status(500).json({ message: 'Error generating recommendations' });
  }
};