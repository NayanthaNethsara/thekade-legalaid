import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  WebhookPayload,
  WebhookChange,
  WhatsAppValue,
  WhatsAppMessage,
  WhatsAppMetadata,
} from './dto/webhook-event.dto';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { IncomingMessageProducer } from '../kafka/incoming-message-producer';
import { IncomingFileProducer } from '../kafka/incoming-file-producer';
import { BlobStorageService } from '../azure/blob-storage.service';
import { IncomingWhatsAppMessageDto } from '../kafka/dto/kafka-message.dto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
    private readonly incomingMessageProducer: IncomingMessageProducer,
    private readonly incomingFileProducer: IncomingFileProducer,
    // private readonly blobStorageService: BlobStorageService,
  ) {}

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
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
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
      content: {
        text: textContent,
      },
      context: message.context
        ? {
            messageId: message.context.id,
            from: message.context.from,
          }
        : undefined,
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
      type: 'interactive',
      content: {
        interactive: {
          type:
            interactiveContent.type === 'button_reply'
              ? 'button_reply'
              : 'list_reply',
          buttonReply: interactiveContent.button_reply,
          listReply: interactiveContent.list_reply,
        },
      },
      context: message.context
        ? {
            messageId: message.context.id,
            from: message.context.from,
          }
        : undefined,
      metadata: {
        phoneNumberId: metadata.phone_number_id,
        displayPhoneNumber: metadata.display_phone_number,
      },
    };

    await this.incomingMessageProducer.sendMessage(incomingMessageDto);
  }

  /**
   * Handle media messages (image, video, audio, document) - download, upload to S3, and send to file queue
   */
  private async handleNonTextMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
  ): Promise<void> {
    const { id: messageId, from, type } = message;
    this.logger.log(`Received ${type} message from ${from}: ${messageId}`);

    try {
      // Get media details based on type
      let mediaId: string | undefined;
      let mimeType: string | undefined;
      let caption: string | undefined;
      let filename: string | undefined;

      switch (type) {
        case 'image':
          mediaId = message.image?.id;
          mimeType = message.image?.mime_type;
          caption = message.image?.caption;
          break;
        case 'video':
          mediaId = message.video?.id;
          mimeType = message.video?.mime_type;
          caption = message.video?.caption;
          break;
        case 'audio':
          mediaId = message.audio?.id;
          mimeType = message.audio?.mime_type;
          break;
        case 'document':
          mediaId = message.document?.id;
          mimeType = message.document?.mime_type;
          caption = message.document?.caption;
          filename = message.document?.filename;
          break;
        default:
          this.logger.warn(`Unsupported media type: ${type}`);
          await this.whatsappService.sendTextMessage(
            from,
            `Sorry, ${type} messages are not supported yet.`,
          );
          return;
      }

      if (!mediaId) {
        this.logger.error(`No media ID found for ${type} message`);
        return;
      }

      // Mark as read and show typing indicator while processing
      await this.whatsappService.markMessageAsRead(messageId, true);

      this.logger.log(`Downloading ${type} from WhatsApp (ID: ${mediaId})`);

      // Download media from WhatsApp
      const fileBuffer = await this.whatsappService.downloadMedia(mediaId);

      // Check file size (10MB limit)
      const maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
      if (fileBuffer.length > maxFileSize) {
        this.logger.warn(
          `File size ${fileBuffer.length} bytes exceeds 10MB limit`,
        );
        await this.whatsappService.sendTextMessage(
          from,
          `Sorry, your ${type} file is too large. Maximum file size is 10MB. Please send a smaller file.`,
        );
        return;
      }

      this.logger.log(
        `Downloaded ${fileBuffer.length} bytes, uploading to Azure Blob Storage`,
      );

      // Upload to Azure Blob Storage
      const fileExtension = mimeType?.split('/')[1] || type;
      const fileName =
        filename || `${type}-${messageId}.${fileExtension}`.substring(0, 100);
      // const blobUrl = await this.blobStorageService.uploadFile(
      //   fileBuffer,
      //   fileName,
      //   mimeType || 'application/octet-stream',
      // 'temp',
      // );
      const blobUrl = 'http://localhost:dummy/file'; // Dummy URL for now

      // this.logger.log(`File uploaded to Azure Blob Storage: ${blobUrl}`);

      // Send to incoming file queue
      await this.incomingFileProducer.sendFileMessage({
        messageId,
        from,
        to: metadata.phone_number_id,
        timestamp: message.timestamp,
        type,
        fileUrl: blobUrl,
        mimeType,
        caption,
        filename,
        metadata: {
          phoneNumberId: metadata.phone_number_id,
          displayPhoneNumber: metadata.display_phone_number,
        },
      });

      this.logger.log(`${type} message processed and sent to file queue`);
    } catch (error) {
      this.logger.error(
        `Failed to process ${type} message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );

      // Send error message to user
      await this.whatsappService.sendTextMessage(
        from,
        `Sorry, there was an error processing your ${type} file. Please try again.`,
      );
    }
  }
}
