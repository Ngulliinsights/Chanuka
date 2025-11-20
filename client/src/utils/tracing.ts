import { logger } from './logger';

type Trace = {
  id: string;
  name: string;
  start: number;
  metadata?: Record<string, unknown>;
};

const activeTraces = new Map<string, Trace>();

export function startTrace(name: string, metadata?: Record<string, unknown>) {
  const id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const t: Trace = { id, name, start: performance.now(), metadata };
  activeTraces.set(id, t);
  logger.debug(`Trace started: ${name}`, { traceId: id, name, metadata });
  return t;
}

export function finishTrace(trace: Trace, result?: Record<string, unknown>) {
  try {
    const end = performance.now();
    const duration = Math.max(0, end - trace.start);
    activeTraces.delete(trace.id);
    logger.info(`Trace finished: ${trace.name}`, {
      traceId: trace.id,
      name: trace.name,
      duration,
      metadata: trace.metadata,
      result,
    });
    return { traceId: trace.id, duration };
  } catch (error) {
    logger.warn('Failed to finish trace', { error });
    return null;
  }
}

export function getActiveTracesCount() {
  return activeTraces.size;
}

export default {
  startTrace,
  finishTrace,
  getActiveTracesCount,
};
