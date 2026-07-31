# Incoming Message Queues

The contract for messages the gateway publishes to NATS JetStream after
normalizing an inbound WhatsApp webhook. This is what a consumer reads.

For the inbound side (what WhatsApp sends the gateway), see
[whatsapp-webhook.md](whatsapp-webhook.md). DTOs:
[nats-message.dto.ts](../src/modules/nats/dto/nats-message.dto.ts).

## Stream and subjects

All formats are published to a single JetStream stream, `KAKILLE_AGENT_EVENTS`, on a
dedicated subject per type:

| Subject | Format | Source webhook types |
| --- | --- | --- |
| `whatsapp.incoming.text` | text | `text`, `interactive`, `button` |
| `whatsapp.incoming.media.image` | image | `image` |
| `whatsapp.incoming.media.video` | video | `video` |
| `whatsapp.incoming.media.audio` | audio | `audio` |
| `whatsapp.incoming.media.document` | document | `document` |

Subjects are configurable via env (`NATS_SUBJECT_INCOMING_*`); the values above
are the defaults.

### Choosing a subscription scope

The hierarchy lets a consumer pick its granularity with one filter subject:

| To consume | Filter subject |
| --- | --- |
| Only images | `whatsapp.incoming.media.image` |
| All media (image+video+audio+document) | `whatsapp.incoming.media.>` |
| Everything incoming (text + media) | `whatsapp.incoming.>` |

### Encoding and delivery

- Payload is the DTO as UTF-8 JSON (`JSON.stringify`).
- Published with JetStream `publish` (persisted, at-least-once).
- Consumers should be idempotent on `messageId` — JetStream can redeliver.

## Shared envelope

Every format starts with the same envelope. Fields are always present; nullable
fields are explicit `null` (never omitted).

| Field | Type | Description |
| --- | --- | --- |
| `messageId` | string | WhatsApp message id. Use for dedup and read receipts. |
| `from` | string | Sender phone number. Who to reply to. |
| `to` | string | The business `phone_number_id` that received the message. |
| `timestamp` | string | Unix epoch seconds (as sent by WhatsApp). |
| `contactName` | string \| null | Sender's WhatsApp profile name, or `null` if absent. |
| `context` | object \| null | Reply context, or `null`. See below. |
| `metadata` | object | `{ phoneNumberId, displayPhoneNumber }`. |
| `type` | string | Discriminator: `text` \| `image` \| `video` \| `audio` \| `document`. |

`context` (when the message is a reply):

| Field | Type | Description |
| --- | --- | --- |
| `messageId` | string | The message being replied to. |
| `from` | string | Sender of the replied-to message. |

`metadata`:

| Field | Type | Description |
| --- | --- | --- |
| `phoneNumberId` | string | Business number id (needed to call the send API). |
| `displayPhoneNumber` | string | Human-readable business number. |

## text — `whatsapp.incoming.text`

Carries plain text and every interactive reply, normalized into one shape.

| Field | Type | Description |
| --- | --- | --- |
| `type` | `"text"` | Discriminator. |
| `text` | string | Message body, or the tapped button/row title. |
| `source` | string | Origin shape: `text` \| `button_reply` \| `list_reply` \| `quick_reply`. |
| `replyId` | string \| null | Tapped button/list-row id; `null` for plain typed text. |

`source` lets a consumer tell a typed message from a tap; `replyId` is the
machine-routable value behind a tap (e.g. `confirm_yes`), so intent routing does
not require re-parsing free text.

```json
{
  "messageId": "wamid.HBgL...",
  "from": "94771234567",
  "to": "555123456789012",
  "timestamp": "1699876543",
  "contactName": "Jane Doe",
  "context": null,
  "metadata": {
    "phoneNumberId": "555123456789012",
    "displayPhoneNumber": "+1 555 123 4567"
  },
  "type": "text",
  "text": "I need advice about a tenancy dispute",
  "source": "text",
  "replyId": null
}
```

Button reply (note `source`, `replyId`, and the reply `context`):

```json
{
  "messageId": "wamid.HBgL...",
  "from": "94771234567",
  "to": "555123456789012",
  "timestamp": "1699876600",
  "contactName": "Jane Doe",
  "context": { "messageId": "wamid.previous...", "from": "555123456789012" },
  "metadata": {
    "phoneNumberId": "555123456789012",
    "displayPhoneNumber": "+1 555 123 4567"
  },
  "type": "text",
  "text": "Yes, continue",
  "source": "button_reply",
  "replyId": "confirm_yes"
}
```

`list_reply` and `quick_reply` are identical in shape, differing only in
`source`.

## Media formats

Image, video, audio, and document share these fields on top of the envelope.
The gateway forwards the WhatsApp `mediaId` only — it does not download the
bytes. A consumer fetches the file from the WhatsApp media endpoint using
`mediaId`.

| Field | Type | Description |
| --- | --- | --- |
| `mediaId` | string | WhatsApp media asset id. GET it to obtain a short-lived URL. |
| `mimeType` | string \| null | Asset MIME type. |
| `sha256` | string \| null | Asset SHA-256 hash, for integrity checks. |

### image — `whatsapp.incoming.media.image`

Adds `caption: string | null`.

```json
{
  "messageId": "wamid.HBgL...",
  "from": "94771234567",
  "to": "555123456789012",
  "timestamp": "1699876700",
  "contactName": "Jane Doe",
  "context": null,
  "metadata": {
    "phoneNumberId": "555123456789012",
    "displayPhoneNumber": "+1 555 123 4567"
  },
  "type": "image",
  "mediaId": "1234567890",
  "mimeType": "image/jpeg",
  "sha256": "9f86d0818...",
  "caption": "Here is the eviction notice"
}
```

### video — `whatsapp.incoming.media.video`

Identical to image with `type: "video"`. Adds `caption: string | null`.

### audio — `whatsapp.incoming.media.audio`

Adds `voice: boolean` (true for a recorded voice note, false for an uploaded
audio file). No caption.

```json
{
  "messageId": "wamid.HBgL...",
  "from": "94771234567",
  "to": "555123456789012",
  "timestamp": "1699876800",
  "contactName": "Jane Doe",
  "context": null,
  "metadata": {
    "phoneNumberId": "555123456789012",
    "displayPhoneNumber": "+1 555 123 4567"
  },
  "type": "audio",
  "mediaId": "1234567891",
  "mimeType": "audio/ogg",
  "sha256": "b1946ac92...",
  "voice": true
}
```

### document — `whatsapp.incoming.media.document`

Adds `caption: string | null` and `filename: string | null`.

```json
{
  "messageId": "wamid.HBgL...",
  "from": "94771234567",
  "to": "555123456789012",
  "timestamp": "1699876900",
  "contactName": "Jane Doe",
  "context": null,
  "metadata": {
    "phoneNumberId": "555123456789012",
    "displayPhoneNumber": "+1 555 123 4567"
  },
  "type": "document",
  "mediaId": "1234567892",
  "mimeType": "application/pdf",
  "sha256": "c3ab8ff13...",
  "caption": null,
  "filename": "tenancy-agreement.pdf"
}
```

## Consumer notes

- Switch on `type` to pick the format; the envelope is identical across all five.
- Always-present fields are never omitted; absence is encoded as `null`.
- Treat `timestamp` as a string of unix epoch seconds; parse if you need a date.
- Be idempotent on `messageId`.
- For media, fetch bytes promptly — the URL behind `mediaId` is short-lived.

## Producer (implementation)

A single producer, [incoming-producer.ts](../src/modules/nats/incoming-producer.ts),
publishes every format to the subject configured for its `type`.

Normalization (webhook payload -> these DTOs) happens in
[webhook.service.ts](../src/modules/webhook/webhook.service.ts).
