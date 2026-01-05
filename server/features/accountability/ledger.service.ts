import { injectable } from 'inversify';
import { db } from '@shared/database';
import { shadow_ledger_entries } from '@shared/schema/accountability_ledger';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@injectable()
export class LedgerService {

  /**
   * Record a Corruption Event (The "Receipt")
   */
  async recordAction(
    action: string, // Mapped to violation_type
    actor: string, // Mapped to entity_name or sponsor_id
    resource: string, // Description/Context
    details: Record<string, any>, // JSON evidence
    status: 'success' | 'failure' = 'success'
  ): Promise<string> {

    // Auto-generate a readable case number (e.g., SL-2025-X92)
    const entryNumber = `SL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
    const estimatedLoss = details.estimatedLoss ? String(details.estimatedLoss) : '0';

    const result = await db.insert(shadow_ledger_entries).values({
      entry_number: entryNumber,
      entity_name: actor,
      violation_type: (action as any) || 'bribery', // Map carefully in prod
      description: resource,
      estimated_loss_amount: estimatedLoss,
      evidence_links: details.evidence || [],
      is_ongoing: true,
      created_at: new Date()
    }).returning({ id: shadow_ledger_entries.id });

    return result[0].id;
  }

  /**
   * Retrieve Entries with Filters (The "Search")
   */
  async getEntries(filters: {
    actor?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const conditions = [];

    if (filters.actor) conditions.push(eq(shadow_ledger_entries.entity_name, filters.actor));
    if (filters.action) conditions.push(eq(shadow_ledger_entries.violation_type, filters.action as any));
    if (filters.startDate) conditions.push(gte(shadow_ledger_entries.created_at, filters.startDate));
    if (filters.endDate) conditions.push(lte(shadow_ledger_entries.created_at, filters.endDate));

    return await db.query.shadow_ledger_entries.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(shadow_ledger_entries.created_at)],
      limit: filters.limit || 100
    });
  }

  /**
   * Ledger Stats for Dashboard
   */
  async getSummary() {
    const [stats] = await db
      .select({
        totalEntries: sql<number>`count(*)`,
        totalLoss: sql<number>`sum(${shadow_ledger_entries.estimated_loss_amount})`
      })
      .from(shadow_ledger_entries);

    return {
      totalEntries: Number(stats.totalEntries),
      totalLoss: Number(stats.totalLoss || 0),
      timestamp: new Date()
    };
  }
}