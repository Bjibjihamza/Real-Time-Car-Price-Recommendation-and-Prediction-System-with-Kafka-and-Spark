import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaEnvelope, FaMapMarkerAlt, FaCar, FaHeart, FaBell, FaCalendarAlt, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { MdFavorite } from 'react-icons/md';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Snackbar, Alert } from '@mui/material';

const UserProfilePage = () => {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
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
    mileage_min: '',
    mileage_max: '',
    preferred_years: [],
    preferred_door_count: [],
  });
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const profileRef = useRef(null);
  const preferencesRef = useRef(null);
  const favoritesRef = useRef(null);
  const recommendationsRef = useRef(null);

  const brands = [
    'Abarth', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'BYD', 'Cadillac',
    'Chana', 'Changan', 'Changhe', 'Chery', 'Chevrolet', 'Chrysler', 'Citroën', 'Cupra',
    'Dacia', 'Daewoo', 'Daihatsu', 'DFSK', 'Dodge', 'DS', 'FAW', 'Ferrari', 'Fiat',
    'Ford', 'Foton', 'GAZ', 'Geely', 'GMC', 'GME', 'Great Wall', 'GWM Motors', 'Hafei',
    'Honda', 'Hummer', 'Hyundai', 'Infiniti', 'Isuzu', 'Iveco', 'Jaguar', 'Jeep', 'Kia',
    'KTM', 'Lada', 'Lamborghini', 'Lancia', 'Land Rover', 'Lexus', 'Lifan', 'Lincoln',
    'Mahindra', 'Maserati', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi',
    'Nissan', 'Opel', 'Peugeot', 'Polaris', 'Porsche', 'Renault', 'Rolls-Royce',
    'Rover', 'Seat', 'Simca', 'Skoda', 'Smart', 'SsangYong', 'Subaru', 'Suzuki',
    'Tata', 'Toyota', 'Volkswagen', 'Volvo', 'Zotye'
  ];
  const fuelTypes = ['Diesel', 'Essence', 'Hybride'];
  const transmissions = ['Manuelle', 'Automatique'];
  const cities = [
    'Agadir', 'Ait Melloul', 'Al Hoceima', 'Asilah', 'Azrou', 'Beni Mellal',
    'Berkane', 'Berrechid', 'Casablanca', 'Chefchaouen', 'Dakhla', 'El Jadida',
    'Errachidia', 'Essaouira', 'Fès', 'Fnideq', 'Guelmim', 'Ifrane', 'Kenitra',
    'Khemisset', 'Khenifra', 'Khouribga', 'Laayoune', 'Larache', 'Marrakech',
    'Meknès', 'Mohammedia', 'Nador', 'Ouarzazate', 'Oujda', 'Rabat', 'Safi',
    'Salé', 'Settat', 'Sidi Kacem', 'Tanger', 'Taounate', 'Taroudant', 'Taza',
    'Temara', 'Tétouan', 'Tiznit', 'Youssoufia', 'Zagora'
  ];
  const years = [...Array(2025 - 1950 + 1).keys()].map(i => 1950 + i);
  const doorCounts = [3, 5, 7];

  const brandMap = Object.fromEntries(brands.map(b => [b.toLowerCase(), b]));
  const fuelMap = Object.fromEntries(fuelTypes.map(f => [f.toLowerCase(), f]));
  const transmissionMap = Object.fromEntries(transmissions.map(t => [t.toLowerCase(), t]));

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('favorites') === 'true') {
      setActiveTab('favorites');
      favoritesRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (queryParams.get('recommendations') === 'true') {
      setActiveTab('recommendations');
      recommendationsRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (queryParams.get('preferences') === 'true') {
      setActiveTab('preferences');
      preferencesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    const fetchUserData = async () => {
      if (!user?.userId || !user?.token) {
        console.error('User or token missing:', { userId: user?.userId, token: user?.token });
        setError('Authentication error. Please log in again.');
        logout();
        navigate('/login');
        return;
      }
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };

        const userResponse = await axios.get('http://localhost:5000/api/users', config);
        const userData = userResponse.data.user;
        setUserData(userData);
        setFormData({
          username: userData.username || '',
          email: userData.email || '',
          age: userData.age || '',
          location: userData.location || '',
        });

        const preferencesResponse = await axios.get('http://localhost:5000/api/users/preferences', config);
        const preferencesData = preferencesResponse.data.preferences || {};

        const normalizedPreferences = {
          preferred_brands: (preferencesData.preferred_brands || []).map(brand =>
            brandMap[brand.toLowerCase()] || brand
          ).filter(brand => brands.includes(brand)),
          preferred_fuel_types: (preferencesData.preferred_fuel_types || []).map(fuel =>
            fuelMap[fuel.toLowerCase()] || fuel
          ).filter(fuel => fuelTypes.includes(fuel)),
          preferred_transmissions: (preferencesData.preferred_transmissions || []).map(trans =>
            transmissionMap[trans.toLowerCase()] || trans
          ).filter(trans => transmissions.includes(trans)),
          budget_min: preferencesData.budget_min || '',
          budget_max: preferencesData.budget_max || '',
          mileage_min: preferencesData.mileage_min || '',
          mileage_max: preferencesData.mileage_max || '',
          preferred_years: (preferencesData.preferred_years || []).filter(year => years.includes(year)),
          preferred_door_count: (preferencesData.preferred_door_count || []).filter(doors => doorCounts.includes(doors)),
        };

        setPreferences(normalizedPreferences);
        setPreferencesData(normalizedPreferences);
        console.log('Normalized preferencesData:', normalizedPreferences);

        const favoritesResponse = await axios.get('http://localhost:5000/api/users/favorites', config);
        setFavorites(favoritesResponse.data.cars || []);

        const recommendationsResponse = await axios.get('http://localhost:5000/api/users/recommendations', config);
        setRecommendations(recommendationsResponse.data.cars || []);
      } catch (error) {
        console.error('Error fetching user data or preferences:', error);
        if (error.response) {
          console.log('Error response:', error.response.data);
          if (error.response.status === 401) {
            setError('Session expired. Please log in again.');
            logout();
            navigate('/login');
          } else if (error.response.status === 404) {
            setError('User or preferences not found. Please check your account.');
          } else if (error.response.status === 400) {
            setError('Invalid request. Please try again.');
          } else {
            setError('Failed to load profile data. Please try again later.');
          }
        } else {
          setError('Unable to connect to the server. Please check your network.');
        }
      }
    };

    if (!loading && user) {
      fetchUserData();
    }
  }, [user, loading, navigate, location.search, logout]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePreferenceChange = (e) => {
    const { name, type, checked } = e.target;
    const [arrayName, itemValue] = name.split('-');

    if (type === 'checkbox') {
      setPreferencesData(prev => {
        const currentArray = prev[arrayName] || [];
        const parsedValue = (arrayName === 'preferred_years' || arrayName === 'preferred_door_count')
          ? parseInt(itemValue)
          : itemValue;

        return {
          ...prev,
          [arrayName]: checked
            ? [...currentArray, parsedValue]
            : currentArray.filter(item => item !== parsedValue)
        };
      });
    } else {
      setPreferencesData({ ...preferencesData, [name]: e.target.value });
    }
  };

  const handleSaveProfile = async () => {
    try {
      setError('');
      if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Invalid email address');
        return;
      }
      if (formData.age && (formData.age < 18 || formData.age > 100)) {
        setError('Age must be between 18 and 100');
        return;
      }
      if (preferencesData.budget_min && preferencesData.budget_max && parseInt(preferencesData.budget_min) > parseInt(preferencesData.budget_max)) {
        setError('Minimum budget cannot exceed maximum budget');
        return;
      }
      if (preferencesData.mileage_min && preferencesData.mileage_max && parseInt(preferencesData.mileage_min) > parseInt(preferencesData.mileage_max)) {
        setError('Minimum mileage cannot exceed maximum mileage');
        return;
      }

      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      const updatedUser = {
        username: formData.username,
        email: formData.email,
        age: formData.age ? parseInt(formData.age) : undefined,
        location: formData.location || undefined,
      };
      await axios.put('http://localhost:5000/api/users', updatedUser, config);

      const updatedPreferences = {
        preferred_brands: (preferencesData.preferred_brands || []).filter(brand => brands.includes(brand)),
        preferred_fuel_types: (preferencesData.preferred_fuel_types || []).filter(fuel => fuelTypes.includes(fuel)),
        preferred_transmissions: (preferencesData.preferred_transmissions || []).filter(trans => transmissions.includes(trans)),
        budget_min: preferencesData.budget_min ? parseInt(preferencesData.budget_min) : undefined,
        budget_max: preferencesData.budget_max ? parseInt(preferencesData.budget_max) : undefined,
        mileage_min: preferencesData.mileage_min ? parseInt(preferencesData.mileage_min) : undefined,
        mileage_max: preferencesData.mileage_max ? parseInt(preferencesData.mileage_max) : undefined,
        preferred_years: (preferencesData.preferred_years || []).filter(year => years.includes(year)),
        preferred_door_count: (preferencesData.preferred_door_count || []).filter(doors => doorCounts.includes(doors)),
      };
      await axios.put('http://localhost:5000/api/users/preferences', updatedPreferences, config);

      setUserData({ ...userData, ...updatedUser });
      setPreferences(updatedPreferences);
      setPreferencesData(updatedPreferences);
      setEditMode(false);
      setSnackbar({
        open: true,
        message: 'Profile and preferences updated successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving profile or preferences:', error);
      if (error.response) {
        if (error.response.status === 401) {
          setError('Session expired. Please log in again.');
          logout();
          navigate('/login');
        } else if (error.response.status === 400) {
          setError(error.response.data.message || 'Invalid request. Please check your inputs.');
        } else {
          setError('Failed to save profile or preferences. Please try again.');
        }
      } else {
        setError('Unable to connect to the server. Please check your network.');
      }
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      username: userData?.username || '',
      email: userData?.email || '',
      age: userData?.age || '',
      location: userData?.location || '',
    });
    setPreferencesData({
      preferred_brands: (preferences?.preferred_brands || []).map(brand => brandMap[brand.toLowerCase()] || brand).filter(brand => brands.includes(brand)),
      preferred_fuel_types: (preferences?.preferred_fuel_types || []).map(fuel => fuelMap[fuel.toLowerCase()] || fuel).filter(fuel => fuelTypes.includes(fuel)),
      preferred_transmissions: (preferences?.preferred_transmissions || []).map(trans => transmissionMap[trans.toLowerCase()] || trans).filter(trans => transmissions.includes(trans)),
      budget_min: preferences?.budget_min || '',
      budget_max: preferences?.budget_max || '',
      mileage_min: preferences?.mileage_min || '',
      mileage_max: preferences?.mileage_max || '',
      preferred_years: preferences?.preferred_years || [],
      preferred_door_count: preferences?.preferred_door_count || [],
    });
    setEditMode(false);
    setError('');
  };

  const handleTabChange = (tab, ref) => {
    setActiveTab(tab);
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading || !userData || !preferences) {
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
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <FaTimes className="me-2" />
          {error}
        </div>
      )}
      <div className="row">
        <div className="col-lg-3 mb-4">
          <div className="card shadow-sm rounded-4 overflow-hidden">
            <div className="card-body p-0">
              <div className="bg-warning p-4 text-center">
                <div className="bg-white rounded-circle p-3 d-inline-flex mb-3" style={{ width: '100px', height: '100px', alignItems: 'center', justifyContent: 'center' }}>
                  <FaUser size={50} className="text-warning" />
                </div>
                <h5 className="text-white mb-1">{userData.username}</h5>
                <p className="text-white-50 mb-0">Member since {new Date(userData.created_at).toLocaleDateString()}</p>
              </div>
              <div className="list-group list-group-flush">
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'profile' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('profile', profileRef)}
                >
                  <FaUser className="me-3" /> Profile Information
                </button>
                <button
                  className={`list-group-item list SIST-group-item-action d-flex align-items-center ${activeTab === 'preferences' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('preferences', preferencesRef)}
                >
                  <FaCar className="me-3" /> Car Preferences
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'favorites' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('favorites', favoritesRef)}
                >
                  <FaHeart className="me-3" /> Saved Cars
                </button>
                <button
                  className={`list-group-item list-group-item-action d-flex align-items-center ${activeTab === 'recommendations' ? 'active bg-warning text-white' : ''}`}
                  onClick={() => handleTabChange('recommendations', recommendationsRef)}
                >
                  <FaBell className="me-3" /> Recommendations
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-9">
          <div className="card shadow-sm rounded-4">
            <div className="card-body p-4">
              <div ref={profileRef}>
                {activeTab === 'profile' && (
                  <>
                    <h4 className="mb-4 fw-bold">Profile Information</h4>
                    <div className="d-flex justify-content-between align-items-center mb-4">
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
                              value={userData.username}
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
                              value={userData.email}
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
                              value={userData.age || 'Not specified'}
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
                              value={userData.location || 'Not specified'}
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
                  </>
                )}
              </div>

              <div ref={preferencesRef}>
                {activeTab === 'preferences' && (
                  <>
                    <h4 className="mb-4 fw-bold">Car Preferences</h4>
                    <div className="d-flex justify-content-between align-items-center mb-4">
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
                              <label htmlFor="budget_min" className="form-label">Min (MAD)</label>
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
                              <label htmlFor="budget_max" className="form-label">Max (MAD)</label>
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
                      <div className="col-md-6">
                        <h5 className="mb-3">Mileage Range</h5>
                        {!editMode ? (
                          <div className="card bg-light">
                            <div className="card-body">
                              <div className="d-flex justify-content-between">
                                <div>
                                  <p className="text-muted mb-1">Minimum</p>
                                  <h5>{preferences.mileage_min ? `${preferences.mileage_min.toLocaleString()} km` : 'Not specified'}</h5>
                                </div>
                                <div>
                                  <p className="text-muted mb-1">Maximum</p>
                                  <h5>{preferences.mileage_max ? `${preferences.mileage_max.toLocaleString()} km` : 'Not specified'}</h5>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="row">
                            <div className="col-md-6">
                              <label htmlFor="mileage_min" className="form-label">Min (km)</label>
                              <input
                                type="number"
                                className="form-control"
                                id="mileage_min"
                                name="mileage_min"
                                placeholder="Minimum"
                                value={preferencesData.mileage_min}
                                onChange={handlePreferenceChange}
                                min="0"
                              />
                            </div>
                            <div className="col-md-6">
                              <label htmlFor="mileage_max" className="form-label">Max (km)</label>
                              <input
                                type="number"
                                className="form-control"
                                id="mileage_max"
                                name="mileage_max"
                                placeholder="Maximum"
                                value={preferencesData.mileage_max}
                                onChange={handlePreferenceChange}
                                min="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h5 className="mb-3">Preferred Years</h5>
                      {!editMode ? (
                        <div className="d-flex flex-wrap gap-2">
                          {preferences.preferred_years && preferences.preferred_years.length > 0 ? (
                            preferences.preferred_years.map(year => (
                              <span key={year} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                                {year}
                              </span>
                            ))
                          ) : (
                            <p className="text-muted">No preferred years selected</p>
                          )}
                        </div>
                      ) : (
                        <div className="row row-cols-2 row-cols-md-3 g-2">
                          {years.map(year => (
                            <div key={year} className="col">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`year-${year}`}
                                  name={`preferred_years-${year}`}
                                  checked={preferencesData.preferred_years.includes(year)}
                                  onChange={handlePreferenceChange}
                                />
                                <label className="form-check-label" htmlFor={`year-${year}`}>
                                  {year}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <h5 className="mb-3">Preferred Door Count</h5>
                      {!editMode ? (
                        <div className="d-flex flex-wrap gap-2">
                          {preferences.preferred_door_count && preferences.preferred_door_count.length > 0 ? (
                            preferences.preferred_door_count.map(doors => (
                              <span key={doors} className="badge bg-light text-dark py-2 px-3 rounded-pill">
                                {doors} doors
                              </span>
                            ))
                          ) : (
                            <p className="text-muted">No preferred door counts selected</p>
                          )}
                        </div>
                      ) : (
                        <div className="row row-cols-2 g-2">
                          {doorCounts.map(doors => (
                            <div key={doors} className="col">
                              <div className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`doors-${doors}`}
                                  name={`preferred_door_count-${doors}`}
                                  checked={preferencesData.preferred_door_count.includes(doors)}
                                  onChange={handlePreferenceChange}
                                />
                                <label className="form-check-label" htmlFor={`doors-${doors}`}>
                                  {doors} doors
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div ref={favoritesRef}>
                {activeTab === 'favorites' && (
                  <>
                    <h4 className="mb-4 fw-bold">Saved Cars</h4>
                    <div className="d-flex justify-content-between align-items-center mb-4">
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
                                  <img src={car.image || 'https://via.placeholder.com/150'} className="img-fluid rounded-start h-100" alt={car.title} style={{ objectFit: 'cover' }} />
                                </div>
                                <div className="col-8">
                                  <div className="card-body">
                                    <div className="d-flex justify-content-between">
                                      <h5 className="card-title">{car.title}</h5>
                                      <button
  className="btn btn-sm text-danger"
  onClick={async () => {
    try {
      if (!car.id) {
        setError('Invalid car data.');
        return;
      }
      await axios.delete('http://localhost:5000/api/users/favorites', {
        headers: { Authorization: `Bearer ${user.token}` },
        data: { userId: user.userId, carId: car.id }
      });
      setFavorites(favorites.filter(f => f.id !== car.id));
      setSnackbar({ open: true, message: 'Car removed from favorites!', severity: 'success' });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to remove favorite.');
    }
  }}
>
  <FaHeart size={16} />
</button>
                                    </div>
                                    <p className="card-text text-warning fw-bold">{car.price ? `${car.price.toLocaleString()} MAD` : 'Price not available'}</p>
                                    <div className="mt-2">
                                      <Link to={`/car/${car.id}`} className="btn btn-sm btn-warning me-2">View Details</Link>
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
              </div>

              <div ref={recommendationsRef}>
                {activeTab === 'recommendations' && (
                  <>
                    <h4 className="mb-4 fw-bold">Recommended For You</h4>
                    <div className="d-flex justify-content-between align-items-center mb-4">
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
                          <div key={car.car_id} className="col">
                            <div className="card border-0 shadow-sm">
                              <div className="row g-0">
                                <div className="col-md-3">
                                  <img src={car.image || 'https://via.placeholder.com/150'} className="img-fluid rounded-start h-100" alt={car.name} style={{ objectFit: 'cover' }} />
                                </div>
                                <div className="col-md-9">
                                  <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start">
                                      <div>
                                        <h5 className="card-title">{car.name}</h5>
                                        <p className="card-text text-warning fw-bold">{car.price ? `${car.price.toLocaleString()} MAD` : 'Price not available'}</p>
                                      </div>
                                      <span className="badge bg-success rounded-pill px-3 py-2">
                                        Match: {car.recommendation_score ? `${car.recommendation_score}%` : 'N/A'}
                                      </span>
                                    </div>
                                    <p className="card-text">
                                      <small className="text-muted">
                                        {car.recommendation_reason || 'Based on your preferences'}
                                      </small>
                                    </p>
                                    <div className="mt-3 d-flex">
                                      <Link to={`/car/${car.car_id}`} className="btn btn-sm btn-warning me-2">View Details</Link>
                                      <button
                                        className="btn btn-sm btn-outline-warning me-2"
                                        onClick={async () => {
                                          try {
                                            await axios.post('http://localhost:5000/api/users/favorites', {
                                              carId: car.car_id
                                            }, {
                                              headers: { Authorization: `Bearer ${user.token}` }
                                            });
                                            setFavorites([...favorites, car]);
                                            setSnackbar({
                                              open: true,
                                              message: 'Car added to favorites!',
                                              severity: 'success',
                                            });
                                          } catch (error) {
                                            console.error('Error adding favorite:', error);
                                            setError('Failed to add car to favorites.');
                                          }
                                        }}
                                      >
                                        <FaHeart className="me-1" /> Save
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={async () => {
                                          try {
                                            await axios.post('http://localhost:5000/api/users/recommendations/dismiss', {
                                              carId: car.car_id
                                            }, {
                                              headers: { Authorization: `Bearer ${user.token}` }
                                            });
                                            setRecommendations(recommendations.filter(r => r.car_id !== car.car_id));
                                            setSnackbar({
                                              open: true,
                                              message: 'Recommendation dismissed!',
                                              severity: 'success',
                                            });
                                          } catch (error) {
                                            console.error('Error dismissing recommendation:', error);
                                            setError('Failed to dismiss recommendation.');
                                          }
                                        }}
                                      >
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
                          onClick={() => handleTabChange('preferences', preferencesRef)}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{
            backgroundColor: snackbar.severity === 'success' ? '#ffca28' : '#d32f2f',
            color: snackbar.severity === 'success' ? '#000' : '#fff',
            '.MuiAlert-icon': {
              color: snackbar.severity === 'success' ? '#000' : '#fff',
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default UserProfilePage;