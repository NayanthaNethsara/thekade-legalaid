import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

interface PinoAppLoggerOptions {
  logDestination: string;
}

@Module({})
export class PinoAppLogger {
  static registerAsync(options: PinoAppLoggerOptions): DynamicModule {
    return {
      global: true,
      module: PinoAppLogger,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            customProps: () => ({ context: 'HTTP' }),
            timestamp: true,
            transport: {
              targets: [
                {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorizeObjects: true,
                  },
                },
                {
                  target: 'pino/file',
                  options: {
                    destination: options.logDestination,
                    sync: true,
                    mkdir: true,
                  },
                },
              ],
            },
          },
        }),
      ],
      providers: [],
      exports: [LoggerModule],
    };
  }
}
