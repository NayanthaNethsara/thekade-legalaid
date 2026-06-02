import { Global, Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  getToken,
} from '@willsoto/nestjs-prometheus';

// Metric names. Exported so producers/consumers can inject the right counter.
export const INCOMING_MESSAGES = 'whatsapp_incoming_messages_total';
export const OUTGOING_MESSAGES = 'whatsapp_outgoing_messages_total';

const incomingMessagesProvider = makeCounterProvider({
  name: INCOMING_MESSAGES,
  help: 'Total incoming WhatsApp messages received, by type',
  labelNames: ['type'],
});

const outgoingMessagesProvider = makeCounterProvider({
  name: OUTGOING_MESSAGES,
  help: 'Total outgoing WhatsApp messages processed, by type and status',
  labelNames: ['type', 'status'],
});

/**
 * Exposes GET /metrics (default Node/process metrics) and the custom business
 * counters. Global so the counters can be injected anywhere without re-importing
 * PrometheusModule (which would register a duplicate endpoint).
 */
@Global()
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [incomingMessagesProvider, outgoingMessagesProvider],
  exports: [getToken(INCOMING_MESSAGES), getToken(OUTGOING_MESSAGES)],
})
export class MetricsModule {}
