# WhatsApp Gateway

A NestJS-based gateway service that bridges WhatsApp Cloud API with AI workers through NATS JetStream message queues.

## Documentation

- [WhatsApp Webhook Reference](docs/whatsapp-webhook.md) — what Meta sends and the inbound DTO.
- [Incoming Message Queues](docs/incoming-queues.md) — the normalized contract published to NATS (subjects, envelope, per-type payloads).

## Overview

This service handles bidirectional message flow between WhatsApp and AI processing systems:

- Receives incoming WhatsApp messages via webhook
- Validates Meta webhook signatures
- Normalizes each incoming message into a standardized format (text, image, video, audio, document) and publishes it to a dedicated NATS JetStream subject
- Forwards media as a WhatsApp `mediaId` plus metadata; downstream consumers fetch the bytes
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
        +-- Text  --> [NATS JetStream whatsapp.incoming.text] --> AI Worker
        |
        +-- Media --> [NATS JetStream whatsapp.incoming.{image,video,audio,document}] --> AI Worker

AI Worker --> [NATS JetStream Outgoing Topic] --> [NATS JetStream Consumer] --> WhatsApp Cloud API
```

## Technology Stack

- NestJS 11.x
- Fastify (HTTP adapter)
- TypeScript (strict mode)
- nats (NATS JetStream client)
- WhatsApp Cloud API v21.0
- Pino (logging)

## Prerequisites

- Node.js 18+ or 20+
- pnpm package manager
- NATS JetStream cluster (or local instance)
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
NATS_SUBJECT_INCOMING_TEXT=whatsapp.incoming.text
NATS_SUBJECT_INCOMING_IMAGE=whatsapp.incoming.image
NATS_SUBJECT_INCOMING_VIDEO=whatsapp.incoming.video
NATS_SUBJECT_INCOMING_AUDIO=whatsapp.incoming.audio
NATS_SUBJECT_INCOMING_DOCUMENT=whatsapp.incoming.document
NATS_SUBJECT_OUTGOING_TEXT=whatsapp.outgoing.text
NATS_SUBJECT_OUTGOING_MEDIA=whatsapp.outgoing.media
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

### Webhook Verification (GET /whatsapp/webhooks)

Meta webhook verification endpoint.

**Query Parameters:**

- `hub.mode`: Must be "subscribe"
- `hub.verify_token`: Must match META_VERIFY_TOKEN
- `hub.challenge`: Challenge string to echo back

### Webhook Events (POST /whatsapp/webhooks)

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
4. The message is normalized into one of the standardized incoming formats and
   published to a dedicated NATS subject per type:

   | Type | Subject | Notes |
   | --- | --- | --- |
   | `text` | `whatsapp.incoming.text` | Plain text, interactive button/list replies, and template quick replies are all normalized here (see `source`) |
   | `image` | `whatsapp.incoming.image` | Carries `mediaId` and `caption` |
   | `video` | `whatsapp.incoming.video` | Carries `mediaId` and `caption` |
   | `audio` | `whatsapp.incoming.audio` | Carries `mediaId`; `voice` flags voice notes |
   | `document` | `whatsapp.incoming.document` | Carries `mediaId` and `filename` |

5. The message is marked as read with a typing indicator.
6. **Media types** (image, video, audio, document) forward the WhatsApp
   `mediaId` and content metadata only — the gateway does not download or store
   the bytes. A downstream consumer is responsible for fetching the media via
   the WhatsApp Cloud API using `mediaId`.

### Outgoing Messages

1. AI worker processes incoming message
2. AI worker sends response to NATS JetStream outgoing topic
3. NATS JetStream consumer reads the message
4. Message is normalized and sent via WhatsApp API
5. Successful messages are logged

## Message Format

### Incoming Topics (to AI Worker)

All incoming formats share a common envelope (`messageId`, `from`, `to`,
`timestamp`, `contactName`, `context`, `metadata`) and add type-specific fields.

**Text** (`whatsapp.incoming.text`) — covers plain text plus button/list/quick replies:

```json
{
  "messageId": "wamid.xxx",
  "from": "1234567890",
  "to": "0987654321",
  "timestamp": "1699876543",
  "contactName": "Jane Doe",
  "context": null,
  "type": "text",
  "text": "Hello",
  "source": "text",
  "replyId": null,
  "metadata": {
    "phoneNumberId": "123456789",
    "displayPhoneNumber": "+1234567890"
  }
}
```

`source` is one of `text`, `button_reply`, `list_reply`, `quick_reply`. For
interactive/quick replies, `replyId` holds the tapped button or list-row id.

**Image / Video** (`whatsapp.incoming.image`, `whatsapp.incoming.video`):

```json
{
  "messageId": "wamid.xxx",
  "from": "1234567890",
  "to": "0987654321",
  "timestamp": "1699876543",
  "contactName": "Jane Doe",
  "context": null,
  "type": "image",
  "mediaId": "media-id",
  "mimeType": "image/jpeg",
  "sha256": "…",
  "caption": "optional caption",
  "metadata": {
    "phoneNumberId": "123456789",
    "displayPhoneNumber": "+1234567890"
  }
}
```

**Audio** (`whatsapp.incoming.audio`) — same media envelope, with `voice` instead
of `caption`:

```json
{
  "type": "audio",
  "mediaId": "media-id",
  "mimeType": "audio/ogg",
  "sha256": "…",
  "voice": true
}
```

**Document** (`whatsapp.incoming.document`) — media envelope with `caption` and
`filename`.

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

## WhatsApp Setup

### Webhook Configuration

1. Go to Meta Developer Console
2. Navigate to WhatsApp > Configuration
3. Set Callback URL: `https://your-domain.com/whatsapp/webhooks`
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
