import os
import logging
from datetime import datetime
import time
import random
from flask import Flask, request, jsonify
import openai
from dotenv import load_dotenv
from flask_cors import CORS

# Import our database models and services
from models import db, init_db
from models.user import User
from models.bot_customization import BotCustomization
from models.conversation import Conversation
from models.bot_personality import BotPersonality
from services.auth_service import AuthService
from services.bot_service import BotService
from services.chat_service import ChatService
from utils.password_utils import hash_password, verify_password
from services.bot_personality_service import BotPersonalityService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
print(f"API Key loaded: {'Yes' if OPENAI_API_KEY else 'No'}")

# Initialize OpenAI client
openai.api_key = OPENAI_API_KEY

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", os.urandom(24)) 
from config import JWT_SECRET

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://postgre:XTkCGDFj3kf5K0bHFvLaE9c7NScesG1S@dpg-cvng81je5dus73dvvhfg-a.oregon-postgres.render.com/chatbot_4sdk"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize CORS
CORS(app, origins=["http://localhost:8000"], supports_credentials=True, allow_headers=["Content-Type", "Authorization"])

# Initialize database
init_db(app)

with app.app_context():
    db.create_all()
    print("Database tables created successfully!")
    
    BotPersonalityService.initialize_default_personalities()
    print("Default personalities initialized!")

DEFAULT_SYSTEM_MESSAGE = """
You are a helpful assistant. Provide concise, accurate responses to user questions.
Respond in a friendly and helpful manner.
"""

# Helper function for authentication
def get_auth_user_id(request):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    return AuthService.verify_token(token)

# Authentication routes
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email', '').lower()
        password = data.get('password')
        
        # Validation
        if not all([name, email, password]):
            return jsonify({"error": "Name, email, and password are required"}), 400
        
        # Call the service to handle registration
        result, error = AuthService.register(name, email, password)
        
        if error:
            return jsonify({"error": error}), 409
            
        logger.info(f"New user registered: {email}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in register endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred during registration"}), 500

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    try:
        user_id = get_auth_user_id(request)
        guest_id = request.args.get('guest_id')
        
        if not user_id and not guest_id:
            return jsonify({"error": "Authentication or guest ID required"}), 401
        
        storage_id = user_id if user_id else f"guest_{guest_id}"
        
        # Get sessions from service
        sessions = ChatService.get_user_sessions(storage_id)
        
        return jsonify(sessions)
        
    except Exception as e:
        logger.error(f"Error in get_sessions endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred retrieving sessions"}), 500

@app.route('/api/sessions', methods=['POST'])
def create_session():
    try:
        data = request.json
        user_id = get_auth_user_id(request)
        guest_id = data.get('guest_id')
        
        if not user_id and not guest_id:
            return jsonify({"error": "Authentication or guest ID required"}), 401
        
        storage_id = user_id if user_id else f"guest_{guest_id}"
        
        # Get bot customization details
        bot_customization_id = data.get('bot_customization_id')
        
        # Validate bot customization exists
        if not bot_customization_id:
            return jsonify({"error": "Bot customization ID is required"}), 400
            
        customization = BotCustomization.query.filter_by(id=bot_customization_id).first()
        if not customization:
            return jsonify({"error": "Invalid bot customization ID"}), 400
        
        # Use provided session ID or generate new one
        session_id = data.get('session_id') 
        if not session_id:
            session_id = f"session_{int(time.time() * 1000)}_{random.randint(100000, 999999)}"
        
        # Check if a conversation with this session ID already exists
        existing_conversation = Conversation.query.filter_by(session_id=session_id).first()
        if existing_conversation:
            # Update the existing conversation
            existing_conversation.bot_customization_id = bot_customization_id
            existing_conversation.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify({
                "session_id": session_id,
                "conversation": existing_conversation.to_dict()
            })
        
        # Create new conversation with customization link
        conversation = Conversation(
            user_id=storage_id,
            session_id=session_id,
            bot_customization_id=bot_customization_id,
            title=f"New conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        return jsonify({
            "session_id": session_id,
            "conversation": conversation.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating session: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred creating the session"}), 500

@app.route('/api/conversation', methods=['GET'])
def get_conversation():
    try:
        session_id = request.args.get('session_id')
        if not session_id:
            return jsonify({"error": "Session ID required"}), 400
            
        # Try to convert numeric session IDs to integers for backward compatibility
        numeric_session_id = None
        try:
            if session_id.isdigit():
                numeric_session_id = int(session_id)
        except:
            pass
        
        # Find conversation by session_id
        conversation = None
        if numeric_session_id is not None:
            # Try to find by numeric ID (backward compatibility)
            conversation = Conversation.query.filter_by(id=numeric_session_id).first()
        
        if not conversation:
            # Try to find by session_id string
            conversation = Conversation.query.filter_by(session_id=session_id).first()
        
        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404
            
        # Get bot customization data
        bot_customization_data = None
        if conversation.bot_customization:
            bot_customization_data = {
                'id': conversation.bot_customization.id,
                'name': conversation.bot_customization.name,
                'characterId': conversation.bot_customization.character_id,
                'characterSrc': conversation.bot_customization.character_src,
                'personalityId': conversation.bot_customization.personality_id
            }
            
            # Add personality info if available
            personality = BotPersonality.query.filter_by(id=conversation.bot_customization.personality_id).first()
            if personality:
                bot_customization_data['personality'] = {
                    'id': personality.id,
                    'name': personality.name,
                    'description': personality.description
                }
        
        return jsonify({
            "conversation": conversation.to_dict(),
            "bot_customization": bot_customization_data
        })
        
    except Exception as e:
        logger.error(f"Error in get_conversation endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred retrieving conversation"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').lower()
        password = data.get('password')
        
        # Validation
        if not all([email, password]):
            return jsonify({"error": "Email and password are required"}), 400
        
        # Call the service to handle login
        result, error = AuthService.login(email, password)
        
        if error:
            return jsonify({"error": error}), 401
            
        logger.info(f"User logged in: {email}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in login endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred during login"}), 500

@app.route('/api/user', methods=['GET'])
def get_user():
    try:
        user_id = get_auth_user_id(request)
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401
        
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_user endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred retrieving user data"}), 500

@app.route('/api/user', methods=['PUT'])
def update_user():
    try:
        user_id = get_auth_user_id(request)
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401
        
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.json
        
        # Only allow updating name and email
        if 'name' in data:
            user.name = data['name']
        
        if 'email' in data:
            # Check if email is unique
            new_email = data['email'].lower()
            existing_user = User.query.filter_by(email=new_email).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({"error": "Email already in use"}), 409
            
            user.email = new_email
        
        db.session.commit()
        logger.info(f"User updated: {user_id}")
        
        return jsonify({
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in update_user endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred updating user data"}), 500

@app.route('/api/password', methods=['PUT'])
def change_password():
    try:
        user_id = get_auth_user_id(request)
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401
        
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        data = request.json
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        if not all([current_password, new_password]):
            return jsonify({"error": "Current and new passwords are required"}), 400
        
        # Verify current password
        if not verify_password(current_password, user.password_salt, user.password_hash):
            return jsonify({"error": "Current password is incorrect"}), 401
        
        # Update password
        salt, hashed_password = hash_password(new_password)
        user.password_salt = salt
        user.password_hash = hashed_password
        
        db.session.commit()
        logger.info(f"Password changed for user: {user_id}")
        
        return jsonify({"message": "Password updated successfully"})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in change_password endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred changing password"}), 500

# Bot customization routes
@app.route('/api/bot-customization', methods=['POST'])
def save_bot_customization():
    try:
        data = request.json
        user_id = get_auth_user_id(request)
        guest_id = data.get('guest_id')
        
        if not user_id and not guest_id:
            return jsonify({"error": "Authentication or guest ID required"}), 401
        
        storage_id = user_id if user_id else f"guest_{guest_id}"
        
        name = data.get('name', 'Bot')
        character_id = data.get('characterId', 1)
        character_src = data.get('characterSrc', '/assets/characters/robo.gif')
        personality_id = data.get('personalityId', 1) 
        is_new = data.get('is_new', False)  # Flag to indicate creating a new customization
        
        customization = BotService.save_bot_customization(
            storage_id, 
            name, 
            character_id, 
            character_src,
            personality_id,
            is_new
        )
        
        logger.info(f"Bot customization saved for {'user' if user_id else 'guest'}: {storage_id}")
        
        return jsonify({
            'customization': customization
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in save_bot_customization endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred saving bot customization"}), 500

@app.route('/api/bot-customization', methods=['GET'])
def get_bot_customization():
    try:
        user_id = get_auth_user_id(request)
        guest_id = request.args.get('guest_id')
        
        if not user_id and not guest_id:
            return jsonify({"error": "Authentication or guest ID required"}), 401
        
        storage_id = user_id if user_id else f"guest_{guest_id}"
        
        customization = BotService.get_bot_customization(storage_id)
        
        return jsonify({
            'customization': customization
        })
        
    except Exception as e:
        logger.error(f"Error in get_bot_customization endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred retrieving bot customization"}), 500

@app.route('/api/bot-personalities', methods=['GET'])
def get_bot_personalities():
    try:
        personalities = BotPersonalityService.get_all_personalities()
        
        return jsonify({
            'personalities': personalities
        })
        
    except Exception as e:
        logger.error(f"Error in get_bot_personalities endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred retrieving bot personalities"}), 500
    
@app.route('/api/bot-personality', methods=['PUT'])
def update_bot_personality():
    try:
        data = request.json
        user_id = get_auth_user_id(request)
        guest_id = data.get('guest_id')
       
        if not user_id and not guest_id:
            return jsonify({"error": "Authentication or guest ID required"}), 401
       
        storage_id = user_id if user_id else f"guest_{guest_id}"
        personality_id = data.get('personality_id')
       
        if not personality_id:
            return jsonify({"error": "Personality ID is required"}), 400
       
        # Update just the personality
        result = BotService.update_bot_personality(storage_id, personality_id)
       
        if not result:
            name = "Bot"  # Default name
            character_id = 1  # Default character
            character_src = '/assets/characters/robo.gif'  # Default character image
            
            result = BotService.save_bot_customization(
                storage_id, 
                name, 
                character_id, 
                character_src,
                personality_id
            )
            
            if not result:
                return jsonify({"error": "Failed to update personality"}), 400
           
        logger.info(f"Bot personality updated for {'user' if user_id else 'guest'}: {storage_id}")
       
        return jsonify({
            'customization': result
        })
       
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in update_bot_personality endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred updating bot personality"}), 500
    
# Chat routes
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        # Get the user's message from request
        data = request.json
        user_message = data.get("message", "")
        session_id = data.get("session_id", "default")
       
        if session_id.isdigit():
            conversation = Conversation.query.get(int(session_id))
            if conversation and conversation.session_id:
                session_id = conversation.session_id
                print(f"Converting numeric ID {data.get('session_id')} to session ID {session_id}")
        
        # Get user ID (authenticated or guest)
        user_id = get_auth_user_id(request)
        guest_id = data.get("guest_id")
        storage_id = user_id if user_id else f"guest_{guest_id}"

        # For guest users, check if we should redirect to their latest conversation
        if storage_id.startswith("guest_"):
            latest_conversation = Conversation.query.filter_by(
                user_id=storage_id
            ).order_by(Conversation.updated_at.desc()).first()
    
            if latest_conversation and latest_conversation.session_id != session_id:
                # Redirect to the latest session
                session_id = latest_conversation.session_id
                logger.info(f"Redirecting guest to latest session: {session_id}")

        # Find the conversation for this session
        conversation = Conversation.query.filter_by(session_id=session_id).first()
        
        # If no conversation found, create one
        if not conversation:
            # Get bot customization ID, either from request or user's most recent
            bot_customization_id = data.get("bot_customization_id")
            
            if not bot_customization_id:
                customization = BotCustomization.query.filter_by(
                    storage_id=storage_id
                ).order_by(BotCustomization.updated_at.desc()).first()
                
                if customization:
                    bot_customization_id = customization.id
            
            # Create the conversation
            conversation = ChatService.get_or_create_conversation(
                storage_id, 
                session_id,
                bot_customization_id
            )
            
        # Get system message from conversation's bot customization
        system_message = DEFAULT_SYSTEM_MESSAGE
        personality = None
        
        if conversation.bot_customization:
            personality = BotPersonality.query.get(conversation.bot_customization.personality_id)
            if personality:
                system_message = personality.system_prompt.format(
                    bot_name=conversation.bot_customization.name
                )
       
        # Validate input
        if not user_message:
            return jsonify({"error": "Message is required"}), 400
        
        # Get chat response using service
        assistant_message = ChatService.get_chat_response(
            storage_id, 
            session_id, 
            user_message, 
            system_message
        )
        
        # Log the messages
        logger.info(f"User message: {user_message[:50]}..." if len(user_message) > 50 else f"User message: {user_message}")
        logger.info(f"Assistant response: {assistant_message[:50]}..." if len(assistant_message) > 50 else f"Assistant response: {assistant_message}")
       
        # Get bot customization data for response
        bot_data = None
        if conversation.bot_customization:
            bot_data = {
                'name': conversation.bot_customization.name,
                'characterId': conversation.bot_customization.character_id,
                'characterSrc': conversation.bot_customization.character_src,
                'personalityId': conversation.bot_customization.personality_id
            }
            
            # Add personality info if available
            if personality:
                bot_data['personality'] = {
                    'id': personality.id,
                    'name': personality.name,
                    'description': personality.description
                }
       
        return jsonify({
            "reply": assistant_message,
            "session_id": session_id,
            "bot": bot_data
        })
       
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred processing your request"}), 500

@app.route('/api/chat-history', methods=['GET'])
def get_chat_history():
    try:
        session_id = request.args.get('session_id')
        user_id = get_auth_user_id(request)
        guest_id = request.args.get('guest_id')
        
        if not session_id:
            return jsonify({"error": "Session ID required"}), 400
            
        # Determine storage ID (authenticated user or guest)
        storage_id = user_id if user_id else f"guest_{guest_id}"
        
       
        if session_id.isdigit():
            conversation = Conversation.query.get(int(session_id))
            if conversation and conversation.session_id:
                session_id = conversation.session_id
                print(f"Converting numeric ID {request.args.get('session_id')} to session ID {session_id}")
                
        # Get messages using service
        history_data = ChatService.get_chat_history(storage_id, session_id)
        
        return jsonify({
            "session_id": session_id,
            "messages": history_data["messages"],
            "bot": history_data["bot"]
        })
        
    except Exception as e:
        logger.error(f"Error in get_chat_history endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred retrieving chat history"}), 500

@app.route('/api/reset-chat', methods=['POST'])
def reset_chat():
    try:
        data = request.json
        session_id = data.get("session_id", "default")
        bot_customization_id = data.get("bot_customization_id")
        
        # Get user ID (authenticated or guest)
        user_id = get_auth_user_id(request)
        guest_id = data.get("guest_id")
        storage_id = user_id if user_id else f"guest_{guest_id}"
        
        # Get the conversation
        conversation = Conversation.query.filter_by(session_id=session_id).first()
        
        if not conversation:
            return jsonify({"error": "Conversation not found"}), 404
            
        # Update bot customization if provided
        if bot_customization_id:
            # Verify the bot customization exists
            customization = BotCustomization.query.get(bot_customization_id)
            if customization:
                conversation.bot_customization_id = bot_customization_id
                db.session.commit()
                logger.info(f"Updated bot customization for session {session_id}")
        
        # Get system message from conversation's bot customization
        system_message = DEFAULT_SYSTEM_MESSAGE
        if conversation.bot_customization:
            personality = BotPersonality.query.get(conversation.bot_customization.personality_id)
            if personality:
                system_message = personality.system_prompt.format(
                    bot_name=conversation.bot_customization.name
                )
        
        # Reset the conversation using service
        ChatService.reset_conversation(storage_id, session_id, system_message)
        
        return jsonify({
            "status": "success", 
            "message": "Conversation has been reset",
            "session_id": session_id
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in reset_chat endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while resetting the conversation"}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        user_id = get_auth_user_id(request)
        if user_id:
            pass
            
        return jsonify({"message": "Logged out successfully"})
        
    except Exception as e:
        logger.error(f"Error in logout endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred during logout"}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_ENV") == "development"
    
    logger.info(f"Starting server on port {port}, debug mode: {debug_mode}")
    
    app.run(host="0.0.0.0", port=port, debug=debug_mode)