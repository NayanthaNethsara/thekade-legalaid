# Talvin WhatsApp Gateway

A NestJS-based gateway service that bridges WhatsApp Cloud API with AI workers through AWS SQS message queues.

## Overview

This service handles bidirectional message flow between WhatsApp and AI processing systems:

- Receives incoming WhatsApp messages via webhook
- Validates Meta webhook signatures
- Routes text messages to SQS incoming queue for AI processing
- Routes media files (image, video, audio, document) to S3 and file queue for AI processing
- Consumes responses from SQS outgoing queue
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
        +-- Text Message --> [SQS Incoming Queue] --> AI Worker
        |
        +-- Media Files --> [Download from WhatsApp] --> [Upload to S3] --> [SQS Incoming File Queue] --> AI Worker

AI Worker --> [SQS Outgoing Queue] --> [SQS Consumer] --> WhatsApp Cloud API
```

## Technology Stack

- NestJS 11.x
- Fastify (HTTP adapter)
- TypeScript (strict mode)
- AWS SDK v3 (SQS)
- WhatsApp Cloud API v21.0
- Pino (logging)

## Prerequisites

- Node.js 18+ or 20+
- pnpm package manager
- AWS account with SQS access
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

# AWS Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# SQS Queue URLs (FIFO queues)
INCOMING_QUEUE_URL=https://sqs.region.amazonaws.com/account-id/incoming-queue.fifo
OUTGOING_QUEUE_URL=https://sqs.region.amazonaws.com/account-id/outgoing-queue.fifo
INCOMING_FILE_QUEUE_URL=https://sqs.region.amazonaws.com/account-id/incoming-file-queue.fifo

# S3 Bucket for media files
AWS_S3_BUCKET_NAME=your-media-bucket-name
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
   - Sent to SQS incoming queue for AI processing
   - Message marked as read with typing indicator
5. **Media files (image, video, audio, document):**
   - Downloaded from WhatsApp Cloud API
   - Uploaded to S3 bucket
   - S3 URL sent to SQS incoming file queue for AI processing
   - Message marked as read with typing indicator

### Outgoing Messages

1. AI worker processes incoming message
2. AI worker sends response to SQS outgoing queue
3. SQS consumer polls the queue
4. Message is normalized and sent via WhatsApp API
5. Successfully sent messages are deleted from queue
6. Failed messages have extended visibility timeout for retry

## Message Format

### Incoming Queue (to AI Worker)

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

### Outgoing Queue (from AI Worker)

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

Or legacy format:

```json
{
  "recipient": "1234567890",
  "text": "Response message"
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
│   ├── aws/           # AWS client provider
│   ├── health/        # Health check endpoint
│   ├── sqs/           # SQS producers and consumers
│   ├── webhook/       # WhatsApp webhook handlers
│   └── whatsapp/      # WhatsApp API service
├── types/             # Shared TypeScript types
│   ├── fastify.d.ts  # Fastify type augmentation
│   ├── sqs.types.ts  # SQS message types
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

## AWS SQS Setup

### Queue Configuration

Both queues must be FIFO queues:

1. Create incoming queue: `talvin-wa-incoming-messages.fifo`
2. Create outgoing queue: `talvin-wa-outgoing-messages.fifo`

### IAM Permissions

Required permissions for the service:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:DeleteMessageBatch",
        "sqs:ChangeMessageVisibility"
      ],
      "Resource": ["arn:aws:sqs:region:account-id:queue-name.fifo"]
    }
  ]
}
```

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

## Error Handling

### Webhook Signature Validation

- Invalid signatures return 403 Forbidden
- Missing signatures return 403 Forbidden

### Message Processing

- Invalid message formats are logged and deleted from queue
- Failed WhatsApp API calls trigger retry via SQS visibility timeout
- Malformed JSON is caught and logged

### SQS Polling

- Continuous long polling (20 second wait time)
- Automatic retry on connection errors
- Batch processing with error isolation

## Troubleshooting

### Webhook Not Receiving Messages

- Verify webhook URL is publicly accessible
- Check META_VERIFY_TOKEN matches Meta configuration
- Verify signature validation is working

### SQS Messages Not Processing

- Check AWS credentials and permissions
- Verify queue URLs are correct
- Check queue visibility timeout settings

### WhatsApp API Errors

- Verify WHATSAPP_ACCESS_TOKEN is valid
- Check WHATSAPP_PHONE_NUMBER_ID is correct
- Review Meta API error responses in logs

## License

UNLICENSED
