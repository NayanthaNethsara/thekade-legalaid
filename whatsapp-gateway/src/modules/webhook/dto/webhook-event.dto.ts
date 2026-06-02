// WhatsApp Cloud API webhook types.
// Aligned with the official "POST /whatsapp/webhooks" schema. The text message
// path is modeled in full; other message types carry the fields the gateway
// routes on. Group / system / order payloads are intentionally light for now.

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
 * schemas (general incoming, system, status, group); we consume them through a
 * single shape with optional arrays since one handler dispatches on whichever
 * array is present.
 */
export interface WhatsAppValue {
  // Always 'whatsapp'.
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  // Sender contact profiles. Included for all non-system incoming messages.
  contacts?: Contact[];
  messages?: WhatsAppMessage[];
  statuses?: MessageStatus[];
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
 * BaseMessageProperties plus every type-specific field. Exactly one of the
 * content fields is populated, matching `type`.
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
  sticker?: MediaMessage;
  location?: LocationMessage;
  contacts?: ContactMessage[];
  interactive?: InteractiveMessage;
  button?: ButtonMessage;
  reaction?: ReactionMessage;
  order?: OrderMessage;
  // Present when replying to a message or via a "Message business" button.
  context?: MessageContext;
  // Present when the message originated from a Click to WhatsApp ad.
  referral?: ReferralObject;
  // Present for 'unsupported' messages.
  errors?: MessageError[];
}

export interface TextMessage {
  body: string;
}

// MediaMessageProperties: id, mime_type and sha256 are always present.
export interface MediaMessage {
  // Media asset ID. A GET on this ID returns the asset URL.
  id: string;
  mime_type: string;
  sha256: string;
  caption?: string;
  // Set by WhatsApp on audio messages recorded as a voice note.
  voice?: boolean;
}

export interface DocumentMessage extends MediaMessage {
  filename?: string;
}

export interface LocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactMessage {
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
    wa_id?: string;
    type?: string;
  }>;
  emails?: Array<{ email?: string; type?: string }>;
  org?: { company?: string; department?: string; title?: string };
}

/**
 * Interactive reply: the user tapped a reply button or selected a list row.
 * `type` indicates which content field is populated.
 */
export interface InteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    // Button ID.
    id: string;
    // Button label text.
    title: string;
  };
  list_reply?: {
    // Row ID.
    id: string;
    // Row title.
    title: string;
    // Row description.
    description?: string;
  };
}

// Template quick-reply button tap.
export interface ButtonMessage {
  text: string;
  payload: string;
}

export interface ReactionMessage {
  message_id: string;
  emoji?: string;
}

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
  ctwa_clid?: string;
}

export interface MessageError {
  code: number;
  title?: string;
  message?: string;
  error_data?: { details?: string };
  href?: string;
}

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
