import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingAudioMessageDto } from './dto/nats-message.dto';

@Injectable()
export class IncomingAudioProducer {
  private readonly logger = new Logger(IncomingAudioProducer.name);
  private readonly subject: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.incomingAudio') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_INCOMING_AUDIO not configured. Set NATS_SUBJECT_INCOMING_AUDIO in environment',
      );
    }
  }

  async sendAudioMessage(message: IncomingAudioMessageDto): Promise<void> {
    if (!this.subject) {
      throw new Error('Incoming audio NATS subject not configured');
    }

    try {
      await this.natsService.publish(this.subject, message);
      this.logger.log(
        `Incoming audio message published to NATS. MessageID: ${message.messageId}, From: ${message.from}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish audio message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
