/**
 * Cache Serializer
 * Handles serialization and deserialization of cache data
 */

import type { SerializationOptions } from '../types';

export class CacheSerializer {
  private options: SerializationOptions;

  constructor(options: SerializationOptions = {}) {
    this.options = {
      format: options.format || 'json',
      preserveTypes: options.preserveTypes ?? true,
      dateHandling: options.dateHandling || 'iso',
      enableBinaryMode: options.enableBinaryMode ?? false,
    };
    if (options.customSerializer !== undefined) {
      this.options.customSerializer = options.customSerializer;
    }
  }

  /**
   * Serialize data for storage
   */
  serialize(data: any): string {
    try {
      switch (this.options.format) {
        case 'json':
          return this.serializeJSON(data);
        case 'msgpack':
          return this.serializeMsgPack(data);
        case 'binary':
          return this.serializeBinary(data);
        default:
          return this.serializeJSON(data);
      }
    } catch (error) {
      throw new Error(`Serialization failed: ${error}`);
    }
  }

  /**
   * Deserialize data from storage
   */
  deserialize(serializedData: string): any {
    try {
      switch (this.options.format) {
        case 'json':
          return this.deserializeJSON(serializedData);
        case 'msgpack':
          return this.deserializeMsgPack(serializedData);
        case 'binary':
          return this.deserializeBinary(serializedData);
        default:
          return this.deserializeJSON(serializedData);
      }
    } catch (error) {
      throw new Error(`Deserialization failed: ${error}`);
    }
  }

  /**
   * JSON serialization with type preservation
   */
  private serializeJSON(data: any): string {
    if (!this.options.preserveTypes) {
      return JSON.stringify(data);
    }

    return JSON.stringify(data, (_key, value) => {
      // Handle dates
      if (value instanceof Date) {
        switch (this.options.dateHandling) {
          case 'iso':
            return { __type: 'Date', value: value.toISOString() };
          case 'timestamp':
            return { __type: 'Date', value: value.getTime() };
          case 'preserve':
            return { __type: 'Date', value: value.toISOString() };
          default:
            return value.toISOString();
        }
      }

      // Handle RegExp
      if (value instanceof RegExp) {
        return { __type: 'RegExp', value: value.toString() };
      }

      // Handle undefined
      if (value === undefined) {
        return { __type: 'undefined' };
      }

      // Handle BigInt
      if (typeof value === 'bigint') {
        return { __type: 'BigInt', value: value.toString() };
      }

      return value;
    });
  }

  /**
   * JSON deserialization with type restoration
   */
  private deserializeJSON(serializedData: string): any {
    if (!this.options.preserveTypes) {
      return JSON.parse(serializedData);
    }

    return JSON.parse(serializedData, (_key, value) => {
      if (value && typeof value === 'object' && value.__type) {
        switch (value.__type) {
          case 'Date':
            return new Date(value.value);
          case 'RegExp':
            const match = value.value.match(/^\/(.*)\/([gimuy]*)$/);
            return match ? new RegExp(match[1], match[2]) : new RegExp(value.value);
          case 'undefined':
            return undefined;
          case 'BigInt':
            return BigInt(value.value);
          default:
            return value;
        }
      }
      return value;
    });
  }

  /**
   * MessagePack serialization (simplified implementation)
   */
  private serializeMsgPack(data: any): string {
    // In a real implementation, you'd use a msgpack library
    // For now, fall back to JSON
    return this.serializeJSON(data);
  }

  /**
   * MessagePack deserialization (simplified implementation)
   */
  private deserializeMsgPack(serializedData: string): any {
    // In a real implementation, you'd use a msgpack library
    // For now, fall back to JSON
    return this.deserializeJSON(serializedData);
  }

  /**
   * Binary serialization (simplified implementation)
   */
  private serializeBinary(data: any): string {
    // In a real implementation, you'd use a binary format
    // For now, fall back to JSON with base64 encoding
    const json = this.serializeJSON(data);
    return Buffer.from(json, 'utf8').toString('base64');
  }

  /**
   * Binary deserialization (simplified implementation)
   */
  private deserializeBinary(serializedData: string): any {
    // In a real implementation, you'd use a binary format
    // For now, decode from base64 and parse JSON
    const json = Buffer.from(serializedData, 'base64').toString('utf8');
    return this.deserializeJSON(json);
  }

  /**
   * Get serialization statistics
   */
  getStats(): SerializationOptions {
    return { ...this.options };
  }

  /**
   * Test if data can be serialized
   */
  canSerialize(data: any): boolean {
    try {
      this.serialize(data);
      return true;
    } catch {
      return false;
    }
  }
}


