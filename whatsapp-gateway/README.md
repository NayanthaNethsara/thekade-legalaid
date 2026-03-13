# WhatsApp Gateway

A NestJS-based gateway service that bridges WhatsApp Cloud API with AI workers through NATS JetStream message queues.

## Overview

This service handles bidirectional message flow between WhatsApp and AI processing systems:

- Receives incoming WhatsApp messages via webhook
- Validates Meta webhook signatures
- Routes text messages to NATS JetStream incoming topic for AI processing
- Routes media files (image, video, audio, document) to Azure Blob Storage and file metadata topic for AI processing
- Consumes responses from NATS JetStream outgoing topic
- Sends processed messages back to WhatsApp users

## Architecture

```
WhatsApp Cloud API
        |
        v
   [Webhook Endpoint]
        |
        v
  [Signature Validation]
        |
        v
   [Message Router]
        |
        +-- Text Message --> [NATS JetStream Incoming Topic] --> AI Worker
        |
        +-- Media Files --> [Download from WhatsApp] --> [Upload to Azure Blob] --> [NATS JetStream Incoming File Topic] --> AI Worker

AI Worker --> [NATS JetStream Outgoing Topic] --> [NATS JetStream Consumer] --> WhatsApp Cloud API
```

## Technology Stack

- NestJS 11.x
- Fastify (HTTP adapter)
- TypeScript (strict mode)
- nats (NATS JetStream client)
- @azure/storage-blob (Azure Blob Storage)
- WhatsApp Cloud API v21.0
- Pino (logging)

## Prerequisites

- Node.js 18+ or 20+
- pnpm package manager
- NATS JetStream cluster (or local instance)
- Azure Storage Account
- Meta Developer account
- WhatsApp Business API access

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000

# Meta Webhook Verification
META_VERIFY_TOKEN=your_verify_token
META_APP_SECRET=your_app_secret

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# NATS JetStream Configuration
NATS_URL=nats://localhost:4222
NATS_SUBJECT_INCOMING=whatsapp.incoming.messages
NATS_SUBJECT_INCOMING_FILE=whatsapp.incoming.files
NATS_SUBJECT_OUTGOING=whatsapp.outgoing.messages

# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_CONTAINER_NAME=whatsapp-media
```

## Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Running the Application

```bash
# Development mode with watch
pnpm start:dev

# Production mode
pnpm start:prod

# Debug mode
pnpm start:debug
```

## API Endpoints

### Webhook Verification (GET /webhook)

Meta webhook verification endpoint.

**Query Parameters:**

- `hub.mode`: Must be "subscribe"
- `hub.verify_token`: Must match META_VERIFY_TOKEN
- `hub.challenge`: Challenge string to echo back

### Webhook Events (POST /webhook)

Receives WhatsApp webhook events.

**Headers:**

- `x-hub-signature-256`: HMAC SHA-256 signature for verification

**Body:**

- WhatsApp webhook payload

### Health Check (GET /health)

Returns service health status.

## Message Flow

### Incoming Messages

1. WhatsApp user sends a message
2. Meta sends webhook POST request
3. Service validates signature using META_APP_SECRET
4. **Text messages:**
   - Sent to NATS JetStream incoming topic for AI processing
   - Message marked as read with typing indicator
5. **Media files (image, video, audio, document):**
   - Downloaded from WhatsApp Cloud API
   - Uploaded to Azure Blob Storage container
   - Blob URL and metadata sent to NATS JetStream incoming file topic
   - Message marked as read with typing indicator

### Outgoing Messages

1. AI worker processes incoming message
2. AI worker sends response to NATS JetStream outgoing topic
3. NATS JetStream consumer reads the message
4. Message is normalized and sent via WhatsApp API
5. Successful messages are logged

## Message Format

### Incoming Topic (to AI Worker)

```json
{
  "messageId": "wamid.xxx",
  "from": "1234567890",
  "to": "0987654321",
  "timestamp": "1699876543",
  "type": "text",
  "content": {
    "text": "Hello"
  },
  "metadata": {
    "phoneNumberId": "123456789",
    "displayPhoneNumber": "+1234567890"
  }
}
```

### Outgoing Topic (from AI Worker)

Supports multiple formats:

```json
{
  "to": "1234567890",
  "type": "text",
  "content": {
    "text": "Response message"
  }
}
```

## Project Structure

```
src/
├── common/              # Shared utilities
│   ├── filters/        # Exception filters
│   └── logger/         # Logging configuration
├── config/             # Configuration management
├── modules/
│   ├── azure/          # Azure Blob Storage service
│   ├── health/         # Health check endpoint
│   ├── nats/          # NATS JetStream producers and consumers
│   │   ├── dto/        # NATS JetStream message DTOs
│   │   └── ...
│   ├── webhook/        # WhatsApp webhook handlers
│   └── whatsapp/       # WhatsApp API service
├── types/             # Shared TypeScript types
│   ├── fastify.d.ts  # Fastify type augmentation
│   └── whatsapp.types.ts # WhatsApp API types
└── main.ts           # Application entry point
```

## Development

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm build
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

## NATS JetStream Setup

Ensure you have a NATS JetStream broker running and accessible via `NATS_URL`. The service will automatically connect to the broker.

The topics specified in `.env` should exist or be auto-created by the broker (depending on broker configuration).

## Azure Setup

1. Create an Azure Storage Account.
2. Get the Connection String from "Access keys".
3. Create a Container (e.g., `whatsapp-media`) with appropriate access level (usually Blob or Container level if direct access is needed, or Private if accessed only via SAS - current implementation assumes public read for simplicity but can be updated).
4. Update `.env` with `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_CONTAINER_NAME`.

## WhatsApp Setup

### Webhook Configuration

1. Go to Meta Developer Console
2. Navigate to WhatsApp > Configuration
3. Set Callback URL: `https://your-domain.com/webhook`
4. Set Verify Token: Same as META_VERIFY_TOKEN
5. Subscribe to webhook fields: `messages`

### Required Permissions

- `whatsapp_business_messaging`
- `whatsapp_business_management`

## Logging

The service uses Pino for structured logging with the following levels:

- `error`: Error messages and stack traces
- `warn`: Warning messages
- `log`: General information
- `debug`: Detailed debugging information

Logs are output in JSON format for production environments.

## License

UNLICENSED
