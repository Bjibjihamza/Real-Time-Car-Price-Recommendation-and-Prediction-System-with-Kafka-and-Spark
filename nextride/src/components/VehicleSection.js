import React, { useState, useEffect } from 'react';
import { FaCircleArrowDown } from 'react-icons/fa6';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import VehicleCard from './VehicleCard';

function VehicleSection() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [vehicles, setVehicles] = useState([]);
  const [recommendedVehicles, setRecommendedVehicles] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const limit = 8;

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const fetchData = async () => {
    try {
      const config = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

      const allCarsResponse = await axios.get(`http://localhost:5000/api/cars?page=${page}&limit=${limit}`, config);
      setVehicles(allCarsResponse.data.cars || []);
      setTotalPages(Math.ceil(allCarsResponse.data.total / limit) || 1);

      if (user) {
        const recommendedResponse = await axios.get('http://localhost:5000/api/users/recommendations', config);
        setRecommendedVehicles(recommendedResponse.data.cars || []);

        const favoritesResponse = await axios.get('http://localhost:5000/api/users/favorites', config);
        setFavorites(favoritesResponse.data.cars || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load vehicles. Please try again later.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, page]);

  const handleSaveToggle = async (vehicleId, shouldSave) => {
    if (!user) {
      setError('Please log in to save vehicles.');
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      if (shouldSave) {
        await axios.post('http://localhost:5000/api/users/favorites', { carId: vehicleId }, config);
        const vehicleToAdd = vehicles.find(v => v.id === vehicleId) || 
                            recommendedVehicles.find(v => v.id === vehicleId);
        if (vehicleToAdd) {
          setFavorites([...favorites, vehicleToAdd]);
        }
      } else {
        await axios.delete('http://localhost:5000/api/users/favorites', {
          headers: { Authorization: `Bearer ${user.token}` },
          data: { carId: vehicleId }
        });
        setFavorites(favorites.filter(f => f.id !== vehicleId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorites. Please try again.');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  const displayedVehicles = activeTab === 'all' ? vehicles :
                          activeTab === 'recommended' ? recommendedVehicles :
                          vehicles;

  return (
    <section className="container py-5">
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="mb-4">
        <h1 className="fw-bold mb-4">Explore All Vehicles</h1>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <button
            className={`btn rounded-pill px-4 py-2 ${activeTab === 'all' ? 'btn-warning' : 'btn-light'}`}
            onClick={() => handleTabClick('all')}
          >
            All
          </button>
          <button
            className={`btn rounded-pill px-4 py-2 ${activeTab === 'recommended' ? 'btn-warning' : 'btn-light'}`}
            onClick={() => handleTabClick('recommended')}
            disabled={!user}
          >
            Recommended for you
          </button>
          <button className="btn btn-light rounded-pill px-4 py-2">...</button>
        </div>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
        {displayedVehicles.length > 0 ? (
          displayedVehicles.map((vehicle) => {
            const parsedDate = parseDate(vehicle.publication_date);
            const isNew = parsedDate 
              ? (new Date() - parsedDate) < 7 * 24 * 60 * 60 * 1000 
              : false;

            return (
              <VehicleCard
                key={vehicle.id}
                vehicle={{
                  id: vehicle.id,
                  name: vehicle.title || `${vehicle.brand} ${vehicle.model}`,
                  specs: `${vehicle.fuel_type || ''} ${vehicle.transmission || ''}`.trim(),
                  price: vehicle.price ? `${vehicle.price.toLocaleString()} MAD` : 'Price on request',
                  isNew: isNew,
                }}
                isSaved={favorites.some(f => f.id === vehicle.id)}
                onSaveToggle={handleSaveToggle}
              />
            );
          })
        ) : (
          <div className="col-12 text-center py-5">
            <h5>No vehicles found</h5>
            <p className="text-muted">Try adjusting your preferences or check back later.</p>
          </div>
        )}
      </div>

      {activeTab === 'all' && totalPages > 1 && (
        <div className="d-flex justify-content-center mt-5">
          <nav aria-label="Page navigation">
            <ul className="pagination">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(page - 1)}>
                  Previous
                </button>
              </li>
              {[...Array(totalPages)].map((_, index) => (
                <li key={index + 1} className={`page-item ${page === index + 1 ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(index + 1)}>
                    {index + 1}
                  </button>
                </li>
              ))}
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => handlePageChange(page + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', width: '100%', paddingTop: '50px' }}>
        <FaCircleArrowDown
          style={{ margin: 'auto', fontSize: '60px', color: '#ffc107', marginBottom: '30px' }}
        />
      </div>
    </section>
  );
}

export default VehicleSection;