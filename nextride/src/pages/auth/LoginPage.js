// LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaCar } from 'react-icons/fa';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real application, this would be an API call to your backend
      setTimeout(() => {
        // Mock successful login
        const mockUser = {
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'test_user',
          email: formData.email,
        };
        
        // Store user in localStorage or context
        localStorage.setItem('carUser', JSON.stringify(mockUser));
        
        setLoading(false);
        navigate('/');
      }, 1000);
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div className="bg-warning p-3 rounded-circle d-inline-flex mb-3">
                  <FaCar className="text-white" size={30} />
                </div>
                <h2 className="fw-bold">Welcome Back</h2>
                <p className="text-muted">Sign in to access your account</p>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <FaUser className="text-muted" />
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="password" className="form-label">Password</label>
                    <Link to="/forgot-password" className="text-decoration-none small" style={{ color: "#BC7328" }}>
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <FaLock className="text-muted" />
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="d-grid mb-4">
                  <button
                    type="submit"
                    className="btn btn-warning btn-lg rounded-pill"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="mb-0">
                    Don't have an account? <Link to="/signup" className="text-decoration-none" style={{ color: "#BC7328" }}><strong>Sign Up</strong></Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;