// ============================================================================
// Incoming message formats (WhatsApp Cloud API -> NATS)
//
// Every incoming WhatsApp message is normalized into one of four standardized
// formats before it is published to NATS: text, image, video, audio. Each
// format owns a dedicated NATS subject so a consumer can subscribe only to the
// media types it can handle. Document is kept as an additional media format
// for backward compatibility.
//
// All formats share the same envelope (sender, recipient, timestamps, reply
// context) so consumers can rely on a stable shape regardless of media type.
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

export interface OutgoingTextMessageDto {
  to: string;
  type: 'text';
  content: {
    text: string;
  };
  replyToMessageId?: string;
}

export interface OutgoingMediaMessageDto {
  to: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
  content: OutgoingWhatsAppMessageDto['content'];
  replyToMessageId?: string;
}
export interface OutgoingWhatsAppMessageDto {
  to: string;
  type:
    | 'text'
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | 'template'
    | 'interactive';
  content: {
    text?: string;
    mediaUrl?: string;
    mediaId?: string;
    caption?: string;
    filename?: string;
    template?: {
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
    };
    interactive?: {
      type: 'button' | 'list';
      header?: {
        type: 'text' | 'image' | 'video' | 'document';
        text?: string;
        mediaId?: string;
      };
      body: {
        text: string;
      };
      footer?: {
        text: string;
      };
      action: {
        buttons?: Array<{
          type: 'reply';
          reply: {
            id: string;
            title: string;
          };
        }>;
        button?: string;
        sections?: Array<{
          title?: string;
          rows: Array<{
            id: string;
            title: string;
            description?: string;
          }>;
        }>;
      };
    };
  };
  replyToMessageId?: string;
}
