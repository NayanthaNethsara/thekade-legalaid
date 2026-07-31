import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sanitizePayload } from '../../common/utils/logger.utils';
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
  private readonly activeSubscriptions: {
    subject: string;
    handler: (payload: unknown) => Promise<void>;
  }[] = [];
  private connectionPromise?: Promise<void>;

  constructor(private readonly configService: ConfigService) {
    this.natsUrl = this.configService.get<string>('nats.url') || '';
    this.streamName =
      this.configService.get<string>('nats.streamName') ||
      'KAKILLE_AGENT_EVENTS';
    this.subjects = [
      this.configService.get<string>('nats.subjects.incomingText') || '',
      this.configService.get<string>('nats.subjects.incomingImage') || '',
      this.configService.get<string>('nats.subjects.incomingVideo') || '',
      this.configService.get<string>('nats.subjects.incomingAudio') || '',
      this.configService.get<string>('nats.subjects.incomingDocument') || '',
      this.configService.get<string>('nats.subjects.outgoing') || '',
    ].filter(Boolean);
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
    if (this.nc && !this.nc.isClosed()) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connectNats();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = undefined;
    }
  }

  private async connectNats() {
    try {
      this.logger.log('Connecting to NATS JetStream...');
      if (this.nc) {
        try {
          await this.nc.close();
        } catch {
          // ignore
        }
      }

      this.nc = await connect({
        servers: this.natsUrl,
        name: 'whatsapp-gateway',
        maxReconnectAttempts: -1,
      });
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();
      await this.ensureStream();
      this.logger.log('Connected to NATS JetStream');

      // Re-apply any active subscriptions when connection is established
      for (const sub of this.activeSubscriptions) {
        this._doSubscribe(sub.subject, sub.handler);
      }
    } catch (error) {
      this.logger.error('Failed to connect to NATS JetStream', error);
      this.nc = undefined;
      this.js = undefined;
      this.jsm = undefined;
      throw error;
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
    if (!this.nc || this.nc.isClosed()) {
      this.logger.log(
        'NATS connection closed or not initialized, reconnecting...',
      );
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
    const isReady = !!this.nc && !this.nc.isClosed() && !this.connectionPromise;

    // Save subscription so it can be restored on reconnect/initial connection
    this.activeSubscriptions.push({ subject, handler });

    if (!isReady) {
      await this.onModuleInit();
    }
    if (!this.nc) {
      throw new Error('NATS connection is not initialized');
    }

    // When we triggered the connect above, connectNats() already re-subscribed
    // every saved subscription -- including this one. Subscribing again here
    // would leave two live subscriptions and deliver every message twice.
    if (isReady) {
      this._doSubscribe(subject, handler);
    }
  }

  private _doSubscribe(
    subject: string,
    handler: (payload: unknown) => Promise<void>,
  ): void {
    if (!this.nc) {
      return;
    }
    this.nc.subscribe(subject, {
      queue: 'whatsapp-gateway',
      callback: (err, message) => {
        if (err) {
          this.logger.error(
            `NATS subscription error on ${subject}: ${err.message}`,
          );
          return;
        }

        const raw = new TextDecoder().decode(message.data);

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

        this.logger.debug(
          `Message received from NATS on ${subject}: ${JSON.stringify(sanitizePayload(payload))}`,
        );

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
