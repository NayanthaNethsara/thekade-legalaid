import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { IncomingMessageProducer } from './incoming-message-producer';
import { IncomingFileProducer } from './incoming-file-producer';
import { OutgoingMessageConsumer } from './outgoing-message-consumer';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, WhatsAppModule],
  providers: [
    KafkaService,
    IncomingMessageProducer,
    IncomingFileProducer,
    OutgoingMessageConsumer,
  ],
  exports: [IncomingMessageProducer, IncomingFileProducer],
})
export class KafkaModule {}
