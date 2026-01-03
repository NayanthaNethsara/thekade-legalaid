import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlobStorageService } from './blob-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [BlobStorageService],
  exports: [BlobStorageService],
})
export class AzureModule {}
