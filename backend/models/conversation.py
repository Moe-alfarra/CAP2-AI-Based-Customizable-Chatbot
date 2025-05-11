from datetime import datetime
from models import db

class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    session_id = db.Column(db.String(100), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=True)  # Optional title
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    bot_customization_id = db.Column(db.Integer, db.ForeignKey('bot_customizations.id'), nullable=False)
    
    # Define relationship with BotCustomization
    bot_customization = db.relationship('BotCustomization', back_populates='conversations')

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'title': self.title,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'bot_customization_id': self.bot_customization_id
        }