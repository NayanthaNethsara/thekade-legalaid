import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

interface PinoAppLoggerOptions {
}

// Keep only the useful request fields. Full header dumps are noisy and leak the
// webhook signature, so headers are dropped from the logs entirely.
function serializeRequest(req: { id?: string; method?: string; url?: string }) {
  return { id: req.id, method: req.method, url: req.url };
}

function serializeResponse(res: { statusCode?: number }) {
  return { statusCode: res.statusCode };
}

@Module({})
export class PinoAppLogger {
  static registerAsync(options: PinoAppLoggerOptions): DynamicModule {
    const isProduction = process.env.NODE_ENV === 'production';
    const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

    // Production emits structured JSON to stdout for Docker/Loki collection.
    // Development uses a human-readable pretty stream and can optionally write
    // to a file if a destination is configured.
    const consoleTarget = isProduction
      ? { target: 'pino/file', options: { destination: 1 } }
      : {
          target: 'pino-pretty',
          options: { singleLine: true, colorizeObjects: true },
        };

    return {
      global: true,
      module: PinoAppLogger,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level,
            customProps: () => ({ context: 'HTTP' }),
            timestamp: true,
            serializers: {
              req: serializeRequest,
              res: serializeResponse,
            },
            transport: {
              targets: [consoleTarget],
            },
          },
        }),
      ],
      providers: [],
      exports: [LoggerModule],
    };
  }
}
