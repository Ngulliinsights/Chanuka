/**
 * Test-specific logger that extends the client logger with additional test features
 */
import { logger as clientLogger, type Logger, type LogContext } from '@client/utils/logger';

interface TestContext extends LogContext {
  testName?: string;
  testSuite?: string;
  testPhase?: 'setup' | 'execution' | 'cleanup';
}

interface TestLogger extends Logger {
  // Additional test-specific methods
  logTestStart: (testName: string, context?: Omit<TestContext, 'testName'>) => void;
  logTestEnd: (testName: string, context?: Omit<TestContext, 'testName'>) => void;
  clearLogs: () => void;
}

class TestLoggerImpl implements TestLogger {
  private logs: Array<{ 
    level: string; 
    message: string; 
    context?: TestContext | undefined; 
    meta?: Record<string, unknown> | undefined;
  }> = [];

  debug(message: string, context?: TestContext, meta?: Record<string, unknown>): void {
    this.logs.push({ 
      level: 'debug', 
      message, 
      context: context || undefined, 
      meta: meta || undefined 
    });
    clientLogger.debug(message, context, meta);
  }

  info(message: string, context?: TestContext, meta?: Record<string, unknown>): void {
    this.logs.push({ 
      level: 'info', 
      message, 
      context: context || undefined, 
      meta: meta || undefined 
    });
    clientLogger.info(message, context, meta);
  }

  warn(message: string, context?: TestContext, meta?: Record<string, unknown>): void {
    this.logs.push({ 
      level: 'warn', 
      message, 
      context: context || undefined, 
      meta: meta || undefined 
    });
    clientLogger.warn(message, context, meta);
  }

  error(message: string, context?: TestContext, error?: Error | unknown): void {
    this.logs.push({ 
      level: 'error', 
      message, 
      context: context || undefined, 
      meta: error ? { error } : undefined 
    });
    clientLogger.error(message, context, error);
  }

  logTestStart(testName: string, context?: Omit<TestContext, 'testName'>): void {
    this.info(`Test Started: ${testName}`, { ...context, testName, testPhase: 'setup' });
  }

  logTestEnd(testName: string, context?: Omit<TestContext, 'testName'>): void {
    this.info(`Test Completed: ${testName}`, { ...context, testName, testPhase: 'cleanup' });
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Test helper methods
  getLogs() {
    return [...this.logs];
  }

  getLogsByLevel(level: string) {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByTestName(testName: string) {
    return this.logs.filter(log => log.context?.testName === testName);
  }

  assertLogExists(level: string, message: string) {
    const exists = this.logs.some(
      log => log.level === level && log.message.includes(message)
    );
    if (!exists) {
      throw new Error(`Expected log with level "${level}" and message containing "${message}" not found`);
    }
  }

  assertNoErrors() {
    const errors = this.getLogsByLevel('error');
    if (errors.length > 0) {
      throw new Error(`Found ${errors.length} unexpected errors in logs`);
    }
  }
}

export const testLogger = new TestLoggerImpl();