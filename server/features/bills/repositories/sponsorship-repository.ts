// Minimal sponsorship repository shim.
// This file provides the small function-based API expected by
// `sponsorship-analysis.service.ts`. Implementations here are
// intentionally minimal (returning empty arrays) so the service can
// compile and tests can mock or replace these functions with real DB
// logic later.

import { readDatabase } from '@server/infrastructure/database';
import {
  bill_sponsorships,
  billSectionConflicts,
  sponsorAffiliations,
  sponsors,
  sponsorTransparency} from '@server/infrastructure/schema';
import { desc,eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

export interface SponsorAffiliation {
  id: number;
  sponsor_id: number;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  type: string | null;
  conflictType?: string | null;
}

export interface SponsorTransparencyData {
  id?: number;
  sponsor_id?: number;
  disclosure?: string | null;
  dateReported?: string | null;
  amount?: number | string | null;
  is_verified?: boolean | null;
}

export interface SponsorshipData {
  sponsorship: {
    id: number;
    bill_id: number;
    sponsor_id: number;
    type: string | null;
    joinedDate: string | null;
  };
  sponsor: {
    id: number;
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

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

const dbSponsorshipRowSchema = z.object({
  sponsorshipId: z.number(),
  sponsorshipType: z.string().nullable().optional(),
  sponsorshipBillId: z.number(),
  sponsorshipSponsorId: z.number(),
  sponsorshipJoinedDate: z.string().nullable().optional(),
  sponsor_id: z.number(),
  sponsorName: z.string().nullable(),
  sponsorRole: z.string().nullable().optional(),
  sponsorParty: z.string().nullable().optional(),
  sponsorConstituency: z.string().nullable().optional(),
  sponsorConflictLevel: z.string().nullable().optional(),
  sponsorFinancialExposure: z.union([z.number(), z.string()]).nullable().optional(),
  sponsorVotingAlignment: z.union([z.number(), z.string()]).nullable().optional(),
});

const dbTransparencyRowSchema = z.object({
  id: z.number(),
  sponsor_id: z.number(),
  description: z.string().nullable().optional(),
  disclosure: z.string().nullable().optional(),
  dateReported: z.string().nullable().optional(),
  date_reported: z.string().nullable().optional(),
  amount: z.union([z.number(), z.string()]).nullable().optional(),
  is_verified: z.boolean().nullable().optional(),
  isVerified: z.boolean().nullable().optional(),
});

const dbAffiliationRowSchema = z.object({
  id: z.number(),
  sponsor_id: z.number(),
  sponsorId: z.number().optional(),
  organization: z.string(),
  role: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  conflict_type: z.string().nullable().optional(),
  conflictType: z.string().nullable().optional(),
});

const dbSectionConflictRowSchema = z.object({
  section_number: z.union([z.number(), z.string()]).optional(),
  sectionNumber: z.union([z.number(), z.string()]).optional(),
  conflict_severity: z.string().nullable().optional(),
  severity: z.string().nullable().optional(),
  impact_description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// ============================================================================
// HELPER FUNCTIONS FOR SAFE FIELD ACCESS
// ============================================================================

function getSponsorId(row: z.infer<typeof dbSponsorshipRowSchema>): number {
  return row.sponsorshipSponsorId;
}

function mapTransparencyData(t: z.infer<typeof dbTransparencyRowSchema>): SponsorTransparencyData {
  return {
    id: t.id,
    sponsor_id: t.sponsor_id,
    disclosure: t.description ?? t.disclosure ?? null,
    dateReported: t.dateReported ?? t.date_reported ?? null,
    amount: t.amount ?? null,
    is_verified: t.is_verified ?? t.isVerified ?? null,
  };
}

function mapAffiliationData(a: z.infer<typeof dbAffiliationRowSchema>): SponsorAffiliation {
  return {
    id: a.id,
    sponsor_id: a.sponsor_id ?? a.sponsorId ?? a.sponsor_id,
    organization: a.organization,
    role: a.role ?? null,
    start_date: a.start_date ?? a.startDate ?? null,
    end_date: a.end_date ?? a.endDate ?? null,
    type: a.type ?? null,
    conflictType: a.conflict_type ?? a.conflictType ?? null,
  };
}

function mapSectionConflict(r: z.infer<typeof dbSectionConflictRowSchema>): { sectionNumber: number | string | null; severity: string | null; description: string | null } {
  return {
    sectionNumber: r.section_number ?? r.sectionNumber ?? null,
    severity: r.conflict_severity ?? r.severity ?? null,
    description: r.impact_description ?? r.description ?? null,
  };
}

/**
 * Returns sponsorship rows for a bill using Drizzle-backed queries.
 * - Loads sponsorships joined with sponsor profiles
 * - Batch-loads sponsor transparency and affiliations to avoid N+1
 * - Maps DB (snake_case) -> camelCase DTOs at the repository boundary
 */
export async function getSponsorshipsByBill(bill_id: number, type?: 'primary' | 'co-sponsor'): Promise<SponsorshipData[]> {
  // Primary read path
  const rows = await readDatabase.select({
    sponsorshipId: bill_sponsorships.id,
    sponsorshipType: bill_sponsorships.type,
    sponsorshipBillId: bill_sponsorships.bill_id,
    sponsorshipSponsorId: bill_sponsorships.sponsor_id,
    sponsorshipJoinedDate: bill_sponsorships.created_at,

    sponsor_id: sponsors.id,
    sponsorName: sponsors.name,
    sponsorRole: sponsors.role,
    sponsorParty: sponsors.party,
    sponsorConstituency: sponsors.constituency,
    sponsorConflictLevel: sponsors.conflict_level,
    sponsorFinancialExposure: sponsors.financial_exposure,
    sponsorVotingAlignment: sponsors.voting_alignment
  })
    .from(sponsors)
    .innerJoin(bill_sponsorships, eq(sponsors.id, bill_sponsorships.sponsor_id))
    .where(eq(bill_sponsorships.bill_id, bill_id));

  if (!rows || rows.length === 0) return [];

  // Validate rows with Zod
  const validatedRows = rows.map(row => dbSponsorshipRowSchema.parse(row));

  // Collect sponsor ids for batch loading related data
  const sponsorIds = Array.from(new Set(validatedRows.map(r => getSponsorId(r))));

  // Batch load latest transparency per sponsor
  const transparencies = await readDatabase.select().from(sponsorTransparency)
    .where(inArray(sponsorTransparency.sponsor_id, sponsorIds))
    .orderBy(desc(sponsorTransparency.created_at));

  const transparencyBySponsor = new Map<number, z.infer<typeof dbTransparencyRowSchema>>();
  for (const t of transparencies) {
    const validated = dbTransparencyRowSchema.parse(t);
    const sid = validated.sponsor_id;
    if (!transparencyBySponsor.has(sid)) {
      transparencyBySponsor.set(sid, validated);
    }
  }

  // Batch load affiliations for all sponsors
  const affiliations = await readDatabase.select().from(sponsorAffiliations)
    .where(inArray(sponsorAffiliations.sponsor_id, sponsorIds))
    .orderBy(desc(sponsorAffiliations.start_date));

  const affiliationsBySponsor = new Map<number, z.infer<typeof dbAffiliationRowSchema>[]>();
  for (const a of affiliations) {
    const validated = dbAffiliationRowSchema.parse(a);
    const sid = validated.sponsor_id ?? validated.sponsorId ?? validated.sponsor_id;
    const list = affiliationsBySponsor.get(sid) ?? [];
    list.push(validated);
    affiliationsBySponsor.set(sid, list);
  }

  // Map rows into SponsorshipData
  const result: SponsorshipData[] = validatedRows.map((r) => {
    const sponsorId = getSponsorId(r);
    const sponsorObj = {
      id: r.sponsor_id,
      name: r.sponsorName,
      role: r.sponsorRole,
      party: r.sponsorParty,
      constituency: r.sponsorConstituency,
      conflictLevel: r.sponsorConflictLevel,
      financialExposure: r.sponsorFinancialExposure,
      votingAlignment: r.sponsorVotingAlignment
    };

    const transparencyData = transparencyBySponsor.get(sponsorId);
    const transparency = transparencyData ? mapTransparencyData(transparencyData) : null;

    const affs = affiliationsBySponsor.get(sponsorId) ?? [];
    const mappedAffs: SponsorAffiliation[] = affs.map(mapAffiliationData);

    return {
      sponsorship: {
        id: r.sponsorshipId,
        bill_id: r.sponsorshipBillId,
        sponsor_id: sponsorId,
        type: r.sponsorshipType ?? null,
        joinedDate: r.sponsorshipJoinedDate ?? null
      },
      sponsor: sponsorObj,
      transparency,
      affiliations: mappedAffs
    };
  });

  return result;
}

/**
 * Returns affiliations for a sponsor (active only), mapped to camelCase.
 */
export async function getSponsorAffiliations(sponsor_id: number): Promise<SponsorAffiliation[]> {
  const rows = await readDatabase.select().from(sponsorAffiliations)
    .where(eq(sponsorAffiliations.sponsor_id, sponsor_id))
    .orderBy(desc(sponsorAffiliations.start_date));

  return rows.map((a) => {
    const validated = dbAffiliationRowSchema.parse(a);
    return mapAffiliationData(validated);
  });
}

/**
 * Returns section conflicts for a bill in a minimal shape.
 */
export async function getSectionConflictsForBill(bill_id: number): Promise<Array<{ sectionNumber: number | string | null; severity: string | null; description: string | null }>> {
  const rows = await readDatabase.select().from(billSectionConflicts)
    .where(eq(billSectionConflicts.bill_id, bill_id))
    .orderBy(billSectionConflicts.section_number);

  return rows.map((r) => {
    const validated = dbSectionConflictRowSchema.parse(r);
    return mapSectionConflict(validated);
  });
}



