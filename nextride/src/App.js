import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
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
import SearchPage from './pages/SearchPage'; // Import the new SearchPage
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";



function Navigation({ isAuthenticated, user, handleLogout }) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  
  // Navigation links configuration
  const navLinks = [
    { path: '/', icon: 'fas fa-home', label: 'Accueil' },
    { path: '/search', icon: 'fas fa-search', label: 'Rechercher' },
    { path: '/predict', icon: 'fas fa-chart-line', label: 'Prédiction' },
  ];
  
  // Add scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Get active link class - enhanced with hover effect
  const getNavLinkClass = (path) => {
    return `nav-link position-relative ${location.pathname === path ? 'active text-warning' : 'text-dark hover-warning'}`;
  };
  
  return (
    <nav className={`navbar navbar-expand-lg navbar-light bg-white ${scrolled ? 'shadow-md' : 'shadow-sm'} sticky-top transition-all duration-300`}>
      <div className="container">
        {/* Brand with icon */}
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <div className="bg-warning text-white rounded-circle p-2 me-2 d-flex align-items-center justify-content-center">
            <i className="fas fa-car"></i>
          </div>
          <span className="fw-bold fs-4">NextRide</span>
        </Link>
        
        {/* Toggle button for mobile */}
        <button 
          className="navbar-toggler border-0 focus:outline-none focus:shadow-none" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        {/* Navbar content */}
        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Main navigation links */}
          <ul className="navbar-nav me-auto">
            {navLinks.map((link) => (
              <li className="nav-item mx-1" key={link.path}>
                <Link className={getNavLinkClass(link.path)} to={link.path}>
                  <i className={`${link.icon} me-1`}></i> {link.label}
                  {location.pathname === link.path && (
                    <span className="position-absolute bottom-0 start-50 translate-middle-x bg-warning" 
                          style={{ height: '2px', width: '50%' }}></span>
                  )}
                </Link>
              </li>
            ))}
            {isAuthenticated && (
              <li className="nav-item mx-1">
                <Link className={getNavLinkClass('/profile')} to="/profile">
                  <i className="fas fa-user-circle me-1"></i> Mon Profil
                  {location.pathname === '/profile' && (
                    <span className="position-absolute bottom-0 start-50 translate-middle-x bg-warning" 
                          style={{ height: '2px', width: '50%' }}></span>
                  )}
                </Link>
              </li>
            )}
          </ul>
          
          {/* User authentication area */}
          <div className="d-flex">
            {isAuthenticated ? (
              <div className="dropdown">
                <button 
                  className="btn btn-light dropdown-toggle d-flex align-items-center shadow-sm hover:shadow transition-all duration-300" 
                  type="button" 
                  id="userDropdown" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  <div className="bg-warning rounded-circle p-2 d-flex align-items-center justify-content-center me-2">
                    <FaUser className="text-white" size={14} />
                  </div>
                  <span className="fw-medium">{user?.username || 'Utilisateur'}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2 animate__animated animate__fadeIn animate__faster" aria-labelledby="userDropdown">
                  <li className="px-3 py-2 text-muted small">
                    Connecté en tant que <strong>{user?.username || 'Utilisateur'}</strong>
                  </li>
                  <li>
                    <Link className="dropdown-item py-2 hover:bg-warning-light transition-colors duration-200" to="/profile">
                      <i className="fas fa-user-circle me-2 text-warning"></i> Mon Profil
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button 
                      className="dropdown-item py-2 text-danger d-flex align-items-center hover:bg-danger-light transition-colors duration-200" 
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt className="me-2" /> Se Déconnecter
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex">
                <Link to="/login" className="btn btn-outline-warning me-2 rounded-pill px-4 shadow-sm fw-medium hover:bg-warning-light hover:shadow transition-all duration-200">
                  Se Connecter
                </Link>
                <Link to="/signup" className="btn btn-warning text-white rounded-pill px-4 shadow-sm fw-medium hover:shadow transition-all duration-200">
                  S'Inscrire
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// AppContent component that uses location
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  
  // Check if current route is home page
  const isHomePage = location.pathname === '/';

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
    <div className="w-screen h-screen m-0 p-0">
      {/* Render Navigation only if we're not on the home page */}
      {!isHomePage && (
        <Navigation isAuthenticated={isAuthenticated} user={user} handleLogout={handleLogout} />
      )}

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
        <Route path="/search" element={<SearchPage />} />
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
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;