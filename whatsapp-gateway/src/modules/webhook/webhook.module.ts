import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { KafkaModule } from '../kafka/kafka.module';
import { AzureModule } from '../azure/azure.module';

@Module({
  imports: [WhatsAppModule, KafkaModule, AzureModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
