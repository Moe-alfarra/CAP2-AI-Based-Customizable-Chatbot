import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/BotPersonalitySelection.css';

const BotPersonalitySelectionPage = () => {
  const navigate = useNavigate();
  const [personalities, setPersonalities] = useState([]);
  const [selectedPersonality, setSelectedPersonality] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [botCustomization, setBotCustomization] = useState(null);

  // Fetch personalities and check for existing customization
  useEffect(() => {
    const fetchPersonalities = async () => {
      try {
        // Get personalities from API
        const response = await fetch('/api/bot-personalities', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('authToken') ? `Bearer ${localStorage.getItem('authToken')}` : ''
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch personalities');
        }

        const data = await response.json();
        setPersonalities(data.personalities || []);

        // Get current customization from localStorage
        const storedCustomization = localStorage.getItem('botCustomization');
        if (storedCustomization) {
          const customization = JSON.parse(storedCustomization);
          setBotCustomization(customization);
          
          // If personality already set, select it
          if (customization.personalityId) {
            setSelectedPersonality(customization.personalityId);
          } else {
            // Otherwise select the first personality
            setSelectedPersonality(data.personalities[0]?.id || 1);
          }
        } else {
          navigate('/customize-bot');
          return;
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load personalities. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonalities();
  }, [navigate]);

  const handlePersonalitySelect = (personalityId) => {
    setSelectedPersonality(personalityId);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedPersonality) {
      setError('Please select a personality for your bot');
      return;
    }
  
    setIsLoading(true);
  
    try {
      const storedCustomization = localStorage.getItem('botCustomization');
      if (!storedCustomization) {
        setError('Bot customization data not found. Please go back and try again.');
        return;
      }
      
      const botCustomization = JSON.parse(storedCustomization);
      
      botCustomization.personalityId = selectedPersonality;
      
      localStorage.setItem('botCustomization', JSON.stringify(botCustomization));
      
      // Determine if user is authenticated or guest
      const authToken = localStorage.getItem('authToken');
      const userType = localStorage.getItem('userType');
      const guestId = localStorage.getItem('guestId');
      
      // Create a new bot customization in the database
      let customizationResponse;
      let newBotCustomizationId;
      
      if (authToken && userType === 'authenticated') {
        // Authenticated user - create new bot customization
        customizationResponse = await fetch('/api/bot-customization', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: botCustomization.name,
            characterId: botCustomization.characterId,
            characterSrc: botCustomization.characterSrc,
            personalityId: selectedPersonality,
            is_new: true
          })
        });
      } else if (guestId) {
        // Guest user - create with guest ID
        customizationResponse = await fetch('/api/bot-customization', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: botCustomization.name,
            characterId: botCustomization.characterId,
            characterSrc: botCustomization.characterSrc,
            personalityId: selectedPersonality,
            guest_id: guestId,
            is_new: true
          })
        });
      }
      
      if (customizationResponse && customizationResponse.ok) {
        const customizationData = await customizationResponse.json();
        if (customizationData && customizationData.customization) {
          newBotCustomizationId = customizationData.customization.id;
        }
      }
      
      // Now create a new session with this new bot customization
      if (newBotCustomizationId) {
        const sessionPayload = {
          bot_customization_id: newBotCustomizationId,
          is_new_conversation: true 
        };
        
        if (guestId && userType !== 'authenticated') {
          sessionPayload.guest_id = guestId;
        }
        
        const sessionResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          },
          body: JSON.stringify(sessionPayload)
        });
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData && sessionData.session_id) {
            localStorage.setItem('sessionId', sessionData.session_id);
          }
        }
      }
      
      // Clean up the creation flag
      localStorage.removeItem('isCreatingNewBot');
      
      // Navigate to chat page
      navigate('/chat');
    } catch (error) {
      console.error('Error saving bot personality:', error);
      setError('Failed to save your selection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    navigate('/customize-bot');
  };

  if (isLoading) {
    return (
      <div className="customization-container">
        <div className="loading-indicator">Loading personalities...</div>
      </div>
    );
  }

  return (
    <div className="customization-container">
      <div className="customization-card">
        <h1 className="customization-title">Choose Your Bot's Personality</h1>
        
        {/* Display bot preview */}
        {botCustomization && (
          <div className="bot-preview">
            <img 
              src={botCustomization.characterSrc} 
              alt="Bot character" 
              className="preview-character"
            />
            <p className="preview-name">{botCustomization.name}</p>
          </div>
        )}
        
        <div className="customization-section">
          <p className="section-label">Select a personality for your bot:</p>
          
          <div className="personality-grid">
            {personalities.map((personality) => (
              <div 
                key={personality.id}
                className={`personality-item ${selectedPersonality === personality.id ? 'selected' : ''}`}
                onClick={() => handlePersonalitySelect(personality.id)}
              >
                <h3 className="personality-name">{personality.name}</h3>
                <p className="personality-description">{personality.description}</p>
              </div>
            ))}
          </div>
          
          {error && <p className="error-message">{error}</p>}
        </div>
        
        <div className="button-container">
          <button className="btn back-btn" onClick={handleBack}>
            Back
          </button>
          <button 
            className="btn next-btn" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Start Chatting'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotPersonalitySelectionPage;