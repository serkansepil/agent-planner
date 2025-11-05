import { Logger as NestLogger } from '@nestjs/common';

export class Logger extends NestLogger {
  /**
   * Log an informational message
   */
  info(message: string, context?: string) {
    super.log(message, context);
  }

  /**
   * Log a success message
   */
  success(message: string, context?: string) {
    super.log(`✓ ${message}`, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string) {
    super.warn(message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string) {
    super.debug(message, context);
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: string) {
    super.verbose(message, context);
  }
}
