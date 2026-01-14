/**
 * Bill Entity Mapping for DrizzleAdapter
 * 
 * Provides bidirectional mapping between Bill entities and database rows.
 * Handles complex bill data and validation.
 */

import { EntityMapping } from '@shared/drizzle-adapter';
import { bills } from '@server/infrastructure/schema';

type BillRow = typeof bills.$inferSelect;
type BillInsert = typeof bills.$inferInsert;

// Using the Bill type from schema since it's already well-defined
export type BillEntity = BillRow;

export class BillEntityMapping implements EntityMapping<BillEntity, BillRow> {
  /**
   * Convert database row to Bill domain entity
   * For bills, the database row is already the entity format
   */
  toEntity(row: BillRow): BillEntity {
    // Handle null/undefined values directly
    return {
      id: row.id ?? 0,
      bill_number: row.bill_number ?? 'UNKNOWN',
      title: row.title ?? 'Unknown Bill',
      summary: row.summary ?? '',
      description: row.description ?? '',
      status: row.status ?? 'introduced',
      category: row.category ?? 'general',
      sponsor_id: row.sponsor_id ?? 0,
      introduced_date: row.introduced_date ?? new Date(),
      last_action_date: row.last_action_date,
      committee_id: row.committee_id,
      view_count: row.view_count ?? 0,
      share_count: row.share_count ?? 0,
      created_at: row.created_at ?? new Date(),
      updated_at: row.updated_at ?? new Date()
    };
  }

  /**
   * Convert Bill entity to database row format
   */
  fromEntity(entity: BillEntity): Partial<BillInsert> {
    return {
      id: entity.id,
      bill_number: entity.bill_number?.trim(),
      title: entity.title?.trim(),
      summary: entity.summary?.trim(),
      description: entity.description?.trim(),
      status: entity.status,
      category: entity.category,
      sponsor_id: entity.sponsor_id,
      introduced_date: entity.introduced_date,
      last_action_date: entity.last_action_date,
      committee_id: entity.committee_id,
      view_count: entity.view_count || 0,
      share_count: entity.share_count || 0,
      created_at: entity.created_at,
      updated_at: entity.updated_at
    };
  }
}

export const billEntityMapping = new BillEntityMapping();
