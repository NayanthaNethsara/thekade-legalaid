// WhatsApp Cloud API webhook types.
// Aligned with the official "POST /whatsapp/webhooks" schema. Every message
// type WhatsApp can deliver is modeled in full so nothing is lost at parse time.

export interface WebhookPayload {
  // Always 'whatsapp_business_account' for these webhooks.
  object: 'whatsapp_business_account';
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  // WhatsApp Business Account ID.
  id: string;
  changes: WebhookChange[];
}

export type WebhookField =
  | 'messages'
  | 'group_lifecycle_update'
  | 'group_settings_update'
  | 'group_participant_update';

export interface WebhookChange {
  field: WebhookField;
  value: WhatsAppValue;
}

export interface WhatsAppMetadata {
  // Business display phone number.
  display_phone_number: string;
  // Business phone number ID.
  phone_number_id: string;
}

/**
 * The `value` of a `messages` change. WhatsApp splits this into distinct
 * schemas (general incoming, system, status); we consume them through a single
 * shape with optional arrays since one handler dispatches on whichever array is
 * present.
 */
export interface WhatsAppValue {
  // Always 'whatsapp'.
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  // Sender contact profiles. Included for all non-system incoming messages.
  contacts?: Contact[];
  messages?: WhatsAppMessage[];
  statuses?: MessageStatus[];
  errors?: MessageError[];
}

export interface Contact {
  profile: {
    // WhatsApp user's name as it appears in their profile.
    name: string;
  };
  // WhatsApp user ID. May not match the user's phone number.
  wa_id?: string;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'reaction'
  | 'order'
  | 'system'
  | 'unsupported';

/**
 * BaseMessageProperties plus every type-specific field. Exactly one content
 * field is populated, matching `type`.
 */
export interface WhatsAppMessage {
  // WhatsApp user phone number (may not match wa_id).
  from: string;
  // Unique WhatsApp message ID.
  id: string;
  // Unix timestamp (seconds) when the webhook was triggered.
  timestamp: string;
  type: MessageType;
  text?: TextMessage;
  image?: MediaMessage;
  video?: MediaMessage;
  audio?: MediaMessage;
  document?: DocumentMessage;
  sticker?: StickerMessage;
  location?: LocationMessage;
  contacts?: ContactObject[];
  interactive?: InteractiveMessage;
  button?: ButtonMessage;
  reaction?: ReactionMessage;
  order?: OrderMessage;
  system?: SystemMessage;
  // Present when replying to a message or via a "Message business" button.
  context?: MessageContext;
  // Present when the message originated from a Click to WhatsApp ad.
  referral?: ReferralObject;
  // Present for 'unsupported' messages (e.g. type the API can't represent).
  errors?: MessageError[];
}

// type: 'text' — a plain text message the user typed.
export interface TextMessage {
  body: string;
}

/**
 * Shared media fields (MediaMessageProperties). The bytes are not in the
 * webhook; `id` is fetched separately via the media endpoint.
 */
export interface MediaMessage {
  // Media asset ID. A GET on this ID returns a short-lived asset URL.
  id: string;
  mime_type: string;
  sha256: string;
  // Caption the user attached (image / video / document only).
  caption?: string;
  // Set on audio recorded as a voice note (vs an uploaded audio file).
  voice?: boolean;
}

// type: 'document' — a file with an original filename.
export interface DocumentMessage extends MediaMessage {
  filename?: string;
}

// type: 'sticker' — image/webp; `animated` distinguishes animated stickers.
export interface StickerMessage extends MediaMessage {
  animated?: boolean;
}

// type: 'location' — a shared location pin.
export interface LocationMessage {
  latitude: number;
  longitude: number;
  // Optional place name and street address.
  name?: string;
  address?: string;
}

// type: 'contacts' — one or more shared contact cards (vCard-like).
export interface ContactObject {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    suffix?: string;
    prefix?: string;
  };
  phones?: Array<{
    phone?: string;
    // Contact's WhatsApp ID, if they are a WhatsApp user.
    wa_id?: string;
    type?: string;
  }>;
  emails?: Array<{ email?: string; type?: string }>;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    country_code?: string;
    type?: string;
  }>;
  urls?: Array<{ url?: string; type?: string }>;
  org?: { company?: string; department?: string; title?: string };
  // Contact birthday in YYYY-MM-DD.
  birthday?: string;
}

/**
 * type: 'interactive' — the user replied to an interactive message you sent.
 * `type` indicates which reply field is populated.
 */
export interface InteractiveMessage {
  type: 'button_reply' | 'list_reply' | 'nfm_reply';
  // Reply button tapped.
  button_reply?: {
    id: string;
    title: string;
  };
  // List row selected.
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
  // WhatsApp Flow submission. `response_json` holds the flow's answers.
  nfm_reply?: {
    name: string;
    body?: string;
    response_json: string;
  };
}

// type: 'button' — a tap on a legacy template quick-reply button.
export interface ButtonMessage {
  // Visible button label.
  text: string;
  // Developer-defined payload behind the button.
  payload: string;
}

// type: 'reaction' — an emoji reaction on an earlier message.
export interface ReactionMessage {
  // The message being reacted to.
  message_id: string;
  // The emoji; absent/empty when a reaction is removed.
  emoji?: string;
}

// type: 'order' — items the user submitted from a product catalog.
export interface OrderMessage {
  catalog_id: string;
  text?: string;
  product_items?: Array<{
    product_retailer_id: string;
    quantity: string;
    item_price: string;
    currency: string;
  }>;
}

/**
 * type: 'system' — an account event rather than user content, e.g. the user
 * changed their phone number.
 */
export interface SystemMessage {
  // Human-readable description of the event.
  body: string;
  type: 'customer_changed_number' | 'customer_identity_changed';
  // The user's new WhatsApp ID (for a number change).
  wa_id?: string;
  new_wa_id?: string;
  identity?: string;
  customer?: string;
}

/**
 * Reply / "Message business" context. For a reply, `id` is the quoted message.
 * `referred_product` is present only for "Message business" button entries.
 */
export interface MessageContext {
  // Business display phone number, or the original sender for a reply.
  from: string;
  // WhatsApp message ID this message refers to.
  id: string;
  referred_product?: {
    catalog_id: string;
    product_retailer_id: string;
  };
  // Whether the inbound message was forwarded.
  forwarded?: boolean;
  frequently_forwarded?: boolean;
}

// Click to WhatsApp ad attribution that can accompany an incoming message.
export interface ReferralObject {
  source_url: string;
  source_id: string;
  source_type: 'ad' | 'post';
  body?: string;
  headline?: string;
  media_type?: 'image' | 'video';
  image_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  // Click ID, useful for ad-conversion attribution.
  ctwa_clid?: string;
}

export interface MessageError {
  code: number;
  title?: string;
  message?: string;
  error_data?: { details?: string };
  href?: string;
}

/**
 * A `statuses` entry: a delivery-status update for a message you previously
 * sent (not an inbound user message).
 */
export interface MessageStatus {
  // WhatsApp message ID the status is associated with.
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  // Recipient phone number.
  recipient_id: string;
  // Group ID if the message was sent to a group.
  group_id?: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin?: {
      type: string;
    };
  };
  pricing?: {
    pricing_model: 'CBP' | 'PMP';
    billable?: boolean;
    category?: string;
  };
  errors?: MessageError[];
}
