import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookModule } from './modules/webhook/webhook.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { HealthModule } from './modules/health/health.module';
import { NatsModule } from './modules/nats/nats.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { PinoAppLogger } from './common/logger';

@Module({
  imports: [
    PinoAppLogger.register(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      envFilePath: '.env',
    }),
    MetricsModule,
    WhatsAppModule,
    WebhookModule,
    HealthModule,
    NatsModule,
  ],
})
export class AppModule {}
