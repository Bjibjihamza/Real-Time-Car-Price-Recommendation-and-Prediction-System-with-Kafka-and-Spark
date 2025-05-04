const Car = require('../models/Car');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Ensure the images/cars directory exists
const uploadDir = path.join(__dirname, '../images/cars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

// Record car view
const { types } = require('cassandra-driver');
const client = require('../config/db');
const { validate: isUUID } = require('uuid');

exports.recordCarView = async (req, res) => {
  try {
    const { userId, carId, viewSource } = req.body;
    console.log('Request body:', req.body);

    // Validate inputs
    if (!userId || !carId || !viewSource) {
      console.error('Missing required fields:', { userId, carId, viewSource });
      return res.status(400).json({ message: 'User ID, Car ID, and View Source are required' });
    }

    if (!isUUID(userId) || !isUUID(carId)) {
      console.error('Invalid UUID format:', { userId, carId });
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    const userUuid = types.Uuid.fromString(userId);
    const carUuid = types.Uuid.fromString(carId);
    const currentDate = new Date();

    // Log parameter types for debugging
    console.log('Parameter types:', {
      userUuid: typeof userUuid,
      viewDate: typeof currentDate.toISOString().split('T')[0],
      viewTimestamp: typeof currentDate,
      carUuid: typeof carUuid,
      viewDuration: typeof 30,
      viewSource: typeof viewSource,
    });

    const query = `
      INSERT INTO car_views_by_user (
        user_id, view_date, view_timestamp, car_id, view_duration_seconds, view_source
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userUuid, // user_id (uuid)
      currentDate.toISOString().split('T')[0], // view_date (text)
      currentDate, // view_timestamp (timestamp)
      carUuid, // car_id (uuid)
      30, // view_duration_seconds (int)
      viewSource, // view_source (text)
    ];

    console.log('Executing query with params:', params.map(p => typeof p)); // Debug param types

    if (!client) {
      throw new Error('Cassandra client not initialized');
    }

    await client.execute(query, params, { prepare: true });
    res.status(200).json({ message: 'Car view recorded' });
  } catch (error) {
    console.error('Error recording car view:', error.message, error.stack);
    res.status(500).json({ message: 'Error recording car view', error: error.message });
  }
};

// Create a new car listing
exports.createCar = async (req, res) => {
  try {
    // Extract form data and files from request
    const {
      brand, model, condition, year, mileage, fuel_type, transmission,
      fiscal_power, door_count, first_owner, origin, seller_city, sector,
      price, title, equipment
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'brand', 'model', 'condition', 'year', 'mileage', 'fuel_type', 'transmission',
      'fiscal_power', 'door_count', 'origin', 'seller_city', 'sector', 'price', 'title'
    ];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    // Validate numeric fields
    if (year < 1980 || year > 2025) {
      return res.status(400).json({ message: 'Year must be between 1980 and 2025' });
    }
    if (mileage < 0) {
      return res.status(400).json({ message: 'Mileage cannot be negative' });
    }
    if (fiscal_power < 1 || fiscal_power > 40) {
      return res.status(400).json({ message: 'Fiscal power must be between 1 and 40' });
    }
    if (price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    // Handle image uploads
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }
    if (files.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 images allowed' });
    }

    // Generate a unique folder for images
    const imageFolder = uuidv4();
    const carImageDir = path.join(uploadDir, imageFolder);
    fs.mkdirSync(carImageDir, { recursive: true });

    // Save images with names like image_1.jpg, image_2.jpg, etc.
    files.forEach((file, index) => {
      const newPath = path.join(carImageDir, `image_${index + 1}${path.extname(file.originalname)}`);
      fs.renameSync(file.path, newPath);
    });

    // Prepare car data for database
    const carId = uuidv4();
    const publicationDate = new Date().toISOString().replace('T', ' ').substring(0, 19); // Format: YYYY-MM-DD HH:mm:ss
    const carData = {
      id: carId,
      brand: String(brand),
      model: String(model),
      title: String(title),
      price: parseInt(price),
      fuel_type: String(fuel_type),
      transmission: String(transmission),
      year: parseInt(year),
      door_count: parseInt(door_count),
      seller_city: String(seller_city),
      sector: String(sector),
      publication_date: publicationDate,
      condition: String(condition),
      equipment: equipment ? String(equipment) : '',
      first_owner: (first_owner === 'true' || first_owner === true) ? 'true' : 'false', // Convert to string
      fiscal_power: parseInt(fiscal_power),
      image_folder: imageFolder,
      mileage: parseInt(mileage),
      origin: String(origin),
      source: 'user_submission',
      creator: 'anonymous' // Since user is not logged in
    };

    // Log the carData for debugging
    console.log('Car Data for Insertion:', carData);
    console.log('Parameter Types:', {
      id: typeof carData.id,
      brand: typeof carData.brand,
      model: typeof carData.model,
      title: typeof carData.title,
      price: typeof carData.price,
      fuel_type: typeof carData.fuel_type,
      transmission: typeof carData.transmission,
      year: typeof carData.year,
      door_count: typeof carData.door_count,
      seller_city: typeof carData.seller_city,
      sector: typeof carData.sector,
      publication_date: typeof carData.publication_date,
      condition: typeof carData.condition,
      creator: typeof carData.creator,
      equipment: typeof carData.equipment,
      first_owner: typeof carData.first_owner,
      fiscal_power: typeof carData.fiscal_power,
      image_folder: typeof carData.image_folder,
      mileage: typeof carData.mileage,
      origin: typeof carData.origin,
      source: typeof carData.source
    });

    // Insert into Cassandra
    const query = `
      INSERT INTO cars_keyspace.cleaned_cars (
        id, brand, model, title, price, fuel_type, transmission, year, door_count,
        seller_city, sector, publication_date, condition, creator, equipment,
        first_owner, fiscal_power, image_folder, mileage, origin, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      carData.id,
      carData.brand,
      carData.model,
      carData.title,
      carData.price,
      carData.fuel_type,
      carData.transmission,
      carData.year,
      carData.door_count,
      carData.seller_city,
      carData.sector,
      carData.publication_date,
      carData.condition,
      carData.creator,
      carData.equipment,
      carData.first_owner,
      carData.fiscal_power,
      carData.image_folder,
      carData.mileage,
      carData.origin,
      carData.source
    ];

    await client.execute(query, params, { prepare: true });

    res.status(201).json({
      message: 'Car created successfully',
      car: {
        id: carId,
        ...carData,
        image_url: `/images/cars/${imageFolder}/image_1.jpg`
      }
    });
  } catch (error) {
    console.error('Error creating car:', error);
    res.status(500).json({ message: 'Error creating car', error: error.message });
  }
};