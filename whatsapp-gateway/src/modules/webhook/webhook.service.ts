import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  WebhookPayload,
  WebhookChange,
  WhatsAppValue,
  WhatsAppMessage,
  WhatsAppMetadata,
  MessageContext,
} from './dto/webhook-event.dto';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { IncomingDocumentProducer } from '../nats/incoming-document-producer';
import { IncomingMessageProducer } from '../nats/incoming-message-producer';
import { IncomingFileProducer } from '../nats/incoming-file-producer';
import { IncomingVoiceProducer } from '../nats/incoming-voice-producer';
import { BlobStorageService } from '../azure/blob-storage.service';
import {
  IncomingFileMessageDto,
  IncomingDocumentMessageDto,
  IncomingWhatsAppMessageDto,
  IncomingVoiceMessageDto,
} from '../nats/dto/nats-message.dto';

type UploadableMessageType = 'image' | 'video' | 'audio' | 'document';
type MediaDetails = {
  mediaId: string;
  mimeType: string | null;
  caption: string | null;
  filename: string | null;
};

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
    private readonly incomingDocumentProducer: IncomingDocumentProducer,
    private readonly incomingMessageProducer: IncomingMessageProducer,
    private readonly incomingFileProducer: IncomingFileProducer,
    private readonly incomingVoiceProducer: IncomingVoiceProducer,
    private readonly blobStorageService: BlobStorageService,
  ) {}

  private buildContext(
    context: MessageContext | undefined,
  ): IncomingWhatsAppMessageDto['context'] {
    if (!context) {
      return null;
    }

    return {
      messageId: context.id,
      from: context.from,
    };
  }

  private extractMediaDetails(
    message: WhatsAppMessage,
    expectedType: UploadableMessageType,
  ): MediaDetails | null {
    switch (expectedType) {
      case 'image': {
        const mediaId = message.image?.id;
        if (!mediaId) {
          return null;
        }

        return {
          mediaId,
          mimeType: message.image?.mime_type ?? null,
          caption: message.image?.caption ?? null,
          filename: null,
        };
      }
      case 'video': {
        const mediaId = message.video?.id;
        if (!mediaId) {
          return null;
        }

        return {
          mediaId,
          mimeType: message.video?.mime_type ?? null,
          caption: message.video?.caption ?? null,
          filename: null,
        };
      }
      case 'audio': {
        const mediaId = message.audio?.id;
        if (!mediaId) {
          return null;
        }

        return {
          mediaId,
          mimeType: message.audio?.mime_type ?? null,
          caption: null,
          filename: null,
        };
      }
      case 'document': {
        const mediaId = message.document?.id;
        if (!mediaId) {
          return null;
        }

        return {
          mediaId,
          mimeType: message.document?.mime_type ?? null,
          caption: message.document?.caption ?? null,
          filename: message.document?.filename ?? null,
        };
      }
      default:
        return null;
    }
  }

  /**
   * Type guard to validate webhook payload structure
   */
  private isWebhookPayload(payload: unknown): payload is WebhookPayload {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'object' in payload &&
      typeof (payload as Record<string, unknown>).object === 'string' &&
      'entry' in payload &&
      Array.isArray((payload as Record<string, unknown>).entry)
    );
  }

  /**
   * Verify the signature of the webhook request
   * This ensures the request is actually from Meta
   */
  verifySignature(rawBody: string, signature: string): boolean {
    this.logger.debug('=== SIGNATURE VERIFICATION START ===');

    if (!signature) {
      this.logger.warn('No signature provided in request');
      return false;
    }

    const appSecret = this.configService.get<string>('meta.appSecret');
    if (!appSecret) {
      this.logger.error('META_APP_SECRET is not configured');
      return false;
    }

    try {
      // Create expected signature from raw body
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      // Extract the signature hash (remove 'sha256=' prefix if present)
      const signatureHash = signature.startsWith('sha256=')
        ? signature.substring(7)
        : signature;

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );

      if (!isValid) {
        this.logger.warn('Signature verification failed');
      } else {
        this.logger.log('Signature verification successful');
      }

      this.logger.debug('=== SIGNATURE VERIFICATION END ===');

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Process the webhook event
   */
  async processWebhookEvent(payload: Record<string, unknown>): Promise<void> {
    // Type guard: validate payload structure
    if (!this.isWebhookPayload(payload)) {
      this.logger.error('Invalid webhook payload structure');
      return;
    }

    this.logger.log(`Processing webhook for object: ${payload.object}`);

    if (!payload.entry || payload.entry.length === 0) {
      this.logger.warn('No entries in webhook payload');
      return;
    }

    for (const entry of payload.entry) {
      if (entry.changes) {
        for (const change of entry.changes) {
          await this.handleWhatsAppChange(change);
        }
      }
    }
  }

  /**
   * Handle WhatsApp webhook changes
   */
  private async handleWhatsAppChange(change: WebhookChange): Promise<void> {
    if (change.field !== 'messages') {
      return;
    }

    const value: WhatsAppValue = change.value;

    if (value.messages) {
      for (const message of value.messages) {
        await this.handleIncomingWhatsAppMessage(message, value.metadata);
      }
    }
  }

  /**
   * Handle incoming WhatsApp messages - route by type
   */
  private async handleIncomingWhatsAppMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
  ): Promise<void> {
    const { type } = message;

    switch (type) {
      case 'text':
        await this.handleTextMessage(message, metadata);
        break;
      case 'interactive':
      case 'button':
        await this.handleInteractiveMessage(message, metadata);
        break;
      case 'audio':
        await this.handleVoiceMessage(message, metadata);
        break;
      case 'document':
        await this.handleDocumentMessage(message, metadata);
        break;
      case 'image':
      case 'video':
      case 'location':
        await this.handleNonTextMessage(message, metadata);
        break;
      default:
        this.logger.log(`Unsupported message type: ${type}`);
    }
  }

  /**
   * Handle text messages - send to SQS queue
   */
  private async handleTextMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
  ): Promise<void> {
    const { id: messageId, from } = message;

    if (!message.text?.body) {
      this.logger.warn(`Text message ${messageId} has no body content`);
      return;
    }

    const textContent = message.text.body;

    // Mark as read and show typing indicator for 5 seconds (for testing/debugging)
    await this.whatsappService.markMessageAsRead(messageId, true);

    this.logger.log(
      `Typing indicator started for ${from} - waiting 5 seconds before queuing`,
    );

    // Wait 5 seconds so typing indicator is visible (for testing)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    this.logger.log(`5 seconds passed, now sending to queue for AI processing`);

    // Convert to DTO and push to SQS
    const incomingMessageDto: IncomingWhatsAppMessageDto = {
      messageId,
      from,
      to: metadata.phone_number_id,
      timestamp: message.timestamp,
      type: 'text',
      content: textContent,
      context: this.buildContext(message.context),
      metadata: {
        phoneNumberId: metadata.phone_number_id,
        displayPhoneNumber: metadata.display_phone_number,
      },
    };

    await this.incomingMessageProducer.sendMessage(incomingMessageDto);
  }

  /**
   * Handle interactive messages (button/list replies) - send to SQS queue
   */
  private async handleInteractiveMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
  ): Promise<void> {
    const { id: messageId, from } = message;

    if (!message.interactive) {
      this.logger.warn(
        `Interactive message ${messageId} has no interactive content`,
      );
      return;
    }

    const interactiveContent = message.interactive;
    const selectedText =
      interactiveContent.button_reply?.title ||
      interactiveContent.list_reply?.title;

    if (!selectedText) {
      this.logger.warn(`Interactive message ${messageId} has no selected text`);
      return;
    }

    this.logger.log(
      `Received interactive ${interactiveContent.type} from ${from}`,
    );

    // Mark as read WITH typing indicator - shows typing while processing button click
    await this.whatsappService.markMessageAsRead(messageId, true);

    // Convert to DTO and push to SQS
    const incomingMessageDto: IncomingWhatsAppMessageDto = {
      messageId,
      from,
      to: metadata.phone_number_id,
      timestamp: message.timestamp,
      type: 'text',
      content: selectedText,
      context: this.buildContext(message.context),
      metadata: {
        phoneNumberId: metadata.phone_number_id,
        displayPhoneNumber: metadata.display_phone_number,
      },
    };

    await this.incomingMessageProducer.sendMessage(incomingMessageDto);
  }

  private async handleVoiceMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
  ): Promise<void> {
    if (message.type !== 'audio') {
      this.logger.warn(
        `Unexpected message type for voice handler: ${message.type}`,
      );
      return;
    }

    const voiceMessage = await this.buildUploadedMediaMessage(
      message,
      metadata,
      'audio',
    );
    if (!voiceMessage || voiceMessage.type !== 'audio') {
      return;
    }

    const typedVoiceMessage: IncomingVoiceMessageDto = {
      ...voiceMessage,
      type: 'audio',
    };

    await this.incomingVoiceProducer.sendVoiceMessage(typedVoiceMessage);
    this.logger.log(
      `Audio message sent to voice queue: ${voiceMessage.messageId}`,
    );
  }

  private async handleDocumentMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
  ): Promise<void> {
    if (message.type !== 'document') {
      this.logger.warn(
        `Unexpected message type for document handler: ${message.type}`,
      );
      return;
    }

    const documentMessage = await this.buildUploadedMediaMessage(
      message,
      metadata,
      'document',
    );
    if (!documentMessage || documentMessage.type !== 'document') {
      return;
    }

    const typedDocumentMessage: IncomingDocumentMessageDto = {
      ...documentMessage,
      type: 'document',
    };

    await this.incomingDocumentProducer.sendDocumentMessage(
      typedDocumentMessage,
    );
    this.logger.log(
      `Document message sent to document queue: ${documentMessage.messageId}`,
    );
  }

  private async buildUploadedMediaMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    expectedType: UploadableMessageType,
  ): Promise<IncomingFileMessageDto | null> {
    const { id: messageId, from } = message;
    this.logger.log(
      `Received ${expectedType} message from ${from}: ${messageId}`,
    );

    try {
      const mediaDetails = this.extractMediaDetails(message, expectedType);
      if (!mediaDetails) {
        this.logger.error(`No media ID found for ${expectedType} message`);
        return null;
      }

      await this.whatsappService.markMessageAsRead(messageId, true);
      this.logger.log(
        `Downloading ${expectedType} from WhatsApp (ID: ${mediaDetails.mediaId})`,
      );

      const fileBuffer = await this.whatsappService.downloadMedia(
        mediaDetails.mediaId,
      );
      const maxFileSize = 10 * 1024 * 1024;
      if (fileBuffer.length > maxFileSize) {
        this.logger.warn(
          `File size ${fileBuffer.length} bytes exceeds 10MB limit`,
        );
        await this.whatsappService.sendTextMessage(
          from,
          `Sorry, your ${expectedType} file is too large. Maximum file size is 10MB. Please send a smaller file.`,
        );
        return null;
      }

      this.logger.log(
        `Downloaded ${fileBuffer.length} bytes, uploading to Azure Blob Storage`,
      );

      const fileExtension =
        mediaDetails.mimeType?.split('/')[1] ?? expectedType;
      const fileName =
        mediaDetails.filename ||
        `${expectedType}-${messageId}.${fileExtension}`.substring(0, 100);
      const blobUrl = await this.blobStorageService.uploadFile(
        fileBuffer,
        fileName,
        mediaDetails.mimeType ?? 'application/octet-stream',
        'temp',
      );

      this.logger.log(`File uploaded to Azure Blob Storage: ${blobUrl}`);

      return {
        messageId,
        from,
        to: metadata.phone_number_id,
        timestamp: message.timestamp,
        type: expectedType,
        fileUrl: blobUrl,
        mimeType: mediaDetails.mimeType,
        caption: mediaDetails.caption,
        filename: mediaDetails.filename,
        metadata: {
          phoneNumberId: metadata.phone_number_id,
          displayPhoneNumber: metadata.display_phone_number,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to process ${expectedType} message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );

      await this.whatsappService.sendTextMessage(
        from,
        `Sorry, there was an error processing your ${expectedType} file. Please try again.`,
      );
      return null;
    }
  }

  /**
   * Handle media messages (image, video, audio, document) - download, upload to S3, and send to file queue
   */
  private async handleNonTextMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
  ): Promise<void> {
    if (message.type !== 'image' && message.type !== 'video') {
      this.logger.warn(
        `Unexpected message type for file handler: ${message.type}`,
      );
      return;
    }

    const uploadedMessage = await this.buildUploadedMediaMessage(
      message,
      metadata,
      message.type,
    );
    if (!uploadedMessage) {
      return;
    }

    try {
      await this.incomingFileProducer.sendFileMessage(uploadedMessage);
      this.logger.log(
        `${uploadedMessage.type} message processed and sent to legacy file queue`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish legacy file queue message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
    }
  }
}
