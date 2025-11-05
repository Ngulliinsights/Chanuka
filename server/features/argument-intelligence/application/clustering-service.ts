// ============================================================================
// ARGUMENT INTELLIGENCE - Clustering Service
// ============================================================================
// Clusters similar arguments using semantic similarity to reveal patterns

import { logger } from '@shared/core/index.js';
import { SimilarityCalculator } from '../infrastructure/nlp/similarity-calculator.js';

export interface ArgumentCluster {
  id: string;
  representativeText: string;
  arguments: ClusteredArgument[];
  topicTags: string[];
  position: 'support' | 'oppose' | 'neutral' | 'mixed';
  stakeholderGroups: string[];
  averageConfidence: number;
  evidenceStrength: number;
  participantCount: number;
  geographicDistribution: Map<string, number>;
  demographicBreakdown: DemographicBreakdown;
}

export interface ClusteredArgument {
  id: string;
  text: string;
  normalizedText: string;
  confidence: number;
  user_id: string;
  userDemographics?: UserDemographics;
  similarityScore: number; // Similarity to cluster representative
  isRepresentative: boolean;
}

export interface DemographicBreakdown {
  ageGroups: Map<string, number>;
  occupations: Map<string, number>;
  counties: Map<string, number>;
  organizationAffiliations: Map<string, number>;
}

export interface UserDemographics {
  county?: string;
  ageGroup?: string;
  occupation?: string;
  organizationAffiliation?: string;
}

export interface ClusteringResult {
  clusters: ArgumentCluster[];
  outliers: ClusteredArgument[];
  clusteringMetrics: {
    totalArguments: number;
    clustersFormed: number;
    averageClusterSize: number;
    silhouetteScore: number;
    processingTime: number;
  };
}

export interface ClusteringConfig {
  similarityThreshold: number;
  minClusterSize: number;
  maxClusters: number;
  useSemanticSimilarity: boolean;
  considerPosition: boolean;
  considerDemographics: boolean;
}

export class ClusteringService {
  private readonly defaultConfig: ClusteringConfig = {
    similarityThreshold: 0.7,
    minClusterSize: 3,
    maxClusters: 50,
    useSemanticSimilarity: true,
    considerPosition: true,
    considerDemographics: false
  };

  constructor(
    private readonly similarityCalculator: SimilarityCalculator
  ) {}

  /**
   * Cluster arguments by semantic similarity and position
   */
  async clusterArguments(
    arguments: ClusteredArgument[],
    config: Partial<ClusteringConfig> = {}
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      logger.info(`🔄 Starting argument clustering`, {
        component: 'ClusteringService',
        argumentCount: arguments.length,
        config: finalConfig
      });

      // Step 1: Preprocess arguments for clustering
      const preprocessedArgs = await this.preprocessArguments(arguments);

      // Step 2: Calculate similarity matrix
      const similarityMatrix = await this.calculateSimilarityMatrix(
        preprocessedArgs,
        finalConfig
      );

      // Step 3: Perform clustering using hierarchical clustering
      const clusters = await this.performHierarchicalClustering(
        preprocessedArgs,
        similarityMatrix,
        finalConfig
      );

      // Step 4: Identify outliers
      const outliers = this.identifyOutliers(preprocessedArgs, clusters, finalConfig);

      // Step 5: Enhance clusters with metadata
      const enhancedClusters = await this.enhanceClusters(clusters);

      // Step 6: Calculate clustering metrics
      const clusteringMetrics = this.calculateClusteringMetrics(
        arguments,
        enhancedClusters,
        outliers,
        Date.now() - startTime
      );

      const result: ClusteringResult = {
        clusters: enhancedClusters,
        outliers,
        clusteringMetrics
      };

      logger.info(`✅ Argument clustering completed`, {
        component: 'ClusteringService',
        clustersFormed: enhancedClusters.length,
        outliers: outliers.length,
        processingTime: clusteringMetrics.processingTime
      });

      return result;

    } catch (error) {
      logger.error(`❌ Argument clustering failed`, {
        component: 'ClusteringService',
        argumentCount: arguments.length,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Deduplicate claims by finding near-identical arguments
   */
  async deduplicateClaims(claims: string[]): Promise<string[]> {
    if (claims.length === 0) return [];

    const uniqueClaims: string[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < claims.length; i++) {
      if (processed.has(i)) continue;

      const currentClaim = claims[i];
      let isDuplicate = false;

      // Check against existing unique claims
      for (const uniqueClaim of uniqueClaims) {
        const similarity = await this.similarityCalculator.calculateSimilarity(
          currentClaim,
          uniqueClaim
        );

        if (similarity > 0.85) { // High threshold for deduplication
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        uniqueClaims.push(currentClaim);
        
        // Mark similar claims as processed
        for (let j = i + 1; j < claims.length; j++) {
          if (processed.has(j)) continue;
          
          const similarity = await this.similarityCalculator.calculateSimilarity(
            currentClaim,
            claims[j]
          );
          
          if (similarity > 0.85) {
            processed.add(j);
          }
        }
      }
      
      processed.add(i);
    }

    return uniqueClaims;
  }

  /**
   * Find arguments similar to a given query
   */
  async findSimilarArguments(
    query: string,
    arguments: ClusteredArgument[],
    threshold: number = 0.6
  ): Promise<ClusteredArgument[]> {
    const similarities: Array<{ argument: ClusteredArgument; similarity: number }> = [];

    for (const argument of arguments) {
      const similarity = await this.similarityCalculator.calculateSimilarity(
        query,
        argument.normalizedText
      );

      if (similarity >= threshold) {
        similarities.push({ argument, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => ({
        ...item.argument,
        similarityScore: item.similarity
      }));
  }

  /**
   * Merge small clusters with similar larger ones
   */
  async mergeSimilarClusters(
    clusters: ArgumentCluster[],
    threshold: number = 0.8
  ): Promise<ArgumentCluster[]> {
    const merged: ArgumentCluster[] = [];
    const processed = new Set<string>();

    // Sort clusters by size (largest first)
    const sortedClusters = clusters.sort((a, b) => b.arguments.length - a.arguments.length);

    for (const cluster of sortedClusters) {
      if (processed.has(cluster.id)) continue;

      let targetCluster = cluster;

      // For small clusters, try to merge with similar larger ones
      if (cluster.arguments.length < 5) {
        for (const potentialTarget of merged) {
          const similarity = await this.similarityCalculator.calculateSimilarity(
            cluster.representativeText,
            potentialTarget.representativeText
          );

          if (similarity >= threshold && cluster.position === potentialTarget.position) {
            // Merge into existing cluster
            targetCluster = this.mergeClusters(potentialTarget, cluster);
            break;
          }
        }
      }

      if (targetCluster === cluster) {
        merged.push(cluster);
      }

      processed.add(cluster.id);
    }

    return merged;
  }

  // Private helper methods

  private async preprocessArguments(arguments: ClusteredArgument[]): Promise<ClusteredArgument[]> {
    return arguments.map(arg => ({
      ...arg,
      normalizedText: this.normalizeForClustering(arg.normalizedText)
    }));
  }

  private normalizeForClustering(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async calculateSimilarityMatrix(
    arguments: ClusteredArgument[],
    config: ClusteringConfig
  ): Promise<number[][]> {
    const matrix: number[][] = [];
    const n = arguments.length;

    for (let i = 0; i < n; i++) {
      matrix[i] = new Array(n).fill(0);
      
      for (let j = i; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1.0;
        } else {
          let similarity = 0;

          if (config.useSemanticSimilarity) {
            similarity = await this.similarityCalculator.calculateSimilarity(
              arguments[i].normalizedText,
              arguments[j].normalizedText
            );
          } else {
            similarity = this.calculateLexicalSimilarity(
              arguments[i].normalizedText,
              arguments[j].normalizedText
            );
          }

          // Adjust similarity based on position agreement
          if (config.considerPosition) {
            const positionBonus = this.calculatePositionSimilarity(
              arguments[i],
              arguments[j]
            );
            similarity = similarity * 0.8 + positionBonus * 0.2;
          }

          // Adjust similarity based on demographics
          if (config.considerDemographics) {
            const demographicBonus = this.calculateDemographicSimilarity(
              arguments[i].userDemographics,
              arguments[j].userDemographics
            );
            similarity = similarity * 0.9 + demographicBonus * 0.1;
          }

          matrix[i][j] = similarity;
          matrix[j][i] = similarity;
        }
      }
    }

    return matrix;
  }

  private calculateLexicalSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private calculatePositionSimilarity(arg1: ClusteredArgument, arg2: ClusteredArgument): number {
    // Extract position from argument text if not explicitly set
    const pos1 = this.inferPosition(arg1.text);
    const pos2 = this.inferPosition(arg2.text);
    
    if (pos1 === pos2) return 1.0;
    if ((pos1 === 'support' && pos2 === 'oppose') || (pos1 === 'oppose' && pos2 === 'support')) {
      return 0.0;
    }
    return 0.5; // neutral or conditional
  }

  private inferPosition(text: string): 'support' | 'oppose' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    const supportWords = ['support', 'agree', 'good', 'beneficial', 'necessary'];
    const opposeWords = ['oppose', 'against', 'bad', 'harmful', 'unnecessary'];
    
    const supportCount = supportWords.filter(word => lowerText.includes(word)).length;
    const opposeCount = opposeWords.filter(word => lowerText.includes(word)).length;
    
    if (supportCount > opposeCount) return 'support';
    if (opposeCount > supportCount) return 'oppose';
    return 'neutral';
  }

  private calculateDemographicSimilarity(
    demo1?: UserDemographics,
    demo2?: UserDemographics
  ): number {
    if (!demo1 || !demo2) return 0.5;

    let matches = 0;
    let total = 0;

    if (demo1.county && demo2.county) {
      total++;
      if (demo1.county === demo2.county) matches++;
    }

    if (demo1.ageGroup && demo2.ageGroup) {
      total++;
      if (demo1.ageGroup === demo2.ageGroup) matches++;
    }

    if (demo1.occupation && demo2.occupation) {
      total++;
      if (demo1.occupation === demo2.occupation) matches++;
    }

    return total === 0 ? 0.5 : matches / total;
  }

  private async performHierarchicalClustering(
    arguments: ClusteredArgument[],
    similarityMatrix: number[][],
    config: ClusteringConfig
  ): Promise<ArgumentCluster[]> {
    const clusters: ArgumentCluster[] = [];
    const n = arguments.length;
    
    // Initialize each argument as its own cluster
    const activeClusters: Set<number>[] = [];
    for (let i = 0; i < n; i++) {
      activeClusters.push(new Set([i]));
    }

    // Merge clusters based on similarity threshold
    while (activeClusters.length > 1 && clusters.length < config.maxClusters) {
      let maxSimilarity = -1;
      let mergeIndices: [number, number] = [-1, -1];

      // Find most similar clusters
      for (let i = 0; i < activeClusters.length; i++) {
        for (let j = i + 1; j < activeClusters.length; j++) {
          const similarity = this.calculateClusterSimilarity(
            activeClusters[i],
            activeClusters[j],
            similarityMatrix
          );

          if (similarity > maxSimilarity && similarity >= config.similarityThreshold) {
            maxSimilarity = similarity;
            mergeIndices = [i, j];
          }
        }
      }

      // If no clusters meet threshold, stop merging
      if (mergeIndices[0] === -1) break;

      // Merge the most similar clusters
      const [i, j] = mergeIndices;
      const mergedCluster = new Set([...activeClusters[i], ...activeClusters[j]]);
      
      // Remove original clusters and add merged one
      activeClusters.splice(Math.max(i, j), 1);
      activeClusters.splice(Math.min(i, j), 1);
      activeClusters.push(mergedCluster);
    }

    // Convert remaining clusters to ArgumentCluster objects
    for (const clusterIndices of activeClusters) {
      if (clusterIndices.size >= config.minClusterSize) {
        const clusterArgs = Array.from(clusterIndices).map(i => arguments[i]);
        const cluster = this.createArgumentCluster(clusterArgs);
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private calculateClusterSimilarity(
    cluster1: Set<number>,
    cluster2: Set<number>,
    similarityMatrix: number[][]
  ): number {
    let totalSimilarity = 0;
    let count = 0;

    for (const i of cluster1) {
      for (const j of cluster2) {
        totalSimilarity += similarityMatrix[i][j];
        count++;
      }
    }

    return count === 0 ? 0 : totalSimilarity / count;
  }

  private createArgumentCluster(arguments: ClusteredArgument[]): ArgumentCluster {
    // Find representative argument (most central)
    const representative = this.findRepresentativeArgument(arguments);
    
    // Calculate cluster metadata
    const topicTags = this.aggregateTopicTags(arguments);
    const position = this.determineClusterPosition(arguments);
    const stakeholderGroups = this.aggregateStakeholderGroups(arguments);
    const averageConfidence = this.calculateAverageConfidence(arguments);
    const evidenceStrength = this.calculateEvidenceStrength(arguments);
    const participantCount = new Set(arguments.map(arg => arg.user_id)).size;
    const geographicDistribution = this.calculateGeographicDistribution(arguments);
    const demographicBreakdown = this.calculateDemographicBreakdown(arguments);

    return {
      id: crypto.randomUUID(),
      representativeText: representative.text,
      arguments: arguments.map(arg => ({
        ...arg,
        isRepresentative: arg.id === representative.id
      })),
      topicTags,
      position,
      stakeholderGroups,
      averageConfidence,
      evidenceStrength,
      participantCount,
      geographicDistribution,
      demographicBreakdown
    };
  }

  private findRepresentativeArgument(arguments: ClusteredArgument[]): ClusteredArgument {
    // Find argument with highest average similarity to others
    let bestArg = arguments[0];
    let bestScore = -1;

    for (const candidate of arguments) {
      let totalSimilarity = 0;
      
      for (const other of arguments) {
        if (candidate.id !== other.id) {
          // Use confidence as a proxy for centrality
          totalSimilarity += candidate.confidence;
        }
      }

      const avgSimilarity = totalSimilarity / (arguments.length - 1);
      if (avgSimilarity > bestScore) {
        bestScore = avgSimilarity;
        bestArg = candidate;
      }
    }

    return bestArg;
  }

  private aggregateTopicTags(arguments: ClusteredArgument[]): string[] {
    const tagCounts = new Map<string, number>();
    
    arguments.forEach(arg => {
      // Extract topic tags from argument text (simplified)
      const words = arg.normalizedText.split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          tagCounts.set(word, (tagCounts.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  private determineClusterPosition(arguments: ClusteredArgument[]): 'support' | 'oppose' | 'neutral' | 'mixed' {
    const positions = arguments.map(arg => this.inferPosition(arg.text));
    const supportCount = positions.filter(p => p === 'support').length;
    const opposeCount = positions.filter(p => p === 'oppose').length;
    const neutralCount = positions.filter(p => p === 'neutral').length;

    const total = positions.length;
    if (supportCount > total * 0.7) return 'support';
    if (opposeCount > total * 0.7) return 'oppose';
    if (neutralCount > total * 0.7) return 'neutral';
    return 'mixed';
  }

  private aggregateStakeholderGroups(arguments: ClusteredArgument[]): string[] {
    const groups = new Set<string>();
    
    arguments.forEach(arg => {
      if (arg.userDemographics?.occupation) {
        groups.add(arg.userDemographics.occupation);
      }
      if (arg.userDemographics?.organizationAffiliation) {
        groups.add(arg.userDemographics.organizationAffiliation);
      }
    });

    return Array.from(groups);
  }

  private calculateAverageConfidence(arguments: ClusteredArgument[]): number {
    const total = arguments.reduce((sum, arg) => sum + arg.confidence, 0);
    return total / arguments.length;
  }

  private calculateEvidenceStrength(arguments: ClusteredArgument[]): number {
    // Simplified evidence strength calculation
    const evidenceWords = ['study', 'research', 'data', 'statistics', 'report'];
    let evidenceCount = 0;

    arguments.forEach(arg => {
      const lowerText = arg.text.toLowerCase();
      evidenceWords.forEach(word => {
        if (lowerText.includes(word)) evidenceCount++;
      });
    });

    return Math.min(1.0, evidenceCount / arguments.length);
  }

  private calculateGeographicDistribution(arguments: ClusteredArgument[]): Map<string, number> {
    const distribution = new Map<string, number>();
    
    arguments.forEach(arg => {
      const county = arg.userDemographics?.county || 'unknown';
      distribution.set(county, (distribution.get(county) || 0) + 1);
    });

    return distribution;
  }

  private calculateDemographicBreakdown(arguments: ClusteredArgument[]): DemographicBreakdown {
    const ageGroups = new Map<string, number>();
    const occupations = new Map<string, number>();
    const counties = new Map<string, number>();
    const organizationAffiliations = new Map<string, number>();

    arguments.forEach(arg => {
      const demo = arg.userDemographics;
      if (demo) {
        if (demo.ageGroup) {
          ageGroups.set(demo.ageGroup, (ageGroups.get(demo.ageGroup) || 0) + 1);
        }
        if (demo.occupation) {
          occupations.set(demo.occupation, (occupations.get(demo.occupation) || 0) + 1);
        }
        if (demo.county) {
          counties.set(demo.county, (counties.get(demo.county) || 0) + 1);
        }
        if (demo.organizationAffiliation) {
          organizationAffiliations.set(demo.organizationAffiliation, 
            (organizationAffiliations.get(demo.organizationAffiliation) || 0) + 1);
        }
      }
    });

    return { ageGroups, occupations, counties, organizationAffiliations };
  }

  private identifyOutliers(
    arguments: ClusteredArgument[],
    clusters: ArgumentCluster[],
    config: ClusteringConfig
  ): ClusteredArgument[] {
    const clusteredArgIds = new Set<string>();
    
    clusters.forEach(cluster => {
      cluster.arguments.forEach(arg => {
        clusteredArgIds.add(arg.id);
      });
    });

    return arguments.filter(arg => !clusteredArgIds.has(arg.id));
  }

  private async enhanceClusters(clusters: ArgumentCluster[]): Promise<ArgumentCluster[]> {
    // Additional enhancement logic could go here
    return clusters;
  }

  private calculateClusteringMetrics(
    originalArguments: ClusteredArgument[],
    clusters: ArgumentCluster[],
    outliers: ClusteredArgument[],
    processingTime: number
  ): ClusteringResult['clusteringMetrics'] {
    const totalArguments = originalArguments.length;
    const clustersFormed = clusters.length;
    const averageClusterSize = clusters.length === 0 ? 0 : 
      clusters.reduce((sum, cluster) => sum + cluster.arguments.length, 0) / clusters.length;
    
    // Simplified silhouette score calculation
    const silhouetteScore = this.calculateSilhouetteScore(clusters);

    return {
      totalArguments,
      clustersFormed,
      averageClusterSize,
      silhouetteScore,
      processingTime
    };
  }

  private calculateSilhouetteScore(clusters: ArgumentCluster[]): number {
    // Simplified silhouette score - in practice would need full distance matrix
    if (clusters.length < 2) return 0;
    
    let totalScore = 0;
    let count = 0;

    clusters.forEach(cluster => {
      if (cluster.arguments.length > 1) {
        // Simplified: use average confidence as proxy for cohesion
        totalScore += cluster.averageConfidence;
        count++;
      }
    });

    return count === 0 ? 0 : totalScore / count;
  }

  private mergeClusters(target: ArgumentCluster, source: ArgumentCluster): ArgumentCluster {
    return {
      ...target,
      arguments: [...target.arguments, ...source.arguments],
      topicTags: [...new Set([...target.topicTags, ...source.topicTags])],
      stakeholderGroups: [...new Set([...target.stakeholderGroups, ...source.stakeholderGroups])],
      averageConfidence: (target.averageConfidence * target.arguments.length + 
                         source.averageConfidence * source.arguments.length) / 
                        (target.arguments.length + source.arguments.length),
      participantCount: target.participantCount + source.participantCount
    };
  }
}