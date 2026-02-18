/**
 * Log Buffer
 *
 * A fixed-size in-memory ring buffer for log entries.
 * Responsibility: store and query recent log entries only.
 * It knows nothing about Pino, Express, or any other infrastructure.
 */

import type { LoggingConfig } from '../config/logging-config';

export interface BufferedLogEntry extends Record<string, unknown> {
  timestamp: Date;
  level: string;
  component?: string;
  operation?: string;
  duration?: number;
}

export class LogBuffer {
  private readonly buffer: BufferedLogEntry[] = [];
  private readonly maxSize: number;
  private readonly enabled: boolean;

  constructor(config: Pick<LoggingConfig, 'enableInMemoryStorage' | 'maxStoredLogs'>) {
    this.enabled = config.enableInMemoryStorage;
    this.maxSize = config.maxStoredLogs;
  }

  /** Push a parsed log entry into the ring buffer. No-op when disabled. */
  push(entry: BufferedLogEntry): void {
    if (!this.enabled) return;
    this.buffer.push(entry);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /** Parse a raw Pino JSON string and push to buffer. */
  ingest(raw: string): void {
    if (!this.enabled) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      this.push({
        ...parsed,
        timestamp: new Date((parsed['time'] as number) ?? Date.now()),
        level: String(parsed['level'] ?? 'info'),
      });
    } catch {
      // Silently ignore malformed log lines
    }
  }

  /** Return all entries within the given time range. */
  query(range: { start: Date; end: Date }): BufferedLogEntry[] {
    if (!this.enabled) return [];
    return this.buffer.filter(
      (entry) => entry.timestamp >= range.start && entry.timestamp <= range.end
    );
  }

  /** Current number of entries in the buffer. */
  get size(): number {
    return this.buffer.length;
  }

  /** Flush all entries (useful in tests). */
  clear(): void {
    this.buffer.length = 0;
  }
}
