import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  consumerOpts,
  connect,
  createInbox,
  JetStreamClient,
  JetStreamManager,
  NatsConnection,
} from 'nats';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private nc?: NatsConnection;
  private js?: JetStreamClient;
  private jsm?: JetStreamManager;
  private readonly natsUrl: string;
  private readonly streamName: string;
  private readonly subjects: string[];

  constructor(private readonly configService: ConfigService) {
    this.natsUrl = this.configService.get<string>('nats.url') || '';
    this.streamName =
      this.configService.get<string>('nats.streamName') || 'LEGALAID_EVENTS';
    this.subjects = [
      this.configService.get<string>('nats.subjects.incoming') || '',
      this.configService.get<string>('nats.subjects.incomingFile') || '',
      this.configService.get<string>('nats.subjects.outgoing') || '',
    ].filter(Boolean);

    if (!this.natsUrl) {
      this.logger.warn('NATS_URL not configured');
    }
  }

  private async ensureStream() {
    if (!this.jsm || this.subjects.length === 0) {
      return;
    }

    try {
      const streamInfo = await this.jsm.streams.info(this.streamName);
      const existingSubjects = streamInfo.config.subjects || [];
      const merged = Array.from(
        new Set([...existingSubjects, ...this.subjects]),
      );

      if (merged.length !== existingSubjects.length) {
        await this.jsm.streams.update(this.streamName, {
          ...streamInfo.config,
          subjects: merged,
        });
      }
    } catch {
      await this.jsm.streams.add({
        name: this.streamName,
        subjects: this.subjects,
      });
    }
  }

  async onModuleInit() {
    if (!this.natsUrl) {
      return;
    }

    try {
      this.logger.log('Connecting to NATS JetStream...');
      this.nc = await connect({
        servers: this.natsUrl,
        name: 'whatsapp-gateway',
      });
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();
      await this.ensureStream();
      this.logger.log('Connected to NATS JetStream');
    } catch (error) {
      this.logger.error('Failed to connect to NATS JetStream', error);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from NATS JetStream...');
    if (this.nc) {
      await this.nc.drain();
      await this.nc.close();
    }
  }

  async publish(subject: string, payload: unknown): Promise<void> {
    if (!this.js) {
      await this.onModuleInit();
    }
    if (!this.js) {
      throw new Error('NATS JetStream is not initialized');
    }
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8');
    await this.js.publish(subject, encoded);
  }

  async subscribe(
    subject: string,
    durableName: string,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<void> {
    if (!this.js) {
      await this.onModuleInit();
    }
    if (!this.js) {
      throw new Error('NATS JetStream is not initialized');
    }

    const opts = consumerOpts();
    opts.bindStream(this.streamName);
    opts.durable(durableName);
    opts.manualAck();
    opts.deliverTo(createInbox());

    const subscription = await this.js.subscribe(subject, opts);

    void (async () => {
      for await (const message of subscription) {
        try {
          const payload = JSON.parse(
            new TextDecoder().decode(message.data),
          ) as unknown;
          await handler(payload);
          await message.ack();
        } catch (error) {
          this.logger.error(
            `Failed to process JetStream message on ${subject}`,
            error instanceof Error ? error.stack : undefined,
          );
          await message.nak();
        }
      }
    })();
  }
}
