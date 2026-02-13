/**
 * Transformer Registry
 * Central registry for all entity transformers
 * 
 * Requirements: 4.1, 4.2
 */

import type { Transformer, TransformerRegistryEntry } from './types';

/**
 * Global transformer registry
 * Stores all registered transformers for lookup and management
 */
class TransformerRegistry {
  private transformers: Map<string, TransformerRegistryEntry> = new Map();

  /**
   * Register a transformer in the registry
   * 
   * @param entry - Transformer registry entry
   * @throws Error if transformer with same ID already exists
   */
  register<TSource, TTarget>(entry: TransformerRegistryEntry<TSource, TTarget>): void {
    if (this.transformers.has(entry.id)) {
      throw new Error(`Transformer with id "${entry.id}" is already registered`);
    }

    this.transformers.set(entry.id, entry as TransformerRegistryEntry);
  }

  /**
   * Unregister a transformer from the registry
   * 
   * @param id - Transformer ID to unregister
   * @returns true if transformer was found and removed, false otherwise
   */
  unregister(id: string): boolean {
    return this.transformers.delete(id);
  }

  /**
   * Get a transformer by ID
   * 
   * @param id - Transformer ID
   * @returns Transformer entry or undefined if not found
   */
  get<TSource, TTarget>(id: string): TransformerRegistryEntry<TSource, TTarget> | undefined {
    return this.transformers.get(id) as TransformerRegistryEntry<TSource, TTarget> | undefined;
  }

  /**
   * Get a transformer instance by ID
   * 
   * @param id - Transformer ID
   * @returns Transformer instance or undefined if not found
   */
  getTransformer<TSource, TTarget>(id: string): Transformer<TSource, TTarget> | undefined {
    const entry = this.get<TSource, TTarget>(id);
    return entry?.transformer;
  }

  /**
   * Find transformers by source and target types
   * 
   * @param sourceType - Source type name
   * @param targetType - Target type name
   * @returns Array of matching transformer entries
   */
  findByTypes(sourceType: string, targetType: string): TransformerRegistryEntry[] {
    const results: TransformerRegistryEntry[] = [];

    for (const entry of this.transformers.values()) {
      if (entry.sourceType === sourceType && entry.targetType === targetType) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Find transformers by tag
   * 
   * @param tag - Tag to search for
   * @returns Array of matching transformer entries
   */
  findByTag(tag: string): TransformerRegistryEntry[] {
    const results: TransformerRegistryEntry[] = [];

    for (const entry of this.transformers.values()) {
      if (entry.tags?.includes(tag)) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Get all registered transformers
   * 
   * @returns Array of all transformer entries
   */
  getAll(): TransformerRegistryEntry[] {
    return Array.from(this.transformers.values());
  }

  /**
   * Check if a transformer is registered
   * 
   * @param id - Transformer ID
   * @returns true if transformer is registered, false otherwise
   */
  has(id: string): boolean {
    return this.transformers.has(id);
  }

  /**
   * Clear all registered transformers
   * Useful for testing
   */
  clear(): void {
    this.transformers.clear();
  }

  /**
   * Get the number of registered transformers
   * 
   * @returns Number of registered transformers
   */
  get size(): number {
    return this.transformers.size;
  }
}

/**
 * Global transformer registry instance
 */
export const transformerRegistry = new TransformerRegistry();

/**
 * Helper function to register a transformer
 * 
 * @param entry - Transformer registry entry
 */
export function registerTransformer<TSource, TTarget>(
  entry: TransformerRegistryEntry<TSource, TTarget>
): void {
  transformerRegistry.register(entry);
}

/**
 * Helper function to get a transformer
 * 
 * @param id - Transformer ID
 * @returns Transformer instance or undefined if not found
 */
export function getTransformer<TSource, TTarget>(
  id: string
): Transformer<TSource, TTarget> | undefined {
  return transformerRegistry.getTransformer<TSource, TTarget>(id);
}
