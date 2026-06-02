import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingTextMessageDto } from './dto/nats-message.dto';

@Injectable()
export class IncomingMessageProducer {
  private readonly logger = new Logger(IncomingMessageProducer.name);
  private readonly subject: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.incomingText') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_INCOMING_TEXT not configured. Set NATS_SUBJECT_INCOMING_TEXT in environment',
      );
    }
  }

  /**
   * Send a single incoming WhatsApp message to NATS JetStream
   */
  async sendMessage(
    message: IncomingTextMessageDto,
  ): Promise<{ success: boolean }> {
    if (!this.subject) {
      this.logger.error('Incoming NATS subject not configured');
      return { success: false };
    }

    try {
      await this.natsService.publish(this.subject, message);

      this.logger.log(
        `Incoming message published to NATS. From: ${message.from}, Type: ${message.type}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to publish incoming message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }
}
