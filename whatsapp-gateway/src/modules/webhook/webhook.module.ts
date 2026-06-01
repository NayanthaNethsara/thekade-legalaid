import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NatsModule } from '../nats/nats.module';

@Module({
  imports: [WhatsAppModule, NatsModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
