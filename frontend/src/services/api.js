// API Service for handling backend communication

// Update with your production API URL - using Render or similar hosting service
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-api-url.render.com' 
  : 'http://localhost:5000';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'An error occurred');
  }
  return response.json();
};

// Auth token management
const getToken = () => localStorage.getItem('authToken');
const setToken = (token) => localStorage.setItem('authToken', token);
const removeToken = () => localStorage.removeItem('authToken');

// Helper function to create authenticated headers
const createAuthHeaders = (additionalHeaders = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper to handle guest identification
const getGuestId = () => {
  const existingId = localStorage.getItem('guestId');
  if (existingId) return existingId;
  
  const newId = Math.random().toString(36).substring(2, 15);
  localStorage.setItem('guestId', newId);
  return newId;
};

// User authentication services
const authService = {
  register: async (userData) => {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      credentials: 'include',
    });
    
    const data = await handleResponse(response);
    setToken(data.token);
    localStorage.setItem('userType', 'authenticated');
    localStorage.setItem('userId', data.user.id);
    return data;
  },
  
  login: async (credentials) => {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });
    
    const data = await handleResponse(response);
    setToken(data.token);
    localStorage.setItem('userType', 'authenticated');
    localStorage.setItem('userId', data.user.id);
    return data;
  },
  
  logout: async () => {
    const token = getToken();
    
    // If there's a token, try to invalidate it on the server
    if (token) {
      try {
        await fetch(`${API_URL}/api/logout`, {
          method: 'POST',
          headers: createAuthHeaders(),
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    removeToken();
    localStorage.removeItem('userId');
    localStorage.setItem('userType', 'guest');
    // Don't remove guestId or session to maintain continuity
  },
  
  getCurrentUser: async () => {
    const token = getToken();
    if (!token) return null;
    
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        headers: createAuthHeaders(),
        credentials: 'include',
      });
      
      // If token is invalid, clear it and return null
      if (response.status === 401) {
        removeToken();
        localStorage.setItem('userType', 'guest');
        return null;
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },
  
  updateUser: async (userData) => {
    const token = getToken();
    if (!token) throw new Error('Authentication required');
    
    const response = await fetch(`${API_URL}/api/user`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify(userData),
      credentials: 'include',
    });
    
    return handleResponse(response);
  },
  
  changePassword: async (passwordData) => {
    const token = getToken();
    if (!token) throw new Error('Authentication required');
    
    const response = await fetch(`${API_URL}/api/password`, {
      method: 'PUT',
      headers: createAuthHeaders(),
      body: JSON.stringify(passwordData),
      credentials: 'include',
    });
    
    return handleResponse(response);
  },
};

// Bot customization services
const botService = {
  saveBotCustomization: async (customization) => {
    const token = getToken();
    const headers = createAuthHeaders();
    
    // Add guest_id if not authenticated
    if (!token) {
      customization.guest_id = getGuestId();
    }
    
    const response = await fetch(`${API_URL}/api/bot-customization`, {
      method: 'POST',
      headers,
      body: JSON.stringify(customization),
      credentials: 'include',
    });
    
    return handleResponse(response);
  },
  
  getBotCustomization: async () => {
    const token = getToken();
    const headers = {};
    let url = `${API_URL}/api/bot-customization`;
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Add guest_id as query parameter if not authenticated
      const guestId = getGuestId();
      url += `?guest_id=${guestId}`;
    }
    
    try {
      const response = await fetch(url, {
        headers,
        credentials: 'include',
      });
      
      if (response.status === 404) {
        return null;
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching bot customization:', error);
      // Return local storage version if available as fallback
      const localCustomization = localStorage.getItem('botCustomization');
      return localCustomization ? { customization: JSON.parse(localCustomization) } : null;
    }
  },
};

// Chat services
const chatService = {
  sendMessage: async (message, sessionId = null) => {
    const token = getToken();
    const headers = createAuthHeaders();
    
    const currentSessionId = sessionId || localStorage.getItem('sessionId') || 'default';
    
    const payload = {
      message,
      session_id: currentSessionId,
    };
    
    // Add guest_id if not authenticated
    if (!token) {
      payload.guest_id = getGuestId();
    }
    
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    
    const data = await handleResponse(response);
    
    // Store session ID for future requests
    if (data.session_id) {
      localStorage.setItem('sessionId', data.session_id);
    }
    
    return data;
  },

  createSession: async (botCustomizationId, sessionId = null) => {
    const token = getToken();
    const headers = createAuthHeaders();
    
    const payload = {
      bot_customization_id: botCustomizationId
    };
    
    // Add session_id if provided
    if (sessionId) {
      payload.session_id = sessionId;
    }
    
    // Add guest_id if not authenticated
    if (!token) {
      payload.guest_id = getGuestId();
    }
    
    const response = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    
    const data = await handleResponse(response);
    
    // Store session ID for future requests if returned
    if (data && data.session_id) {
      localStorage.setItem('sessionId', data.session_id);
    }
    
    return data;
  },

  
  getChatHistory: async (sessionId = null) => {
    const token = getToken();
    const headers = createAuthHeaders();
    
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    let url = `${API_URL}/api/chat-history`;
    
    if (currentSessionId) {
      url += `?session_id=${currentSessionId}`;
    }
    
    // Add guest_id for non-authenticated users
    if (!token) {
      const guestId = getGuestId();
      url += currentSessionId ? `&guest_id=${guestId}` : `?guest_id=${guestId}`;
    }
    
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });
    
    return handleResponse(response);
  },
  
  resetChat: async (sessionId = null, botCustomizationId = null) => {
    const token = getToken();
    const headers = createAuthHeaders();
    
    const payload = {
      session_id: sessionId || localStorage.getItem('sessionId') || 'default',
    };
    
    // Add bot customization ID if provided
    if (botCustomizationId) {
      payload.bot_customization_id = botCustomizationId;
    }
    
    // Add guest_id if not authenticated
    if (!token) {
      payload.guest_id = getGuestId();
    }
    
    const response = await fetch(`${API_URL}/api/reset-chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    
    return handleResponse(response);
  },
  
  getSessions: async () => {
    const token = getToken();
    if (!token) {
      // For guests, we might not store multiple sessions
      const currentSession = localStorage.getItem('sessionId');
      return currentSession ? [{ id: currentSession, created_at: new Date().toISOString() }] : [];
    }
    
    const response = await fetch(`${API_URL}/api/sessions`, {
      headers: createAuthHeaders(),
      credentials: 'include',
    });
    
    return handleResponse(response);
  },
};

// Export all services
export { authService, botService, chatService };