/**
 * Legacy adapters for backward compatibility during migration
 * These adapters allow existing code to work with the new unified platform
 * while providing a migration path to the new interfaces.
 */

import { logger as unifiedLogger } from './logging';
import { healthOrchestrator } from './health';
import { defaultRegistry, createCounter, createGauge, createHistogram } from './metrics';
import { createTracer } from './tracing';

// ==================== Legacy Logger Adapters ====================

/**
 * Adapter for the simple console logger from shared/utils/logger.ts
 */
export class SimpleLoggerAdapter {
  debug(message: string, ...args: any[]): void {
    unifiedLogger.debug(message, undefined, { legacy: true, args });
  }

  info(message: string, ...args: any[]): void {
    unifiedLogger.info(message, undefined, { legacy: true, args });
  }

  warn(message: string, ...args: any[]): void {
    unifiedLogger.warn(message, undefined, { legacy: true, args });
  }

  error(message: string, ...args: any[]): void {
    unifiedLogger.error(message, undefined, { legacy: true, args });
  }

  setLevel(level: string): void {
    const levelMap: Record<string, any> = {
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
    };
    unifiedLogger.setLevel(levelMap[level] || 'info');
  }

  withContext(context: Record<string, any>) {
    return {
      debug: (msg: string, ...args: any[]) => this.debug(msg, ...args),
      info: (msg: string, ...args: any[]) => this.info(msg, ...args),
      warn: (msg: string, ...args: any[]) => this.warn(msg, ...args),
      error: (msg: string, ...args: any[]) => this.error(msg, ...args),
    };
  }
}

/**
 * Adapter for the infrastructure monitoring logger
 */
export class InfrastructureLoggerAdapter {
  private component = 'infrastructure';

  debug(message: string, context?: any): void {
    unifiedLogger.debug(message, { component: this.component, ...context });
  }

  info(message: string, context?: any): void {
    unifiedLogger.info(message, { component: this.component, ...context });
  }

  warn(message: string, context?: any): void {
    unifiedLogger.warn(message, { component: this.component, ...context });
  }

  error(message: string, context?: any): void {
    unifiedLogger.error(message, { component: this.component, ...context });
  }

  startTimer(operation: string) {
    return unifiedLogger.startTimer(operation);
  }

  endTimer(operation: string) {
    return unifiedLogger.endTimer(operation);
  }
}

/**
 * Adapter for the structured logger
 */
export class StructuredLoggerAdapter {
  private context: Record<string, any> = {};

  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  log(level: string, message: string, data?: any): void {
    const logMethod = (unifiedLogger as any)[level] || unifiedLogger.info;
    logMethod.call(unifiedLogger, message, this.context, data);
  }

  child(context: Record<string, any>) {
    const child = new StructuredLoggerAdapter();
    child.setContext({ ...this.context, ...context });
    return child;
  }
}

// ==================== Legacy Health Check Adapters ====================

/**
 * Adapter for simple health check functions
 */
export class SimpleHealthCheckAdapter {
  constructor(private checkFn: () => Promise<boolean>) {}

  async check(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      const result = await this.checkFn();
      return {
        status: result ? 'healthy' : 'unhealthy',
        message: result ? 'Check passed' : 'Check failed',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Adapter for Express-style health endpoints
 */
export function createExpressHealthAdapter(orchestrator = healthOrchestrator) {
  return async (req: any, res: any) => {
    try {
      const report = await orchestrator.runAllChecks();

      const statusCode = report.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        status: report.status,
        checks: report.checks,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

// ==================== Legacy Metrics Adapters ====================

/**
 * Adapter for simple counter metrics
 */
export class SimpleCounterAdapter {
  private counter;

  constructor(name: string, help: string) {
    this.counter = createCounter(name, help);
    defaultRegistry.register(this.counter);
  }

  increment(value = 1, labels?: Record<string, string>): void {
    this.counter.increment(value, labels);
  }

  get(): number {
    return this.counter.get();
  }
}

/**
 * Adapter for simple gauge metrics
 */
export class SimpleGaugeAdapter {
  private gauge;

  constructor(name: string, help: string) {
    this.gauge = createGauge(name, help);
    defaultRegistry.register(this.gauge);
  }

  set(value: number, labels?: Record<string, string>): void {
    this.gauge.set(value, labels);
  }

  increment(value = 1, labels?: Record<string, string>): void {
    this.gauge.increment(value, labels);
  }

  decrement(value = 1, labels?: Record<string, string>): void {
    this.gauge.decrement(value, labels);
  }

  get(): number {
    return this.gauge.get();
  }
}

/**
 * Adapter for timing metrics (histogram)
 */
export class TimingAdapter {
  private histogram;

  constructor(name: string, help: string) {
    this.histogram = createHistogram(name, help);
    defaultRegistry.register(this.histogram);
  }

  observe(value: number, labels?: Record<string, string>): void {
    this.histogram.observe(value, labels);
  }

  getCount(): number {
    return this.histogram.getCount();
  }

  getSum(): number {
    return this.histogram.getSum();
  }
}

// ==================== Legacy Tracing Adapters ====================

/**
 * Adapter for simple tracing APIs
 */
export class SimpleTracingAdapter {
  private tracer;

  constructor(serviceName: string, serviceVersion?: string) {
    this.tracer = createTracer(serviceName, serviceVersion);
  }

  startSpan(name: string, parent?: any) {
    return this.tracer.startSpan(name, parent ? { parent } : undefined);
  }

  getCurrentSpan() {
    return this.tracer.getCurrentSpan();
  }

  inject(span: any, carrier: any, format = 'w3c') {
    return this.tracer.inject(span.context(), carrier, format);
  }

  extract(carrier: any, format = 'w3c') {
    return this.tracer.extract(carrier, format);
  }
}

// ==================== Factory Functions ====================

export function createLegacyLoggerAdapter(type: 'simple' | 'infrastructure' | 'structured' = 'simple') {
  switch (type) {
    case 'simple':
      return new SimpleLoggerAdapter();
    case 'infrastructure':
      return new InfrastructureLoggerAdapter();
    case 'structured':
      return new StructuredLoggerAdapter();
    default:
      return new SimpleLoggerAdapter();
  }
}

export function createLegacyHealthAdapter(checkFn: () => Promise<boolean>) {
  return new SimpleHealthCheckAdapter(checkFn);
}

export function createLegacyMetricsAdapter(type: 'counter' | 'gauge' | 'timing', name: string, help: string) {
  switch (type) {
    case 'counter':
      return new SimpleCounterAdapter(name, help);
    case 'gauge':
      return new SimpleGaugeAdapter(name, help);
    case 'timing':
      return new TimingAdapter(name, help);
    default:
      throw new Error(`Unknown metrics adapter type: ${type}`);
  }
}

export function createLegacyTracingAdapter(serviceName: string, serviceVersion?: string) {
  return new SimpleTracingAdapter(serviceName, serviceVersion);
}

// ==================== Default Instances ====================

export const simpleLogger = new SimpleLoggerAdapter();
export const infrastructureLogger = new InfrastructureLoggerAdapter();
export const structuredLogger = new StructuredLoggerAdapter();

export const legacyExpressHealth = createExpressHealthAdapter();




































