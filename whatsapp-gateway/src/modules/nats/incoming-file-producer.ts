import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingFileMessageDto } from './dto/nats-message.dto';

@Injectable()
export class IncomingFileProducer {
  private readonly logger = new Logger(IncomingFileProducer.name);
  private readonly subject: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.incomingFile') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_INCOMING_FILE not configured. Set NATS_SUBJECT_INCOMING_FILE in environment',
      );
    }
  }

  async sendFileMessage(message: IncomingFileMessageDto): Promise<void> {
    if (!this.subject) {
      throw new Error('Incoming file NATS subject not configured');
    }

    try {
      await this.natsService.publish(this.subject, message);

      this.logger.log(
        `Incoming file message published to NATS. MessageID: ${message.messageId}, From: ${message.from}, Type: ${message.type}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish file message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
