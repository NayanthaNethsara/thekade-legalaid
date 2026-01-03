export interface SendTextMessageDto {
  to: string;
  text: string;
}

export interface MarkMessageAsReadDto {
  messageId: string;
}

export interface SendReactionDto {
  to: string;
  messageId: string;
  emoji: string;
}

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
}
