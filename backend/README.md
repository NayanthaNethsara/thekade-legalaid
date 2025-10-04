# Kakille AI - Legal Professionals Copilot 🤖⚖️

> **⚠️ Development Status**: This project is currently under active development. Only WhatsApp integration and text-to-speech functionality have been implemented so far.

## Overview

Kakille AI is an intelligent legal assistant designed to be the ultimate copilot for legal professionals. The system provides comprehensive legal support through multiple channels, making legal expertise more accessible and efficient.

### 🌟 Key Features

- **WhatsApp Integration**: Seamless legal assistance through WhatsApp messaging
- **Voice-to-Text Processing**: Advanced transcription capabilities for voice messages
- **Web Frontend Chatbot**: Dedicated web interface for legal consultations
- **Legal Document Processing**: AI-powered analysis of legal documents
- **Multi-channel Support**: Consistent experience across platforms

## 🏗️ Architecture

The project consists of two main components:

### Backend (FastAPI)

- **API Endpoints**: RESTful services for WhatsApp webhook and chat functionality
- **Message Processing**: Intelligent routing and processing of user messages
- **Transcription Service**: Voice message transcription using Whisper
- **Legal Knowledge Base**: FAISS-powered vector database for legal document retrieval
- **WhatsApp Business API Integration**: Direct integration with Meta's WhatsApp Business Platform

### Frontend (Next.js)

- **Web Chatbot Interface**: User-friendly chat interface for legal consultations
- **Lawyer Directory**: Browse and connect with legal professionals
- **Document Management**: Upload and manage legal documents
- **Pro Bono Services**: Connect users with pro bono legal assistance
- **Authentication System**: Secure user registration and login

## 🚀 Current Implementation Status

### ✅ Completed Features

- [x] WhatsApp webhook integration
- [x] Voice message transcription (Whisper integration)
- [x] Text message processing
- [x] Basic FastAPI backend structure
- [x] Next.js frontend framework setup
- [x] FAISS vector database integration
- [x] Legal document processing (Motor Traffic Law)

### 🚧 In Development

- [ ] Advanced legal query processing
- [ ] Multi-document legal knowledge base
- [ ] User authentication and sessions
- [ ] Lawyer recommendation system
- [ ] Pro bono matching algorithm
- [ ] Advanced chat features (file uploads, rich media)
- [ ] Legal document generation
- [ ] Case management features

## 🛠️ Technology Stack

### Backend

- **Framework**: FastAPI
- **Language**: Python 3.13
- **AI/ML**: OpenAI Whisper, FAISS, LangChain
- **Database**: Vector database (FAISS)
- **External APIs**: WhatsApp Business API
- **Audio Processing**: Speech-to-text transcription

### Frontend

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui
- **State Management**: React Hooks
- **Authentication**: Custom implementation (planned)

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- WhatsApp Business API access
- FAISS dependencies
- OpenAI API key (for enhanced features)

## 🚦 Quick Start

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Configure your environment variables
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing

The project includes comprehensive unit and integration tests to ensure reliability and maintainability.

### Running Tests

```bash
# Install test dependencies (if not already installed)
pip install -r requirements.txt

# Run all tests
pytest

# Run tests with coverage report
pytest --cov=app --cov-report=html

# Run only unit tests
pytest tests/unit/

# Run only integration tests
pytest tests/integration/

# Run specific test file
pytest tests/unit/test_whatsapp_service.py

# Run with verbose output
pytest -v
```

### Test Structure

```
tests/
├── conftest.py              # Test configuration and fixtures
├── pytest.ini              # Pytest settings
├── unit/                    # Unit tests
│   ├── test_whatsapp_service.py
│   ├── test_transcription_service.py
│   └── test_message_processor.py
├── integration/             # Integration tests
│   └── test_whatsapp_webhook.py
└── fixtures/                # Test data and mocks
    ├── whatsapp_fixtures.py
    └── mock_services.py
```

### Test Coverage

The test suite covers:

- **WhatsApp Service**: Message sending, media download, error handling
- **Transcription Service**: Audio processing, error scenarios
- **Message Processor**: Text/voice message routing, error handling
- **API Endpoints**: Webhook verification, message processing, error responses
- **Edge Cases**: Invalid inputs, network failures, malformed data

## 📞 Usage

### WhatsApp Integration

1. Send text messages for legal queries
2. Send voice messages for hands-free interaction
3. Receive intelligent legal guidance and document analysis

### Web Interface

1. Visit the web application
2. Start a chat session with Kakille AI
3. Browse lawyer directory
4. Access pro bono services

## 🤝 Contributing

This project is in active development. Contributions are welcome! Please see [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development setup and guidelines.

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Team

Developed by the Kakille AI team - Making legal expertise accessible to everyone.

---

**Note**: This is a development version. Features and functionality are subject to change as the project evolves.
