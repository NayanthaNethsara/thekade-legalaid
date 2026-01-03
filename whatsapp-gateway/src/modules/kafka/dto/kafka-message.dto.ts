export interface IncomingWhatsAppMessageDto {
  messageId: string;
  from: string;
  to: string;
  timestamp: string;
  type:
    | 'text'
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | 'location'
    | 'contacts'
    | 'interactive'
    | 'button';
  content: {
    text?: string;
    mediaId?: string;
    mimeType?: string;
    caption?: string;
    filename?: string;
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    interactive?: {
      type: string;
      buttonReply?: {
        id: string;
        title: string;
      };
      listReply?: {
        id: string;
        title: string;
        description?: string;
      };
    };
  };
  context?: {
    messageId: string;
    from: string;
  };
  metadata: {
    phoneNumberId: string;
    displayPhoneNumber: string;
  };
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
