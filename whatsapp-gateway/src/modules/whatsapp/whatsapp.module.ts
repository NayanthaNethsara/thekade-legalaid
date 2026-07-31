import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { TypingIndicatorService } from './typing-indicator.service';

@Module({
  providers: [WhatsAppService, TypingIndicatorService],
  exports: [WhatsAppService, TypingIndicatorService],
})
export class WhatsAppModule {}
