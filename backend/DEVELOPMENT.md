# Kakille AI - Development Guide 🛠️

This document provides comprehensive instructions for setting up and developing the Kakille AI backend system.

## 🏗️ Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── api/
│   │   ├── __init__.py
│   │   └── whatsapp.py         # WhatsApp webhook endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py           # Configuration management
│   ├── db/                     # Database models and connections
│   ├── models/                 # Pydantic models
│   ├── repositories/           # Data access layer
│   ├── schemas/               # API schemas
│   └── services/
│       ├── __init__.py
│       ├── message_processor.py    # Message routing and processing
│       ├── transcription_service.py # Whisper voice-to-text
│       └── whatsapp_service.py     # WhatsApp API integration
├── data/
│   └── motor_traffic_law.pdf   # Legal documents for knowledge base
├── storage/
│   └── faiss_index/           # Vector database storage
├── .env.example               # Environment variables template
├── requirements.txt           # Python dependencies
└── README.md                  # Project overview
```

## 🚀 Development Setup

### 1. Prerequisites

- **Python 3.11+**: Ensure you have Python 3.11 or higher installed
- **Virtual Environment**: Recommended for dependency isolation
- **WhatsApp Business Account**: Required for WhatsApp integration
- **Meta Developer Account**: For WhatsApp Business API access

### 2. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# API Configuration
API_HOST=localhost
API_PORT=8000
DEBUG=true

# OpenAI (for enhanced features)
OPENAI_API_KEY=your_openai_api_key

# Audio Processing
WHISPER_MODEL=base
TEMP_AUDIO_DIR=./temp_audio

# Vector Database
FAISS_INDEX_PATH=./storage/faiss_index
```

### 4. WhatsApp Business API Setup

1. **Create Meta Developer Account**: Visit [developers.facebook.com](https://developers.facebook.com)
2. **Create WhatsApp Business App**: Set up a new WhatsApp Business application
3. **Configure Webhook**: Set webhook URL to `https://your-domain.com/webhook/whatsapp`
4. **Get Access Tokens**: Obtain necessary tokens and IDs
5. **Test Integration**: Send test messages to verify setup

## 🔧 Development Workflow

### Running the Development Server

```bash
# Start the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Alternative with more verbose logging
uvicorn app.main:app --reload --log-level debug
```

The API will be available at:

- **Main Application**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

### 📝 Current Implementation Status

#### ✅ Implemented Features

**WhatsApp Integration**

- Webhook endpoint for receiving messages
- Message verification and validation
- Support for text and voice messages
- Basic message routing and processing

**Voice Processing**

- Whisper-based speech-to-text transcription
- Audio file download and processing
- Temporary file management
- Voice message response handling

**Core Infrastructure**

- FastAPI application structure
- Configuration management
- Service layer architecture
- Error handling and logging

#### 🚧 In Development

**Legal Knowledge Base**

- FAISS vector database integration
- Legal document processing and indexing
- Semantic search capabilities
- Context-aware response generation

**Enhanced Features**

- User session management
- Conversation history
- Multi-turn dialogue support
- Rich media message handling

### 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_whatsapp_service.py

# Run with verbose output
pytest -v
```

### 📊 Monitoring and Logging

The application uses Python's built-in logging system. Logs are output to the console during development.

**Log Levels:**

- `DEBUG`: Detailed diagnostic information
- `INFO`: General application flow
- `WARNING`: Potential issues
- `ERROR`: Error conditions
- `CRITICAL`: Serious error conditions

### 🔍 API Endpoints

#### WhatsApp Webhook

- `GET /webhook/whatsapp` - Webhook verification
- `POST /webhook/whatsapp` - Receive WhatsApp messages

#### Health Check

- `GET /health` - Application health status

### 🛠️ Development Tools

**Code Quality**

```bash
# Format code with black
black app/

# Sort imports with isort
isort app/

# Lint with flake8
flake8 app/

# Type checking with mypy
mypy app/
```

**Database Management**

```bash
# Initialize FAISS index (if implementing)
python -m app.scripts.init_faiss_db

# Rebuild vector database
python -m app.scripts.rebuild_vectors
```

## 🚨 Troubleshooting

### Common Issues

**1. WhatsApp Webhook Verification Fails**

- Check `WHATSAPP_VERIFY_TOKEN` matches Meta configuration
- Ensure webhook URL is publicly accessible
- Verify HTTPS is properly configured

**2. Voice Transcription Errors**

- Check Whisper model installation
- Verify audio file permissions
- Ensure sufficient disk space for temporary files

**3. Import Errors**

- Verify virtual environment is activated
- Check all dependencies are installed
- Ensure Python path is correctly configured

### Debug Mode

Enable debug mode for detailed error information:

```bash
export DEBUG=true
uvicorn app.main:app --reload --log-level debug
```

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [FAISS Documentation](https://faiss.ai/)

## 🤝 Contributing

1. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
2. **Make Changes**: Implement your feature with tests
3. **Run Tests**: Ensure all tests pass
4. **Submit PR**: Create pull request with detailed description

### Code Standards

- Follow PEP 8 style guidelines
- Use type hints for all functions
- Write comprehensive docstrings
- Include unit tests for new features
- Update documentation as needed

## 📋 TODO / Roadmap

### High Priority

- [ ] Implement legal query processing with LangChain
- [ ] Add user authentication and session management
- [ ] Expand legal knowledge base beyond motor traffic law
- [ ] Implement conversation memory and context

### Medium Priority

- [ ] Add support for document uploads via WhatsApp
- [ ] Implement lawyer referral system
- [ ] Add multi-language support
- [ ] Create admin dashboard for monitoring

### Low Priority

- [ ] Add voice response generation (text-to-speech)
- [ ] Implement advanced analytics and reporting
- [ ] Add integration with legal case management systems
- [ ] Create mobile app with same backend

---

**Note**: This project is under active development. The development environment and procedures may change as the project evolves.
