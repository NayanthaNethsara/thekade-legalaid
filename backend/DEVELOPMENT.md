# LegalAid Backend - Development Guide

## 🏗️ Architecture Overview

This backend follows a **Clean Architecture** pattern with the following structure:

```
app/
├── core/           # Core application configuration and utilities
├── domain/         # Domain models and business rules (ports)
├── adapters/       # External service adapters (implementations)
├── services/       # Business logic services
├── api/           # API routes and controllers
├── db/            # Database configuration
├── models/        # SQLAlchemy models
├── repositories/  # Data access layer
└── schemas/       # Pydantic schemas for API
```

## 🔧 Key Improvements Made

### 1. **Dependency Injection Container**
- Centralized dependency management in `app/core/dependencies.py`
- Type-safe dependency injection using FastAPI's Depends
- Cached singleton services for performance

### 2. **Custom Exception Handling**
- Structured exception classes in `app/core/exceptions.py`
- Global exception handlers with proper HTTP status codes
- Consistent error response format

### 3. **Application Factory Pattern**
- Clean application initialization in `app/core/app_factory.py`
- Configurable middleware stack
- Lifespan management for startup/shutdown

### 4. **Enhanced Configuration**
- Environment-based configuration with validation
- Centralized settings management
- Development/production environment support

### 5. **Logging & Monitoring**
- Structured logging with request tracking
- Health check endpoints for monitoring
- Performance metrics collection

## 🚀 Getting Started

### 1. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Database Setup
```bash
alembic upgrade head
```

### 4. Run Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📋 API Endpoints

### Health Checks
- `GET /health/` - Application health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### Chatbot
- `POST /api/v1/chatbot/chat` - Chat with legal assistant
- `GET /api/v1/chatbot/chats` - List chat sessions
- `DELETE /api/v1/chatbot/chat/{chat_id}` - Clear specific chat
- `DELETE /api/v1/chatbot/chats` - Clear all chats

## 🧪 Testing

### Unit Tests
```bash
pytest tests/unit/
```

### Integration Tests
```bash
pytest tests/integration/
```

### API Tests
```bash
pytest tests/api/
```

## 🐳 Docker Support

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker build -t legalaid-api .
docker run -p 8000:8000 legalaid-api
```

## 📝 Code Quality

### Linting
```bash
flake8 app/
```

### Type Checking
```bash
mypy app/
```

### Code Formatting
```bash
black app/
isort app/
```

## 🔒 Security Considerations

1. **Environment Variables**: Never commit sensitive data
2. **JWT Secrets**: Use strong, unique secrets in production
3. **Database**: Use connection pooling and prepared statements
4. **CORS**: Configure allowed origins properly
5. **Rate Limiting**: Implement rate limiting for API endpoints

## 📈 Performance Optimization

1. **Database**: Use connection pooling and query optimization
2. **Caching**: Implement Redis for session and data caching
3. **Async**: Use async/await for I/O operations
4. **Monitoring**: Set up APM tools for performance tracking

## 🚀 Deployment

### Environment Variables (Production)
- Set `DEBUG=false`
- Use strong `SECRET_KEY`
- Configure proper `ALLOWED_ORIGINS`
- Set appropriate `LOG_LEVEL`

### Database
- Use managed PostgreSQL service
- Enable connection pooling
- Set up backups and monitoring

### Monitoring
- Health checks for load balancers
- Application metrics collection
- Error tracking and alerting