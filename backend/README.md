# Backend - LegalAid

This is the FastAPI backend for the LegalAid project.

## Environment

Create a `.env` file in the backend root with the following variables:

```env
SECRET_KEY=2e4ab06c040ed907c1f335fe5da650b38156cbd15a6f2a75a4ecc6ba6d1490d8
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_DB=legal_aid
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

## Install & Setup

Activate your virtual environment:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Make sure PostgreSQL is running and the database exists (`legal_aid`).

Run initial migration / test connection:

```bash
python -m app.testDB
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

Server will run at: [http://127.0.0.1:8000](http://127.0.0.1:8000)

## File Structure

```
backend/
├── app/
│   ├── api/               # FastAPI routes
│   │   └── routes/
│   │       ├── auth.py
│   │       └── hello.py
│   ├── core/              # Config, security, utils
│   │   ├── config.py
│   │   └── security.py
│   ├── db/                # Database setup
│   │   └── postgres.py
│   ├── models/            # SQLAlchemy models
│   │   └── user.py
│   ├── schemas/           # Pydantic schemas
│   │   └── user.py
│   ├── services/          # Business logic and services
│   │   └── user.py
│   ├── repositories/      # Database access layer
│   │   └── user.py
│   ├── main.py            # FastAPI app entrypoint
│   └── testDB.py          # Test DB connection
├── venv/                  # Python virtual environment
├── requirements.txt       # Python dependencies
└── .env                   # Environment variables
```
