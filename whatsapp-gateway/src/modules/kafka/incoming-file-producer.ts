import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { IncomingFileMessageDto } from './dto/kafka-message.dto';

@Injectable()
export class IncomingFileProducer {
  private readonly logger = new Logger(IncomingFileProducer.name);
  private readonly topic: string;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly configService: ConfigService,
  ) {
    this.topic =
      this.configService.get<string>('kafka.topics.incomingFile') || '';

    if (!this.topic) {
      this.logger.warn(
        'KAFKA_TOPIC_INCOMING_FILE not configured. Set KAFKA_TOPIC_INCOMING_FILE in environment',
      );
    }
  }

  async sendFileMessage(message: IncomingFileMessageDto): Promise<void> {
    if (!this.topic) {
      throw new Error('Incoming file Kafka topic not configured');
    }

    try {
      const producer = this.kafkaService.getProducer();
      await producer.send({
        topic: this.topic,
        messages: [
          {
            key: message.from,
            value: JSON.stringify(message),
            headers: {
              messageId: message.messageId,
              timestamp: message.timestamp,
              type: message.type,
            },
          },
        ],
      });

      this.logger.log(
        `Incoming file message sent to Kafka. MessageID: ${message.messageId}, From: ${message.from}, Type: ${message.type}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send file message to Kafka: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
