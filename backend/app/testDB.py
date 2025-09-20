# test_db.py
from sqlalchemy import text
from app.db.postgres import SessionLocal, engine, Base

# Optional: create tables if not yet created
# Base.metadata.create_all(bind=engine)

def test_connection():
    try:
        with SessionLocal() as session:
            result = session.execute(text("SELECT 1"))
            print("Database connected:", result.fetchone())
    except Exception as e:
        print("Error connecting to database:", e)

if __name__ == "__main__":
    test_connection()
