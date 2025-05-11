import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import '../css/WelcomePage.css';

const WelcomePage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get current user (will return null if not authenticated)
        const userData = await authService.getCurrentUser();
        
        if (userData && userData.user) {
          print("User is already authenticated"); 
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // If error, assume not authenticated
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleGuestLogin = () => {
    // Set user as guest in local storage
    localStorage.setItem('userType', 'guest');
    
    // Generate guest ID if not already present
    if (!localStorage.getItem('guestId')) {
      const guestId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('guestId', guestId);
    }
    
    navigate('/customize-bot');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="welcome-container">
        <div className="welcome-card">
          <p className="loading-message">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-container">
      <div className="welcome-card">
        <div className="logo-container">
          <img src="/src/assets/logo.png" alt="ChatBot Logo" className="logo" />
        </div>
        
        <h1 className="welcome-title">Welcome to ChatBot!</h1>
        
        <p className="welcome-message">
          Your intelligent conversation partner. Get started by choosing how you'd like to proceed.
        </p>
        
        <div className="button-container">
          <button 
            className="btn login-btn" 
            onClick={handleLoginClick}
          >
            Login / Register
          </button>
          
          <button 
            className="btn guest-btn" 
            onClick={handleGuestLogin}
          >
            Continue as Guest
          </button>
        </div>
        
        <div className="feature-list">
          <h3>Account Benefits:</h3>
          <ul>
            <li>Save your chat history securely in our database</li>
            <li>Access your conversations from any device</li>
            <li>Customize and save your bot preferences</li>
            <li>Create multiple chat sessions</li>
          </ul>
        </div>
        
        <p className="feature-note">
          *Creating an account unlocks additional features and saves your preferences.
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;