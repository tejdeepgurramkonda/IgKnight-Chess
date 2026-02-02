/**
 * Environment-aware logging service
 * Replaces console.log with production-safe logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private isTest = import.meta.env.MODE === 'test';

  private shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false;
    if (!this.isDevelopment && level === 'debug') return false;
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return data ? `${prefix} ${message}` : `${prefix} ${message}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), data ?? '');
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), data ?? '');
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data ?? '');
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error ?? '');
      
      // In production, send to error tracking service (Sentry, LogRocket, etc.)
      if (!this.isDevelopment && typeof window !== 'undefined') {
        // TODO: Integrate with Sentry or similar service
        // Sentry.captureException(error, { extra: { message } });
      }
    }
  }

  // For WebSocket and network debugging
  network(operation: string, details: unknown): void {
    if (this.isDevelopment) {
      console.log(
        `%c[NETWORK] ${operation}`,
        'color: #3b82f6; font-weight: bold;',
        details
      );
    }
  }

  // For game state debugging
  game(event: string, state: unknown): void {
    if (this.isDevelopment) {
      console.log(
        `%c[GAME] ${event}`,
        'color: #10b981; font-weight: bold;',
        state
      );
    }
  }
}

export const logger = new Logger();
