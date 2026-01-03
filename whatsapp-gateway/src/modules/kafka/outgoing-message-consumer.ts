import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { OutgoingWhatsAppMessageDto } from './dto/kafka-message.dto';

@Injectable()
export class OutgoingMessageConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutgoingMessageConsumer.name);
  private readonly topic: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
    private readonly whatsappService: WhatsAppService,
  ) {
    this.topic = this.configService.get<string>('kafka.topics.outgoing') || '';

    if (!this.topic) {
      this.logger.warn(
        'KAFKA_TOPIC_OUTGOING not configured. Set KAFKA_TOPIC_OUTGOING in environment',
      );
    }
  }

  async onModuleInit() {
    if (!this.topic) {
      this.logger.error(
        'Outgoing Kafka topic not configured. Consumer not started.',
      );
      return;
    }

    this.logger.log(`Starting to consume Kafka topic: ${this.topic}`);
    const consumer = this.kafkaService.getConsumer();

    await consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            this.logger.warn('Received message without body');
            return;
          }

          const messageContent = message.value.toString();
          this.logger.log('=== INCOMING KAFKA MESSAGE ===');
          this.logger.log(`Raw message body: ${messageContent}`);
          this.logger.log('==============================');

          const parsedMessage = JSON.parse(
            messageContent,
          ) as OutgoingWhatsAppMessageDto;

          // Simple validation
          if (!parsedMessage.to) {
            this.logger.error('Invalid message: missing recipient');
            return;
          }

          this.logger.log(
            `Processing outgoing ${parsedMessage.type} message to: ${parsedMessage.to}`,
          );

          await this.sendWhatsAppMessage(parsedMessage);
        } catch (error) {
          this.logger.error(
            `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error instanceof Error ? error.stack : '',
          );
        }
      },
    });
  }

  onModuleDestroy() {
    // Kafka service handles disconnection
  }

  /**
   * Send message via WhatsApp (text or interactive)
   */
  private async sendWhatsAppMessage(
    message: OutgoingWhatsAppMessageDto,
  ): Promise<boolean> {
    try {
      // Validate message structure
      if (!message.to) {
        this.logger.error('Invalid message - missing recipient');
        return false;
      }

      // Handle interactive messages
      if (message.type === 'interactive' && message.content?.interactive) {
        if (!message.content.interactive.body?.text) {
          this.logger.error('Invalid interactive message - missing body text');
          return false;
        }

        await this.whatsappService.sendInteractiveMessage(
          message.to,
          message.content.interactive,
        );

        this.logger.log(`Interactive message sent to ${message.to}`);
        return true;
      }

      // Handle text messages
      if (!message.content?.text) {
        this.logger.error('Invalid message - missing text content');
        return false;
      }

      await this.whatsappService.sendTextMessage(
        message.to,
        message.content.text,
      );

      this.logger.log(`Text message sent to ${message.to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      return false;
    }
  }
}
