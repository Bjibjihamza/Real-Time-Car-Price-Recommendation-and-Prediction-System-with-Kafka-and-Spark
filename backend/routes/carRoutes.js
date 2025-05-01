const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');

// Get a car by ID
router.get('/:id', carController.getCarById);

// Get all cars with pagination
router.get('/', carController.getAllCars);

// Get latest cars
router.get('/latest', carController.getLatestCars);

// Get recently viewed cars for a user
router.get('/recently-viewed', carController.getRecentlyViewed);

// Record a car view
router.post('/view', carController.recordCarView);

router.get('/latest', carController.getLatestCars);


module.exports = router;