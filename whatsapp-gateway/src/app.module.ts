import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebhookModule } from './modules/webhook/webhook.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { HealthModule } from './modules/health/health.module';
import { KafkaModule } from './modules/kafka/kafka.module';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { PinoAppLogger } from './common/logger';
import { AzureModule } from './modules/azure/azure.module';

@Module({
  imports: [
    PinoAppLogger.registerAsync({
      logDestination: 'logs/app.log',
    }),
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
    WhatsAppModule,
    WebhookModule,
    HealthModule,
    AzureModule,
    KafkaModule,
  ],
})
export class AppModule {}
