import { database, withTransaction, DatabaseTransaction } from '@shared/database/connection';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { IRepository, BaseEntity } from './base-repository';

/**
 * Generic repository implementation that can work with any Drizzle table
 */
export class GenericRepository<T extends BaseEntity> implements IRepository<T> {
  constructor(
    private table: any,
    private mapToEntity: (row: any) => T,
    private mapToRow: (entity: Partial<T>) => any
  ) {}

  async findById(id: string): Promise<T | null> {
    const result = await database
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1);

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<T[]> {
    let query = database.select().from(this.table);

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    const results = await query;
    return results.map(row => this.mapToEntity(row));
  }

  async create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const now = new Date();
    const rowData = {
      ...this.mapToRow(entity as any),
      created_at: now,
      updated_at: now,
    };

    const result = await database
      .insert(this.table)
      .values(rowData)
      .returning();

    return this.mapToEntity(result[0]);
  }

  async update(id: string, entity: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null> {
    const rowData = {
      ...this.mapToRow(entity as any),
      updated_at: new Date(),
    };

    const result = await database
      .update(this.table)
      .set(rowData)
      .where(eq(this.table.id, id))
      .returning();

    return result[0] ? this.mapToEntity(result[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await database
      .delete(this.table)
      .where(eq(this.table.id, id));

    return result.rowCount > 0;
  }

  async count(): Promise<number> {
    const result = await database
      .select({ count: sql<number>`count(*)` })
      .from(this.table);

    return Number(result[0]?.count ?? 0);
  }

  async exists(id: string): Promise<boolean> {
    const result = await database
      .select({ exists: sql<boolean>`EXISTS(SELECT 1 FROM ${this.table} WHERE id = ${id})` })
      .from(this.table)
      .limit(1);

    return Boolean(result[0]?.exists);
  }

  async findByIds(ids: string[]): Promise<T[]> {
    const results = await database
      .select()
      .from(this.table)
      .where(inArray(this.table.id, ids));

    return results.map(row => this.mapToEntity(row));
  }

  async findWhere(conditions: Partial<T>): Promise<T[]> {
    let whereClause = undefined;

    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined) {
        const condition = eq(this.table[key], value);
        whereClause = whereClause ? and(whereClause, condition) : condition;
      }
    }

    const query = whereClause
      ? database.select().from(this.table).where(whereClause)
      : database.select().from(this.table);

    const results = await query;
    return results.map(row => this.mapToEntity(row));
  }

  async withTransaction<R>(callback: (tx: DatabaseTransaction) => Promise<R>): Promise<R> {
    return withTransaction(callback);
  }
}