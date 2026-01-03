import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Template,
  Interactive,
  WhatsAppApiResponse,
  WhatsAppApiError,
} from '../../types/whatsapp.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId =
      this.configService.get<string>('whatsapp.phoneNumberId') || '';
    this.accessToken =
      this.configService.get<string>('whatsapp.accessToken') || '';

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn(
        'WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN',
      );
    } else {
      this.logger.log('WhatsApp service initialized successfully');
    }
  }

  private async sendRequest(
    endpoint: string,
    data: Record<string, unknown>,
  ): Promise<WhatsAppApiResponse | null> {
    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.error('WhatsApp client not initialized');
      return null;
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = (await response.json()) as WhatsAppApiError;
        this.logger.error(`WhatsApp API error: ${JSON.stringify(error)}`);
        return null;
      }

      return (await response.json()) as WhatsAppApiResponse;
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(
    to: string,
    text: string,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    });
  }

  /**
   * Send media message (image, video, audio)
   */
  async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'video' | 'audio',
    mediaIdOrUrl: string,
    caption?: string,
  ): Promise<WhatsAppApiResponse | null> {
    const isUrl = mediaIdOrUrl.startsWith('http');
    const mediaPayload: Record<string, string> = isUrl
      ? { link: mediaIdOrUrl }
      : { id: mediaIdOrUrl };

    if (caption && (mediaType === 'image' || mediaType === 'video')) {
      mediaPayload.caption = caption;
    }

    return this.sendRequest('messages', {
      messaging_product: 'whatsapp',
      to,
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
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: documentPayload,
    });
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    to: string,
    template: Template,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      messaging_product: 'whatsapp',
      to,
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
   * Send interactive message (buttons or list)
   */
  async sendInteractiveMessage(
    to: string,
    interactive: Interactive,
  ): Promise<WhatsAppApiResponse | null> {
    return this.sendRequest('messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
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

  /**
   * Send typing indicator by marking message as read with typing indicator
   * This shows the typing animation in WhatsApp
   */
  async sendTypingIndicator(
    messageId: string,
  ): Promise<WhatsAppApiResponse | null> {
    this.logger.log(`Sending typing indicator for message ${messageId}`);

    return this.sendRequest('messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
      typing_indicator: {
        type: 'text',
      },
    });
  }

  /**
   * Download media file from WhatsApp
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    if (!this.accessToken) {
      throw new Error('WhatsApp access token not configured');
    }

    try {
      // Step 1: Get media URL from WhatsApp
      const mediaInfoUrl = `${this.baseUrl}/${mediaId}`;
      const mediaInfoResponse = await fetch(mediaInfoUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!mediaInfoResponse.ok) {
        throw new Error(
          `Failed to get media info: ${mediaInfoResponse.statusText}`,
        );
      }

      const mediaInfo = (await mediaInfoResponse.json()) as {
        url: string;
        mime_type: string;
        sha256: string;
        file_size: number;
      };

      this.logger.log(`Downloading media from: ${mediaInfo.url}`);

      // Step 2: Download the actual file
      const fileResponse = await fetch(mediaInfo.url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!fileResponse.ok) {
        throw new Error(`Failed to download media: ${fileResponse.statusText}`);
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(
        `Failed to download media: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
