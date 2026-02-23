/**
 * Provision Matcher Domain Service
 * 
 * Matches bill text to relevant constitutional provisions using keyword matching,
 * semantic similarity, and legal domain knowledge.
 */

import { ConstitutionalProvision } from '../entities/constitutional-provision.entity';

export interface ProvisionMatch {
  provision: ConstitutionalProvision;
  relevanceScore: number; // 0-1
  matchedKeywords: string[];
  matchedPhrases: string[];
  context: string; // Where in the bill this provision is relevant
}

export class ProvisionMatcherService {
  /**
   * Find constitutional provisions relevant to bill text
   */
  findRelevantProvisions(
    billText: string,
    allProvisions: ConstitutionalProvision[],
    minimumRelevance: number = 0.3,
  ): ProvisionMatch[] {
    const matches: ProvisionMatch[] = [];

    for (const provision of allProvisions) {
      const match = this.matchProvision(billText, provision);
      
      if (match.relevanceScore >= minimumRelevance) {
        matches.push(match);
      }
    }

    // Sort by relevance score descending
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return matches;
  }

  /**
   * Match a single provision against bill text
   */
  private matchProvision(billText: string, provision: ConstitutionalProvision): ProvisionMatch {
    const billLower = billText.toLowerCase();
    const matchedKeywords: string[] = [];
    const matchedPhrases: string[] = [];
    let relevanceScore = 0;

    // Check for keyword matches
    const keywords = provision.toJSON().keywords;
    for (const keyword of keywords) {
      if (billLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        relevanceScore += 0.1;
      }
    }

    // Check for provision title match
    const title = provision.toJSON().title.toLowerCase();
    if (billLower.includes(title)) {
      matchedPhrases.push(provision.toJSON().title);
      relevanceScore += 0.3;
    }

    // Check for explicit constitutional references
    const refString = provision.referenceString.toLowerCase();
    if (billLower.includes(refString)) {
      relevanceScore += 0.5;
    }

    // Boost score for fundamental rights
    if (provision.isBillOfRights) {
      relevanceScore *= 1.2;
    }

    // Cap at 1.0
    relevanceScore = Math.min(1.0, relevanceScore);

    // Extract context (surrounding text where match was found)
    const context = this.extractContext(billText, matchedKeywords, matchedPhrases);

    return {
      provision,
      relevanceScore,
      matchedKeywords,
      matchedPhrases,
      context,
    };
  }

  /**
   * Extract context around matched keywords/phrases
   */
  private extractContext(text: string, keywords: string[], phrases: string[]): string {
    const allMatches = [...keywords, ...phrases];
    if (allMatches.length === 0) return '';

    // Find first match and extract surrounding text
    const firstMatch = allMatches[0];
    const index = text.toLowerCase().indexOf(firstMatch.toLowerCase());
    
    if (index === -1) return '';

    // Extract 100 characters before and after
    const start = Math.max(0, index - 100);
    const end = Math.min(text.length, index + firstMatch.length + 100);
    
    let context = text.substring(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }

  /**
   * Find provisions by specific criteria
   */
  findFundamentalRightsProvisions(provisions: ConstitutionalProvision[]): ConstitutionalProvision[] {
    return provisions.filter(p => p.isBillOfRights);
  }

  findDirectivePrinciples(provisions: ConstitutionalProvision[]): ConstitutionalProvision[] {
    return provisions.filter(p => p.toJSON().isDirectivePrinciple);
  }

  findByChapter(provisions: ConstitutionalProvision[], chapter: number): ConstitutionalProvision[] {
    return provisions.filter(p => p.reference.chapter === chapter);
  }

  findByArticle(provisions: ConstitutionalProvision[], article: number): ConstitutionalProvision[] {
    return provisions.filter(p => p.reference.article === article);
  }
}
