export class RelevanceScorer {
  static score(query: string, bill: PlainBill): number {
    const q = query.toLowerCase();
    let score = 0;
    if (bill.title.toLowerCase() === q) score += 100;
    else if (bill.title.toLowerCase().includes(q)) {
      score += 50;
      if (bill.title.toLowerCase().startsWith(q)) score += 25;
    }
    if (bill.description?.toLowerCase().includes(q)) score += 20;
    if (bill.title.length < 50) score += 10;
    return score;
  }

  static highlight(bill: PlainBill, query: string): string[] {
    const q = query.toLowerCase();
    const out: string[] = [];
    if (bill.title.toLowerCase().includes(q)) out.push('title');
    if (bill.summary?.toLowerCase().includes(q)) out.push('summary');
    if (bill.description?.toLowerCase().includes(q)) out.push('description');
    if (bill.content?.toLowerCase().includes(q)) out.push('content');
    return out;
  }
}




































