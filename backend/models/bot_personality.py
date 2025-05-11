from datetime import datetime
from . import db

class BotPersonality(db.Model):
    __tablename__ = 'bot_personalities'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    system_prompt = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @classmethod
    def get_default_personality(cls):
        """Returns the default personality (id=1)"""
        return cls.query.filter_by(id=1).first()