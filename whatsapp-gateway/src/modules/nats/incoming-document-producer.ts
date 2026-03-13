import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingDocumentMessageDto } from './dto/nats-message.dto';

@Injectable()
export class IncomingDocumentProducer {
  private readonly logger = new Logger(IncomingDocumentProducer.name);
  private readonly subject: string;

  constructor(
    private readonly natsService: NatsService,
    private readonly configService: ConfigService,
  ) {
    this.subject =
      this.configService.get<string>('nats.subjects.incomingDocument') || '';

    if (!this.subject) {
      this.logger.warn(
        'NATS_SUBJECT_INCOMING_DOCUMENT not configured. Set NATS_SUBJECT_INCOMING_DOCUMENT in environment',
      );
    }
  }

  async sendDocumentMessage(
    message: IncomingDocumentMessageDto,
  ): Promise<void> {
    if (!this.subject) {
      throw new Error('Incoming document NATS subject not configured');
    }

    try {
      await this.natsService.publish(this.subject, message);
      this.logger.log(
        `Incoming document message published to NATS. MessageID: ${message.messageId}, From: ${message.from}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish document message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
