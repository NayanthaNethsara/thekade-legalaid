import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingProducer } from './incoming-producer';
import { OutgoingMessageConsumer } from './outgoing-message-consumer';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, WhatsAppModule],
  providers: [NatsService, IncomingProducer, OutgoingMessageConsumer],
  exports: [IncomingProducer],
})
export class NatsModule {}
