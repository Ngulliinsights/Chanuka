// ============================================================================
// ADVOCACY COORDINATION - Campaign Domain Service
// ============================================================================

// Repository interfaces removed - using direct service calls
import { CampaignMetrics, CoalitionOpportunity } from '@server/types/index.ts';
import { logger  } from '@shared/core';
import { Campaign, CampaignEntity, NewCampaign } from '@shared/entities/campaign.js';

export class CampaignDomainService {
  constructor(
    private campaignRepository: ICampaignRepository,
    private actionRepository: IActionRepository
  ) {}

  async createCampaign(data: NewCampaign, creatorId: string): Promise<Campaign> {
    logger.info('Creating new campaign', { 
      title: data.title, 
      bill_id: data.bill_id, 
      organizerId: data.organizerId,
      component: 'CampaignDomainService' 
    });

    if (data.organizerId !== creatorId) {
      throw new Error('User can only create campaigns for themselves');
    }

    if (data.end_date && data.end_date <= data.start_date) {
      throw new Error('End date must be after start date');
    }

    if (data.start_date < new Date()) {
      throw new Error('Start date cannot be in the past');
    }

    if (!data.objectives || data.objectives.length === 0) {
      throw new Error('Campaign must have at least one objective');
    }

    const existingCampaigns = await this.campaignRepository.findByBillId(data.bill_id, {
      organizerId: data.organizerId
    });

    const activeCampaigns = existingCampaigns.filter(c => 
      c.status === 'active' || c.status === 'draft'
    );

    if (activeCampaigns.length > 0) {
      throw new Error('User already has an active campaign for this bill');
    }

    const campaign = await this.campaignRepository.create(data);
    
    logger.info('Campaign created successfully', { 
      campaign_id: campaign.id,
      component: 'CampaignDomainService' 
    });

    return campaign;
  }

  async updateCampaignStatus(
    campaign_id: string, 
    newStatus: Campaign['status'], 
    user_id: string
  ): Promise<Campaign> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const campaignEntity = CampaignEntity.fromData(campaign);
    
    if (!campaignEntity.canBeModifiedBy(user_id)) {
      throw new Error('User not authorized to modify this campaign');
    }

    campaignEntity.updateStatus(newStatus, user_id);

    const updatedCampaign = await this.campaignRepository.update(
      campaign_id, 
      { status: newStatus, updated_at: new Date() }
    );

    if (!updatedCampaign) {
      throw new Error('Failed to update campaign status');
    }

    logger.info('Campaign status updated', { 
      campaign_id, 
      oldStatus: campaign.status, 
      newStatus,
      component: 'CampaignDomainService' 
    });

    return updatedCampaign;
  }

  async joinCampaign(campaign_id: string, user_id: string): Promise<boolean> {
    const campaign = await this.campaignRepository.findById(campaign_id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const campaignEntity = CampaignEntity.fromData(campaign);

    if (!campaignEntity.canAcceptParticipants()) {
      throw new Error('Campaign cannot accept new participants');
    }

    const isAlreadyParticipant = await this.campaignRepository.isParticipant(campaign_id, user_id);
    if (isAlreadyParticipant) {
      throw new Error('User is already a participant in this campaign');
    }

    const success = await this.campaignRepository.addParticipant(campaign_id, user_id, {
      joinedAt: new Date(),
      role: 'participant'
    });

    if (success) {
      campaignEntity.addParticipant();
      await this.campaignRepository.update(campaign_id, {
        participantCount: campaignEntity.participantCount,
        updated_at: new Date()
      });

      logger.info('User joined campaign', { 
        campaign_id, 
        user_id,
        component: 'CampaignDomainService' 
      });
    }

    return success;
  }

  /**
   * Calculate comprehensive campaign impact metrics
   */
  async calculateCampaignImpact(campaign_id: string): Promise<CampaignMetrics> {
    try {
      const campaign = await this.campaignRepository.findById(campaign_id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Get campaign actions and completions
      const actions = await this.actionRepository.findByCampaign(campaign_id);
      const participants = await this.campaignRepository.getCampaignParticipants(campaign_id);
      
      // Calculate action metrics
      const totalActions = actions.length;
      const completedActions = actions.filter(a => a.status === 'completed').length;
      const completionRate = totalActions > 0 ? completedActions / totalActions : 0;

      // Calculate engagement metrics
      const activeParticipants = participants.filter(p => 
        p.lastActivityAt && new Date(p.lastActivityAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;
      const retentionRate = participants.length > 0 ? activeParticipants / participants.length : 0;

      // Calculate geographic reach
      const countiesReached = new Set(participants.map(p => p.county).filter(Boolean)).size;
      const constituenciesReached = new Set(participants.map(p => p.constituency).filter(Boolean)).size;

      // Calculate impact score
      const impactScore = this.calculateImpactScore({
        completionRate,
        totalActions,
        completedActions
      }, {
        engagementMetrics: { retentionRate },
        geographicDistribution: { countiesReached }
      });

      const metrics: CampaignMetrics = {
        campaign_id,
        participantCount: participants.length,
        actionCompletionRate: completionRate,
        totalActionsCompleted: completedActions,
        engagement_score: retentionRate * 100,
        geographicReach: {
          counties: countiesReached,
          constituencies: constituenciesReached
        },
        impactScore,
        lastCalculated: new Date()
      };

      // Store metrics for historical tracking
      await this.campaignRepository.storeMetrics(campaign_id, metrics);

      return metrics;

    } catch (error) {
      logger.error('Failed to calculate campaign impact', error, { campaign_id });
      throw error;
    }
  }

  /**
   * Identify coalition opportunities with other campaigns
   */
  async identifyCoalitionOpportunities(campaign_id: string): Promise<CoalitionOpportunity[]> {
    try {
      const campaign = await this.campaignRepository.findById(campaign_id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const opportunities: CoalitionOpportunity[] = [];

      // Find campaigns on the same bill
      const sameBillCampaigns = await this.campaignRepository.findByBillId(campaign.bill_id);
      const otherCampaigns = sameBillCampaigns.filter(c => c.id !== campaign_id);

      for (const otherCampaign of otherCampaigns) {
        // Check for alignment in objectives
        const sharedObjectives = campaign.objectives.filter(obj => 
          otherCampaign.objectives.some(otherObj => 
            this.calculateObjectiveSimilarity(obj, otherObj) > 0.7
          )
        );

        if (sharedObjectives.length > 0) {
          opportunities.push({
            campaign_id: otherCampaign.id,
            campaignTitle: otherCampaign.title,
            organizerName: otherCampaign.organizerName || 'Unknown',
            alignmentScore: sharedObjectives.length / Math.max(campaign.objectives.length, otherCampaign.objectives.length),
            sharedObjectives,
            potentialBenefits: [
              'Increased participant pool',
              'Shared resources and expertise',
              'Coordinated action strategies',
              'Enhanced media visibility'
            ],
            recommendedActions: [
              'Schedule coordination meeting',
              'Share action templates',
              'Cross-promote campaigns',
              'Coordinate media outreach'
            ]
          });
        }
      }

      // Find campaigns in same geographic area
      const sameCountyCampaigns = await this.campaignRepository.findByCounty(campaign.targetCounties[0]);
      for (const countyCampaign of sameCountyCampaigns) {
        if (countyCampaign.id !== campaign_id && !opportunities.find(o => o.campaign_id === countyCampaign.id)) {
          opportunities.push({
            campaign_id: countyCampaign.id,
            campaignTitle: countyCampaign.title,
            organizerName: countyCampaign.organizerName || 'Unknown',
            alignmentScore: 0.5, // Geographic alignment
            sharedObjectives: [],
            potentialBenefits: [
              'Local network sharing',
              'Joint community events',
              'Shared local expertise'
            ],
            recommendedActions: [
              'Organize joint community meeting',
              'Share local contact lists',
              'Coordinate local media outreach'
            ]
          });
        }
      }

      return opportunities.sort((a, b) => b.alignmentScore - a.alignmentScore);

    } catch (error) {
      logger.error('Failed to identify coalition opportunities', error, { campaign_id });
      throw error;
    }
  }

  /**
   * Optimize campaign strategy based on performance data
   */
  async optimizeCampaignStrategy(campaign_id: string): Promise<{
    recommendations: string[];
    priorityActions: string[];
    targetAdjustments: Record<string, any>;
  }> {
    try {
      const metrics = await this.calculateCampaignImpact(campaign_id);
      const campaign = await this.campaignRepository.findById(campaign_id);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const recommendations: string[] = [];
      const priorityActions: string[] = [];
      const targetAdjustments: Record<string, any> = {};

      // Analyze completion rates
      if (metrics.actionCompletionRate < 0.6) {
        recommendations.push('Action completion rate is below optimal (60%). Consider simplifying action items or providing better guidance.');
        priorityActions.push('Review and simplify complex actions');
        priorityActions.push('Create step-by-step guides for actions');
        priorityActions.push('Implement peer mentoring system');
      }

      // Analyze engagement
      if (metrics.engagement_score < 50) {
        recommendations.push('Participant engagement is low. Implement strategies to increase interaction and motivation.');
        priorityActions.push('Launch weekly engagement challenges');
        priorityActions.push('Create participant recognition program');
        priorityActions.push('Organize virtual meetups');
      }

      // Analyze geographic reach
      if (metrics.geographicReach.counties < campaign.targetCounties.length * 0.7) {
        recommendations.push('Geographic reach is below target. Expand outreach to underrepresented areas.');
        targetAdjustments.focusCounties = campaign.targetCounties.filter(county => 
          // Logic to identify counties with low participation
          true // Placeholder
        );
        priorityActions.push('Launch targeted outreach in underrepresented counties');
        priorityActions.push('Partner with local organizations');
      }

      // Analyze participant growth
      if (metrics.participantCount < 50) {
        recommendations.push('Participant count is low. Increase recruitment and outreach efforts.');
        priorityActions.push('Launch social media recruitment campaign');
        priorityActions.push('Implement referral incentive program');
        priorityActions.push('Organize community awareness events');
      }

      return {
        recommendations,
        priorityActions,
        targetAdjustments
      };

    } catch (error) {
      logger.error('Failed to optimize campaign strategy', error, { campaign_id });
      throw error;
    }
  }

  /**
   * Coordinate action assignments based on participant skills and availability
   */
  async coordinateActionAssignments(campaign_id: string): Promise<{
    assignments: Array<{
      actionId: string;
      assignedTo: string[];
      reasoning: string;
    }>;
    unassignedActions: string[];
    overloadedParticipants: string[];
  }> {
    try {
      const actions = await this.actionRepository.findByCampaign(campaign_id, { status: 'active' });
      const participants = await this.campaignRepository.getCampaignParticipants(campaign_id);

      const assignments: Array<{
        actionId: string;
        assignedTo: string[];
        reasoning: string;
      }> = [];
      const unassignedActions: string[] = [];
      const overloadedParticipants: string[] = [];

      // Analyze participant workload
      const participantWorkload = new Map<string, number>();
      participants.forEach(p => {
        participantWorkload.set(p.user_id, p.actionsAssigned || 0);
      });

      // Assign actions based on skills and availability
      for (const action of actions) {
        const suitableParticipants = participants.filter(p => {
          // Check skill match
          const hasRequiredSkills = !action.requiredSkills || 
            action.requiredSkills.some(skill => p.offeredSkills?.includes(skill));
          
          // Check availability (not overloaded)
          const currentWorkload = participantWorkload.get(p.user_id) || 0;
          const isAvailable = currentWorkload < 5; // Max 5 active actions per participant

          // Check geographic relevance
          const isGeographicallyRelevant = !action.targetCounties || 
            action.targetCounties.length === 0 ||
            action.targetCounties.includes(p.userCounty);

          return hasRequiredSkills && isAvailable && isGeographicallyRelevant;
        });

        if (suitableParticipants.length > 0) {
          // Assign to best matches (up to 3 participants per action)
          const bestMatches = suitableParticipants
            .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
            .slice(0, 3);

          assignments.push({
            actionId: action.id,
            assignedTo: bestMatches.map(p => p.user_id),
            reasoning: `Assigned based on skill match and engagement score. Skills: ${action.requiredSkills?.join(', ') || 'none required'}`
          });

          // Update workload tracking
          bestMatches.forEach(p => {
            const currentWorkload = participantWorkload.get(p.user_id) || 0;
            participantWorkload.set(p.user_id, currentWorkload + 1);
          });
        } else {
          unassignedActions.push(action.id);
        }
      }

      // Identify overloaded participants
      participantWorkload.forEach((workload, user_id) => {
        if (workload > 7) { // Threshold for overload
          overloadedParticipants.push(user_id);
        }
      });

      return {
        assignments,
        unassignedActions,
        overloadedParticipants
      };

    } catch (error) {
      logger.error('Failed to coordinate action assignments', error, { campaign_id });
      throw error;
    }
  }

  private calculateImpactScore(actionSummary: any, analytics: any): number {
    if (!actionSummary) return 0;
    
    let score = 0;
    
    // Action completion contributes 40% to impact score
    score += (actionSummary.completionRate || 0) * 40;
    
    // Engagement retention contributes 30%
    const engagementRate = analytics?.engagementMetrics?.retentionRate || 0;
    score += engagementRate * 30;
    
    // Geographic reach contributes 20%
    const countyCount = analytics?.geographicDistribution?.countiesReached || 0;
    const reachScore = Math.min(countyCount / 10, 1) * 20;
    score += reachScore;
    
    // Action diversity contributes 10%
    const actionCount = actionSummary.totalActions || 0;
    const diversityScore = Math.min(actionCount / 10, 1) * 10;
    score += diversityScore;
    
    return Math.round(score);
  }

  private calculateObjectiveSimilarity(obj1: string, obj2: string): number {
    // Simple similarity calculation based on common words
    const words1 = obj1.toLowerCase().split(/\s+/);
    const words2 = obj2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }
}
