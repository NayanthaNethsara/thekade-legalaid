import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizePayload } from '../../common/utils/logger.utils';
import {
  Template,
  Interactive,
  LocationObject,
  ContactObject,
  WhatsAppApiResponse,
} from '../../types/whatsapp.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  // v23.0+ is required for interactive media carousel messages.
  private readonly baseUrl = 'https://graph.facebook.com/v23.0';

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId =
      this.configService.get<string>('whatsapp.phoneNumberId') || '';
    this.accessToken =
      this.configService.get<string>('whatsapp.accessToken') || '';
  }

  private async sendRequest(
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<WhatsAppApiResponse | null> {
    const url = `${this.baseUrl}/${this.phoneNumberId}/${endpoint}`;
    const maxRetries = 3;
    let attempt = 0;

    this.logger.log(
      `Sending request to WhatsApp API: endpoint=${endpoint}, payload=${JSON.stringify(sanitizePayload(data))}`,
    );

    while (attempt < maxRetries) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const responseText = await response.text();
        let responseBody: unknown;
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          responseBody = responseText;
        }

        if (!response.ok) {
          this.logger.error(
            `WhatsApp API error: status=${response.status} | response=${JSON.stringify(sanitizePayload(responseBody))} | request=${JSON.stringify(sanitizePayload(data)).slice(0, 2000)}`,
          );
          return null;
        }

        this.logger.log(
          `WhatsApp API response: status=${response.status} | response=${JSON.stringify(sanitizePayload(responseBody))}`,
        );
        return responseBody as WhatsAppApiResponse;
      } catch (error) {
        attempt++;
        this.logger.warn(
          `Failed to send WhatsApp message (attempt ${attempt}/${maxRetries}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        if (attempt >= maxRetries) {
          this.logger.error(
            `Failed to send WhatsApp message after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          return null;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * Math.pow(2, attempt - 1)),
        );
      }
    }
    return null;
  }

  /**
   * Build the shared envelope for a /messages request. `replyToMessageId`
   * quotes an earlier message via the WhatsApp `context` field.
   */
  private messageEnvelope(
    to: string,
    replyToMessageId?: string,
  ): Record<string, unknown> {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      ...(replyToMessageId && { context: { message_id: replyToMessageId } }),
    };
  }

  /**
   * Send a text message
   */
  async sendTextMessage(
    to: string,
    text: string,
    previewUrl?: boolean,
    replyToMessageId?: string,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      ...this.messageEnvelope(to, replyToMessageId),
      type: 'text',
      text: { body: text, ...(previewUrl && { preview_url: true }) },
    });
  }

  /**
   * Send media message (image, video, audio, sticker)
   */
  async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'video' | 'audio' | 'sticker',
    mediaIdOrUrl: string,
    caption?: string,
    replyToMessageId?: string,
  ): Promise<WhatsAppApiResponse | null> {
    const isUrl = mediaIdOrUrl.startsWith('http');
    const mediaPayload: Record<string, string> = isUrl
      ? { link: mediaIdOrUrl }
      : { id: mediaIdOrUrl };

    if (caption && (mediaType === 'image' || mediaType === 'video')) {
      mediaPayload.caption = caption;
    }

    return this.sendRequest('messages', {
      ...this.messageEnvelope(to, replyToMessageId),
      type: mediaType,
      [mediaType]: mediaPayload,
    });
  }

  /**
   * Send document message
   */
  async sendDocumentMessage(
    to: string,
    documentIdOrUrl: string,
    caption?: string,
    filename?: string,
    replyToMessageId?: string,
  ): Promise<WhatsAppApiResponse | null> {
    const isUrl = documentIdOrUrl.startsWith('http');
    const documentPayload: Record<string, string> = isUrl
      ? { link: documentIdOrUrl }
      : { id: documentIdOrUrl };

    if (caption) {
      documentPayload.caption = caption;
    }

    if (filename) {
      documentPayload.filename = filename;
    }

    return this.sendRequest('messages', {
      ...this.messageEnvelope(to, replyToMessageId),
      type: 'document',
      document: documentPayload,
    });
  }

  /**
   * Send location message
   */
  async sendLocationMessage(
    to: string,
    location: LocationObject,
    replyToMessageId?: string,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      ...this.messageEnvelope(to, replyToMessageId),
      type: 'location',
      location,
    });
  }

  /**
   * Send contact cards
   */
  async sendContactsMessage(
    to: string,
    contacts: ContactObject[],
    replyToMessageId?: string,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      ...this.messageEnvelope(to, replyToMessageId),
      type: 'contacts',
      contacts,
    });
  }

  /**
   * React to a message with an emoji; an empty emoji removes the reaction.
   */
  async sendReactionMessage(
    to: string,
    messageId: string,
    emoji: string,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      ...this.messageEnvelope(to),
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    });
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    to: string,
    template: Template,
    replyToMessageId?: string,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      ...this.messageEnvelope(to, replyToMessageId),
      type: 'template',
      template: {
        name: template.name,
        language: {
          code: template.language,
        },
        components: template.components ?? [],
      },
    });
  }

  /**
   * Send interactive message (buttons, list, cta_url, location request,
   * media carousel)
   */
  async sendInteractiveMessage(
    to: string,
    interactive: Interactive,
    replyToMessageId?: string,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      ...this.messageEnvelope(to, replyToMessageId),
      type: 'interactive',
      interactive,
    });
  }

  /**
   * Mark message as read and optionally show typing indicator
   */
  async markMessageAsRead(
    messageId: string,
    showTyping = false,
  ): Promise<WhatsAppApiResponse | null> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    // Add typing indicator if requested
    if (showTyping) {
      payload.typing_indicator = {
        type: 'text',
      };
    }

    return this.sendRequest('messages', payload);
  }
}
