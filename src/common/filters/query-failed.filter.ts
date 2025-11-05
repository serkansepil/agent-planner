import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Handle database constraint errors
    if (exception.code) {
      const { status, message } = this.handleDatabaseError(exception);

      this.logger.error(
        `Database error: ${exception.code} - ${message}`,
        exception.stack,
      );

      response.status(status).json({
        statusCode: status,
        message,
        error: exception.code,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Default error response
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    this.logger.error(
      `Unhandled exception: ${exception.message}`,
      exception.stack,
    );

    response.status(status).json({
      statusCode: status,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handleDatabaseError(exception: any): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case '23505': // Unique violation
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
        };
      case '23503': // Foreign key violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Referenced resource does not exist',
        };
      case '23502': // Not null violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
        };
      case '22P02': // Invalid text representation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid data format',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
        };
    }
  }
}
