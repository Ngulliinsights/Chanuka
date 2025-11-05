// Import the NEW service for data access
import { sponsorService } from './sponsor-service-direct';
import { logger  } from '@shared/core/index.js';
const loggerAny = logger as any;
import type { Sponsor, Bill } from '@shared/schema';
// Local helper types used by this service but not exported elsewhere in repo
type BillSponsorship = { id?: number; bill_id: number; role?: string  };

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
  sponsor_id: number;
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
  conflict_level: ConflictSeverity;
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

export interface ConflictPrediction { bill_id: number;
  billTitle: string;
  predictedConflictType: ConflictType;
  probability: number;
  riskFactors: string[];
 }

export interface ConflictTrend {
  sponsor_id: number;
  timeframe: string;
  conflictCount: number;
  severityTrend: 'increasing' | 'decreasing' | 'stable';
  risk_score: number;
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
 * Relies on the SponsorService for data fetching. Contains NO direct DB queries.
 */
export class SponsorConflictAnalysisService {
  // Inject service dependency (using the singleton instance for simplicity)
  private sponsorService = sponsorService;

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
   * @param sponsor_id Optional ID to analyze a single sponsors. If omitted, analyzes all active sponsors.
   * @returns Array of detected conflicts.
   */
  async detectConflicts(sponsor_id?: number): Promise<ConflictDetectionResult[]> {
    const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectConflicts', sponsor_id };
    loggerAny.info(`Starting conflict detection for ${sponsor_id ? `sponsor ${sponsor_id}` : 'all active sponsors'}`, logContext);

    try {
      // 1. Get Sponsor(s) and their related data using the Repository
      const sponsorsToAnalyze = await (sponsor_id
        ? this.getSponsorData([sponsor_id])
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
          this.detectFinancialConflicts(sponsor, sponsors.affiliations || [], sponsors.sponsorships || []),
          this.detectOrganizationalConflicts(sponsor, sponsors.affiliations || [], sponsors.sponsorships || []),
          // Voting pattern analysis requires historical voting data - might be separate service or complex query
          // this.detectVotingPatternConflicts(sponsor, sponsors.affiliations, votingHistory),
          this.detectTimingConflicts(sponsor, sponsors.affiliations || [], sponsors.sponsorships || []),
          this.detectDisclosureConflicts(sponsor, sponsors.affiliations || [], sponsors.transparency || [])
        ]);

        // Collect results, logging errors from failed promises
        const results: ConflictDetectionResult[] = [];
        sponsorConflicts.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(...result.value);
          } else {
            loggerAny.error(`Conflict detection algorithm ${index} failed for sponsor ${sponsors.id}`, logContext, result.reason);
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
  // now call `this.sponsorService` for data fetching.
  // Example modification for generateRiskProfile:
  async generateRiskProfile(sponsor_id: number): Promise<RiskProfile> {
      const logContext = { component: 'SponsorConflictAnalysisService', operation: 'generateRiskProfile', sponsor_id };
  loggerAny.info(`Generating risk profile`, logContext);
      try {
          // Fetch data using the repository
          const sponsor = await this.sponsorService.findById(sponsor_id);
          if (!sponsor) throw new Error(`Sponsor ${sponsor_id} not found`);

          // Fetch related data concurrently using repository methods
          const [affiliations, transparency] = await Promise.all([
              this.sponsorService.listAffiliations(sponsor_id),
              this.sponsorService.listTransparencyRecords(sponsor_id)
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
       throw new Error(`Risk profile generation failed for sponsor ${sponsor_id}: ${this.getErrorMessage(error)}`);
      }
  }
  // --- Implement createConflictMapping and analyzeConflictTrends similarly, replacing data fetches ---
   async createConflictMapping(bill_id?: number): Promise<ConflictMapping> { const logContext = { component: 'SponsorConflictAnalysisService', operation: 'createConflictMapping', bill_id  };
     loggerAny.info('Building conflict mapping', logContext);
     try { // Detect conflicts (optionally filter by bill)
       const allConflicts = await this.detectConflicts();
       const conflicts = typeof bill_id === 'number' ? allConflicts.filter(c => c.affectedBills.includes(bill_id)) : allConflicts;

       // Build nodes and edges
       const nodes = await this.buildConflictNodes(conflicts);
       const edges = await this.buildConflictEdges(conflicts);

       // Identify clusters and metrics
       const clusters = await this.identifyConflictClusters(nodes, edges);
       const metrics = this.calculateNetworkMetrics(nodes, edges);

       loggerAny.info(`Conflict mapping built: ${nodes.length } nodes, ${edges.length} edges`, logContext);
       return { nodes, edges, clusters, metrics };
     } catch (error) {
       loggerAny.error('Error building conflict mapping', logContext, error);
       return { nodes: [], edges: [], clusters: [], metrics: { totalNodes: 0, totalEdges: 0, density: 0, clustering: 0, centralityScores: {}, riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 } } };
     }
   }
   async analyzeConflictTrends(sponsor_id?: number, timeframeMonths: number = 12): Promise<ConflictTrend[]> { /* Minimal implementation */
     // Simple wrapper using getHistoricalConflicts
     if (!sponsor_id) return [];
     const start_date = new Date(); startDate.setMonth(start_date.getMonth() - timeframeMonths);
     const history = await this.getHistoricalConflicts(sponsor_id, start_date);
     const metrics = this.calculateTrendMetrics(history, timeframeMonths);
     return [{ sponsor_id, timeframe: `${timeframeMonths}m`, conflictCount: history.length, severityTrend: metrics.severityTrend, risk_score: metrics.risk_score, predictions: await this.generateConflictPredictions(sponsor_id) }];
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
  private async getHistoricalConflicts(sponsor_id: number, start_date: Date): Promise<ConflictDetectionResult[]> {
    // For now, simulate by detecting current conflicts and filtering by detectedAt
    const current = await this.detectConflicts(sponsor_id);
    return current.filter(c => c.detectedAt >= start_date);
  }

  private calculateTrendMetrics(historicalConflicts: ConflictDetectionResult[], timeframeMonths: number): { severityTrend: 'increasing'|'decreasing'|'stable'; risk_score: number } {
    if (historicalConflicts.length === 0) return { severityTrend: 'stable', risk_score: 0 };
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
    const risk_score = Math.min((conflictCount * 10) + (avgSeverity * 20), 100);
    return { severityTrend, risk_score };
  }

  private calculateAverageSeverity(conflicts: ConflictDetectionResult[]): number {
    if (conflicts.length === 0) return 0;
    const map = { low: 1, medium: 2, high: 3, critical: 4 } as Record<ConflictSeverity, number>;
    const total = conflicts.reduce((s, c) => s + map[c.severity], 0);
    return total / conflicts.length;
  }

  private async generateConflictPredictions(sponsor_id: number): Promise<ConflictPrediction[]> {
    // Very simple predictions: look at sponsor affiliations and upcoming bills
    const affiliations = await this.sponsorService.listAffiliations(sponsor_id);
    const allBills = [] as Array<{ id: number; title?: string }>; // Placeholder - repository method not used here
    const upcoming = allBills.slice(0,5);
    return upcoming.map(b => ({ bill_id: b.id, billTitle: b.title || '', predictedConflictType: 'financial_indirect', probability: 0.2, riskFactors: affiliations.slice(0,2).map(a=>a.organization)  }));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS - Data Fetching Orchestration
  // ============================================================================

  /** Fetches a list of sponsors with their relations efficiently. */
  private async getSponsorData(sponsor_ids: number[]): Promise<Array<SponsorWithRelations | null>> {
      if (sponsor_ids.length === 0) return [];
      // Fetch all data concurrently using repository methods
      try {
          const [sponsors, affiliationsMap, transparencyMap, sponsorshipsMap] = await Promise.all([
              this.sponsorService.findByIds(sponsor_ids),
              // TODO: Implement bulk affiliation fetching
              new Map(), // this.sponsorService.findAffiliationsBySponsorIds(sponsor_ids),
              // TODO: Implement bulk transparency fetching  
              new Map(), // this.sponsorService.findTransparencyBySponsorIds(sponsor_ids),
              // Fetch sponsorships initiated BY these sponsors
              Promise.all(sponsor_ids.map(id => this.sponsorService.listBillSponsorshipsBySponsor(id)))
                  .then(results => new Map(results.map((spons, i) => [sponsor_ids[i], spons]))) // Create map
          ]);

          // Combine data for each sponsor
          return sponsors.map(sponsor => ({
              ...sponsor,
              affiliations: affiliationsMap.get(sponsors.id) || [],
              transparency: transparencyMap.get(sponsors.id) || [],
              sponsorships: sponsorshipsMap.get(sponsors.id) || []
          }));
      } catch (error) {
           loggerAny.error("Failed to fetch bulk sponsor data with relations", { component: 'SponsorConflictAnalysisService', sponsor_ids }, error);
           // Return nulls for requested IDs to indicate failure for those specific sponsors
           return sponsor_ids.map(() => null);
      }
  }


  /** Fetches all active sponsors and their related data. */
  private async getAllActiveSponsorData(): Promise<SponsorWithRelations[]> {
      try {
           const activeSponsors = await this.sponsorService.list({ is_active: true, limit: 1000 }); // Add reasonable limit
           const sponsor_ids = activeSponsors.map(s => s.id);
           // Fetch relations in bulk
           const [affiliationsMap, transparencyMap, sponsorshipsMap] = await Promise.all([
               // TODO: Implement bulk operations
               new Map(), // this.sponsorService.findAffiliationsBySponsorIds(sponsor_ids),
               new Map(), // this.sponsorService.findTransparencyBySponsorIds(sponsor_ids),
               Promise.all(sponsor_ids.map(id => this.sponsorService.listBillSponsorshipsBySponsor(id)))
                  .then(results => new Map(results.map((spons, i) => [sponsor_ids[i], spons])))
           ]);

           // Combine
           return activeSponsors.map(sponsor => ({
               ...sponsor,
               affiliations: affiliationsMap.get(sponsors.id) || [],
               transparency: transparencyMap.get(sponsors.id) || [],
               sponsorships: sponsorshipsMap.get(sponsors.id) || []
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
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectFinancialConflicts', sponsor_id: sponsors.id };
  loggerAny.debug("Detecting financial conflicts", logContext);
     const conflicts: ConflictDetectionResult[] = [];
  const bill_ids = (sponsorships || []).map(s => s.bill_id);
  if (bill_ids.length === 0) return conflicts;

  const financialAffiliations = (affiliations || []).filter(a => a.type === 'economic' || (a as any).conflictType === 'financial' || (a as any).conflictType === 'financial_direct' || (a as any).conflictType === 'financial_indirect'); // Broader check

     for (const affiliation of financialAffiliations) {
         try {
              // Use repository method to find relevant bills
             // TODO: Implement findBillsMentioningOrganization
             const affectedBills = []; // await this.sponsorService.findBillsMentioningOrganization(affiliation.organization, bill_ids);

             if (affectedBills.length > 0) {
         const financialImpact = this.estimateFinancialImpact(sponsor, affiliation, affectedBills.length);
         const conflictType: ConflictType = ((affiliation as any).conflictType === 'financial_direct' || affiliation.type === 'economic') ? 'financial_direct' : 'financial_indirect';
         const severity = this.calculateConflictSeverity(conflictType, financialImpact, {
           multipleAffiliations: financialAffiliations.length > 2,
           recentActivity: this.isRecentActivity(affiliation),
           directBeneficiary: conflictType === 'financial_direct'
         });

         conflicts.push({
           conflictId: `${sponsors.id}-${conflictType}-${affiliation.id || 'na'}-${Date.now()}`,
           sponsor_id: sponsors.id,
           conflictType,
           severity,
           description: `Financial affiliation with ${affiliation.organization} mentioned in ${affectedBills.length} bill(s)`,
           affectedBills: affectedBills.map(b => b.id || b.bill_id).filter(Boolean) as number[],
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
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectOrganizationalConflicts', sponsor_id: sponsors.id };
  loggerAny.debug("Detecting organizational conflicts", logContext);
     // ... Implementation using this.sponsorService.findBillsMentioningOrganization ...
      const conflicts: ConflictDetectionResult[] = [];
      const bill_ids = (sponsorships || []).map(s => s.bill_id);
      if (bill_ids.length === 0) return conflicts;

      const leadershipKeywords = ['director', 'board', 'executive', 'chairman', 'ceo', 'president', 'cfo', 'coo'];
      const leadershipRoles = (affiliations || []).filter(a => a.role && leadershipKeywords.some(k => a.role!.toLowerCase().includes(k)));

      for (const aff of leadershipRoles) {
        try {
          // TODO: Implement findBillsMentioningOrganization
          const affectedBills = []; // await this.sponsorService.findBillsMentioningOrganization(aff.organization, bill_ids);
          if (affectedBills.length === 0) continue;
          const financialImpact = this.estimateFinancialImpact(sponsor, aff, affectedBills.length);
          const severity = this.calculateConflictSeverity('organizational', financialImpact, { leadershipRole: true });
          conflicts.push({
            conflictId: `${sponsors.id}-organizational-${aff.id || 'na'}-${Date.now()}`,
            sponsor_id: sponsors.id,
            conflictType: 'organizational',
            severity,
            description: `Leadership role (${aff.role}) at ${aff.organization} referenced in ${affectedBills.length} bill(s)`,
            affectedBills: affectedBills.map(b => b.id || b.bill_id).filter(Boolean) as number[],
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
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectTimingConflicts', sponsor_id: sponsors.id };
  loggerAny.debug("Detecting timing conflicts", logContext);
      const conflicts: ConflictDetectionResult[] = [];

      for (const sponsorship of sponsorships) {
        try {
          // Fetch bill details using repository
          // TODO: Implement getBill method
          const bill = null; // await this.sponsorService.getBill(sponsorship.bill_id);
          if (!bill || !bills.introduced_date) continue; // Skip if no bill or date

          // Filter affiliations with suspicious timing relative to bill introduction
          const suspiciousAffiliations = (affiliations || []).filter(aff => {
            if (!aff.start_date) return false;
            const billIntroTime = new Date(bills.introduced_date!).getTime();
            const affStartTime = new Date(aff.start_date).getTime();
            const daysDiff = Math.abs(affStartTime - billIntroTime) / (1000 * 60 * 60 * 24);
            return daysDiff <= this.conflictThresholds.timing.suspicious_days;
          });

          if (suspiciousAffiliations.length > 0) {
            // Check for very suspicious timing
            const verySuspicious = suspiciousAffiliations.some(aff => {
              const daysDiff = Math.abs(new Date(aff.start_date!).getTime() - new Date(bills.introduced_date!).getTime()) / (1000 * 60 * 60 * 24);
              return daysDiff <= this.conflictThresholds.timing.very_suspicious_days;
            });
            const severity = verySuspicious ? 'high' : 'medium';
            conflicts.push({
              conflictId: `${sponsors.id}-timing-${sponsorship.bill_id}-${Date.now()}`,
              sponsor_id: sponsors.id,
              conflictType: 'timing_suspicious',
              severity,
              description: `Affiliation start date near bill introduction (${sponsorship.bill_id})`,
              affectedBills: [sponsorship.bill_id],
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
     const logContext = { component: 'SponsorConflictAnalysisService', operation: 'detectDisclosureConflicts', sponsor_id: sponsors.id };
     loggerAny.debug("Detecting disclosure conflicts", logContext);
     const conflicts: ConflictDetectionResult[] = [];

     const expectedDisclosures = (affiliations || []).filter(a => a.type === 'economic' || (a as any).conflictType === 'financial').length;
     const actualDisclosures = (transparency || []).filter(t => (t as any).disclosureType === 'financial' && (t as any).is_verified).length;

     const completeness = expectedDisclosures > 0 ? actualDisclosures / expectedDisclosures : 1;

     if (completeness < this.conflictThresholds.disclosure.adequate_threshold) {
       const severity: ConflictSeverity = completeness < this.conflictThresholds.disclosure.complete_threshold ? 'high' : 'medium';
       const financialImpact = this.calculateAffiliationRisk(affiliations) * 10000; // rough proxy
       conflicts.push({
         conflictId: `${sponsors.id}-disclosure-${Date.now()}`,
         sponsor_id: sponsors.id,
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
    const exposure = this.parseNumeric((sponsor as any).financial_exposure);
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
    const actual = (transparency || []).filter(t => (t as any).disclosureType === 'financial' && (t as any).is_verified).length;
    const completeness = actual / expected;
    return Math.round((1 - completeness) * 100);
  }

  private calculateBehavioralRisk(sponsor: Sponsor): number {
    const voting_alignment = this.parseNumeric((sponsor as any).voting_alignment);
    if (voting_alignment <= 0) return 10;
    if (voting_alignment > 95 || voting_alignment < 5) return 90;
    if (voting_alignment > 90 || voting_alignment < 10) return 70;
    if (voting_alignment > 85 || voting_alignment < 15) return 50;
    if (voting_alignment > 80 || voting_alignment < 20) return 30;
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
    const base = Math.max(0, this.parseNumeric((sponsor as any).financial_exposure));
    let impact = Math.round((base / 10) * Math.max(1, billCount));
    if (affiliation.type === 'economic') impact *= 2;
    if ((affiliation as any).conflictType === 'financial') impact *= 3;
    if (affiliation.role && /director|board|executive|chairman|ceo/i.test(affiliation.role)) impact = Math.round(impact * 1.5);
    return Math.round(impact);
  }

  private isRecentActivity(affiliation: SponsorAffiliation): boolean {
    if (!affiliation.start_date) return false;
    const start = new Date(affiliation.start_date).getTime();
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
    const sponsor_ids = Array.from(new Set(conflicts.map(c => c.sponsor_id)));
    const sponsorMap = new Map<number, Sponsor>();

    // Fetch sponsor details in bulk
    try {
      const sponsors = await this.sponsorService.findByIds(sponsor_ids);
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
    for (const id of sponsor_ids) {
      const sponsor = sponsorMap.get(id);
      nodes.push({
        id: `sponsor:${id}`,
        type: 'sponsor',
        name: sponsor ? `${(sponsor as any).first_name || ''} ${(sponsor as any).last_name || ''}`.trim() || `Sponsor ${id}` : `Sponsor ${id}`,
        conflict_level: this.determineRiskLevel(this.calculateWeightedRiskScore({ financialRisk: this.calculateFinancialRisk(sponsor as any), affiliationRisk: 0, transparencyRisk: 0, behavioralRisk: 0 })),
        size: this.calculateNodeSize('medium'),
        color: this.severityColors.medium,
        metadata: { sponsor_id: id }
      });
    }

    // Organization nodes
    for (const org of Array.from(orgSet)) {
      nodes.push({
        id: `org:${org}`,
        type: 'organization',
        name: org,
        conflict_level: 'medium',
        size: this.calculateNodeSize('medium'),
        color: this.severityColors.medium,
        metadata: {}
      });
    }

    // Bill nodes
    for (const bill_id of Array.from(billSet)) { let title = `Bill ${bill_id }`;
      try { 
        // TODO: Implement getBill method
        const b = null; // await this.sponsorService.getBill(bill_id as number);
        if (b && (b as any).title) title = (b as any).title;
       } catch (e) {
        // ignore
      }
      nodes.push({ id: `bill:${bill_id }`,
        type: 'bill',
        name: title,
        conflict_level: 'low',
        size: this.calculateNodeSize('low'),
        color: this.severityColors.low,
        metadata: { bill_id  }
      });
    }

    return nodes;
  }

  // Build edges connecting sponsors <-> organizations and sponsors <-> bills using conflicts
  private async buildConflictEdges(conflicts: ConflictDetectionResult[]): Promise<ConflictEdge[]> {
    const edges: ConflictEdge[] = [];
    const seen = new Set<string>();

    for (const c of conflicts) {
      const sponsorNode = `sponsor:${c.sponsor_id}`;

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
    nodes.forEach(n => { riskDistribution[n.conflict_level] = (riskDistribution[n.conflict_level] || 0) + 1; });

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
    const avg = clusterNodes.reduce((s, n) => s + map[n.conflict_level], 0) / clusterNodes.length;
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
