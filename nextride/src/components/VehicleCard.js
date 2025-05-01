import React from 'react';
import { Link } from 'react-router-dom';
import { FiShare2 } from 'react-icons/fi';
import { FaRegHeart, FaHeart } from 'react-icons/fa';
import { MdOutlineArrowOutward } from 'react-icons/md';
import carimage from '../assets/images/carannonceimage.png';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const VehicleCard = ({ vehicle, isSaved, onSaveToggle }) => {
  const { user } = useAuth();

  const handleViewDetails = async () => {
    if (user) {
      try {
        await axios.post(
          'http://localhost:5000/api/cars/view',
          {
            userId: user.userId,
            carId: vehicle.id,
            viewSource: 'vehicle_section',
          },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } catch (error) {
        console.error('Error recording car view:', error);
      }
    }
  };

  return (
    <div className="col">
      <div className="card h-100 rounded-4 border-0 position-relative" style={{ boxShadow: '0px 5px 4px 0px #57575787' }}>
        {vehicle.isNew && (
          <span
            className="position-absolute top-1 start-0 text-white px-2 py-1 m-2 rounded-pill"
            style={{ backgroundColor: '#367209', fontWeight: '600', fontSize: '12px' }}
          >
            New
          </span>
        )}

        {/* Vehicle Image */}
        <img src={carimage} className="card-img-top p-3" alt={vehicle.name} />

        <hr className="m-0 mt-3" />

        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5 className="card-title fw-bold mb-1">{vehicle.name}</h5>
              <p className="card-text text-muted small mb-0">{vehicle.specs}</p>
            </div>
            <div className="d-flex">
              <button
                className="btn btn-light btn-sm p-1"
                onClick={() => onSaveToggle(vehicle.id, !isSaved)}
              >
                {isSaved ? (
                  <FaHeart className="text-danger" />
                ) : (
                  <FaRegHeart className="text-muted" />
                )}
              </button>
              <button className="btn btn-light btn-sm p-1 ms-1">
                <FiShare2 className="text-muted" />
              </button>
            </div>
          </div>
          <hr className="my-2" />
          <div className="d-flex justify-content-between">
            <span className="fw-bold">{vehicle.price}</span>
            <Link
              to={`/car/${vehicle.id}`}
              className="text-decoration-none small d-flex align-items-center mt-2"
              style={{ color: '#BC7328' }}
              onClick={handleViewDetails}
            >
              View Details
              <MdOutlineArrowOutward />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;