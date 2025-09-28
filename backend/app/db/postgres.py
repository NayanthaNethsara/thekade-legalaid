from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Create engine with improved configuration
engine = create_engine(
    settings.database_url,
    echo=settings.DEBUG,  # SQL logging based on debug mode
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=3600,   # Recycle connections every hour
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    expire_on_commit=False,  # Keep objects accessible after commit
)

# Base class for models
Base = declarative_base()
