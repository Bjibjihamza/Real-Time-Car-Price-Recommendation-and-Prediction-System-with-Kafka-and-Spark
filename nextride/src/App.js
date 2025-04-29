import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Hero from './components/Hero';
import Explore from './components/Explore';
import VehicleSection from './components/VehicleSection';
import CompareSection from './components/CompareSection';
import PromoSection from './components/PromoSection';
import ReviewsSection from './components/ReviewsSection';
import Footer from './components/Footer';
import PredictionPage from './pages/PredictionPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import UserProfilePage from './pages/auth/UserProfilePage';
import CarDetailsPage from './pages/CarDetailsPage';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('carUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('carUser');
    localStorage.removeItem('carUserPreferences');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    return children;
  };

  return (
    <Router>
      <div className="w-screen h-screen m-0 p-0">
        <nav className="navbar navbar-expand-lg navbar-light bg-light sticky-top">
          <div className="container">
            <Link className="navbar-brand fw-bold" to="/">
              CarPriceML
            </Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <Link className="nav-link" to="/">Home</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/predict">Price Prediction</Link>
                </li>
                {isAuthenticated && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/profile">My Profile</Link>
                  </li>
                )}
              </ul>
              <div className="d-flex">
                {isAuthenticated ? (
                  <div className="dropdown">
                    <button 
                      className="btn btn-light dropdown-toggle d-flex align-items-center" 
                      type="button" 
                      id="userDropdown" 
                      data-bs-toggle="dropdown" 
                      aria-expanded="false"
                    >
                      <span className="bg-warning p-1 rounded-circle d-inline-flex me-2">
                        <FaUser className="text-white" size={14} />
                      </span>
                      {user?.username}
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                      <li>
                        <Link className="dropdown-item" to="/profile">My Profile</Link>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <button className="dropdown-item text-danger d-flex align-items-center" onClick={handleLogout}>
                          <FaSignOutAlt className="me-2" /> Sign Out
                        </button>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div className="d-flex">
                    <Link to="/login" className="btn btn-outline-warning me-2 rounded-pill px-3">Sign In</Link>
                    <Link to="/signup" className="btn btn-warning rounded-pill px-3">Sign Up</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
            <>
              <Hero />
              <Explore />
              <VehicleSection />
              <CompareSection />
              <PromoSection />
              <ReviewsSection />
            </>
          } />
          <Route path="/predict" element={<PredictionPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/car/:carId" element={<CarDetailsPage />} />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfilePage />
            </ProtectedRoute>
          } />
        </Routes>
        
        <Footer />
      </div>
    </Router>
  );
}

export default App;