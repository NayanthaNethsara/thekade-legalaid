# AI Legal Assistant Frontend

This is the frontend implementation of the AI Legal Assistant chatbot for TheKade Legal Aid platform, built with Next.js, TypeScript, and shadcn/ui components.

## 🚀 Features

### Chatbot Interface
- **Modern UI**: Clean, professional interface using shadcn/ui components
- **Real-time Chat**: Instant messaging with AI assistant
- **Floating Dock Icon**: Easily accessible round chat icon on homepage
- **Minimize/Maximize**: Toggle between full chat and minimized view
- **Message History**: Persistent conversation during session
- **Typing Indicators**: Visual feedback during AI response generation
- **Error Handling**: Graceful error handling with user-friendly messages

### AI Integration
- **Python Backend**: Connects to Python/Jupyter backend API
- **Legal Expertise**: Specialized for legal questions and analysis
- **Document Analysis**: Upload and analyze legal documents
- **Case Research**: Search legal databases and precedents
- **Multi-format Support**: Text, document, and structured data analysis

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Mode**: Automatic theme switching
- **Accessibility**: ARIA labels and keyboard navigation
- **Professional Styling**: Legal industry-appropriate design
- **Performance Optimized**: Fast loading and smooth interactions

## 🛠️ Technical Stack

- **Framework**: Next.js 15 with TypeScript
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS with CSS variables
- **Icons**: Lucide React
- **State Management**: React useState/useEffect
- **API Client**: Custom TypeScript API client
- **Build Tool**: Turbopack (Next.js)

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.tsx                    # Main homepage with chatbot integration
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles and theme variables
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── ai-legal-assistant.tsx      # Main chatbot component
│   └── chat-dock-icon.tsx         # Floating chat icon
├── lib/
│   ├── utils.ts                    # Utility functions (cn, etc.)
│   └── api.ts                      # API client and types
└── .env.local                      # Environment configuration
```

## 🎨 Components Overview

### AILegalAssistant Component
The main chatbot interface featuring:
- **Message Display**: Scrollable chat history with user/assistant messages
- **Input System**: Text input with send button and keyboard shortcuts
- **Status Indicators**: Online status, typing indicators, error states
- **Window Controls**: Minimize, maximize, and close functionality
- **Professional UI**: Legal-themed design with appropriate colors and icons

### ChatDockIcon Component
Floating action button featuring:
- **Round Design**: Professional circular icon with legal scales
- **Animations**: Hover effects, pulse animations, and smooth transitions
- **Notifications**: Badge for unread message counts
- **Tooltip**: Helpful text on hover
- **State Management**: Visual indication of open/closed state

### API Integration
Comprehensive API client with:
- **Type Safety**: Full TypeScript types for all requests/responses
- **Error Handling**: Robust error catching and user-friendly messages
- **Timeout Management**: Prevents hanging requests
- **Response Validation**: Ensures data integrity
- **Multiple Endpoints**: Chat, document analysis, case research

## 🔧 Configuration

### Environment Variables
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Feature Flags
NEXT_PUBLIC_ENABLE_DOCUMENT_UPLOAD=true
NEXT_PUBLIC_ENABLE_CASE_RESEARCH=true

# Chat Settings
NEXT_PUBLIC_MAX_MESSAGE_LENGTH=2000
NEXT_PUBLIC_CHAT_TIMEOUT=30000
```

### API Endpoints
The frontend expects these Python backend endpoints:

```python
# Chat endpoint
POST /api/chat
{
  "message": "string",
  "conversation_id": "string",
  "context": "string" (optional)
}

# Document analysis
POST /api/document-analysis
{
  "document_text": "string",
  "document_type": "string" (optional)
}

# Legal analysis
POST /api/legal-analysis
{
  "text": "string",
  "analysis_type": "contract|case|statute|general",
  "jurisdiction": "string" (optional)
}

# Case research
POST /api/case-research
{
  "query": "string",
  "jurisdiction": "string" (optional)
}

# Health check
GET /api/health
```

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API URL
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Application**
   - Open http://localhost:3000
   - Click the floating chat icon to open the AI assistant
   - Start chatting with the legal AI

## 🎯 Usage Examples

### Basic Chat
```typescript
// User types: "What are my rights as a tenant?"
// AI responds with legal information about tenant rights
```

### Document Analysis
```typescript
// User uploads a contract
// AI analyzes and provides summary, key clauses, potential issues
```

### Case Research
```typescript
// User asks: "Find cases about employment discrimination"
// AI searches legal databases and returns relevant precedents
```

## 🔒 Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **API Security**: Secure communication with backend APIs
- **Error Boundaries**: Graceful error handling prevents crashes
- **Content Security**: No execution of user-provided code
- **Privacy**: No sensitive data stored in frontend

## 📱 Responsive Design

The chatbot is fully responsive and works across:
- **Desktop**: Full-featured interface with all controls
- **Tablet**: Optimized layout for touch interaction
- **Mobile**: Compact design that doesn't obstruct content

## 🎨 Theming

Uses CSS variables for consistent theming:
- **Light Mode**: Professional blue and white color scheme
- **Dark Mode**: Dark background with accessible contrast
- **Legal Branding**: Colors and icons appropriate for legal industry

## 🔄 State Management

- **Local State**: React useState for component state
- **Message History**: Maintained during browser session
- **API State**: Loading, error, and success states
- **UI State**: Open/closed, minimized, notification states

## 🧪 Testing Recommendations

1. **Unit Tests**: Test individual components
2. **Integration Tests**: Test API communication
3. **E2E Tests**: Test complete user workflows
4. **Accessibility Tests**: Ensure WCAG compliance
5. **Performance Tests**: Test loading and response times

## 📈 Performance Optimizations

- **Code Splitting**: Automatic code splitting with Next.js
- **Image Optimization**: Optimized images and icons
- **Bundle Analysis**: Minimized bundle size
- **Lazy Loading**: Components loaded as needed
- **Caching**: Appropriate caching strategies

## 🔧 Customization

### Adding New Features
1. Create new components in `/components`
2. Add API endpoints in `/lib/api.ts`
3. Update types and interfaces
4. Test thoroughly

### Styling Changes
1. Modify `/app/globals.css` for global styles
2. Update component-specific styles
3. Maintain accessibility standards

### API Integration
1. Update API client in `/lib/api.ts`
2. Add new TypeScript types
3. Update error handling
4. Test with backend

## 🐛 Troubleshooting

### Common Issues
1. **API Connection Failed**: Check backend server and CORS settings
2. **Components Not Loading**: Verify shadcn/ui installation
3. **Styling Issues**: Check Tailwind CSS configuration
4. **TypeScript Errors**: Verify all types are properly defined

### Debug Mode
Enable debug logging by setting:
```env
NEXT_PUBLIC_DEBUG=true
```

## 📚 Dependencies

### Core Dependencies
- **next**: React framework
- **react**: UI library
- **typescript**: Type safety
- **tailwindcss**: Styling
- **lucide-react**: Icons

### UI Dependencies
- **@radix-ui/react-***: Accessible UI primitives
- **class-variance-authority**: Component variants
- **clsx**: Conditional classes
- **tailwind-merge**: Class merging

## 🤝 Contributing

1. Follow TypeScript best practices
2. Maintain component documentation
3. Test all new features
4. Follow existing code style
5. Update this README when adding features

## 📄 License

This project is part of TheKade Legal Aid platform. All rights reserved.