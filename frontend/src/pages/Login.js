import React, { useState } from 'react';
import usePageTitle from '../hooks/usePageTitle';
import { User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import bgImage from '../assets/INVENTRALOGIN.png';
import logoImage from '../assets/logo.png'; 

const Login = ({ onLogin }) => {
  usePageTitle('Login');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('authToken', data.data.token);
        localStorage.setItem('userInfo', JSON.stringify(data.data.user));
        onLogin();
      } else {
        setError(data.message || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="login-container" 
      style={{ 
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative' /* ✨ Added so the footer can anchor to the bottom ✨ */
      }}
    >
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <img 
            src={logoImage} 
            alt="Mitracorp Logo" 
            style={{ maxWidth: '180px', height: 'auto' }} 
          />
        </div>

        <h2 className="login-title">Inventory Management System</h2>
        
        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#c33',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <User size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Username
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>
              <Lock size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                placeholder="Enter your password"
                required
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#666'
                }}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>

      {/* ✨ NEW: Mitracorp Disclaimer Footer ✨ */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        width: '100%',
        textAlign: 'center',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: '500',
        letterSpacing: '0.5px',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)' /* Keeps it readable over light areas */
      }}>
        System developed by Mitracorp Resources Sdn. Bhd.
      </div>

    </div>
  );
};

export default Login;