// src/services/botService.js

/**
 * Fetches all available bot personalities
 * @returns {Promise<Object>} Object containing array of personalities
 */
export const fetchBotPersonalities = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      
      const response = await fetch('/api/bot-personalities', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch bot personalities');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in fetchBotPersonalities:', error);
      throw error;
    }
  };
  
  /**
   * Updates a bot's personality 
   * @param {number} personalityId The ID of the personality to set
   * @returns {Promise<Object>} Updated bot customization data
   */
  export const updateBotPersonality = async (personalityId) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const userType = localStorage.getItem('userType');
      const guestId = localStorage.getItem('guestId');
      
      const payload = {
        personality_id: personalityId
      };
      
      // Add guest_id for guest users
      if (userType === 'guest' && guestId) {
        payload.guest_id = guestId;
      }
      
      const response = await fetch('/api/bot-personality', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bot personality');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in updateBotPersonality:', error);
      throw error;
    }
  };
  
  /**
   * Fetch the current bot customization 
   * @returns {Promise<Object>} Current bot customization data
   */
  export const fetchBotCustomization = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const userType = localStorage.getItem('userType');
      const guestId = localStorage.getItem('guestId');
      
      let url = '/api/bot-customization';
      
      // Add guest_id for guest users
      if (userType === 'guest' && guestId) {
        url += `?guest_id=${guestId}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch bot customization');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in fetchBotCustomization:', error);
      throw error;
    }
  };