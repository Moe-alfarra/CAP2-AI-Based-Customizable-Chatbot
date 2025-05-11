import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [botCustomization, setBotCustomization] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [passwordFormVisible, setPasswordFormVisible] = useState(false);
  const [updateMessage, setUpdateMessage] = useState({ type: '', message: '' });

  useEffect(() => {
    // Check authentication status
    const authToken = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    if (authToken && userType === 'authenticated') {
      setIsAuthenticated(true);
      fetchUserData(authToken);
      fetchBotCustomization(authToken);
    } else {
      // Redirect non-authenticated users
      navigate('/login');
    }
    
    setIsLoading(false);
  }, [navigate]);

  const fetchUserData = async (authToken) => {
    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const userData = await response.json();
      setUser(userData.user);
      
      // Initialize form with user data
      setFormData({
        ...formData,
        name: userData.user.name,
        email: userData.user.email
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchBotCustomization = async (authToken) => {
    try {
      const response = await fetch('/api/bot-customization', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bot customization');
      }
      
      const data = await response.json();
      if (data.customization) {
        setBotCustomization(data.customization);
        localStorage.setItem('botCustomization', JSON.stringify(data.customization));
      }
    } catch (error) {
      console.error('Error fetching bot customization:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear any existing update messages
    setUpdateMessage({ type: '', message: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const authToken = localStorage.getItem('authToken');
    
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const data = await response.json();
      
      setUpdateMessage({
        type: 'success',
        message: 'Profile updated successfully!'
      });
      
      // Update user state with new data
      setUser(data.user);
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        message: error.message || 'Failed to update profile. Please try again.'
      });
      console.error('Error updating profile:', error);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const authToken = localStorage.getItem('authToken');
    
    // Password validation
    if (formData.newPassword !== formData.confirmNewPassword) {
      setUpdateMessage({
        type: 'error',
        message: 'New passwords do not match.'
      });
      return;
    }
    
    if (formData.newPassword.length < 8) {
      setUpdateMessage({
        type: 'error',
        message: 'Password must be at least 8 characters long.'
      });
      return;
    }
    
    try {
      const response = await fetch('/api/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update password');
      }
      
      setUpdateMessage({
        type: 'success',
        message: 'Password updated successfully!'
      });
      
      // Reset password fields
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      
      // Hide password form
      setPasswordFormVisible(false);
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        message: error.message || 'Failed to update password. Please check your current password and try again.'
      });
      console.error('Error updating password:', error);
    }
  };

  const handleLogout = () => {
    // Clear auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.setItem('userType', 'guest');
    
    // Redirect to welcome page
    navigate('/');
  };

  const saveBotCustomization = async () => {
    const authToken = localStorage.getItem('authToken');
    
    try {
      const response = await fetch('/api/bot-customization', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(botCustomization)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bot customization');
      }
      
      setUpdateMessage({
        type: 'success',
        message: 'Bot customization updated successfully!'
      });
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        message: error.message || 'Failed to update bot customization. Please try again.'
      });
      console.error('Error updating bot customization:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-wrapper">
        <div className="settings-sidebar">
          <h2 className="settings-title">Settings</h2>
          
          <ul className="settings-tabs">
            <li 
              className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              <span className="tab-icon">👤</span> Profile
            </li>
            
            <li 
              className={`settings-tab ${activeTab === 'bot' ? 'active' : ''}`}
              onClick={() => handleTabChange('bot')}
            >
              <span className="tab-icon">🤖</span> Bot Customization
            </li>
            
            <li 
              className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => handleTabChange('account')}
            >
              <span className="tab-icon">🔒</span> Account
            </li>
          </ul>
          
          <button className="logout-button" onClick={handleLogout}>
            <span className="tab-icon">🚪</span> Logout
          </button>
        </div>
        
        <div className="settings-content">
          {updateMessage.message && (
            <div className={`settings-message ${updateMessage.type}`}>
              {updateMessage.type === 'success' ? <span>✅</span> : <span>❌</span>}
              {updateMessage.message}
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="tab-content">
              <h2 className="tab-title">Profile Settings</h2>
              
              <form onSubmit={handleProfileSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your full name"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Your email address"
                  />
                </div>
                
                <button type="submit" className="settings-button">
                  💾 Save Changes
                </button>
              </form>
            </div>
          )}
          
          {activeTab === 'account' && (
            <div className="tab-content">
              <h2 className="tab-title">Account Settings</h2>
              
              <div className="password-section">
                <h3>Password Management</h3>
                {!passwordFormVisible ? (
                  <button
                    className="settings-button secondary"
                    onClick={() => setPasswordFormVisible(true)}
                  >
                    ✏️ Change Password
                  </button>
                ) : (
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                      <label htmlFor="currentPassword">Current Password</label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="newPassword">New Password</label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="confirmNewPassword">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirmNewPassword"
                        name="confirmNewPassword"
                        value={formData.confirmNewPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    
                    <div className="button-group">
                      <button type="submit" className="settings-button">
                        💾 Update Password
                      </button>
                      <button
                        type="button"
                        className="settings-button secondary"
                        onClick={() => {
                          setPasswordFormVisible(false);
                          setFormData({
                            ...formData,
                            currentPassword: '',
                            newPassword: '',
                            confirmNewPassword: ''
                          });
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
              
              <div className="danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <p>Once you delete your account, there is no going back. Please be certain.</p>
                <button className="settings-button danger">
                  Delete Account
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'bot' && botCustomization && (
            <div className="tab-content">
              <h2 className="tab-title">Bot Customization</h2>
              
              <div className="current-customization">
                <h3>Current Settings</h3>
                <p>Bot Name: <strong>{botCustomization.name}</strong></p>
                <div className="character-preview">
                  <div>
                    <p>Character:</p>
                    <img 
                      src={botCustomization.characterSrc} 
                      alt="Bot character" 
                      className="character-image"
                    />
                  </div>
                  <div>
                    <p>This is how your bot appears in the chat interface.</p>
                  </div>
                </div>
              </div>
              
              <div className="button-group">
                <button
                  className="settings-button"
                  onClick={() => navigate('/customize-bot')}
                >
                  ✏️ Change Customization
                </button>
                
                <button
                  className="settings-button secondary"
                  onClick={saveBotCustomization}
                >
                  💾 Save Current Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;