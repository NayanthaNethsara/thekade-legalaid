import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NatsService } from './nats.service';
import { IncomingMessageProducer } from './incoming-message-producer';
import { IncomingImageProducer } from './incoming-image-producer';
import { IncomingVideoProducer } from './incoming-video-producer';
import { IncomingAudioProducer } from './incoming-audio-producer';
import { IncomingDocumentProducer } from './incoming-document-producer';
import { OutgoingMessageConsumer } from './outgoing-message-consumer';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, WhatsAppModule],
  providers: [
    NatsService,
    IncomingMessageProducer,
    IncomingImageProducer,
    IncomingVideoProducer,
    IncomingAudioProducer,
    IncomingDocumentProducer,
    OutgoingMessageConsumer,
  ],
  exports: [
    IncomingMessageProducer,
    IncomingImageProducer,
    IncomingVideoProducer,
    IncomingAudioProducer,
    IncomingDocumentProducer,
  ],
})
export class NatsModule {}
