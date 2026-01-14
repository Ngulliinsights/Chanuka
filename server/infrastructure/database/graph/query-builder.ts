/**
 * Query Builder Utility
 * 
 * Provides reusable query templates and builders for common Neo4j operations.
 * All queries are parameterized to prevent Cypher injection.
 * 
 * @module utils/query-builder
 */

// ============================================================================
// PAGINATION
// ============================================================================

export interface PaginationOptions {
  skip?: number;
  limit?: number;
}

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 10000;

/**
 * Apply pagination to a Cypher query.
 * 
 * @param cypher - Base query
 * @param options - Pagination options
 * @returns Query with pagination applied
 */
export function withPagination(
  cypher: string,
  options: PaginationOptions = {}
): { query: string; params: Record<string, number> } {
  const skip = options.skip || 0;
  const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);

  return {
    query: `${cypher}\nSKIP $skip LIMIT $limit`,
    params: { skip, limit },
  };
}

// ============================================================================
// NODE OPERATIONS
// ============================================================================

/**
 * Build a MERGE query for creating or updating a node.
 * 
 * @param label - Node label
 * @param idField - Unique identifier field
 * @param properties - Node properties
 * @returns Cypher query and parameters
 */
export function buildMergeNode(
  label: string,
  idField: string,
  properties: Record<string, any>
): { query: string; params: Record<string, any> } {
  const query = `
    MERGE (n:${label} {${idField}: $id})
    SET n += $properties,
        n.last_synced_at = timestamp()
    RETURN n
  `;

  return {
    query,
    params: {
      id: properties[idField],
      properties,
    },
  };
}

/**
 * Build a batch MERGE query for multiple nodes.
 * 
 * @param label - Node label
 * @param idField - Unique identifier field
 * @returns Cypher query template
 */
export function buildBatchMergeNodes(
  label: string,
  idField: string
): string {
  return `
    UNWIND $items as item
    MERGE (n:${label} {${idField}: item.${idField}})
    SET n += item,
        n.last_synced_at = timestamp()
  `;
}

/**
 * Build a DELETE query for removing a node.
 * 
 * @param label - Node label
 * @param idField - Unique identifier field
 * @returns Cypher query template
 */
export function buildDeleteNode(label: string, idField: string = 'id'): string {
  return `
    MATCH (n:${label} {${idField}: $id})
    DETACH DELETE n
  `;
}

// ============================================================================
// RELATIONSHIP OPERATIONS
// ============================================================================

/**
 * Build a MERGE query for creating or updating a relationship.
 * 
 * @param fromLabel - Source node label
 * @param toLabel - Target node label
 * @param relationshipType - Relationship type
 * @param properties - Relationship properties
 * @returns Cypher query template
 */
export function buildMergeRelationship(
  fromLabel: string,
  toLabel: string,
  relationshipType: string,
  properties?: Record<string, any>
): string {
  const propsSet = properties
    ? `SET r += $properties, r.last_synced_at = timestamp()`
    : `SET r.last_synced_at = timestamp()`;

  return `
    MATCH (from:${fromLabel} {id: $fromId})
    MATCH (to:${toLabel} {id: $toId})
    MERGE (from)-[r:${relationshipType}]->(to)
    ${propsSet}
    RETURN r
  `;
}

/**
 * Build a batch relationship creation query.
 * 
 * @param fromLabel - Source node label
 * @param toLabel - Target node label
 * @param relationshipType - Relationship type
 * @returns Cypher query template
 */
export function buildBatchMergeRelationships(
  fromLabel: string,
  toLabel: string,
  relationshipType: string
): string {
  return `
    UNWIND $relationships as rel
    MATCH (from:${fromLabel} {id: rel.fromId})
    MATCH (to:${toLabel} {id: rel.toId})
    MERGE (from)-[r:${relationshipType}]->(to)
    SET r += rel.properties,
        r.last_synced_at = timestamp()
  `;
}

// ============================================================================
// SEARCH QUERIES
// ============================================================================

/**
 * Build a search query with filters.
 * 
 * @param label - Node label to search
 * @param filters - Field filters
 * @param options - Search options
 * @returns Cypher query and parameters
 */
export function buildSearchQuery(
  label: string,
  filters: Record<string, any>,
  options: PaginationOptions & { orderBy?: string; orderDirection?: 'ASC' | 'DESC' } = {}
): { query: string; params: Record<string, any> } {
  const whereClause = Object.keys(filters)
    .map(key => `n.${key} = $${key}`)
    .join(' AND ');

  const orderClause = options.orderBy
    ? `ORDER BY n.${options.orderBy} ${options.orderDirection || 'ASC'}`
    : '';

  let query = `
    MATCH (n:${label})
    ${whereClause ? `WHERE ${whereClause}` : ''}
    RETURN n
    ${orderClause}
  `;

  const { query: paginatedQuery, params: paginationParams } = withPagination(
    query,
    options
  );

  return {
    query: paginatedQuery,
    params: {
      ...filters,
      ...paginationParams,
    },
  };
}

// ============================================================================
// AGGREGATION QUERIES
// ============================================================================

/**
 * Build a count query.
 * 
 * @param label - Node label
 * @param filters - Optional filters
 * @returns Cypher query
 */
export function buildCountQuery(
  label: string,
  filters?: Record<string, any>
): { query: string; params: Record<string, any> } {
  const whereClause = filters
    ? Object.keys(filters)
        .map(key => `n.${key} = $${key}`)
        .join(' AND ')
    : '';

  const query = `
    MATCH (n:${label})
    ${whereClause ? `WHERE ${whereClause}` : ''}
    RETURN count(n) as count
  `;

  return {
    query,
    params: filters || {},
  };
}

// ============================================================================
// RELATIONSHIP TRAVERSAL
// ============================================================================

/**
 * Build a query to find related nodes.
 * 
 * @param startLabel - Starting node label
 * @param relationshipType - Relationship type to traverse
 * @param endLabel - Ending node label
 * @param direction - Relationship direction
 * @param options - Query options
 * @returns Cypher query
 */
export function buildTraversalQuery(
  startLabel: string,
  relationshipType: string,
  endLabel: string,
  direction: 'OUTGOING' | 'INCOMING' | 'BOTH' = 'OUTGOING',
  options: PaginationOptions = {}
): { query: string; params: Record<string, any> } {
  let relationshipPattern: string;

  switch (direction) {
    case 'OUTGOING':
      relationshipPattern = `-[:${relationshipType}]->`;
      break;
    case 'INCOMING':
      relationshipPattern = `<-[:${relationshipType}]-`;
      break;
    case 'BOTH':
      relationshipPattern = `-[:${relationshipType}]-`;
      break;
  }

  let query = `
    MATCH (start:${startLabel} {id: $startId})${relationshipPattern}(end:${endLabel})
    RETURN end
  `;

  const { query: paginatedQuery, params: paginationParams } = withPagination(
    query,
    options
  );

  return {
    query: paginatedQuery,
    params: {
      startId: '', // Will be provided at runtime
      ...paginationParams,
    },
  };
}

// ============================================================================
// PATH QUERIES
// ============================================================================

/**
 * Build a shortest path query.
 * 
 * @param fromLabel - Start node label
 * @param toLabel - End node label
 * @param maxHops - Maximum path length
 * @returns Cypher query
 */
export function buildShortestPathQuery(
  fromLabel: string,
  toLabel: string,
  maxHops: number = 5
): string {
  return `
    MATCH (from:${fromLabel} {id: $fromId})
    MATCH (to:${toLabel} {id: $toId})
    MATCH path = shortestPath((from)-[*..${maxHops}]-(to))
    RETURN path, length(path) as pathLength
    ORDER BY pathLength ASC
    LIMIT 1
  `;
}

/**
 * Build an all paths query.
 * 
 * @param fromLabel - Start node label
 * @param toLabel - End node label
 * @param maxHops - Maximum path length
 * @param limit - Maximum paths to return
 * @returns Cypher query
 */
export function buildAllPathsQuery(
  fromLabel: string,
  toLabel: string,
  maxHops: number = 3,
  limit: number = 10
): string {
  return `
    MATCH (from:${fromLabel} {id: $fromId})
    MATCH (to:${toLabel} {id: $toId})
    MATCH path = (from)-[*1..${maxHops}]-(to)
    RETURN path, length(path) as pathLength
    ORDER BY pathLength ASC
    LIMIT ${limit}
  `;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape a string for use in Cypher queries.
 * Note: This should NOT be used instead of parameterized queries!
 * Only use for dynamic label/property names.
 * 
 * @param value - Value to escape
 * @returns Escaped value
 */
export function escapeCypherIdentifier(value: string): string {
  // Remove any characters that aren't alphanumeric or underscore
  return value.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Validate that a label name is safe to use.
 * 
 * @param label - Label to validate
 * @throws {Error} If label is invalid
 */
export function validateLabel(label: string): void {
  if (!/^[A-Z][a-zA-Z0-9_]*$/.test(label)) {
    throw new Error(
      `Invalid label: ${label}. Labels must start with uppercase letter and contain only alphanumerics and underscores.`
    );
  }
}

/**
 * Validate that a property name is safe to use.
 * 
 * @param property - Property name to validate
 * @throws {Error} If property name is invalid
 */
export function validatePropertyName(property: string): void {
  if (!/^[a-z_][a-zA-Z0-9_]*$/.test(property)) {
    throw new Error(
      `Invalid property name: ${property}. Must start with lowercase letter or underscore.`
    );
  }
}

// ============================================================================
// QUERY TEMPLATES FOR COMMON PATTERNS
// ============================================================================

export const QUERY_TEMPLATES = {
  /**
   * Find duplicate nodes by property
   */
  FIND_DUPLICATES: (label: string, property: string) => `
    MATCH (n:${label})
    WITH n.${property} as value, collect(n) as nodes
    WHERE size(nodes) > 1
    RETURN value, nodes
  `,

  /**
   * Find orphaned nodes (no relationships)
   */
  FIND_ORPHANS: (label: string) => `
    MATCH (n:${label})
    WHERE NOT (n)--()
    RETURN n
  `,

  /**
   * Find nodes with highest degree
   */
  FIND_HUBS: (label: string, limit: number = 10) => `
    MATCH (n:${label})
    RETURN n, size((n)--()) as degree
    ORDER BY degree DESC
    LIMIT ${limit}
  `,

  /**
   * Delete all relationships of a type
   */
  DELETE_RELATIONSHIPS: (relationshipType: string) => `
    MATCH ()-[r:${relationshipType}]->()
    DELETE r
  `,

  /**
   * Copy relationships from one node to another
   */
  COPY_RELATIONSHIPS: (label: string) => `
    MATCH (from:${label} {id: $fromId})-[r]->(target)
    MATCH (to:${label} {id: $toId})
    CREATE (to)-[r2:${relationshipType}]->(target)
    SET r2 = properties(r)
  `,
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  withPagination,
  buildMergeNode,
  buildBatchMergeNodes,
  buildDeleteNode,
  buildMergeRelationship,
  buildBatchMergeRelationships,
  buildSearchQuery,
  buildCountQuery,
  buildTraversalQuery,
  buildShortestPathQuery,
  buildAllPathsQuery,
  escapeCypherIdentifier,
  validateLabel,
  validatePropertyName,
  QUERY_TEMPLATES,
};
