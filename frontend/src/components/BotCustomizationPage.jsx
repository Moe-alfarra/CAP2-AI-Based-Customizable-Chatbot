import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/BotCustomizationPage.css';

// Bot character options
const botCharacters = [
  { id: 1, name: 'Robo', src: '/src/assets/characters/robo.gif' },
  { id: 2, name: 'Pixie', src: '/src/assets/characters/pixie.png' },
  { id: 3, name: 'Buddy', src: '/src/assets/characters/Buddy.png' },
  { id: 4, name: 'Nova', src: '/src/assets/characters/Nova.png' }
];

const BotCustomizationPage = () => {
  const navigate = useNavigate();
  const [botName, setBotName] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [nameError, setNameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check for existing customization
  useEffect(() => {
    const storedCustomization = localStorage.getItem('botCustomization');
    
    if (storedCustomization) {
      const customization = JSON.parse(storedCustomization);
      setBotName(customization.name);
      
      const character = botCharacters.find(char => char.id === customization.characterId);
      if (character) {
        setSelectedCharacter(character);
      }
    }
  }, []);

  // Handle bot name input
  const handleNameChange = (e) => {
    const value = e.target.value;
    setBotName(value);
    
    if (nameError) setNameError('');
  };

  // Handle character selection
  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate bot name
    if (!botName.trim()) {
      setNameError('Please enter a name for your bot');
      return;
    }
    
    if (!selectedCharacter) {
      setSelectedCharacter(botCharacters[0]);
    }
    
    // Create bot customization object
    const botCustomization = {
      name: botName,
      characterId: selectedCharacter ? selectedCharacter.id : 1,
      characterSrc: selectedCharacter ? selectedCharacter.src : botCharacters[0].src
    };
    
    // Save to local storage for immediate use
    localStorage.setItem('botCustomization', JSON.stringify(botCustomization));
    localStorage.setItem('isCreatingNewBot', 'true'); 
    
    setIsLoading(true);
    
    try {
      // Navigate to personality selection page
      navigate('/customize-personality');
    } catch (error) {
      console.error('Error saving bot customization:', error);
      setError('Failed to save bot customization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="customization-container">
      <div className="customization-card">
        <h1 className="customization-title">Customize Your Bot</h1>
        
        <div className="customization-section">
          <label htmlFor="botName" className="section-label">Give your bot a name:</label>
          <input
            type="text"
            id="botName"
            value={botName}
            onChange={handleNameChange}
            className={`name-input ${nameError ? 'error' : ''}`}
            placeholder="Enter bot name..."
            maxLength={20}
          />
          {nameError && <p className="error-message">{nameError}</p>}
        </div>
        
        <div className="customization-section">
          <p className="section-label">Choose a character:</p>
          <div className="character-grid">
            {botCharacters.map((character) => (
              <div 
                key={character.id}
                className={`character-item ${selectedCharacter && selectedCharacter.id === character.id ? 'selected' : ''}`}
                onClick={() => handleCharacterSelect(character)}
              >
                <img 
                  src={character.src} 
                  alt={character.name} 
                  className="character-image"
                />
                <p className="character-name">{character.name}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Preview section */}
        {(botName || selectedCharacter) && (
          <div className="preview-section">
            <p className="preview-label">Preview:</p>
            <div className="preview-content">
              {selectedCharacter && (
                <img 
                  src={selectedCharacter.src} 
                  alt="Selected character" 
                  className="preview-character"
                />
              )}
              <p className="preview-name">{botName || 'Your Bot'}</p>
            </div>
          </div>
        )}
        
        <div className="button-container">
          <button className="btn back-btn" onClick={() => navigate('/')}>
            Back
          </button>
          <button 
            className="btn next-btn" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Continue to Chat'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotCustomizationPage;