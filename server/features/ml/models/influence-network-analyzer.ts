/**
 * Influence Network Analyzer - MWANGA Stack
 * 
 * Three-tier political influence network analysis:
 * - Tier 1: Basic centrality measures (<10ms)
 * - Tier 2: NetworkX full network analysis (~100ms)
 * - Tier 3: Ollama narrative and strategic insights (~1s)
 * 
 * Purpose: Map political influence networks, expose hidden power structures,
 * detect lobbying patterns, and identify corruption risks.
 */

import { BaseAnalyzer } from './base-analyzer';
import type { AnalysisTier } from './types';

// ============================================================================
// Types
// ============================================================================

export interface InfluenceNetworkInput {
  analysisType: 'network_analysis' | 'influence_prediction' | 'lobbying_detection' | 'power_mapping';
  
  entities: Array<{
    id: string;
    type: 'politician' | 'organization' | 'company' | 'lobbyist' | 'donor' | 'media';
    name: string;
    metadata?: Record<string, unknown>;
  }>;
  
  relationships: Array<{
    sourceId: string;
    targetId: string;
    type: 'financial' | 'employment' | 'family' | 'business' | 'political' | 'social';
    strength: number; // 0-1
    direction: 'bidirectional' | 'source_to_target' | 'target_to_source';
    metadata?: {
      startDate?: string;
      endDate?: string;
      value?: number;
      description?: string;
    };
  }>;
  
  contextualData: {
    timeframe: {
      start: string;
      end: string;
    };
    focusEntity?: string;
    billsInScope?: string[];
  };
}

export interface InfluenceNetworkResult {
  networkMetrics: {
    totalNodes: number;
    totalEdges: number;
    density: number; // 0-1
    clustering: number; // 0-1
    averagePathLength: number;
  };
  
  influenceRankings: Array<{
    entityId: string;
    entityName: string;
    influenceScore: number; // 0-100
    centrality: {
      degree: number;
      betweenness: number;
      closeness: number;
      eigenvector: number;
    };
    influenceType: 'broker' | 'hub' | 'authority' | 'connector' | 'isolate';
  }>;
  
  powerClusters: Array<{
    clusterId: string;
    members: string[];
    clusterType: 'political_party' | 'business_network' | 'family_group' | 'lobbying_coalition';
    cohesion: number; // 0-1
    influence: number; // 0-100
    keyIssues: string[];
  }>;
  
  influenceFlows: Array<{
    sourceId: string;
    targetId: string;
    flowStrength: number; // 0-1
    flowType: 'financial' | 'informational' | 'political' | 'social';
    pathways: string[][];
  }>;
  
  lobbyingPatterns: {
    detectedLobbying: Array<{
      lobbyistId: string;
      targetId: string;
      intensity: number; // 0-1
      methods: Array<'direct_contact' | 'financial_contribution' | 'employment_offer' | 'social_connection'>;
      effectiveness: number; // 0-1
    }>;
    lobbyingNetworks: Array<{
      networkId: string;
      participants: string[];
      coordinationLevel: number; // 0-1
      targetIssues: string[];
    }>;
  };
  
  riskAssessment: {
    corruptionRisk: number; // 0-100
    captureRisk: number; // 0-100 (regulatory/state capture)
    concentrationRisk: number; // 0-100 (power concentration)
    transparencyGaps: Array<{
      area: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
  };
  
  recommendations: Array<{
    type: 'transparency' | 'regulation' | 'monitoring' | 'investigation';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    targetEntities: string[];
  }>;
  
  narrative: string;
}

// ============================================================================
// Analyzer Implementation
// ============================================================================

export class InfluenceNetworkAnalyzer extends BaseAnalyzer<
  InfluenceNetworkInput,
  InfluenceNetworkResult
> {
  /**
   * Tier-specific analysis implementation
   */
  protected async analyzeWithTier(
    input: InfluenceNetworkInput,
    tier: AnalysisTier
  ): Promise<InfluenceNetworkResult> {
    switch (tier) {
      case 'tier1':
        return this.analyzeTier1(input);
      case 'tier2':
        return this.analyzeTier2(input);
      case 'tier3':
        return this.analyzeTier3(input);
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Tier 1: Basic centrality measures
   * Fast degree centrality and simple metrics
   */
  private async analyzeTier1(
    input: InfluenceNetworkInput
  ): Promise<InfluenceNetworkResult> {
    // Build adjacency map
    const adjacencyMap = new Map<string, Set<string>>();
    input.entities.forEach((e) => adjacencyMap.set(e.id, new Set()));
    
    input.relationships.forEach((rel) => {
      adjacencyMap.get(rel.sourceId)?.add(rel.targetId);
      if (rel.direction === 'bidirectional') {
        adjacencyMap.get(rel.targetId)?.add(rel.sourceId);
      }
    });

    // Calculate basic metrics
    const networkMetrics = {
      totalNodes: input.entities.length,
      totalEdges: input.relationships.length,
      density: this.calculateDensity(input.entities.length, input.relationships.length),
      clustering: 0.5, // Placeholder
      averagePathLength: 3.0, // Placeholder
    };

    // Calculate degree centrality (simple)
    const influenceRankings = input.entities.map((entity) => {
      const degree = adjacencyMap.get(entity.id)?.size || 0;
      const influenceScore = (degree / input.entities.length) * 100;
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        influenceScore,
        centrality: {
          degree,
          betweenness: 0, // Tier 2
          closeness: 0, // Tier 2
          eigenvector: 0, // Tier 2
        },
        influenceType: this.classifyInfluenceType(degree, input.entities.length),
      };
    }).sort((a, b) => b.influenceScore - a.influenceScore);

    // If network is complex, escalate to Tier 2
    if (input.entities.length > 20 || input.relationships.length > 50) {
      throw new Error('Complex network detected, escalating to Tier 2 for full analysis');
    }

    return {
      networkMetrics,
      influenceRankings,
      powerClusters: [],
      influenceFlows: [],
      lobbyingPatterns: {
        detectedLobbying: [],
        lobbyingNetworks: [],
      },
      riskAssessment: {
        corruptionRisk: 0,
        captureRisk: 0,
        concentrationRisk: 0,
        transparencyGaps: [],
      },
      recommendations: [],
      narrative: `Network analysis: ${input.entities.length} entities, ${input.relationships.length} relationships. Top influencer: ${influenceRankings[0]?.entityName || 'None'}`,
    };
  }

  /**
   * Tier 2: NetworkX full network analysis
   * Complete centrality measures, clustering, community detection
   */
  private async analyzeTier2(
    input: InfluenceNetworkInput
  ): Promise<InfluenceNetworkResult> {
    // TODO: Implement NetworkX integration
    console.log('Tier 2: Running full NetworkX analysis...');

    // Get Tier 1 baseline
    const tier1Results = await this.analyzeTier1(input);

    // Simulate NetworkX analysis
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Enhanced centrality measures (mock - replace with NetworkX)
    const enhancedRankings = tier1Results.influenceRankings.map((ranking) => ({
      ...ranking,
      centrality: {
        ...ranking.centrality,
        betweenness: Math.random() * 100,
        closeness: Math.random(),
        eigenvector: Math.random(),
      },
    }));

    // Detect power clusters (mock - replace with community detection)
    const powerClusters = [
      {
        clusterId: 'cluster-1',
        members: input.entities.slice(0, 3).map((e) => e.id),
        clusterType: 'business_network' as const,
        cohesion: 0.75,
        influence: 85,
        keyIssues: ['finance', 'taxation'],
      },
    ];

    // Detect lobbying patterns
    const lobbyingPatterns = this.detectLobbyingPatterns(input);

    // Calculate risk assessment
    const riskAssessment = this.calculateRiskAssessment(input, enhancedRankings, powerClusters);

    // If high risk detected, escalate to Tier 3
    if (riskAssessment.corruptionRisk > 70 || riskAssessment.captureRisk > 70) {
      throw new Error('High corruption/capture risk detected, escalating to Tier 3 for strategic analysis');
    }

    return {
      ...tier1Results,
      influenceRankings: enhancedRankings,
      powerClusters,
      lobbyingPatterns,
      riskAssessment,
      recommendations: this.generateRecommendations(riskAssessment),
    };
  }

  /**
   * Tier 3: Ollama narrative and strategic insights
   * Deep analysis with strategic recommendations
   */
  private async analyzeTier3(
    input: InfluenceNetworkInput
  ): Promise<InfluenceNetworkResult> {
    // TODO: Implement Ollama integration
    console.log('Tier 3: Generating strategic insights with Ollama...');

    // Get Tier 2 results
    const tier2Results = await this.analyzeTier2(input);

    const prompt = `You are a Kenyan anti-corruption analyst. Analyze this political influence network and expose hidden power structures.

Network Overview:
- ${tier2Results.networkMetrics.totalNodes} entities
- ${tier2Results.networkMetrics.totalEdges} relationships
- Network density: ${(tier2Results.networkMetrics.density * 100).toFixed(1)}%

Top Influencers:
${tier2Results.influenceRankings.slice(0, 5).map((r, i) => `${i + 1}. ${r.entityName} (influence: ${r.influenceScore.toFixed(1)}, type: ${r.influenceType})`).join('\n')}

Power Clusters:
${tier2Results.powerClusters.map((c) => `- ${c.clusterType}: ${c.members.length} members, cohesion: ${(c.cohesion * 100).toFixed(0)}%`).join('\n')}

Risk Assessment:
- Corruption Risk: ${tier2Results.riskAssessment.corruptionRisk}/100
- Capture Risk: ${tier2Results.riskAssessment.captureRisk}/100
- Concentration Risk: ${tier2Results.riskAssessment.concentrationRisk}/100

Provide:
1. Plain-English explanation of the power structure
2. Hidden relationships and their implications
3. Corruption and capture risks
4. Strategic recommendations for civil society and regulators
5. Specific entities that require investigation

Keep it under 300 words, focused on actionable insights for Kenyan citizens.`;

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock narrative
    const narrative = `This network reveals a concentrated power structure with ${tier2Results.powerClusters.length} distinct clusters. The top influencer, ${tier2Results.influenceRankings[0]?.entityName}, acts as a central broker connecting multiple power centers. The network shows signs of regulatory capture (risk: ${tier2Results.riskAssessment.captureRisk}/100), with ${tier2Results.lobbyingPatterns.detectedLobbying.length} active lobbying relationships detected. Key concern: ${tier2Results.riskAssessment.transparencyGaps[0]?.description || 'Insufficient transparency in financial relationships'}. Recommended actions: ${tier2Results.recommendations[0]?.description || 'Increase monitoring of key relationships'}.`;

    return {
      ...tier2Results,
      narrative,
    };
  }

  /**
   * Calculate confidence based on tier and result
   */
  protected getConfidence(result: InfluenceNetworkResult, tier: AnalysisTier): number {
    const baseConfidence = result.networkMetrics.totalNodes > 10 ? 0.8 : 0.6;

    if (tier === 'tier3') return Math.min(baseConfidence * 1.2, 1.0);
    if (tier === 'tier2') return baseConfidence;
    return Math.min(baseConfidence * 0.8, 0.9);
  }

  // Helper methods

  private calculateDensity(nodes: number, edges: number): number {
    if (nodes < 2) return 0;
    const maxEdges = (nodes * (nodes - 1)) / 2;
    return edges / maxEdges;
  }

  private classifyInfluenceType(
    degree: number,
    totalNodes: number
  ): 'broker' | 'hub' | 'authority' | 'connector' | 'isolate' {
    const ratio = degree / totalNodes;
    if (ratio > 0.5) return 'hub';
    if (ratio > 0.3) return 'broker';
    if (ratio > 0.15) return 'connector';
    if (ratio > 0.05) return 'authority';
    return 'isolate';
  }

  private detectLobbyingPatterns(input: InfluenceNetworkInput) {
    // Simple lobbying detection based on relationship types
    const lobbyists = input.entities.filter((e) => e.type === 'lobbyist');
    const detectedLobbying = lobbyists.flatMap((lobbyist) => {
      const relationships = input.relationships.filter(
        (r) => r.sourceId === lobbyist.id && r.type === 'financial'
      );
      return relationships.map((r) => ({
        lobbyistId: lobbyist.id,
        targetId: r.targetId,
        intensity: r.strength,
        methods: ['financial_contribution' as const],
        effectiveness: r.strength * 0.8,
      }));
    });

    return {
      detectedLobbying,
      lobbyingNetworks: [],
    };
  }

  private calculateRiskAssessment(
    input: InfluenceNetworkInput,
    rankings: any[],
    clusters: any[]
  ) {
    // Calculate concentration risk
    const topInfluence = rankings.slice(0, 3).reduce((sum, r) => sum + r.influenceScore, 0);
    const concentrationRisk = Math.min(topInfluence / 3, 100);

    // Calculate corruption risk based on financial relationships
    const financialRels = input.relationships.filter((r) => r.type === 'financial');
    const corruptionRisk = Math.min((financialRels.length / input.relationships.length) * 150, 100);

    // Calculate capture risk based on cluster cohesion
    const avgCohesion = clusters.reduce((sum, c) => sum + c.cohesion, 0) / (clusters.length || 1);
    const captureRisk = avgCohesion * 100;

    return {
      corruptionRisk,
      captureRisk,
      concentrationRisk,
      transparencyGaps: [
        {
          area: 'financial_relationships',
          severity: corruptionRisk > 70 ? ('critical' as const) : ('medium' as const),
          description: 'High concentration of financial relationships requires disclosure',
        },
      ],
    };
  }

  private generateRecommendations(riskAssessment: any) {
    const recommendations = [];

    if (riskAssessment.corruptionRisk > 60) {
      recommendations.push({
        type: 'investigation' as const,
        priority: 'urgent' as const,
        description: 'Launch investigation into financial relationships',
        targetEntities: [],
      });
    }

    if (riskAssessment.captureRisk > 60) {
      recommendations.push({
        type: 'regulation' as const,
        priority: 'high' as const,
        description: 'Strengthen regulatory independence mechanisms',
        targetEntities: [],
      });
    }

    return recommendations;
  }
}

// Export singleton instance
export const influenceNetworkAnalyzer = new InfluenceNetworkAnalyzer({
  enableCaching: true,
  cacheExpiryMs: 3600000, // 1 hour
  enableFallback: true,
});
