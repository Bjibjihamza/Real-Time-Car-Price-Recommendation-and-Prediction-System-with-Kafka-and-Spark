const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs'); // Add this line
require('dotenv').config();

const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const predictionRoutes = require('./routes/predictionRoutes');

// Initialize express app
const app = express();

// Middleware to handle trailing slashes
app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const redirectPath = req.path.slice(0, -1) + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    return res.redirect(301, redirectPath);
  }
  next();
});

// Other middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/images', express.static(path.join(__dirname, 'images')));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to NextRide API' });
});

// Catch-all for 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});