A customizable AI-powered chatbot web application with personalized bot appearances and conversation history.


## To access the project directly instead of running it locally:

Copy and paste the following in a browser: https://chat-bot-ai-cap-2.vercel.app/


## Getting Started (To run the code/project locally)

1. Clone the repository or download the zip folder and extract it in a directory that is easily accessible (e.g. Desktop)
2. Set up two command prompt tabs (one for frontend and one for backend)
3. Navigate to backend: 'cd backend'
4. Create python virtual environment (venv): 'python -m venv myvenv'
5. Install backend dependencies: `pip install -r requirements.txt`
6. Start backend: 'python app.py'
7. Navigate to frontend directory on the other cmd tab: 'cd frontend'
8. Start frontend: `cd frontend && npm run dev`

## Directory Structure

### Backend Structure
```
backend/
├── models/               # Database models
│   ├── __init__.py       	# Database initialization
│   ├── user.py           	# User model
│   ├── bot_customization.py  	# Bot customization options
│   ├── bot_personality.py    	# Bot personality definitions
│   ├── conversation.py   	# Conversation tracking
│   └── message.py        	# Message storage
│
├── services/             # Business logic services
│   ├── __init__.py
│   ├── auth_service.py   		# Authentication handling
│   ├── bot_service.py    		# Bot customization service
│   ├── bot_personality_service.py  	# Personality management
│   └── chat_service.py   		# Chat functionality
│
├── utils/                # Utility functions
│   ├── __init__.py
│   └── password_utils.py 	# Password hashing/verification
│
├── app.py                # Main application entry point, API endpoints
├── config.py             # Configuration settings
└── requirements.txt      # Python dependencies
```

### Frontend Structure
```
frontend/              
│              
│      
|── index.html        # HTML entry point
|
├── src/ 		  #Source code
|   ├── assets/           
│   │   └── characters/
|   |   |__ logo.png
|   |        
│   ├── components/       # React components
│   │   ├── Auth/         # Authentication components
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── BotCustomizationPage.jsx
│   │   ├── BotPersonalitySelection.jsx
│   │   ├── ChatInterface.jsx
│   │   ├── Settings.jsx
│   │   └── WelcomePage.jsx
│   │
│   ├── css/              # Styling files
│   │   ├── AuthForms.css
│   │   ├── BotCustomizationPage.css
│   │   ├── BotPersonalitySelection.css
│   │   ├── Settings.css
│   │   ├── style.css
│   │   └── WelcomePage.css
│   │
│   ├── services/         # API and service functions
│   │   ├── api.js        # API communication
│   │   └── botService.js # Bot-related services
│   │
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # Application entry point
│   └── index.css         # Global styles
│
├── package.json          # npm dependencies
└── vite.config.js        # Vite configuration
```

## Key Components

### Backend Components

1. **Models**: Database entity definitions
   - User: User account information and authentication details
   - BotCustomization: Bot appearance settings
   - BotPersonality: Pre-defined bot personalities and behaviors
   - Conversation: Tracks conversations and sessions
   - Message: Stores message content and metadata

2. **Services**: Business logic implementation
   - AuthService: Handles user registration, login, and authentication
   - BotService: Manages bot customization options
   - ChatService: Processes chat interactions and OpenAI API communication
   - BotPersonalityService: Manages different personality options

3. **Utils**: Helper utilities
   - password_utils: Handles secure password hashing and verification

### Frontend Components

1. **Authentication**: User account management
   - Login: User login interface
   - Register: User registration interface

2. **Bot Customization**: Appearance and personality settings
   - BotCustomizationPage: Interface for customizing bot appearance
   - BotPersonalitySelection: Options for choosing bot personality

3. **Chat Interface**: Main interaction component
   - Displays conversation history
   - Manages message input and responses
   - Provides session controls (reset, export, etc.)

4. **Services**: API communication
   - api.js: Handles all backend API requests
   - botService.js: Manages bot-specific API interactions

## Database Schema

The application uses PostgreSQL with the following core tables:
- users: User account information
- bot_customizations: Bot appearance settings
- bot_personalities: Personality definitions
- conversations: Session information
- messages: Chat message content

## API Endpoints

### Authentication
- POST /api/register: Create new user account
- POST /api/login: Authenticate user
- POST /api/logout: End user session
- GET /api/user: Get current user information

### Bot Customization
- GET /api/bot-customization: Get user's bot settings
- POST /api/bot-customization: Save bot customization
- GET /api/bot-personalities: Get available personalities
- PUT /api/bot-personality: Update bot personality

### Chat
- POST /api/chat: Send message and get response
- GET /api/chat-history: Get conversation history
- POST /api/reset-chat: Clear current conversation
- GET /api/sessions: Get user's chat sessions
- POST /api/sessions: Create new chat session


## Environment Variables

Required environment variables:
- OPENAI_API_KEY: Your OpenAI API key
- JWT_SECRET: Secret for JWT token generation
- SECRET_KEY: Flask application secret key
- DATABASE_URL: PostgreSQL connection string