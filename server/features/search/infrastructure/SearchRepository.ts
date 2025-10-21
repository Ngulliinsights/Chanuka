import { databaseService } from '@/services/database-service';
import { readDatabase } from '@shared/database/connection';
import { bill, billTag, sponsor, billSponsorship } from '@shared/schema';

// Alias for backward compatibility
const bills = bill;
const billTags = billTag;
const sponsors = sponsor;
const billSponsorships = billSponsorship;
import {
  sql,
  and,
  or,
  inArray,
  gte,
  lte,
  ilike,
  desc,
  asc,
  count,
  SQL,
} from 'drizzle-orm';
import type { PlainBill } from '../domain/search.dto';

/*  Repository is the ONLY file that imports Drizzle.  */
export class SearchRepository {
  /*  Full-text search with snippet + highlight support  */
  async search(
    vector: SQL | undefined,
    conditions: SQL[],
    orderBy: SQL,
    limit: number,
    offset: number,
    opts?: { includeSnippets?: boolean; includeHighlights?: boolean; searchTerms?: string[] }
  ): Promise<Array<{ bill: PlainBill; rank: number; snippet: string | null }>> {
    const rankExpr = vector ? sql<number>`ts_rank_cd(${bills.searchVector}, ${vector}, 32)` : sql<number>`0`;
    const snippetExpr = opts?.includeSnippets
      ? sql<string>`ts_headline('english',
          coalesce(${bills.content}, ${bills.description}, ${bills.summary}, ''),
          ${vector!},
          'MaxWords=50, MinWords=10, ShortWord=3, HighlightAll=false, MaxFragments=3, FragmentDelimiter=" ... "')`
      : sql<null>`null`;

  const db = readDatabase;
    const rows = await db
      .select({
        bill: bills,
        rank: rankExpr,
        snippet: snippetExpr,
      })
      .from(bills)
      .leftJoin(billTags, sql`${bills.id} = ${billTags.billId}`)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);
    return rows.map(r => ({
      bill: this.toPlain(r.bill),
      rank: Number(r.rank),
      snippet: r.snippet ?? null,
    }));
  }

  async count(conditions: SQL[]): Promise<number> {
  const db = readDatabase;
    const [row] = await db
      .select({ cnt: count() })
      .from(bills)
      .where(conditions.length ? and(...conditions) : undefined);
    return Number(row.cnt);
  }

  /*  Facets identical to original (sponsors, complexity, date ranges)  */
  async facets(conditions: SQL[]): Promise<SearchResponseDto['facets']> {
  const db = readDatabase;
    const [statusRows, categoryRows, sponsorRows, complexityRows] = await Promise.all([
      db
        .select({ value: bills.status, count: count() })
        .from(bills)
        .where(conditions.length ? and(...conditions) : undefined)
        .groupBy(bills.status),
      db
        .select({ value: bills.category, count: count() })
        .from(bills)
        .where(conditions.length ? and(...conditions) : undefined && sql`${bills.category} is not null`)
        .groupBy(bills.category),
      db
        .select({
          value: sponsors.id,
          count: count(),
          label: sponsors.name,
        })
        .from(bills)
        .leftJoin(billSponsorships, sql`${bills.id} = ${billSponsorships.billId}`)
        .leftJoin(sponsors, sql`${billSponsorships.sponsorId} = ${sponsors.id}`)
        .where(conditions.length ? and(...conditions) : undefined)
        .groupBy(sponsors.id, sponsors.name),
      db
        .select({
          range: sql<string>`case
            when ${bills.complexityScore} between 0 and 20 then '0-20'
            when ${bills.complexityScore} between 21 and 40 then '21-40'
            when ${bills.complexityScore} between 41 and 60 then '41-60'
            when ${bills.complexityScore} between 61 and 80 then '61-80'
            else '81-100'
          end`,
          count: count(),
          min: sql<number>`min(${bills.complexityScore})`,
          max: sql<number>`max(${bills.complexityScore})`,
        })
        .from(bills)
        .where(conditions.length ? and(...conditions, sql`${bills.complexityScore} is not null`) : sql`${bills.complexityScore} is not null`)
        .groupBy(sql`range`),
    ]);
    return {
      status: statusRows.map(r => ({ value: r.value!, count: Number(r.count) })),
      category: categoryRows.map(r => ({ value: r.value!, count: Number(r.count) })),
      sponsors: sponsorRows.map(r => ({ value: Number(r.value), count: Number(r.count), label: r.label! })),
      complexity: complexityRows.map(r => ({ range: r.range!, count: Number(r.count), min: Number(r.min), max: Number(r.max) })),
      dateRanges: [], // original did not implement – kept empty
    };
  }

  /*  Popular-terms sub-query (used by suggestions)  */
  async popularTermCounts(limit: number): Promise<Array<{ term: string; freq: number }>> {
  const db = readDatabase;
    const rows = await db.execute<{
      term: string;
      freq: number;
    }>(sql`
      select title as term, view_count as freq
      from bills
      where view_count > 50
      order by view_count desc
      limit ${limit}
    `);
    return rows.map(r => ({ term: r.term!, freq: Number(r.freq) }));
  }

  /*  Helpers  */
  private toPlain(row: any): PlainBill {
    // strip Drizzle proxies
    return { ...row };
  }
}




































