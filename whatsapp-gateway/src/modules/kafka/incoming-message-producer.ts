import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { IncomingWhatsAppMessageDto } from './dto/kafka-message.dto';

@Injectable()
export class IncomingMessageProducer {
  private readonly logger = new Logger(IncomingMessageProducer.name);
  private readonly topic: string;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly configService: ConfigService,
  ) {
    this.topic = this.configService.get<string>('kafka.topics.incoming') || '';

    if (!this.topic) {
      this.logger.warn(
        'KAFKA_TOPIC_INCOMING not configured. Set KAFKA_TOPIC_INCOMING in environment',
      );
    }
  }

  /**
   * Send a single incoming WhatsApp message to Kafka
   */
  async sendMessage(
    message: IncomingWhatsAppMessageDto,
  ): Promise<{ success: boolean }> {
    if (!this.topic) {
      this.logger.error('Incoming Kafka topic not configured');
      return { success: false };
    }

    try {
      const producer = this.kafkaService.getProducer();
      await producer.send({
        topic: this.topic,
        messages: [
          {
            key: message.from, // Key by sender for ordering
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
        `Incoming message sent to Kafka. From: ${message.from}, Type: ${message.type}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send incoming message to Kafka: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }
}
