import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingVideoMessageDto } from './dto/nats-message.dto';

@Injectable()
export class IncomingVideoProducer {
  private readonly logger = new Logger(IncomingVideoProducer.name);
  private readonly subject: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.incomingVideo') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_INCOMING_VIDEO not configured. Set NATS_SUBJECT_INCOMING_VIDEO in environment',
      );
    }
  }

  async sendVideoMessage(message: IncomingVideoMessageDto): Promise<void> {
    if (!this.subject) {
      throw new Error('Incoming video NATS subject not configured');
    }

    try {
      await this.natsService.publish(this.subject, message);
      this.logger.log(
        `Incoming video message published to NATS. MessageID: ${message.messageId}, From: ${message.from}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish video message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
