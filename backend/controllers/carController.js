const Car = require('../models/Car');

// Get a car by ID
exports.getCarById = async (req, res) => {
  try {
    const carId = req.params.id;
    
    const car = await Car.getById(carId);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    // Record view if user is logged in
    if (req.body.userId) {
      await Car.recordView(req.body.userId, carId, 'detail_page');
    }
    
    res.status(200).json({ car });
  } catch (error) {
    console.error('Error fetching car by ID:', error);
    res.status(500).json({ message: 'Error fetching car details' });
  }
};

exports.getAllCars = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const { cars, total } = await Car.getAll(page, limit);
    
    res.status(200).json({
      cars,
      page,
      limit,
      total
    });
  } catch (error) {
    console.error('Error fetching all cars:', error);
    res.status(500).json({ message: 'Error fetching cars' });
  }
};

// Get latest cars
exports.getLatestCars = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const latestCars = await Car.getLatest(limit); // Use the correct method
    
    res.status(200).json({
      cars: latestCars,
      count: latestCars.length
    });
  } catch (error) {
    console.error('Error fetching latest cars:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching latest cars', error: error.message });
  }
};

// Get recently viewed cars for a user
exports.getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.body.userId || req.params.userId || req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const limit = parseInt(req.query.limit) || 5;
    
    const recentlyViewed = await Car.getRecentlyViewed(userId, limit);
    
    res.status(200).json({
      cars: recentlyViewed,
      count: recentlyViewed.length
    });
  } catch (error) {
    console.error('Error fetching recently viewed cars:', error);
    res.status(500).json({ message: 'Error fetching recently viewed cars' });
  }
};

// Record a car view
exports.recordCarView = async (req, res) => {
  try {
    const { userId, carId } = req.body;
    if (!userId || !carId) return res.status(400).json({ message: 'User ID and Car ID are required' });
    if (!isUUID(userId) || !isUUID(carId)) return res.status(400).json({ message: 'Invalid ID format' });

    const query = `
      INSERT INTO car_views_by_user (
        user_id, view_date, view_timestamp, car_id, view_duration_seconds, view_source
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId,
      new Date().toISOString().split('T')[0],
      new Date(),
      carId,
      30, // Example duration
      'web' // Example source
    ];

    await client.execute(query, params, { prepare: true });
    res.status(200).json({ message: 'Car view recorded' });
  } catch (error) {
    console.error('Error recording car view:', error);
    res.status(500).json({ message: 'Error recording car view' });
  }
};

exports.getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'User ID not found in token' });
    if (!isUUID(userId)) return res.status(400).json({ message: 'Invalid User ID format' });

    const query = `
      SELECT car_id
      FROM car_views_by_user
      WHERE user_id = ?
      LIMIT 10
    `;
    const result = await client.execute(query, [userId], { prepare: true });
    const carIds = result.rows.map(row => row.car_id.toString());

    const cars = [];
    for (const carId of carIds) {
      const car = await Car.getById(carId);
      if (car) cars.push(car);
    }

    res.status(200).json({ message: 'Recently viewed cars retrieved', cars });
  } catch (error) {
    console.error('Error fetching recently viewed cars:', error);
    res.status(500).json({ message: 'Error retrieving recently viewed cars' });
  }
};





