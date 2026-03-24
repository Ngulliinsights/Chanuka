import { readDatabase } from '@server/infrastructure/database';
import { bills, sponsors } from '@server/infrastructure/schema/foundation';
import { financial_interests, corporate_entities } from '@server/infrastructure/schema/transparency_analysis';
import { hidden_provisions } from '@server/infrastructure/schema/trojan_bill_detection';
import { eq, inArray, desc } from 'drizzle-orm';
import { z } from 'zod';

export interface SponsorAffiliation {
  id: number | string;
  sponsor_id: number | string;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  type: string | null;
  conflictType?: string | null;
}

export interface SponsorTransparencyData {
  id?: number | string;
  sponsor_id?: number | string;
  disclosure?: string | null;
  dateReported?: string | null;
  amount?: number | string | null;
  is_verified?: boolean | null;
}

export interface SponsorshipData {
  sponsorship: {
    id: number | string;
    bill_id: number | string;
    sponsor_id: number | string;
    type: string | null;
    joinedDate: string | null;
  };
  sponsor: {
    id: number | string;
    name: string | null;
    role?: string | null;
    party?: string | null;
    constituency?: string | null;
    conflictLevel?: string | null;
    financialExposure?: number | string | null;
    votingAlignment?: number | string | null;
  };
  transparency: SponsorTransparencyData | null;
  affiliations: SponsorAffiliation[];
}

/**
 * Returns sponsorship rows for a bill using Drizzle-backed queries mapping to the v2 Schema.
 * Uses `bills.sponsor_id` for primary sponsor and `bills.co_sponsors` array for co-sponsors.
 */
export async function getSponsorshipsByBill(bill_id: number | string, type?: 'primary' | 'co-sponsor'): Promise<SponsorshipData[]> {
  const billStr = String(bill_id);

  // 1. Get the bill to find sponsor_id and co_sponsors array
  const [billRow] = await readDatabase.select({
    sponsor_id: bills.sponsor_id,
    co_sponsors: bills.co_sponsors,
  }).from(bills).where(eq(bills.id, billStr));

  if (!billRow) return [];

  // 2. Gather target sponsor UUIDs
  const targetSponsorIds: string[] = [];
  
  if ((!type || type === 'primary') && billRow.sponsor_id) {
    targetSponsorIds.push(billRow.sponsor_id);
  }
  
  if ((!type || type === 'co-sponsor') && Array.isArray(billRow.co_sponsors) && billRow.co_sponsors.length > 0) {
    targetSponsorIds.push(...(billRow.co_sponsors.filter(id => typeof id === 'string' && id.trim() !== '')));
  }
  
  if (targetSponsorIds.length === 0) return [];

  const uniqueSponsorIds = [...new Set(targetSponsorIds)];

  // 3. Fetch the sponsors
  const sponsorRows = await readDatabase.select().from(sponsors)
    .where(inArray(sponsors.id, uniqueSponsorIds));

  // 4. Fetch related financial interests for affiliations & transparency
  const interests = await readDatabase.select({
    interest: financial_interests,
    entityName: corporate_entities.name
  })
  .from(financial_interests)
  .leftJoin(corporate_entities, eq(financial_interests.entity_id, corporate_entities.id))
  .where(inArray(financial_interests.sponsor_id, uniqueSponsorIds));

  // Organize interests by sponsor
  const affiliationsBySponsor = new Map<string, SponsorAffiliation[]>();
  const transparencyBySponsor = new Map<string, SponsorTransparencyData>();

  for (const row of interests) {
    const sid = row.interest.sponsor_id;
    if (!sid) continue;
    
    // Add Affiliation
    const affs = affiliationsBySponsor.get(sid) ?? [];
    affs.push({
      id: row.interest.id,
      sponsor_id: sid,
      organization: row.entityName || 'Unknown Entity',
      role: row.interest.position_title || row.interest.interest_type,
      start_date: row.interest.start_date,
      end_date: row.interest.end_date,
      type: row.interest.interest_type,
      conflictType: row.interest.potential_conflict ? 'potential_conflict' : null,
    });
    affiliationsBySponsor.set(sid, affs);

    // Update Transparency (taking latest disclosure)
    const existingTrans = transparencyBySponsor.get(sid);
    const dateStr = row.interest.disclosure_date;
    const isMoreRecent = !existingTrans?.dateReported || (dateStr && new Date(dateStr) > new Date(existingTrans.dateReported));
    
    if (isMoreRecent) {
      transparencyBySponsor.set(sid, {
        id: sid,
        sponsor_id: sid,
        disclosure: `Declared interest in ${row.entityName || 'various entities'}`,
        dateReported: dateStr,
        amount: row.interest.estimated_value ? Number(row.interest.estimated_value) : null,
        is_verified: row.interest.is_publicly_disclosed,
      });
    }
  }

  // 5. Map to final structure
  return sponsorRows.map(sponsor => {
    const sid = sponsor.id;
    const isPrimary = sid === billRow.sponsor_id;
    
    return {
      sponsorship: {
        id: `${billStr}_${sid}`, // synthetically generated primary key
        bill_id: billStr,
        sponsor_id: sid,
        type: isPrimary ? 'primary' : 'co-sponsor',
        joinedDate: null // We don't track joined date in the simplified array yet
      },
      sponsor: {
        id: sid,
        name: sponsor.name,
        role: sponsor.party_position || null,
        party: sponsor.party,
        constituency: sponsor.constituency,
        conflictLevel: null,
        financialExposure: null,
        votingAlignment: null,
      },
      transparency: transparencyBySponsor.get(sid) || null,
      affiliations: affiliationsBySponsor.get(sid) || []
    };
  });
}

/**
 * Returns affiliations for a sponsor from financial_interests.
 */
export async function getSponsorAffiliations(sponsor_id: number | string): Promise<SponsorAffiliation[]> {
  const sponsorStr = String(sponsor_id);
  
  const rows = await readDatabase.select({
    interest: financial_interests,
    entityName: corporate_entities.name
  })
  .from(financial_interests)
  .leftJoin(corporate_entities, eq(financial_interests.entity_id, corporate_entities.id))
  .where(eq(financial_interests.sponsor_id, sponsorStr))
  .orderBy(desc(financial_interests.start_date));

  return rows.map((r) => ({
    id: r.interest.id,
    sponsor_id: r.interest.sponsor_id as string,
    organization: r.entityName || 'Unknown Entity',
    role: r.interest.position_title || r.interest.interest_type,
    start_date: r.interest.start_date,
    end_date: r.interest.end_date,
    type: r.interest.interest_type,
    conflictType: r.interest.potential_conflict ? 'potential_conflict' : null,
  }));
}

/**
 * Returns section conflicts for a bill using hidden_provisions table mapping.
 */
export async function getSectionConflictsForBill(bill_id: number | string): Promise<Array<{ sectionNumber: number | string | null; severity: string | null; description: string | null }>> {
  const billStr = String(bill_id);
  
  const rows = await readDatabase.select().from(hidden_provisions)
    .where(eq(hidden_provisions.bill_id, billStr));

  return rows.map((r) => ({
    sectionNumber: r.provision_location,
    severity: r.severity,
    description: r.hidden_agenda || r.provision_text,
  }));
}

export async function getSponsorTransparency(sponsor_id: number | string): Promise<SponsorTransparencyData | null> {
  const sponsorStr = String(sponsor_id);
  
  const interests = await readDatabase.select({
    disclosure_date: financial_interests.disclosure_date,
    is_publicly_disclosed: financial_interests.is_publicly_disclosed,
    estimated_value: financial_interests.estimated_value
  })
  .from(financial_interests)
  .where(eq(financial_interests.sponsor_id, sponsorStr))
  .orderBy(desc(financial_interests.disclosure_date));

  if (interests.length === 0) return null;

  return {
    id: sponsorStr,
    sponsor_id: sponsorStr,
    disclosure: `${interests.length} financial interests declared`,
    dateReported: interests[0].disclosure_date,
    amount: interests[0].estimated_value ? Number(interests[0].estimated_value) : null,
    is_verified: interests[0].is_publicly_disclosed,
  };
}
