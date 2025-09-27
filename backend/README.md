# Backend - LegalAid

This is the FastAPI backend for the LegalAid project.

## Environment

Create a `.env` file in the backend root with the following variables:

```env
SECRET_KEY=2e4ab06c040ed907c1f335fe5da650b38156cbd15a6f2a75a4ecc6ba6d1490d8
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# PostgreSQL Configuration (existing)
POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_DB=legal_aid
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=legalaid

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_DB=0
```

## Database Setup

This application uses three databases:

### 1. PostgreSQL (User Management & Core Data)
- **Purpose**: User authentication, profiles, and core application data
- **Default Connection**: `postgresql://admin:password@localhost:5432/legal_aid`

Install PostgreSQL and create the database:
```bash
# On Windows with PostgreSQL installed
createdb -U admin legal_aid
```

### 2. MongoDB (Chat History & Sessions)
- **Purpose**: Chat conversations, message history, and session management
- **Default Connection**: `mongodb://localhost:27017/legalaid`

Install MongoDB:
```bash
# On Windows - Download from https://www.mongodb.com/try/download/community
# Or using Chocolatey:
choco install mongodb

# Start MongoDB service
net start MongoDB
```

Verify MongoDB connection:
```bash
mongosh mongodb://localhost:27017/legalaid
```

### 3. Redis (Caching & Session Storage)
- **Purpose**: Fast caching, session storage, and temporary data
- **Default Connection**: `redis://localhost:6379/0`

Install Redis:
```bash
# On Windows - Download from https://github.com/microsoftarchive/redis/releases
# Or using Chocolatey:
choco install redis-64

# Start Redis service
redis-server
```

Verify Redis connection:
```bash
redis-cli ping
# Should return: PONG
```

## Install & Setup

### 1. Virtual Environment
Activate your virtual environment:

```bash
# On Windows PowerShell
venv\Scripts\Activate.ps1

# On Windows Command Prompt
venv\Scripts\activate.bat

# On Linux/Mac
source venv/bin/activate
```

### 2. Python Dependencies
Install all required dependencies:

```bash
pip install -r requirements.txt
```

This includes:
- **FastAPI & Uvicorn**: Web framework and ASGI server
- **PostgreSQL**: SQLAlchemy, psycopg2 for PostgreSQL connection
- **MongoDB**: motor, pymongo for async MongoDB operations
- **Redis**: redis, aioredis for caching and session management
- **AI/ML**: langchain, sentence-transformers for RAG functionality
- **Security**: passlib, python-jose for authentication

### 3. Database Initialization

**PostgreSQL Setup:**
```bash
# Test PostgreSQL connection
python -m app.testDB
```

**MongoDB Collections:**
The application will automatically create these collections:
- `chat_sessions`: User chat sessions and conversation history
- `chat_messages`: Individual messages within chat sessions
- `lawyer_recommendations`: Cached lawyer recommendations and ratings

**Redis Setup:**
Redis will be used for:
- Session caching and management
- Temporary data storage
- Rate limiting and request throttling

### 4. Start the Server

```bash
uvicorn app.main:app --reload --port 8000
```

Server will run at: [http://127.0.0.1:8000](http://127.0.0.1:8000)

### 5. Health Checks

Verify all database connections:

```bash
# Basic health check
curl http://localhost:8000/api/v1/health

# Detailed health check (all databases)
curl http://localhost:8000/api/v1/health/detailed

# MongoDB specific check
curl http://localhost:8000/api/v1/health/mongodb

# Redis specific check
curl http://localhost:8000/api/v1/health/redis
```

## File Structure

```
backend/
├── app/
│   ├── api/               # FastAPI routes
│   │   └── routes/
│   │       ├── auth.py    # User authentication endpoints
│   │       ├── chatbot.py # Chat and AI assistant endpoints
│   │       ├── hello.py   # Basic endpoints
│   │       └── health.py  # Database health check endpoints
│   ├── core/              # Configuration and core utilities
│   │   ├── config.py      # Settings (PostgreSQL, MongoDB, Redis)
│   │   ├── logging.py     # Application logging setup
│   │   └── security.py    # Authentication and security
│   ├── db/                # Database connections
│   │   ├── postgres.py    # PostgreSQL SQLAlchemy setup
│   │   └── database.py    # MongoDB & Redis connection manager
│   ├── models/            # Data models
│   │   ├── user.py        # PostgreSQL User model (SQLAlchemy)
│   │   └── chat.py        # MongoDB Chat models (Pydantic)
│   ├── schemas/           # API request/response schemas
│   │   ├── user.py        # User-related Pydantic schemas
│   │   └── chatbot.py     # Chatbot request/response schemas
│   ├── services/          # Business logic and external services
│   │   ├── auth_service.py      # Authentication business logic
│   │   ├── gemini_client.py     # Google Gemini AI client
│   │   ├── llm/                 # Language model services
│   │   │   └── gemini_client.py
│   │   └── rag/                 # Retrieval-Augmented Generation
│   │       ├── qa_service.py    # Question-answering service
│   │       └── vectorstore.py   # Vector database operations
│   ├── adapters/          # External service adapters
│   │   ├── chat/               # Chat persistence adapters
│   │   │   └── inmem_history.py
│   │   ├── llm/                # LLM provider adapters
│   │   │   └── gemini_llm.py
│   │   └── rag/                # RAG system adapters
│   │       └── faiss_retriever.py
│   ├── repositories/      # Data access layer
│   │   └── user.py        # User data repository
│   ├── main.py            # FastAPI app entrypoint
│   └── testDB.py          # Database connection testing
├── data/                  # Application data files
│   └── motor_traffic_law.pdf  # Legal documents for RAG
├── storage/               # Persistent storage
│   └── faiss_index/      # FAISS vector search index
├── alembic/              # Database migrations
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables
```

## API Endpoints

### Health & Monitoring
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed system health with database status
- `GET /api/v1/health/mongodb` - MongoDB connection status
- `GET /api/v1/health/redis` - Redis connection status

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user profile

### AI Legal Assistant
- `POST /api/v1/chat` - Send message to AI legal assistant
- `GET /api/v1/chat/history/{session_id}` - Get chat history for session

### Database Collections (MongoDB)

**chat_sessions:**
```json
{
  "_id": "ObjectId",
  "user_id": "string|null",
  "session_id": "string",
  "messages": ["ChatMessage"],
  "created_at": "datetime",
  "updated_at": "datetime",
  "is_active": "boolean",
  "title": "string|null",
  "tags": ["string"]
}
```

**chat_messages:**
```json
{
  "_id": "ObjectId", 
  "content": "string",
  "sender": "user|assistant",
  "timestamp": "datetime",
  "message_type": "text|file|image",
  "metadata": "object|null"
}
```

**lawyer_recommendations:**
```json
{
  "_id": "ObjectId",
  "session_id": "string", 
  "lawyers": ["object"],
  "query": "string",
  "created_at": "datetime",
  "rating": "float|null"
}
```
