import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingDocumentProducer } from './incoming-document-producer';
import { IncomingMessageProducer } from './incoming-message-producer';
import { IncomingFileProducer } from './incoming-file-producer';
import { IncomingVoiceProducer } from './incoming-voice-producer';
import { OutgoingMessageConsumer } from './outgoing-message-consumer';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, WhatsAppModule],
  providers: [
    NatsService,
    IncomingDocumentProducer,
    IncomingMessageProducer,
    IncomingFileProducer,
    IncomingVoiceProducer,
    OutgoingMessageConsumer,
  ],
  exports: [
    IncomingDocumentProducer,
    IncomingMessageProducer,
    IncomingFileProducer,
    IncomingVoiceProducer,
  ],
})
export class NatsModule {}
