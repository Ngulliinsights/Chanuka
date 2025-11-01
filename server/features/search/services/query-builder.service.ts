import { eq, desc, and, sql, count, ilike, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import { SearchContext, QueryOptions } from "../types/search.types";

/**
 * Service responsible for building optimized database queries for search operations
 */
export class QueryBuilderService {
  /**
   * Build bill title search query with context filters
   */
  buildBillTitleQuery(query: string, context: SearchContext, options: QueryOptions = {}) {
    const conditions = [
      or(
        ilike(schema.bills.title, `${query}%`), // Prefix match (faster)
        ilike(schema.bills.title, `%${query}%`) // Contains match
      )
    ];

    if (context.category) {
      conditions.push(eq(schema.bills.category, context.category));
    }

    if (context.status) {
      conditions.push(eq(schema.bills.status, context.status));
    }

    return {
      select: {
        title: schema.bills.title,
        id: schema.bills.id,
        category: schema.bills.category,
        viewCount: schema.bills.viewCount
      },
      from: schema.bills,
      where: and(...conditions),
      orderBy: desc(schema.bills.viewCount),
      limit: options.limit || 10
    };
  }

  /**
   * Build category aggregation query
   */
  buildCategoryQuery(query: string, options: QueryOptions = {}) {
    return {
      select: {
        category: schema.bills.category,
        count: count()
      },
      from: schema.bills,
      where: and(
        sql`${schema.bills.category} IS NOT NULL`,
        or(
          ilike(schema.bills.category, `${query}%`),
          ilike(schema.bills.category, `%${query}%`)
        )
      ),
      groupBy: schema.bills.category,
      orderBy: desc(count()),
      limit: options.limit || 10
    };
  }

  /**
   * Build sponsor search query with aggregation
   */
  buildSponsorQuery(query: string, options: QueryOptions = {}) {
    return {
      select: {
        name: schema.sponsors.name,
        id: schema.sponsors.id,
        role: schema.sponsors.role,
        party: schema.sponsors.party,
        sponsorshipCount: count(schema.billSponsorships.id)
      },
      from: schema.sponsors,
      leftJoin: {
        table: schema.billSponsorships,
        on: eq(schema.sponsors.id, schema.billSponsorships.sponsorId)
      },
      where: or(
        ilike(schema.sponsors.name, `${query}%`),
        ilike(schema.sponsors.name, `%${query}%`)
      ),
      groupBy: [schema.sponsors.id, schema.sponsors.name, schema.sponsors.role, schema.sponsors.party],
      orderBy: desc(count(schema.billSponsorships.id)),
      limit: options.limit || 10
    };
  }

  /**
   * Build full-text search query for spell correction
   */
  buildSpellCorrectionQuery(query: string, similarityThreshold: number = 0.3) {
    return sql`
      SELECT DISTINCT 
        title,
        similarity(title, ${query}) as sim,
        ts_rank(search_vector, plainto_tsquery('english', ${query})) as rank
      FROM bills 
      WHERE 
        similarity(title, ${query}) > ${similarityThreshold}
        OR search_vector @@ plainto_tsquery('english', ${query})
      ORDER BY 
        GREATEST(sim, rank) DESC
      LIMIT 5
    `;
  }

  /**
   * Sanitize and validate search query
   */
  sanitizeQuery(query: string): string {
    return query
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100); // Limit length
  }
}

export const queryBuilderService = new QueryBuilderService();