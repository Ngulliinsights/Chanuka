import { SQL } from 'drizzle-orm';

/**
 * Secure Query Value Object
 * Represents a validated, parameterized database query
 */
export class SecureQuery {
  constructor(
    public readonly sql: SQL,
    public readonly params: Record<string, unknown>,
    public readonly queryId: string
  ) {}

  static create(
    sql: SQL,
    params: Record<string, unknown>,
    queryId: string
  ): SecureQuery {
    return new SecureQuery(sql, params, queryId);
  }
}
