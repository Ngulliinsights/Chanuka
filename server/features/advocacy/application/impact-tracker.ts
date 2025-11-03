// ============================================================================
// ADVOCACY COORDINATION - Impact Tracker Service
// ============================================================================

import { ICampaignRepository } from '../domain/repositories/campaign-repository.js';
import { IActionRepository } from '../domain/repositories/action-repository.js';
import { AdvocacyEventPublisher, ImpactAchievedEvent } from '../domain/events/advocacy-events.js';
import { ImpactAssessment } from '../types/index.js';
import { logger } from '../../../shared/core/index.js';

export interface ImpactMetric {
  id: string;
  campaignId: string;
  billId: string;
  metricType: 'bill_amended' | 'committee_feedback' | 'media_attention' | 'legislative_response' | 'public_awareness';
  value: number;
  description: string;
  evidenceLinks: string[];
  attributionScore: number; // 0-1, how much this campaign contributed
  recordedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface OutcomeTracking {
  billId: string;
  originalText: string;
  amendments: Array<{
    amendmentId: string;
    amendmentText: string;
    proposedBy: string;
    adoptedAt?: Date;
    relatedCampaigns: string[];
    attributionScore: number;
  }>;
  committeeReports: Array<{
    reportId: string;
    committee: string;
    reportDate: Date;
    mentionsCitizenInput: boolean;
    relatedCampaigns: string[];
  }>;
  mediaReferences: Array<{
    mediaId: string;
    outlet: string;
    publishedAt: Date;
    headline: string;
    mentionsCampaign: boolean;
    campaignId?: string;
  }>;
  legislativeResponses: Array<{
    responseId: string;
    legislator: string;
    responseType: 'statement' | 'vote_change' | 'amendment_proposal' | 'meeting_request';
    responseDate: Date;
    relatedCampaigns: string[];
  }>;
}

export class ImpactTracker {
  constructor(
    private campaignRepository: ICampaignRepository,
    private actionRepository: IActionRepository,
    private eventPublisher: AdvocacyEventPublisher
  ) {}

  /**
   * Records an impact metric for a campaign
   */
  async recordImpact(
    campaignId: string,
    impactType: ImpactMetric['metricType'],
    value: number,
    description: string,
    evidenceLinks: string[] = [],
    recordedBy: string
  ): Promise<ImpactMetric> {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Calculate attribution score based on campaign activity and timing
      const attributionScore = await this.calculateAttributionScore(campaignId, impactType);

      const impact: ImpactMetric = {
        id: `impact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        campaignId,
        billId: campaign.billId,
        metricType: impactType,
        value,
        description,
        evidenceLinks,
        attributionScore,
        recordedAt: new Date()
      };

      // Store impact metric (in real implementation, this would go to database)
      // For now, we'll just log it
      logger.info('Impact metric recorded', { 
        impactId: impact.id,
        campaignId,
        impactType,
        value,
        attributionScore,
        component: 'ImpactTracker' 
      });

      // Publish impact achieved event
      await this.eventPublisher.publish(new ImpactAchievedEvent(
        campaignId,
        impactType,
        description,
        attributionScore
      ));

      // Update campaign impact score
      await this.updateCampaignImpactScore(campaignId);

      return impact;
    } catch (error) {
      logger.error('Failed to record impact', error, { 
        campaignId,
        impactType,
        component: 'ImpactTracker' 
      });
      throw error;
    }
  }

  /**
   * Tracks bill outcomes and amendments
   */
  async trackBillOutcome(
    billId: string,
    outcomeType: 'amendment' | 'committee_report' | 'media_coverage' | 'legislative_response',
    outcomeData: any
  ): Promise<void> {
    try {
      // Find all campaigns related to this bill
      const relatedCampaigns = await this.campaignRepository.findByBillId(billId);

      for (const campaign of relatedCampaigns) {
        // Calculate how much this campaign likely contributed to the outcome
        const attribution = await this.calculateOutcomeAttribution(campaign.id, outcomeType, outcomeData);

        if (attribution > 0.1) { // Only record if significant attribution
          await this.recordImpact(
            campaign.id,
            this.mapOutcomeTypeToImpactType(outcomeType),
            attribution * 100,
            `${outcomeType}: ${outcomeData.description || outcomeData.title}`,
            outcomeData.evidenceLinks || [],
            'system'
          );
        }
      }

      logger.info('Bill outcome tracked', { 
        billId,
        outcomeType,
        relatedCampaigns: relatedCampaigns.length,
        component: 'ImpactTracker' 
      });
    } catch (error) {
      logger.error('Failed to track bill outcome', error, { 
        billId,
        outcomeType,
        component: 'ImpactTracker' 
      });
      throw error;
    }
  }

  /**
   * Generates comprehensive impact assessment for a campaign
   */
  async generateImpactAssessment(campaignId: string): Promise<ImpactAssessment> {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Get campaign metrics and actions
      const [metrics, actionSummary] = await Promise.all([
        this.campaignRepository.getMetrics(campaignId),
        this.actionRepository.getCampaignActionSummary(campaignId)
      ]);

      // Analyze outcomes
      const outcomes = await this.analyzeCampaignOutcomes(campaignId);
      
      // Calculate attribution
      const attribution = await this.calculateOverallAttribution(campaignId);

      // Get participant feedback
      const participantFeedback = await this.getParticipantFeedback(campaignId);

      const assessment: ImpactAssessment = {
        campaignId,
        billId: campaign.billId,
        outcomes,
        attribution,
        participantFeedback
      };

      logger.info('Impact assessment generated', { 
        campaignId,
        outcomes,
        attribution,
        component: 'ImpactTracker' 
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to generate impact assessment', error, { 
        campaignId,
        component: 'ImpactTracker' 
      });
      throw error;
    }
  }

  /**
   * Gets impact metrics for a campaign
   */
  async getCampaignImpactMetrics(campaignId: string): Promise<ImpactMetric[]> {
    try {
      // In real implementation, this would query the impact_metrics table
      // For now, return mock data
      return [];
    } catch (error) {
      logger.error('Failed to get campaign impact metrics', error, { 
        campaignId,
        component: 'ImpactTracker' 
      });
      throw error;
    }
  }

  /**
   * Gets aggregated impact statistics
   */
  async getImpactStatistics(filters?: {
    billId?: string;
    dateRange?: { start: Date; end: Date };
    impactType?: ImpactMetric['metricType'];
  }): Promise<{
    totalImpacts: number;
    impactsByType: Record<string, number>;
    averageAttribution: number;
    topPerformingCampaigns: Array<{
      campaignId: string;
      campaignTitle: string;
      totalImpactScore: number;
      impactCount: number;
    }>;
    billsInfluenced: number;
    amendmentsAchieved: number;
  }> {
    try {
      // In real implementation, this would run complex aggregation queries
      // For now, return mock statistics
      return {
        totalImpacts: 0,
        impactsByType: {},
        averageAttribution: 0,
        topPerformingCampaigns: [],
        billsInfluenced: 0,
        amendmentsAchieved: 0
      };
    } catch (error) {
      logger.error('Failed to get impact statistics', error, { 
        filters,
        component: 'ImpactTracker' 
      });
      throw error;
    }
  }

  /**
   * Verifies an impact claim with evidence
   */
  async verifyImpact(
    impactId: string,
    verifiedBy: string,
    verificationNotes?: string
  ): Promise<boolean> {
    try {
      // In real implementation, this would update the impact record
      logger.info('Impact verified', { 
        impactId,
        verifiedBy,
        component: 'ImpactTracker' 
      });

      return true;
    } catch (error) {
      logger.error('Failed to verify impact', error, { 
        impactId,
        verifiedBy,
        component: 'ImpactTracker' 
      });
      return false;
    }
  }

  /**
   * Tracks long-term outcomes of campaigns
   */
  async trackLongTermOutcomes(campaignId: string): Promise<{
    billImplementationStatus: string;
    policyChanges: string[];
    ongoingInfluence: number;
    participantRetention: number;
  }> {
    try {
      // This would track outcomes months or years after campaign completion
      return {
        billImplementationStatus: 'unknown',
        policyChanges: [],
        ongoingInfluence: 0,
        participantRetention: 0
      };
    } catch (error) {
      logger.error('Failed to track long-term outcomes', error, { 
        campaignId,
        component: 'ImpactTracker' 
      });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Calculates attribution score for a campaign's impact
   */
  private async calculateAttributionScore(
    campaignId: string,
    impactType: ImpactMetric['metricType']
  ): Promise<number> {
    try {
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) return 0;

      let score = 0;

      // Base score from campaign activity
      const actionSummary = await this.actionRepository.getCampaignActionSummary(campaignId);
      if (actionSummary) {
        // Higher completion rate = higher attribution
        score += actionSummary.completionRate * 0.3;
        
        // More participants = higher attribution
        score += Math.min(campaign.participantCount / 100, 0.2);
        
        // Relevant action types boost attribution
        const relevantActions = this.getRelevantActionTypes(impactType);
        const relevantActionCount = Object.entries(actionSummary.actionsByType)
          .filter(([type]) => relevantActions.includes(type))
          .reduce((sum, [, count]) => sum + count, 0);
        
        score += Math.min(relevantActionCount / 10, 0.3);
      }

      // Timing factor - recent campaigns get higher attribution
      const daysSinceStart = Math.floor(
        (new Date().getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const timingFactor = Math.max(0.1, 1 - (daysSinceStart / 365)); // Decay over a year
      score *= timingFactor;

      // Campaign status factor
      if (campaign.status === 'active') {
        score *= 1.2; // Active campaigns get bonus
      }

      return Math.min(score, 1.0);
    } catch (error) {
      logger.error('Failed to calculate attribution score', error, { 
        campaignId,
        impactType,
        component: 'ImpactTracker' 
      });
      return 0;
    }
  }

  /**
   * Calculates how much a campaign contributed to a specific outcome
   */
  private async calculateOutcomeAttribution(
    campaignId: string,
    outcomeType: string,
    outcomeData: any
  ): Promise<number> {
    try {
      // This would analyze the relationship between campaign actions and outcomes
      // For now, return a simple calculation based on campaign activity
      
      const campaign = await this.campaignRepository.findById(campaignId);
      if (!campaign) return 0;

      let attribution = 0;

      // Base attribution from campaign size and activity
      attribution += Math.min(campaign.participantCount / 200, 0.3);
      
      // Timing - outcomes closer to campaign activity get higher attribution
      const daysSinceStart = Math.floor(
        (new Date().getTime() - campaign.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceStart <= 30) {
        attribution += 0.4; // High attribution for recent outcomes
      } else if (daysSinceStart <= 90) {
        attribution += 0.2; // Medium attribution
      } else {
        attribution += 0.1; // Low attribution for distant outcomes
      }

      // Outcome type specific factors
      switch (outcomeType) {
        case 'amendment':
          // Check if campaign had relevant amendment-focused actions
          attribution += 0.3;
          break;
        case 'committee_report':
          // Check if campaign had committee testimony actions
          attribution += 0.2;
          break;
        case 'media_coverage':
          // Check if campaign had media outreach actions
          attribution += 0.1;
          break;
        case 'legislative_response':
          // Check if campaign had direct legislator contact actions
          attribution += 0.25;
          break;
      }

      return Math.min(attribution, 1.0);
    } catch (error) {
      logger.error('Failed to calculate outcome attribution', error, { 
        campaignId,
        outcomeType,
        component: 'ImpactTracker' 
      });
      return 0;
    }
  }

  /**
   * Analyzes campaign outcomes
   */
  private async analyzeCampaignOutcomes(campaignId: string): Promise<ImpactAssessment['outcomes']> {
    try {
      // In real implementation, this would analyze actual outcomes
      return {
        billAmended: false,
        committeeFeedback: false,
        mediaAttention: false,
        publicAwareness: 0,
        legislativeResponse: false
      };
    } catch (error) {
      return {
        billAmended: false,
        committeeFeedback: false,
        mediaAttention: false,
        publicAwareness: 0,
        legislativeResponse: false
      };
    }
  }

  /**
   * Calculates overall attribution for a campaign
   */
  private async calculateOverallAttribution(campaignId: string): Promise<ImpactAssessment['attribution']> {
    try {
      // This would aggregate all attribution scores for the campaign
      return {
        directImpact: 0,
        contributingFactors: [],
        confidence: 0
      };
    } catch (error) {
      return {
        directImpact: 0,
        contributingFactors: [],
        confidence: 0
      };
    }
  }

  /**
   * Gets participant feedback for impact assessment
   */
  private async getParticipantFeedback(campaignId: string): Promise<ImpactAssessment['participantFeedback']> {
    try {
      // This would survey participants about their experience and perceived impact
      return {
        satisfaction: 0,
        efficacy: 0,
        likelyToParticipateAgain: 0
      };
    } catch (error) {
      return {
        satisfaction: 0,
        efficacy: 0,
        likelyToParticipateAgain: 0
      };
    }
  }

  /**
   * Updates campaign impact score based on recorded impacts
   */
  private async updateCampaignImpactScore(campaignId: string): Promise<void> {
    try {
      // Calculate new impact score based on all recorded impacts
      const impactScore = 50; // Placeholder calculation
      
      await this.campaignRepository.update(campaignId, {
        impactScore,
        updatedAt: new Date()
      } as any);

      logger.info('Campaign impact score updated', { 
        campaignId,
        impactScore,
        component: 'ImpactTracker' 
      });
    } catch (error) {
      logger.error('Failed to update campaign impact score', error, { 
        campaignId,
        component: 'ImpactTracker' 
      });
    }
  }

  /**
   * Maps outcome types to impact metric types
   */
  private mapOutcomeTypeToImpactType(outcomeType: string): ImpactMetric['metricType'] {
    const mapping: Record<string, ImpactMetric['metricType']> = {
      'amendment': 'bill_amended',
      'committee_report': 'committee_feedback',
      'media_coverage': 'media_attention',
      'legislative_response': 'legislative_response'
    };

    return mapping[outcomeType] || 'public_awareness';
  }

  /**
   * Gets action types relevant to an impact type
   */
  private getRelevantActionTypes(impactType: ImpactMetric['metricType']): string[] {
    const relevantActions: Record<ImpactMetric['metricType'], string[]> = {
      'bill_amended': ['contact_representative', 'attend_hearing', 'submit_comment'],
      'committee_feedback': ['attend_hearing', 'submit_comment', 'contact_representative'],
      'media_attention': ['share_content', 'organize_meeting', 'petition_signature'],
      'legislative_response': ['contact_representative', 'organize_meeting'],
      'public_awareness': ['share_content', 'organize_meeting', 'petition_signature']
    };

    return relevantActions[impactType] || [];
  }
}