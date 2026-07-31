import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { maskPhoneNumber } from '../../common/utils/logger.utils';
import { NatsService } from './nats.service';
import { IncomingMessageDto } from './dto/nats-message.dto';

const SUBJECT_CONFIG_KEYS: Record<IncomingMessageDto['type'], string> = {
  text: 'nats.subjects.incomingText',
  image: 'nats.subjects.incomingImage',
  video: 'nats.subjects.incomingVideo',
  audio: 'nats.subjects.incomingAudio',
  document: 'nats.subjects.incomingDocument',
};

/**
 * Publishes standardized incoming messages to the per-type NATS subjects
 * defined in configuration (see docs/incoming-queues.md).
 */
@Injectable()
export class IncomingProducer {
  private readonly logger = new Logger(IncomingProducer.name);
  private readonly subjects: Record<IncomingMessageDto['type'], string>;

  constructor(
    private readonly natsService: NatsService,
    configService: ConfigService,
  ) {
    this.subjects = Object.fromEntries(
      Object.entries(SUBJECT_CONFIG_KEYS).map(([type, key]) => {
        const subject = configService.get<string>(key) || '';
        if (!subject) {
          this.logger.warn(`NATS subject for incoming ${type} not configured`);
        }
        return [type, subject];
      }),
    ) as Record<IncomingMessageDto['type'], string>;
  }

  async publish(message: IncomingMessageDto): Promise<void> {
    const subject = this.subjects[message.type];
    if (!subject) {
      throw new Error(`Incoming ${message.type} NATS subject not configured`);
    }

    try {
      await this.natsService.publish(subject, message);
      this.logger.log(
        `Incoming ${message.type} message published to NATS. MessageID: ${message.messageId}, From: ${maskPhoneNumber(message.from)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish incoming ${message.type} message to NATS: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }
}
