import { db } from '@server/infrastructure/database';
import { shadow_ledger_entries } from '@server/infrastructure/schema/accountability_ledger';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { injectable } from 'inversify';

export interface LedgerFilters {
  actor?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

@injectable()
export class LedgerService {

  /**
   * Record a Corruption Event (The "Receipt")
   */
  async recordAction(
    action: string, // Mapped to violation_type
    actor: string, // Mapped to entity_name
    resource: string, // Description
    details: Record<string, unknown> // JSON evidence
  ): Promise<string> {

    // Auto-generate a readable case number (e.g., SL-2025-X92)
    const entryNumber = `SL-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

    // Robust casting for loss amount from the details payload
    const estimatedLoss = typeof details.estimatedLoss === 'number' || typeof details.estimatedLoss === 'string'
      ? String(details.estimatedLoss)
      : '0';

    // Ensure evidence is an array for the JSONB column
    const evidenceLinks = Array.isArray(details.evidence) ? details.evidence : [];

    const result = await writeDatabase.insert(shadow_ledger_entries).values({
      entry_number: entryNumber,
      entity_name: actor,
      violation_type: (action as any) || 'bribery', // Cast to enum type needed if not validating strict enums upstream
      description: resource,
      estimated_loss_amount: estimatedLoss,
      evidence_links: evidenceLinks,
      is_ongoing: true,
      created_at: new Date()
    }).returning({ id: shadow_ledger_entries.id });

    return result[0].id;
  }

  /**
   * Retrieve Entries with Filters (The "Search")
   */
  async getEntries(filters: LedgerFilters) {
    const conditions = [];

    if (filters.actor) {
      conditions.push(eq(shadow_ledger_entries.entity_name, filters.actor));
    }

    if (filters.action) {
      // Cast action to match the enum type expected by Drizzle
      conditions.push(eq(shadow_ledger_entries.violation_type, filters.action as any));
    }

    if (filters.startDate) {
      conditions.push(gte(shadow_ledger_entries.created_at, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(shadow_ledger_entries.created_at, filters.endDate));
    }

    return db.query.shadow_ledger_entries.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(shadow_ledger_entries.created_at)],
      limit: filters.limit || 100
    });
  }

  /**
   * Ledger Stats for Dashboard
   *
   */
  async getSummary() {
    const [stats] = await db
      .select({
        totalEntries: sql<number>`count(*)`,
        totalLoss: sql<number>`sum(${shadow_ledger_entries.estimated_loss_amount})`
      })
      .from(shadow_ledger_entries);

    // Handle potential undefined stats if table is strictly empty
    return {
      totalEntries: Number(stats?.totalEntries ?? 0),
      totalLoss: Number(stats?.totalLoss ?? 0),
      timestamp: new Date()
    };
  }
}