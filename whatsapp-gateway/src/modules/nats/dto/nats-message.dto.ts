export interface IncomingWhatsAppMessageDto {
  messageId: string;
  from: string;
  to: string;
  timestamp: string;
  type: 'text';
  content: string;
  context?: {
    messageId: string;
    from: string;
  };
  metadata: {
    phoneNumberId: string;
    displayPhoneNumber: string;
  };
}

export interface IncomingVoiceMessageDto extends IncomingFileMessageDto {
  type: 'audio';
}

export interface IncomingDocumentMessageDto extends IncomingFileMessageDto {
  type: 'document';
}

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

export interface IncomingFileMessageDto {
  messageId: string;
  from: string;
  to: string;
  timestamp: string;
  type: 'image' | 'video' | 'audio' | 'document';
  fileUrl: string;
  mimeType?: string;
  caption?: string;
  filename?: string;
  metadata: {
    phoneNumberId: string;
    displayPhoneNumber: string;
  };
}
