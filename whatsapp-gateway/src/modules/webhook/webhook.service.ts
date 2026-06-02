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
  Contact,
} from './dto/webhook-event.dto';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { IncomingMessageProducer } from '../nats/incoming-message-producer';
import { IncomingImageProducer } from '../nats/incoming-image-producer';
import { IncomingVideoProducer } from '../nats/incoming-video-producer';
import { IncomingAudioProducer } from '../nats/incoming-audio-producer';
import { IncomingDocumentProducer } from '../nats/incoming-document-producer';
import {
  IncomingMessageContext,
  IncomingMessageMetadata,
  IncomingTextMessageDto,
  IncomingTextSource,
} from '../nats/dto/nats-message.dto';

type MediaMessageType = 'image' | 'video' | 'audio' | 'document';

/** Common envelope shared by every standardized incoming format. */
type IncomingEnvelope = {
  messageId: string;
  from: string;
  to: string;
  timestamp: string;
  contactName: string | null;
  context: IncomingMessageContext | null;
  metadata: IncomingMessageMetadata;
};

/** Envelope plus the media metadata extracted from the webhook payload. */
type IncomingMedia = IncomingEnvelope & {
  mediaId: string;
  mimeType: string | null;
  sha256: string | null;
  caption: string | null;
  filename: string | null;
  isVoice: boolean;
};

type MediaDetails = {
  mediaId: string;
  mimeType: string | null;
  caption: string | null;
  filename: string | null;
  sha256: string | null;
  isVoice: boolean;
};

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
    private readonly incomingMessageProducer: IncomingMessageProducer,
    private readonly incomingImageProducer: IncomingImageProducer,
    private readonly incomingVideoProducer: IncomingVideoProducer,
    private readonly incomingAudioProducer: IncomingAudioProducer,
    private readonly incomingDocumentProducer: IncomingDocumentProducer,
  ) {}

  private buildContext(
    context: MessageContext | undefined,
  ): IncomingMessageContext | null {
    if (!context) {
      return null;
    }

    return {
      messageId: context.id,
      from: context.from,
    };
  }

  private resolveContactName(
    contacts: Contact[] | undefined,
    waId: string,
  ): string | null {
    if (!contacts || contacts.length === 0) {
      return null;
    }

    const match = contacts.find((contact) => contact.wa_id === waId);
    return (match ?? contacts[0]).profile?.name ?? null;
  }

  private buildEnvelope(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
  ): IncomingEnvelope {
    return {
      messageId: message.id,
      from: message.from,
      to: metadata.phone_number_id,
      timestamp: message.timestamp,
      contactName,
      context: this.buildContext(message.context),
      metadata: {
        phoneNumberId: metadata.phone_number_id,
        displayPhoneNumber: metadata.display_phone_number,
      },
    };
  }

  /**
   * Collapse the several text-bearing message shapes (plain text, interactive
   * button/list reply, template quick reply) into a single normalized payload.
   */
  private normalizeTextPayload(message: WhatsAppMessage): {
    text: string;
    source: IncomingTextSource;
    replyId: string | null;
  } | null {
    switch (message.type) {
      case 'text': {
        const body = message.text?.body;
        return body ? { text: body, source: 'text', replyId: null } : null;
      }
      case 'interactive': {
        const buttonReply = message.interactive?.button_reply;
        if (buttonReply) {
          return {
            text: buttonReply.title,
            source: 'button_reply',
            replyId: buttonReply.id,
          };
        }

        const listReply = message.interactive?.list_reply;
        if (listReply) {
          return {
            text: listReply.title,
            source: 'list_reply',
            replyId: listReply.id,
          };
        }

        return null;
      }
      case 'button': {
        const button = message.button;
        return button?.text
          ? {
              text: button.text,
              source: 'quick_reply',
              replyId: button.payload ?? null,
            }
          : null;
      }
      default:
        return null;
    }
  }

  private extractMediaDetails(
    message: WhatsAppMessage,
    expectedType: MediaMessageType,
  ): MediaDetails | null {
    const media =
      expectedType === 'image'
        ? message.image
        : expectedType === 'video'
          ? message.video
          : expectedType === 'audio'
            ? message.audio
            : message.document;

    if (!media?.id) {
      return null;
    }

    return {
      mediaId: media.id,
      mimeType: media.mime_type ?? null,
      caption: expectedType === 'audio' ? null : (media.caption ?? null),
      filename:
        expectedType === 'document'
          ? (message.document?.filename ?? null)
          : null,
      sha256: media.sha256 ?? null,
      isVoice:
        expectedType === 'audio' ? (message.audio?.voice ?? false) : false,
    };
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
        const contactName = this.resolveContactName(
          value.contacts,
          message.from,
        );
        await this.handleIncomingWhatsAppMessage(
          message,
          value.metadata,
          contactName,
        );
      }
    }
  }

  /**
   * Route an incoming message to the handler for its standardized format.
   */
  private async handleIncomingWhatsAppMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
  ): Promise<void> {
    switch (message.type) {
      case 'text':
      case 'interactive':
      case 'button':
        await this.handleTextMessage(message, metadata, contactName);
        break;
      case 'image':
        await this.handleImageMessage(message, metadata, contactName);
        break;
      case 'video':
        await this.handleVideoMessage(message, metadata, contactName);
        break;
      case 'audio':
        await this.handleAudioMessage(message, metadata, contactName);
        break;
      case 'document':
        await this.handleDocumentMessage(message, metadata, contactName);
        break;
      default:
        this.logger.log(`Unsupported message type: ${message.type}`);
    }
  }

  /**
   * Normalize any text-bearing message to the text format and publish it.
   */
  private async handleTextMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
  ): Promise<void> {
    const payload = this.normalizeTextPayload(message);
    if (!payload) {
      this.logger.warn(`Text message ${message.id} has no readable content`);
      return;
    }

    await this.whatsappService.markMessageAsRead(message.id, true);

    const textMessage: IncomingTextMessageDto = {
      ...this.buildEnvelope(message, metadata, contactName),
      type: 'text',
      text: payload.text,
      source: payload.source,
      replyId: payload.replyId,
    };

    await this.incomingMessageProducer.sendMessage(textMessage);
  }

  private async handleImageMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
  ): Promise<void> {
    const media = this.buildMedia(message, metadata, contactName, 'image');
    if (!media) {
      return;
    }

    await this.whatsappService.markMessageAsRead(message.id, true);
    await this.incomingImageProducer.sendImageMessage({
      ...this.toEnvelope(media),
      type: 'image',
      mediaId: media.mediaId,
      mimeType: media.mimeType,
      sha256: media.sha256,
      caption: media.caption,
    });
  }

  private async handleVideoMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
  ): Promise<void> {
    const media = this.buildMedia(message, metadata, contactName, 'video');
    if (!media) {
      return;
    }

    await this.whatsappService.markMessageAsRead(message.id, true);
    await this.incomingVideoProducer.sendVideoMessage({
      ...this.toEnvelope(media),
      type: 'video',
      mediaId: media.mediaId,
      mimeType: media.mimeType,
      sha256: media.sha256,
      caption: media.caption,
    });
  }

  private async handleAudioMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
  ): Promise<void> {
    const media = this.buildMedia(message, metadata, contactName, 'audio');
    if (!media) {
      return;
    }

    await this.whatsappService.markMessageAsRead(message.id, true);
    await this.incomingAudioProducer.sendAudioMessage({
      ...this.toEnvelope(media),
      type: 'audio',
      mediaId: media.mediaId,
      mimeType: media.mimeType,
      sha256: media.sha256,
      voice: media.isVoice,
    });
  }

  private async handleDocumentMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
  ): Promise<void> {
    const media = this.buildMedia(message, metadata, contactName, 'document');
    if (!media) {
      return;
    }

    await this.whatsappService.markMessageAsRead(message.id, true);
    await this.incomingDocumentProducer.sendDocumentMessage({
      ...this.toEnvelope(media),
      type: 'document',
      mediaId: media.mediaId,
      mimeType: media.mimeType,
      sha256: media.sha256,
      caption: media.caption,
      filename: media.filename,
    });
  }

  private toEnvelope(media: IncomingMedia): IncomingEnvelope {
    return {
      messageId: media.messageId,
      from: media.from,
      to: media.to,
      timestamp: media.timestamp,
      contactName: media.contactName,
      context: media.context,
      metadata: media.metadata,
    };
  }

  /**
   * Build the standardized media envelope from the webhook payload. The bytes
   * are not fetched here; the WhatsApp `mediaId` is forwarded so a downstream
   * consumer can download and store the file. Returns null when the payload
   * carries no media id.
   */
  private buildMedia(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
    expectedType: MediaMessageType,
  ): IncomingMedia | null {
    this.logger.log(
      `Received ${expectedType} message from ${message.from}: ${message.id}`,
    );

    const mediaDetails = this.extractMediaDetails(message, expectedType);
    if (!mediaDetails) {
      this.logger.error(`No media ID found for ${expectedType} message`);
      return null;
    }

    return {
      ...this.buildEnvelope(message, metadata, contactName),
      mediaId: mediaDetails.mediaId,
      mimeType: mediaDetails.mimeType,
      sha256: mediaDetails.sha256,
      caption: mediaDetails.caption,
      filename: mediaDetails.filename,
      isVoice: mediaDetails.isVoice,
    };
  }
}
