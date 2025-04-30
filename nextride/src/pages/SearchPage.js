import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaRegHeart, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import { FiShare2 } from 'react-icons/fi';
import { MdOutlineArrowOutward } from 'react-icons/md';
import { CiSearch } from 'react-icons/ci';
import carDefaultImage from '../assets/images/carannonceimage.png'; // Use the same image for placeholder

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filteredCars, setFilteredCars] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    fuelType: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    transmission: ''
  });
  
  // Sort state
  const [sortOption, setSortOption] = useState('relevance');

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    // Simulate fetching data
    setTimeout(() => {
      // This would be your API call using the search term
      // For example: fetch(`/api/cars?search=${searchParams.get('q')}`)
      const mockCars = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          brand: 'Peugeot',
          model: '208',
          title: 'Peugeot 208 1.2 PureTech Allure Euro 6 (s/s) 5dr',
          price: 180000,
          year: 2022,
          mileage: 15000,
          fuel_type: 'Gasoline',
          transmission: 'Manual',
          condition: 'Used',
          seller_city: 'Casablanca',
          image_folder: '/path-to-image'
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          brand: 'Renault',
          model: 'Clio',
          title: 'Renault Clio 1.5 dCi Dynamique 5dr',
          price: 150000,
          year: 2021,
          mileage: 25000,
          fuel_type: 'Diesel',
          transmission: 'Manual',
          condition: 'Used',
          seller_city: 'Rabat',
          image_folder: '/path-to-image'
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          brand: 'Dacia',
          model: 'Duster',
          title: 'Dacia Duster 1.5 dCi Comfort 4x4',
          price: 200000,
          year: 2023,
          mileage: 5000,
          fuel_type: 'Diesel',
          transmission: 'Manual',
          condition: 'New',
          seller_city: 'Marrakech',
          image_folder: '/path-to-image'
        },
        {
          id: '423e4567-e89b-12d3-a456-426614174003',
          brand: 'Volkswagen',
          model: 'Golf',
          title: 'Volkswagen Golf 1.4 TSI Highline DSG',
          price: 220000,
          year: 2021,
          mileage: 18000,
          fuel_type: 'Gasoline',
          transmission: 'Automatic',
          condition: 'Used',
          seller_city: 'Tangier',
          image_folder: '/path-to-image'
        }
      ];
      
      setCars(mockCars);
      setFilteredCars(mockCars);
      setLoading(false);
    }, 1000);
  }, [searchParams]);

  // Apply filters and sorting
  useEffect(() => {
    if (cars.length > 0) {
      let results = [...cars];
      
      // Apply search term filter
      if (searchTerm) {
        results = results.filter(car => 
          car.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          car.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply other filters
      if (filters.brand) {
        results = results.filter(car => car.brand.toLowerCase() === filters.brand.toLowerCase());
      }
      
      if (filters.model) {
        results = results.filter(car => car.model.toLowerCase().includes(filters.model.toLowerCase()));
      }
      
      if (filters.fuelType) {
        results = results.filter(car => car.fuel_type.toLowerCase() === filters.fuelType.toLowerCase());
      }
      
      if (filters.condition) {
        results = results.filter(car => car.condition.toLowerCase() === filters.condition.toLowerCase());
      }
      
      if (filters.transmission) {
        results = results.filter(car => car.transmission.toLowerCase() === filters.transmission.toLowerCase());
      }
      
      if (filters.minPrice) {
        results = results.filter(car => car.price >= parseInt(filters.minPrice));
      }
      
      if (filters.maxPrice) {
        results = results.filter(car => car.price <= parseInt(filters.maxPrice));
      }
      
      if (filters.minYear) {
        results = results.filter(car => car.year >= parseInt(filters.minYear));
      }
      
      if (filters.maxYear) {
        results = results.filter(car => car.year <= parseInt(filters.maxYear));
      }
      
      // Apply sorting
      switch (sortOption) {
        case 'price-asc':
          results.sort((a, b) => a.price - b.price);
          break;
        case 'price-desc':
          results.sort((a, b) => b.price - a.price);
          break;
        case 'year-desc':
          results.sort((a, b) => b.year - a.year);
          break;
        case 'year-asc':
          results.sort((a, b) => a.year - b.year);
          break;
        default:
          // Default sorting by relevance (keep original order)
          break;
      }
      
      setFilteredCars(results);
    }
  }, [cars, searchTerm, filters, sortOption]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Update URL search params
    setSearchParams({ q: searchTerm });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      brand: '',
      model: '',
      fuelType: '',
      condition: '',
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      transmission: ''
    });
  };

  // Get unique values for filters
  const getBrands = () => {
    return [...new Set(cars.map(car => car.brand))];
  };
  
  const getFuelTypes = () => {
    return [...new Set(cars.map(car => car.fuel_type))];
  };
  
  const getConditions = () => {
    return [...new Set(cars.map(car => car.condition))];
  };
  
  const getTransmissions = () => {
    return [...new Set(cars.map(car => car.transmission))];
  };

  return (
    <div className="container py-5">
      {/* Search bar */}
      <div className="mb-4">
        <form onSubmit={handleSearch} className="d-flex position-relative">
          <div className="input-group">
            <input
              type="text"
              className="form-control form-control-lg rounded-pill ps-4"
              placeholder="Search for cars by brand, model or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search cars"
            />
            <button className="btn btn-warning rounded-pill position-absolute end-0" 
                    style={{ zIndex: 5 }} type="submit">
              <CiSearch size={24} />
            </button>
          </div>
        </form>
      </div>

      {/* Filter and sort controls */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button 
            className="btn btn-outline-secondary rounded-pill d-flex align-items-center"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter className="me-2" /> Filters
          </button>
        </div>
        
        <div className="d-flex align-items-center">
          <span className="me-2">Sort by:</span>
          <select 
            className="form-select form-select-sm rounded-pill" 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="year-desc">Year: Newest First</option>
            <option value="year-asc">Year: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card mb-4 shadow-sm rounded-3">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-3">
              <h5 className="card-title">Filter Results</h5>
              <button className="btn btn-sm btn-link" onClick={resetFilters}>Reset All</button>
            </div>
            
            <div className="row">
              {/* Brand filter */}
              <div className="col-md-3 mb-3">
                <label className="form-label">Brand</label>
                <select 
                  className="form-select rounded-3" 
                  name="brand"
                  value={filters.brand}
                  onChange={handleFilterChange}
                >
                  <option value="">All Brands</option>
                  {getBrands().map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              
              {/* Model filter - as text input */}
              <div className="col-md-3 mb-3">
                <label className="form-label">Model</label>
                <input 
                  type="text" 
                  className="form-control rounded-3"
                  placeholder="Model" 
                  name="model"
                  value={filters.model}
                  onChange={handleFilterChange}
                />
              </div>
              
              {/* Fuel type filter */}
              <div className="col-md-3 mb-3">
                <label className="form-label">Fuel Type</label>
                <select 
                  className="form-select rounded-3" 
                  name="fuelType"
                  value={filters.fuelType}
                  onChange={handleFilterChange}
                >
                  <option value="">All Fuel Types</option>
                  {getFuelTypes().map(fuel => (
                    <option key={fuel} value={fuel}>{fuel}</option>
                  ))}
                </select>
              </div>
              
              {/* Condition filter */}
              <div className="col-md-3 mb-3">
                <label className="form-label">Condition</label>
                <select 
                  className="form-select rounded-3" 
                  name="condition"
                  value={filters.condition}
                  onChange={handleFilterChange}
                >
                  <option value="">All Conditions</option>
                  {getConditions().map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
              
              {/* Price range */}
              <div className="col-md-3 mb-3">
                <label className="form-label">Min Price (MAD)</label>
                <input 
                  type="number" 
                  className="form-control rounded-3"
                  placeholder="Min Price" 
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  min="0"
                />
              </div>
              
              <div className="col-md-3 mb-3">
                <label className="form-label">Max Price (MAD)</label>
                <input 
                  type="number" 
                  className="form-control rounded-3"
                  placeholder="Max Price" 
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  min="0"
                />
              </div>
              
              {/* Year range */}
              <div className="col-md-3 mb-3">
                <label className="form-label">Min Year</label>
                <input 
                  type="number" 
                  className="form-control rounded-3"
                  placeholder="Min Year" 
                  name="minYear"
                  value={filters.minYear}
                  onChange={handleFilterChange}
                  min="1900"
                  max="2025"
                />
              </div>
              
              <div className="col-md-3 mb-3">
                <label className="form-label">Max Year</label>
                <input 
                  type="number" 
                  className="form-control rounded-3"
                  placeholder="Max Year" 
                  name="maxYear"
                  value={filters.maxYear}
                  onChange={handleFilterChange}
                  min="1900"
                  max="2025"
                />
              </div>
              
              {/* Transmission filter */}
              <div className="col-md-3 mb-3">
                <label className="form-label">Transmission</label>
                <select 
                  className="form-select rounded-3" 
                  name="transmission"
                  value={filters.transmission}
                  onChange={handleFilterChange}
                >
                  <option value="">All Transmissions</option>
                  {getTransmissions().map(transmission => (
                    <option key={transmission} value={transmission}>{transmission}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search results */}
      <div className="mb-4">
        <h2 className="fw-bold">
          {loading ? 'Searching...' : `${filteredCars.length} cars found`}
          {searchTerm ? ` for "${searchTerm}"` : ''}
        </h2>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center my-5">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading cars...</p>
        </div>
      )}

      {/* No results */}
      {!loading && filteredCars.length === 0 && (
        <div className="text-center my-5">
          <div className="mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 15L21 21" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17Z" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h4>No cars found matching your criteria</h4>
          <p className="text-muted">Try adjusting your search or filter options</p>
          <button className="btn btn-outline-warning mt-3" onClick={resetFilters}>
            Clear all filters
          </button>
        </div>
      )}

      {/* Vehicle Cards Grid */}
      {!loading && filteredCars.length > 0 && (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
          {filteredCars.map((car) => (
            <div key={car.id} className="col">
              <div className="card h-100 rounded-4 border-0 position-relative" style={{boxShadow: '0px 5px 4px 0px #57575787'}}>
                {car.condition === 'New' && (
                  <span className="position-absolute top-1 start-0 text-white px-2 py-1 m-2 rounded-pill" 
                        style={{backgroundColor: '#367209', fontWeight: '600', fontSize: '12px'}}>
                    New
                  </span>
                )}
                
                {/* Vehicle Image */}
                <img 
                  src={carDefaultImage} // Replace with actual image path when available
                  className="card-img-top p-3" 
                  alt={`${car.brand} ${car.model}`} 
                />

                <hr className="m-0 mt-3" />
                
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="card-title fw-bold mb-1">{car.brand} {car.model}</h5>
                      <p className="card-text text-muted small mb-0">{car.title}</p>
                      <div className="mt-2">
                        <span className="badge bg-light text-dark me-2">{car.year}</span>
                        <span className="badge bg-light text-dark me-2">{car.fuel_type}</span>
                        <span className="badge bg-light text-dark">{car.transmission}</span>
                      </div>
                      <p className="text-muted small mt-2">
                        <i className="bi bi-geo-alt me-1"></i>
                        {car.seller_city}
                      </p>
                    </div>
                    <div className="d-flex">
                      <button className="btn btn-light btn-sm p-1">
                        <FaRegHeart className="text-muted" />
                      </button>
                      <button className="btn btn-light btn-sm p-1 ms-1">
                        <FiShare2 className="text-muted" />
                      </button>
                    </div>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold">{car.price.toLocaleString()} MAD</span>
                    <Link to={`/car/${car.id}`} className="text-decoration-none small d-flex align-items-center mt-2" style={{color: "#BC7328"}}>
                      View Details
                      <MdOutlineArrowOutward />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchPage;