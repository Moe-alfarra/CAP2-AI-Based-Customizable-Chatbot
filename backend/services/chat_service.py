from datetime import datetime
from models import db
from models.conversation import Conversation
from models.message import Message
from models.bot_customization import BotCustomization
from models.bot_personality import BotPersonality
from services.bot_service import BotService

class ChatService:
    @staticmethod
    def get_or_create_conversation(user_id, session_id, bot_customization_id=None):
        """Get or create a conversation."""
        conversation = Conversation.query.filter_by(session_id=session_id).first()
    
        if not conversation:
            # For guest users, always use their most recent bot customization if one isn't specified
            if user_id.startswith("guest_") and not bot_customization_id:
                # Find the most recent customization for this guest
                customization = BotCustomization.query.filter_by(
                    storage_id=user_id
                ).order_by(BotCustomization.updated_at.desc()).first()
            
                if customization:
                    bot_customization_id = customization.id
        
            # Validate bot customization exists
            if not bot_customization_id:
                # Get default customization for user if none specified
                customization = BotCustomization.query.filter_by(storage_id=user_id).first()
                if customization:
                    bot_customization_id = customization.id
                else:
                    # This shouldn't happen with your flow, but as a fallback
                    default_customization = BotCustomization.query.first()
                    bot_customization_id = default_customization.id if default_customization else 1
        
            # Create a new conversation
            conversation = Conversation(
                user_id=user_id,
                session_id=session_id,
                bot_customization_id=bot_customization_id,
                title=f"New conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            )
            db.session.add(conversation)
            db.session.commit()
        
        return conversation
    
    @staticmethod
    def add_message(conversation_id, role, content):
        """Add a message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content
        )
        db.session.add(message)
        db.session.commit()
        
        # Update the conversation's updated_at timestamp
        conversation = Conversation.query.get(conversation_id)
        conversation.updated_at = datetime.utcnow()
        db.session.commit()
        
        return message
    
    @staticmethod
    def get_chat_history(user_id, session_id):

        #Retrieve chat history for a specific session.
        # Try to convert numeric session IDs to integers for backward compatibility

        numeric_session_id = None
        try:
            if session_id.isdigit():
                numeric_session_id = int(session_id)
        except:
            pass
    
        conversation = None
        if numeric_session_id is not None:
            conversation = Conversation.query.filter_by(id=numeric_session_id).first()
    
        if not conversation:
            conversation = Conversation.query.filter_by(session_id=session_id).first()
    
        if not conversation:
            print(f"No conversation found for session ID: {session_id}")
            return {"messages": [], "bot": None}
        
        print(f"Found conversation ID {conversation.id} for session ID {session_id}")
    
        # Get bot customization data
        bot_data = None
        if conversation.bot_customization:
            personality = BotPersonality.query.filter_by(id=conversation.bot_customization.personality_id).first()
        
            bot_data = {
                'id': conversation.bot_customization.id,
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
                    'description': personality.description,
                    'system_prompt': personality.system_prompt  
                }
            
        # Only return user and assistant messages (not system messages)
        messages = Message.query.filter_by(
            conversation_id=conversation.id
        ).filter(
            Message.role.in_(['user', 'assistant'])
        ).order_by(Message.timestamp).all()
    
        print(f"Found {len(messages)} messages for conversation ID {conversation.id}")
    
        return {
            "messages": [message.to_dict() for message in messages],
            "bot": bot_data
        }
    
    @staticmethod
    def get_user_sessions(user_id):
        """Get all chat sessions for a user."""
        conversations = Conversation.query.filter_by(
            user_id=user_id
        ).order_by(Conversation.updated_at.desc()).all()
        
        return [conversation.to_dict() for conversation in conversations]
    
    @staticmethod
    def get_chat_response(user_id, session_id, user_message, system_message=None):
        
        # Get or create conversation
        conversation = ChatService.get_or_create_conversation(user_id, session_id)

        if not system_message:
            system_message = BotService.get_system_prompt_for_conversation(conversation.id)

        # Update system message if provided
        if system_message:
            # Check if a system message already exists
            existing_system = Message.query.filter_by(
                conversation_id=conversation.id,
                role='system'
            ).first()
        
            if existing_system:
                existing_system.content = system_message
                db.session.commit()
            else:
                ChatService.add_message(conversation.id, 'system', system_message)
    
        # Add user message
        ChatService.add_message(conversation.id, 'user', user_message)
    
        # Gather all messages for the API request
        messages = []
    
        # First add system message if exists
        system_msg = Message.query.filter_by(
            conversation_id=conversation.id,
            role='system'
        ).first()
    
        if system_msg:
            messages.append({"role": "system", "content": system_msg.content})
    
        # Add all user and assistant messages
        conversation_messages = Message.query.filter_by(
            conversation_id=conversation.id
        ).filter(
            Message.role.in_(['user', 'assistant'])
        ).order_by(Message.timestamp).all()
    
        for msg in conversation_messages:
            messages.append({"role": msg.role, "content": msg.content})
    
        import openai  
    
        response = openai.ChatCompletion.create(  
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7,
            max_tokens=150
        )
    
        assistant_response = response['choices'][0]['message']['content'].strip()
    
        ChatService.add_message(conversation.id, 'assistant', assistant_response)
    
        if len(conversation_messages) <= 2 and not conversation.title.startswith("New conversation"):
            title_text = user_message[:30] + "..." if len(user_message) > 30 else user_message
            conversation.title = title_text
            db.session.commit()
    
        return assistant_response

    
    @staticmethod
    def reset_conversation(user_id, session_id, system_message=None):
       
        conversation = Conversation.query.filter_by(session_id=session_id).first()
        
        if conversation:
            # Delete all messages except system messages
            Message.query.filter_by(
                conversation_id=conversation.id
            ).filter(
                Message.role != 'system'
            ).delete()
            
            # Update system message if provided
            if system_message:
                system_msg = Message.query.filter_by(
                    conversation_id=conversation.id,
                    role='system'
                ).first()
                
                if system_msg:
                    system_msg.content = system_message
                else:
                    ChatService.add_message(conversation.id, 'system', system_message)
            
            # Reset conversation title
            conversation.title = f"New conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            conversation.updated_at = datetime.utcnow()
            db.session.commit()
        
        return True
        
    @staticmethod
    def transfer_conversations(from_user_id, to_user_id):
        #Transfer conversations from one user ID to another.
        conversations = Conversation.query.filter_by(user_id=from_user_id).all()
        
        for conv in conversations:
            conv.user_id = to_user_id
        
        db.session.commit()
        return True