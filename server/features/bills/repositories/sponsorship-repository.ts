// Minimal sponsorship repository shim.
// This file provides the small function-based API expected by
// `sponsorship-analysis.service.ts`. Implementations here are
// intentionally minimal (returning empty arrays) so the service can
// compile and tests can mock or replace these functions with real DB
// logic later.

import { readDatabase } from '@shared/database';
import {
  bill_sponsorships,
  billSectionConflicts,
  sponsorAffiliations,
  sponsors,
  sponsorTransparency} from '@shared/schema';
import { desc,eq, inArray } from 'drizzle-orm';

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

/**
 * Returns sponsorship rows for a bill using Drizzle-backed queries.
 * - Loads sponsorships joined with sponsor profiles
 * - Batch-loads sponsor transparency and affiliations to avoid N+1
 * - Maps DB (snake_case) -> camelCase DTOs at the repository boundary
 */
export async function getSponsorshipsByBill(bill_id: number, type?: 'primary' | 'co-sponsor'):
  Promise<SponsorshipData[]> {
  // Primary read path
  const rows = await readDatabase.select({
    sponsorshipId: bill_sponsorships.id,
    sponsorshipType: (bill_sponsorships as any).sponsorshipType ?? (bill_sponsorships as any).type,
    sponsorshipBillId: bill_sponsorships.bill_id ?? (bill_sponsorships as any).bill_id,
    sponsorshipSponsorId: bill_sponsorships.sponsor_id ?? (bill_sponsorships as any).sponsor_id,
    sponsorshipJoinedDate: (bill_sponsorships as any).joined_date ?? (bill_sponsorships as any).created_at,

    sponsor_id: sponsors.id,
    sponsorName: sponsors.name,
    sponsorRole: sponsors.role,
    sponsorParty: sponsors.party,
    sponsorConstituency: sponsors.constituency,
    sponsorConflictLevel: (sponsors as any).conflict_level ?? (sponsors as any).conflictLevel,
    sponsorFinancialExposure: (sponsors as any).financial_exposure ?? (sponsors as any).financialExposure,
    sponsorVotingAlignment: (sponsors as any).voting_alignment ?? (sponsors as any).votingAlignment
  })
    .from(sponsors)
    .innerJoin(bill_sponsorships, eq(sponsors.id, (bill_sponsorships as any).sponsor_id ?? (bill_sponsorships as any).sponsor_id))
    .where(eq((bill_sponsorships as any).bill_id ?? (bill_sponsorships as any).bill_id, billId));

  if (!rows || rows.length === 0) return [];

  // Collect sponsor ids for batch loading related data
  const sponsorIds = Array.from(new Set(rows.map(r => (r as any).sponsorshipSponsorId || (r as any).sponsor_id || (r as any).sponsor_id)));

  // Batch load latest transparency per sponsor
  const transparencies = await readDatabase.select().from(sponsorTransparency)
    .where(inArray((sponsorTransparency as any).sponsor_id ?? (sponsorTransparency as any).sponsor_id, sponsorIds))
    .orderBy(desc((sponsorTransparency as any).dateReported ?? (sponsorTransparency as any).created_at));

  const transparencyBySponsor = new Map<string | number, any>();
  for (const t of transparencies) {
    const sid = (t as any).sponsor_id ?? (t as any).sponsor_id;
    if (!transparencyBySponsor.has(sid)) transparencyBySponsor.set(sid, t);
  }

  // Batch load affiliations for all sponsors
  const affiliations = await readDatabase.select().from(sponsorAffiliations)
    .where(inArray((sponsorAffiliations as any).sponsor_id ?? (sponsorAffiliations as any).sponsor_id, sponsorIds))
    .orderBy(desc((sponsorAffiliations as any).start_date ?? (sponsorAffiliations as any).created_at));

  const affiliationsBySponsor = new Map<string | number, any[]>();
  for (const a of affiliations) {
    const sid = (a as any).sponsor_id ?? (a as any).sponsor_id;
    const list = affiliationsBySponsor.get(sid) ?? [];
    list.push(a);
    affiliationsBySponsor.set(sid, list);
  }

  // Map rows into SponsorshipData
  const result: SponsorshipData[] = rows.map((r: any) => {
    const sponsor_id = r.sponsorshipSponsorId ?? r.sponsorId ?? r.sponsor_id;
    const sponsorObj = {
      id: Number(r.sponsorId ?? r.sponsor_id ?? sponsorId),
      name: r.sponsorName ?? r.name,
      role: r.sponsorRole ?? r.role,
      party: r.sponsorParty ?? r.party,
      constituency: r.sponsorConstituency ?? r.constituency,
      conflictLevel: r.sponsorConflictLevel,
      financialExposure: r.sponsorFinancialExposure,
      votingAlignment: r.sponsorVotingAlignment
    };

    const transparency = transparencyBySponsor.get(sponsorId) ?? null;

    const affs = affiliationsBySponsor.get(sponsorId) ?? [];
    const mappedAffs: SponsorAffiliation[] = affs.map((a: any) => ({
      id: Number(a.id),
      sponsor_id: Number(a.sponsor_id ?? a.sponsorId),
      organization: a.organization,
      role: a.role ?? null,
      start_date: a.start_date ?? a.startDate ?? null,
      end_date: a.end_date ?? a.endDate ?? null,
      type: a.type ?? null,
      conflictType: a.conflict_type ?? a.conflictType ?? null
    }));

    return {
      sponsorship: {
        id: Number(r.sponsorshipId ?? r.id),
        bill_id: Number(r.sponsorshipBillId ?? r.bill_id),
        sponsor_id: Number(sponsorId),
        type: r.sponsorshipType ?? r.type ?? null,
        joinedDate: r.sponsorshipJoinedDate ?? null
      },
      sponsor: sponsorObj,
      transparency: transparency ? {
        id: Number(transparency.id),
        sponsor_id: Number(transparency.sponsor_id ?? transparency.sponsorId),
        disclosure: transparency.description ?? transparency.disclosure ?? null,
        dateReported: transparency.dateReported ?? transparency.date_reported ?? null,
        amount: transparency.amount ?? null,
        is_verified: transparency.is_verified ?? transparency.isVerified ?? null
      } : null,
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
    .where(eq((sponsorAffiliations as any).sponsor_id ?? (sponsorAffiliations as any).sponsor_id, sponsorId))
    .orderBy(desc((sponsorAffiliations as any).start_date ?? (sponsorAffiliations as any).created_at));

  return rows.map((a: any) => ({
    id: a.id,
    sponsor_id: a.sponsor_id ?? a.sponsorId,
    organization: a.organization,
    role: a.role ?? null,
    start_date: a.start_date ?? a.startDate ?? null,
    end_date: a.end_date ?? a.endDate ?? null,
    type: a.type ?? null,
    conflictType: a.conflict_type ?? a.conflictType ?? null
  }));
}

/**
 * Returns section conflicts for a bill in a minimal shape.
 */
export async function getSectionConflictsForBill(bill_id: number): Promise<any[]> {
  const rows = await readDatabase.select().from(billSectionConflicts)
    .where(eq((billSectionConflicts as any).bill_id ?? (billSectionConflicts as any).bill_id, billId))
    .orderBy((billSectionConflicts as any).section_number ?? (billSectionConflicts as any).sectionNumber);

  return rows.map((r: any) => ({
    sectionNumber: r.section_number ?? r.sectionNumber,
    severity: r.conflict_severity ?? r.severity ?? null,
    description: r.impact_description ?? r.description ?? null
  }));
}

