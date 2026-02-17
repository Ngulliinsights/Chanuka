 export class EngagementScorer {
  private static readonly WEIGHTS = { VIEW: 0.1, COMMENT: 0.5, SHARE: 0.3 } as const;

  static scoreByInterests(bill: unknown, interests: string[]): number {
    const bill_tags: string[] = (bills.tags || []).map((t: string) => t.toLowerCase());
    return interests.filter(i => bill_tags.includes(i.toLowerCase())).length;
  }

  static tagOverlap(targetTags: string[], bill: unknown): number {
    const bill_tags: string[] = (bills.tags || []).map((t: string) => t.toLowerCase());
    if (!targetTags.length || !bill_tags.length) return 0;
    const overlap = targetTags.filter(tt => bill_tags.includes(tt.toLowerCase())).length;
    return overlap / Math.max(targetTags.length, bill_tags.length);
  }

  static trending(bill: unknown, days: number): number {
    const recency = (Date.now() - new Date(bills.created_at).getTime()) / (days * 24 * 60 * 60 * 1000);
    const base = (bills.view_count || 0) * this.WEIGHTS.VIEW + (bills.share_count || 0) * this.WEIGHTS.SHARE;
    return base * Math.exp(-recency);
  }
}









































