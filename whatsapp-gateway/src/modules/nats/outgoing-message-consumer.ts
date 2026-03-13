import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { OutgoingWhatsAppMessageDto } from './dto/nats-message.dto';

type LegacyOutgoingWhatsAppMessage = OutgoingWhatsAppMessageDto & {
  text?: string;
};

@Injectable()
export class OutgoingMessageConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutgoingMessageConsumer.name);
  private readonly subject: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly natsService: NatsService,
    private readonly whatsappService: WhatsAppService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.outgoing') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_OUTGOING not configured. Set NATS_SUBJECT_OUTGOING in environment',
      );
    }
  }

  async onModuleInit() {
    if (!this.subject) {
      this.logger.error(
        'Outgoing NATS subject not configured. Consumer not started.',
      );
      return;
    }

    this.logger.log(`Starting to consume NATS subject: ${this.subject}`);
    await this.natsService.subscribe(
      this.subject,
      'whatsapp_gateway_outgoing',
      async (payload) => {
        try {
          const messageContent = JSON.stringify(payload);
          this.logger.log('=== INCOMING NATS MESSAGE ===');
          this.logger.log(`Raw message body: ${messageContent}`);
          this.logger.log('==============================');

          const parsedMessage = this.normalizeOutgoingMessage(
            payload as LegacyOutgoingWhatsAppMessage,
          );

          // Simple validation
          if (!parsedMessage) {
            this.logger.error('Invalid message: unsupported outgoing payload');
            return;
          }

          this.logger.log(
            `Processing outgoing ${parsedMessage.type} message to: ${parsedMessage.to}`,
          );

          await this.sendWhatsAppMessage(parsedMessage);
        } catch (error) {
          this.logger.error(
            `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : '',
          );
        }
      },
    );
  }

  onModuleDestroy() {
    // NATS service handles disconnection
  }

  private normalizeOutgoingMessage(
    payload: LegacyOutgoingWhatsAppMessage,
  ): OutgoingWhatsAppMessageDto | null {
    const content = payload.content ?? {};
    const normalizedType = payload.type ?? 'text';
    const normalizedText = content.text ?? payload.text;

    if (!payload.to) {
      return null;
    }

    if (normalizedType === 'interactive' && content.interactive) {
      return {
        to: payload.to,
        type: 'interactive',
        content: {
          text: normalizedText,
          interactive: content.interactive,
        },
        replyToMessageId: payload.replyToMessageId,
      };
    }

    if (!normalizedText) {
      return null;
    }

    return {
      to: payload.to,
      type: 'text',
      content: {
        text: normalizedText,
      },
      replyToMessageId: payload.replyToMessageId,
    };
  }

  /**
   * Send message via WhatsApp (text or interactive)
   */
  private async sendWhatsAppMessage(
    message: OutgoingWhatsAppMessageDto,
  ): Promise<boolean> {
    try {
      // Validate message structure
      if (!message.to) {
        this.logger.error('Invalid message - missing recipient');
        return false;
      }

      // Handle interactive messages
      if (message.type === 'interactive' && message.content?.interactive) {
        if (!message.content.interactive.body?.text) {
          this.logger.error('Invalid interactive message - missing body text');
          return false;
        }

        await this.whatsappService.sendInteractiveMessage(
          message.to,
          message.content.interactive,
        );

        this.logger.log(`Interactive message sent to ${message.to}`);
        return true;
      }

      // Handle text messages
      if (!message.content?.text) {
        this.logger.error('Invalid message - missing text content');
        return false;
      }

      await this.whatsappService.sendTextMessage(
        message.to,
        message.content.text,
      );

      this.logger.log(`Text message sent to ${message.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      return false;
    }
  }
}
