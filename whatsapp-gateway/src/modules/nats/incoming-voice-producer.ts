import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingVoiceMessageDto } from './dto/nats-message.dto';

@Injectable()
export class IncomingVoiceProducer {
  private readonly logger = new Logger(IncomingVoiceProducer.name);
  private readonly subject: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.incomingVoice') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_INCOMING_VOICE not configured. Set NATS_SUBJECT_INCOMING_VOICE in environment',
      );
    }
  }

  async sendVoiceMessage(message: IncomingVoiceMessageDto): Promise<void> {
    if (!this.subject) {
      throw new Error('Incoming voice NATS subject not configured');
    }

    try {
      await this.natsService.publish(this.subject, message);
      this.logger.log(
        `Incoming voice message published to NATS. MessageID: ${message.messageId}, From: ${message.from}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish voice message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
