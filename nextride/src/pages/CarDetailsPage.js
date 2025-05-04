import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaHeart, FaRegHeart, FaShare, FaMapMarkerAlt, FaCalendarAlt, FaTachometerAlt, FaGasPump, FaDoorOpen, FaCog } from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function CarDetailsPage() {
  const { carId } = useParams();
  const { user } = useAuth();
  const [car, setCar] = useState(null);
  const [similarCars, setSimilarCars] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  const BASE_URL = 'http://localhost:5000';

  // Fetch car details and related data
  useEffect(() => {
    const loadCarDetails = async () => {
      try {
        setLoading(true);

        // Fetch car details
        const carResponse = await axios.get(`http://localhost:5000/api/cars/${carId}`);
        console.log('Car API response:', JSON.stringify(carResponse.data, null, 2));
        const carData = carResponse.data.car;
        if (!carData || typeof carData !== 'object' || !carData.brand || !carData.model) {
          throw new Error('Invalid or missing car data in response');
        }
        setCar(carData);

        // Load images dynamically based on image_folder (limit to 5 images to avoid excessive requests)
        if (carData.image_folder) {
          const loadedImages = [];
          const maxImages = 5;
          for (let index = 1; index <= maxImages; index++) {
            const imageUrl = `${BASE_URL}/images/cars/${carData.image_folder}/image_${index}.jpg`;
            try {
              await axios.head(imageUrl);
              loadedImages.push(imageUrl);
            } catch (err) {
              break;
            }
          }
          setImages(loadedImages.length > 0 ? loadedImages : [`${BASE_URL}/images/cars/default/image_1.jpg`]);
        } else {
          setImages([`${BASE_URL}/images/cars/default/image_1.jpg`]);
        }

        // Check if this car is in user's favorites
        if (user) {
          try {
            const favoritesResponse = await axios.get('http://localhost:5000/api/users/favorites', {
              headers: { Authorization: `Bearer ${user.token}` },
            });
            const favoriteCars = favoritesResponse.data.cars || [];
            setIsFavorite(favoriteCars.some((favCar) => favCar.id === carId));
          } catch (favError) {
            console.warn('Failed to fetch favorites:', favError.message);
          }
        }

        // Log this view if user is logged in
        if (user) {
          try {
            await axios.post(
              'http://localhost:5000/api/cars/view',
              { userId: user.userId, carId, viewSource: 'detail_page' },
              { headers: { Authorization: `Bearer ${user.token}` } }
            );
          } catch (viewError) {
            console.warn('Failed to log car view:', viewError.message);
          }
        }

        // Fetch similar cars
        const similarResponse = await axios.get('http://localhost:5000/api/cars', {
          params: {
            brand: carData.brand,
            model: carData.model,
            limit: 3,
          },
        });
        const similar = similarResponse.data.cars
          .filter((similarCar) => similarCar.id !== carId)
          .map((similarCar) => ({
            ...similarCar,
            image_url: similarCar.image_folder
              ? `${BASE_URL}/images/cars/${similarCar.image_folder}/image_1.jpg`
              : `${BASE_URL}/images/cars/default/image_1.jpg`,
          }));
        setSimilarCars(similar);

        setLoading(false);
      } catch (err) {
        setError(`Failed to load car details: ${err.message}`);
        setLoading(false);
        console.error('Error loading car details:', err.message, err.stack);
      }
    };

    loadCarDetails();
  }, [carId, user]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      setError('Please log in to save vehicles.');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (isFavorite) {
        await axios.delete('http://localhost:5000/api/users/favorites', {
          ...config,
          data: { carId },
        });
        setIsFavorite(false);
      } else {
        await axios.post('http://localhost:5000/api/users/favorites', { carId }, config);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorites. Please try again.');
    }
  };

  const handleShareClick = () => {
    if (navigator.share) {
      navigator
        .share({
          title: car?.title || 'Car Details',
          text: `Check out this ${car?.brand || ''} ${car?.model || ''}!`,
          url: window.location.href,
        })
        .catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch((err) => console.error('Failed to copy link: ', err));
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

  if (error || !car || !car.brand || !car.model) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger" role="alert">
          {error || 'Car not found or incomplete data!'}
        </div>
        <Link to="/" className="btn btn-warning">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Breadcrumb navigation */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Home</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/cars">Cars</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={`/cars/${car.brand.toLowerCase()}`}>{car.brand}</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {car.model}
          </li>
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
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? <FaHeart className="text-danger" /> : <FaRegHeart />}
          </button>
          <button className="btn btn-light" onClick={handleShareClick} aria-label="Share">
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
                  src={images[0]}
                  alt={car.title}
                  className="img-fluid rounded-top-4 w-100"
                  style={{ maxHeight: '400px', objectFit: 'cover' }}
                />
                {car.condition === 'New' && (
                  <span className="position-absolute top-0 start-0 bg-success text-white px-3 py-1 m-3 rounded-pill fw-bold">
                    New
                  </span>
                )}
              </div>

              {/* Thumbnail images */}
              <div className="d-flex overflow-auto p-3 gap-2">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${car.title} thumbnail ${index + 1}`}
                    className="img-thumbnail"
                    style={{ width: '100px', height: '70px', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setImages((prev) => [image, ...prev.filter((_, i) => i !== index)])}
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
                  <FaCalendarAlt className="me-1" /> {car.year || 'N/A'}
                </span>
                <span className="badge bg-light text-dark me-2">
                  <FaTachometerAlt className="me-1" /> {(car.mileage || 0).toLocaleString()} km
                </span>
                <span className="badge bg-light text-dark me-2">
                  <FaGasPump className="me-1" /> {car.fuel_type || 'N/A'}
                </span>
                <span className="badge bg-light text-dark">
                  <FaDoorOpen className="me-1" /> {car.door_count || 'N/A'} doors
                </span>
              </div>

              <div className="d-flex align-items-baseline mb-4">
                <h3 className="text-warning fw-bold mb-0">
                  {car.price != null ? `${car.price.toLocaleString()} MAD` : 'Price not specified'}
                </h3>
                {car.price != null && <small className="text-muted ms-2">TTC</small>}
              </div>

              <hr className="my-3" />

              <div className="d-flex align-items-center mb-3">
                <FaMapMarkerAlt className="text-muted me-2" />
                <span>{car.seller_city || 'N/A'}</span>
              </div>

              <div className="d-grid">
                <a href="tel:+212600000000" className="btn btn-warning btn-lg mb-2">
                  Contact Seller
                </a>
                <button className="btn btn-outline-warning">Request Price Prediction</button>
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
            <div
              className={`tab-pane fade ${activeTab === 'description' ? 'show active' : ''}`}
              role="tabpanel"
              aria-labelledby="description-tab"
            >
              <h5 className="mb-3">
                About this {car.brand} {car.model}
              </h5>
              <p>
                This {car.year || 'N/A'} {car.brand} {car.model} comes with {car.transmission} transmission and a{' '}
                {(car.fuel_type || '').toLowerCase()} engine. With {(car.mileage || 0).toLocaleString()} kilometers on the odometer,
                this vehicle is in {(car.condition || '').toLowerCase()} condition.
              </p>
              <p>
                The vehicle is {car.first_owner === 'Yes' ? 'first-hand' : 'not first-hand'} and its origin is{' '}
                {(car.origin || '').toLowerCase()}. It was published on{' '}
                {car.publication_date
                  ? new Date(car.publication_date).toLocaleDateString()
                  : 'Unknown date'}
                .
              </p>
              <p>
                This {car.brand} {car.model} is listed by a {(car.sector || '').toLowerCase()} seller located in{' '}
                {car.seller_city || 'N/A'}.
              </p>
            </div>

            <div
              className={`tab-pane fade ${activeTab === 'features' ? 'show active' : ''}`}
              role="tabpanel"
              aria-labelledby="features-tab"
            >
              <h5 className="mb-3">Equipment and Features</h5>
              <div className="row">
                {(car.equipment || '').split(', ').map((item, index) => (
                  <div key={index} className="col-md-4 mb-2">
                    <div className="d-flex align-items-center">
                      <FaCog className="text-warning me-2" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`tab-pane fade ${activeTab === 'technical' ? 'show active' : ''}`}
              role="tabpanel"
              aria-labelledby="technical-tab"
            >
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
                        <td>{car.year || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Mileage</th>
                        <td>{(car.mileage || 0).toLocaleString()} km</td>
                      </tr>
                      <tr>
                        <th scope="row">Fuel Type</th>
                        <td>{car.fuel_type || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <table className="table">
                    <tbody>
                      <tr>
                        <th scope="row">Transmission</th>
                        <td>{car.transmission || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Door Count</th>
                        <td>{car.door_count || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Fiscal Power</th>
                        <td>{car.fiscal_power || 'N/A'} CV</td>
                      </tr>
                      <tr>
                        <th scope="row">Condition</th>
                        <td>{car.condition || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th scope="row">First Owner</th>
                        <td>{car.first_owner || 'N/A'}</td>
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
          <Link
            to="/predict"
            state={{ car }}
            className="btn btn-warning btn-lg px-4"
          >
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
                    src={similarCar.image_url}
                    className="card-img-top p-3"
                    alt={similarCar.title}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                  <hr className="m-0" />
                  <div className="card-body">
                    <h5 className="card-title fw-bold mb-1">{similarCar.title}</h5>
                    <p className="card-text text-muted small mb-3">
                      {similarCar.year || 'N/A'} • {(similarCar.mileage || 0).toLocaleString()} km • {similarCar.fuel_type || 'N/A'}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold">
                        {similarCar.price != null ? `${similarCar.price.toLocaleString()} MAD` : 'Price not specified'}
                      </span>
                      <Link to={`/car/${similarCar.id}`} className="text-decoration-none text-warning">
                        View Details
                      </Link>
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