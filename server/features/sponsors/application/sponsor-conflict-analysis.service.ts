// Import the NEW repository for data access
import { sponsorRepository, SponsorRepository } from '../infrastructure/repositories/sponsor.repository'; // Adjusted path
import { logger } from '@shared/core';
const loggerAny = logger as any;
import type { Sponsor, SponsorAffiliation, SponsorTransparency, Bill } from '../../../../shared/schema'; // Adjusted path
// Local helper types used by this service but not exported elsewhere in repo
type BillSponsorship = { id?: number; billId: number; role?: string };

interface SponsorWithRelations extends Sponsor {
  affiliations?: SponsorAffiliation[];
  transparency?: SponsorTransparency[];
  sponsorships?: BillSponsorship[];
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ConflictType =
  | 'financial_direct' // Sponsor has direct financial stake (e.g., ownership) in org affected by bill
  | 'financial_indirect' // Sponsor benefits financially via indirect link (e.g., spouse works there)
  | 'organizational' // Sponsor holds leadership role (e.g., board member) in org affected by bill
  | 'family_business' // Bill affects business owned/run by close family
  | 'voting_pattern' // Consistent voting aligns suspiciously with specific industry interests + financial ties
  | 'timing_suspicious' // Affiliation start/end date suspiciously close to bill sponsorship/vote
  | 'disclosure_incomplete'; // Known affiliations/interests not properly disclosed

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

// Represents a single detected conflict
export interface ConflictDetectionResult {
  conflictId: string; // Unique ID for this specific conflict instance
  sponsorId: number;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string; // Human-readable summary
  affectedBills: number[]; // Bill IDs potentially influenced by this conflict
  financialImpact: number; // Estimated financial gain/loss related to the conflict (0 if non-financial)
  detectedAt: Date; // When the conflict was detected by the system
  confidence: number; // System confidence in this detection (0-1)
  evidence: string[]; // Supporting facts (e.g., Affiliation ID, Disclosure Record, Bill Section)
  // Optional: Add related entity IDs
  relatedAffiliationId?: number;
  relatedTransparencyId?: number;
}

// Types for network visualization (keep as defined previously)
export interface ConflictNode { /* ... */ }
export interface ConflictEdge { /* ... */ }
export interface ConflictCluster { /* ... */ }
export interface NetworkMetrics { /* ... */ }
export interface ConflictMapping { nodes: ConflictNode[]; edges: ConflictEdge[]; clusters: ConflictCluster[]; metrics: NetworkMetrics; }

// Types for trend analysis (keep as defined previously)
export interface ConflictPrediction { /* ... */ }
export interface ConflictTrend { /* ... */ }

// Type for sponsor risk profile (keep as defined previously)
export interface RiskProfile { /* ... */ }

// Provide concrete network/trend types used by other methods
export interface ConflictNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill';
  name: string;
  conflictLevel: ConflictSeverity;
  size: number;
  color: string;
  metadata?: Record<string, any>;
}

export interface ConflictEdge {
  source: string;
  target: string;
  type: ConflictType;
  weight: number;
  severity: ConflictSeverity;
  label?: string;
}

export interface ConflictCluster {
  id: string;
  members: string[];
  centerNode: string;
  conflictDensity: number;
  riskLevel: ConflictSeverity;
}

export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  density: number;
  clustering: number;
  centralityScores: Record<string, number>;
  riskDistribution: Record<ConflictSeverity, number>;
}

export interface ConflictPrediction {
  billId: number;
  billTitle: string;
  predictedConflictType: ConflictType;
  probability: number;
  riskFactors: string[];
}

export interface ConflictTrend {
  sponsorId: number;
  timeframe: string;
  conflictCount: number;
  severityTrend: 'increasing' | 'decreasing' | 'stable';
  riskScore: number;
  predictions: ConflictPrediction[];
}

export interface RiskProfile {
  overallScore: number;
  level: ConflictSeverity;
  breakdown: {
    financialRisk: number;
    affiliationRisk: number;
    transparencyRisk: number;
    behavioralRisk: number;
  };
  recommendations: string[];
}


/**
 * SponsorConflictAnalysisService - Application Layer (Business Logic)
 *
 * Contains the algorithms and logic for detecting, scoring, and analyzing
 * potential conflicts of interest for legislative sponsors.
 * Relies on the SponsorRepository for data fetching. Contains NO direct DB queries.
 */
export class SponsorConflictAnalysisService {
  // Inject repository dependency (using the singleton instance for simplicity)
  private sponsorRepo: SponsorRepository = sponsorRepository;

  // --- Configuration --- (Keep thresholds, colors, weights as defined previously)
  private readonly conflictThresholds = {
    financial: {
      critical: 10000000,
      high: 5000000,
      medium: 1000000,
      low: 100000
    },
    timing: {
      suspicious_days: 30,
      very_suspicious_days: 7
    },
    disclosure: {
      complete_threshold: 0.9,
      adequate_threshold: 0.7
    },
    affiliation: {
      high_count: 5,
      critical_count: 10
    }
  };

  private readonly severityColors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#FF5722',
    critical: '#D32F2F'
  };

  private readonly conflictTypeWeights = {
    financial_direct: 40,
    financial_indirect: 25,
    organizational: 20,
    family_business: 35,
    voting_pattern: 30,
    timing_suspicious: 45,
    disclosure_incomplete: 15
  };
  // Provide minimal default thresholds used by helper methods if not set above
  private readonly _defaults = {
    financial: { critical: 10000000, high: 5000000, medium: 1000000, low: 100000 },
    timing: { suspicious_days: 30, very_suspicious_days: 7 }
  };


  // ============================================================================
  // PUBLIC API METHODS - Orchestration & Analysis
  // ============================================================================

  /**
   * Detects all potential conflicts for a specific sponsor or all active sponsors.
   * Orchestrates calls to individual detection algorithms.
   * @param sponsorId Optional ID to analyze a single sponsor. If omitted, analyzes all active sponsors.
   * @returns Array of detected conflicts.
   */
  async detectConflicts(sponsorId?: number): Promise<ConflictDetectionResult[]> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectConflicts', sponsorId };
    loggerAny.info(`Starting conflict detection for ${sponsorId ? `sponsor ${sponsorId}` : 'all active sponsors'}`, logContext);

    try {
      // 1. Get Sponsor(s) and their related data using the Repository
      const sponsorsToAnalyze = await (sponsorId
        ? this.getSponsorData([sponsorId])
        : this.getAllActiveSponsorData());

      if (sponsorsToAnalyze.length === 0) {
        loggerAny.warn("No sponsors found for conflict detection", logContext);
        return [];
      }

      // 2. Analyze each sponsor concurrently
      const detectionPromises = sponsorsToAnalyze.map(async (sponsorData) => {
        if (!sponsorData) return []; // Handle potential null if getSponsorData fails for one ID

        // Run individual detection algorithms using the SponsorWithRelations shape
        const sponsor = sponsorData as SponsorWithRelations;
        const sponsorConflicts = await Promise.allSettled([
          this.detectFinancialConflicts(sponsor, sponsor.affiliations || [], sponsor.sponsorships || []),
          this.detectOrganizationalConflicts(sponsor, sponsor.affiliations || [], sponsor.sponsorships || []),
          // Voting pattern analysis requires historical voting data - might be separate service or complex query
          // this.detectVotingPatternConflicts(sponsor, sponsor.affiliations, votingHistory),
          this.detectTimingConflicts(sponsor, sponsor.affiliations || [], sponsor.sponsorships || []),
          this.detectDisclosureConflicts(sponsor, sponsor.affiliations || [], sponsor.transparency || [])
        ]);

        // Collect results, logging errors from failed promises
        const results: ConflictDetectionResult[] = [];
        sponsorConflicts.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(...result.value);
          } else {
            loggerAny.error(`Conflict detection algorithm ${index} failed for sponsor ${sponsor.id}`, logContext, result.reason);
          }
        });
        return results;
      });

    const allConflicts = (await Promise.all(detectionPromises)).flat();
    loggerAny.info(`Conflict detection completed. Found ${allConflicts.length} potential conflicts.`, logContext);
      return allConflicts;

    } catch (error) {
      loggerAny.error('Error during conflict detection orchestration', logContext, error);
      throw new Error(`Conflict detection failed: ${this.getErrorMessage(error)}`); // Re-throw critical error
    }
  }

  // --- createConflictMapping, analyzeConflictTrends, generateRiskProfile ---
  // These methods remain largely the same as provided previously, ensuring they
  // now call `this.sponsorRepo` for data fetching instead of `sponsorService`.
  // Example modification for generateRiskProfile:
  async generateRiskProfile(sponsorId: number): Promise<RiskProfile> {
      const logContext = { component: 'SponsorConflictAnalysisService', operation: 'generateRiskProfile', sponsorId };
  loggerAny.info(`Generating risk profile`, logContext);
      try {
          // Fetch data using the repository
          const sponsor = await this.sponsorRepo.findById(sponsorId);
          if (!sponsor) throw new Error(`Sponsor ${sponsorId} not found`);

          // Fetch related data concurrently using repository methods
          const [affiliations, transparency] = await Promise.all([
              this.sponsorRepo.listAffiliations(sponsorId),
              this.sponsorRepo.listTransparencyRecords(sponsorId)
          ]);

          // Calculate risk components (using methods defined below)
          const breakdown = {
              financialRisk: this.calculateFinancialRisk(sponsor),
              affiliationRisk: this.calculateAffiliationRisk(affiliations),
              transparencyRisk: this.calculateTransparencyRisk(transparency, affiliations),
              behavioralRisk: this.calculateBehavioralRisk(sponsor) // Assumes relevant data is on Sponsor type
          };

          const overallScore = this.calculateWeightedRiskScore(breakdown);
          const level = this.determineRiskLevel(overallScore);
          const recommendations = this.generateRiskRecommendations(level, breakdown);

          loggerAny.info(`Risk profile generated successfully`, logContext);
          return { overallScore, level, breakdown, recommendations };
      } catch (error) {
         loggerAny.error('Error generating risk profile', logContext, error);
       throw new Error(`Risk profile generation failed for sponsor ${sponsorId}: ${this.getErrorMessage(error)}`);
      }
  }
  // --- Implement createConflictMapping and analyzeConflictTrends similarly, replacing data fetches ---
   async createConflictMapping(billId?: number): Promise<ConflictMapping> {
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'createConflictMapping', billId };
     loggerAny.info('Building conflict mapping', logContext);
     try {
       // Detect conflicts (optionally filter by bill)
       const allConflicts = await this.detectConflicts();
       const conflicts = typeof billId === 'number' ? allConflicts.filter(c => c.affectedBills.includes(billId)) : allConflicts;

       // Build nodes and edges
       const nodes = await this.buildConflictNodes(conflicts);
       const edges = await this.buildConflictEdges(conflicts);

       // Identify clusters and metrics
       const clusters = await this.identifyConflictClusters(nodes, edges);
       const metrics = this.calculateNetworkMetrics(nodes, edges);

       loggerAny.info(`Conflict mapping built: ${nodes.length} nodes, ${edges.length} edges`, logContext);
       return { nodes, edges, clusters, metrics };
     } catch (error) {
       loggerAny.error('Error building conflict mapping', logContext, error);
       return { nodes: [], edges: [], clusters: [], metrics: { totalNodes: 0, totalEdges: 0, density: 0, clustering: 0, centralityScores: {}, riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 } } };
     }
   }
   async analyzeConflictTrends(sponsorId?: number, timeframeMonths: number = 12): Promise<ConflictTrend[]> { /* Minimal implementation */
     // Simple wrapper using getHistoricalConflicts
     if (!sponsorId) return [];
     const startDate = new Date(); startDate.setMonth(startDate.getMonth() - timeframeMonths);
     const history = await this.getHistoricalConflicts(sponsorId, startDate);
     const metrics = this.calculateTrendMetrics(history, timeframeMonths);
     return [{ sponsorId, timeframe: `${timeframeMonths}m`, conflictCount: history.length, severityTrend: metrics.severityTrend, riskScore: metrics.riskScore, predictions: await this.generateConflictPredictions(sponsorId) }];
   }


  /**
   * Calculates the severity of a specific conflict instance.
   * Centralizes the severity logic.
   */
  calculateConflictSeverity(
    conflictType: ConflictType,
    financialImpact: number,
    additionalFactors: Record<string, any> = {} // e.g., { leadershipRole: true, multipleAffiliations: 3 }
  ): ConflictSeverity {
    let score = this.conflictTypeWeights[conflictType] ?? 10; // Base score from type

    // Adjust score based on financial impact thresholds
  if (financialImpact >= this.conflictThresholds.financial.critical) score += 40;
  else if (financialImpact >= this.conflictThresholds.financial.high) score += 25;
  else if (financialImpact >= this.conflictThresholds.financial.medium) score += 15;
  else if (financialImpact >= this.conflictThresholds.financial.low) score += 5;

    // Adjust score based on additional contextual factors
    if (additionalFactors.multipleAffiliations && additionalFactors.multipleAffiliations > 5) score += 10;
    if (additionalFactors.recentActivity) score += 15; // e.g., affiliation started recently
    if (additionalFactors.leadershipRole) score += 12; // e.g., Board member, CEO
    if (additionalFactors.directBeneficiary) score += 20; // Conflict directly benefits sponsor/family

    // Convert final score to severity level
    return this.determineRiskLevel(score); // Use the same score mapping as risk profile
  }

  // Small helper to safely read thresholds (fallback to defaults)
  private getThreshold(path: string, key: string): any {
    try {
      // @ts-ignore
      const val = this.conflictThresholds[path][key];
      if (val !== undefined) return val;
    } catch (e) {
      // fallthrough
    }
    // @ts-ignore
    return this._defaults[path][key];
  }

  // Helper to normalize error messages
  private getErrorMessage(error: any): string {
    if (!error) return 'unknown error';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    try { return JSON.stringify(error); } catch (e) { return String(error); }
  }

  // ============================================================================
  // TREND & PREDICTION HELPERS
  // ============================================================================
  private async getHistoricalConflicts(sponsorId: number, startDate: Date): Promise<ConflictDetectionResult[]> {
    // For now, simulate by detecting current conflicts and filtering by detectedAt
    const current = await this.detectConflicts(sponsorId);
    return current.filter(c => c.detectedAt >= startDate);
  }

  private calculateTrendMetrics(historicalConflicts: ConflictDetectionResult[], timeframeMonths: number): { severityTrend: 'increasing'|'decreasing'|'stable'; riskScore: number } {
    if (historicalConflicts.length === 0) return { severityTrend: 'stable', riskScore: 0 };
    const cutoffDate = new Date(); cutoffDate.setMonth(cutoffDate.getMonth() - Math.floor(timeframeMonths / 2));
    const recent = historicalConflicts.filter(c => c.detectedAt > cutoffDate);
    const older = historicalConflicts.filter(c => c.detectedAt <= cutoffDate);
    const recentAvg = this.calculateAverageSeverity(recent);
    const olderAvg = this.calculateAverageSeverity(older);
    let severityTrend: 'increasing'|'decreasing'|'stable' = 'stable';
    if (recentAvg > olderAvg + 0.5) severityTrend = 'increasing';
    else if (recentAvg < olderAvg - 0.5) severityTrend = 'decreasing';
    const conflictCount = historicalConflicts.length;
    const avgSeverity = this.calculateAverageSeverity(historicalConflicts);
    const riskScore = Math.min((conflictCount * 10) + (avgSeverity * 20), 100);
    return { severityTrend, riskScore };
  }

  private calculateAverageSeverity(conflicts: ConflictDetectionResult[]): number {
    if (conflicts.length === 0) return 0;
    const map = { low: 1, medium: 2, high: 3, critical: 4 } as Record<ConflictSeverity, number>;
    const total = conflicts.reduce((s, c) => s + map[c.severity], 0);
    return total / conflicts.length;
  }

  private async generateConflictPredictions(sponsorId: number): Promise<ConflictPrediction[]> {
    // Very simple predictions: look at sponsor affiliations and upcoming bills
    const affiliations = await this.sponsorRepo.listAffiliations(sponsorId);
    const allBills = [] as Array<{ id: number; title?: string }>; // Placeholder - repository method not used here
    const upcoming = allBills.slice(0,5);
    return upcoming.map(b => ({ billId: b.id, billTitle: b.title || '', predictedConflictType: 'financial_indirect', probability: 0.2, riskFactors: affiliations.slice(0,2).map(a=>a.organization) }));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - Data Fetching Orchestration
  // ============================================================================

  /** Fetches a list of sponsors with their relations efficiently. */
  private async getSponsorData(sponsorIds: number[]): Promise<Array<SponsorWithRelations | null>> {
      if (sponsorIds.length === 0) return [];
      // Fetch all data concurrently using repository methods
      try {
          const [sponsors, affiliationsMap, transparencyMap, sponsorshipsMap] = await Promise.all([
              this.sponsorRepo.findByIds(sponsorIds),
              this.sponsorRepo.findAffiliationsBySponsorIds(sponsorIds), // Fetches map
              this.sponsorRepo.findTransparencyBySponsorIds(sponsorIds), // Fetches map
              // Fetch sponsorships initiated BY these sponsors (adjust if different relation needed)
              Promise.all(sponsorIds.map(id => this.sponsorRepo.listBillSponsorshipsBySponsor(id)))
                  .then(results => new Map(results.map((spons, i) => [sponsorIds[i], spons]))) // Create map
          ]);

          // Combine data for each sponsor
          return sponsors.map(sponsor => ({
              ...sponsor,
              affiliations: affiliationsMap.get(sponsor.id) || [],
              transparency: transparencyMap.get(sponsor.id) || [],
              sponsorships: sponsorshipsMap.get(sponsor.id) || []
          }));
      } catch (error) {
           loggerAny.error("Failed to fetch bulk sponsor data with relations", { component: 'SponsorConflictAnalysisService', sponsorIds }, error);
           // Return nulls for requested IDs to indicate failure for those specific sponsors
           return sponsorIds.map(() => null);
      }
  }


  /** Fetches all active sponsors and their related data. */
  private async getAllActiveSponsorData(): Promise<SponsorWithRelations[]> {
      try {
           const activeSponsors = await this.sponsorRepo.list({ isActive: true, limit: 1000 }); // Add reasonable limit
           const sponsorIds = activeSponsors.map(s => s.id);
           // Fetch relations in bulk
           const [affiliationsMap, transparencyMap, sponsorshipsMap] = await Promise.all([
               this.sponsorRepo.findAffiliationsBySponsorIds(sponsorIds),
               this.sponsorRepo.findTransparencyBySponsorIds(sponsorIds),
               Promise.all(sponsorIds.map(id => this.sponsorRepo.listBillSponsorshipsBySponsor(id)))
                  .then(results => new Map(results.map((spons, i) => [sponsorIds[i], spons])))
           ]);

           // Combine
           return activeSponsors.map(sponsor => ({
               ...sponsor,
               affiliations: affiliationsMap.get(sponsor.id) || [],
               transparency: transparencyMap.get(sponsor.id) || [],
               sponsorships: sponsorshipsMap.get(sponsor.id) || []
           }));
      } catch (error) {
           loggerAny.error("Failed to fetch all active sponsor data with relations", { component: 'SponsorConflictAnalysisService' }, error);
           return []; // Return empty on failure
      }
  }

  // ============================================================================
  // PRIVATE CONFLICT DETECTION ALGORITHMS
  // (Implementations remain the same as provided previously, but use `this.sponsorRepo` calls)
  // ============================================================================

  private async detectFinancialConflicts(sponsor: Sponsor, affiliations: SponsorAffiliation[], sponsorships: BillSponsorship[]): Promise<ConflictDetectionResult[]> {
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectFinancialConflicts', sponsorId: sponsor.id };
  loggerAny.debug("Detecting financial conflicts", logContext);
     const conflicts: ConflictDetectionResult[] = [];
  const billIds = (sponsorships || []).map(s => s.billId);
  if (billIds.length === 0) return conflicts;

  const financialAffiliations = (affiliations || []).filter(a => a.type === 'economic' || (a as any).conflictType === 'financial' || (a as any).conflictType === 'financial_direct' || (a as any).conflictType === 'financial_indirect'); // Broader check

     for (const affiliation of financialAffiliations) {
         try {
              // Use repository method to find relevant bills
             const affectedBills = await this.sponsorRepo.findBillsMentioningOrganization(affiliation.organization, billIds);

             if (affectedBills.length > 0) {
         const financialImpact = this.estimateFinancialImpact(sponsor, affiliation, affectedBills.length);
         const conflictType: ConflictType = ((affiliation as any).conflictType === 'financial_direct' || affiliation.type === 'economic') ? 'financial_direct' : 'financial_indirect';
         const severity = this.calculateConflictSeverity(conflictType, financialImpact, {
           multipleAffiliations: financialAffiliations.length > 2,
           recentActivity: this.isRecentActivity(affiliation),
           directBeneficiary: conflictType === 'financial_direct'
         });

         conflicts.push({
           conflictId: `${sponsor.id}-${conflictType}-${affiliation.id || 'na'}-${Date.now()}`,
           sponsorId: sponsor.id,
           conflictType,
           severity,
           description: `Financial affiliation with ${affiliation.organization} mentioned in ${affectedBills.length} bill(s)`,
           affectedBills: affectedBills.map(b => b.id || b.billId).filter(Boolean) as number[],
           financialImpact,
           detectedAt: new Date(),
           confidence: Math.min(0.9, 0.5 + (financialImpact / (financialImpact + 1000000))),
           evidence: [`affiliation:${affiliation.id}`, `org:${affiliation.organization}`],
           relatedAffiliationId: affiliation.id
         } as ConflictDetectionResult);
             }
         } catch (error) {
              loggerAny.error(`Error checking affiliation ${affiliation.id} for financial conflicts`, logContext, error);
         }
     }
  loggerAny.debug(`Found ${conflicts.length} financial conflicts`, logContext);
     return conflicts;
  }

  private async detectOrganizationalConflicts(sponsor: Sponsor, affiliations: SponsorAffiliation[], sponsorships: BillSponsorship[]): Promise<ConflictDetectionResult[]> {
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectOrganizationalConflicts', sponsorId: sponsor.id };
  loggerAny.debug("Detecting organizational conflicts", logContext);
     // ... Implementation using this.sponsorRepo.findBillsMentioningOrganization ...
      const conflicts: ConflictDetectionResult[] = [];
      const billIds = (sponsorships || []).map(s => s.billId);
      if (billIds.length === 0) return conflicts;

      const leadershipKeywords = ['director', 'board', 'executive', 'chairman', 'ceo', 'president', 'cfo', 'coo'];
      const leadershipRoles = (affiliations || []).filter(a => a.role && leadershipKeywords.some(k => a.role!.toLowerCase().includes(k)));

      for (const aff of leadershipRoles) {
        try {
          const affectedBills = await this.sponsorRepo.findBillsMentioningOrganization(aff.organization, billIds);
          if (affectedBills.length === 0) continue;
          const financialImpact = this.estimateFinancialImpact(sponsor, aff, affectedBills.length);
          const severity = this.calculateConflictSeverity('organizational', financialImpact, { leadershipRole: true });
          conflicts.push({
            conflictId: `${sponsor.id}-organizational-${aff.id || 'na'}-${Date.now()}`,
            sponsorId: sponsor.id,
            conflictType: 'organizational',
            severity,
            description: `Leadership role (${aff.role}) at ${aff.organization} referenced in ${affectedBills.length} bill(s)`,
            affectedBills: affectedBills.map(b => b.id || b.billId).filter(Boolean) as number[],
            financialImpact,
            detectedAt: new Date(),
            confidence: 0.7,
            evidence: [`affiliation:${aff.id}`, `role:${aff.role}`],
            relatedAffiliationId: aff.id
          });
        } catch (error) {
          loggerAny.error(`Error checking leadership affiliation ${aff.id}`, logContext, error);
        }
      }
      loggerAny.debug(`Found ${conflicts.length} organizational conflicts`, logContext);
      return conflicts;
  }

  private async detectTimingConflicts(sponsor: Sponsor, affiliations: SponsorAffiliation[], sponsorships: BillSponsorship[]): Promise<ConflictDetectionResult[]> {
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectTimingConflicts', sponsorId: sponsor.id };
  loggerAny.debug("Detecting timing conflicts", logContext);
      const conflicts: ConflictDetectionResult[] = [];

      for (const sponsorship of sponsorships) {
        try {
          // Fetch bill details using repository
          const bill = await this.sponsorRepo.getBill(sponsorship.billId);
          if (!bill || !bill.introducedDate) continue; // Skip if no bill or date

          // Filter affiliations with suspicious timing relative to bill introduction
          const suspiciousAffiliations = (affiliations || []).filter(aff => {
            if (!aff.startDate) return false;
            const billIntroTime = new Date(bill.introducedDate!).getTime();
            const affStartTime = new Date(aff.startDate).getTime();
            const daysDiff = Math.abs(affStartTime - billIntroTime) / (1000 * 60 * 60 * 24);
            return daysDiff <= this.conflictThresholds.timing.suspicious_days;
          });

          if (suspiciousAffiliations.length > 0) {
            // Check for very suspicious timing
            const verySuspicious = suspiciousAffiliations.some(aff => {
              const daysDiff = Math.abs(new Date(aff.startDate!).getTime() - new Date(bill.introducedDate!).getTime()) / (1000 * 60 * 60 * 24);
              return daysDiff <= this.conflictThresholds.timing.very_suspicious_days;
            });
            const severity = verySuspicious ? 'high' : 'medium';
            conflicts.push({
              conflictId: `${sponsor.id}-timing-${sponsorship.billId}-${Date.now()}`,
              sponsorId: sponsor.id,
              conflictType: 'timing_suspicious',
              severity,
              description: `Affiliation start date near bill introduction (${sponsorship.billId})`,
              affectedBills: [sponsorship.billId],
              financialImpact: 0,
              detectedAt: new Date(),
              confidence: verySuspicious ? 0.8 : 0.6,
              evidence: suspiciousAffiliations.map(a => `aff:${a.id}`),
              relatedAffiliationId: suspiciousAffiliations[0]?.id
            } as ConflictDetectionResult);
          }
        } catch (error) {
          loggerAny.error(`Error checking timing conflict for sponsorship ${sponsorship.id}`, logContext, error);
        }
      }
      loggerAny.debug(`Found ${conflicts.length} timing conflicts`, logContext);
      return conflicts;
  }

  private async detectDisclosureConflicts(sponsor: Sponsor, affiliations: SponsorAffiliation[], transparency: SponsorTransparency[]): Promise<ConflictDetectionResult[]> {
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectDisclosureConflicts', sponsorId: sponsor.id };
     loggerAny.debug("Detecting disclosure conflicts", logContext);
     const conflicts: ConflictDetectionResult[] = [];

     const expectedDisclosures = (affiliations || []).filter(a => a.type === 'economic' || (a as any).conflictType === 'financial').length;
     const actualDisclosures = (transparency || []).filter(t => (t as any).disclosureType === 'financial' && (t as any).isVerified).length;

     const completeness = expectedDisclosures > 0 ? actualDisclosures / expectedDisclosures : 1;

     if (completeness < this.conflictThresholds.disclosure.adequate_threshold) {
       const severity: ConflictSeverity = completeness < this.conflictThresholds.disclosure.complete_threshold ? 'high' : 'medium';
       const financialImpact = this.calculateAffiliationRisk(affiliations) * 10000; // rough proxy
       conflicts.push({
         conflictId: `${sponsor.id}-disclosure-${Date.now()}`,
         sponsorId: sponsor.id,
         conflictType: 'disclosure_incomplete',
         severity,
         description: `Disclosure completeness ${Math.round(completeness * 100)}% (${actualDisclosures}/${expectedDisclosures})`,
  affectedBills: [],
         financialImpact,
         detectedAt: new Date(),
         confidence: 0.6,
         evidence: [`expected:${expectedDisclosures}`, `actual:${actualDisclosures}`],
       } as ConflictDetectionResult);
     }

     loggerAny.debug(`Found ${conflicts.length} disclosure conflicts`, logContext);
     return conflicts;
  }

  // ============================================================================
  // PRIVATE RISK CALCULATION & UTILITY METHODS
  // (Implementations are the same as provided previously)
  // ============================================================================
  private calculateFinancialRisk(sponsor: Sponsor): number {
    const exposure = this.parseNumeric((sponsor as any).financialExposure);
    if (exposure <= 0) return 0;
    if (exposure < this.conflictThresholds.financial.low) return 10;
    if (exposure < this.conflictThresholds.financial.medium) return 30;
    if (exposure < this.conflictThresholds.financial.high) return 60;
    if (exposure < this.conflictThresholds.financial.critical) return 85;
    return 100;
  }

  private calculateAffiliationRisk(affiliations: SponsorAffiliation[]): number {
    if (!affiliations || affiliations.length === 0) return 0;
    const direct = affiliations.filter(a => (a as any).conflictType === 'financial' || (a as any).conflictType === 'ownership').length;
    const indirect = affiliations.filter(a => (a as any).conflictType === 'influence' || (a as any).conflictType === 'representation').length;
    let risk = direct * 20 + indirect * 10;
    if (affiliations.length > this.conflictThresholds.affiliation.critical_count) risk += 30;
    else if (affiliations.length > this.conflictThresholds.affiliation.high_count) risk += 15;
    return Math.min(100, risk);
  }

  private calculateTransparencyRisk(transparency: SponsorTransparency[], affiliations: SponsorAffiliation[]): number {
    const expected = (affiliations || []).filter(a => a.type === 'economic' || (a as any).conflictType === 'financial').length;
    if (expected === 0) return 0;
    const actual = (transparency || []).filter(t => (t as any).disclosureType === 'financial' && (t as any).isVerified).length;
    const completeness = actual / expected;
    return Math.round((1 - completeness) * 100);
  }

  private calculateBehavioralRisk(sponsor: Sponsor): number {
    const votingAlignment = this.parseNumeric((sponsor as any).votingAlignment);
    if (votingAlignment <= 0) return 10;
    if (votingAlignment > 95 || votingAlignment < 5) return 90;
    if (votingAlignment > 90 || votingAlignment < 10) return 70;
    if (votingAlignment > 85 || votingAlignment < 15) return 50;
    if (votingAlignment > 80 || votingAlignment < 20) return 30;
    return 10;
  }

  private calculateWeightedRiskScore(breakdown: RiskProfile['breakdown']): number {
    const weights = { financial: 0.35, affiliation: 0.30, transparency: 0.20, behavioral: 0.15 };
    return Math.round(
      (breakdown.financialRisk * weights.financial) +
      (breakdown.affiliationRisk * weights.affiliation) +
      (breakdown.transparencyRisk * weights.transparency) +
      (breakdown.behavioralRisk * weights.behavioral)
    );
  }

  private determineRiskLevel(score: number): ConflictSeverity {
    if (score >= 75) return 'critical';
    if (score >= 55) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  private generateRiskRecommendations(level: ConflictSeverity, breakdown: RiskProfile['breakdown']): string[] {
    const recs: string[] = [];
    if (level === 'critical' || level === 'high') recs.push('Flag for manual review and possible disclosure update.');
    if (breakdown.financialRisk > 70) recs.push('Require detailed financial disclosure and recusal from votes affecting major interests.');
    if (breakdown.affiliationRisk > 60) recs.push('Investigate board/director relationships and conflicts.');
    if (breakdown.transparencyRisk > 50) recs.push('Request missing disclosure records and verify.');
    if (breakdown.behavioralRisk > 60) recs.push('Review voting history and committee assignments.');
    if (recs.length === 0) recs.push('No immediate action; monitor ongoing activity.');
    return recs;
  }

  private estimateFinancialImpact(sponsor: Sponsor, affiliation: SponsorAffiliation, billCount: number): number {
    const base = Math.max(0, this.parseNumeric((sponsor as any).financialExposure));
    let impact = Math.round((base / 10) * Math.max(1, billCount));
    if (affiliation.type === 'economic') impact *= 2;
    if ((affiliation as any).conflictType === 'financial') impact *= 3;
    if (affiliation.role && /director|board|executive|chairman|ceo/i.test(affiliation.role)) impact = Math.round(impact * 1.5);
    return Math.round(impact);
  }

  private isRecentActivity(affiliation: SponsorAffiliation): boolean {
    if (!affiliation.startDate) return false;
    const start = new Date(affiliation.startDate).getTime();
    const now = Date.now();
    const days = (now - start) / (1000 * 60 * 60 * 24);
    return days <= 90; // recent = within 90 days
  }

  private parseNumeric(value: any): number {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number') return value;
    const asNum = Number(String(value).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(asNum) ? asNum : 0;
  }

  private formatDate(date: any): string {
    if (!date) return '';
    try { return new Date(date).toISOString(); } catch { return String(date); }
  }
  // --------------------------------------------------------------------------
  // NETWORK / VISUALIZATION HELPERS
  // Build nodes representing sponsors, organizations and bills from conflicts
  private async buildConflictNodes(conflicts: ConflictDetectionResult[]): Promise<ConflictNode[]> {
    const nodes: ConflictNode[] = [];
    const sponsorIds = Array.from(new Set(conflicts.map(c => c.sponsorId)));
    const sponsorMap = new Map<number, Sponsor>();

    // Fetch sponsor details in bulk
    try {
      const sponsors = await this.sponsorRepo.findByIds(sponsorIds);
      sponsors.forEach(s => sponsorMap.set(s.id, s));
    } catch (e) {
      // if repository fails, we'll still build minimal sponsor nodes from IDs
    }

    const orgSet = new Set<string>();
    const billSet = new Set<number>();

    // Collect organization names and bill ids referenced in conflicts
    for (const c of conflicts) {
      for (const ev of c.evidence) {
        if (ev.startsWith('org:')) orgSet.add(ev.replace(/^org:/, ''));
        if (ev.startsWith('affiliation:')) {
          const parts = ev.split(':');
          if (parts[1]) orgSet.add(parts[1]);
        }
      }
      for (const b of c.affectedBills || []) billSet.add(b);
    }

    // Sponsor nodes
    for (const id of sponsorIds) {
      const sponsor = sponsorMap.get(id);
      nodes.push({
        id: `sponsor:${id}`,
        type: 'sponsor',
        name: sponsor ? `${(sponsor as any).firstName || ''} ${(sponsor as any).lastName || ''}`.trim() || `Sponsor ${id}` : `Sponsor ${id}`,
        conflictLevel: this.determineRiskLevel(this.calculateWeightedRiskScore({ financialRisk: this.calculateFinancialRisk(sponsor as any), affiliationRisk: 0, transparencyRisk: 0, behavioralRisk: 0 })),
        size: this.calculateNodeSize('medium'),
        color: this.severityColors.medium,
        metadata: { sponsorId: id }
      });
    }

    // Organization nodes
    for (const org of Array.from(orgSet)) {
      nodes.push({
        id: `org:${org}`,
        type: 'organization',
        name: org,
        conflictLevel: 'medium',
        size: this.calculateNodeSize('medium'),
        color: this.severityColors.medium,
        metadata: {}
      });
    }

    // Bill nodes
    for (const billId of Array.from(billSet)) {
      let title = `Bill ${billId}`;
      try {
        const b = await this.sponsorRepo.getBill(billId as number);
        if (b && (b as any).title) title = (b as any).title;
      } catch (e) {
        // ignore
      }
      nodes.push({
        id: `bill:${billId}`,
        type: 'bill',
        name: title,
        conflictLevel: 'low',
        size: this.calculateNodeSize('low'),
        color: this.severityColors.low,
        metadata: { billId }
      });
    }

    return nodes;
  }

  // Build edges connecting sponsors <-> organizations and sponsors <-> bills using conflicts
  private async buildConflictEdges(conflicts: ConflictDetectionResult[]): Promise<ConflictEdge[]> {
    const edges: ConflictEdge[] = [];
    const seen = new Set<string>();

    for (const c of conflicts) {
      const sponsorNode = `sponsor:${c.sponsorId}`;

      // edges to organizations from evidence
      for (const ev of c.evidence) {
        if (ev.startsWith('org:')) {
          const org = ev.replace(/^org:/, '');
          const target = `org:${org}`;
          const key = `${sponsorNode}|${target}|${c.conflictType}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({ source: sponsorNode, target, type: c.conflictType, weight: this.calculateEdgeWeight(c.severity), severity: c.severity, label: this.getConflictTypeLabel(c.conflictType) });
          }
        }
      }

      // edges to bills
      for (const bid of c.affectedBills || []) {
        const target = `bill:${bid}`;
        const key = `${sponsorNode}|${target}|${c.conflictType}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ source: sponsorNode, target, type: c.conflictType, weight: this.calculateEdgeWeight(c.severity), severity: c.severity, label: `affects bill ${bid}` });
        }
      }
    }

    return edges;
  }

  private async identifyConflictClusters(nodes: ConflictNode[], edges: ConflictEdge[]): Promise<ConflictCluster[]> {
    const clusters: ConflictCluster[] = [];
    const visited = new Set<string>();

    for (const node of nodes) {
      if (visited.has(node.id)) continue;
      const component = this.findConnectedComponents(node.id, nodes, edges, visited);
      const center = this.findCenterNode(component, edges);
      const density = this.calculateClusterDensity(component, edges);
      const riskLevel = this.calculateClusterRiskLevel(component, nodes);
      clusters.push({ id: `cluster:${center}`, members: component, centerNode: center, conflictDensity: density, riskLevel });
    }

    return clusters;
  }

  private calculateNetworkMetrics(nodes: ConflictNode[], edges: ConflictEdge[]): NetworkMetrics {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const density = totalNodes > 1 ? (2 * totalEdges) / (totalNodes * (totalNodes - 1)) : 0;
    const clustering = this.calculateClusteringCoefficient(nodes, edges);

    const centralityScores: Record<string, number> = {};
    nodes.forEach(n => {
      centralityScores[n.id] = edges.filter(e => e.source === n.id || e.target === n.id).length;
    });

    const riskDistribution: Record<ConflictSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    nodes.forEach(n => { riskDistribution[n.conflictLevel] = (riskDistribution[n.conflictLevel] || 0) + 1; });

    return { totalNodes, totalEdges, density, clustering, centralityScores, riskDistribution };
  }

  private calculateClusteringCoefficient(nodes: ConflictNode[], edges: ConflictEdge[]): number {
    let totalCoefficient = 0;
    let count = 0;
    for (const node of nodes) {
      const neighbors = this.getNeighbors(node.id, edges);
      if (neighbors.length < 2) continue;
      let links = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const a = neighbors[i];
          const b = neighbors[j];
          if (edges.some(e => (e.source === a && e.target === b) || (e.source === b && e.target === a))) links++;
        }
      }
      const possible = (neighbors.length * (neighbors.length - 1)) / 2;
      totalCoefficient += possible > 0 ? links / possible : 0;
      count++;
    }
    return count > 0 ? totalCoefficient / count : 0;
  }

  private findConnectedComponents(startNode: string, nodes: ConflictNode[], edges: ConflictEdge[], visited: Set<string>): string[] {
    const stack = [startNode];
    const component: string[] = [];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      component.push(cur);
      const neighbors = this.getNeighbors(cur, edges).filter(n => !visited.has(n));
      stack.push(...neighbors);
    }
    return component;
  }

  private findCenterNode(cluster: string[], edges: ConflictEdge[]): string {
    let best = cluster[0];
    let bestConn = -1;
    for (const node of cluster) {
      const conn = edges.filter(e => cluster.includes(e.source) && cluster.includes(e.target) && (e.source === node || e.target === node)).length;
      if (conn > bestConn) { bestConn = conn; best = node; }
    }
    return best;
  }

  private calculateClusterDensity(cluster: string[], edges: ConflictEdge[]): number {
    const clusterEdges = edges.filter(e => cluster.includes(e.source) && cluster.includes(e.target)).length;
    const maxPossible = (cluster.length * (cluster.length - 1)) / 2;
    return maxPossible > 0 ? clusterEdges / maxPossible : 0;
  }

  private calculateClusterRiskLevel(cluster: string[], nodes: ConflictNode[]): ConflictSeverity {
    const clusterNodes = nodes.filter(n => cluster.includes(n.id));
    if (clusterNodes.length === 0) return 'low';
    const map = { low: 1, medium: 2, high: 3, critical: 4 } as Record<ConflictSeverity, number>;
    const avg = clusterNodes.reduce((s, n) => s + map[n.conflictLevel], 0) / clusterNodes.length;
    if (avg >= 3.5) return 'critical';
    if (avg >= 2.5) return 'high';
    if (avg >= 1.5) return 'medium';
    return 'low';
  }

  private getNeighbors(nodeId: string, edges: ConflictEdge[]): string[] {
    return edges.filter(e => e.source === nodeId || e.target === nodeId).map(e => e.source === nodeId ? e.target : e.source);
  }

  private calculateNodeSize(severity: ConflictSeverity): number {
    switch (severity) {
      case 'critical': return 18;
      case 'high': return 14;
      case 'medium': return 10;
      default: return 6;
    }
  }

  private calculateEdgeWeight(severity: ConflictSeverity): number {
    switch (severity) {
      case 'critical': return 5;
      case 'high': return 3;
      case 'medium': return 2;
      default: return 1;
    }
  }

  private getConflictTypeLabel(type: ConflictType): string {
    switch (type) {
      case 'financial_direct': return 'Direct financial';
      case 'financial_indirect': return 'Indirect financial';
      case 'organizational': return 'Organizational';
      case 'family_business': return 'Family/business';
      case 'voting_pattern': return 'Voting pattern';
      case 'timing_suspicious': return 'Timing suspicious';
      case 'disclosure_incomplete': return 'Disclosure incomplete';
      default: return String(type);
    }
  }

}

// Export singleton instance
export const sponsorConflictAnalysisService = new SponsorConflictAnalysisService();