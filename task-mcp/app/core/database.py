import psycopg2
from app.core.config import settings

def get_db_connection():
    """Create a fresh DB connection using psycopg2."""
    return psycopg2.connect(settings.DATABASE_URL)
