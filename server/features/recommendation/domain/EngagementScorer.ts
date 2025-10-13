 export class EngagementScorer {
  private static readonly WEIGHTS = { VIEW: 0.1, COMMENT: 0.5, SHARE: 0.3 } as const;

  static scoreByInterests(bill: any, interests: string[]): number {
    const billTags: string[] = (bill.tags || []).map((t: string) => t.toLowerCase());
    return interests.filter(i => billTags.includes(i.toLowerCase())).length;
  }

  static tagOverlap(targetTags: string[], bill: any): number {
    const billTags: string[] = (bill.tags || []).map((t: string) => t.toLowerCase());
    if (!targetTags.length || !billTags.length) return 0;
    const overlap = targetTags.filter(tt => billTags.includes(tt.toLowerCase())).length;
    return overlap / Math.max(targetTags.length, billTags.length);
  }

  static trending(bill: any, days: number): number {
    const recency = (Date.now() - new Date(bill.createdAt).getTime()) / (days * 24 * 60 * 60 * 1000);
    const base = (bill.viewCount || 0) * this.WEIGHTS.VIEW + (bill.shareCount || 0) * this.WEIGHTS.SHARE;
    return base * Math.exp(-recency);
  }
}
