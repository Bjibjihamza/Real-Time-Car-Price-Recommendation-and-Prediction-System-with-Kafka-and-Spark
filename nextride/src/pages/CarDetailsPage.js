import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaRegHeart, FaShare, FaMapMarkerAlt, FaCalendarAlt, FaTachometerAlt, FaGasPump, FaDoorOpen, FaCog } from 'react-icons/fa';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import carImage from '../assets/images/carannonceimage.png'; // You should replace this with dynamic images

// Mock service to fetch car details - Replace with actual API call
const fetchCarDetails = async (carId) => {
  // This would be replaced with an actual API call
  // For now, we'll return mock data based on the schema
  return {
    id: carId,
    brand: 'Peugeot',
    model: '208',
    title: 'Peugeot 208 1.2 PureTech Allure Euro 6 (s/s) 5dr',
    price: 180000,
    year: 2020,
    mileage: 45000,
    fuel_type: 'Diesel',
    transmission: 'Manual',
    condition: 'Used',
    door_count: 5,
    fiscal_power: 6,
    seller_city: 'Casablanca',
    equipment: 'Air conditioning, Power steering, Electric windows, Airbags, ABS, ESP, Cruise control, Bluetooth, USB',
    first_owner: 'Yes',
    origin: 'Imported',
    publication_date: '2023-10-15',
    image_folder: '/car-images/peugeot-208/',
    sector: 'Private',
    creator: 'user123',
    source: 'direct'
  };
};

// Mock service to fetch similar cars - Replace with actual API call
const fetchSimilarCars = async (brand, model, excludeId) => {
  // This would be replaced with an actual API call
  return [
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      brand: 'Peugeot',
      model: '208',
      title: 'Peugeot 208 GT Line',
      price: 190000,
      year: 2020,
      mileage: 35000,
      fuel_type: 'Diesel'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      brand: 'Peugeot',
      model: '208',
      title: 'Peugeot 208 Active',
      price: 175000,
      year: 2019,
      mileage: 50000,
      fuel_type: 'Gasoline'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174003',
      brand: 'Peugeot',
      model: '208',
      title: 'Peugeot 208 Allure',
      price: 185000,
      year: 2021,
      mileage: 25000,
      fuel_type: 'Diesel'
    }
  ];
};

// Mock service to check if a car is favorited - Replace with actual state management
const isCarFavorited = (carId) => {
  const favoritedCars = JSON.parse(localStorage.getItem('favoritedCars') || '{}');
  return !!favoritedCars[carId];
};

// Mock service to toggle favorite status - Replace with actual API call
const toggleFavoriteStatus = (carId, status) => {
  const favoritedCars = JSON.parse(localStorage.getItem('favoritedCars') || '{}');
  
  if (status) {
    favoritedCars[carId] = true;
  } else {
    delete favoritedCars[carId];
  }
  
  localStorage.setItem('favoritedCars', JSON.stringify(favoritedCars));
  return status;
};

function CarDetailsPage() {
  const { carId } = useParams();
  const [car, setCar] = useState(null);
  const [similarCars, setSimilarCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  // Log car view (would be part of analytics in a real app)
  const logCarView = async (carId) => {
    console.log(`User viewed car: ${carId}`);
    // In a real app, this would call an API to log the view in car_views_by_user table
  };

  useEffect(() => {
    const loadCarDetails = async () => {
      try {
        setLoading(true);
        // Fetch car details
        const carDetails = await fetchCarDetails(carId);
        setCar(carDetails);
        
        // Check if this car is in user's favorites
        setIsFavorite(isCarFavorited(carId));
        
        // Log this view
        await logCarView(carId);
        
        // Fetch similar cars
        const similar = await fetchSimilarCars(carDetails.brand, carDetails.model, carId);
        setSimilarCars(similar);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load car details. Please try again later.');
        setLoading(false);
        console.error("Error loading car details:", err);
      }
    };
    
    loadCarDetails();
  }, [carId]);

  const handleFavoriteToggle = () => {
    const newStatus = !isFavorite;
    toggleFavoriteStatus(carId, newStatus);
    setIsFavorite(newStatus);
  };

  const handleShareClick = () => {
    if (navigator.share) {
      navigator.share({
        title: car?.title,
        text: `Check out this ${car?.brand} ${car?.model}!`,
        url: window.location.href,
      })
      .catch(error => console.log('Error sharing', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Failed to copy link: ', err));
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <Link to="/" className="btn btn-warning">Return to Home</Link>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning" role="alert">
          Car not found!
        </div>
        <Link to="/" className="btn btn-warning">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Breadcrumb navigation */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/cars">Cars</Link></li>
          <li className="breadcrumb-item"><Link to={`/cars/${car.brand.toLowerCase()}`}>{car.brand}</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{car.model}</li>
        </ol>
      </nav>

      {/* Back button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Link to="/" className="btn btn-light d-flex align-items-center">
          <FaArrowLeft className="me-2" /> Back
        </Link>
        <div>
          <button 
            className="btn btn-light me-2" 
            onClick={handleFavoriteToggle}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? <FaHeart className="text-danger" /> : <FaRegHeart />}
          </button>
          <button 
            className="btn btn-light" 
            onClick={handleShareClick}
            aria-label="Share"
          >
            <FaShare />
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Left column - Car images */}
        <div className="col-lg-7">
          <div className="card border-0 rounded-4 shadow-sm">
            <div className="card-body p-0">
              <div className="position-relative">
                <img 
                  src={carImage} 
                  alt={car.title} 
                  className="img-fluid rounded-top-4 w-100"
                  style={{maxHeight: '400px', objectFit: 'cover'}}
                />
                {car.condition === 'New' && (
                  <span className="position-absolute top-0 start-0 bg-success text-white px-3 py-1 m-3 rounded-pill fw-bold">
                    New
                  </span>
                )}
              </div>
              
              {/* Thumbnail images - Would be replaced with actual car images */}
              <div className="d-flex overflow-auto p-3 gap-2">
                {[1, 2, 3, 4].map((item) => (
                  <img 
                    key={item}
                    src={carImage} 
                    alt={`${car.title} thumbnail ${item}`}
                    className="img-thumbnail" 
                    style={{width: '100px', height: '70px', objectFit: 'cover', cursor: 'pointer'}}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Car details */}
        <div className="col-lg-5">
          <div className="card border-0 rounded-4 shadow-sm mb-4">
            <div className="card-body">
              <h2 className="fw-bold mb-2">{car.title}</h2>
              <div className="d-flex mb-3">
                <span className="badge bg-light text-dark me-2">
                  <FaCalendarAlt className="me-1" /> {car.year}
                </span>
                <span className="badge bg-light text-dark me-2">
                  <FaTachometerAlt className="me-1" /> {car.mileage.toLocaleString()} km
                </span>
                <span className="badge bg-light text-dark me-2">
                  <FaGasPump className="me-1" /> {car.fuel_type}
                </span>
                <span className="badge bg-light text-dark">
                  <FaDoorOpen className="me-1" /> {car.door_count} doors
                </span>
              </div>
              
              <div className="d-flex align-items-baseline mb-4">
                <h3 className="text-warning fw-bold mb-0">{car.price.toLocaleString()} MAD</h3>
                <small className="text-muted ms-2">TTC</small>
              </div>
              
              <hr className="my-3" />
              
              <div className="d-flex align-items-center mb-3">
                <FaMapMarkerAlt className="text-muted me-2" />
                <span>{car.seller_city}</span>
              </div>
              
              <div className="d-grid">
                <a href="tel:+212600000000" className="btn btn-warning btn-lg mb-2">
                  Contact Seller
                </a>
                <button className="btn btn-outline-warning">
                  Request Price Prediction
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Car details tabs */}
      <div className="card border-0 rounded-4 shadow-sm mt-4">
        <div className="card-body">
          <ul className="nav nav-tabs" id="carDetailsTabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'description' ? 'active' : ''}`} 
                onClick={() => setActiveTab('description')}
                id="description-tab"
                type="button"
                role="tab"
              >
                Description
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'features' ? 'active' : ''}`} 
                onClick={() => setActiveTab('features')}
                id="features-tab"
                type="button"
                role="tab"
              >
                Features
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'technical' ? 'active' : ''}`} 
                onClick={() => setActiveTab('technical')}
                id="technical-tab"
                type="button"
                role="tab"
              >
                Technical Specs
              </button>
            </li>
          </ul>
          
          <div className="tab-content p-3" id="carDetailsTabsContent">
            <div className={`tab-pane fade ${activeTab === 'description' ? 'show active' : ''}`} role="tabpanel" aria-labelledby="description-tab">
              <h5 className="mb-3">About this {car.brand} {car.model}</h5>
              <p>
                This {car.year} {car.brand} {car.model} comes with {car.transmission} transmission and a {car.fuel_type.toLowerCase()} engine. 
                With {car.mileage.toLocaleString()} kilometers on the odometer, this vehicle is in {car.condition.toLowerCase()} condition.
              </p>
              <p>
                The vehicle is {car.first_owner === 'Yes' ? 'first-hand' : 'not first-hand'} and its origin is {car.origin.toLowerCase()}.
                It was published on {new Date(car.publication_date).toLocaleDateString()}.
              </p>
              <p>
                This {car.brand} {car.model} is listed by a {car.sector.toLowerCase()} seller located in {car.seller_city}.
              </p>
            </div>
            
            <div className={`tab-pane fade ${activeTab === 'features' ? 'show active' : ''}`} role="tabpanel" aria-labelledby="features-tab">
              <h5 className="mb-3">Equipment and Features</h5>
              <div className="row">
                {car.equipment.split(', ').map((item, index) => (
                  <div key={index} className="col-md-4 mb-2">
                    <div className="d-flex align-items-center">
                      <FaCog className="text-warning me-2" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={`tab-pane fade ${activeTab === 'technical' ? 'show active' : ''}`} role="tabpanel" aria-labelledby="technical-tab">
              <h5 className="mb-3">Technical Specifications</h5>
              <div className="row">
                <div className="col-md-6">
                  <table className="table">
                    <tbody>
                      <tr>
                        <th scope="row">Brand</th>
                        <td>{car.brand}</td>
                      </tr>
                      <tr>
                        <th scope="row">Model</th>
                        <td>{car.model}</td>
                      </tr>
                      <tr>
                        <th scope="row">Year</th>
                        <td>{car.year}</td>
                      </tr>
                      <tr>
                        <th scope="row">Mileage</th>
                        <td>{car.mileage.toLocaleString()} km</td>
                      </tr>
                      <tr>
                        <th scope="row">Fuel Type</th>
                        <td>{car.fuel_type}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <table className="table">
                    <tbody>
                      <tr>
                        <th scope="row">Transmission</th>
                        <td>{car.transmission}</td>
                      </tr>
                      <tr>
                        <th scope="row">Door Count</th>
                        <td>{car.door_count}</td>
                      </tr>
                      <tr>
                        <th scope="row">Fiscal Power</th>
                        <td>{car.fiscal_power} CV</td>
                      </tr>
                      <tr>
                        <th scope="row">Condition</th>
                        <td>{car.condition}</td>
                      </tr>
                      <tr>
                        <th scope="row">First Owner</th>
                        <td>{car.first_owner}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price prediction section */}
      <div className="card border-0 rounded-4 shadow-sm mt-4 bg-warning bg-opacity-10">
        <div className="card-body text-center py-4">
          <h4 className="fw-bold mb-3">Get a Price Analysis</h4>
          <p className="mb-4">
            Is this {car.brand} {car.model} fairly priced? Use our ML-powered price prediction tool to find out!
          </p>
          <Link to="/predict" className="btn btn-warning btn-lg px-4">
            Predict Fair Price
          </Link>
        </div>
      </div>

      {/* Similar cars section */}
      {similarCars.length > 0 && (
        <div className="mt-5">
          <h4 className="fw-bold mb-4">Similar Vehicles You Might Like</h4>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {similarCars.map((similarCar) => (
              <div key={similarCar.id} className="col">
                <div className="card h-100 rounded-4 border-0 shadow-sm">
                  <img 
                    src={carImage} 
                    className="card-img-top p-3" 
                    alt={similarCar.title} 
                  />
                  <hr className="m-0" />
                  <div className="card-body">
                    <h5 className="card-title fw-bold mb-1">{similarCar.title}</h5>
                    <p className="card-text text-muted small mb-3">
                      {similarCar.year} • {similarCar.mileage.toLocaleString()} km • {similarCar.fuel_type}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold">{similarCar.price.toLocaleString()} MAD</span>
                      <Link to={`/car/${similarCar.id}`} className="text-decoration-none text-warning">View Details</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CarDetailsPage;