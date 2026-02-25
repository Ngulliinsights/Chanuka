/**
 * Precedents Database - Local knowledge base of legal precedents
 */

export class PrecedentDatabase {
  private precedents: Map<string, any>;
  private provisions: Map<string, any>;

  constructor() {
    this.precedents = new Map();
    this.provisions = new Map();
    this.initializeSampleData();
  }

  async findByProvision(provisionId: string) {
    const results = [];
    for (const precedent of this.precedents.values()) {
      if (precedent.provisionIds.includes(provisionId)) {
        results.push(precedent);
      }
    }
    return results.sort((a: any, b: any) => b.year - a.year);
  }

  async getProvision(provisionId: string) {
    return this.provisions.get(provisionId);
  }

  initializeSampleData() {
    // Sample provision
    this.provisions.set('article-27', {
      id: 'article-27',
      article: '27',
      text: 'Every person is equal before the law...',
      framingDebates: ['Equality concepts'],
      legislativeIntent: 'Ensure no discrimination',
      judicialInterpretations: ['Formal and substantive equality'],
      amendments: [],
      relatedProvisions: ['article-28']
    });

    // Sample precedent
    this.precedents.set('prec-1', {
      id: 'prec-1',
      caseNumber: 'Petition No. 261 of 2013',
      caseName: 'FIDA-K v Attorney General',
      court: 'High Court',
      year: 2014,
      provisionIds: ['article-27'],
      summary: 'Challenge to child marriage provisions',
      holding: 'Sections unconstitutional',
      reasoning: 'Violates dignity and equality rights',
      judges: ['Justice Mumbi Ngugi'],
      citationCount: 45,
      keywords: ['equality', 'dignity', 'children rights']
    });
  }
}

export const precedentDatabase = new PrecedentDatabase();
