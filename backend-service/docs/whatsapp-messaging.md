# WhatsApp Outgoing Message Formatting

How the chatbot's reply becomes one or more WhatsApp messages. The orchestrator
produces a channel-neutral `ChatResponse` (reply text, product cards, actions);
the WhatsApp handler converts it into the gateway's outgoing queue format.

Builder: [whatsapp_messages.py](../app/handlers/whatsapp_messages.py).
Queue contract: [whatsapp-gateway/docs/outgoing-queue.md](../../whatsapp-gateway/docs/outgoing-queue.md).

## Pipeline

```
reason model reply
  -> format_response   (markdown -> WhatsApp markup; extract cards + actions
                        from this turn's tool output)
  -> AgentHandler      (build_outgoing_messages -> publish to whatsapp.outgoing)
  -> whatsapp-gateway  (consume, call WhatsApp Cloud API)
```

Cards come from `kakille_search_products` / `kakille_get_product` tool output;
actions (pay link) from `kakille_create_order`. A card is only usable on
WhatsApp when it has both an `image_url` and a product `url`.

## Which message type is sent when

| Scenario | Messages sent |
| --- | --- |
| No products in the turn (chat, questions, order status, errors) | one `text` |
| Exactly one product, reply fits 1024 chars | one interactive `cta_url`: product image header, reply as body, "View product" button |
| Exactly one product, reply too long | `text` (full reply), then `cta_url` with a short name/price body |
| 2-10 products, reply fits 1024 chars | one interactive `carousel`: reply as bubble text, one image card per product with name/price body and a "View product" button |
| 2-10 products, reply too long | `text` (full reply), then `carousel` with a generic body |
| Products without image or URL | excluded from cards; the reply text still covers them. If none qualify, plain `text` |
| Order created (pay link action) | an extra `cta_url` message with a "Pay now" button, after the reply |
| Orchestrator/publish failure | plain `text` apology (`AgentHandler` fallback) |

Messages are sent as fresh bubbles, not WhatsApp replies. The queue contract
supports quoting via `replyToMessageId`, but the bot deliberately leaves it
unset; set it only where pointing at one specific earlier message helps
(e.g. answering an old question in a busy chat).

## Limits and constraints

- Interactive body: 1024 chars. Longer replies are sent as a separate text
  message first (text messages allow 4096).
- Carousel: max 10 cards; every card needs an image header; card bodies are
  truncated to 160 chars (name + price/stock).
- Free-form messages only deliver inside the 24-hour customer service window
  (the customer must have messaged within the last 24 h). Outside it, the API
  accepts the message and silently drops it; only a `template` could be sent.

## Image URLs: the WebP constraint

WhatsApp fetches card images server-side and rejects WebP (error 131053,
"Media upload error", surfaced only via the `statuses` webhook after the API
already accepted the message). Kakille CDN links use `f=auto`, which serves
WebP. The builder rewrites `f=auto` -> `f=jpeg` so the CDN returns JPEG.

If cards ever stop rendering, check the gateway logs first: every send logs
its `wamid`, and a later `failed` status for that id carries WhatsApp's error
code and reason.

## Debugging a missing message

1. Backend log `outgoing.published` shows the exact JSON payload published.
2. Gateway log `Outgoing <type> message sent to <to> (id: wamid...)` confirms
   the API accepted it; `WhatsApp API error: ... | request: ...` means it was
   rejected and shows both error and payload.
3. Gateway log `Message wamid... failed: [...]` is the delivery-status webhook
   — failures after acceptance (bad media, closed window) appear here.

## Known gap

When a customer asks to see earlier products again ("show me those again"),
the planner may skip the search; the reply is then text-only because the
turn has no tool output to build cards from. Fix options: re-run the search
for show-me intents, or carry the last turn's cards in graph state.
