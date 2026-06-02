# Outgoing Message Queue

The contract for messages a producer (e.g. `core-service` or an AI worker)
publishes for the gateway to deliver to a WhatsApp user. The gateway consumes
these, normalizes them, and calls the WhatsApp Cloud API.

Direction is the mirror of [incoming-queues.md](incoming-queues.md): there, the
gateway publishes; here, the gateway consumes. DTOs:
[nats-message.dto.ts](../src/modules/nats/dto/nats-message.dto.ts). Consumer:
[outgoing-message-consumer.ts](../src/modules/nats/outgoing-message-consumer.ts).

## Stream and subject

All outgoing messages, regardless of type, are published to a single subject on
the `LEGALAID_EVENTS` stream:

| Subject | Carries |
| --- | --- |
| `whatsapp.outgoing` | every type: `text`, `image`, `video`, `audio`, `document`, `interactive`, `template` |

One format, one subject. The gateway consumes it and dispatches on the payload's
`type`. Configurable via `NATS_SUBJECT_OUTGOING`; the value above is the default.

### Encoding and delivery

- Payload is the DTO as UTF-8 JSON.
- A payload missing `to`, or with an unknown `type`, is logged and dropped.
- The gateway calls the WhatsApp send API per type; failures are logged.

## Common envelope

Every format shares this envelope:

| Field | Type | Description |
| --- | --- | --- |
| `to` | string | Recipient WhatsApp id / phone number, international format. |
| `type` | string | Discriminator (below). Selects which `content` shape applies. |
| `content` | object | Type-specific payload. |
| `replyToMessageId` | string (optional) | Reserved to quote an earlier message. Accepted but not yet relayed. |

## Formats

### text

`content: { text }`. This is the shape `core-service` publishes for OTP and
chat replies.

```json
{ "to": "94771234567", "type": "text", "content": { "text": "Your code is 123456" } }
```

### image / video

`content`: one of `mediaUrl` (public link) or `mediaId` (pre-uploaded asset),
plus optional `caption`.

```json
{
  "to": "94771234567",
  "type": "image",
  "content": { "mediaUrl": "https://example.com/diagram.png", "caption": "See attached" }
}
```

### audio

Same as image/video but **no caption** (WhatsApp does not support audio
captions).

```json
{ "to": "94771234567", "type": "audio", "content": { "mediaId": "1234567890" } }
```

### document

`content`: `mediaUrl` or `mediaId`, plus optional `caption` and `filename`.

```json
{
  "to": "94771234567",
  "type": "document",
  "content": {
    "mediaUrl": "https://example.com/guide.pdf",
    "filename": "legal-aid-guide.pdf"
  }
}
```

### interactive

`content: { interactive }`. Use for reply buttons or list menus. `body.text` is
required.

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "button",
      "body": { "text": "Do you want to continue?" },
      "action": {
        "buttons": [
          { "type": "reply", "reply": { "id": "confirm_yes", "title": "Yes" } },
          { "type": "reply", "reply": { "id": "confirm_no", "title": "No" } }
        ]
      }
    }
  }
}
```

The `reply.id` you set here is what comes back on the incoming side as
`replyId` (see [incoming-queues.md](incoming-queues.md)), which closes the loop
for deterministic intent routing. List menus use `action.button` +
`action.sections[]` instead of `buttons`.

### template

`content: { template }`. Required to start a conversation outside the 24-hour
customer service window. `name` and `language` are required.

```json
{
  "to": "94771234567",
  "type": "template",
  "content": {
    "template": {
      "name": "appointment_reminder",
      "language": "en",
      "components": [
        {
          "type": "body",
          "parameters": [{ "type": "text", "text": "Tomorrow at 10am" }]
        }
      ]
    }
  }
}
```

## How a reference resolves to a send

For media, the gateway passes `mediaUrl ?? mediaId` to the WhatsApp API. A value
starting with `http` is sent as a `link`; otherwise it is treated as a
pre-uploaded media `id`.

## Producer notes

- Set `to` and a valid `type` on every message, or it is dropped.
- Publish every type to the one subject, `whatsapp.outgoing`.
- Provide exactly one media reference (`mediaUrl` or `mediaId`).
- Keep `reply.id` values stable and meaningful — they return as `replyId`.
