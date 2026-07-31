// ============================================================================
// Incoming message formats (WhatsApp Cloud API -> NATS)
//
// Every incoming WhatsApp message is normalized into one of five standardized
// formats before it is published to NATS: text, image, video, audio, document.
// Each format owns a dedicated NATS subject so a consumer can subscribe only to
// the types it can handle.
//
// All formats share the same envelope (sender, recipient, timestamp, contact
// name, reply context, metadata) so consumers can rely on a stable shape
// regardless of message type. See docs/incoming-queues.md for the full contract.
// ============================================================================

export interface IncomingMessageMetadata {
  phoneNumberId: string;
  displayPhoneNumber: string;
}

/** Present when the user replies to an earlier message (WhatsApp `context`). */
export interface IncomingMessageContext {
  messageId: string;
  from: string;
}

interface IncomingMessageEnvelope {
  messageId: string;
  from: string;
  to: string;
  timestamp: string;
  contactName: string | null;
  context: IncomingMessageContext | null;
  metadata: IncomingMessageMetadata;
}

/**
 * WhatsApp delivers user text in several shapes: a plain typed message, an
 * interactive button reply, an interactive list reply, or a template quick
 * reply button. They are all normalized to this single text format, with
 * `source` preserving which shape it originated from.
 */
export type IncomingTextSource =
  | 'text'
  | 'button_reply'
  | 'list_reply'
  | 'quick_reply';

export interface IncomingTextMessageDto extends IncomingMessageEnvelope {
  type: 'text';
  text: string;
  source: IncomingTextSource;
  // Identifier of the tapped button or list row; null for plain typed text.
  replyId: string | null;
}

/**
 * Shared fields for media messages. The gateway forwards the WhatsApp `mediaId`
 * (and content metadata) rather than the bytes; a downstream consumer is
 * responsible for fetching and storing the file.
 */
interface IncomingMediaEnvelope extends IncomingMessageEnvelope {
  mediaId: string;
  mimeType: string | null;
  sha256: string | null;
}

export interface IncomingImageMessageDto extends IncomingMediaEnvelope {
  type: 'image';
  caption: string | null;
}

export interface IncomingVideoMessageDto extends IncomingMediaEnvelope {
  type: 'video';
  caption: string | null;
}

export interface IncomingAudioMessageDto extends IncomingMediaEnvelope {
  type: 'audio';
  // WhatsApp distinguishes recorded voice notes from uploaded audio files.
  voice: boolean;
}

export interface IncomingDocumentMessageDto extends IncomingMediaEnvelope {
  type: 'document';
  caption: string | null;
  filename: string | null;
}

/** Discriminated union of every standardized incoming format. */
export type IncomingMessageDto =
  | IncomingTextMessageDto
  | IncomingImageMessageDto
  | IncomingVideoMessageDto
  | IncomingAudioMessageDto
  | IncomingDocumentMessageDto;

// ============================================================================
// Outgoing message formats (NATS -> WhatsApp Cloud API)
//
// A producer (e.g. core-service or an AI worker) publishes one of these to an
// outgoing subject; the gateway consumes it and calls the WhatsApp send API.
// Every format shares the { to, type, content } envelope. See
// docs/outgoing-queue.md for the full contract.
// ============================================================================

interface OutgoingMessageBase {
  // Recipient WhatsApp id / phone number in international format.
  to: string;
  // Quote an earlier message: the gateway relays this as WhatsApp `context`.
  replyToMessageId?: string;
}

export interface OutgoingTextMessageDto extends OutgoingMessageBase {
  type: 'text';
  // `previewUrl: true` renders a link preview for the first URL in the text.
  content: { text: string; previewUrl?: boolean };
}

/** Media is referenced by a public URL (`mediaUrl`) or a pre-uploaded id. */
export interface OutgoingMediaContent {
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
}

export interface OutgoingImageMessageDto extends OutgoingMessageBase {
  type: 'image';
  content: OutgoingMediaContent;
}

export interface OutgoingVideoMessageDto extends OutgoingMessageBase {
  type: 'video';
  content: OutgoingMediaContent;
}

export interface OutgoingAudioMessageDto extends OutgoingMessageBase {
  type: 'audio';
  // Audio messages do not support a caption.
  content: Omit<OutgoingMediaContent, 'caption'>;
}

export interface OutgoingDocumentMessageDto extends OutgoingMessageBase {
  type: 'document';
  content: OutgoingMediaContent & { filename?: string };
}

export interface OutgoingStickerMessageDto extends OutgoingMessageBase {
  type: 'sticker';
  // Stickers do not support a caption. WebP only (static <= 100KB,
  // animated <= 500KB).
  content: Omit<OutgoingMediaContent, 'caption'>;
}

export interface OutgoingLocationMessageDto extends OutgoingMessageBase {
  type: 'location';
  content: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

export interface OutgoingContactCard {
  name: {
    formattedName: string;
    firstName?: string;
    lastName?: string;
  };
  phones?: Array<{ phone: string; type?: string; waId?: string }>;
  emails?: Array<{ email: string; type?: string }>;
  urls?: Array<{ url: string; type?: string }>;
  org?: { company?: string; department?: string; title?: string };
}

export interface OutgoingContactsMessageDto extends OutgoingMessageBase {
  type: 'contacts';
  content: { contacts: OutgoingContactCard[] };
}

export interface OutgoingReactionMessageDto extends OutgoingMessageBase {
  type: 'reaction';
  // An empty `emoji` string removes a previously sent reaction.
  content: { messageId: string; emoji: string };
}

/** Header of an interactive message; media via `mediaUrl` or `mediaId`. */
export interface OutgoingInteractiveHeader {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  mediaUrl?: string;
  mediaId?: string;
}

export interface OutgoingReplyButton {
  type: 'reply';
  reply: { id: string; title: string };
}

/**
 * One card of a media carousel (up to 10 per message). Every card needs a
 * media header; give it either `ctaUrl` (tap opens a link — e.g. a product
 * page) or `buttons` (quick replies). All cards in one carousel must use the
 * same kind. Requires Graph API v23.0+.
 */
export interface OutgoingCarouselCard {
  header: {
    type: 'image' | 'video';
    mediaUrl?: string;
    mediaId?: string;
  };
  body?: { text: string };
  footer?: { text: string };
  ctaUrl?: { displayText: string; url: string };
  buttons?: OutgoingReplyButton[];
}

export type OutgoingInteractiveContent =
  // Up to 3 reply buttons.
  | {
      type: 'button';
      header?: OutgoingInteractiveHeader;
      body: { text: string };
      footer?: { text: string };
      action: { buttons: OutgoingReplyButton[] };
    }
  // List menu: `button` is the menu opener label, rows live in sections.
  | {
      type: 'list';
      header?: OutgoingInteractiveHeader;
      body: { text: string };
      footer?: { text: string };
      action: {
        button: string;
        sections: Array<{
          title?: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
      };
    }
  // Single URL button, e.g. one product with an image header and a link.
  | {
      type: 'cta_url';
      header?: OutgoingInteractiveHeader;
      body: { text: string };
      footer?: { text: string };
      action: { displayText: string; url: string };
    }
  // Asks the user to share their location.
  | {
      type: 'location_request_message';
      body: { text: string };
    }
  // Horizontally scrollable media cards, e.g. a product gallery.
  | {
      type: 'carousel';
      body: { text: string };
      cards: OutgoingCarouselCard[];
    }
  // Asks the user for a delivery address (supported markets only).
  | {
      type: 'address_message';
      body: { text: string };
      footer?: { text: string };
      action: {
        // ISO 3166-1 alpha-2, e.g. "LK" or "IN".
        country: string;
        // Pre-filled field values shown on the address form.
        values?: Record<string, unknown>;
        savedAddresses?: Array<{ id: string; value: Record<string, unknown> }>;
      };
    }
  // Launches a WhatsApp Flow (forms, bookings, product browsing).
  | {
      type: 'flow';
      header?: OutgoingInteractiveHeader;
      body: { text: string };
      footer?: { text: string };
      action: {
        // Label of the button that opens the Flow.
        cta: string;
        // Identify the Flow by id or by name (exactly one).
        flowId?: string;
        flowName?: string;
        // Echoed back in the Flow response; defaults to "unused".
        flowToken?: string;
        // "navigate" opens `screen` directly; "data_exchange" calls the
        // Flow endpoint first. Defaults to "navigate".
        flowAction?: 'navigate' | 'data_exchange';
        screen?: string;
        // Initial data passed to the screen (navigate only).
        data?: Record<string, unknown>;
        mode?: 'draft' | 'published';
      };
    }
  // Asks the user to allow the business to call them (Calling API).
  | {
      type: 'call_permission_request';
      body: { text: string };
    };

export interface OutgoingInteractiveMessageDto extends OutgoingMessageBase {
  type: 'interactive';
  content: { interactive: OutgoingInteractiveContent };
}

export interface OutgoingTemplateContent {
  name: string;
  language: string;
  components?: Array<{
    type: string;
    parameters: Array<{
      type: string;
      text?: string;
      image?: { link: string };
      video?: { link: string };
      document?: { link: string };
    }>;
  }>;
}

export interface OutgoingTemplateMessageDto extends OutgoingMessageBase {
  type: 'template';
  content: { template: OutgoingTemplateContent };
}

/** Discriminated union of every outgoing format the gateway can relay. */
export type OutgoingMessageDto =
  | OutgoingTextMessageDto
  | OutgoingImageMessageDto
  | OutgoingVideoMessageDto
  | OutgoingAudioMessageDto
  | OutgoingDocumentMessageDto
  | OutgoingStickerMessageDto
  | OutgoingLocationMessageDto
  | OutgoingContactsMessageDto
  | OutgoingReactionMessageDto
  | OutgoingInteractiveMessageDto
  | OutgoingTemplateMessageDto;
