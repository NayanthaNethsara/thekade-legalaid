import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
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
  ) {
    this.outgoingSubject =
      this.configService.get<string>('nats.subjects.outgoing') || '';

    if (!this.outgoingSubject) {
      this.logger.warn(
        'Outgoing NATS subject not configured. Set NATS_SUBJECT_OUTGOING in environment',
      );
    }
  }

  async onModuleInit() {
    if (!this.outgoingSubject) {
      this.logger.error(
        'Outgoing NATS subject not configured. Consumer not started.',
      );
      return;
    }

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
   * Dispatch an outgoing message to the matching WhatsApp send call.
   */
  private async sendWhatsAppMessage(
    message: OutgoingMessageDto,
  ): Promise<boolean> {
    try {
      switch (message.type) {
        case 'text': {
          if (!message.content.text) {
            this.logger.error('Invalid text message - missing text');
            return false;
          }
          await this.whatsappService.sendTextMessage(
            message.to,
            message.content.text,
          );
          break;
        }

        case 'image':
        case 'video':
        case 'audio': {
          const reference = this.mediaReference(message.content);
          if (!reference) {
            this.logger.error(
              `Invalid ${message.type} message - missing media reference`,
            );
            return false;
          }
          const caption =
            message.type === 'audio' ? undefined : message.content.caption;
          await this.whatsappService.sendMediaMessage(
            message.to,
            message.type,
            reference,
            caption,
          );
          break;
        }

        case 'document': {
          const reference = this.mediaReference(message.content);
          if (!reference) {
            this.logger.error(
              'Invalid document message - missing media reference',
            );
            return false;
          }
          await this.whatsappService.sendDocumentMessage(
            message.to,
            reference,
            message.content.caption,
            message.content.filename,
          );
          break;
        }

        case 'interactive': {
          if (!message.content.interactive?.body?.text) {
            this.logger.error(
              'Invalid interactive message - missing body text',
            );
            return false;
          }
          await this.whatsappService.sendInteractiveMessage(
            message.to,
            message.content.interactive,
          );
          break;
        }

        case 'template': {
          if (!message.content.template?.name) {
            this.logger.error(
              'Invalid template message - missing template name',
            );
            return false;
          }
          await this.whatsappService.sendTemplateMessage(
            message.to,
            message.content.template,
          );
          break;
        }
      }

      this.logger.log(`Outgoing ${message.type} message sent to ${message.to}`);
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
    if (!subject) {
      return;
    }

    this.logger.log(`Starting to consume NATS subject: ${subject}`);
    await this.natsService.subscribe(subject, async (payload) => {
      if (!this.isOutgoingMessage(payload)) {
        this.logger.error(
          `Invalid outgoing payload on ${subject}: ${JSON.stringify(payload)}`,
        );
        return;
      }

      this.logger.log(
        `Processing outgoing ${payload.type} message to: ${payload.to}`,
      );
      await this.sendWhatsAppMessage(payload);
    });
  }
}
