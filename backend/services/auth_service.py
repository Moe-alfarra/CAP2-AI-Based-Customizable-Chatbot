from datetime import datetime, timedelta
import jwt
import uuid
from models import db
from models.user import User
from utils import password_utils
import config

class AuthService:
    @staticmethod
    def register(name, email, password):
        # Check if email already exists
        if User.query.filter_by(email=email.lower()).first():
            return None, "Email already registered"
        
        # Create user
        user_id = str(uuid.uuid4())
        salt, hashed_password = password_utils.hash_password(password)
        
        user = User(
            id=user_id,
            name=name,
            email=email.lower(),
            password_salt=salt,
            password_hash=hashed_password
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Generate token
        token = AuthService.generate_token(user_id)
        
        return {
            'token': token,
            'user': {
                'id': user_id,
                'name': name,
                'email': email
            }
        }, None
    
    @staticmethod
    def login(email, password):
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            return None, "Invalid email or password"
        
        if not password_utils.verify_password(password, user.password_salt, user.password_hash):
            return None, "Invalid email or password"
        
        # Generate token
        token = AuthService.generate_token(user.id)
        
        return {
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        }, None
    
    @staticmethod
    def generate_token(user_id):
        payload = {
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(seconds=config.JWT_EXPIRATION_DELTA)
        }
        return jwt.encode(payload, config.JWT_SECRET, algorithm='HS256')
    
    @staticmethod
    def verify_token(token):
        try:
            payload = jwt.decode(token, config.JWT_SECRET, algorithms=['HS256'])
            return payload['user_id']
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None