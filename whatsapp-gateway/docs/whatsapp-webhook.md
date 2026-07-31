# WhatsApp Webhook Reference

How the gateway receives WhatsApp Cloud API webhooks, the shape of what Meta
sends, and the normalized contract the gateway publishes to NATS.

There are two distinct schemas in this document:

- **Inbound (what Meta sends us)** — modeled in
  [webhook-event.dto.ts](../src/modules/webhook/dto/webhook-event.dto.ts).
- **Outbound (what we publish to the queue)** — modeled in
  [nats-message.dto.ts](../src/modules/nats/dto/nats-message.dto.ts). The full
  queue contract is documented separately in
  [incoming-queues.md](incoming-queues.md).

The gateway's job is to translate the first into the second.

## Endpoint

Both operations share one URL (Meta uses the same URL for verification and
events). There is no global path prefix.

| Method | Path                 | Purpose                                      |
| ------ | -------------------- | -------------------------------------------- |
| GET    | `/whatsapp/webhooks` | One-time verification handshake during setup |
| POST   | `/whatsapp/webhooks` | Receives inbound messages and status updates |

Defined in [webhook.controller.ts](../src/modules/webhook/webhook.controller.ts).

### GET — verification handshake

Meta calls this once when you save the callback URL. It sends three query
parameters:

| Query param        | Meaning                                    |
| ------------------ | ------------------------------------------ |
| `hub.mode`         | Always `subscribe`                         |
| `hub.verify_token` | Must equal `META_VERIFY_TOKEN`             |
| `hub.challenge`    | A random string we must echo back verbatim |

If `mode === 'subscribe'` and the token matches, we return `hub.challenge` with
`200`. Otherwise `401`/`400`.

### POST — events

- Header `x-hub-signature-256` carries `sha256=<hmac>`, an HMAC-SHA256 of the
  **raw request body** keyed with `META_APP_SECRET`. We recompute it and compare
  with a timing-safe check; a mismatch is rejected as `401`.
- We **always return `200`** once the signature passes, even if processing
  fails, so Meta does not retry. Processing errors are logged.

## Event flow

```
WhatsApp Cloud API
        |  POST /whatsapp/webhooks  (+ x-hub-signature-256)
        v
[WebhookController]  verify signature
        v
[WebhookService]  walk entry[] -> changes[] -> value
        v
   value.messages[]? ----> per-message router (by message.type)
   value.statuses[]?  ----> delivery receipts (not currently queued)
        v
[normalize to standardized DTO] -> [NATS producer] -> JetStream subject -> consumer
```

## Inbound envelope

Every webhook POST body has this outer shape:

```
WebhookPayload
└─ object: "whatsapp_business_account"
└─ entry[]                              one per WhatsApp Business Account
   ├─ id                                the WABA id
   └─ changes[]
      ├─ field: "messages" | "group_*"
      └─ value (WhatsAppValue)
         ├─ messaging_product: "whatsapp"
         ├─ metadata: { display_phone_number, phone_number_id }
         ├─ contacts?: [{ profile.name, wa_id }]
         ├─ messages?: [ ... inbound user messages ... ]
         ├─ statuses?: [ ... delivery receipts ... ]
         └─ errors?:   [ ... account-level errors ... ]
```

Key points:

- `metadata.phone_number_id` is **which of your business numbers** received the
  message. You need it to send a reply.
- `contacts[]` gives the sender's display name; `wa_id` is their WhatsApp id,
  which may differ from their phone number.
- A change carries **either** `messages` (a user sent you something) **or**
  `statuses` (an update about a message you sent) — not both.

Every entry in `messages[]` shares these base fields, plus exactly one
content field selected by `type`:

| Base field  | Meaning                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `from`      | Sender phone number                                                      |
| `id`        | Unique WhatsApp message id (use for dedup, read receipts, reply context) |
| `timestamp` | Unix epoch seconds, as a string                                          |
| `type`      | Which content field is populated (below)                                 |

## Inbound message types

| `type`        | Content field                     | What it is                                                                  |
| ------------- | --------------------------------- | --------------------------------------------------------------------------- |
| `text`        | `text: { body }`                  | A typed message.                                                            |
| `image`       | `image: MediaMessage`             | Photo: `{ id, mime_type, sha256, caption? }`.                               |
| `video`       | `video: MediaMessage`             | Video; `caption?` optional.                                                 |
| `audio`       | `audio: MediaMessage`             | Audio; `voice: true` = recorded voice note. No caption.                     |
| `document`    | `document: DocumentMessage`       | File: media fields + `filename`.                                            |
| `sticker`     | `sticker: StickerMessage`         | `image/webp`; `animated` flags animated stickers.                           |
| `location`    | `location: LocationMessage`       | Pin: `{ latitude, longitude, name?, address? }`.                            |
| `contacts`    | `contacts: ContactObject[]`       | Shared contact cards: name, phones, emails, addresses, urls, org, birthday. |
| `interactive` | `interactive: InteractiveMessage` | Reply to an interactive message you sent (see below).                       |
| `button`      | `button: ButtonMessage`           | Tap on a legacy template quick-reply button: `{ text, payload }`.           |
| `reaction`    | `reaction: ReactionMessage`       | Emoji reaction: `{ message_id, emoji }`. Empty `emoji` = reaction removed.  |
| `order`       | `order: OrderMessage`             | Catalog order: `catalog_id`, `product_items[]`.                             |
| `system`      | `system: SystemMessage`           | Account event (e.g. user changed number). Not user content.                 |
| `unsupported` | `errors: MessageError[]`          | API could not represent the message; `errors[]` says why.                   |

### Media is fetched separately

`MediaMessage.id` is **not** the file — it is an asset id. The bytes are
retrieved with a separate authenticated call to the media endpoint. The webhook
never contains media bytes.

### Interactive replies

`interactive.type` tells you which reply field is set:

- `button_reply` — `{ id, title }`. A reply button was tapped.
- `list_reply` — `{ id, title, description? }`. A list row was selected.
- `nfm_reply` — a WhatsApp Flow submission; answers are in `response_json`.

`id` is your machine-routable value (e.g. `confirm_yes`); `title` is the label
the user saw.

## Cross-cutting fields

These sit alongside the content field on any inbound message:

- `context` — present on a **reply** or a "Message business" button. `{ from, id }`
  where `id` is the quoted message (used for threading). Also carries
  `referred_product` and `forwarded` / `frequently_forwarded`.
- `referral` — present when the user arrived from a **Click-to-WhatsApp ad**.
  Carries `source_id`, `source_url`, `source_type`, and `ctwa_clid` (ad click id
  for attribution). Usually attached to the first `text` message.

## Status updates

`statuses[]` entries report what happened to a message **you** sent:

- `status`: `sent` -> `delivered` -> `read`, or `failed`.
- `recipient_id`, plus `conversation` and `pricing` (billing window/category).
- `errors[]` on failure.

These are for delivery tracking, not AI processing, and are not currently
published to a queue.

## Example raw payloads

### Text

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WABA_ID",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "+1 555 123 4567",
              "phone_number_id": "555123456789012"
            },
            "contacts": [
              { "profile": { "name": "Jane Doe" }, "wa_id": "94771234567" }
            ],
            "messages": [
              {
                "from": "94771234567",
                "id": "wamid.HBgL...",
                "timestamp": "1699876543",
                "type": "text",
                "text": { "body": "I need advice about a tenancy dispute" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Interactive button reply (with reply context)

```json
{
  "from": "94771234567",
  "id": "wamid.HBgL...",
  "timestamp": "1699876600",
  "type": "interactive",
  "context": { "from": "555123456789012", "id": "wamid.previous..." },
  "interactive": {
    "type": "button_reply",
    "button_reply": { "id": "confirm_yes", "title": "Yes, continue" }
  }
}
```

### Image

```json
{
  "from": "94771234567",
  "id": "wamid.HBgL...",
  "timestamp": "1699876700",
  "type": "image",
  "image": {
    "id": "1234567890",
    "mime_type": "image/jpeg",
    "sha256": "…",
    "caption": "Here is the eviction notice"
  }
}
```

### Status update

```json
{
  "field": "messages",
  "value": {
    "messaging_product": "whatsapp",
    "metadata": {
      "display_phone_number": "+1 555 123 4567",
      "phone_number_id": "555123456789012"
    },
    "statuses": [
      {
        "id": "wamid.HBgL...",
        "status": "delivered",
        "timestamp": "1699876750",
        "recipient_id": "94771234567"
      }
    ]
  }
}
```

## Outbound contract (what we publish)

The gateway normalizes each inbound message into a standardized format and
publishes it to a per-type NATS subject. Stream: `KAKILLE_AGENT_EVENTS`.

| Subject                            | Format DTO                   | Source message types            |
| ---------------------------------- | ---------------------------- | ------------------------------- |
| `whatsapp.incoming.text`           | `IncomingTextMessageDto`     | `text`, `interactive`, `button` |
| `whatsapp.incoming.media.image`    | `IncomingImageMessageDto`    | `image`                         |
| `whatsapp.incoming.media.video`    | `IncomingVideoMessageDto`    | `video`                         |
| `whatsapp.incoming.media.audio`    | `IncomingAudioMessageDto`    | `audio`                         |
| `whatsapp.incoming.media.document` | `IncomingDocumentMessageDto` | `document`                      |

A consumer can subscribe granularly (`whatsapp.incoming.media.image`), to all
media (`whatsapp.incoming.media.>`), or to everything (`whatsapp.incoming.>`).

### Shared envelope

Every published format begins with the same envelope:

| Field         | Meaning                                                    |
| ------------- | ---------------------------------------------------------- |
| `messageId`   | WhatsApp message id                                        |
| `from`        | Sender phone (who to reply to)                             |
| `to`          | Our `phone_number_id` that received it                     |
| `timestamp`   | WhatsApp unix epoch seconds (string)                       |
| `contactName` | Sender profile name, or `null`                             |
| `context`     | `{ messageId, from }` of the replied-to message, or `null` |
| `metadata`    | `{ phoneNumberId, displayPhoneNumber }`                    |

### Text format

```json
{
  "messageId": "wamid.HBgL...",
  "from": "94771234567",
  "to": "555123456789012",
  "timestamp": "1699876543",
  "contactName": "Jane Doe",
  "context": null,
  "type": "text",
  "text": "I need advice about a tenancy dispute",
  "source": "text",
  "replyId": null,
  "metadata": {
    "phoneNumberId": "555123456789012",
    "displayPhoneNumber": "+1 555 123 4567"
  }
}
```

`source` is `text` | `button_reply` | `list_reply` | `quick_reply`. For an
interactive/quick reply, `replyId` holds the tapped button or list-row id, so a
consumer can route on the id without re-parsing free text. The three text-bearing
inbound types all collapse into this single format.

### Media formats

Media formats add `mediaId`, `mimeType`, `sha256` to the envelope:

- image / video: plus `caption`
- audio: plus `voice` (boolean)
- document: plus `caption` and `filename`

The gateway forwards the WhatsApp `mediaId` only — it does not download or store
the bytes. A downstream consumer fetches the file via the media endpoint using
`mediaId`.

## Received vs published

| Inbound `type`           | Typed inbound? | Published? | Where                                    |
| ------------------------ | -------------- | ---------- | ---------------------------------------- |
| `text`                   | yes            | yes        | `whatsapp.incoming.text`                 |
| `interactive`            | yes            | yes        | folded into text (`source`)              |
| `button`                 | yes            | yes        | folded into text (`source: quick_reply`) |
| `image`                  | yes            | yes        | `whatsapp.incoming.media.image`          |
| `video`                  | yes            | yes        | `whatsapp.incoming.media.video`          |
| `audio`                  | yes            | yes        | `whatsapp.incoming.media.audio`          |
| `document`               | yes            | yes        | `whatsapp.incoming.media.document`       |
| `reaction`               | yes            | no         | dropped (logged)                         |
| `location`               | yes            | no         | dropped                                  |
| `contacts`               | yes            | no         | dropped                                  |
| `sticker`                | yes            | no         | dropped                                  |
| `order`                  | yes            | no         | dropped                                  |
| `system` / `unsupported` | yes            | no         | dropped                                  |
| `statuses[]`             | yes            | no         | not queued                               |

All inbound types are parsed and typed; only the seven rows above with
"Published: yes" reach a queue today.
