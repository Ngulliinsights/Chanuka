import { randomBytes } from 'crypto';
import { Result, Ok, Err } from '../../primitives/types';
import { BaseError } from '../observability/error-management';
import {
  Span as ISpan,
  SpanContext,
  SpanEvent,
  SpanLink,
  SpanKind,
  SpanStatus,
  Resource,
  InstrumentationScope,
} from './types';

/**
 * Span implementation with comprehensive lifecycle management
 */
export class Span implements ISpan {
  private _context: SpanContext;
  private _ended = false;
  private _startTime: Date;
  private _endTime?: Date;
  private _duration?: number;
  private _attributes: Record<string, string | number | boolean> = {};
  private _events: SpanEvent[] = [];
  private _links: SpanLink[] = [];
  private _status: SpanStatus = 'unset';
  private _statusMessage?: string;
  private _resource: Resource;
  private _instrumentationScope: InstrumentationScope;

  constructor(
    traceId: string,
    spanId: string,
    name: string,
    kind: SpanKind = 'internal',
    parentSpanId?: string,
    startTime?: Date,
    resource?: Resource,
    instrumentationScope?: InstrumentationScope,
    attributes: Record<string, string | number | boolean> = {},
    links: SpanLink[] = []
  ) {
    this._startTime = startTime || new Date();
    this._resource = resource || {
      attributes: {},
      schemaUrl: undefined,
    };
    this._instrumentationScope = instrumentationScope || {
      name: 'unknown',
      version: undefined,
      attributes: {},
      schemaUrl: undefined,
    };

    this._context = {
      traceId,
      spanId,
      parentSpanId,
      name,
      kind,
      startTime: this._startTime,
      status: this._status,
      attributes: { ...attributes },
      events: [],
      links: [...links],
      resource: this._resource,
      instrumentationScope: this._instrumentationScope,
    };

    // Set initial attributes
    Object.assign(this._attributes, attributes);
    this._links = [...links];
  }

  /**
   * Get the span context
   */
  context(): SpanContext {
    return {
      ...this._context,
      endTime: this._endTime,
      duration: this._duration,
      status: this._status,
      statusMessage: this._statusMessage,
      attributes: { ...this._attributes },
      events: [...this._events],
      links: [...this._links],
    };
  }

  /**
   * Set a single attribute
   */
  setAttribute(key: string, value: string | number | boolean): Span {
    if (this._ended) {
      return this;
    }

    this._attributes[key] = value;
    return this;
  }

  /**
   * Set multiple attributes
   */
  setAttributes(attributes: Record<string, string | number | boolean>): Span {
    if (this._ended) {
      return this;
    }

    Object.assign(this._attributes, attributes);
    return this;
  }

  /**
   * Add an event to the span
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): Span {
    if (this._ended) {
      return this;
    }

    const event: SpanEvent = {
      name,
      timestamp: new Date(),
      attributes: attributes || {},
    };

    this._events.push(event);
    return this;
  }

  /**
   * Add a link to the span
   */
  addLink(link: SpanLink): Span {
    if (this._ended) {
      return this;
    }

    this._links.push(link);
    return this;
  }

  /**
   * Set the span status
   */
  setStatus(status: SpanStatus, message?: string): Span {
    if (this._ended) {
      return this;
    }

    this._status = status;
    if (message) {
      this._statusMessage = message;
    }
    return this;
  }

  /**
   * End the span
   */
  end(endTime?: Date): void {
    if (this._ended) {
      return;
    }

    this._ended = true;
    this._endTime = endTime || new Date();
    this._duration = this._endTime.getTime() - this._startTime.getTime();
  }

  /**
   * Check if the span is recording
   */
  isRecording(): boolean {
    return !this._ended;
  }

  /**
   * Record an exception on the span
   */
  recordException(error: Error, attributes?: Record<string, string | number | boolean>): Span {
    if (this._ended) {
      return this;
    }

    const exceptionAttributes = {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack || '',
      ...attributes,
    };

    this.addEvent('exception', exceptionAttributes);
    this.setStatus('error', error.message);
    return this;
  }

  /**
   * Get span duration in milliseconds
   */
  getDuration(): number | undefined {
    return this._duration;
  }

  /**
   * Check if span has ended
   */
  isEnded(): boolean {
    return this._ended;
  }

  /**
   * Get span start time
   */
  getStartTime(): Date {
    return this._startTime;
  }

  /**
   * Get span end time
   */
  getEndTime(): Date | undefined {
    return this._endTime;
  }

  /**
   * Get span attributes
   */
  getAttributes(): Record<string, string | number | boolean> {
    return { ...this._attributes };
  }

  /**
   * Get span events
   */
  getEvents(): SpanEvent[] {
    return [...this._events];
  }

  /**
   * Get span links
   */
  getLinks(): SpanLink[] {
    return [...this._links];
  }
}

/**
 * Create a new span
 */
export function createSpan(
  traceId: string,
  spanId: string,
  name: string,
  options: {
    kind?: SpanKind;
    parentSpanId?: string;
    startTime?: Date;
    resource?: Resource;
    instrumentationScope?: InstrumentationScope;
    attributes?: Record<string, string | number | boolean>;
    links?: SpanLink[];
  } = {}
): Span {
  return new Span(
    traceId,
    spanId,
    name,
    options.kind,
    options.parentSpanId,
    options.startTime,
    options.resource,
    options.instrumentationScope,
    options.attributes,
    options.links
  );
}

/**
 * Generate a random span ID
 */
export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Generate a random trace ID
 */
export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}
