import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, unknown>;
        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          // Validation errors arrive as a string array.
          message = (body.message as unknown[])
            .map((m) => String(m))
            .join(', ');
        }
        if (typeof body.error === 'string') {
          error = body.error;
        }
      }
    } else {
      message = exception.message || message;
    }

    // Do not log expected auth failures (401/403) as errors.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception.message);
    } else if (
      status !== HttpStatus.UNAUTHORIZED &&
      status !== HttpStatus.FORBIDDEN
    ) {
      this.logger.warn(exception.message);
    }

    void response.status(status).send({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error,
    });
  }
}
