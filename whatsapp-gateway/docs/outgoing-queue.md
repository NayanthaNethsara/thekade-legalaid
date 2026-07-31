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
the `KAKILLE_AGENT_EVENTS` stream:

| Subject | Carries |
| --- | --- |
| `whatsapp.outgoing` | every type: `text`, `image`, `video`, `audio`, `document`, `sticker`, `location`, `contacts`, `reaction`, `interactive`, `template` |

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
| `replyToMessageId` | string (optional) | Quote an earlier message. Relayed as the WhatsApp `context` field on every type except `reaction` (which targets a message via `content.messageId`). |

## Formats

### text

`content: { text, previewUrl? }`. This is the shape `core-service` publishes
for OTP and chat replies. Set `previewUrl: true` to render a link preview for
the first URL in the text.

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

### sticker

Same as image/video but no caption. WebP only: static up to 100KB, animated up
to 500KB.

```json
{ "to": "94771234567", "type": "sticker", "content": { "mediaUrl": "https://example.com/sticker.webp" } }
```

### location

`content`: `latitude` and `longitude` (numbers, required), optional `name` and
`address`.

```json
{
  "to": "94771234567",
  "type": "location",
  "content": {
    "latitude": 6.9271,
    "longitude": 79.8612,
    "name": "Kakille HQ",
    "address": "Colombo, Sri Lanka"
  }
}
```

### contacts

`content: { contacts: [...] }`. Each card requires `name.formattedName`; phone
entries may carry `waId` to make the number tappable into a WhatsApp chat.

```json
{
  "to": "94771234567",
  "type": "contacts",
  "content": {
    "contacts": [
      {
        "name": { "formattedName": "Kakille Support", "firstName": "Kakille" },
        "phones": [{ "phone": "+94112345678", "type": "WORK", "waId": "94112345678" }],
        "urls": [{ "url": "https://www.kakille.ai", "type": "WORK" }]
      }
    ]
  }
}
```

### reaction

`content: { messageId, emoji }`. Reacts to the message identified by
`messageId` (the WhatsApp message id from the incoming queue). Send an empty
`emoji` string to remove a previous reaction.

```json
{ "to": "94771234567", "type": "reaction", "content": { "messageId": "wamid.HBg...", "emoji": "👍" } }
```

### interactive

`content: { interactive }` where `interactive.type` selects the variant:
`button`, `list`, `cta_url`, `location_request_message`, `carousel`,
`address_message`, `flow`, or `call_permission_request`.
`body.text` is always required. For media headers and cards, reference media
with `mediaUrl` or `mediaId`; the gateway normalizes to the WhatsApp
`link`/`id` wire format.

#### button — up to 3 reply buttons

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
for deterministic intent routing.

An optional `header` may be added: `{ "type": "text", "text": "..." }` or
`{ "type": "image" | "video" | "document", "mediaUrl": "..." }`.

#### list — menu with up to 10 rows across sections

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "list",
      "body": { "text": "Pick a category" },
      "action": {
        "button": "Browse",
        "sections": [
          {
            "title": "Gifts",
            "rows": [
              { "id": "cat_flowers", "title": "Flowers", "description": "Fresh bouquets" },
              { "id": "cat_cakes", "title": "Cakes" }
            ]
          }
        ]
      }
    }
  }
}
```

#### cta_url — single product card with an image and a link button

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "cta_url",
      "header": { "type": "image", "mediaUrl": "https://cdn.kakille.ai/p/rose-bouquet.jpg" },
      "body": { "text": "Rose Bouquet - Rs. 4,500\nFree delivery in Colombo." },
      "footer": { "text": "Kakille" },
      "action": { "displayText": "View product", "url": "https://www.kakille.ai/p/rose-bouquet" }
    }
  }
}
```

#### location_request_message — ask the user to share their location

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "location_request_message",
      "body": { "text": "Share your delivery location" }
    }
  }
}
```

#### carousel — up to 10 scrollable media cards (product gallery)

Each card requires an `image` or `video` header. Give every card either a
`ctaUrl` (tap opens a link) or `buttons` (quick replies); all cards in one
carousel must use the same kind. Requires Graph API v23.0+ (the gateway
already targets it).

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "carousel",
      "body": { "text": "Here are some gifts you might like:" },
      "cards": [
        {
          "header": { "type": "image", "mediaUrl": "https://cdn.kakille.ai/p/rose-bouquet.jpg" },
          "body": { "text": "Rose Bouquet - Rs. 4,500" },
          "ctaUrl": { "displayText": "View product", "url": "https://www.kakille.ai/p/rose-bouquet" }
        },
        {
          "header": { "type": "image", "mediaUrl": "https://cdn.kakille.ai/p/choc-cake.jpg" },
          "body": { "text": "Chocolate Cake 1kg - Rs. 3,200" },
          "ctaUrl": { "displayText": "View product", "url": "https://www.kakille.ai/p/choc-cake" }
        }
      ]
    }
  }
}
```

#### address_message — ask the user for a delivery address

`action.country` (ISO 3166-1 alpha-2) is required. Optional `values` pre-fills
the address form; `savedAddresses` offers previously captured addresses.
WhatsApp supports this only in selected markets (currently India and
Singapore).

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "address_message",
      "body": { "text": "Where should we deliver your order?" },
      "action": {
        "country": "IN",
        "values": { "name": "Nayantha", "phone_number": "+94771234567" }
      }
    }
  }
}
```

#### flow — launch a WhatsApp Flow

`action.cta` (button label) plus exactly one of `flowId` or `flowName` are
required. `flowAction` defaults to `navigate` (open `screen` with optional
initial `data`); use `data_exchange` for endpoint-driven Flows. `mode:
"draft"` lets you test an unpublished Flow.

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "flow",
      "header": { "type": "text", "text": "Delivery details" },
      "body": { "text": "Tell us when and where to deliver." },
      "action": {
        "cta": "Fill in details",
        "flowId": "1234567890",
        "flowToken": "order-5512",
        "screen": "DELIVERY_FORM",
        "data": { "order_id": "5512" }
      }
    }
  }
}
```

The Flow response arrives on the webhook as an interactive `nfm_reply` with
`flowToken` echoed back, so keep tokens meaningful (e.g. an order id).

#### call_permission_request — ask the user to allow a business call

Part of the WhatsApp Business Calling API; the recipient gets an
allow/decline prompt for receiving calls from your number.

```json
{
  "to": "94771234567",
  "type": "interactive",
  "content": {
    "interactive": {
      "type": "call_permission_request",
      "body": { "text": "Can our support team call you about your order?" }
    }
  }
}
```

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
- Provide exactly one media reference (`mediaUrl` or `mediaId`); this applies
  to media messages, interactive headers, and carousel cards alike.
- `mediaUrl` must be a publicly reachable HTTPS link; WhatsApp fetches it.
- Keep `reply.id` values stable and meaningful — they return as `replyId`.
- Set `replyToMessageId` to quote the message you are answering.
