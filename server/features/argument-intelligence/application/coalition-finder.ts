// ============================================================================
// ARGUMENT INTELLIGENCE - Coalition Finder
// ============================================================================
// Identifies potential coalitions based on shared concerns and compatible positions

import { logger  } from '@shared/core';
import { SimilarityCalculator } from '@shared/infrastructure/nlp/similarity-calculator.js';

export interface CoalitionMatch {
  stakeholderGroup: string;
  similarityScore: number;
  sharedConcerns: string[];
  potentialAlliance: boolean;
  compatibilityFactors: CompatibilityFactor[];
  recommendedActions: string[];
}

export interface CompatibilityFactor {
  factor: string;
  weight: number;
  description: string;
  supportingEvidence: string[];
}

export interface StakeholderProfile {
  group: string;
  primaryConcerns: string[];
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  keyArguments: string[];
  demographics: {
    geographicDistribution: Map<string, number>;
    occupationalBreakdown: Map<string, number>;
    organizationalAffiliations: string[];
  };
  participationLevel: number;
  influenceScore: number;
}

export interface CoalitionOpportunity {
  id: string;
  name: string;
  stakeholderGroups: string[];
  sharedObjectives: string[];
  potentialImpact: number;
  feasibilityScore: number;
  recommendedStrategy: CoalitionStrategy;
  identifiedAt: Date;
  bill_id: string;
}

export interface CoalitionStrategy {
  approachType: 'unified_position' | 'complementary_concerns' | 'tactical_alliance';
  keyMessages: string[];
  targetAudience: string[];
  recommendedActions: string[];
  potentialChallenges: string[];
  successMetrics: string[];
}

export interface UserDemographics {
  county?: string;
  ageGroup?: string;
  occupation?: string;
  organizationAffiliation?: string;
}

export class CoalitionFinderService {
  constructor(
    private readonly similarityCalculator: SimilarityCalculator
  ) {}

  /**
   * Find potential coalitions for extracted arguments
   */
  async findPotentialCoalitions(
    arguments: unknown[],
    userDemographics?: UserDemographics
  ): Promise<CoalitionMatch[]> {
    try {
      logger.info(`🤝 Finding potential coalitions`, {
        component: 'CoalitionFinder',
        argumentCount: arguments.length
      });

      // Step 1: Build stakeholder profiles from arguments
      const stakeholderProfiles = await this.buildStakeholderProfiles(arguments);

      // Step 2: Identify shared concerns across stakeholders
      const sharedConcerns = await this.identifySharedConcerns(stakeholderProfiles);

      // Step 3: Calculate compatibility between stakeholder groups
      const coalitionMatches = await this.calculateStakeholderCompatibility(
        stakeholderProfiles,
        sharedConcerns,
        userDemographics
      );

      // Step 4: Filter and rank potential coalitions
      const viableCoalitions = this.filterViableCoalitions(coalitionMatches);

      logger.info(`✅ Coalition finding completed`, {
        component: 'CoalitionFinder',
        coalitionsFound: viableCoalitions.length
      });

      return viableCoalitions;

    } catch (error) {
      logger.error(`❌ Coalition finding failed`, {
        component: 'CoalitionFinder',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Discover coalition opportunities for a bill
   */
  async discoverCoalitionOpportunities(
    bill_id: string,
    stakeholderProfiles: StakeholderProfile[]
  ): Promise<CoalitionOpportunity[]> {
    try {
      logger.info(`🔍 Discovering coalition opportunities`, {
        component: 'CoalitionFinder',
        bill_id,
        stakeholderCount: stakeholderProfiles.length
      });

      const opportunities: CoalitionOpportunity[] = [];

      // Find groups with aligned positions
      const alignedGroups = this.findAlignedStakeholders(stakeholderProfiles);

      // Find groups with complementary concerns
      const complementaryGroups = await this.findComplementaryStakeholders(stakeholderProfiles);

      // Create coalition opportunities
      for (const alignment of alignedGroups) {
        const opportunity = await this.createCoalitionOpportunity(
          bill_id,
          alignment.stakeholders,
          'unified_position',
          alignment.sharedObjectives
        );
        opportunities.push(opportunity);
      }

      for (const complement of complementaryGroups) {
        const opportunity = await this.createCoalitionOpportunity(
          bill_id,
          complement.stakeholders,
          'complementary_concerns',
          complement.sharedObjectives
        );
        opportunities.push(opportunity);
      }

      // Rank opportunities by potential impact
      const rankedOpportunities = opportunities.sort((a, b) => 
        (b.potentialImpact * b.feasibilityScore) - (a.potentialImpact * a.feasibilityScore)
      );

      logger.info(`✅ Coalition opportunity discovery completed`, {
        component: 'CoalitionFinder',
        bill_id,
        opportunitiesFound: rankedOpportunities.length
      });

      return rankedOpportunities;

    } catch (error) {
      logger.error(`❌ Coalition opportunity discovery failed`, {
        component: 'CoalitionFinder',
        bill_id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Analyze coalition compatibility between specific stakeholder groups
   */
  async analyzeCoalitionCompatibility(
    group1: StakeholderProfile,
    group2: StakeholderProfile
  ): Promise<{
    compatibilityScore: number;
    sharedConcerns: string[];
    conflictingInterests: string[];
    recommendedApproach: string;
  }> {
    // Calculate concern overlap
    const sharedConcerns = this.findSharedConcerns(group1.primaryConcerns, group2.primaryConcerns);
    
    // Calculate position compatibility
    const positionCompatibility = this.calculatePositionCompatibility(group1.position, group2.position);
    
    // Calculate demographic overlap
    const demographicCompatibility = this.calculateDemographicCompatibility(
      group1.demographics,
      group2.demographics
    );

    // Calculate argument similarity
    const argumentSimilarity = await this.calculateArgumentSimilarity(
      group1.keyArguments,
      group2.keyArguments
    );

    // Overall compatibility score
    const compatibilityScore = (
      (sharedConcerns.length / Math.max(group1.primaryConcerns.length, group2.primaryConcerns.length)) * 0.4 +
      positionCompatibility * 0.3 +
      demographicCompatibility * 0.15 +
      argumentSimilarity * 0.15
    );

    // Identify conflicting interests
    const conflictingInterests = this.identifyConflictingInterests(group1, group2);

    // Recommend approach
    const recommendedApproach = this.recommendCoalitionApproach(
      compatibilityScore,
      sharedConcerns,
      conflictingInterests
    );

    return {
      compatibilityScore,
      sharedConcerns,
      conflictingInterests,
      recommendedApproach
    };
  }

  // Private helper methods

  private async buildStakeholderProfiles(arguments: unknown[]): Promise<StakeholderProfile[]> {
    const stakeholderMap = new Map<string, unknown[]>();

    // Group arguments by stakeholder
    arguments.forEach(arg => {
      arg.affectedGroups?.forEach((group: string) => {
        if (!stakeholderMap.has(group)) {
          stakeholderMap.set(group, []);
        }
        stakeholderMap.get(group)!.push(arg);
      });
    });

    const profiles: StakeholderProfile[] = [];

    for (const [group, groupArgs] of stakeholderMap.entries()) {
      const profile = await this.createStakeholderProfile(group, groupArgs);
      profiles.push(profile);
    }

    return profiles;
  }

  private async createStakeholderProfile(group: string, arguments: unknown[]): Promise<StakeholderProfile> {
    // Extract primary concerns
    const primaryConcerns = this.extractPrimaryConcerns(arguments);

    // Determine overall position
    const position = this.determineGroupPosition(arguments);

    // Extract key arguments
    const keyArguments = this.extractKeyArguments(arguments);

    // Build demographics
    const demographics = this.buildDemographics(arguments);

    // Calculate participation level
    const participationLevel = this.calculateParticipationLevel(arguments);

    // Calculate influence score
    const influenceScore = this.calculateInfluenceScore(arguments, group);

    return {
      group,
      primaryConcerns,
      position,
      keyArguments,
      demographics,
      participationLevel,
      influenceScore
    };
  }

  private extractPrimaryConcerns(arguments: unknown[]): string[] {
    const concernCounts = new Map<string, number>();

    arguments.forEach(arg => {
      // Extract concerns from argument text
      const concerns = this.extractConcernsFromText(arg.text);
      concerns.forEach(concern => {
        concernCounts.set(concern, (concernCounts.get(concern) || 0) + 1);
      });
    });

    return Array.from(concernCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([concern]) => concern);
  }

  private extractConcernsFromText(text: string): string[] {
    const concerns: string[] = [];
    const lowerText = text.toLowerCase();

    // Common concern patterns
    const concernPatterns = {
      'economic_impact': ['cost', 'expensive', 'budget', 'financial', 'economic'],
      'job_security': ['jobs', 'employment', 'unemployment', 'workers'],
      'healthcare': ['health', 'medical', 'hospital', 'treatment'],
      'education': ['school', 'education', 'students', 'learning'],
      'environment': ['environment', 'pollution', 'climate', 'green'],
      'safety': ['safety', 'security', 'dangerous', 'risk'],
      'fairness': ['fair', 'unfair', 'equality', 'discrimination'],
      'transparency': ['transparent', 'accountability', 'corruption']
    };

    for (const [concern, keywords] of Object.entries(concernPatterns)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        concerns.push(concern);
      }
    }

    return concerns;
  }

  private determineGroupPosition(arguments: unknown[]): 'support' | 'oppose' | 'neutral' | 'conditional' {
    const positions = arguments.map(arg => arg.position || 'neutral');
    const supportCount = positions.filter(p => p === 'support').length;
    const opposeCount = positions.filter(p => p === 'oppose').length;
    const conditionalCount = positions.filter(p => p === 'conditional').length;

    const total = positions.length;
    if (supportCount > total * 0.6) return 'support';
    if (opposeCount > total * 0.6) return 'oppose';
    if (conditionalCount > total * 0.4) return 'conditional';
    return 'neutral';
  }

  private extractKeyArguments(arguments: unknown[]): string[] {
    return arguments
      .filter(arg => arg.type === 'claim' && arg.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(arg => arg.normalizedText);
  }

  private buildDemographics(arguments: unknown[]): StakeholderProfile['demographics'] {
    const geographicDistribution = new Map<string, number>();
    const occupationalBreakdown = new Map<string, number>();
    const organizationalAffiliations: string[] = [];

    arguments.forEach(arg => {
      if (arg.userDemographics) {
        const demo = arg.userDemographics;
        
        if (demo.county) {
          geographicDistribution.set(demo.county, 
            (geographicDistribution.get(demo.county) || 0) + 1);
        }
        
        if (demo.occupation) {
          occupationalBreakdown.set(demo.occupation,
            (occupationalBreakdown.get(demo.occupation) || 0) + 1);
        }
        
        if (demo.organizationAffiliation && 
            !organizationalAffiliations.includes(demo.organizationAffiliation)) {
          organizationalAffiliations.push(demo.organizationAffiliation);
        }
      }
    });

    return {
      geographicDistribution,
      occupationalBreakdown,
      organizationalAffiliations
    };
  }

  private calculateParticipationLevel(arguments: unknown[]): number {
    const uniqueUsers = new Set(arguments.map(arg => arg.user_id)).size;
    const totalArguments = arguments.length;
    
    // Normalize participation level (0-100)
    return Math.min(100, (uniqueUsers * 10) + (totalArguments * 2));
  }

  private calculateInfluenceScore(arguments: unknown[], group: string): number {
    let score = 50; // Base score

    // Boost for organized groups
    const organizationalAffiliations = arguments
      .map(arg => arg.userDemographics?.organizationAffiliation)
      .filter(Boolean);
    
    if (organizationalAffiliations.length > 0) {
      score += 20;
    }

    // Boost for evidence-backed arguments
    const evidenceCount = arguments.filter(arg => arg.evidenceQuality !== 'none').length;
    score += Math.min(20, evidenceCount * 2);

    // Boost for high-confidence arguments
    const avgConfidence = arguments.reduce((sum, arg) => sum + (arg.confidence || 0.5), 0) / arguments.length;
    score += (avgConfidence - 0.5) * 20;

    return Math.min(100, score);
  }

  private async identifySharedConcerns(profiles: StakeholderProfile[]): Promise<Map<string, string[]>> {
    const sharedConcerns = new Map<string, string[]>();

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const profile1 = profiles[i];
        const profile2 = profiles[j];
        
        const shared = this.findSharedConcerns(profile1.primaryConcerns, profile2.primaryConcerns);
        if (shared.length > 0) {
          const key = `${profile1.group}|${profile2.group}`;
          sharedConcerns.set(key, shared);
        }
      }
    }

    return sharedConcerns;
  }

  private findSharedConcerns(concerns1: string[], concerns2: string[]): string[] {
    return concerns1.filter(concern => concerns2.includes(concern));
  }

  private async calculateStakeholderCompatibility(
    profiles: StakeholderProfile[],
    sharedConcerns: Map<string, string[]>,
    userDemographics?: UserDemographics
  ): Promise<CoalitionMatch[]> {
    const matches: CoalitionMatch[] = [];

    for (const profile of profiles) {
      // Skip if this is the user's own stakeholder group
      if (userDemographics && this.isUserStakeholderGroup(profile, userDemographics)) {
        continue;
      }

      const match = await this.createCoalitionMatch(profile, profiles, sharedConcerns);
      if (match.potentialAlliance) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  private isUserStakeholderGroup(profile: StakeholderProfile, userDemo: UserDemographics): boolean {
    return profile.group.toLowerCase() === userDemo.occupation?.toLowerCase() ||
           profile.group.toLowerCase() === userDemo.organizationAffiliation?.toLowerCase();
  }

  private async createCoalitionMatch(
    targetProfile: StakeholderProfile,
    allProfiles: StakeholderProfile[],
    sharedConcerns: Map<string, string[]>
  ): Promise<CoalitionMatch> {
    // Find the most compatible profiles
    let bestCompatibility = 0;
    let bestSharedConcerns: string[] = [];
    let compatibilityFactors: CompatibilityFactor[] = [];

    for (const otherProfile of allProfiles) {
      if (otherProfile.group === targetProfile.group) continue;

      const key = `${targetProfile.group}|${otherProfile.group}`;
      const reverseKey = `${otherProfile.group}|${targetProfile.group}`;
      const shared = sharedConcerns.get(key) || sharedConcerns.get(reverseKey) || [];

      if (shared.length > 0) {
        const compatibility = await this.analyzeCoalitionCompatibility(targetProfile, otherProfile);
        if (compatibility.compatibilityScore > bestCompatibility) {
          bestCompatibility = compatibility.compatibilityScore;
          bestSharedConcerns = shared;
          
          compatibilityFactors = [
            {
              factor: 'shared_concerns',
              weight: 0.4,
              description: `Both groups share concerns about ${shared.join(', ')}`,
              supportingEvidence: shared
            },
            {
              factor: 'position_alignment',
              weight: 0.3,
              description: `Compatible positions on the bill`,
              supportingEvidence: [targetProfile.position, otherProfile.position]
            }
          ];
        }
      }
    }

    const recommendedActions = this.generateCoalitionRecommendations(
      targetProfile,
      bestSharedConcerns,
      bestCompatibility
    );

    return {
      stakeholderGroup: targetProfile.group,
      similarityScore: bestCompatibility,
      sharedConcerns: bestSharedConcerns,
      potentialAlliance: bestCompatibility > 0.6,
      compatibilityFactors,
      recommendedActions
    };
  }

  private generateCoalitionRecommendations(
    profile: StakeholderProfile,
    sharedConcerns: string[],
    compatibility: number
  ): string[] {
    const recommendations: string[] = [];

    if (compatibility > 0.8) {
      recommendations.push('Consider forming a formal coalition with shared messaging');
      recommendations.push('Coordinate advocacy efforts for maximum impact');
    } else if (compatibility > 0.6) {
      recommendations.push('Explore tactical alliance on specific issues');
      recommendations.push('Share information and coordinate timing of advocacy');
    }

    if (sharedConcerns.length > 0) {
      recommendations.push(`Focus collaboration on shared concerns: ${sharedConcerns.join(', ')}`);
    }

    if (profile.influenceScore > 70) {
      recommendations.push('Leverage high influence score to lead coalition efforts');
    }

    return recommendations;
  }

  private filterViableCoalitions(matches: CoalitionMatch[]): CoalitionMatch[] {
    return matches.filter(match => 
      match.potentialAlliance && 
      match.similarityScore > 0.5 &&
      match.sharedConcerns.length > 0
    );
  }

  private findAlignedStakeholders(profiles: StakeholderProfile[]): Array<{
    stakeholders: StakeholderProfile[];
    sharedObjectives: string[];
  }> {
    const alignments: Array<{ stakeholders: StakeholderProfile[]; sharedObjectives: string[] }> = [];

    // Group by position
    const positionGroups = new Map<string, StakeholderProfile[]>();
    profiles.forEach(profile => {
      if (!positionGroups.has(profile.position)) {
        positionGroups.set(profile.position, []);
      }
      positionGroups.get(profile.position)!.push(profile);
    });

    // Create alignments for groups with same position and shared concerns
    for (const [position, groupProfiles] of positionGroups.entries()) {
      if (groupProfiles.length > 1 && position !== 'neutral') {
        const sharedObjectives = this.findCommonObjectives(groupProfiles);
        if (sharedObjectives.length > 0) {
          alignments.push({
            stakeholders: groupProfiles,
            sharedObjectives
          });
        }
      }
    }

    return alignments;
  }

  private async findComplementaryStakeholders(profiles: StakeholderProfile[]): Promise<Array<{
    stakeholders: StakeholderProfile[];
    sharedObjectives: string[];
  }>> {
    const complementary: Array<{ stakeholders: StakeholderProfile[]; sharedObjectives: string[] }> = [];

    // Find groups with different positions but complementary concerns
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const profile1 = profiles[i];
        const profile2 = profiles[j];

        // Different positions but potential for tactical alliance
        if (profile1.position !== profile2.position) {
          const sharedConcerns = this.findSharedConcerns(
            profile1.primaryConcerns,
            profile2.primaryConcerns
          );

          if (sharedConcerns.length > 0) {
            complementary.push({
              stakeholders: [profile1, profile2],
              sharedObjectives: sharedConcerns
            });
          }
        }
      }
    }

    return complementary;
  }

  private findCommonObjectives(profiles: StakeholderProfile[]): string[] {
    if (profiles.length === 0) return [];

    let commonConcerns = profiles[0].primaryConcerns;
    
    for (let i = 1; i < profiles.length; i++) {
      commonConcerns = commonConcerns.filter(concern =>
        profiles[i].primaryConcerns.includes(concern)
      );
    }

    return commonConcerns;
  }

  private async createCoalitionOpportunity(
    bill_id: string,
    stakeholders: StakeholderProfile[],
    approachType: CoalitionStrategy['approachType'],
    sharedObjectives: string[]
  ): Promise<CoalitionOpportunity> {
    const potentialImpact = this.calculatePotentialImpact(stakeholders);
    const feasibilityScore = this.calculateFeasibilityScore(stakeholders, sharedObjectives);
    const strategy = this.createCoalitionStrategy(approachType, stakeholders, sharedObjectives);

    return {
      id: crypto.randomUUID(),
      name: this.generateCoalitionName(stakeholders, sharedObjectives),
      stakeholderGroups: stakeholders.map(s => s.group),
      sharedObjectives,
      potentialImpact,
      feasibilityScore,
      recommendedStrategy: strategy,
      identifiedAt: new Date(),
      bill_id
    };
  }

  private calculatePotentialImpact(stakeholders: StakeholderProfile[]): number {
    const totalParticipation = stakeholders.reduce((sum, s) => sum + s.participationLevel, 0);
    const avgInfluence = stakeholders.reduce((sum, s) => sum + s.influenceScore, 0) / stakeholders.length;
    const diversityBonus = stakeholders.length > 2 ? 10 : 0;

    return Math.min(100, (totalParticipation / stakeholders.length) * 0.6 + avgInfluence * 0.3 + diversityBonus);
  }

  private calculateFeasibilityScore(stakeholders: StakeholderProfile[], sharedObjectives: string[]): number {
    let score = 50; // Base feasibility

    // More shared objectives = higher feasibility
    score += Math.min(30, sharedObjectives.length * 10);

    // Position alignment bonus
    const positions = stakeholders.map(s => s.position);
    const uniquePositions = new Set(positions).size;
    if (uniquePositions === 1) {
      score += 20; // All aligned
    } else if (uniquePositions === 2 && !positions.includes('oppose')) {
      score += 10; // Compatible positions
    }

    // Participation level bonus
    const avgParticipation = stakeholders.reduce((sum, s) => sum + s.participationLevel, 0) / stakeholders.length;
    score += (avgParticipation - 50) * 0.2;

    return Math.min(100, Math.max(0, score));
  }

  private createCoalitionStrategy(
    approachType: CoalitionStrategy['approachType'],
    stakeholders: StakeholderProfile[],
    sharedObjectives: string[]
  ): CoalitionStrategy {
    const keyMessages = this.generateKeyMessages(approachType, sharedObjectives);
    const targetAudience = this.identifyTargetAudience(stakeholders);
    const recommendedActions = this.generateStrategyActions(approachType, stakeholders);
    const potentialChallenges = this.identifyPotentialChallenges(stakeholders);
    const successMetrics = this.defineSuccessMetrics(approachType);

    return {
      approachType,
      keyMessages,
      targetAudience,
      recommendedActions,
      potentialChallenges,
      successMetrics
    };
  }

  private generateCoalitionName(stakeholders: StakeholderProfile[], objectives: string[]): string {
    const primaryObjective = objectives[0] || 'reform';
    const stakeholderCount = stakeholders.length;
    
    if (stakeholderCount === 2) {
      return `${stakeholders[0].group} & ${stakeholders[1].group} Alliance`;
    } else {
      return `Multi-Stakeholder Coalition for ${primaryObjective.replace('_', ' ')}`;
    }
  }

  private generateKeyMessages(approachType: CoalitionStrategy['approachType'], objectives: string[]): string[] {
    const messages: string[] = [];

    switch (approachType) {
      case 'unified_position':
        messages.push(`United stance on ${objectives.join(' and ')}`);
        messages.push('Broad consensus across stakeholder groups');
        break;
      case 'complementary_concerns':
        messages.push(`Shared concerns about ${objectives.join(' and ')}`);
        messages.push('Different perspectives, common goals');
        break;
      case 'tactical_alliance':
        messages.push('Strategic cooperation on specific issues');
        messages.push('Coordinated advocacy for targeted outcomes');
        break;
    }

    return messages;
  }

  private identifyTargetAudience(stakeholders: StakeholderProfile[]): string[] {
    const audiences = new Set<string>();
    
    audiences.add('Parliamentary Committee Members');
    audiences.add('Bill Sponsors');
    
    // Add specific audiences based on stakeholder influence
    stakeholders.forEach(stakeholder => {
      if (stakeholder.influenceScore > 70) {
        audiences.add('Media Outlets');
        audiences.add('Civil Society Organizations');
      }
    });

    return Array.from(audiences);
  }

  private generateStrategyActions(
    approachType: CoalitionStrategy['approachType'],
    stakeholders: StakeholderProfile[]
  ): string[] {
    const actions: string[] = [];

    actions.push('Coordinate messaging across stakeholder groups');
    actions.push('Schedule joint advocacy meetings');

    switch (approachType) {
      case 'unified_position':
        actions.push('Develop unified position statement');
        actions.push('Present joint testimony at hearings');
        break;
      case 'complementary_concerns':
        actions.push('Highlight complementary perspectives');
        actions.push('Coordinate separate but aligned advocacy');
        break;
      case 'tactical_alliance':
        actions.push('Focus on specific bill provisions');
        actions.push('Time advocacy efforts for maximum impact');
        break;
    }

    return actions;
  }

  private identifyPotentialChallenges(stakeholders: StakeholderProfile[]): string[] {
    const challenges: string[] = [];

    if (stakeholders.length > 3) {
      challenges.push('Coordinating multiple stakeholder groups');
    }

    const positions = new Set(stakeholders.map(s => s.position));
    if (positions.size > 1) {
      challenges.push('Managing different position nuances');
    }

    const avgInfluence = stakeholders.reduce((sum, s) => sum + s.influenceScore, 0) / stakeholders.length;
    if (avgInfluence < 60) {
      challenges.push('Building sufficient advocacy influence');
    }

    return challenges;
  }

  private defineSuccessMetrics(approachType: CoalitionStrategy['approachType']): string[] {
    const metrics = [
      'Number of stakeholder groups actively participating',
      'Media coverage of coalition positions',
      'Parliamentary committee engagement'
    ];

    switch (approachType) {
      case 'unified_position':
        metrics.push('Consistency of messaging across groups');
        break;
      case 'complementary_concerns':
        metrics.push('Coverage of diverse perspectives');
        break;
      case 'tactical_alliance':
        metrics.push('Achievement of specific advocacy goals');
        break;
    }

    return metrics;
  }

  private calculatePositionCompatibility(pos1: string, pos2: string): number {
    if (pos1 === pos2) return 1.0;
    if ((pos1 === 'support' && pos2 === 'oppose') || (pos1 === 'oppose' && pos2 === 'support')) {
      return 0.0;
    }
    if (pos1 === 'conditional' || pos2 === 'conditional') return 0.7;
    return 0.5; // neutral cases
  }

  private calculateDemographicCompatibility(
    demo1: StakeholderProfile['demographics'],
    demo2: StakeholderProfile['demographics']
  ): number {
    let compatibility = 0;
    let factors = 0;

    // Geographic overlap
    const geo1 = Array.from(demo1.geographicDistribution.keys());
    const geo2 = Array.from(demo2.geographicDistribution.keys());
    const geoOverlap = geo1.filter(county => geo2.includes(county)).length;
    if (geo1.length > 0 && geo2.length > 0) {
      compatibility += (geoOverlap / Math.max(geo1.length, geo2.length)) * 0.5;
      factors += 0.5;
    }

    // Organizational overlap
    const org1 = demo1.organizationalAffiliations;
    const org2 = demo2.organizationalAffiliations;
    const orgOverlap = org1.filter(org => org2.includes(org)).length;
    if (org1.length > 0 && org2.length > 0) {
      compatibility += (orgOverlap / Math.max(org1.length, org2.length)) * 0.5;
      factors += 0.5;
    }

    return factors > 0 ? compatibility / factors : 0.5;
  }

  private async calculateArgumentSimilarity(args1: string[], args2: string[]): Promise<number> {
    if (args1.length === 0 || args2.length === 0) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const arg1 of args1) {
      for (const arg2 of args2) {
        const similarity = await this.similarityCalculator.calculateSimilarity(arg1, arg2);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private identifyConflictingInterests(group1: StakeholderProfile, group2: StakeholderProfile): string[] {
    const conflicts: string[] = [];

    // Position conflicts
    if ((group1.position === 'support' && group2.position === 'oppose') ||
        (group1.position === 'oppose' && group2.position === 'support')) {
      conflicts.push('Opposing positions on the bill');
    }

    // Concern conflicts (simplified - would need more sophisticated analysis)
    const conflictingConcernPairs = [
      ['economic_impact', 'environmental_protection'],
      ['job_security', 'automation'],
      ['regulation', 'free_market']
    ];

    for (const [concern1, concern2] of conflictingConcernPairs) {
      if (group1.primaryConcerns.includes(concern1) && group2.primaryConcerns.includes(concern2)) {
        conflicts.push(`Conflicting priorities: ${concern1} vs ${concern2}`);
      }
    }

    return conflicts;
  }

  private recommendCoalitionApproach(
    compatibilityScore: number,
    sharedConcerns: string[],
    conflicts: string[]
  ): string {
    if (compatibilityScore > 0.8 && conflicts.length === 0) {
      return 'Form unified coalition with shared messaging and coordinated advocacy';
    }
    
    if (compatibilityScore > 0.6 && sharedConcerns.length > 0) {
      return 'Pursue tactical alliance focusing on shared concerns while acknowledging differences';
    }
    
    if (compatibilityScore > 0.4) {
      return 'Consider limited cooperation on specific issues where interests align';
    }
    
    return 'Coalition not recommended due to low compatibility and significant conflicts';
  }
}


