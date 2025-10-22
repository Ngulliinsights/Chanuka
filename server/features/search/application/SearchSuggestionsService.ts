import { SearchRepository } from '../infrastructure/SearchRepository';
import { readDatabase } from '@shared/database/connection';
import { sql } from 'drizzle-orm';
import { logger } from '@shared/core';

const repo = new SearchRepository();

/*  Original fallback lists & Levenshtein kept verbatim  */
const STATIC_POPULAR = [
  'healthcare reform', 'climate change', 'digital privacy', 'education funding',
  'infrastructure bill', 'tax policy', 'renewable energy', 'social security',
];

export class SearchSuggestionsService {
  async getAutocompleteSuggestions(partial: string, limit: number): Promise<string[]> {
    if (partial.length < 2) return [];
  const db = readDatabase;
    const [billTitles, cats] = await Promise.all([
      repo.search(sql`null`, [sql`title ilike ${'%' + partial + '%'}`], sql`view_count desc`, limit, 0),
      repo.facets([sql`category ilike ${'%' + partial + '%'}`]),
    ]);
    const titles = billTitles.map(r => r.bill.title);
    const categories = cats.category.map(c => c.value);
    return [...titles, ...categories].slice(0, limit);
  }

  getFallbackSuggestions(partial: string, limit: number): string[] {
    const low = partial.toLowerCase();
    return STATIC_POPULAR.filter(t => t.toLowerCase().includes(low)).slice(0, limit);
  }
}





































