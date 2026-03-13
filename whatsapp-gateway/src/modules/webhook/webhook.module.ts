import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NatsModule } from '../nats/nats.module';
import { AzureModule } from '../azure/azure.module';

@Module({
  imports: [WhatsAppModule, NatsModule, AzureModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
