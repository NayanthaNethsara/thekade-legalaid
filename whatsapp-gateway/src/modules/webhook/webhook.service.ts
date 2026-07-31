import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  maskPhoneNumber,
  sanitizePayload,
} from '../../common/utils/logger.utils';
import type {
  WebhookPayload,
  WebhookChange,
  WhatsAppMessage,
  WhatsAppMetadata,
  MessageContext,
  Contact,
} from './dto/webhook-event.dto';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { TypingIndicatorService } from '../whatsapp/typing-indicator.service';
import { IncomingProducer } from '../nats/incoming-producer';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { INCOMING_MESSAGES } from '../metrics/metrics.module';
import {
  IncomingMessageContext,
  IncomingMessageDto,
  IncomingMessageMetadata,
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
    private readonly typingIndicator: TypingIndicatorService,
    private readonly configService: ConfigService,
    private readonly incomingProducer: IncomingProducer,
    @InjectMetric(INCOMING_MESSAGES)
    private readonly incomingMessages: Counter<string>,
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
   * Verify the X-Hub-Signature-256 header to ensure the request is from Meta.
   */
  verifySignature(rawBody: string, signature: string): boolean {
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
      const expectedSignature = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      const signatureHash = signature.startsWith('sha256=')
        ? signature.substring(7)
        : signature;

      const signatureBuffer = Buffer.from(signatureHash, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (signatureBuffer.length !== expectedBuffer.length) {
        this.logger.warn('Signature verification failed (length mismatch)');
        return false;
      }

      // Timing-safe comparison prevents timing attacks.
      const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

      if (!isValid) {
        this.logger.warn('Signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying signature:', error);
      return false;
    }
  }

  async processWebhookEvent(payload: Record<string, unknown>): Promise<void> {
    if (!this.isWebhookPayload(payload)) {
      this.logger.error('Invalid webhook payload structure');
      return;
    }

    this.logger.log(`Processing webhook for object: ${payload.object}`);

    for (const entry of payload.entry) {
      for (const change of entry.changes ?? []) {
        await this.handleWhatsAppChange(change);
      }
    }
  }

  private async handleWhatsAppChange(change: WebhookChange): Promise<void> {
    if (change.field !== 'messages') {
      return;
    }

    this.logStatusUpdates(change);

    if (!change.value.messages) {
      return;
    }

    for (const message of change.value.messages) {
      const contactName = this.resolveContactName(
        change.value.contacts,
        message.from,
      );
      await this.handleIncomingWhatsAppMessage(
        message,
        change.value.metadata,
        contactName,
      );
    }
  }

  /**
   * Log delivery-status updates for messages we sent. A message the API
   * accepted can still fail afterwards (e.g. an unreachable media link or a
   * closed customer service window); the reason only surfaces here.
   */
  private logStatusUpdates(change: WebhookChange): void {
    for (const status of change.value.statuses ?? []) {
      if (status.status === 'failed' || status.errors?.length) {
        this.logger.error(
          `Message ${status.id} to ${maskPhoneNumber(status.recipient_id)} ${status.status}: ${JSON.stringify(sanitizePayload(status.errors ?? []))}`,
        );
      } else {
        this.logger.log(
          `Message ${status.id} to ${maskPhoneNumber(status.recipient_id)}: ${status.status}`,
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
    this.incomingMessages.inc({ type: message.type });

    switch (message.type) {
      case 'text':
      case 'interactive':
      case 'button':
        await this.handleTextMessage(message, metadata, contactName);
        break;
      case 'image':
      case 'video':
      case 'audio':
      case 'document':
        if (this.configService.get<boolean>('whatsapp.mediaSupported')) {
          await this.handleMediaMessage(
            message,
            metadata,
            contactName,
            message.type,
          );
        } else {
          this.logger.log(
            `Media support is disabled. Replying fallback for: ${message.type}`,
          );
          const reply = this.getMediaFallbackReply(message.type);
          await this.whatsappService.sendTextMessage(
            message.from,
            reply,
            false,
            message.id,
          );
        }
        break;
      default: {
        this.logger.log(`Unsupported message type: ${message.type}`);
        const reply = this.getMediaFallbackReply(message.type);
        await this.whatsappService.sendTextMessage(
          message.from,
          reply,
          false,
          message.id,
        );
        break;
      }
    }
  }

  private getMediaFallbackReply(type: string): string {
    switch (type) {
      case 'image':
        return (
          'I wish I could look at that image, but I can only read text messages for now. ' +
          'I hope to support image searches on WhatsApp soon!'
        );
      case 'video':
        return (
          "I can't play videos yet, but I can read your text messages. " +
          "Please type what you're looking for!"
        );
      case 'audio':
        return (
          "I'd love to listen to your voice message, but I can only read text for now. " +
          'Could you type it out for me instead?'
        );
      case 'document':
        return (
          "I can't open documents or files yet. If you have questions or want to search " +
          'for something, just type it out!'
        );
      case 'sticker':
        return (
          'I wish I could see that sticker! I can only understand text messages for now, ' +
          'so please write down what you need.'
        );
      case 'location':
        return (
          "I can't read map locations yet. If you are searching for a specific store or " +
          'delivery area, please type the address in text!'
        );
      default:
        return (
          'I wish I could understand that type of message! I can only read text messages ' +
          'right now, but I hope to support other formats soon.'
        );
    }
  }

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

    void this.typingIndicator.start(message.id, message.from);
    await this.incomingProducer.publish({
      ...this.buildEnvelope(message, metadata, contactName),
      type: 'text',
      text: payload.text,
      source: payload.source,
      replyId: payload.replyId,
    });
  }

  /**
   * Publish a standardized media message. The bytes are not fetched here; the
   * WhatsApp `mediaId` is forwarded so a downstream consumer can download and
   * store the file.
   */
  private async handleMediaMessage(
    message: WhatsAppMessage,
    metadata: WhatsAppMetadata,
    contactName: string | null,
    type: MediaMessageType,
  ): Promise<void> {
    this.logger.log(
      `Received ${type} message from ${maskPhoneNumber(message.from)}: ${message.id}`,
    );

    const details = this.extractMediaDetails(message, type);
    if (!details) {
      this.logger.error(`No media ID found for ${type} message`);
      return;
    }

    void this.typingIndicator.start(message.id, message.from);

    const base = {
      ...this.buildEnvelope(message, metadata, contactName),
      mediaId: details.mediaId,
      mimeType: details.mimeType,
      sha256: details.sha256,
    };

    const dto: IncomingMessageDto =
      type === 'audio'
        ? { ...base, type, voice: details.isVoice }
        : type === 'document'
          ? {
              ...base,
              type,
              caption: details.caption,
              filename: details.filename,
            }
          : { ...base, type, caption: details.caption };

    await this.incomingProducer.publish(dto);
  }
}
