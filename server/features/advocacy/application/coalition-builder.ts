// ============================================================================
// ADVOCACY COORDINATION - Coalition Builder Service
// ============================================================================

// Repository interfaces removed - using direct service calls
import { AdvocacyEventPublisher, CoalitionOpportunityIdentifiedEvent, CoalitionFormedEvent } from '@shared/domain/events/advocacy-events.js';
import { CoalitionOpportunity } from '@server/types/index.ts';
import { AdvocacyErrors } from '@shared/domain/errors/advocacy-errors.js';
import { logger  } from '@shared/core';

export interface CoalitionProposal {
  id: string;
  initiatingCampaignId: string;
  targetCampaignIds: string[];
  proposedObjectives: string[];
  proposedActions: string[];
  estimatedImpact: number;
  status: 'proposed' | 'accepted' | 'rejected' | 'expired';
  created_at: Date;
  expires_at: Date;
}

export interface Coalition {
  id: string;
  name: string;
  description: string;
  campaignIds: string[];
  sharedObjectives: string[];
  coordinatedActions: string[];
  status: 'active' | 'paused' | 'dissolved';
  created_at: Date;
  updated_at: Date;
}

export class CoalitionBuilder {
  constructor(
    private campaignRepository: ICampaignRepository,
    private actionRepository: IActionRepository,
    private eventPublisher: AdvocacyEventPublisher
  ) {}

  /**
   * Identifies potential coalition opportunities for a campaign
   */
  async identifyCoalitionOpportunities(campaign_id: string): Promise<CoalitionOpportunity[]> {
    try {
      const campaign = await this.campaignRepository.findById(campaign_id);
      if (!campaign) {
        throw AdvocacyErrors.campaignNotFound(campaign_id);
      }

      // Find potential coalition partners
      const potentialCoalitions = await this.campaignRepository.findPotentialCoalitions(campaign_id);
      
      const opportunities: CoalitionOpportunity[] = [];

      for (const coalition of potentialCoalitions) {
        const partnerCampaign = await this.campaignRepository.findById(coalition.campaign_id);
        if (!partnerCampaign) continue;

        // Analyze compatibility
        const compatibility = await this.analyzeCompatibility(campaign, partnerCampaign);
        
        if (compatibility.alignmentScore >= 0.6) {
          const opportunity: CoalitionOpportunity = {
            id: `coalition-opp-${ campaign_id }-${coalition.campaign_id}`,
            bill_id: campaign.bill_id,
            sharedConcerns: compatibility.sharedConcerns,
            potentialPartners: [{
              user_id: partnerCampaign.organizerId,
              organizationName: partnerCampaign.organizationName,
              alignmentScore: compatibility.alignmentScore,
              complementaryStrengths: compatibility.complementaryStrengths
            }],
            suggestedActions: compatibility.suggestedActions,
            estimatedImpact: this.calculateEstimatedImpact(campaign, partnerCampaign, compatibility)
          };

          opportunities.push(opportunity);

          // Publish event for potential coalition
          await this.eventPublisher.publish(new CoalitionOpportunityIdentifiedEvent(
            campaign_id,
            coalition.campaign_id,
            compatibility.alignmentScore,
            compatibility.sharedConcerns
          ));
        }
      }

      // Sort by estimated impact
      opportunities.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

      logger.info('Coalition opportunities identified', { 
        campaign_id,
        opportunityCount: opportunities.length,
        component: 'CoalitionBuilder' 
      });

      return opportunities;
    } catch (error) {
      logger.error('Failed to identify coalition opportunities', error, { 
        campaign_id,
        component: 'CoalitionBuilder' 
      });
      throw error;
    }
  }

  /**
   * Proposes a coalition between campaigns
   */
  async proposeCoalition(
    initiatingCampaignId: string,
    targetCampaignIds: string[],
    proposedObjectives: string[],
    proposerId: string
  ): Promise<CoalitionProposal> {
    try {
      // Validate initiating campaign
      const initiatingCampaign = await this.campaignRepository.findById(initiatingCampaignId);
      if (!initiatingCampaign) {
        throw AdvocacyErrors.campaignNotFound(initiatingCampaignId);
      }

      // Check if proposer has authority
      if (initiatingCampaign.organizerId !== proposerId) {
        throw AdvocacyErrors.campaignAccessDenied(initiatingCampaignId, proposerId);
      }

      // Validate target campaigns
      const targetCampaigns = [];
      for (const targetId of targetCampaignIds) {
        const campaign = await this.campaignRepository.findById(targetId);
        if (!campaign) {
          throw AdvocacyErrors.campaignNotFound(targetId);
        }
        if (campaign.status !== 'active') {
          throw AdvocacyErrors.campaignStatus(campaign.status, 'form coalition with');
        }
        targetCampaigns.push(campaign);
      }

      // Analyze compatibility with all targets
      const compatibilityScores = [];
      for (const targetCampaign of targetCampaigns) {
        const compatibility = await this.analyzeCompatibility(initiatingCampaign, targetCampaign);
        compatibilityScores.push(compatibility.alignmentScore);
      }

      const averageCompatibility = compatibilityScores.reduce((sum, score) => sum + score, 0) / compatibilityScores.length;
      
      if (averageCompatibility < 0.5) {
        throw new AdvocacyErrors.IncompatibleCampaignsError(
          initiatingCampaignId,
          targetCampaignIds.join(', ')
        );
      }

      // Create coalition proposal
      const proposal: CoalitionProposal = {
        id: `coalition-proposal-${Date.now()}`,
        initiatingCampaignId,
        targetCampaignIds,
        proposedObjectives,
        proposedActions: await this.generateCoordinatedActions(initiatingCampaign, targetCampaigns),
        estimatedImpact: Math.round(averageCompatibility * 100),
        status: 'proposed',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      // Store proposal (this would be in a coalition_proposals table)
      // For now, we'll just log it
      logger.info('Coalition proposal created', { 
        proposalId: proposal.id,
        initiatingCampaignId,
        targetCampaignIds,
        component: 'CoalitionBuilder' 
      });

      return proposal;
    } catch (error) {
      logger.error('Failed to propose coalition', error, { 
        initiatingCampaignId,
        targetCampaignIds,
        component: 'CoalitionBuilder' 
      });
      throw error;
    }
  }

  /**
   * Forms a coalition from accepted proposals
   */
  async formCoalition(
    proposalId: string,
    coalitionName: string,
    coalitionDescription: string,
    acceptingUserId: string
  ): Promise<Coalition> {
    try {
      // In a real implementation, this would retrieve the proposal from database
      // For now, we'll create a mock coalition
      
      const coalition: Coalition = {
        id: `coalition-${Date.now()}`,
        name: coalitionName,
        description: coalitionDescription,
        campaignIds: [], // Would be populated from proposal
        sharedObjectives: [],
        coordinatedActions: [],
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };

      // Publish coalition formed event
      await this.eventPublisher.publish(new CoalitionFormedEvent(
        coalition.id,
        coalition.campaignIds,
        coalition.sharedObjectives
      ));

      logger.info('Coalition formed', { 
        coalitionId: coalition.id,
        name: coalitionName,
        component: 'CoalitionBuilder' 
      });

      return coalition;
    } catch (error) {
      logger.error('Failed to form coalition', error, { 
        proposalId,
        component: 'CoalitionBuilder' 
      });
      throw error;
    }
  }

  /**
   * Gets active coalitions for a campaign
   */
  async getCampaignCoalitions(campaign_id: string): Promise<Coalition[]> {
    try {
      // In a real implementation, this would query the coalitions table
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to get campaign coalitions', error, { 
        campaign_id,
        component: 'CoalitionBuilder' 
      });
      throw error;
    }
  }

  /**
   * Coordinates actions across coalition members
   */
  async coordinateCoalitionActions(
    coalitionId: string,
    actionType: string,
    actionDetails: any,
    coordinatorId: string
  ): Promise<string[]> {
    try {
      // In a real implementation, this would:
      // 1. Validate coalition membership
      // 2. Create coordinated actions for all member campaigns
      // 3. Notify coalition members
      
      const actionIds: string[] = [];
      
      logger.info('Coalition actions coordinated', { 
        coalitionId,
        actionType,
        actionCount: actionIds.length,
        component: 'CoalitionBuilder' 
      });

      return actionIds;
    } catch (error) {
      logger.error('Failed to coordinate coalition actions', error, { 
        coalitionId,
        actionType,
        component: 'CoalitionBuilder' 
      });
      throw error;
    }
  }

  /**
   * Analyzes compatibility between two campaigns
   */
  private async analyzeCompatibility(campaign1: any, campaign2: any): Promise<{
    alignmentScore: number;
    sharedConcerns: string[];
    complementaryStrengths: string[];
    suggestedActions: string[];
  }> {
    let alignmentScore = 0;
    const sharedConcerns: string[] = [];
    const complementaryStrengths: string[] = [];
    const suggestedActions: string[] = [];

    // Same bill = high alignment
    if (campaign1.bill_id === campaign2.bill_id) {
      alignmentScore += 0.4;
      sharedConcerns.push('Same legislation');
      suggestedActions.push('Coordinate messaging', 'Joint committee testimony');
    }

    // Same category = medium alignment
    if (campaign1.category === campaign2.category) {
      alignmentScore += 0.2;
      sharedConcerns.push(`Both focus on ${campaign1.category}`);
    }

    // Overlapping tags = variable alignment
    const sharedTags = campaign1.tags.filter((tag: string) => campaign2.tags.includes(tag));
    if (sharedTags.length > 0) {
      alignmentScore += Math.min(sharedTags.length * 0.1, 0.3);
      sharedConcerns.push(...sharedTags);
    }

    // Overlapping counties = coordination opportunity
    const sharedCounties = campaign1.targetCounties.filter((county: string) => 
      campaign2.targetCounties.includes(county)
    );
    if (sharedCounties.length > 0) {
      alignmentScore += 0.1;
      complementaryStrengths.push('Geographic overlap for local coordination');
      suggestedActions.push('Joint local events', 'Coordinated county outreach');
    }

    // Complementary objectives
    const objectiveOverlap = this.findObjectiveOverlap(campaign1.objectives, campaign2.objectives);
    if (objectiveOverlap.length > 0) {
      alignmentScore += 0.2;
      sharedConcerns.push(...objectiveOverlap);
      suggestedActions.push('Unified position statement', 'Joint advocacy strategy');
    }

    // Different organization types can be complementary
    if (campaign1.organizationName && campaign2.organizationName && 
        campaign1.organizationName !== campaign2.organizationName) {
      complementaryStrengths.push('Different organizational perspectives');
      suggestedActions.push('Cross-sector advocacy', 'Diverse stakeholder representation');
    }

    // Participant size complementarity
    const sizeDifference = Math.abs(campaign1.participantCount - campaign2.participantCount);
    if (sizeDifference > 50) {
      complementaryStrengths.push('Different scale campaigns for broader reach');
    }

    return {
      alignmentScore: Math.min(alignmentScore, 1.0),
      sharedConcerns,
      complementaryStrengths,
      suggestedActions
    };
  }

  /**
   * Calculates estimated impact of coalition
   */
  private calculateEstimatedImpact(campaign1: any, campaign2: any, compatibility: any): number {
    let impact = 0;

    // Base impact from participant count
    const totalParticipants = campaign1.participantCount + campaign2.participantCount;
    impact += Math.min(totalParticipants / 10, 30); // Max 30 points from participants

    // Alignment bonus
    impact += compatibility.alignmentScore * 40; // Max 40 points from alignment

    // Diversity bonus (different approaches can be more effective)
    if (compatibility.complementaryStrengths.length > 0) {
      impact += compatibility.complementaryStrengths.length * 5; // Max varies
    }

    // Action coordination potential
    impact += compatibility.suggestedActions.length * 2;

    // Same bill = higher impact potential
    if (campaign1.bill_id === campaign2.bill_id) {
      impact += 20;
    }

    return Math.round(Math.min(impact, 100));
  }

  /**
   * Finds overlapping objectives between campaigns
   */
  private findObjectiveOverlap(objectives1: string[], objectives2: string[]): string[] {
    const overlap: string[] = [];
    
    for (const obj1 of objectives1) {
      for (const obj2 of objectives2) {
        // Simple keyword matching - in production, this would use NLP
        const words1 = obj1.toLowerCase().split(' ');
        const words2 = obj2.toLowerCase().split(' ');
        
        const commonWords = words1.filter(word => 
          words2.includes(word) && word.length > 3 // Ignore short words
        );
        
        if (commonWords.length >= 2) {
          overlap.push(`Shared focus on ${commonWords.join(', ')}`);
        }
      }
    }
    
    return [...new Set(overlap)]; // Remove duplicates
  }

  /**
   * Generates coordinated actions for coalition
   */
  private async generateCoordinatedActions(initiatingCampaign: any, targetCampaigns: any[]): Promise<string[]> {
    const actions: string[] = [];
    
    // Standard coalition actions
    actions.push('Develop unified messaging framework');
    actions.push('Coordinate social media campaigns');
    actions.push('Plan joint advocacy events');
    
    // Bill-specific actions
    if (targetCampaigns.some(c => c.bill_id === initiatingCampaign.bill_id)) {
      actions.push('Prepare joint committee testimony');
      actions.push('Coordinate legislative meetings');
      actions.push('Develop shared position paper');
    }
    
    // Geographic coordination
    const allCounties = [
      ...initiatingCampaign.targetCounties,
      ...targetCampaigns.flatMap((c: any) => c.targetCounties)
    ];
    const uniqueCounties = [...new Set(allCounties)];
    
    if (uniqueCounties.length > 1) {
      actions.push('Coordinate multi-county outreach');
      actions.push('Plan regional advocacy tour');
    }
    
    return actions;
  }
}
