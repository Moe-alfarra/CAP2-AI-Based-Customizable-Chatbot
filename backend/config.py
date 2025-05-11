import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = "postgresql://postgre:XTkCGDFj3kf5K0bHFvLaE9c7NScesG1S@dpg-cvng81je5dus73dvvhfg-a.oregon-postgres.render.com/chatbot_4sdk"
SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", DATABASE_URL)
SQLALCHEMY_TRACK_MODIFICATIONS = False

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "ZNs7F8JdQ2KpRxEv6LgT9YmAcW4BhUq5ViP3XnMbGt")
JWT_EXPIRATION_DELTA = 60 * 60 * 24 * 30  # 30 days in seconds

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Flask configuration
SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(24).hex())