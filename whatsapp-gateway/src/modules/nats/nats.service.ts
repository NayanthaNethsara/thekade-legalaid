import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
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
      this.configService.get<string>('nats.subjects.incomingText') || '',
      this.configService.get<string>('nats.subjects.incomingImage') || '',
      this.configService.get<string>('nats.subjects.incomingVideo') || '',
      this.configService.get<string>('nats.subjects.incomingAudio') || '',
      this.configService.get<string>('nats.subjects.incomingDocument') || '',
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

  /**
   * Subscribe to a subject over core NATS. Used for real-time consumption
   * (e.g. outgoing replies a producer publishes with core publish). This avoids
   * the restart fragility of a durable push consumer bound to an ephemeral
   * delivery inbox, at the cost of replaying messages published while down.
   */
  async subscribe(
    subject: string,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<void> {
    if (!this.nc) {
      await this.onModuleInit();
    }
    if (!this.nc) {
      throw new Error('NATS connection is not initialized');
    }

    this.nc.subscribe(subject, {
      callback: (err, message) => {
        if (err) {
          this.logger.error(
            `NATS subscription error on ${subject}: ${err.message}`,
          );
          return;
        }

        const raw = new TextDecoder().decode(message.data);
        this.logger.debug(`Message received from NATS on ${subject}: ${raw}`);

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch (parseError) {
          this.logger.error(
            `Failed to parse message on ${subject}`,
            parseError instanceof Error ? parseError.stack : undefined,
          );
          return;
        }

        void handler(payload).catch((handlerError: unknown) => {
          this.logger.error(
            `Handler failed for ${subject}`,
            handlerError instanceof Error ? handlerError.stack : undefined,
          );
        });
      },
    });

    this.logger.log(`Subscribed (core NATS) to subject: ${subject}`);
  }
}
