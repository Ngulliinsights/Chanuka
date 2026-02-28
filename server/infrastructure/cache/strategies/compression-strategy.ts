/**
 * Compression Strategy
 *
 * Handles compression and decompression of cache values to reduce memory usage
 * and network bandwidth. Extracted from cache-factory.ts wrapper classes.
 */

import { CacheCompressor } from '../compression/cache-compressor';

export interface CompressionStrategyConfig {
  threshold?: number; // Minimum size in bytes to trigger compression
  algorithm?: 'gzip' | 'deflate' | 'brotli';
  level?: number; // Compression level (1-9)
}

/**
 * CompressionStrategy
 *
 * Provides compression and decompression capabilities for cache values.
 * Uses CacheCompressor internally to handle the actual compression logic.
 *
 * @example
 * ```typescript
 * const strategy = new CompressionStrategy(compressor);
 * const compressed = await strategy.compress(largeObject);
 * const decompressed = await strategy.decompress(compressed);
 * ```
 */
export class CompressionStrategy {
  constructor(private compressor: CacheCompressor) {}

  /**
   * Compress a value if it meets the threshold
   *
   * @param value - The value to compress
   * @returns The compressed value (or original if below threshold)
   */
  async compress<T>(value: T): Promise<T> {
    try {
      return await this.compressor.compress(value);
    } catch (error) {
      console.warn('Compression failed, returning original value:', error);
      return value;
    }
  }

  /**
   * Decompress a value
   *
   * @param value - The value to decompress
   * @returns The decompressed value (or original if not compressed)
   */
  async decompress<T>(value: T): Promise<T> {
    try {
      return await this.compressor.decompress(value);
    } catch (error) {
      console.warn('Decompression failed, returning original value:', error);
      return value;
    }
  }

  /**
   * Check if a value should be compressed based on size
   *
   * @param value - The value to check
   * @returns True if the value should be compressed
   */
  shouldCompress<T>(value: T): boolean {
    if (typeof this.compressor.shouldCompress === 'function') {
      return this.compressor.shouldCompress(value);
    }
    return false;
  }

  /**
   * Get compression statistics
   *
   * @returns Compression statistics if available
   */
  getStats(): {
    compressionRatio: number;
    totalCompressed: number;
    totalDecompressed: number;
  } | null {
    if (typeof (this.compressor as any).getStats === 'function') {
      return (this.compressor as any).getStats();
    }
    return null;
  }
}
