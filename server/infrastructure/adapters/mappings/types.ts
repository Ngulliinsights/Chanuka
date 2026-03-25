/**
 * Entity Mapping Types
 * 
 * Core interface for bidirectional mapping between domain entities and database rows.
 */

/**
 * Bidirectional entity mapping interface
 * Converts between domain entities and database row formats
 */
export interface EntityMapping<TEntity, TRow> {
  /**
   * Convert database row to domain entity
   */
  toEntity(row: TRow): TEntity;

  /**
   * Convert domain entity to database row format
   */
  fromEntity(entity: TEntity): Partial<TRow>;
}
