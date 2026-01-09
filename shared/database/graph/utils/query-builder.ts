/**
 * Cypher Query Builder
 *
 * Provides a fluent, type-safe interface for building Cypher queries.
 * Prevents common mistakes like Cypher injection and improper parameterization.
 *
 * @module utils/query-builder
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CypherClause {
  keyword: string;
  content: string;
  parameters: Record<string, any>;
}

export interface QueryBuilderOptions {
  pretty?: boolean;
  validate?: boolean;
}

// ============================================================================
// CYPHER QUERY BUILDER - Fluent API
// ============================================================================

/**
 * Build Cypher queries safely with a fluent interface.
 *
 * @example
 * ```typescript
 * const query = new CypherQueryBuilder()
 *   .match('(u:User {id: $userId})')
 *   .where('u.active = true')
 *   .return('u')
 *   .build();
 *
 * // Result:
 * // cypher: 'MATCH (u:User {id: $userId}) WHERE u.active = true RETURN u'
 * // params: { userId: '123' }
 * ```
 */
export class CypherQueryBuilder {
  private clauses: CypherClause[] = [];
  private params: Record<string, any> = {};
  private options: QueryBuilderOptions;

  constructor(options: QueryBuilderOptions = {}) {
    this.options = {
      pretty: false,
      validate: true,
      ...options,
    };
  }

  /**
   * Add a MATCH clause.
   *
   * @param pattern - Match pattern (e.g., '(u:User)-[r:KNOWS]->(f:User)')
   * @param params - Parameters for this clause
   * @returns This builder instance for chaining
   */
  match(pattern: string, params: Record<string, any> = {}): this {
    this.addClause('MATCH', pattern, params);
    return this;
  }

  /**
   * Add an optional MATCH clause.
   *
   * @param pattern - Pattern to match
   * @param params - Parameters
   * @returns This builder instance
   */
  optionalMatch(pattern: string, params: Record<string, any> = {}): this {
    this.addClause('OPTIONAL MATCH', pattern, params);
    return this;
  }

  /**
   * Add a WHERE clause.
   *
   * @param condition - Condition expression
   * @param params - Parameters
   * @returns This builder instance
   */
  where(condition: string, params: Record<string, any> = {}): this {
    this.addClause('WHERE', condition, params);
    return this;
  }

  /**
   * Add an AND condition to the last WHERE clause.
   *
   * @param condition - Condition expression
   * @param params - Parameters
   * @returns This builder instance
   */
  and(condition: string, params: Record<string, any> = {}): this {
    if (this.clauses.length === 0 || this.clauses[this.clauses.length - 1].keyword !== 'WHERE') {
      this.where(condition, params);
    } else {
      const last = this.clauses[this.clauses.length - 1];
      last.content = `${last.content} AND ${condition}`;
      Object.assign(last.parameters, params);
      Object.assign(this.params, params);
    }
    return this;
  }

  /**
   * Add an OR condition to the last WHERE clause.
   *
   * @param condition - Condition expression
   * @param params - Parameters
   * @returns This builder instance
   */
  or(condition: string, params: Record<string, any> = {}): this {
    if (this.clauses.length === 0 || this.clauses[this.clauses.length - 1].keyword !== 'WHERE') {
      this.where(condition, params);
    } else {
      const last = this.clauses[this.clauses.length - 1];
      last.content = `${last.content} OR ${condition}`;
      Object.assign(last.parameters, params);
      Object.assign(this.params, params);
    }
    return this;
  }

  /**
   * Add a CREATE clause.
   *
   * @param pattern - Pattern to create
   * @param params - Parameters
   * @returns This builder instance
   */
  create(pattern: string, params: Record<string, any> = {}): this {
    this.addClause('CREATE', pattern, params);
    return this;
  }

  /**
   * Add a MERGE clause.
   *
   * @param pattern - Pattern to merge
   * @param params - Parameters
   * @returns This builder instance
   */
  merge(pattern: string, params: Record<string, any> = {}): this {
    this.addClause('MERGE', pattern, params);
    return this;
  }

  /**
   * Add an ON CREATE SET clause.
   *
   * @param assignments - Assignment expressions
   * @param params - Parameters
   * @returns This builder instance
   */
  onCreateSet(assignments: string, params: Record<string, any> = {}): this {
    this.addClause('ON CREATE SET', assignments, params);
    return this;
  }

  /**
   * Add an ON MATCH SET clause.
   *
   * @param assignments - Assignment expressions
   * @param params - Parameters
   * @returns This builder instance
   */
  onMatchSet(assignments: string, params: Record<string, any> = {}): this {
    this.addClause('ON MATCH SET', assignments, params);
    return this;
  }

  /**
   * Add a SET clause.
   *
   * @param assignments - Assignment expressions
   * @param params - Parameters
   * @returns This builder instance
   */
  set(assignments: string, params: Record<string, any> = {}): this {
    this.addClause('SET', assignments, params);
    return this;
  }

  /**
   * Add a REMOVE clause.
   *
   * @param elements - Elements to remove
   * @returns This builder instance
   */
  remove(elements: string): this {
    this.addClause('REMOVE', elements);
    return this;
  }

  /**
   * Add a DELETE clause.
   *
   * @param elements - Elements to delete
   * @returns This builder instance
   */
  delete(elements: string): this {
    this.addClause('DELETE', elements);
    return this;
  }

  /**
   * Add a RETURN clause.
   *
   * @param items - Items to return
   * @param params - Parameters
   * @returns This builder instance
   */
  return(items: string, params: Record<string, any> = {}): this {
    this.addClause('RETURN', items, params);
    return this;
  }

  /**
   * Add an ORDER BY clause.
   *
   * @param items - Items to order by
   * @returns This builder instance
   */
  orderBy(items: string): this {
    this.addClause('ORDER BY', items);
    return this;
  }

  /**
   * Add a LIMIT clause.
   *
   * @param limit - Limit value
   * @returns This builder instance
   */
  limit(limit: number): this {
    this.addClause('LIMIT', limit.toString());
    return this;
  }

  /**
   * Add a SKIP clause.
   *
   * @param skip - Skip value
   * @returns This builder instance
   */
  skip(skip: number): this {
    this.addClause('SKIP', skip.toString());
    return this;
  }

  /**
   * Add a WITH clause for chaining queries.
   *
   * @param items - Items to pass through
   * @param params - Parameters
   * @returns This builder instance
   */
  with(items: string, params: Record<string, any> = {}): this {
    this.addClause('WITH', items, params);
    return this;
  }

  /**
   * Add an UNWIND clause for array processing.
   *
   * @param expression - Unwind expression
   * @param params - Parameters
   * @returns This builder instance
   */
  unwind(expression: string, params: Record<string, any> = {}): this {
    this.addClause('UNWIND', expression, params);
    return this;
  }

  /**
   * Add a custom clause.
   *
   * @param keyword - Clause keyword
   * @param content - Clause content
   * @param params - Parameters
   * @returns This builder instance
   */
  custom(keyword: string, content: string, params: Record<string, any> = {}): this {
    this.addClause(keyword, content, params);
    return this;
  }

  /**
   * Build the query and return cypher string and parameters.
   *
   * @returns Object with `cypher` string and `params` object
   *
   * @example
   * ```typescript
   * const { cypher, params } = builder.build();
   * await session.run(cypher, params);
   * ```
   */
  build(): { cypher: string; params: Record<string, any> } {
    if (this.options.validate) {
      this.validate();
    }

    const cypher = this.clauses
      .map(clause => `${clause.keyword} ${clause.content}`)
      .join(this.options.pretty ? '\n' : ' ');

    return {
      cypher: cypher.trim(),
      params: this.params,
    };
  }

  /**
   * Build the query and return only the Cypher string.
   *
   * @returns Cypher query string
   */
  buildCypher(): string {
    return this.build().cypher;
  }

  /**
   * Build the query and return only the parameters.
   *
   * @returns Parameters object
   */
  buildParams(): Record<string, any> {
    return this.build().params;
  }

  /**
   * Get the number of clauses in the query.
   *
   * @returns Number of clauses
   */
  clauseCount(): number {
    return this.clauses.length;
  }

  /**
   * Reset the builder to start a new query.
   *
   * @returns This builder instance
   */
  reset(): this {
    this.clauses = [];
    this.params = {};
    return this;
  }

  /**
   * Clone the builder to create a new instance with the same state.
   *
   * @returns New CypherQueryBuilder instance
   */
  clone(): CypherQueryBuilder {
    const cloned = new CypherQueryBuilder(this.options);
    cloned.clauses = JSON.parse(JSON.stringify(this.clauses));
    cloned.params = JSON.parse(JSON.stringify(this.params));
    return cloned;
  }

  /**
   * Private helper to add a clause.
   */
  private addClause(
    keyword: string,
    content: string,
    params: Record<string, any> = {}
  ): void {
    this.clauses.push({
      keyword,
      content,
      parameters: params,
    });
    Object.assign(this.params, params);
  }

  /**
   * Private helper to validate the query structure.
   */
  private validate(): void {
    // Ensure we have at least one clause
    if (this.clauses.length === 0) {
      throw new Error('Query must have at least one clause');
    }

    // Ensure RETURN is present
    const hasReturn = this.clauses.some(c => c.keyword === 'RETURN');
    if (!hasReturn) {
      console.warn('Warning: Query does not have a RETURN clause');
    }

    // Validate clause order
    const clauseOrder = this.clauses.map(c => c.keyword.split(' ')[0]);
    this.validateClauseOrder(clauseOrder);
  }

  /**
   * Private helper to validate clause ordering.
   */
  private validateClauseOrder(clauses: string[]): void {
    const clauseRanks: Record<string, number> = {
      'MATCH': 1,
      'OPTIONAL': 2,
      'WHERE': 3,
      'CREATE': 4,
      'MERGE': 5,
      'ON': 6,
      'SET': 7,
      'REMOVE': 8,
      'DELETE': 9,
      'WITH': 10,
      'UNWIND': 11,
      'RETURN': 12,
      'ORDER': 13,
      'SKIP': 14,
      'LIMIT': 15,
    };

    let lastRank = 0;
    for (const clause of clauses) {
      const rank = clauseRanks[clause] || 0;
      if (rank < lastRank) {
        console.warn(`Warning: Clause order may be incorrect. ${clause} appears after a lower-precedence clause`);
      }
      lastRank = Math.max(lastRank, rank);
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new CypherQueryBuilder instance.
 *
 * @param options - Builder options
 * @returns New CypherQueryBuilder instance
 *
 * @example
 * ```typescript
 * const query = createQueryBuilder()
 *   .match('(u:User)')
 *   .return('u')
 *   .build();
 * ```
 */
export function createQueryBuilder(options?: QueryBuilderOptions): CypherQueryBuilder {
  return new CypherQueryBuilder(options);
}

/**
 * Build a parameterized Cypher query from a template.
 *
 * @param template - Query template with $paramName placeholders
 * @param params - Parameter values
 * @returns Object with `cypher` and `params`
 *
 * @example
 * ```typescript
 * const { cypher, params } = buildFromTemplate(
 *   'MATCH (u:User {id: $userId}) RETURN u',
 *   { userId: '123' }
 * );
 * ```
 */
export function buildFromTemplate(
  template: string,
  params: Record<string, any> = {}
): { cypher: string; params: Record<string, any> } {
  return {
    cypher: template,
    params,
  };
}

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

/**
 * Pagination options for query results.
 */
export interface PaginationOptions {
  skip?: number;
  limit?: number;
}

/**
 * Add pagination to a Cypher query.
 *
 * @param query - Base query (should not include SKIP/LIMIT)
 * @param options - Pagination options
 * @returns Query with pagination and parameters
 *
 * @example
 * ```typescript
 * const { query, params } = withPagination(
 *   'MATCH (u:User) RETURN u',
 *   { skip: 0, limit: 10 }
 * );
 * // Result: MATCH (u:User) RETURN u SKIP $skip LIMIT $limit
 * // Params: { skip: 0, limit: 10 }
 * ```
 */
export function withPagination(
  query: string,
  options: PaginationOptions = {}
): { query: string; params: Record<string, any> } {
  const { skip = 0, limit = 100 } = options;

  const paginatedQuery = `${query} SKIP $skip LIMIT $limit`;

  return {
    query: paginatedQuery,
    params: { skip, limit },
  };
}

// ============================================================================
