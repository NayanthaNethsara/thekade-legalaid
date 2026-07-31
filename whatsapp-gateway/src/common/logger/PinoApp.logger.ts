import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

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
  static register(): DynamicModule {
    const isProduction = process.env.NODE_ENV === 'production';
    const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

    const pinoHttpOptions = {
      level,
      customProps: () => ({ context: 'HTTP' }),
      timestamp: true,
      serializers: {
        req: serializeRequest,
        res: serializeResponse,
      },
      formatters: isProduction
        ? {
            level(label: string, number: number) {
              // Map log levels to GCP severity string
              return { severity: label.toUpperCase(), level: number };
            },
            log(object: Record<string, unknown>) {
              // Map msg to message for GCP indexing
              if (object.msg) {
                const { msg, ...rest } = object;
                return { message: msg, ...rest };
              }
              return object;
            },
          }
        : undefined,
      transport: !isProduction
        ? {
            target: 'pino-pretty',
            options: { singleLine: true, colorizeObjects: true },
          }
        : undefined,
    };

    return {
      global: true,
      module: PinoAppLogger,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: pinoHttpOptions,
        }),
      ],
      providers: [],
      exports: [LoggerModule],
    };
  }
}
