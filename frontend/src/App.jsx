import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import { authService } from './services/api';

import WelcomePage from './components/WelcomePage';
import BotCustomizationPage from './components/BotCustomizationPage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Settings from './components/Settings';
import ChatInterface from './components/ChatInterface';
import BotPersonalitySelectionPage from './components/BotPersonalitySelection';

// Import CSS
import './css/style.css';

// Auth context for global state management
import { createContext } from 'react';
export const AuthContext = createContext(null);

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('authToken') !== null && 
                          localStorage.getItem('userType') === 'authenticated';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Semi-protected route wrapper (requires any user type)
const UserRoute = ({ children }) => {
  const userType = localStorage.getItem('userType');
  
  if (!userType) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Auth provider component
const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(localStorage.getItem('userType') || null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Check if token exists
        const token = localStorage.getItem('authToken');
        
        if (token) {
          // Verify token and get user data
          const userData = await authService.getCurrentUser();
          
          if (userData && userData.user) {
            setCurrentUser(userData.user);
            setUserType('authenticated');
            localStorage.setItem('userType', 'authenticated');
          } else {
            // Invalid token
            setCurrentUser(null);
            setUserType('guest');
            localStorage.setItem('userType', 'guest');
            localStorage.removeItem('authToken');
          }
        } else if (!localStorage.getItem('userType')) {
          // No token and no user type, set as guest
          setUserType('guest');
          localStorage.setItem('userType', 'guest');
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        // In case of error, default to guest
        setCurrentUser(null);
        setUserType('guest');
        localStorage.setItem('userType', 'guest');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  const login = (userData, token) => {
    setCurrentUser(userData);
    setUserType('authenticated');
    localStorage.setItem('userType', 'authenticated');
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userData.id);
  };
  
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCurrentUser(null);
      setUserType('guest');
      localStorage.setItem('userType', 'guest');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
    }
  };
  
  const value = {
    currentUser,
    userType,
    login,
    logout,
    isAuthenticated: userType === 'authenticated',
    isGuest: userType === 'guest'
  };
  
  if (loading) {
    return <div className="loading-app">Verifying authentication...</div>;
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

function App() {
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Check if this is the first visit
    const hasVisited = localStorage.getItem('hasVisited');
    
    if (!hasVisited) {
      // First time visitor
      localStorage.setItem('hasVisited', 'true');
      
      // Generate a guest ID
      if (!localStorage.getItem('guestId')) {
        const guestId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('guestId', guestId);
      }
    }
    
    setInitialized(true);
  }, []);
  
  if (!initialized) {
    return <div className="loading-app">Initializing application...</div>;
  }
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Semi-protected routes (both guest and authenticated users) */}
          <Route 
            path="/customize-bot" 
            element={
              <UserRoute>
                <BotCustomizationPage />
              </UserRoute>
            } 
          />

          <Route 
            path="/customize-personality" 
            element={
              <UserRoute>
                <BotPersonalitySelectionPage />
              </UserRoute>
            } 
          />
          
          <Route 
            path="/chat" 
            element={
              <UserRoute>
                <ChatInterface />
              </UserRoute>
            } 
          />
          
          {/* Protected routes (authenticated users only) */}
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;