from datetime import datetime
from models import db
from models.bot_customization import BotCustomization
from models.bot_personality import BotPersonality
from models.conversation import Conversation

class BotService:
    @staticmethod
    def get_bot_customization(storage_id):
        customization = BotCustomization.query.filter_by(storage_id=storage_id).first()
        
        if not customization:
            return None
        
        personality = BotPersonality.query.filter_by(id=customization.personality_id).first()
        personality_info = None

        if personality:
            personality_info = {
                'id': personality.id,
                'name': personality.name,
                'description': personality.description
            }

        return {
            'name': customization.name,
            'characterId': customization.character_id,
            'characterSrc': customization.character_src,
            'personalityId': customization.personality_id,
            'personality': personality_info,
            'updated_at': customization.updated_at.isoformat()
        }
    
    @staticmethod
    def save_bot_customization(storage_id, name, character_id, character_src, personality_id, is_new=False):
        """Save a bot customization for a user/guest"""
        if is_new:
            # Always create a new customization
            customization = BotCustomization(
                storage_id=storage_id,
                name=name,
                character_id=character_id,
                character_src=character_src,
                personality_id=personality_id
            )
            db.session.add(customization)
        else:
            # Try to update existing or create new
            customization = BotCustomization.query.filter_by(storage_id=storage_id).first()
        
            if not customization:
                customization = BotCustomization(
                    storage_id=storage_id,
                    name=name,
                    character_id=character_id,
                    character_src=character_src,
                    personality_id=personality_id
                )
                db.session.add(customization)
            else:
                customization.name = name
                customization.character_id = character_id
                customization.character_src = character_src
                customization.personality_id = personality_id
                customization.updated_at = datetime.utcnow()
    
        db.session.commit()
    
        personality = BotPersonality.query.filter_by(id=customization.personality_id).first()
        personality_info = None

        if personality:
            personality_info = {
                'id': personality.id,
                'name': personality.name,
                'description': personality.description
            }
    
        return {
            'id': customization.id,
            'name': customization.name,
            'characterId': customization.character_id,
            'characterSrc': customization.character_src,
            'personalityId': customization.personality_id,
            'personality': personality_info,
            'updated_at': customization.updated_at.isoformat()
        }
    

    @staticmethod
    def get_system_prompt(storage_id):
        """Get the formatted system prompt for a specific user/guest"""
        customization = BotCustomization.query.filter_by(storage_id=storage_id).first()
    
        if not customization:
            # Default system message if no customization exists
            return """
            You are a helpful assistant. Provide concise, accurate responses to user questions.
            Respond in a friendly and helpful manner.
            """
        
        # Get the personality
        personality = BotPersonality.query.filter_by(id=customization.personality_id).first()
        if not personality:
            # Fallback system message if personality doesn't exist
            return f"""
            You are {customization.name}, a helpful assistant. Provide concise, accurate responses to user questions.
            Respond in a friendly and helpful manner. Always sign your responses as {customization.name}.
            """
        
        # Format the system prompt with the bot name
        return personality.system_prompt.format(bot_name=customization.name)


    @staticmethod
    def update_bot_personality(storage_id, personality_id):
        """Update just the personality for a bot"""
        try:
            customization = BotCustomization.query.filter_by(storage_id=storage_id).first()
        
            if not customization:
                return None
            
            # Verify personality_id exists
            personality = BotPersonality.query.filter_by(id=personality_id).first()
            if not personality:
                return None
            
            # Update personality
            customization.personality_id = personality_id
            customization.updated_at = datetime.utcnow()
            db.session.commit()
        
            # Build response with personality details
            return {
                'name': customization.name,
                'characterId': customization.character_id,
                'characterSrc': customization.character_src,
                'personalityId': customization.personality_id,
                'personality': {
                    'id': personality.id,
                    'name': personality.name,
                    'description': personality.description
                },
                'updated_at': customization.updated_at.isoformat()
            }
        except Exception as e:
            db.session.rollback()
            print(f"Error updating personality: {str(e)}")
            return None
    
    @staticmethod
    def transfer_customization(from_storage_id, to_storage_id):
        """Transfer bot customization from one user ID to another."""
        customization = BotCustomization.query.filter_by(storage_id=from_storage_id).first()
    
        if customization:
            # Check if destination user already has customization
            existing = BotCustomization.query.filter_by(storage_id=to_storage_id).first()
        
            if existing:
                    # Update existing customization
                    existing.name = customization.name
                    existing.character_id = customization.character_id
                    existing.character_src = customization.character_src
                    existing.personality_id = customization.personality_id
            else:
                # Create new customization
                new_custom = BotCustomization(
                        storage_id=to_storage_id,
                        name=customization.name,
                        character_id=customization.character_id,
                        character_src=customization.character_src,
                        personality_id=customization.personality_id
                )
                db.session.add(new_custom)
        
            db.session.commit()
            return True
        
        return False
    
    @staticmethod
    def get_system_prompt_for_conversation(conversation_id):
        """Get the system prompt for a specific conversation"""
        conversation = Conversation.query.get(conversation_id)
    
        if not conversation or not conversation.bot_customization:
            # Default system message if no valid conversation or customization
            return """
            You are a helpful assistant. Provide concise, accurate responses to user questions.
            Respond in a friendly and helpful manner.
            """
    
        # Get the bot customization
        customization = conversation.bot_customization
    
        # Get the personality
        personality = BotPersonality.query.filter_by(id=customization.personality_id).first()
        if not personality:
            # Fallback system message if personality doesn't exist
            return f"""
            You are {customization.name}, a helpful assistant. Provide concise, accurate responses to user questions.
            Respond in a friendly and helpful manner. Always sign your responses as {customization.name}.
            """
    
        return personality.system_prompt.format(bot_name=customization.name)
