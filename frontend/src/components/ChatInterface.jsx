// src/components/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService, botService } from '../services/api'; 
import '../css/style.css';

const ChatInterface = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);

  const [botCustomization, setBotCustomization] = useState({
    name: 'Bot',
    characterSrc: '/src/assets/characters/robo.gif' 
  });
  
  // Load bot customization and chat history on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load bot customization
        const customizationData = await botService.getBotCustomization();
        if (customizationData && customizationData.customization) {
          setBotCustomization(customizationData.customization);
          // Still save to localStorage as a fallback
          localStorage.setItem('botCustomization', JSON.stringify(customizationData.customization));
        } else {
          // Try to get from localStorage as fallback
          const savedCustomization = localStorage.getItem('botCustomization');
          if (savedCustomization) {
            setBotCustomization(JSON.parse(savedCustomization));
          }
        }
 
        // Get or create session ID
        const storedSessionId = localStorage.getItem('sessionId') || generateSessionId();
        setSessionId(storedSessionId);
        localStorage.setItem('sessionId', storedSessionId);
       
        // Check if we need to create a new conversation for this session
        if (!storedSessionId.startsWith('session_')) {
          await loadChatHistory(storedSessionId);
        } else {
          const historyData = await chatService.getChatHistory(storedSessionId);
         
          if (!historyData || !historyData.messages || historyData.messages.length === 0) {
            console.log("New session detected, creating conversation...");
           
            if (customizationData && customizationData.customization) {
              try {
                // Create a new conversation for this session
                await chatService.createSession(
                  customizationData.customization.id,
                  storedSessionId
                );
              } catch (err) {
                console.error("Error creating new conversation:", err);
              }
            }
          }
         
          // Load chat history
          await loadChatHistory(storedSessionId);
        }
       
        // Load available sessions if any
        await loadSessions();
      } catch (error) {
        console.error('Error loading initial data:', error);
        addMessage('There was an error loading the chat. Please refresh the page.', 'bot', true);
      } finally {
        setIsLoadingHistory(false);
        if (inputRef.current) inputRef.current.focus();
      }
    };
 
    loadInitialData();
  }, []);

  const loadChatHistory = async (sessionToLoad) => {
    setIsLoadingHistory(true);
    try {
      const historyData = await chatService.getChatHistory(sessionToLoad);
      
      // Handle messages
      if (historyData && historyData.messages && historyData.messages.length > 0) {
        // Format messages for our UI
        const formattedMessages = historyData.messages.map(msg => ({
          id: msg.id || Date.now() + Math.random(),
          sender: msg.role === 'user' ? 'user' : 'bot',
          message: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          isError: false
        }));
        
        setMessageHistory(formattedMessages);
        
        // Update session ID if needed
        if (historyData.session_id) {
          setSessionId(historyData.session_id);
          localStorage.setItem('sessionId', historyData.session_id);
        }
      } else {
        setMessageHistory([]);
      }
      
      if (historyData && historyData.bot) {
        setBotCustomization(historyData.bot);
      }
      
    } catch (error) {
      console.error('Error loading chat history:', error);
      if (messageHistory.length > 0) {
        addMessage('Failed to load chat history.', 'bot', true);
      }
    } finally {
      setIsLoadingHistory(false);
      
      setTimeout(() => {
        if (chatBoxRef.current) {
          chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const loadSessions = async () => {
    try {
      const sessionsData = await chatService.getSessions();
      if (sessionsData && Array.isArray(sessionsData)) {
        setSessions(sessionsData);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  };

  const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  };

  const addMessage = (messageText, sender, isError = false) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      sender,
      message: messageText,
      timestamp: new Date().toISOString(),
      isError
    };
    
    setMessageHistory(prevHistory => [...prevHistory, newMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isWaiting) return;

    // Clear input and set waiting state
    const currentMessage = message;
    setMessage('');
    setIsWaiting(true);
    
    // Add user message
    addMessage(sanitizeInput(currentMessage), 'user');
    
    try {
      // Send request using the chat service
      const data = await chatService.sendMessage(currentMessage, sessionId);
      
      // Add bot response
      addMessage(data.reply || data.message, 'bot');
      
      // Update session ID if needed
      if (data.session_id && data.session_id !== sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('sessionId', data.session_id);
        loadSessions();
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message
      addMessage(
        'Sorry, I encountered an error while processing your request. Please try again later.',
        'bot',
        true
      );
    } finally {
      setIsWaiting(false);
      
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleResetChat = async () => {
    try {
      setIsWaiting(true);
      
      // Get current bot customization
      const customizationData = await botService.getBotCustomization();
      if (!customizationData || !customizationData.customization) {
        console.error('Failed to get bot customization');
      }
      
      const botCustomizationId = customizationData?.customization?.id;
      
      // Use the chat service to reset the chat with the current customization
      await chatService.resetChat(sessionId, botCustomizationId);
      
      // Clear message history
      setMessageHistory([]);
      
      // Add system message
      addMessage('Chat has been reset. How can I help you today?', 'bot');
      
    } catch (error) {
      console.error('Error resetting chat:', error);
      addMessage('Failed to reset the chat. Please try again.', 'bot', true);
    } finally {
      setIsWaiting(false);
    }
  };

  const handleExportChat = () => {
    if (messageHistory.length === 0) {
      alert('No messages to export');
      return;
    }
    
    let chatText = '=== Chat Export ===\n\n';
    messageHistory.forEach(item => {
      const time = new Date(item.timestamp).toLocaleTimeString();
      const sender = item.sender === 'user' ? 'You' : botCustomization.name;
      chatText += `[${time}] ${sender}: ${item.message}\n\n`;
    });
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const handleSessionChange = async (newSessionId) => {
    if (newSessionId === sessionId) return;
    
    setIsWaiting(true);
    try {
      let actualSessionId = newSessionId;
      if (!newSessionId.startsWith('session_')) {

        const session = sessions.find(s => s.id == newSessionId);
        if (session && session.session_id) {
          actualSessionId = session.session_id;
          console.log(`Converting numeric ID ${newSessionId} to session ID ${actualSessionId}`);
        }
      }
      
      // Set the new session ID
      setSessionId(actualSessionId);
      localStorage.setItem('sessionId', actualSessionId);
      
      // Load chat history for this session using the proper session ID
      await loadChatHistory(actualSessionId);
      
    } catch (error) {
      console.error('Error changing session:', error);
      addMessage('Failed to switch to the selected chat. Please try again.', 'bot', true);
    } finally {
      setIsWaiting(false);
    }
  };
  
  const handleNewChat = async () => {
    navigate('/customize-bot');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const isUserAuthenticated = localStorage.getItem('userType') === 'authenticated';

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="bot-info">
          <img 
            src={botCustomization.characterSrc} 
            alt={`${botCustomization.name} avatar`} 
            className="header-bot-avatar"
          />
          <h1>{botCustomization.name}</h1>
        </div>
        <div className="chat-controls">
          {/* Add Settings button, only visible to authenticated users */}
          {isUserAuthenticated && (
            <button onClick={handleSettingsClick} id="Settings" className="control-button">
              Settings
            </button>
          )}
          <button onClick={handleResetChat} id="reset-chat" className="control-button">
            Reset Chat
          </button>
          <button onClick={handleExportChat} id="export-chat" className="control-button">
            Export Chat
          </button>
          {sessions.length > 1 && (
            <select 
              value={sessionId} 
              onChange={(e) => handleSessionChange(e.target.value)}
              className="session-selector"
            >
              {sessions.map(session => (
                <option key={session.id} value={session.session_id || session.id}>
                  {new Date(session.created_at).toLocaleDateString()} - Session {session.session_id ? session.session_id.slice(-5) : session.id}
                </option>
              ))}
            </select>
          )}
          <button onClick={handleNewChat} id="new-session" className="control-button">
            New Chat
          </button>
        </div>
      </div>
     
      <div className="chat-box" id="chat-box" ref={chatBoxRef}>
        {isLoadingHistory ? (
          <div className="loading-message">
            <p>Loading chat history...</p>
          </div>
        ) : messageHistory.length === 0 ? (
          <div className="welcome-message">
            <p>Hello! How can I help you today?</p>
          </div>
        ) : (
          messageHistory.map((msg) => (
            msg.sender === 'user' ? (
              // User message
              <div key={msg.id} className={`message user-message ${msg.isError ? 'error' : ''}`}>
                <div className="message-content">
                  <strong>You: </strong>
                  <span dangerouslySetInnerHTML={{ __html: msg.message }}></span>
                </div>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ) : (
              // Bot message
              <div key={msg.id} className="bot-message-container">
                <img 
                  src={botCustomization.characterSrc} 
                  alt={`${botCustomization.name} avatar`} 
                  className="bot-avatar"
                />
                <div className="bot-message-content">
                  <div className={`message bot-message ${msg.isError ? 'error' : ''}`}>
                    <div className="message-content">
                      <strong>{botCustomization.name}: </strong>
                      <span dangerouslySetInnerHTML={{ __html: msg.message }}></span>
                    </div>
                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )
          ))
        )}
        {isWaiting && (
          <div className="bot-message-container">
            <img 
              src={botCustomization.characterSrc} 
              alt={`${botCustomization.name} avatar`} 
              className="bot-avatar"
            />
            <div className="bot-message-content">
              <div className="message bot-message typing-indicator">
                <div className="message-content">
                  <strong>{botCustomization.name}: </strong>
                  <em>Typing...</em>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
     
      <div className="chat-input">
        <textarea
          id="user-input"
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          disabled={isWaiting || isLoadingHistory}
          rows={1}
          className="user-input-textarea"
        />
        <button 
          className="send-button"
          onClick={handleSendMessage} 
          disabled={isWaiting || isLoadingHistory || !message.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInterface;