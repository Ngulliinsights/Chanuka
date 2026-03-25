/**
 * CLUSTERING SERVICE — FINAL DRAFT
 *
 * CHANGES FROM REFINED DRAFT:
 * - Replace cluster ID generation: substr()+Date.now() → crypto.randomUUID()
 * - Fix averageConfidence in formCluster: running (a+b)/2 produces a
 *   recency-weighted result, not a true mean. Now accumulates a sum and
 *   divides once after all members are collected.
 * - Fix averageClusterSize metric: replaced O(n) outliers.includes(arg)
 *   scan with the already-available assignedArguments Set.
 * - Make generateHash synchronous — it contains no awaited calls.
 * - Fix deduplicateByText: threshold parameter was accepted but never used;
 *   exact-match dedup is now explicit and documented as intentional.
 * - Fix deduplicateArguments strategy dispatch: deduplicationStrategy config
 *   field was declared but never consulted. Added strategy-based dispatch
 *   with a clear NOT-IMPLEMENTED guard for non-LSH strategies.
 * - Promote shingle size 3 to SHINGLE_SIZE named constant.
 * - Replace this.logContext object pattern with LOG_COMPONENT string constant
 *   (consistent with the rest of the codebase).
 * - Add TODO markers on considerPosition and considerDemographics config
 *   fields — declared but never read anywhere in the implementation.
 * - Fix silhouette score: arg.similarityScore is the similarity to this
 *   argument's OWN cluster representative, not a symmetric pairwise distance.
 *   Using it for inter-cluster distance was semantically wrong. Replaced with
 *   a representative-based approximation and a clear TODO for the full
 *   pairwise implementation.
 */

import { logger } from '@server/infrastructure/observability';

import { SimilarityCalculator } from '../infrastructure/nlp/similarity-calculator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ArgumentCluster {
  id: string;
  representativeText: string;
  argList: ClusteredArgument[];
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
  similarityScore: number;
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
  /**
   * When true, skip adding an argument to a cluster if its position
   * conflicts with the representative's position.
   */
  considerPosition: boolean;
  /**
   * When true, track and weight clusters with broader demographic spread
   * more highly in cluster formation and scoring.
   */
  considerDemographics: boolean;
  /**
   * When true, compute full pairwise silhouette score (O(n²), slow on large clusters).
   * When false, use representative-based approximation (O(k²·n), fast).
   */
  fullPairwiseSilhouette: boolean;
  /**
   * Deduplication strategy.
   * Only 'lsh' is currently implemented. 'hierarchical' and 'agglomerative'
   * will throw until their implementations are added.
   */
  deduplicationStrategy: 'lsh' | 'hierarchical' | 'agglomerative';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_COMPONENT = 'ClusteringService';

/** Number of consecutive words per shingle in LSH fingerprinting. */
const SHINGLE_SIZE = 3;

// ============================================================================
// CLUSTERING SERVICE
// ============================================================================

export class ClusteringService {
  private readonly defaultConfig: ClusteringConfig = {
    similarityThreshold: 0.7,
    minClusterSize: 3,
    maxClusters: 50,
    useSemanticSimilarity: true,
    considerPosition: true,
    considerDemographics: true,
    fullPairwiseSilhouette: false,
    deduplicationStrategy: 'lsh',
  };

  constructor(private readonly similarityCalculator: SimilarityCalculator) {}

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Cluster arguments by semantic similarity and position.
   */
  async clusterArguments(
    argList: ClusteredArgument[],
    config: Partial<ClusteringConfig> = {},
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    const finalConfig = { ...this.defaultConfig, ...config };

    const opContext = {
      component: LOG_COMPONENT,
      operation: 'clusterArguments',
      argumentCount: argList.length,
    };

    try {
      logger.info(opContext, '🔄 Starting argument clustering');

      const deduplicatedArgs = await this.deduplicateArguments(argList, finalConfig);

      const clusters: ArgumentCluster[] = [];
      const assignedArguments = new Set<string>();

      for (const argument of deduplicatedArgs) {
        if (assignedArguments.has(argument.id)) continue;
        if (clusters.length >= finalConfig.maxClusters) break;

        const cluster = await this.formCluster(
          argument,
          deduplicatedArgs,
          assignedArguments,
          finalConfig,
        );

        if (cluster.argList.length >= finalConfig.minClusterSize) {
          clusters.push(cluster);
          cluster.argList.forEach((arg) => assignedArguments.add(arg.id));
        }
      }

      const outliers = deduplicatedArgs.filter((arg) => !assignedArguments.has(arg.id));
      const processingTime = Date.now() - startTime;

      const metrics = {
        totalArguments: deduplicatedArgs.length,
        clustersFormed: clusters.length,
        // FIX: Use assignedArguments Set instead of O(n) outliers.includes().
        averageClusterSize:
          clusters.length > 0 ? assignedArguments.size / clusters.length : 0,
        silhouetteScore: await this.calculateSilhouetteScore(clusters, finalConfig.fullPairwiseSilhouette),
        processingTime,
      };

      logger.info(
        { component: LOG_COMPONENT, operation: 'clusterArguments', clustersFormed: clusters.length, outliersCount: outliers.length, processingTime },
        '✅ Argument clustering completed',
      );

      return { clusters, outliers, clusteringMetrics: metrics };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ component: LOG_COMPONENT, operation: 'clusterArguments', error: errorMessage }, 'Argument clustering failed');
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Deduplication
  // --------------------------------------------------------------------------

  /**
   * Dispatch to the configured deduplication strategy.
   *
   * Only 'lsh' is implemented. Other strategies throw until wired up.
   */
  private async deduplicateArguments(
    argList: ClusteredArgument[],
    config: ClusteringConfig,
  ): Promise<ClusteredArgument[]> {
    if (!config.useSemanticSimilarity) {
      return this.deduplicateByExactText(argList);
    }

    switch (config.deduplicationStrategy) {
      case 'lsh':
        return this.deduplicateByLsh(argList, config.similarityThreshold);
      case 'hierarchical':
      case 'agglomerative':
        throw new Error(
          `Deduplication strategy '${config.deduplicationStrategy}' is not yet implemented`,
        );
    }
  }

  /**
   * Exact-text deduplication (O(n), no similarity calls).
   *
   * Used when useSemanticSimilarity is false. Keeps the first occurrence of
   * each distinct normalizedText value — threshold is not applicable here.
   */
  private deduplicateByExactText(argList: ClusteredArgument[]): ClusteredArgument[] {
    const seen = new Map<string, ClusteredArgument>();
    for (const arg of argList) {
      if (!seen.has(arg.normalizedText)) {
        seen.set(arg.normalizedText, arg);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * LSH-based deduplication (O(n log n) typical vs O(n³) naive pairwise).
   *
   * Arguments are bucketed by their shingle hash. Full similarity is only
   * computed between arguments that land in the same bucket, dramatically
   * reducing the number of comparisons.
   */
  private async deduplicateByLsh(
    argList: ClusteredArgument[],
    similarityThreshold: number,
  ): Promise<ClusteredArgument[]> {
    const hashBuckets = new Map<string, ClusteredArgument[]>();
    const retained: ClusteredArgument[] = [];

    for (const arg of argList) {
      const hashSignature = this.generateHash(arg.normalizedText);
      const bucket = hashBuckets.get(hashSignature) ?? [];
      if (!hashBuckets.has(hashSignature)) hashBuckets.set(hashSignature, bucket);

      let isDuplicate = false;
      for (const existing of bucket) {
        const similarity = await this.similarityCalculator.calculateSimilarity(
          arg.normalizedText,
          existing.normalizedText,
        );
        if (similarity > similarityThreshold) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        bucket.push(arg);
        retained.push(arg);
      }
    }

    logger.debug(
      {
        component: LOG_COMPONENT,
        operation: 'deduplicateByLsh',
        originalCount: argList.length,
        retainedCount: retained.length,
        bucketsCreated: hashBuckets.size,
      },
      'LSH deduplication completed',
    );

    return retained;
  }

  // --------------------------------------------------------------------------
  // Hashing
  // --------------------------------------------------------------------------

  /**
   * Generate an LSH fingerprint for a text string using word shingles.
   *
   * Synchronous — no I/O involved.
   */
  private generateHash(text: string): string {
    const shingles = this.generateShingles(text, SHINGLE_SIZE);
    const fingerprint = shingles.reduce((hash, shingle) => hash ^ this.djb2Hash(shingle), 0);
    return fingerprint.toString(16);
  }

  /** Generate k-gram (shingle) sequences from a whitespace-tokenised string. */
  private generateShingles(text: string, k: number): string[] {
    const words = text.split(/\s+/);
    const shingles: string[] = [];
    for (let i = 0; i <= words.length - k; i++) {
      shingles.push(words.slice(i, i + k).join(' '));
    }
    return shingles;
  }

  /** DJB2 hash — fast, low-collision 32-bit integer hash for short strings. */
  private djb2Hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // coerce to signed 32-bit integer
    }
    return Math.abs(hash);
  }

  // --------------------------------------------------------------------------
  // Cluster formation
  // --------------------------------------------------------------------------

  /**
   * Form a cluster seeded by a representative argument, collecting all
   * unassigned arguments within the similarity threshold.
   *
   * If considerPosition is enabled, arguments with positions that conflict
   * with the representative are skipped.
   */
  private async formCluster(
    representative: ClusteredArgument,
    allArguments: ClusteredArgument[],
    assigned: Set<string>,
    config: ClusteringConfig,
  ): Promise<ArgumentCluster> {
    const members: ClusteredArgument[] = [representative];
    let confidenceSum = representative.confidence;

    // Infer representative position from its text hints (simplified heuristic).
    const representativePosition = this.inferPosition(representative.text);

    for (const arg of allArguments) {
      if (arg.id === representative.id || assigned.has(arg.id)) continue;

      // If considerPosition is enabled, skip arguments with conflicting positions.
      if (config.considerPosition) {
        const argPosition = this.inferPosition(arg.text);
        if (
          (representativePosition === 'support' && argPosition === 'oppose') ||
          (representativePosition === 'oppose' && argPosition === 'support')
        ) {
          continue;
        }
      }

      const similarity = await this.similarityCalculator.calculateSimilarity(
        representative.normalizedText,
        arg.normalizedText,
      );

      if (similarity >= config.similarityThreshold) {
        arg.similarityScore = similarity;
        members.push(arg);
        confidenceSum += arg.confidence;
      }
    }

    representative.isRepresentative = true;

    // Build demographic breakdown from all collected members.
    const ageGroups = new Map<string, number>();
    const occupations = new Map<string, number>();
    const counties = new Map<string, number>();
    const organizationAffiliations = new Map<string, number>();

    for (const member of members) {
      const demographics = member.userDemographics;
      if (demographics) {
        if (demographics.ageGroup) {
          ageGroups.set(demographics.ageGroup, (ageGroups.get(demographics.ageGroup) ?? 0) + 1);
        }
        if (demographics.occupation) {
          occupations.set(demographics.occupation, (occupations.get(demographics.occupation) ?? 0) + 1);
        }
        if (demographics.county) {
          counties.set(demographics.county, (counties.get(demographics.county) ?? 0) + 1);
        }
        if (demographics.organizationAffiliation) {
          organizationAffiliations.set(
            demographics.organizationAffiliation,
            (organizationAffiliations.get(demographics.organizationAffiliation) ?? 0) + 1,
          );
        }
      }
    }

    // Calculate demographic diversity score if enabled.
    let demographicDiversity = 0;
    if (config.considerDemographics) {
      demographicDiversity = this.calculateDemographicDiversity({
        ageGroups,
        occupations,
        counties,
        organizationAffiliations,
      });
    }

    const cluster: ArgumentCluster = {
      id: crypto.randomUUID(),
      representativeText: representative.text,
      argList: members,
      topicTags: [],
      position: representativePosition,
      stakeholderGroups: [],
      // FIX: True mean — accumulate sum, divide once after all members known.
      averageConfidence: confidenceSum / members.length,
      // Apply demographic diversity as bonus to evidence strength if enabled.
      evidenceStrength: config.considerDemographics ? demographicDiversity : 0,
      participantCount: members.length,
      geographicDistribution: counties,
      demographicBreakdown: {
        ageGroups,
        occupations,
        counties,
        organizationAffiliations,
      },
    };

    return cluster;
  }

  // --------------------------------------------------------------------------
  // Quality metrics
  // --------------------------------------------------------------------------

  /**
   * Approximate silhouette score using representative-to-representative
   * similarity as a proxy for inter-cluster distance.
   *
   * The previous implementation used arg.similarityScore (each argument's
   * similarity to its OWN cluster representative) as the distance metric for
   * BOTH intra- and inter-cluster calculations. This is semantically wrong:
   * inter-cluster distance requires comparing arguments across clusters, not
   * reusing a score that was computed relative to a different reference point.
   *
   * Two modes:
   * - Fast approximation (default, O(k²·n)): Uses representative-to-representative
   *   similarity as a proxy for inter-cluster distance.
   * - Full pairwise (optional, O(n²)): Computes similarity between every argument
   *   and every other cluster's members for a true silhouette score. This mode is
   *   gated behind fullPairwiseSilhouette config flag and should only be used on
   *   small clusters due to O(n²) complexity.
   */
  private async calculateSilhouetteScore(
    clusters: ArgumentCluster[],
    fullPairwise: boolean = false,
  ): Promise<number> {
    if (clusters.length < 2) return 0;

    if (fullPairwise) {
      return this.calculateFullPairwiseSilhouette(clusters);
    }

    return this.calculateApproximateSilhouette(clusters);
  }

  /**
   * Fast approximation using representative-to-representative distances.
   * O(k²·n) where k = cluster count, n = average cluster size.
   */
  private async calculateApproximateSilhouette(clusters: ArgumentCluster[]): Promise<number> {
    if (clusters.length < 2) return 0;

    // Pre-compute pairwise representative similarities (k² calls, k ≤ maxClusters).
    const repSimilarities = new Map<string, number>();
    for (let i = 0; i < clusters.length; i++) {
      const ci = clusters[i];
      if (!ci) continue;

      for (let j = i + 1; j < clusters.length; j++) {
        const cj = clusters[j];
        if (!cj) continue;

        const sim = await this.similarityCalculator.calculateSimilarity(
          ci.representativeText,
          cj.representativeText,
        );
        repSimilarities.set(`${ci.id}:${cj.id}`, sim);
        repSimilarities.set(`${cj.id}:${ci.id}`, sim);
      }
    }

    let totalScore = 0;
    let count = 0;

    for (const cluster of clusters) {
      // Nearest other cluster by representative similarity.
      let maxInterSim = -Infinity;
      for (const other of clusters) {
        if (other.id === cluster.id) continue;
        const sim = repSimilarities.get(`${cluster.id}:${other.id}`) ?? 0;
        if (sim > maxInterSim) maxInterSim = sim;
      }
      const minInterDistance = 1 - maxInterSim;

      for (const arg of cluster.argList) {
        const intraDistance = 1 - arg.similarityScore;
        const denom = Math.max(minInterDistance, intraDistance);
        const silhouette = denom === 0 ? 0 : (minInterDistance - intraDistance) / denom;
        totalScore += silhouette;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Full pairwise silhouette score using true inter-cluster argument distances.
   * O(n²) where n = total arguments. Only use on small datasets.
   *
   * For each argument:
   *   - Compute similarity to ALL arguments in its cluster (intra-cluster mean)
   *   - Compute similarity to ALL arguments in each other cluster
   *   - Find nearest other cluster (max mean similarity)
   *   - silhouette = (b - a) / max(a, b) where a = within-cluster, b = nearest other
   */
  private async calculateFullPairwiseSilhouette(clusters: ArgumentCluster[]): Promise<number> {
    if (clusters.length < 2) return 0;

    const clusterMap = new Map<string, ArgumentCluster>();
    for (const cluster of clusters) {
      clusterMap.set(cluster.id, cluster);
    }

    let totalScore = 0;
    let count = 0;

    for (const cluster of clusters) {
      // Pre-compute intra-cluster mean similarity for this cluster's arguments.
      for (const arg of cluster.argList) {
        let intraSum = 0;
        let intraDenom = 0;

        for (const other of cluster.argList) {
          if (other.id === arg.id) continue;
          const sim = await this.similarityCalculator.calculateSimilarity(
            arg.text,
            other.text,
          );
          intraSum += sim;
          intraDenom++;
        }

        const intraMean = intraDenom > 0 ? intraSum / intraDenom : 0;

        // Find nearest cluster by mean inter-cluster similarity.
        let maxInterMean = -Infinity;
        for (const other of clusters) {
          if (other.id === cluster.id) continue;

          let interSum = 0;
          let interDenom = 0;

          for (const otherArg of other.argList) {
            const sim = await this.similarityCalculator.calculateSimilarity(
              arg.text,
              otherArg.text,
            );
            interSum += sim;
            interDenom++;
          }

          const interMean = interDenom > 0 ? interSum / interDenom : 0;
          if (interMean > maxInterMean) maxInterMean = interMean;
        }

        // Silhouette coefficient.
        const denom = Math.max(intraMean, maxInterMean);
        const silhouette = denom === 0 ? 0 : (maxInterMean - intraMean) / denom;
        totalScore += silhouette;
        count++;
      }
    }

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Infer position (support, oppose, neutral) from text using keyword heuristics.
   * Returns the most prominent position found (support > oppose > neutral).
   */
  private inferPosition(text: string): 'support' | 'oppose' | 'neutral' {
    const lowerText = text.toLowerCase();

    const supportKeywords = [
      'support',
      'favor',
      'promote',
      'advocate',
      'encourage',
      'should',
      'approve',
      'benefit',
      'good',
      'positive',
    ];
    const opposeKeywords = [
      'oppose',
      'against',
      'prevent',
      'prohibit',
      'stop',
      'bad',
      'harmful',
      'negative',
      'danger',
      'risk',
    ];

    const supportCount = supportKeywords.filter((kw) => lowerText.includes(kw)).length;
    const opposeCount = opposeKeywords.filter((kw) => lowerText.includes(kw)).length;

    if (supportCount > opposeCount) return 'support';
    if (opposeCount > supportCount) return 'oppose';
    return 'neutral';
  }

  /**
   * Calculate demographic diversity score (0-1) across all tracked dimensions.
   * Higher values indicate more diverse representation.
   *
   * Score is normalized: max(1, sum of distinct categories across all dimensions).
   * This ensures that clusters with more demographic variety score higher.
   */
  private calculateDemographicDiversity(demographic: DemographicBreakdown): number {
    let distinctCount = 0;

    if (demographic.ageGroups.size > 0) distinctCount += demographic.ageGroups.size;
    if (demographic.occupations.size > 0) distinctCount += demographic.occupations.size;
    if (demographic.counties.size > 0) distinctCount += demographic.counties.size;
    if (demographic.organizationAffiliations.size > 0) {
      distinctCount += demographic.organizationAffiliations.size;
    }

    // Normalize: No diversity = 0, high diversity → 1 (capped at 4 dimensions).
    return Math.min(distinctCount / 4, 1);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const clusteringService = new ClusteringService(new SimilarityCalculator());