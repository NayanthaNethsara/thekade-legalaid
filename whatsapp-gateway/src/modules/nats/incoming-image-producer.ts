import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingImageMessageDto } from './dto/nats-message.dto';

@Injectable()
export class IncomingImageProducer {
  private readonly logger = new Logger(IncomingImageProducer.name);
  private readonly subject: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.incomingImage') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_INCOMING_IMAGE not configured. Set NATS_SUBJECT_INCOMING_IMAGE in environment',
      );
    }
  }

  async sendImageMessage(message: IncomingImageMessageDto): Promise<void> {
    if (!this.subject) {
      throw new Error('Incoming image NATS subject not configured');
    }

    try {
      await this.natsService.publish(this.subject, message);
      this.logger.log(
        `Incoming image message published to NATS. MessageID: ${message.messageId}, From: ${message.from}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish image message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
