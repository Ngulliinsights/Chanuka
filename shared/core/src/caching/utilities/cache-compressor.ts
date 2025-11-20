/**
 * Cache Compression Utilities
 *
 * Provides compression and decompression functionality for cache entries
 * with support for multiple algorithms and automatic threshold detection
 */

import { gzip, gunzip, deflate, inflate } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);

export interface CompressionResult {
  data: Buffer;
  originalSize: number;
  compressedSize: number;
  algorithm: CompressionAlgorithm;
  ratio: number;
}

export type CompressionAlgorithm = 'gzip' | 'deflate' | 'none';

export interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  threshold: number; // Minimum size in bytes to compress
  level?: number; // Compression level (1-9)
}

export class CacheCompressor {
  private readonly options: CompressionOptions;

  constructor(options: Partial<CompressionOptions> = {}) {
    this.options = {
      algorithm: options.algorithm || 'gzip',
      threshold: options.threshold || 1024, // 1KB default
      level: options.level || 6,
    };
  }

  /**
   * Compress data if it meets the threshold criteria
   */
  async compress(data: string | Buffer): Promise<CompressionResult> {
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const originalSize = bufferData.length;

    // Skip compression for small data
    if (originalSize < this.options.threshold) {
      return {
        data: bufferData,
        originalSize,
        compressedSize: originalSize,
        algorithm: 'none',
        ratio: 1.0,
      };
    }

    try {
      let compressed: Buffer;

      switch (this.options.algorithm) {
        case 'gzip':
          compressed = await gzipAsync(bufferData, { level: this.options.level });
          break;
        case 'deflate':
          compressed = await deflateAsync(bufferData, { level: this.options.level });
          break;
        default:
          return {
            data: bufferData,
            originalSize,
            compressedSize: originalSize,
            algorithm: 'none',
            ratio: 1.0,
          };
      }

      const compressedSize = compressed.length;
      const ratio = originalSize > 0 ? compressedSize / originalSize : 1.0;

      return {
        data: compressed,
        originalSize,
        compressedSize,
        algorithm: this.options.algorithm,
        ratio,
      };
    } catch (error) {
      // Return uncompressed data on compression failure
      console.warn('Compression failed, returning uncompressed data:', error);
      return {
        data: bufferData,
        originalSize,
        compressedSize: originalSize,
        algorithm: 'none',
        ratio: 1.0,
      };
    }
  }

  /**
   * Decompress data based on the detected algorithm
   */
  async decompress(data: Buffer): Promise<Buffer> {
    // Check for gzip magic number (0x1f 0x8b)
    if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
      try {
        return await gunzipAsync(data);
      } catch (error) {
        console.warn('Gzip decompression failed:', error);
        return data; // Return original data on failure
      }
    }

    // Check for deflate/zlib magic number (0x78 0x9c, 0x78 0x5e, 0x78 0xda)
    if (data.length >= 2 && data[0] === 0x78 &&
        (data[1] === 0x9c || data[1] === 0x5e || data[1] === 0x01 || data[1] === 0xda)) {
      try {
        return await inflateAsync(data);
      } catch (error) {
        console.warn('Deflate decompression failed:', error);
        return data; // Return original data on failure
      }
    }

    // No compression detected, return as-is
    return data;
  }

  /**
   * Check if data should be compressed based on size and algorithm
   */
  shouldCompress(data: string | Buffer): boolean {
    const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
    return size >= this.options.threshold;
  }

  /**
   * Get compression statistics
   */
  getStats(): {
    algorithm: CompressionAlgorithm;
    threshold: number;
    level: number;
  } {
    return {
      algorithm: this.options.algorithm,
      threshold: this.options.threshold,
      level: this.options.level || 6,
    };
  }

  /**
   * Estimate compressed size without actually compressing
   * This is a rough heuristic for decision making
   */
  estimateCompressedSize(data: string | Buffer): number {
    const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');

    if (size < this.options.threshold) {
      return size;
    }

    // Rough compression ratio estimates
    const ratios: Record<CompressionAlgorithm, number> = {
      gzip: 0.3,    // Typically 70% reduction
      deflate: 0.4, // Typically 60% reduction
      none: 1.0,
    };

    return Math.max(100, Math.floor(size * ratios[this.options.algorithm]));
  }
}

/**
 * Factory function for creating cache compressors
 */
export function createCacheCompressor(options?: Partial<CompressionOptions>): CacheCompressor {
  return new CacheCompressor(options);
}

/**
 * Utility function to detect if data is compressed
 */
export function isCompressed(data: Buffer): CompressionAlgorithm {
  if (data.length >= 2) {
    // Gzip detection
    if (data[0] === 0x1f && data[1] === 0x8b) {
      return 'gzip';
    }

    // Deflate detection
    if (data[0] === 0x78 && (data[1] === 0x9c || data[1] === 0x5e || data[1] === 0x01 || data[1] === 0xda)) {
      return 'deflate';
    }
  }

  return 'none';
}


