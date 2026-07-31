import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';

interface FastifyRequestWithRawBody {
  rawBody?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller('whatsapp/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /whatsapp/webhooks - Verification endpoint
   * Meta calls this once during webhook setup
   */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    this.logger.log('Webhook verification request received');

    if (!mode || !token) {
      this.logger.error('Missing verification parameters');
      throw new BadRequestException('Missing verification parameters');
    }

    const verifyToken = this.configService.get<string>('meta.verifyToken');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.error('Invalid verification token');
    throw new UnauthorizedException('Invalid verification token');
  }

  /**
   * POST /whatsapp/webhooks - Receives messages & status updates from Meta
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: FastifyRequestWithRawBody,
    @Body() body: Record<string, unknown>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ) {
    this.logger.log('Webhook event received');

    // The raw body (not the re-serialized parse) is what Meta signed.
    const rawBody: string = req.rawBody || JSON.stringify(body);
    if (!this.webhookService.verifySignature(rawBody, signature || '')) {
      this.logger.error('Invalid signature');
      throw new UnauthorizedException('Invalid signature');
    }

    try {
      await this.webhookService.processWebhookEvent(body);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      // Still return 200 to prevent Meta from retrying.
      return { status: 'error' };
    }
  }
}
