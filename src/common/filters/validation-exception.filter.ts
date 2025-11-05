import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Extract validation errors
    const errors = this.formatValidationErrors(exceptionResponse);

    this.logger.warn(
      `Validation failed for ${request.method} ${request.url}: ${JSON.stringify(errors)}`,
    );

    response.status(status).json({
      statusCode: status,
      message: 'Validation failed',
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private formatValidationErrors(exceptionResponse: any): any {
    if (Array.isArray(exceptionResponse.message)) {
      return exceptionResponse.message.map((error: any) => {
        if (typeof error === 'string') {
          return error;
        }
        return {
          field: error.property,
          constraints: error.constraints,
        };
      });
    }

    return exceptionResponse.message || exceptionResponse;
  }
}
