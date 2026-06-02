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
  // Quote an earlier message in the reply. Optional; reserved for future use.
  replyToMessageId?: string;
}

export interface OutgoingTextMessageDto extends OutgoingMessageBase {
  type: 'text';
  content: { text: string };
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

export interface OutgoingInteractiveContent {
  type: 'button' | 'list';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    mediaId?: string;
  };
  body: { text: string };
  footer?: { text: string };
  action: {
    buttons?: Array<{
      type: 'reply';
      reply: { id: string; title: string };
    }>;
    button?: string;
    sections?: Array<{
      title?: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  };
}

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
  | OutgoingInteractiveMessageDto
  | OutgoingTemplateMessageDto;
