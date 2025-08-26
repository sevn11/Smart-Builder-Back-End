import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, LoggerService } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Catch()
export class LoggingFilter extends BaseExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: LoggerService,
  ) {
    super();
  }
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      // Include error message and stack for detailed logging
      error: (exception as any).message,
      stack: (exception as any).stack,
    };

    // Log the detailed error object to Winston
    this.logger.error(JSON.stringify(message));

    // Call the original handler to let NestJS log the error to the console
    super.catch(exception, host);
  }
}
