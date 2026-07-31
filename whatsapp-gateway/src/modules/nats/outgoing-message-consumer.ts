import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  maskPhoneNumber,
  sanitizePayload,
} from '../../common/utils/logger.utils';
import { ConfigService } from '@nestjs/config';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';
import { NatsService } from './nats.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { TypingIndicatorService } from '../whatsapp/typing-indicator.service';
import {
  toWireInteractive,
  toWireContact,
} from '../whatsapp/interactive.mapper';
import { OUTGOING_MESSAGES } from '../metrics/metrics.module';
import { WhatsAppApiResponse } from '../../types/whatsapp.types';
import {
  OutgoingMessageDto,
  OutgoingMediaContent,
} from './dto/nats-message.dto';

const OUTGOING_TYPES: ReadonlyArray<OutgoingMessageDto['type']> = [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
  'location',
  'contacts',
  'reaction',
  'interactive',
  'template',
];

@Injectable()
export class OutgoingMessageConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutgoingMessageConsumer.name);
  private readonly outgoingSubject: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly natsService: NatsService,
    private readonly whatsappService: WhatsAppService,
    private readonly typingIndicator: TypingIndicatorService,
    @InjectMetric(OUTGOING_MESSAGES)
    private readonly outgoingMessages: Counter<string>,
  ) {
    this.outgoingSubject =
      this.configService.get<string>('nats.subjects.outgoing') || '';
  }

  async onModuleInit() {
    await this.subscribeToSubject(this.outgoingSubject);
  }

  onModuleDestroy() {
    // NATS service handles disconnection.
  }

  private isOutgoingMessage(payload: unknown): payload is OutgoingMessageDto {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const candidate = payload as { to?: unknown; type?: unknown };
    return (
      typeof candidate.to === 'string' &&
      typeof candidate.type === 'string' &&
      OUTGOING_TYPES.includes(candidate.type as OutgoingMessageDto['type'])
    );
  }

  private mediaReference(content: OutgoingMediaContent): string | null {
    return content.mediaUrl ?? content.mediaId ?? null;
  }

  /**
   * Route an outgoing message to the matching WhatsApp send call. Returns
   * the API response, or null when validation or the send fails.
   */
  private async dispatchSend(
    message: OutgoingMessageDto,
  ): Promise<WhatsAppApiResponse | null> {
    switch (message.type) {
      case 'text': {
        if (!message.content.text) {
          this.logger.error('Invalid text message - missing text');
          return null;
        }
        return this.whatsappService.sendTextMessage(
          message.to,
          message.content.text,
          message.content.previewUrl,
          message.replyToMessageId,
        );
      }

      case 'image':
      case 'video':
      case 'audio':
      case 'sticker': {
        const reference = this.mediaReference(message.content);
        if (!reference) {
          this.logger.error(
            `Invalid ${message.type} message - missing media reference`,
          );
          return null;
        }
        const caption =
          message.type === 'image' || message.type === 'video'
            ? message.content.caption
            : undefined;
        return this.whatsappService.sendMediaMessage(
          message.to,
          message.type,
          reference,
          caption,
          message.replyToMessageId,
        );
      }

      case 'document': {
        const reference = this.mediaReference(message.content);
        if (!reference) {
          this.logger.error(
            'Invalid document message - missing media reference',
          );
          return null;
        }
        return this.whatsappService.sendDocumentMessage(
          message.to,
          reference,
          message.content.caption,
          message.content.filename,
          message.replyToMessageId,
        );
      }

      case 'location': {
        const { latitude, longitude } = message.content;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          this.logger.error('Invalid location message - missing coordinates');
          return null;
        }
        return this.whatsappService.sendLocationMessage(
          message.to,
          message.content,
          message.replyToMessageId,
        );
      }

      case 'contacts': {
        if (!message.content.contacts?.length) {
          this.logger.error('Invalid contacts message - missing contacts');
          return null;
        }
        return this.whatsappService.sendContactsMessage(
          message.to,
          message.content.contacts.map(toWireContact),
          message.replyToMessageId,
        );
      }

      case 'reaction': {
        if (!message.content.messageId) {
          this.logger.error('Invalid reaction message - missing messageId');
          return null;
        }
        return this.whatsappService.sendReactionMessage(
          message.to,
          message.content.messageId,
          message.content.emoji ?? '',
        );
      }

      case 'interactive': {
        const interactive = message.content.interactive;
        if (!interactive?.type || !interactive.body?.text) {
          this.logger.error(
            'Invalid interactive message - missing type or body text',
          );
          return null;
        }
        return this.whatsappService.sendInteractiveMessage(
          message.to,
          toWireInteractive(interactive),
          message.replyToMessageId,
        );
      }

      case 'template': {
        if (!message.content.template?.name) {
          this.logger.error('Invalid template message - missing template name');
          return null;
        }
        return this.whatsappService.sendTemplateMessage(
          message.to,
          message.content.template,
          message.replyToMessageId,
        );
      }
    }
  }

  private async sendWhatsAppMessage(
    message: OutgoingMessageDto,
  ): Promise<boolean> {
    try {
      const response = await this.dispatchSend(message);
      if (response === null) {
        return false;
      }

      // The wamid links this send to later delivery-status webhooks.
      const messageId = response.messages?.[0]?.id ?? 'unknown';
      this.logger.log(
        `Outgoing ${message.type} message sent to ${maskPhoneNumber(message.to)} (id: ${messageId})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      return false;
    }
  }

  private async subscribeToSubject(subject: string): Promise<void> {
    this.logger.log(`Starting to consume NATS subject: ${subject}`);
    await this.natsService.subscribe(subject, async (payload) => {
      if (!this.isOutgoingMessage(payload)) {
        this.logger.error(
          `Invalid outgoing payload on ${subject}: ${JSON.stringify(sanitizePayload(payload))}`,
        );
        return;
      }

      this.logger.log(
        `Processing outgoing ${payload.type} message to: ${maskPhoneNumber(payload.to)}`,
      );
      this.typingIndicator.stop(payload.to);
      const sent = await this.sendWhatsAppMessage(payload);
      this.outgoingMessages.inc({
        type: payload.type,
        status: sent ? 'sent' : 'failed',
      });
    });
  }
}
