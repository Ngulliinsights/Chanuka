import { AsyncLocalStorage } from 'async_hooks';
import { Result, Ok, Err } from '../../primitives/types';
import { BaseError } from '../observability/error-management';
import {
  TraceContext,
  TextMapPropagator,
  Baggage,
  TRACE_HEADER_W3C,
  TRACE_HEADER_JAEGER,
  TRACE_HEADER_B3,
} from './types';
import { Span } from './span';

/**
 * Context propagation error
 */
export class ContextPropagationError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, { statusCode: 500, code: 'CONTEXT_PROPAGATION_ERROR', cause, isOperational: false });
  }
}

/**
 * Trace context manager using AsyncLocalStorage
 */
export class TraceContextManager {
  private static instance: TraceContextManager;
  private readonly asyncLocalStorage = new AsyncLocalStorage<TraceContext>();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TraceContextManager {
    if (!TraceContextManager.instance) {
      TraceContextManager.instance = new TraceContextManager();
    }
    return TraceContextManager.instance;
  }

  /**
   * Get current trace context
   */
  getCurrentContext(): TraceContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Set current trace context
   */
  setCurrentContext(context: TraceContext): void {
    // Note: This is a simplified approach. In practice, you'd need to be within a context
    // This method is mainly for testing or special cases
    this.asyncLocalStorage.enterWith(context);
  }

  /**
   * Run function with trace context
   */
  withContext<T>(context: TraceContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Run async function with trace context
   */
  async withContextAsync<T>(context: TraceContext, fn: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Create child context from parent
   */
  createChildContext(parentContext: TraceContext, spanId: string): TraceContext {
    return {
      ...parentContext,
      spanId,
      parentSpanId: parentContext.spanId,
    };
  }

  /**
   * Extract trace context from carrier
   */
  extract(carrier: any, format: string = 'w3c'): TraceContext | undefined {
    const propagator = TracePropagatorFactory.create(format);
    return propagator.extract(carrier);
  }

  /**
   * Inject trace context into carrier
   */
  inject(context: TraceContext, carrier: any, format: string = 'w3c'): void {
    const propagator = TracePropagatorFactory.create(format);
    propagator.inject(context, carrier);
  }
}

/**
 * W3C Trace Context propagator
 */
export class W3CTracePropagator implements TextMapPropagator {
  inject(context: TraceContext, carrier: any): void {
    const sampled = context.sampled ? '01' : '00';
    carrier[TRACE_HEADER_W3C] = `00-${context.traceId}-${context.spanId}-${sampled}`;
  }

  extract(carrier: any): TraceContext | undefined {
    const header = carrier[TRACE_HEADER_W3C];
    if (!header || typeof header !== 'string') return undefined;

    // Format: 00-traceId-spanId-sampled
    const parts = header.split('-');
    if (parts.length < 4 || parts[0] !== '00') return undefined;

    const traceId = parts[1];
    const spanId = parts[2];
    const sampled = parts[3] === '01';

    if (!traceId || !spanId) return undefined;

    return {
      traceId,
      spanId,
      sampled,
      flags: sampled ? 1 : 0,
    };
  }
}

/**
 * Jaeger propagator
 */
export class JaegerPropagator implements TextMapPropagator {
  inject(context: TraceContext, carrier: any): void {
    const parentSpanId = context.parentSpanId || '0';
    const flags = context.sampled ? '1' : '0';
    carrier[TRACE_HEADER_JAEGER] = `${context.traceId}:${context.spanId}:${parentSpanId}:${flags}`;
  }

  extract(carrier: any): TraceContext | undefined {
    const header = carrier[TRACE_HEADER_JAEGER];
    if (!header || typeof header !== 'string') return undefined;

    // Format: traceId:spanId:parentSpanId:flags
    const parts = header.split(':');
    if (parts.length < 4) return undefined;

    const traceId = parts[0];
    const spanId = parts[1];
    const parentSpanId = parts[2] !== '0' ? parts[2] : undefined;
    const sampled = (parseInt(parts[3], 10) & 1) === 1;

    if (!traceId || !spanId) return undefined;

    return {
      traceId,
      spanId,
      parentSpanId,
      sampled,
      flags: parseInt(parts[3], 10),
    };
  }
}

/**
 * B3 propagator
 */
export class B3Propagator implements TextMapPropagator {
  inject(context: TraceContext, carrier: any): void {
    carrier[TRACE_HEADER_B3] = context.traceId;
    carrier['x-b3-spanid'] = context.spanId;
    carrier['x-b3-sampled'] = context.sampled ? '1' : '0';
    if (context.parentSpanId) {
      carrier['x-b3-parentspanid'] = context.parentSpanId;
    }
  }

  extract(carrier: any): TraceContext | undefined {
    const traceId = carrier[TRACE_HEADER_B3];
    const spanId = carrier['x-b3-spanid'];
    const sampled = carrier['x-b3-sampled'];
    const parentSpanId = carrier['x-b3-parentspanid'];

    if (!traceId || !spanId) return undefined;

    return {
      traceId,
      spanId,
      parentSpanId: parentSpanId || undefined,
      sampled: sampled === '1',
    };
  }
}

/**
 * Baggage propagator
 */
export class BaggagePropagator implements TextMapPropagator {
  private readonly baggageHeader = 'baggage';

  inject(context: TraceContext, carrier: any): void {
    // Baggage injection would be implemented here if baggage was part of TraceContext
    // For now, this is a no-op as baggage is handled separately
  }

  extract(carrier: any): TraceContext | undefined {
    const baggageHeader = carrier[this.baggageHeader];
    if (!baggageHeader || typeof baggageHeader !== 'string') return undefined;

    // This would typically create a Baggage object
    // For now, we'll just return undefined as baggage extraction
    // is complex and depends on the baggage implementation
    return undefined;
  }
}

/**
 * Factory for creating propagators
 */
export class TracePropagatorFactory {
  private static propagators = new Map<string, TextMapPropagator>();

  static {
    this.propagators.set('w3c', new W3CTracePropagator());
    this.propagators.set('jaeger', new JaegerPropagator());
    this.propagators.set('b3', new B3Propagator());
    this.propagators.set('baggage', new BaggagePropagator());
  }

  static create(format: string): TextMapPropagator {
    const propagator = this.propagators.get(format.toLowerCase());
    if (!propagator) {
      throw new ContextPropagationError(`Unsupported propagation format: ${format}`);
    }
    return propagator;
  }

  static register(format: string, propagator: TextMapPropagator): void {
    this.propagators.set(format.toLowerCase(), propagator);
  }
}

/**
 * Composite propagator that tries multiple formats
 */
export class CompositePropagator implements TextMapPropagator {
  private readonly propagators: TextMapPropagator[];

  constructor(formats: string[] = ['w3c', 'jaeger', 'b3']) {
    this.propagators = formats.map(format => TracePropagatorFactory.create(format));
  }

  inject(context: TraceContext, carrier: any): void {
    // Use W3C as the primary format for injection
    this.propagators[0].inject(context, carrier);
  }

  extract(carrier: any): TraceContext | undefined {
    // Try each propagator in order
    for (const propagator of this.propagators) {
      const context = propagator.extract(carrier);
      if (context) {
        return context;
      }
    }
    return undefined;
  }
}

/**
 * Global context manager instance
 */
export const traceContextManager = TraceContextManager.getInstance();

/**
 * Get current trace context
 */
export function getCurrentTraceContext(): TraceContext | undefined {
  return traceContextManager.getCurrentContext();
}

/**
 * Run function with trace context
 */
export function withTraceContext<T>(context: TraceContext, fn: () => T): T {
  return traceContextManager.withContext(context, fn);
}

/**
 * Run async function with trace context
 */
export async function withTraceContextAsync<T>(context: TraceContext, fn: () => Promise<T>): Promise<T> {
  return traceContextManager.withContextAsync(context, fn);
}

/**
 * Extract trace context from headers
 */
export function extractTraceContext(carrier: any, format?: string): TraceContext | undefined {
  return traceContextManager.extract(carrier, format);
}

/**
 * Inject trace context into headers
 */
export function injectTraceContext(context: TraceContext, carrier: any, format?: string): void {
  return traceContextManager.inject(context, carrier, format);
}