import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaCar, FaHistory, FaHeart, FaBell, FaCalendarAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { MdDirectionsCar, MdFavorite } from 'react-icons/md';
import { Link } from 'react-router-dom';

const UserProfilePage = () => {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    age: '',
    location: '',
  });
  const [preferencesData, setPreferencesData] = useState({
    preferred_brands: [],
    preferred_fuel_types: [],
    preferred_transmissions: [],
    budget_min: '',
    budget_max: '',
  });
  
  const [recentViews] = useState([
    { id: 1, name: 'Peugeot 208', price: '150,000 MAD', date: '2025-04-25', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
    { id: 2, name: 'Renault Clio', price: '120,000 MAD', date: '2025-04-23', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
    { id: 3, name: 'Dacia Duster', price: '180,000 MAD', date: '2025-04-20', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
  ]);
  
  const [favorites] = useState([
    { id: 4, name: 'Volkswagen Golf', price: '210,000 MAD', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
    { id: 5, name: 'Toyota Corolla', price: '230,000 MAD', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
  ]);
  
  const [recommendations] = useState([
    { id: 6, name: 'BMW Series 1', price: '320,000 MAD', reason: 'Based on your preferences', score: '95%', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
    { id: 7, name: 'Audi A3', price: '350,000 MAD', reason: 'Popular in your area', score: '92%', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
    { id: 8, name: 'Mercedes-Benz A Class', price: '380,000 MAD', reason: 'Similar to your favorites', score: '89%', image: 'https://kifalstorage.s3.amazonaws.com/new/img/peugeot/208/principal.png' },
  ]);

  const brands = [
    'Audi', 'BMW', 'Citroën', 'Dacia', 'Fiat', 'Ford', 'Honda', 'Hyundai', 
    'Kia', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 
    'Renault', 'Seat', 'Skoda', 'Toyota', 'Volkswagen', 'Volvo'
  ];

  const fuelTypes = ['Essence', 'Diesel', 'Hybrid', 'Electric', 'GPL'];
  const transmissions = ['Manuelle', 'Automatique', 'Semi-automatique'];
  const cities = [
    'Agadir', 'Casablanca', 'Fès', 'Marrakech', 'Meknès', 'Mohammedia', 
    'Oujda', 'Rabat', 'Salé', 'Tanger', 'Tétouan', 'Benguerir', 'El Jadida'
  ];

  useEffect(() => {
    // Load user data from localStorage
    const storedUser = localStorage.getItem('carUser');
    const storedPreferences = localStorage.getItem('carUserPreferences');
    
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        age: userData.age || '',
        location: userData.location || '',
      });
    }
    
    if (storedPreferences) {
      const prefsData = JSON.parse(storedPreferences);
      setPreferences(prefsData);
      setPreferencesData({
        preferred_brands: prefsData.preferred_brands || [],
        preferred_fuel_types: prefsData.preferred_fuel_types || [],
        preferred_transmissions: prefsData.preferred_transmissions || [],
        budget_min: prefsData.budget_min || '',
        budget_max: prefsData.budget_max || '',
      });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const { checked } = e.target;
      const arrayName = name.split('-')[0];
      const itemValue = name.split('-')[1];
      
      setPreferencesData(prev => {
        if (checked) {
          return {
            ...prev,
            [arrayName]: [...prev[arrayName], itemValue]
          };
        } else {
          return {
            ...prev,
            [arrayName]: prev[arrayName].filter(item => item !== itemValue)
          };
        }
      });
    } else {
      setPreferencesData({
        ...preferencesData,
        [name]: value,
      });
    }
  };

  const handleSaveProfile = () => {
    // In a real app, you'd make an API call to update the user profile
    const updatedUser = {
      ...user,
      username: formData.username,
      email: formData.email,
      age: parseInt(formData.age) || user.age,
      location: formData.location,
    };
    
    const updatedPreferences = {
      ...preferences,
      preferred_brands: preferencesData.preferred_brands,
      preferred_fuel_types: preferencesData.preferred_fuel_types,
      preferred_transmissions: preferencesData.preferred_transmissions,
      budget_min: parseInt(preferencesData.budget_min) || preferences.budget_min,
      budget_max: parseInt(preferencesData.budget_max) || preferences.budget_max,
      last_updated: new Date().toISOString(),
    };
    
    localStorage.setItem('carUser', JSON.stringify(updatedUser));
    localStorage.setItem('carUserPreferences', JSON.stringify(updatedPreferences));
    
    setUser(updatedUser);
    setPreferences(updatedPreferences);
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    // Reset form data to current user data
    setFormData({
      username: user.username || '',
      email: user.email || '',
      age: user.age || '',
      location: user.location || '',
    });
    
    setPreferencesData({
      preferred_brands: preferences.preferred_brands || [],
      preferred_fuel_types: preferences.preferred_fuel_types || [],
      preferred_transmissions: preferences.preferred_transmissions || [],
      budget_min: preferences.budget_min || '',
      budget_max: preferences.budget_max || '',
    });
    
    setEditMode(false);
  };

  if (!user || !preferences) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row">
        {/* Sidebar */}
        <div className="col-lg-3 mb-4">
          <div className="card shadow-sm rounded-4 overflow-hidden">
            <div className="card-body p-0">
              <div className="bg-warning p-4 text-center">
                <div className="bg-white rounded-circle p-3 d-inline-flex mb-3" style={{ width: '100px', height: '100px', alignItems: 'center', justifyContent: 'center' }}>
                  <FaUser size={50} className="text-warning" />
                </div>
                <h5 className="text-white mb-1">{user.username}</h5>
                <p className="text-white-50 mb-0">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              
              <div className="list-group list-group-flush">
                <button 
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'profile' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  <FaUser className="me-3" /> Profile Information
                </button>
                <button 
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'preferences' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => setActiveTab('preferences')}
                >
                  <FaCar className="me-3" /> Car Preferences
                </button>
                <button 
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'history' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  <FaHistory className="me-3" /> Recently Viewed
                </button>
                <button 
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'favorites' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => setActiveTab('favorites')}
                >
                  <FaHeart className="me-3" /> Saved Cars
                </button>
                <button 
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'recommendations' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => setActiveTab('recommendations')}
                >
                  <FaBell className="me-3" /> Recommendations
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="col-lg-9">
          <div className="card shadow-sm rounded-4">
            <div className="card-body p-4">
              {/* Profile Information */}
              {activeTab === 'profile' && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0 fw-bold">Profile Information</h4>
                    {!editMode ? (
                      <button 
                        className="btn btn-outline-warning rounded-pill px-4"
                        onClick={() => setEditMode(true)}
                      >
                        <FaEdit className="me-2" /> Edit Profile
                      </button>
                    ) : (
                      <div>
                        <button 
                          className="btn btn-warning rounded-pill me-2"
                          onClick={handleSaveProfile}
                        >
                          <FaSave className="me-2" /> Save
                        </button>
                        <button 
                          className="btn btn-outline-secondary rounded-pill"
                          onClick={handleCancelEdit}
                        >
                          <FaTimes className="me-2" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="username" className="form-label text-muted">Username</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaUser className="text-muted" />
                          </span>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={user.username}
                            readOnly
                          />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaUser className="text-muted" />
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label text-muted">Email</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaEnvelope className="text-muted" />
                          </span>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={user.email}
                            readOnly
                          />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaEnvelope className="text-muted" />
                          </span>
                          <input
                            type="email"
                            className="form-control"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="age" className="form-label text-muted">Age</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaCalendarAlt className="text-muted" />
                          </span>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={user.age || 'Not specified'}
                            readOnly
                          />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaCalendarAlt className="text-muted" />
                          </span>
                          <input
                            type="number"
                            className="form-control"
                            id="age"
                            name="age"
                            value={formData.age}
                            onChange={handleInputChange}
                            min="18"
                            max="100"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="col-md-6 mb-3">
                      <label htmlFor="location" className="form-label text-muted">Location</label>
                      {!editMode ? (
                        <div className="input-group">
                          <span className="input-group-text bg-light">
                            <FaMapMarkerAlt className="text-muted" />
                          </span>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={user.location || 'Not specified'}
                            readOnly
                          />
                        </div>
                      ) : (
                        <div className="input-group">
                          <span className="input-group-text">
                            <FaMapMarkerAlt className="text-muted" />
                          </span>
                          <select
                            className="form-select"
                            id="location"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                          >
                            <option value="">Select your city</option>
                            {cities.map(city => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!editMode && (
                    <div className="alert alert-info d-flex align-items-center mt-3">
                      <span>You can edit your profile information by clicking the "Edit Profile" button.</span>
                    </div>
                  )}
                </>
              )}
              
              {/* Car Preferences */}
              {activeTab === 'preferences' && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0 fw-bold">Car Preferences</h4>
                    {!editMode ? (
                      <button 
                        className="btn btn-outline-warning rounded-pill px-4"
                        onClick={() => setEditMode(true)}
                      >
                        <FaEdit className="me-2" /> Edit Preferences
                      </button>
                    ) : (
                      <div>
                        <button 
                          className="btn btn-warning rounded-pill me-2"
                          onClick={handleSaveProfile}
                        >
                          <FaSave className="me-2" /> Save
                        </button>
                        <button 
                          className="btn btn-outline-secondary rounded-pill"
                          onClick={handleCancelEdit}
                        >
                          <FaTimes className="me-2" /> Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h5 className="mb-3">Preferred Brands</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_brands && preferences.preferred_brands.length > 0 ? (
                          preferences.preferred_brands.map(brand => (
                            <span key={brand} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {brand}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred brands selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 row-cols-md-3 g-2">
                        {brands.map(brand => (
                          <div key={brand} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`brand-${brand}`}
                                name={`preferred_brands-${brand}`}
                                checked={preferencesData.preferred_brands.includes(brand)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`brand-${brand}`}>
                                {brand}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h5 className="mb-3">Fuel Types</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_fuel_types && preferences.preferred_fuel_types.length > 0 ? (
                          preferences.preferred_fuel_types.map(fuel => (
                            <span key={fuel} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {fuel}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred fuel types selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 row-cols-md-3 g-2">
                        {fuelTypes.map(fuel => (
                          <div key={fuel} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`fuel-${fuel}`}
                                name={`preferred_fuel_types-${fuel}`}
                                checked={preferencesData.preferred_fuel_types.includes(fuel)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`fuel-${fuel}`}>
                                {fuel}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <h5 className="mb-3">Transmission</h5>
                    {!editMode ? (
                      <div className="d-flex flex-wrap gap-2">
                        {preferences.preferred_transmissions && preferences.preferred_transmissions.length > 0 ? (
                          preferences.preferred_transmissions.map(transmission => (
                            <span key={transmission} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                              {transmission}
                            </span>
                          ))
                        ) : (
                          <p className="text-muted">No preferred transmissions selected</p>
                        )}
                      </div>
                    ) : (
                      <div className="row row-cols-2 g-2">
                        {transmissions.map(transmission => (
                          <div key={transmission} className="col">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`transmission-${transmission}`}
                                name={`preferred_transmissions-${transmission}`}
                                checked={preferencesData.preferred_transmissions.includes(transmission)}
                                onChange={handlePreferenceChange}
                              />
                              <label className="form-check-label" htmlFor={`transmission-${transmission}`}>
                                {transmission}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <h5 className="mb-3">Budget Range</h5>
                      {!editMode ? (
                        <div className="card bg-light">
                          <div className="card-body">
                            <div className="d-flex justify-content-between">
                              <div>
                                <p className="text-muted mb-1">Minimum</p>
                                <h5>{preferences.budget_min ? `${preferences.budget_min.toLocaleString()} MAD` : 'Not specified'}</h5>
                              </div>
                              <div>
                                <p className="text-muted mb-1">Maximum</p>
                                <h5>{preferences.budget_max ? `${preferences.budget_max.toLocaleString()} MAD` : 'Not specified'}</h5>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="row">
                          <div className="col-md-6">
                            <label htmlFor="budgetMin" className="form-label">Min (MAD)</label>
                            <input
                              type="number"
                              className="form-control"
                              id="budget_min"
                              name="budget_min"
                              placeholder="Minimum"
                              value={preferencesData.budget_min}
                              onChange={handlePreferenceChange}
                              min="0"
                            />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="budgetMax" className="form-label">Max (MAD)</label>
                            <input
                              type="number"
                              className="form-control"
                              id="budget_max"
                              name="budget_max"
                              placeholder="Maximum"
                              value={preferencesData.budget_max}
                              onChange={handlePreferenceChange}
                              min="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* Recently Viewed */}
              {activeTab === 'history' && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0 fw-bold">Recently Viewed Cars</h4>
                    <Link to="/predict" className="btn btn-warning rounded-pill px-4">
                      Find More Cars
                    </Link>
                  </div>
                  
                  {recentViews.length > 0 ? (
                    <div className="row row-cols-1 row-cols-md-2 g-4">
                      {recentViews.map(car => (
                        <div key={car.id} className="col">
                          <div className="card h-100 border-0 shadow-sm">
                            <div className="row g-0">
                              <div className="col-4">
                                <img src={car.image} className="img-fluid rounded-start h-100" alt={car.name} style={{ objectFit: 'cover' }} />
                              </div>
                              <div className="col-8">
                                <div className="card-body">
                                  <h5 className="card-title">{car.name}</h5>
                                  <p className="card-text text-warning fw-bold">{car.price}</p>
                                  <p className="card-text">
                                    <small className="text-muted">
                                      <FaCalendarAlt className="me-1" /> 
                                      Viewed on {new Date(car.date).toLocaleDateString()}
                                    </small>
                                  </p>
                                  <div className="mt-2">
                                    <button className="btn btn-sm btn-outline-warning me-2">View Details</button>
                                    <button className="btn btn-sm btn-outline-secondary">
                                      <FaHeart />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <MdDirectionsCar size={60} className="text-muted mb-3" />
                      <h5>No recently viewed cars</h5>
                      <p className="text-muted">Start browsing to see your history here</p>
                      <Link to="/predict" className="btn btn-warning rounded-pill mt-3">
                        Start Exploring
                      </Link>
                    </div>
                  )}
                </>
              )}
              
              {/* Saved Cars */}
              {activeTab === 'favorites' && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0 fw-bold">Saved Cars</h4>
                    <Link to="/predict" className="btn btn-warning rounded-pill px-4">
                      Find More Cars
                    </Link>
                  </div>
                  
                  {favorites.length > 0 ? (
                    <div className="row row-cols-1 row-cols-md-2 g-4">
                      {favorites.map(car => (
                        <div key={car.id} className="col">
                          <div className="card h-100 border-0 shadow-sm">
                            <div className="row g-0">
                              <div className="col-4">
                                <img src={car.image} className="img-fluid rounded-start h-100" alt={car.name} style={{ objectFit: 'cover' }} />
                              </div>
                              <div className="col-8">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between">
                                    <h5 className="card-title">{car.name}</h5>
                                    <button className="btn btn-sm text-danger">
                                      <FaHeart size={16} />
                                    </button>
                                  </div>
                                  <p className="card-text text-warning fw-bold">{car.price}</p>
                                  <div className="mt-2">
                                    <button className="btn btn-sm btn-warning me-2">View Details</button>
                                    <button className="btn btn-sm btn-outline-danger">Remove</button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <MdFavorite size={60} className="text-muted mb-3" />
                      <h5>No saved cars</h5>
                      <p className="text-muted">Cars you save will appear here</p>
                      <Link to="/predict" className="btn btn-warning rounded-pill mt-3">
                        Find Cars to Save
                      </Link>
                    </div>
                  )}
                </>
              )}
              
              {/* Recommendations */}
              {activeTab === 'recommendations' && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0 fw-bold">Recommended For You</h4>
                    <Link to="/predict" className="btn btn-warning rounded-pill px-4">
                      Get Custom Recommendations
                    </Link>
                  </div>
                  
                  <div className="alert alert-warning d-flex align-items-center mb-4">
                    <FaBell className="me-2" />
                    <div>
                      <strong>Personalized Picks:</strong> These recommendations are based on your preferences and browsing history.
                    </div>
                  </div>
                  
                  {recommendations.length > 0 ? (
                    <div className="row row-cols-1 g-4">
                      {recommendations.map(car => (
                        <div key={car.id} className="col">
                          <div className="card border-0 shadow-sm">
                            <div className="row g-0">
                              <div className="col-md-3">
                                <img src={car.image} className="img-fluid rounded-start h-100" alt={car.name} style={{ objectFit: 'cover' }} />
                              </div>
                              <div className="col-md-9">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                      <h5 className="card-title">{car.name}</h5>
                                      <p className="card-text text-warning fw-bold">{car.price}</p>
                                    </div>
                                    <span className="badge bg-success rounded-pill px-3 py-2">
                                      Match: {car.score}
                                    </span>
                                  </div>
                                  <p className="card-text">
                                    <small className="text-muted">
                                      {car.reason}
                                    </small>
                                  </p>
                                  <div className="mt-3 d-flex">
                                    <button className="btn btn-sm btn-warning me-2">View Details</button>
                                    <button className="btn btn-sm btn-outline-warning me-2">
                                      <FaHeart className="me-1" /> Save
                                    </button>
                                    <button className="btn btn-sm btn-outline-danger">
                                      <FaTimes className="me-1" /> Not Interested
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <FaBell size={60} className="text-muted mb-3" />
                      <h5>No recommendations yet</h5>
                      <p className="text-muted">Update your preferences to get personalized recommendations</p>
                      <button 
                        className="btn btn-warning rounded-pill mt-3"
                        onClick={() => {
                          setActiveTab('preferences');
                          setEditMode(true);
                        }}
                      >
                        Update Preferences
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;