// ============================================================================
// ARGUMENT INTELLIGENCE - Power Balancer
// ============================================================================
// Ensures minority voices remain visible and prevents coordinated campaigns from drowning out legitimate concerns

import { logger  } from '@shared/core/index.js';

export interface PowerBalancingResult {
  balancedPositions: BalancedStakeholderPosition[];
  coordinatedCampaigns: DetectedCampaign[];
  amplifiedMinorityVoices: MinorityVoice[];
  balancingActions: BalancingAction[];
  equityMetrics: EquityMetrics;
}

export interface BalancedStakeholderPosition {
  stakeholderGroup: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  keyArguments: string[];
  evidenceProvided: string[];
  participantCount: number;
  originalWeight: number;
  adjustedWeight: number;
  balancingReason: string;
  representativenessScore: number;
}

export interface DetectedCampaign {
  id: string;
  campaignType: 'astroturfing' | 'coordinated_messaging' | 'bot_activity' | 'organized_lobbying';
  affectedStakeholders: string[];
  suspiciousPatterns: SuspiciousPattern[];
  confidence: number;
  recommendedAction: 'flag' | 'downweight' | 'investigate' | 'exclude';
  detectedAt: Date;
}

export interface SuspiciousPattern {
  pattern: string;
  description: string;
  evidence: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface MinorityVoice {
  stakeholderGroup: string;
  originalParticipation: number;
  amplificationFactor: number;
  amplificationReason: string;
  keyUniqueConcerns: string[];
  representedDemographics: string[];
}

export interface BalancingAction {
  action: 'amplify_minority' | 'downweight_majority' | 'flag_coordination' | 'highlight_unique_perspective';
  stakeholderGroup: string;
  justification: string;
  impact: number; // 0-100
}

export interface EquityMetrics {
  demographicRepresentation: Map<string, number>;
  geographicDistribution: Map<string, number>;
  organizationalBalance: {
    individual_citizens: number;
    civil_society: number;
    private_sector: number;
    government_affiliated: number;
  };
  voiceEquityScore: number; // 0-100
  marginalizationRisk: string[]; // Groups at risk of being marginalized
}

export interface StakeholderPosition {
  stakeholderGroup: string;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  keyArguments: string[];
  evidenceProvided: string[];
  participantCount: number;
  demographics?: {
    geographicDistribution: Map<string, number>;
    occupationalBreakdown: Map<string, number>;
    organizationalAffiliations: string[];
  };
}

export interface ArgumentData {
  id: string;
  text: string;
  user_id: string;
  submissionTime: Date;
  userDemographics?: {
    county?: string;
    ageGroup?: string;
    occupation?: string;
    organizationAffiliation?: string;
  };
  submissionContext?: {
    submissionMethod: 'web' | 'ussd' | 'ambassador' | 'api';
    session_id?: string;
    ipAddress?: string;
  };
}

export class PowerBalancerService {
  private readonly coordinationDetectionThreshold = 0.7;
  private readonly minorityAmplificationThreshold = 0.1; // Groups with <10% participation
  private readonly maxAmplificationFactor = 3.0;

  constructor() {}

  /**
   * Balance stakeholder voices to ensure equitable representation
   */
  async balanceStakeholderVoices(
    stakeholderPositions: StakeholderPosition[],
    argumentData: ArgumentData[]
  ): Promise<PowerBalancingResult> {
    try {
      logger.info(`⚖️ Balancing stakeholder voices`, {
        component: 'PowerBalancer',
        stakeholderCount: stakeholderPositions.length,
        argumentCount: argumentData.length
      });

      // Step 1: Detect coordinated campaigns
      const coordinatedCampaigns = await this.detectCoordinatedCampaigns(argumentData);

      // Step 2: Identify minority voices that need amplification
      const minorityVoices = this.identifyMinorityVoices(stakeholderPositions);

      // Step 3: Calculate equity metrics
      const equityMetrics = this.calculateEquityMetrics(stakeholderPositions, argumentData);

      // Step 4: Apply balancing adjustments
      const balancingActions = this.generateBalancingActions(
        stakeholderPositions,
        coordinatedCampaigns,
        minorityVoices,
        equityMetrics
      );

      // Step 5: Create balanced stakeholder positions
      const balancedPositions = this.applyBalancingAdjustments(
        stakeholderPositions,
        balancingActions,
        coordinatedCampaigns
      );

      const result: PowerBalancingResult = {
        balancedPositions,
        coordinatedCampaigns,
        amplifiedMinorityVoices: minorityVoices,
        balancingActions,
        equityMetrics
      };

      logger.info(`✅ Power balancing completed`, {
        component: 'PowerBalancer',
        campaignsDetected: coordinatedCampaigns.length,
        minorityVoicesAmplified: minorityVoices.length,
        voiceEquityScore: equityMetrics.voiceEquityScore
      });

      return result;

    } catch (error) {
      logger.error(`❌ Power balancing failed`, {
        component: 'PowerBalancer',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Detect astroturfing and coordinated inauthentic behavior
   */
  async detectAstroturfing(argumentData: ArgumentData[]): Promise<DetectedCampaign[]> {
    const campaigns: DetectedCampaign[] = [];

    // Pattern 1: Identical or near-identical messages
    const duplicateMessages = this.findDuplicateMessages(argumentData);
    if (duplicateMessages.length > 0) {
      campaigns.push({
        id: crypto.randomUUID(),
        campaignType: 'coordinated_messaging',
        affectedStakeholders: this.extractStakeholdersFromArguments(duplicateMessages),
        suspiciousPatterns: [{
          pattern: 'duplicate_messages',
          description: 'Multiple users submitted identical or near-identical messages',
          evidence: duplicateMessages.map(arg => `User ${arg.user_id}: "${arg.text.substring(0, 100)}..."`),
          severity: 'high'
        }],
        confidence: 90,
        recommendedAction: 'downweight',
        detectedAt: new Date()
      });
    }

    // Pattern 2: Suspicious timing patterns
    const timingAnomalies = this.detectTimingAnomalies(argumentData);
    if (timingAnomalies.suspiciousGroups.length > 0) {
      campaigns.push({
        id: crypto.randomUUID(),
        campaignType: 'coordinated_messaging',
        affectedStakeholders: timingAnomalies.suspiciousGroups,
        suspiciousPatterns: [{
          pattern: 'coordinated_timing',
          description: 'Unusual clustering of submissions in short time windows',
          evidence: timingAnomalies.evidence,
          severity: 'medium'
        }],
        confidence: 70,
        recommendedAction: 'flag',
        detectedAt: new Date()
      });
    }

    // Pattern 3: Bot-like behavior
    const botBehavior = this.detectBotBehavior(argumentData);
    if (botBehavior.length > 0) {
      campaigns.push({
        id: crypto.randomUUID(),
        campaignType: 'bot_activity',
        affectedStakeholders: this.extractStakeholdersFromArguments(botBehavior),
        suspiciousPatterns: [{
          pattern: 'bot_behavior',
          description: 'Submissions show patterns consistent with automated generation',
          evidence: botBehavior.map(arg => `User ${arg.user_id}: Suspicious patterns detected`),
          severity: 'high'
        }],
        confidence: 85,
        recommendedAction: 'exclude',
        detectedAt: new Date()
      });
    }

    return campaigns;
  }

  /**
   * Ensure marginalized communities remain visible
   */
  async amplifyMarginizedVoices(
    stakeholderPositions: StakeholderPosition[],
    marginalizationCriteria: {
      minParticipationThreshold: number;
      protectedGroups: string[];
      geographicPriority: string[];
    }
  ): Promise<MinorityVoice[]> {
    const amplifiedVoices: MinorityVoice[] = [];

    for (const position of stakeholderPositions) {
      const shouldAmplify = this.shouldAmplifyVoice(position, marginalizationCriteria);
      
      if (shouldAmplify.amplify) {
        amplifiedVoices.push({
          stakeholderGroup: position.stakeholderGroup,
          originalParticipation: position.participantCount,
          amplificationFactor: shouldAmplify.factor,
          amplificationReason: shouldAmplify.reason,
          keyUniqueConcerns: this.identifyUniqueConcerns(position, stakeholderPositions),
          representedDemographics: this.extractDemographics(position)
        });
      }
    }

    return amplifiedVoices;
  }

  // Private helper methods

  private async detectCoordinatedCampaigns(argumentData: ArgumentData[]): Promise<DetectedCampaign[]> {
    const campaigns: DetectedCampaign[] = [];

    // Detect astroturfing
    const astroturfingCampaigns = await this.detectAstroturfing(argumentData);
    campaigns.push(...astroturfingCampaigns);

    // Detect organized lobbying
    const lobbyingCampaigns = this.detectOrganizedLobbying(argumentData);
    campaigns.push(...lobbyingCampaigns);

    return campaigns;
  }

  private findDuplicateMessages(argumentData: ArgumentData[]): ArgumentData[] {
    const messageGroups = new Map<string, ArgumentData[]>();
    
    // Group by normalized message content
    argumentData.forEach(arg => {
      const normalized = this.normalizeMessageForComparison(arg.text);
      if (!messageGroups.has(normalized)) {
        messageGroups.set(normalized, []);
      }
      messageGroups.get(normalized)!.push(arg);
    });

    // Find groups with multiple identical messages
    const duplicates: ArgumentData[] = [];
    messageGroups.forEach(group => {
      if (group.length > 1) {
        duplicates.push(...group);
      }
    });

    return duplicates;
  }

  private normalizeMessageForComparison(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private detectTimingAnomalies(argumentData: ArgumentData[]): {
    suspiciousGroups: string[];
    evidence: string[];
  } {
    const timeWindows = new Map<string, ArgumentData[]>();
    const windowSize = 5 * 60 * 1000; // 5 minutes

    // Group submissions by time windows
    argumentData.forEach(arg => {
      const windowStart = Math.floor(arg.submissionTime.getTime() / windowSize) * windowSize;
      const windowKey = windowStart.toString();
      
      if (!timeWindows.has(windowKey)) {
        timeWindows.set(windowKey, []);
      }
      timeWindows.get(windowKey)!.push(arg);
    });

    const suspiciousGroups: string[] = [];
    const evidence: string[] = [];

    // Find windows with unusually high activity
    const avgWindowSize = argumentData.length / timeWindows.size;
    const threshold = avgWindowSize * 3; // 3x average is suspicious

    timeWindows.forEach((args, windowKey) => {
      if (args.length > threshold) {
        const uniqueUsers = new Set(args.map(a => a.user_id)).size;
        const userToSubmissionRatio = args.length / uniqueUsers;
        
        if (userToSubmissionRatio > 2) { // Multiple submissions per user in short window
          const stakeholders = this.extractStakeholdersFromArguments(args);
          suspiciousGroups.push(...stakeholders);
          evidence.push(`${args.length} submissions from ${uniqueUsers} users in 5-minute window`);
        }
      }
    });

    return { suspiciousGroups: [...new Set(suspiciousGroups)], evidence };
  }

  private detectBotBehavior(argumentData: ArgumentData[]): ArgumentData[] {
    const suspicious: ArgumentData[] = [];

    argumentData.forEach(arg => {
      let suspicionScore = 0;

      // Check for bot-like patterns
      if (this.hasRepetitiveStructure(arg.text)) suspicionScore += 30;
      if (this.hasUnusualLanguagePatterns(arg.text)) suspicionScore += 25;
      if (this.hasGenericContent(arg.text)) suspicionScore += 20;
      if (this.hasTimingPatterns(arg, argumentData)) suspicionScore += 25;

      if (suspicionScore > 50) {
        suspicious.push(arg);
      }
    });

    return suspicious;
  }

  private hasRepetitiveStructure(text: string): boolean {
    // Check for repetitive sentence structures
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) return false;

    const structures = sentences.map(s => this.extractSentenceStructure(s));
    const uniqueStructures = new Set(structures);
    
    return uniqueStructures.size < sentences.length * 0.7; // Less than 70% unique structures
  }

  private extractSentenceStructure(sentence: string): string {
    // Simplified structure extraction - replace specific words with placeholders
    return sentence
      .toLowerCase()
      .replace(/\b\d+\b/g, 'NUM')
      .replace(/\b[a-z]+ing\b/g, 'VERB_ING')
      .replace(/\b[a-z]+ed\b/g, 'VERB_ED')
      .replace(/\b[a-z]+s\b/g, 'PLURAL')
      .split(' ')
      .slice(0, 5) // First 5 words for structure
      .join(' ');
  }

  private hasUnusualLanguagePatterns(text: string): boolean {
    // Check for patterns common in generated text
    const suspiciousPatterns = [
      /as an? (ai|language model|assistant)/i,
      /i (cannot|can't|am unable to)/i,
      /it is important to (note|consider|remember)/i,
      /in (conclusion|summary)/i,
      /please (note|consider|be aware)/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private hasGenericContent(text: string): boolean {
    // Check for overly generic or template-like content
    const genericPhrases = [
      'i support this bill',
      'i oppose this bill',
      'this is important',
      'please consider',
      'thank you for your time'
    ];

    const lowerText = text.toLowerCase();
    const genericCount = genericPhrases.filter(phrase => lowerText.includes(phrase)).length;
    
    return genericCount > 2 || (text.length < 100 && genericCount > 0);
  }

  private hasTimingPatterns(arg: ArgumentData, allArgs: ArgumentData[]): boolean {
    // Check if this user has suspicious timing patterns
    const userArgs = allArgs.filter(a => a.user_id === arg.user_id);
    if (userArgs.length < 2) return false;

    // Check for submissions at exact intervals
    const intervals = [];
    for (let i = 1; i < userArgs.length; i++) {
      const interval = userArgs[i].submissionTime.getTime() - userArgs[i-1].submissionTime.getTime();
      intervals.push(interval);
    }

    // Suspicious if intervals are too regular (within 10% variance)
    if (intervals.length > 1) {
      const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      
      return stdDev < avgInterval * 0.1; // Very low variance suggests automation
    }

    return false;
  }

  private detectOrganizedLobbying(argumentData: ArgumentData[]): DetectedCampaign[] {
    const campaigns: DetectedCampaign[] = [];

    // Group by organization affiliation
    const orgGroups = new Map<string, ArgumentData[]>();
    argumentData.forEach(arg => {
      const org = arg.userDemographics?.organizationAffiliation;
      if (org) {
        if (!orgGroups.has(org)) {
          orgGroups.set(org, []);
        }
        orgGroups.get(org)!.push(arg);
      }
    });

    // Check for coordinated organizational campaigns
    orgGroups.forEach((args, org) => {
      if (args.length > 10) { // Threshold for organized campaign
        const messageSimilarity = this.calculateMessageSimilarity(args);
        if (messageSimilarity > 0.8) {
          campaigns.push({
            id: crypto.randomUUID(),
            campaignType: 'organized_lobbying',
            affectedStakeholders: [org],
            suspiciousPatterns: [{
              pattern: 'coordinated_organizational_messaging',
              description: `High similarity in messages from ${org} members`,
              evidence: [`${args.length} submissions from ${org}`, `Message similarity: ${Math.round(messageSimilarity * 100)}%`],
              severity: 'medium'
            }],
            confidence: 75,
            recommendedAction: 'flag',
            detectedAt: new Date()
          });
        }
      }
    });

    return campaigns;
  }

  private calculateMessageSimilarity(args: ArgumentData[]): number {
    if (args.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < args.length; i++) {
      for (let j = i + 1; j < args.length; j++) {
        const similarity = this.calculateTextSimilarity(args[i].text, args[j].text);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private extractStakeholdersFromArguments(args: ArgumentData[]): string[] {
    const stakeholders = new Set<string>();
    
    args.forEach(arg => {
      if (arg.userDemographics?.occupation) {
        stakeholders.add(arg.userDemographics.occupation);
      }
      if (arg.userDemographics?.organizationAffiliation) {
        stakeholders.add(arg.userDemographics.organizationAffiliation);
      }
    });

    return Array.from(stakeholders);
  }

  private identifyMinorityVoices(stakeholderPositions: StakeholderPosition[]): MinorityVoice[] {
    const totalParticipants = stakeholderPositions.reduce((sum, pos) => sum + pos.participantCount, 0);
    const minorityVoices: MinorityVoice[] = [];

    stakeholderPositions.forEach(position => {
      const participationRatio = position.participantCount / totalParticipants;
      
      if (participationRatio < this.minorityAmplificationThreshold) {
        const amplificationFactor = Math.min(
          this.maxAmplificationFactor,
          this.minorityAmplificationThreshold / participationRatio
        );

        minorityVoices.push({
          stakeholderGroup: position.stakeholderGroup,
          originalParticipation: position.participantCount,
          amplificationFactor,
          amplificationReason: `Low participation (${Math.round(participationRatio * 100)}% of total)`,
          keyUniqueConcerns: this.identifyUniqueConcerns(position, stakeholderPositions),
          representedDemographics: this.extractDemographics(position)
        });
      }
    });

    return minorityVoices;
  }

  private identifyUniqueConcerns(
    position: StakeholderPosition,
    allPositions: StakeholderPosition[]
  ): string[] {
    const otherArguments = allPositions
      .filter(p => p.stakeholderGroup !== position.stakeholderGroup)
      .flatMap(p => p.keyArguments);

    return position.keyArguments.filter(arg => 
      !otherArguments.some(otherArg => 
        this.calculateTextSimilarity(arg, otherArg) > 0.7
      )
    );
  }

  private extractDemographics(position: StakeholderPosition): string[] {
    const demographics: string[] = [];
    
    if (position.demographics) {
      // Add geographic representation
      const topCounties = Array.from(position.demographics.geographicDistribution.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([county]) => county);
      demographics.push(...topCounties);

      // Add occupational representation
      const topOccupations = Array.from(position.demographics.occupationalBreakdown.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([occupation]) => occupation);
      demographics.push(...topOccupations);
    }

    return demographics;
  }

  private calculateEquityMetrics(
    stakeholderPositions: StakeholderPosition[],
    argumentData: ArgumentData[]
  ): EquityMetrics {
    const demographicRepresentation = new Map<string, number>();
    const geographicDistribution = new Map<string, number>();
    const organizationalBalance = {
      individual_citizens: 0,
      civil_society: 0,
      private_sector: 0,
      government_affiliated: 0
    };

    // Calculate demographic representation
    argumentData.forEach(arg => {
      if (arg.userDemographics) {
        const demo = arg.userDemographics;
        
        if (demo.ageGroup) {
          demographicRepresentation.set(demo.ageGroup, 
            (demographicRepresentation.get(demo.ageGroup) || 0) + 1);
        }
        
        if (demo.county) {
          geographicDistribution.set(demo.county,
            (geographicDistribution.get(demo.county) || 0) + 1);
        }

        // Categorize organizational affiliation
        if (demo.organizationAffiliation) {
          const org = demo.organizationAffiliation.toLowerCase();
          if (org.includes('government') || org.includes('ministry')) {
            organizationalBalance.government_affiliated++;
          } else if (org.includes('company') || org.includes('corporation') || org.includes('business')) {
            organizationalBalance.private_sector++;
          } else if (org.includes('ngo') || org.includes('organization') || org.includes('society')) {
            organizationalBalance.civil_society++;
          }
        } else {
          organizationalBalance.individual_citizens++;
        }
      }
    });

    // Calculate voice equity score
    const voiceEquityScore = this.calculateVoiceEquityScore(
      demographicRepresentation,
      geographicDistribution,
      organizationalBalance
    );

    // Identify marginalization risks
    const marginalizationRisk = this.identifyMarginalizationRisks(
      stakeholderPositions,
      demographicRepresentation,
      geographicDistribution
    );

    return {
      demographicRepresentation,
      geographicDistribution,
      organizationalBalance,
      voiceEquityScore,
      marginalizationRisk
    };
  }

  private calculateVoiceEquityScore(
    demographicRep: Map<string, number>,
    geographicDist: Map<string, number>,
    orgBalance: EquityMetrics['organizationalBalance']
  ): number {
    let score = 100;

    // Penalize for demographic imbalances
    const demographicEntropy = this.calculateEntropy(Array.from(demographicRep.values()));
    score -= (1 - demographicEntropy) * 20;

    // Penalize for geographic concentration
    const geographicEntropy = this.calculateEntropy(Array.from(geographicDist.values()));
    score -= (1 - geographicEntropy) * 15;

    // Penalize for organizational imbalances
    const orgValues = Object.values(orgBalance);
    const totalOrg = orgValues.reduce((sum, val) => sum + val, 0);
    if (totalOrg > 0) {
      const orgProportions = orgValues.map(val => val / totalOrg);
      const orgEntropy = this.calculateEntropy(orgProportions.map(p => p * totalOrg));
      score -= (1 - orgEntropy) * 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateEntropy(values: number[]): number {
    const total = values.reduce((sum, val) => sum + val, 0);
    if (total === 0) return 0;

    const probabilities = values.map(val => val / total).filter(p => p > 0);
    const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p), 0);
    const maxEntropy = Math.log2(probabilities.length);
    
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private identifyMarginalizationRisks(
    stakeholderPositions: StakeholderPosition[],
    demographicRep: Map<string, number>,
    geographicDist: Map<string, number>
  ): string[] {
    const risks: string[] = [];

    // Check for underrepresented groups
    const totalParticipants = stakeholderPositions.reduce((sum, pos) => sum + pos.participantCount, 0);
    
    stakeholderPositions.forEach(position => {
      const participationRatio = position.participantCount / totalParticipants;
      if (participationRatio < 0.05) { // Less than 5% participation
        risks.push(`${position.stakeholderGroup} severely underrepresented (${Math.round(participationRatio * 100)}%)`);
      }
    });

    // Check for geographic marginalization
    const ruralCounties = ['Turkana', 'Marsabit', 'Mandera', 'Wajir', 'Garissa']; // Example rural counties
    const ruralParticipation = ruralCounties.reduce((sum, county) => 
      sum + (geographicDist.get(county) || 0), 0);
    const ruralRatio = ruralParticipation / Array.from(geographicDist.values()).reduce((sum, val) => sum + val, 0);
    
    if (ruralRatio < 0.15) { // Less than 15% from rural areas
      risks.push('Rural communities underrepresented in participation');
    }

    return risks;
  }

  private generateBalancingActions(
    stakeholderPositions: StakeholderPosition[],
    coordinatedCampaigns: DetectedCampaign[],
    minorityVoices: MinorityVoice[],
    equityMetrics: EquityMetrics
  ): BalancingAction[] {
    const actions: BalancingAction[] = [];

    // Actions for coordinated campaigns
    coordinatedCampaigns.forEach(campaign => {
      campaign.affectedStakeholders.forEach(stakeholder => {
        actions.push({
          action: 'flag_coordination',
          stakeholderGroup: stakeholder,
          justification: `Detected ${campaign.campaignType} with ${campaign.confidence}% confidence`,
          impact: campaign.confidence
        });
      });
    });

    // Actions for minority voices
    minorityVoices.forEach(voice => {
      actions.push({
        action: 'amplify_minority',
        stakeholderGroup: voice.stakeholderGroup,
        justification: voice.amplificationReason,
        impact: Math.round((voice.amplificationFactor - 1) * 100)
      });
    });

    // Actions based on equity metrics
    if (equityMetrics.voiceEquityScore < 60) {
      const dominantGroups = stakeholderPositions
        .filter(pos => pos.participantCount > stakeholderPositions.reduce((sum, p) => sum + p.participantCount, 0) * 0.3)
        .map(pos => pos.stakeholderGroup);

      dominantGroups.forEach(group => {
        actions.push({
          action: 'downweight_majority',
          stakeholderGroup: group,
          justification: 'Dominant participation may overshadow minority voices',
          impact: 20
        });
      });
    }

    return actions;
  }

  private applyBalancingAdjustments(
    stakeholderPositions: StakeholderPosition[],
    balancingActions: BalancingAction[],
    coordinatedCampaigns: DetectedCampaign[]
  ): BalancedStakeholderPosition[] {
    return stakeholderPositions.map(position => {
      const relevantActions = balancingActions.filter(action => 
        action.stakeholderGroup === position.stakeholderGroup
      );

      let adjustedWeight = 1.0; // Default weight
      let balancingReason = 'No adjustments applied';

      relevantActions.forEach(action => {
        switch (action.action) {
          case 'amplify_minority':
            adjustedWeight *= 1 + (action.impact / 100);
            balancingReason = `Amplified due to: ${action.justification}`;
            break;
          case 'downweight_majority':
            adjustedWeight *= 1 - (action.impact / 200); // Smaller reduction
            balancingReason = `Downweighted due to: ${action.justification}`;
            break;
          case 'flag_coordination':
            adjustedWeight *= 0.5; // Significant reduction for coordinated campaigns
            balancingReason = `Flagged for coordination: ${action.justification}`;
            break;
        }
      });

      // Calculate representativeness score
      const representativenessScore = this.calculateRepresentativenessScore(
        position,
        coordinatedCampaigns
      );

      return {
        stakeholderGroup: position.stakeholderGroup,
        position: position.position,
        keyArguments: position.keyArguments,
        evidenceProvided: position.evidenceProvided,
        participantCount: position.participantCount,
        originalWeight: 1.0,
        adjustedWeight,
        balancingReason,
        representativenessScore
      };
    });
  }

  private calculateRepresentativenessScore(
    position: StakeholderPosition,
    coordinatedCampaigns: DetectedCampaign[]
  ): number {
    let score = 100;

    // Penalize if involved in coordinated campaigns
    const involvedCampaigns = coordinatedCampaigns.filter(campaign =>
      campaign.affectedStakeholders.includes(position.stakeholderGroup)
    );

    involvedCampaigns.forEach(campaign => {
      score -= campaign.confidence * 0.5;
    });

    // Boost for evidence provision
    if (position.evidenceProvided.length > 0) {
      score += Math.min(20, position.evidenceProvided.length * 5);
    }

    // Boost for diverse arguments
    if (position.keyArguments.length > 3) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private shouldAmplifyVoice(
    position: StakeholderPosition,
    criteria: {
      minParticipationThreshold: number;
      protectedGroups: string[];
      geographicPriority: string[];
    }
  ): { amplify: boolean; factor: number; reason: string } {
    const totalParticipants = 1000; // Would calculate from all positions
    const participationRatio = position.participantCount / totalParticipants;

    // Check if below participation threshold
    if (participationRatio < criteria.minParticipationThreshold) {
      const factor = Math.min(
        this.maxAmplificationFactor,
        criteria.minParticipationThreshold / participationRatio
      );
      return {
        amplify: true,
        factor,
        reason: `Low participation rate (${Math.round(participationRatio * 100)}%)`
      };
    }

    // Check if protected group
    if (criteria.protectedGroups.some(group => 
      position.stakeholderGroup.toLowerCase().includes(group.toLowerCase())
    )) {
      return {
        amplify: true,
        factor: 1.5,
        reason: 'Protected/marginalized group'
      };
    }

    // Check geographic priority
    if (position.demographics) {
      const hasGeographicPriority = criteria.geographicPriority.some(county =>
        position.demographics!.geographicDistribution.has(county)
      );
      
      if (hasGeographicPriority) {
        return {
          amplify: true,
          factor: 1.3,
          reason: 'Geographic priority area representation'
        };
      }
    }

    return { amplify: false, factor: 1.0, reason: 'No amplification needed' };
  }
}
