from datetime import datetime
from . import db

class BotCustomization(db.Model):
    __tablename__ = 'bot_customizations'
    
    id = db.Column(db.Integer, primary_key=True)
    storage_id = db.Column(db.String(100), unique=False, nullable=False)  # user_id or guest_id
    name = db.Column(db.String(100), nullable=False, default='Bot')
    character_id = db.Column(db.Integer, nullable=False, default=1)
    character_src = db.Column(db.String(255), nullable=False, default='/assets/characters/robo.gif')
    personality_id = db.Column(db.Integer, db.ForeignKey('bot_personalities.id'), nullable=False, default=1)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    conversations = db.relationship('Conversation', back_populates='bot_customization')
    
    def to_dict(self):
        return {
            'id': self.id,
            'storage_id': self.storage_id,
            'name': self.name,
            'characterId': self.character_id,
            'characterSrc': self.character_src,
            'personalityId': self.personality_id,
            'updated_at': self.updated_at.isoformat()
        }