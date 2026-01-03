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
        kafka: {
          brokerUrl: this.configService.get<string>('kafka.brokerUrl'),
          username: this.configService.get<string>('kafka.username')
            ? 'Set'
            : 'Missing',
          password: this.configService.get<string>('kafka.password')
            ? 'Set'
            : 'Missing',
          ssl: this.configService.get<boolean>('kafka.ssl'),
          saslMechanism: this.configService.get<string>('kafka.saslMechanism'),
        },
        azure: {
          connectionString: this.configService.get<string>(
            'azure.storageConnectionString',
          )
            ? 'Set'
            : 'Missing',
          containerName: this.configService.get<string>('azure.containerName'),
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
