import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Determine HTTP status and error details
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        error = (exceptionResponse as any).error || error;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else {
      // Handle standard Error objects
      message = exception.message || message;
    }

    // Log the error (but don't log 401/403 as errors since they're expected auth failures)
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // this.logger.error(`${exception.message} - ${exception.stack}`);
      this.logger.error(`${exception.message}`);
    } else if (
      status !== HttpStatus.UNAUTHORIZED &&
      status !== HttpStatus.FORBIDDEN
    ) {
      this.logger.warn(`${exception.message}`);
    }

    // Format the error response in a consistent way
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message,
      error,
    });
  }
}
