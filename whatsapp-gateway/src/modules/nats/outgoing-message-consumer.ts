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

          const parsedMessage = payload as OutgoingWhatsAppMessageDto;

          // Simple validation
          if (!parsedMessage.to) {
            this.logger.error('Invalid message: missing recipient');
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
