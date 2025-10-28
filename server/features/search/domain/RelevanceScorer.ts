import type { PlainBill } from './search.dto';

export class RelevanceScorer {
  private static readonly WEIGHTS = {
    TITLE_EXACT: 100,
    TITLE_CONTAINS: 50,
    TITLE_STARTS_WITH: 25,
    DESCRIPTION_CONTAINS: 20,
    SHORT_TITLE: 10,
    RECENCY_BONUS: 5,
  } as const;

  /**
   * Calculate relevance score for a bill against a search query
   */
  static score(query: string, bill: PlainBill): number {
    const q = query.toLowerCase().trim();
    if (!q) return 0;

    let score = 0;
    const title = bill.title?.toLowerCase() || '';
    const description = bill.description?.toLowerCase() || '';
    const summary = bill.summary?.toLowerCase() || '';

    // Title matching
    if (title === q) {
      score += this.WEIGHTS.TITLE_EXACT;
    } else if (title.includes(q)) {
      score += this.WEIGHTS.TITLE_CONTAINS;
      if (title.startsWith(q)) {
        score += this.WEIGHTS.TITLE_STARTS_WITH;
      }
    }

    // Content matching
    if (description.includes(q)) {
      score += this.WEIGHTS.DESCRIPTION_CONTAINS;
    }
    if (summary.includes(q)) {
      score += this.WEIGHTS.DESCRIPTION_CONTAINS * 0.8; // Summary slightly less important
    }

    // Short title bonus
    if (bill.title && bill.title.length < 50) {
      score += this.WEIGHTS.SHORT_TITLE;
    }

    // Recency bonus for newer bills
    if (bill.createdAt) {
      const daysSinceCreation = (Date.now() - new Date(bill.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation < 30) {
        score += this.WEIGHTS.RECENCY_BONUS;
      }
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Extract highlighted fields from bill content
   */
  static highlight(bill: PlainBill, query: string): string[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const highlights: string[] = [];
    const fields = [
      { name: 'title', value: bill.title },
      { name: 'summary', value: bill.summary },
      { name: 'description', value: bill.description },
      { name: 'content', value: bill.content },
    ];

    for (const field of fields) {
      if (field.value && field.value.toLowerCase().includes(q)) {
        highlights.push(field.name);
      }
    }

    return highlights;
  }

  /**
   * Calculate similarity score between two bills based on tags and content
   */
  static calculateSimilarity(bill1: PlainBill, bill2: PlainBill): number {
    let score = 0;

    // Tag overlap
    const tags1 = bill1.tags || [];
    const tags2 = bill2.tags || [];
    if (tags1.length > 0 && tags2.length > 0) {
      const overlap = tags1.filter(tag => tags2.includes(tag)).length;
      const maxTags = Math.max(tags1.length, tags2.length);
      score += (overlap / maxTags) * 0.6; // 60% weight for tag similarity
    }

    // Category similarity
    if (bill1.category && bill2.category && bill1.category === bill2.category) {
      score += 0.2; // 20% weight for category match
    }

    // Status similarity (bills in similar stages might be related)
    if (bill1.status && bill2.status && bill1.status === bill2.status) {
      score += 0.1; // 10% weight for status match
    }

    // Sponsor similarity
    if (bill1.sponsorId && bill2.sponsorId && bill1.sponsorId === bill2.sponsorId) {
      score += 0.1; // 10% weight for same sponsor
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * Rank bills by multiple criteria
   */
  static rankBills(bills: PlainBill[], query: string, options: {
    sortBy?: 'relevance' | 'date' | 'engagement';
    sortOrder?: 'asc' | 'desc';
  } = {}): PlainBill[] {
    const { sortBy = 'relevance', sortOrder = 'desc' } = options;

    const scored = bills.map(bill => ({
      bill,
      relevanceScore: this.score(query, bill),
      engagementScore: (bill.viewCount || 0) + (bill.commentCount || 0) * 2 + (bill.shareCount || 0) * 3,
      dateScore: bill.createdAt ? new Date(bill.createdAt).getTime() : 0,
    }));

    scored.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'date':
          comparison = b.dateScore - a.dateScore;
          break;
        case 'engagement':
          comparison = b.engagementScore - a.engagementScore;
          break;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return scored.map(item => item.bill);
  }
}





































