import { SQL, sql, inArray, gte, lte, ilike, or } from 'drizzle-orm';
import { bills } from '@shared/schema';

// Alias for backward compatibility
const bills = bill;
import type { SearchFilters } from '../domain/search.dto';

export class SearchQueryBuilder {
  static buildVector(query: string, type: 'simple' | 'phrase' | 'boolean' = 'simple'): SQL | undefined {
    if (!query.trim()) return undefined;
    const clean = query.trim().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ');
    switch (type) {
      case 'phrase':
        return sql`phraseto_tsquery('english', ${clean})`;
      case 'boolean':
        return sql`to_tsquery('english', ${clean})`;
      default:
        return sql`plainto_tsquery('english', ${clean})`;
    }
  }

  static buildFilters(filters: SearchFilters, vector?: SQL): SQL[] {
    const cond: SQL[] = [];
    if (vector) cond.push(sql`${bills.search_vector} @@ ${vector}`);
    if (filters.status?.length) cond.push(inArray(bills.status, filters.status));
    if (filters.category?.length) cond.push(inArray(bills.category, filters.category));
    if (filters.sponsor_id?.length) cond.push(inArray(bills.sponsor_id, filters.sponsor_id));
    if (filters.dateFrom) cond.push(gte(bills.introduced_date, filters.dateFrom));
    if (filters.dateTo) cond.push(lte(bills.introduced_date, filters.dateTo));
    if (filters.complexityMin !== undefined) cond.push(gte(bills.complexity_score, filters.complexityMin));
    if (filters.complexityMax !== undefined) cond.push(lte(bills.complexity_score, filters.complexityMax));
    if (filters.tags?.length) cond.push(sql`${bills.tags} && ${filters.tags}`);
    return cond;
  }

  static buildOrder(sortBy: string, sortOrder: 'asc' | 'desc', rankExpr?: SQL): SQL {
    const dir = sortOrder === 'asc' ? sql`asc` : sql`desc`;
    switch (sortBy) {
      case 'date':
        return sql`${bills.introduced_date} ${dir}`;
      case 'title':
        return sql`${bills.title} ${dir}`;
      case 'engagement':
        return sql`${bills.view_count} ${dir}`;
      default:
        return rankExpr ? sql`${rankExpr} desc` : sql`${bills.introduced_date} desc`;
    }
  }
}





































