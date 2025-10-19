export interface LogData {
  [key: string]: any;
}

export class Logger {
  info(message: string, data?: LogData): void {
    console.log(this.format('info', message, data));
  }

  warn(message: string, data?: LogData): void {
    console.warn(this.format('warn', message, data));
  }

  error(message: string, data?: LogData): void {
    console.error(this.format('error', message, data));
  }

  debug(message: string, data?: LogData): void {
    console.debug(this.format('debug', message, data));
  }

  private format(level: string, message: string, data?: LogData): object {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };
  }
}

export const logger = new Logger();





































