import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import compression from 'compression';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  // Create Fastify adapter with custom content type parser
  const fastifyAdapter = new FastifyAdapter({
    bodyLimit: 10485760, // 10MB limit
  });

  fastifyAdapter
    .getInstance()
    .addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      (req, body, done) => {
        const raw = typeof body === 'string' ? body : body.toString('utf8');
        req.rawBody = raw;
        try {
          const parsed: unknown = JSON.parse(raw);
          done(null, parsed);
        } catch (error) {
          done(error as Error);
        }
      },
    );

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      bodyParser: false, // Disable NestJS body parser to avoid conflict
    },
  );
  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));

  // API versioning configuration
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  // Apply security middlewares
  app.use(helmet());
  app.use(compression());

  // Enable CORS if needed
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
