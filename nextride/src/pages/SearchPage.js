import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FaRegHeart, FaFilter, FaSortAmountDown } from 'react-icons/fa';
import { FiShare2 } from 'react-icons/fi';
import { MdOutlineArrowOutward } from 'react-icons/md';
import { CiSearch } from 'react-icons/ci';
import axios from 'axios';
import carDefaultImage from '../assets/images/carannonceimage.png';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filteredCars, setFilteredCars] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCars, setTotalCars] = useState(0);
  const limit = 10;

  // Updated filters state to include sellerCity and sector
  const [filters, setFilters] = useState({
    brand: '',
    model: '',
    fuelType: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    transmission: '',
    doorCount: '',
    sellerCity: '',
    sector: '',
  });

  const [sortOption, setSortOption] = useState('relevance');

  const fetchCars = async (currentPage = 1) => {
    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('carUser'));
      const userId = user?.id || null;

      const requestBody = {
        userId: userId,
        brand: filters.brand || undefined,
        model: searchTerm || filters.model || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        minYear: filters.minYear || undefined,
        maxYear: filters.maxYear || undefined,
        fuelType: filters.fuelType || undefined,
        transmission: filters.transmission || undefined,
        doorCount: filters.doorCount || undefined,
        sellerCity: filters.sellerCity || undefined,
        sector: filters.sector || undefined,
        page: currentPage,
        limit: limit,
      };

      const response = await axios.post('http://localhost:5000/api/search', requestBody);

      let fetchedCars = response.data.cars || [];

      switch (sortOption) {
        case 'price-asc':
          fetchedCars.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        case 'price-desc':
          fetchedCars.sort((a, b) => (b.price || 0) - (a.price || 0));
          break;
        case 'year-desc':
          fetchedCars.sort((a, b) => (b.year || 0) - (a.year || 0));
          break;
        case 'year-asc':
          fetchedCars.sort((a, b) => (a.year || 0) - (b.year || 0));
          break;
        default:
          break;
      }

      setCars(fetchedCars);
      setFilteredCars(fetchedCars);
      setTotalCars(response.data.total || 0);
      setPage(response.data.page || 1);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching cars. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, [searchParams, filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: searchTerm });
    setPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPage(1);
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
      transmission: '',
      doorCount: '',
      sellerCity: '',
      sector: '',
    });
    setSearchTerm('');
    setSearchParams({});
    setPage(1);
  };

  const getBrands = () => {
    return [...new Set(cars.map((car) => car.brand))];
  };

  const getFuelTypes = () => {
    return [...new Set(cars.map((car) => car.fuel_type))];
  };

  const getConditions = () => {
    return [...new Set(cars.map((car) => car.condition))];
  };

  const getTransmissions = () => {
    return [...new Set(cars.map((car) => car.transmission))];
  };

  const getDoorCounts = () => {
    return [...new Set(cars.map((car) => car.door_count))].filter((count) => count !== null);
  };

  const getCities = () => {
    return [...new Set(cars.map((car) => car.seller_city))];
  };

  const getSectors = () => {
    return [...new Set(cars.map((car) => car.sector))].filter((sector) => sector !== null);
  };

  const totalPages = Math.ceil(totalCars / limit);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchCars(newPage);
    }
  };

  return (
    <div className="container py-5">
      <div className="mb-4">
        <form onSubmit={handleSearch} className="d-flex position-relative">
          <div className="input-group">
            <input
              type="text"
              className="form-control form-control-lg rounded-pill ps-4"
              placeholder="Search for cars by brand, model, title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search cars"
            />
            <button
              className="btn btn-warning rounded-pill position-absolute end-0"
              style={{ zIndex: 5 }}
              type="submit"
            >
              <CiSearch size={24} />
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

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

      {showFilters && (
        <div className="card mb-4 shadow-sm rounded-3">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-3">
              <h5 className="card-title">Filter Results</h5>
              <button className="btn btn-sm btn-link" onClick={resetFilters}>
                Reset All
              </button>
            </div>

            <div className="row">
              <div className="col-md-3 mb-3">
                <label className="form-label">Brand</label>
                <select
                  className="form-select rounded-3"
                  name="brand"
                  value={filters.brand}
                  onChange={handleFilterChange}
                >
                  <option value="">All Brands</option>
                  {getBrands().map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="col-md-3 mb-3">
                <label className="form-label">Fuel Type</label>
                <select
                  className="form-select rounded-3"
                  name="fuelType"
                  value={filters.fuelType}
                  onChange={handleFilterChange}
                >
                  <option value="">All Fuel Types</option>
                  {getFuelTypes().map((fuel) => (
                    <option key={fuel} value={fuel}>
                      {fuel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label">Condition</label>
                <select
                  className="form-select rounded-3"
                  name="condition"
                  value={filters.condition}
                  onChange={handleFilterChange}
                >
                  <option value="">All Conditions</option>
                  {getConditions().map((condition) => (
                    <option key={condition} value={condition}>
                      {condition}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="col-md-3 mb-3">
                <label className="form-label">Transmission</label>
                <select
                  className="form-select rounded-3"
                  name="transmission"
                  value={filters.transmission}
                  onChange={handleFilterChange}
                >
                  <option value="">All Transmissions</option>
                  {getTransmissions().map((transmission) => (
                    <option key={transmission} value={transmission}>
                      {transmission}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label">Door Count</label>
                <select
                  className="form-select rounded-3"
                  name="doorCount"
                  value={filters.doorCount}
                  onChange={handleFilterChange}
                >
                  <option value="">All Door Counts</option>
                  {getDoorCounts().map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label">City</label>
                <select
                  className="form-select rounded-3"
                  name="sellerCity"
                  value={filters.sellerCity}
                  onChange={handleFilterChange}
                >
                  <option value="">All Cities</option>
                  {getCities().map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3 mb-3">
                <label className="form-label">Sector</label>
                <select
                  className="form-select rounded-3"
                  name="sector"
                  value={filters.sector}
                  onChange={handleFilterChange}
                >
                  <option value="">All Sectors</option>
                  {getSectors().map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <h2 className="fw-bold">
          {loading ? 'Searching...' : `${totalCars} cars found`}
          {searchTerm ? ` for "${searchTerm}"` : ''}
        </h2>
      </div>

      {loading && (
        <div className="text-center my-5">
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading cars...</p>
        </div>
      )}

      {!loading && filteredCars.length === 0 && (
        <div className="text-center my-5">
          <div className="mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 15L21 21" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17Z"
                stroke="#6c757d"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h4>No cars found matching your criteria</h4>
          <p className="text-muted">Try adjusting your search or filter options</p>
          <button className="btn btn-outline-warning mt-3" onClick={resetFilters}>
            Clear all filters
          </button>
        </div>
      )}

      {!loading && filteredCars.length > 0 && (
        <>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
            {filteredCars.map((car) => (
              <div key={car.id} className="col">
                <div
                  className="card h-100 rounded-4 border-0 position-relative"
                  style={{ boxShadow: '0px 5px 4px 0px #57575787' }}
                >
                  {car.condition === 'New' && (
                    <span
                      className="position-absolute top-1 start-0 text-white px-2 py-1 m-2 rounded-pill"
                      style={{ backgroundColor: '#367209', fontWeight: '600', fontSize: '12px' }}
                    >
                      New
                    </span>
                  )}

                  <img
                    src={car.image_folder ? `/path-to-image/${car.image_folder}` : carDefaultImage}
                    className="card-img-top p-3"
                    alt={`${car.brand} ${car.model}`}
                  />

                  <hr className="m-0 mt-3" />

                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h5 className="card-title fw-bold mb-1">
                          {car.brand} {car.model}
                        </h5>
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
                      <span className="fw-bold">
                        {car.price != null ? `${car.price.toLocaleString()} MAD` : 'Price not available'}
                      </span>
                      <Link
                        to={`/car/${car.id}`}
                        className="text-decoration-none small d-flex align-items-center mt-2"
                        style={{ color: '#BC7328' }}
                      >
                        View Details
                        <MdOutlineArrowOutward />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="mt-5 d-flex justify-content-center">
              <ul className="pagination">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(page - 1)}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, index) => (
                  <li
                    key={index + 1}
                    className={`page-item ${page === index + 1 ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default SearchPage;