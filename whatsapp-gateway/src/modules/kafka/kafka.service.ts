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

    const username = this.configService.get<string>('kafka.username');
    const password = this.configService.get<string>('kafka.password');
    const ssl = this.configService.get<boolean>('kafka.ssl');
    const saslMechanism = this.configService.get<string>('kafka.saslMechanism');

    const kafkaConfig: any = {
      clientId: 'whatsapp-gateway',
      brokers: [this.brokerUrl],
      logLevel: logLevel.ERROR,
      ssl,
    };

    if (username && password) {
      kafkaConfig.sasl = {
        mechanism: saslMechanism,
        username,
        password,
      };
    }

    this.kafka = new Kafka(kafkaConfig);

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
