/**
 * Stakeholder Analysis Service
 * 
 * Responsible for identifying stakeholders and analyzing their interests
 * in relation to bills and legislative processes.
 */

import { Stakeholder, StakeholderInterest } from '@server/features/analytics/conflict-detection/types';
import { logger } from '@server/infrastructure/observability';
import { getDefaultCache } from '@shared/core/caching/index';
import { database as db } from '@server/infrastructure/database';
import {
type Bill,
bill_sponsorships,
  bills,   type Sponsor, type SponsorAffiliation, sponsorAffiliations, sponsors} from '@server/infrastructure/schema';
import { and, count, desc, eq, gte, inArray, like, lte, or,sql } from 'drizzle-orm';

export class StakeholderAnalysisService {
  private static instance: StakeholderAnalysisService;

  public static getInstance(): StakeholderAnalysisService {
    if (!StakeholderAnalysisService.instance) {
      StakeholderAnalysisService.instance = new StakeholderAnalysisService();
    }
    return StakeholderAnalysisService.instance;
  }

  /**
   * Identifies all stakeholders for a given bill
   */
  async identifyStakeholders(bill: Bill): Promise<Stakeholder[]> {
    try {
      const cacheKey = `stakeholders:bill:${bills.id}`;
      const cache = getDefaultCache();
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const [sponsors, organizations, industries] = await Promise.all([
        this.identifyIndividualStakeholders(bill),
        this.identifyOrganizationalStakeholders(bill),
        this.identifyIndustryStakeholders(bill)
      ]);

      const stakeholders = [...sponsors, ...organizations, ...industries];
      await cache.set(cacheKey, stakeholders, 3600);
      
      return stakeholders;
    } catch (error) { logger.error('Error identifying stakeholders:', {
        component: 'StakeholderAnalysis',
        bill_id: bills.id,
        error: error instanceof Error ? error.message : String(error)
       });
      return [];
    }
  }

  /**
   * Analyzes stakeholder interests for a specific bill
   */
  async analyzeStakeholderInterests(stakeholders: Stakeholder[]): Promise<StakeholderInterest[]> {
    try {
      const interests: StakeholderInterest[] = [];

      for (const stakeholder of stakeholders) {
        const stakeholderInterests = await this.analyzeIndividualStakeholderInterests(stakeholder);
        interests.push(...stakeholderInterests);
      }

      return interests;
    } catch (error) {
      logger.error('Error analyzing stakeholder interests:', {
        component: 'StakeholderAnalysis',
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Calculates influence scores for stakeholders
   */
  async calculateInfluenceScores(stakeholders: Stakeholder[]): Promise<Map<string, number>> {
    const influenceMap = new Map<string, number>();

    for (const stakeholder of stakeholders) {
      let influence = 0.5; // Base influence

      // Adjust based on stakeholder type
      switch (stakeholder.type) {
        case 'government':
          influence += 0.3;
          break;
        case 'organization':
          influence += 0.2;
          break;
        case 'industry':
          influence += 0.1;
          break;
        case 'individual':
          influence += 0.05;
          break;
      }

      // Adjust based on transparency
      influence += stakeholder.transparency * 0.2;

      // Adjust based on number of interests
      influence += Math.min(stakeholder.interests.length * 0.05, 0.2);

      influenceMap.set(stakeholder.id, Math.min(influence, 1.0));
    }

    return influenceMap;
  }

  /**
   * Identifies potential conflicts between stakeholders
   */
  async identifyStakeholderConflicts(
    stakeholders: Stakeholder[]
  ): Promise<Array<{
    stakeholder1: Stakeholder;
    stakeholder2: Stakeholder;
    conflictType: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>> {
    const conflicts: Array<{
      stakeholder1: Stakeholder;
      stakeholder2: Stakeholder;
      conflictType: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }> = [];

    for (let i = 0; i < stakeholders.length; i++) {
      for (let j = i + 1; j < stakeholders.length; j++) {
        const stakeholder1 = stakeholders[i];
        const stakeholder2 = stakeholders[j];

        const conflict = this.analyzeStakeholderConflict(stakeholder1, stakeholder2);
        if (conflict) {
          conflicts.push({
            stakeholder1,
            stakeholder2,
            ...conflict
          });
        }
      }
    }

    return conflicts;
  }

  // Private helper methods

  private async identifyIndividualStakeholders(bill: Bill): Promise<Stakeholder[]> {
    try {
      // Get bill sponsors
      const billSponsors = await db
        .select({
          sponsor: sponsors
        })
        .from(bill_sponsorships)
        .innerJoin(sponsors, eq(bill_sponsorships.sponsor_id, sponsors.id))
        .where(eq(bill_sponsorships.bill_id, bills.id));

      return billSponsors.map(({ sponsor }) => ({
        id: `individual_${sponsors.id}`,
        name: sponsors.name,
        type: 'individual' as const,
        interests: [{ bill_id: bills.id,
          issueArea: bills.category || 'General',
          position: 'support' as const,
          strength: 0.9,
          description: `Primary sponsor of ${bills.title }`
        }],
        influence: 0.8,
        transparency: 0.7
      }));
    } catch (error) {
      logger.error('Error identifying individual stakeholders:', { error });
      return [];
    }
  }

  private async identifyOrganizationalStakeholders(bill: Bill): Promise<Stakeholder[]> {
    try {
      const stakeholders: Stakeholder[] = [];

      // Extract organizations mentioned in bill summary
      const organizations = this.extractOrganizationsFromText(bills.summary || '');

      for (const org of organizations) {
        stakeholders.push({
          id: `organization_${org.toLowerCase().replace(/\s+/g, '_')}`,
          name: org,
          type: 'organization',
          interests: [{ bill_id: bills.id,
            issueArea: bills.category || 'General',
            position: 'neutral',
            strength: 0.6,
            description: `Mentioned in bill ${bills.title }`
          }],
          influence: 0.6,
          transparency: 0.5
        });
      }

      return stakeholders;
    } catch (error) {
      logger.error('Error identifying organizational stakeholders:', { error });
      return [];
    }
  }

  private async identifyIndustryStakeholders(bill: Bill): Promise<Stakeholder[]> {
    try {
      const industries = this.identifyAffectedIndustries(bill);

      return industries.map(industry => ({
        id: `industry_${industry.toLowerCase().replace(/\s+/g, '_')}`,
        name: industry,
        type: 'industry' as const,
        interests: [{ bill_id: bills.id,
          issueArea: bills.category || 'General',
          position: 'neutral' as const,
          strength: 0.5,
          description: `Industry potentially affected by ${bills.title }`
        }],
        influence: 0.5,
        transparency: 0.4
      }));
    } catch (error) {
      logger.error('Error identifying industry stakeholders:', { error });
      return [];
    }
  }

  private async analyzeIndividualStakeholderInterests(
    stakeholder: Stakeholder
  ): Promise<StakeholderInterest[]> {
    // For now, return the existing interests
    // In a full implementation, this would analyze deeper patterns
    return stakeholder.interests;
  }

  private analyzeStakeholderConflict(
    stakeholder1: Stakeholder,
    stakeholder2: Stakeholder
  ): {
    conflictType: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  } | null {
    // Find opposing interests
    for (const interest1 of stakeholder1.interests) {
      for (const interest2 of stakeholder2.interests) {
        if (interest1.bill_id === interest2.bill_id && 
            interest1.issueArea === interest2.issueArea) {
          
          if ((interest1.position === 'support' && interest2.position === 'oppose') ||
              (interest1.position === 'oppose' && interest2.position === 'support')) {
            
            const severity = this.calculateConflictSeverity(
              interest1.strength,
              interest2.strength,
              stakeholder1.influence,
              stakeholder2.influence
            );

            return {
              conflictType: 'opposing_positions',
              severity,
              description: `${stakeholder1.name} ${interest1.position}s while ${stakeholder2.name} ${interest2.position}s the same bill`
            };
          }
        }
      }
    }

    return null;
  }

  private calculateConflictSeverity(
    strength1: number,
    strength2: number,
    influence1: number,
    influence2: number
  ): 'low' | 'medium' | 'high' {
    const avgStrength = (strength1 + strength2) / 2;
    const avgInfluence = (influence1 + influence2) / 2;
    const conflictScore = avgStrength * avgInfluence;

    if (conflictScore >= 0.7) return 'high';
    if (conflictScore >= 0.5) return 'medium';
    return 'low';
  }

  private extractOrganizationsFromText(text: string): string[] {
    // Simple regex-based extraction - in reality this would be more sophisticated
    const orgPatterns = [
      /\b([A-Z][a-z]+ (?:Corporation|Corp|Company|Co|Ltd|Limited|Inc|Incorporated|Organization|Org|Foundation|Institute|Association|Agency|Authority|Board|Commission|Committee|Council|Department|Ministry|Office|Bureau|Service|Bank|Group|Holdings|Partners|Solutions|Systems|Technologies|Tech|Enterprises|Industries|International|National|Kenya|African))\b/g,
      /\b([A-Z]{2,}(?:\s+[A-Z]{2,})*)\b/g // Acronyms
    ];

    const organizations = new Set<string>();

    for (const pattern of orgPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 3 && match.length < 100) {
            organizations.add(match.trim());
          }
        });
      }
    }

    return Array.from(organizations).slice(0, 10); // Limit to 10 organizations
  }

  private identifyAffectedIndustries(bill: Bill): string[] {
    const text = (bills.title + ' ' + (bills.summary || '')).toLowerCase();
    const industries: string[] = [];

    const industryKeywords = {
      'Technology': ['technology', 'tech', 'digital', 'software', 'internet', 'cyber', 'data'],
      'Healthcare': ['health', 'medical', 'hospital', 'pharmaceutical', 'medicine', 'healthcare'],
      'Finance': ['bank', 'financial', 'finance', 'investment', 'insurance', 'credit', 'loan'],
      'Agriculture': ['agriculture', 'farming', 'crop', 'livestock', 'agricultural', 'food'],
      'Energy': ['energy', 'power', 'electricity', 'renewable', 'solar', 'wind', 'oil', 'gas'],
      'Education': ['education', 'school', 'university', 'learning', 'academic', 'student'],
      'Transportation': ['transport', 'road', 'railway', 'aviation', 'shipping', 'logistics'],
      'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial', 'assembly'],
      'Tourism': ['tourism', 'hotel', 'travel', 'hospitality', 'recreation'],
      'Mining': ['mining', 'mineral', 'extraction', 'quarry', 'geological']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        industries.push(industry);
      }
    }

    return industries;
  }
}

export const stakeholderAnalysisService = StakeholderAnalysisService.getInstance();


