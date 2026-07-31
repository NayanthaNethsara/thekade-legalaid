import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        nats: {
          configured: !!this.configService.get<string>('nats.url'),
          streamName:
            this.configService.get<string>('nats.streamName') ||
            'KAKILLE_AGENT_EVENTS',
        },
        meta: {
          appSecret: this.configService.get<string>('meta.appSecret')
            ? 'Set'
            : 'Missing',
          verifyToken: this.configService.get<string>('meta.verifyToken')
            ? 'Set'
            : 'Missing',
        },
      },
    };
  }
}
