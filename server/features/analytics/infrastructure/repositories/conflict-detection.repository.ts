import { eq, like, and, sql } from 'drizzle-orm';
import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import { Result } from '@shared/core/result';
import {
  type Sponsor,
  sponsorAffiliations,
  sponsorTransparency,
  sponsors,
  bills
} from '@server/infrastructure/schema';

// We need to define these types because they aren't explicitly exported in the indexed schemas
export type SponsorAffiliation = typeof sponsorAffiliations.$inferSelect;
export type SponsorTransparency = typeof sponsorTransparency.$inferSelect;

export class ConflictDetectionRepository extends BaseRepository<typeof sponsors.$inferSelect> {
  constructor() {
    super({
      entityName: 'ConflictDetection',
      enableCache: true,
      cacheTTL: 1800 // 30 mins
    });
  }

  async findAffectedBillsForOrganization(organization: string, bill_id?: number): Promise<Result<number[], Error>> {
    return this.executeRead(
      async (db) => {
        const result = await db
          .select({ id: bills.id })
          .from(bills)
          .where(
            and(
              like(bills.summary, `%${organization}%`),
              bill_id ? eq(bills.id, String(bill_id)) : sql`1=1`
            )
          )
          .limit(10);
        return result.map((b: { id: string }) => Number(b.id));
      },
      `affected_bills:${organization}:${bill_id || 'all'}`
    );
  }

  async getSponsor(sponsor_id: number): Promise<Result<Sponsor | null, Error>> {
    return this.executeRead(
      async (db) => {
        const [sponsor] = await db
          .select()
          .from(sponsors)
          .where(eq(sponsors.id, String(sponsor_id)));
        return sponsor || null;
      },
      `sponsor:${sponsor_id}`
    );
  }

  async getSponsorAffiliations(sponsor_id: number): Promise<Result<SponsorAffiliation[], Error>> {
    return this.executeRead(
      async (db) => {
        return db
          .select()
          .from(sponsorAffiliations)
          .where(eq(sponsorAffiliations.sponsor_id, String(sponsor_id)));
      },
      `sponsor_affiliations:${sponsor_id}`
    );
  }

  async getSponsorDisclosures(sponsor_id: number): Promise<Result<SponsorTransparency[], Error>> {
    return this.executeRead(
      async (db) => {
        return db
          .select()
          .from(sponsorTransparency)
          .where(eq(sponsorTransparency.sponsor_id, String(sponsor_id)));
      },
      `sponsor_disclosures:${sponsor_id}`
    );
  }

  async getBill(bill_id: number): Promise<Result<typeof bills.$inferSelect | null, Error>> {
    return this.executeRead(
      async (db) => {
        const [bill] = await db
          .select()
          .from(bills)
          .where(eq(bills.id, String(bill_id)));
        return bill || null;
      },
      `bill:${bill_id}`
    );
  }
}

export const conflictDetectionRepository = new ConflictDetectionRepository();
