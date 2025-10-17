import { describe, it, expect, beforeEach } from 'vitest';
import { createTracer, TracerImpl } from '../tracing';

describe('Tracer', () => {
  let tracer: TracerImpl;

  beforeEach(() => {
    tracer = createTracer('test-service', '1.0.0', { rate: 1.0 }); // Sample all spans
  });

  describe('Span Creation', () => {
    it('should create spans with correct attributes', () => {
      const span = tracer.startSpan('test-operation', {
        kind: 'internal',
        attributes: { key: 'value' },
      });

      expect(span).toBeDefined();
      const context = span.context();
      expect(context.name).toBe('test-operation');
      expect(context.kind).toBe('internal');
      expect(context.attributes.key).toBe('value');
      expect(context.startTime).toBeInstanceOf(Date);
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();

      span.end();
    });

    it('should create child spans', () => {
      const parentSpan = tracer.startSpan('parent-operation');
      const childSpan = tracer.startSpan('child-operation', { parent: parentSpan });

      const parentContext = parentSpan.context();
      const childContext = childSpan.context();

      expect(childContext.parentSpanId).toBe(parentContext.spanId);
      expect(childContext.traceId).toBe(parentContext.traceId);
      expect(childContext.spanId).not.toBe(parentContext.spanId);

      childSpan.end();
      parentSpan.end();
    });

    it('should handle span attributes', () => {
      const span = tracer.startSpan('attribute-test');

      span.setAttribute('string-attr', 'value');
      span.setAttribute('number-attr', 42);
      span.setAttribute('boolean-attr', true);

      span.setAttributes({
        batch1: 'value1',
        batch2: 2,
      });

      const context = span.context();
      expect(context.attributes['string-attr']).toBe('value');
      expect(context.attributes['number-attr']).toBe(42);
      expect(context.attributes['boolean-attr']).toBe(true);
      expect(context.attributes.batch1).toBe('value1');
      expect(context.attributes.batch2).toBe(2);

      span.end();
    });
  });

  describe('Span Lifecycle', () => {
    it('should track span duration', () => {
      const span = tracer.startSpan('duration-test');

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {} // Busy wait for ~10ms

      span.end();

      const context = span.context();
      expect(context.endTime).toBeDefined();
      expect(context.duration).toBeDefined();
      expect(context.duration).toBeGreaterThanOrEqual(10);
    });

    it('should handle span status', () => {
      const span = tracer.startSpan('status-test');

      span.setStatus('ok');
      expect(span.context().status).toBe('ok');

      span.setStatus('error', 'Something went wrong');
      expect(span.context().status).toBe('error');
      expect(span.context().statusMessage).toBe('Something went wrong');

      span.end();
    });

    it('should add events to spans', () => {
      const span = tracer.startSpan('event-test');

      const eventTime = new Date();
      span.addEvent('custom-event', { detail: 'test' });

      const context = span.context();
      expect(context.events).toHaveLength(1);
      expect(context.events[0].name).toBe('custom-event');
      expect(context.events[0].attributes.detail).toBe('test');
      expect(context.events[0].timestamp.getTime()).toBeGreaterThanOrEqual(eventTime.getTime());

      span.end();
    });
  });

  describe('Context Propagation', () => {
    it('should extract W3C trace context', () => {
      const carrier = {
        'traceparent': '00-12345678901234567890123456789012-1234567890123456-01',
      };

      const context = tracer.extract(carrier, 'w3c');

      expect(context).toBeDefined();
      expect(context?.traceId).toBe('12345678901234567890123456789012');
      expect(context?.spanId).toBe('1234567890123456');
      expect(context?.sampled).toBe(true);
    });

    it('should inject W3C trace context', () => {
      const span = tracer.startSpan('inject-test');
      const context = span.context();

      const carrier: any = {};
      tracer.inject(context, carrier, 'w3c');

      expect(carrier['traceparent']).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

      span.end();
    });

    it('should extract Jaeger trace context', () => {
      const carrier = {
        'uber-trace-id': '12345678901234567890123456789012:1234567890123456:0:1',
      };

      const context = tracer.extract(carrier, 'jaeger');

      expect(context).toBeDefined();
      expect(context?.traceId).toBe('12345678901234567890123456789012');
      expect(context?.spanId).toBe('1234567890123456');
      expect(context?.sampled).toBe(true);
    });

    it('should inject Jaeger trace context', () => {
      const span = tracer.startSpan('jaeger-inject-test');
      const context = span.context();

      const carrier: any = {};
      tracer.inject(context, carrier, 'jaeger');

      expect(carrier['uber-trace-id']).toMatch(/^[0-9a-f]{32}:[0-9a-f]{16}:[0-9a-f]{16}:1$/);

      span.end();
    });

    it('should extract B3 trace context', () => {
      const carrier = {
        'x-b3-traceid': '12345678901234567890123456789012',
        'x-b3-spanid': '1234567890123456',
        'x-b3-sampled': '1',
      };

      const context = tracer.extract(carrier, 'b3');

      expect(context).toBeDefined();
      expect(context?.traceId).toBe('12345678901234567890123456789012');
      expect(context?.spanId).toBe('1234567890123456');
      expect(context?.sampled).toBe(true);
    });

    it('should inject B3 trace context', () => {
      const span = tracer.startSpan('b3-inject-test');
      const context = span.context();

      const carrier: any = {};
      tracer.inject(context, carrier, 'b3');

      expect(carrier['x-b3-traceid']).toMatch(/^[0-9a-f]{32}$/);
      expect(carrier['x-b3-spanid']).toMatch(/^[0-9a-f]{16}$/);
      expect(carrier['x-b3-sampled']).toBe('1');

      span.end();
    });
  });

  describe('Sampling', () => {
    it('should respect sampling decisions', () => {
      const sampledTracer = createTracer('sampled-service', '1.0.0', { rate: 0.0 }); // Sample nothing
      const span = sampledTracer.startSpan('sampled-test');

      // Should be a no-op span
      expect(span.isRecording()).toBe(false);

      span.setAttribute('test', 'value');
      span.end();

      // Attributes should not be set on no-op spans
      expect(span.context().attributes.test).toBeUndefined();
    });

    it('should apply sampling rules', () => {
      const ruleBasedTracer = createTracer('rule-service', '1.0.0', {
        rate: 0.0, // Default to no sampling
        rules: [
          {
            name: 'important-operation',
            rate: 1.0, // Always sample important operations
          },
        ],
      });

      const normalSpan = ruleBasedTracer.startSpan('normal-operation');
      const importantSpan = ruleBasedTracer.startSpan('important-operation');

      expect(normalSpan.isRecording()).toBe(false);
      expect(importantSpan.isRecording()).toBe(true);

      normalSpan.end();
      importantSpan.end();
    });
  });

  describe('Async Context', () => {
    it('should maintain context across async boundaries', async () => {
      const span = tracer.startSpan('async-test');

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          // Context should still be available here
          const currentSpan = tracer.getCurrentSpan();
          expect(currentSpan).toBe(span);
          resolve();
        }, 10);
      });

      span.end();
    });

    it('should handle nested async contexts', async () => {
      const outerSpan = tracer.startSpan('outer-async');

      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          const middleSpan = tracer.startSpan('middle-async');

          await new Promise<void>((innerResolve) => {
            setTimeout(() => {
              const innerSpan = tracer.startSpan('inner-async');

              expect(tracer.getCurrentSpan()).toBe(innerSpan);
              innerSpan.end();
              innerResolve();
            }, 5);
          });

          expect(tracer.getCurrentSpan()).toBe(middleSpan);
          middleSpan.end();
          resolve();
        }, 5);
      });

      expect(tracer.getCurrentSpan()).toBe(outerSpan);
      outerSpan.end();
    });
  });

  describe('Resource and Instrumentation', () => {
    it('should set resource attributes', () => {
      const span = tracer.startSpan('resource-test');

      const context = span.context();
      expect(context.resource.attributes['service.name']).toBe('test-service');
      expect(context.resource.attributes['service.version']).toBe('1.0.0');

      span.end();
    });

    it('should set instrumentation scope', () => {
      const span = tracer.startSpan('scope-test');

      const context = span.context();
      expect(context.instrumentationScope.name).toBe('test-service');
      expect(context.instrumentationScope.version).toBe('1.0.0');

      span.end();
    });
  });
});