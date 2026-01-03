import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private readonly brokerUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.brokerUrl = this.configService.get<string>('kafka.brokerUrl') || '';

    if (!this.brokerUrl) {
      this.logger.warn('KAFKA_BROKER_URL not configured');
    }

    this.kafka = new Kafka({
      clientId: 'whatsapp-gateway',
      brokers: [this.brokerUrl],
      logLevel: logLevel.ERROR,
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'whatsapp-gateway-group' });
  }

  async onModuleInit() {
    if (!this.brokerUrl) return;

    try {
      this.logger.log('Connecting to Kafka...');
      await this.producer.connect();
      await this.consumer.connect();
      this.logger.log('Connected to Kafka');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from Kafka...');
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

  getProducer(): Producer {
    return this.producer;
  }

  getConsumer(): Consumer {
    return this.consumer;
  }
}
