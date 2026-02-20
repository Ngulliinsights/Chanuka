/**
 * Result Normalizer (REFACTORED)
 * 
 * Safely extract and normalize Neo4j query results.
 * 
 * IMPROVEMENTS:
 * - ✅ Type-safe extraction
 * - ✅ Null handling
 * - ✅ Array normalization
 * - ✅ Date parsing
 * - ✅ Error handling
 */

import { Record as Neo4jRecord, Integer, Node, Relationship, Path } from 'neo4j-driver';
import { logger } from '@server/infrastructure/observability';

/**
 * Safely extract value from Neo4j record.
 */
export function extractValue<T = any>(record: Neo4jRecord, key: string, defaultValue?: T): T | null {
  try {
    if (!record.has(key)) {
      return defaultValue !== undefined ? defaultValue : null;
    }

    const value = record.get(key);
    return normalizeValue(value) as T;
  } catch (error) {
    logger.warn('Failed to extract value', { key, error: error.message });
    return defaultValue !== undefined ? defaultValue : null;
  }
}

/**
 * Extract all values from record as object.
 */
export function extractRecord(record: Neo4jRecord): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  record.keys.forEach(key => {
    result[key] = extractValue(record, key);
  });

  return result;
}

/**
 * Normalize Neo4j value to JavaScript type.
 */
export function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  // Neo4j Integer
  if (Integer.isInteger(value)) {
    return value.toNumber();
  }

  // Node
  if (isNode(value)) {
    return normalizeNode(value);
  }

  // Relationship
  if (isRelationship(value)) {
    return normalizeRelationship(value);
  }

  // Path
  if (isPath(value)) {
    return normalizePath(value);
  }

  // Date
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Array
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  // Object
  if (typeof value === 'object') {
    return normalizeObject(value);
  }

  return value;
}

/**
 * Normalize Neo4j Node.
 */
export function normalizeNode(node: Node): Record<string, unknown> {
  return {
    id: node.identity.toNumber(),
    labels: node.labels,
    properties: normalizeObject(node.properties),
  };
}

/**
 * Normalize Neo4j Relationship.
 */
export function normalizeRelationship(rel: Relationship): Record<string, unknown> {
  return {
    id: rel.identity.toNumber(),
    type: rel.type,
    startNodeId: rel.start.toNumber(),
    endNodeId: rel.end.toNumber(),
    properties: normalizeObject(rel.properties),
  };
}

/**
 * Normalize Neo4j Path.
 */
export function normalizePath(path: Path): Record<string, unknown> {
  return {
    length: path.length,
    nodes: path.segments.flatMap(s => [normalizeNode(s.start), normalizeNode(s.end)]),
    relationships: path.segments.map(s => normalizeRelationship(s.relationship)),
  };
}

/**
 * Normalize object properties.
 */
function normalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  Object.keys(obj).forEach(key => {
    normalized[key] = normalizeValue(obj[key]);
  });

  return normalized;
}

/**
 * Type guards
 */
function isNode(value: unknown): value is Node {
  return value && typeof value === 'object' && 'labels' in value && 'properties' in value;
}

function isRelationship(value: unknown): value is Relationship {
  return value && typeof value === 'object' && 'type' in value && 'start' in value && 'end' in value;
}

function isPath(value: unknown): value is Path {
  return value && typeof value === 'object' && 'segments' in value && 'length' in value;
}

/**
 * Extract array of values from records.
 */
export function extractArray<T = any>(records: Neo4jRecord[], key: string): T[] {
  return records
    .map(record => extractValue<T>(record, key))
    .filter((value): value is T => value !== null);
}

/**
 * Extract single value from first record.
 */
export function extractSingle<T = any>(records: Neo4jRecord[], key: string, defaultValue?: T): T | null {
  if (records.length === 0) {
    return defaultValue !== undefined ? defaultValue : null;
  }

  return extractValue<T>(records[0], key, defaultValue);
}

/**
 * Check if records are empty.
 */
export function isEmpty(records: Neo4jRecord[]): boolean {
  return records.length === 0;
}

/**
 * Count records.
 */
export function count(records: Neo4jRecord[]): number {
  return records.length;
}

/**
 * Extract node properties.
 */
export function extractNodeProperties(record: Neo4jRecord, key: string): Record<string, unknown> | null {
  const value = extractValue(record, key);
  
  if (isNode(value)) {
    return normalizeObject(value.properties);
  }

  return value && typeof value === 'object' ? normalizeObject(value) : null;
}

/**
 * Batch extract records.
 */
export function batchExtract(records: Neo4jRecord[]): Record<string, unknown>[] {
  return records.map(extractRecord);
}

export default {
  extractValue,
  extractRecord,
  extractArray,
  extractSingle,
  extractNodeProperties,
  normalizeValue,
  normalizeNode,
  normalizeRelationship,
  normalizePath,
  isEmpty,
  count,
  batchExtract,
};
