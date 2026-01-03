import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

@Injectable()
export class BlobStorageService {
  private readonly logger = new Logger(BlobStorageService.name);
  private readonly blobServiceClient: BlobServiceClient;
  private readonly containerName: string;
  private containerClient: ContainerClient;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>(
      'azure.storageConnectionString',
    );
    this.containerName =
      this.configService.get<string>('azure.containerName') || '';

    if (!connectionString) {
      throw new Error('Azure Storage connection string not configured');
    }

    if (!this.containerName) {
      this.logger.warn(
        'Azure Storage container name not configured. Set AZURE_STORAGE_CONTAINER_NAME in environment',
      );
    }

    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(
      this.containerName,
    );

    this.logger.log('Azure Blob Storage service initialized successfully');
  }

  /**
   * Upload a file buffer to Azure Blob Storage
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'media',
  ): Promise<string> {
    if (!this.containerName) {
      throw new Error('Azure Storage container name not configured');
    }

    try {
      // Create container if it doesn't exist
      await this.containerClient.createIfNotExists({
        access: 'blob', // Public read access for blobs
      });

      const blobName = `${folder}/${Date.now()}-${fileName}`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: { blobContentType: mimeType },
      });

      this.logger.log(
        `File uploaded to Azure Blob Storage: ${blockBlobClient.url}`,
      );
      return blockBlobClient.url;
    } catch (error) {
      this.logger.error(
        `Failed to upload file to Azure Blob Storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
