// WhatsApp Cloud API Types

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes?: WebhookChange[];
  messaging?: MessengerMessaging[];
}

export interface WebhookChange {
  field: string;
  value: WhatsAppValue;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: WhatsAppMetadata;
  contacts?: Contact[];
  messages?: WhatsAppMessage[];
  statuses?: MessageStatus[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface Contact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: MessageType;
  text?: TextMessage;
  image?: MediaMessage;
  video?: MediaMessage;
  audio?: MediaMessage;
  document?: DocumentMessage;
  location?: LocationMessage;
  contacts?: ContactMessage[];
  interactive?: InteractiveMessage;
  button?: ButtonMessage;
  context?: MessageContext;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'unknown';

export interface TextMessage {
  body: string;
}

export interface MediaMessage {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
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
  };
  phones?: Array<{
    phone: string;
    type?: string;
  }>;
}

export interface InteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface ButtonMessage {
  text: string;
  payload: string;
}

export interface MessageContext {
  from: string;
  id: string;
}

export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    pricing_model: string;
    billable: boolean;
  };
}

// Messenger Types

export interface MessengerMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MessengerMessage;
  postback?: MessengerPostback;
}

export interface MessengerMessage {
  mid: string;
  text?: string;
  attachments?: MessengerAttachment[];
  quick_reply?: {
    payload: string;
  };
}

export interface MessengerAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  payload: {
    url: string;
  };
}

export interface MessengerPostback {
  title: string;
  payload: string;
  referral?: {
    ref: string;
    source: string;
    type: string;
  };
}
