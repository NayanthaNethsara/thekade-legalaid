import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { maskPhoneNumber } from '../../common/utils/logger.utils';
import { WhatsAppService } from './whatsapp.service';

interface TypingSession {
  refresh: NodeJS.Timeout;
  deadline: NodeJS.Timeout;
}

@Injectable()
export class TypingIndicatorService implements OnModuleDestroy {
  private readonly logger = new Logger(TypingIndicatorService.name);
  private readonly refreshIntervalMs: number;
  private readonly maxDurationMs: number;
  private readonly sessions = new Map<string, TypingSession>();

  constructor(
    private readonly whatsappService: WhatsAppService,
    configService: ConfigService,
  ) {
    this.refreshIntervalMs =
      configService.get<number>('whatsapp.typing.refreshMs') ?? 20_000;
    this.maxDurationMs =
      configService.get<number>('whatsapp.typing.maxMs') ?? 300_000;
  }

  /**
   * Show "typing…" to `recipient` and keep it visible until `stop` is called or
   * the max duration elapses. Also marks the inbound message as read. Restarting
   * for the same recipient adopts the newer message id.
   */
  async start(messageId: string, recipient: string): Promise<void> {
    this.logger.log(`Starting typing indicator for ${maskPhoneNumber(recipient)}`);
    this.stop(recipient);

    // Register the timers synchronously (before the first await) so a rapid
    // second start() for the same recipient cannot race this one.
    const refresh = setInterval(() => {
      void this.whatsappService
        .markMessageAsRead(messageId, true)
        .catch((error: unknown) => {
          this.logger.warn(
            `Failed to refresh typing for ${maskPhoneNumber(recipient)}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        });
    }, this.refreshIntervalMs);

    const deadline = setTimeout(() => {
      this.logger.log(
        `Typing indicator hit max duration for ${maskPhoneNumber(recipient)}; stopping`,
      );
      this.stop(recipient);
    }, this.maxDurationMs);

    this.sessions.set(recipient, { refresh, deadline });

    await this.whatsappService.markMessageAsRead(messageId, true);
  }

  /** Stop refreshing the indicator for `recipient`. A no-op when none is active. */
  stop(recipient: string): void {
    const session = this.sessions.get(recipient);
    if (!session) {
      this.logger.debug(`No typing session found to stop for ${maskPhoneNumber(recipient)}`);
      return;
    }
    clearInterval(session.refresh);
    clearTimeout(session.deadline);
    this.sessions.delete(recipient);
    this.logger.log(`Stopped typing indicator for ${maskPhoneNumber(recipient)}`);
  }

  onModuleDestroy(): void {
    for (const session of this.sessions.values()) {
      clearInterval(session.refresh);
      clearTimeout(session.deadline);
    }
    this.sessions.clear();
  }
}
