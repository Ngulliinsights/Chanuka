import {
  ConstitutionalAnalysisResult,
  constitutionalAnalysisService,
} from '@server/features/analysis/application/constitutional-analysis.service';
import {
  publicInterestAnalysisService,
  PublicInterestScoreResult,
} from '@server/features/analysis/application/public-interest-analysis.service';
import {
  StakeholderAnalysisResult,
  stakeholderAnalysisService,
} from '@server/features/analysis/application/stakeholder-analysis.service';
import {
  transparencyAnalysisService,
  TransparencyScoreResult,
} from '@server/features/analysis/application/transparency-analysis.service';
import type { ConflictDetectionResult } from '@server/features/sponsors/application/sponsor-conflict-analysis.service';
import { sponsorConflictAnalysisService } from '@server/features/sponsors/application/sponsor-conflict-analysis.service';
import {
  generateRecommendedActions,
  calculateOverallConfidence,
} from '@server/features/analysis/domain/recommendation-generator.domain';
import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import { and, eq } from 'drizzle-orm';
import * as schema from '@server/infrastructure/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface ConflictSummary {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  affectedSponsorsCount: number;
  totalFinancialExposureEstimate: number;
  directConflictCount: number;
  indirectConflictCount: number;
  relatedConflictDetails?: ConflictDetectionResult[];
}

export interface ComprehensiveBillAnalysis {
  bill_id: string;
  analysis_id: string;
  timestamp: Date;
  constitutionalAnalysis: ConstitutionalAnalysisResult;
  conflictAnalysisSummary: ConflictSummary;
  stakeholderImpact: StakeholderAnalysisResult;
  transparency_score: TransparencyScoreResult;
  publicInterestScore: PublicInterestScoreResult;
  recommendedActions: string[];
  overallConfidence: number;
}

/** Shape stored in the database — must satisfy schema.analysis.$inferInsert */
interface StoredAnalysisData {
  analysis_id: string;
  constitutionalAnalysis: ConstitutionalAnalysisResult;
  conflictAnalysisSummary: ConflictSummary;
  stakeholderImpact: StakeholderAnalysisResult;
  transparency_score: TransparencyScoreResult;
  publicInterestScore: PublicInterestScoreResult;
  overallConfidence: number;
  recommendations: string[];
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Orchestrates individual analysis services to produce a comprehensive
 * real-time analysis of a legislative bill.
 *
 * This service is strictly an **orchestrator** — it coordinates async
 * pipelines and delegates all domain logic (scoring, recommendations)
 * to pure domain modules.
 */
export class BillComprehensiveAnalysisService {

  /**
   * Runs all relevant analyses for a given bill ID.
   */
  async analyzeBill(bill_id: string): Promise<ComprehensiveBillAnalysis> {
    const analysis_id = `comp_analysis_${bill_id}_${Date.now()}`;
    const timestamp   = new Date();

    logger.info({ bill_id, analysis_id }, '🚀 Starting comprehensive analysis');

    try {
      // --- Step 1: Run independent analyses concurrently ---
      const results = await Promise.allSettled([
        constitutionalAnalysisService.analyzeBill(bill_id),
        stakeholderAnalysisService.analyzeBill(bill_id),
        this.analyzeSponsorConflictsForBill(bill_id),
      ]);

      const constitutional  = results[0].status === 'fulfilled'
        ? results[0].value
        : this.getDefaultConstitutionalResult(results[0].reason);

      const stakeholder     = results[1].status === 'fulfilled'
        ? results[1].value
        : this.getDefaultStakeholderResult(results[1].reason);

      const conflictSummary = results[2].status === 'fulfilled'
        ? results[2].value
        : this.getDefaultConflictSummary(results[2].reason);

      // --- Step 2: Dependent analyses ---
      const transparency   = await transparencyAnalysisService.calculateScore(bill_id, conflictSummary);
      const publicInterest = publicInterestAnalysisService.calculateScore(stakeholder, transparency);

      // --- Step 3: Delegate to pure domain functions ---
      const recommendations = generateRecommendedActions(
        constitutional, conflictSummary, stakeholder, transparency,
      );
      const confidence = calculateOverallConfidence(
        constitutional, conflictSummary, stakeholder, transparency,
      );

      // --- Step 4: Persist asynchronously (non-blocking) ---
      const dataToStore: StoredAnalysisData = {
        analysis_id,
        constitutionalAnalysis: constitutional,
        conflictAnalysisSummary: conflictSummary,
        stakeholderImpact: stakeholder,
        transparency_score: transparency,
        publicInterestScore: publicInterest,
        overallConfidence: confidence,
        recommendations,
      };

      this.storeAnalysisResults(bill_id, dataToStore).catch((storeErr) =>
        logger.error(
          { component: 'BillComprehensiveAnalysisService', bill_id, error: storeErr },
          'Failed to store analysis results asynchronously',
        ),
      );

      // --- Step 5: Assemble final result ---
      const finalResult: ComprehensiveBillAnalysis = {
        bill_id,
        analysis_id,
        timestamp,
        constitutionalAnalysis: constitutional,
        conflictAnalysisSummary: conflictSummary,
        stakeholderImpact: stakeholder,
        transparency_score: transparency,
        publicInterestScore: publicInterest,
        recommendedActions: recommendations,
        overallConfidence: confidence,
      };

      logger.info({ bill_id, analysis_id }, '✅ Comprehensive analysis complete');
      return finalResult;

    } catch (error) {
      logger.error(
        { component: 'BillComprehensiveAnalysisService', bill_id, error },
        'Critical error during comprehensive analysis orchestration',
      );
      throw new Error(
        `Comprehensive analysis orchestration failed for bill ${bill_id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  // ============================================================================
  // PRIVATE — SPONSOR CONFLICT AGGREGATION
  // ============================================================================

  private async analyzeSponsorConflictsForBill(bill_id: string): Promise<ConflictSummary> {
    logger.debug({ component: 'BillComprehensiveAnalysisService', bill_id }, 'Analyzing sponsor conflicts');

    try {
      const billSponsors = await db
        .select({ sponsor_id: schema.bill_sponsorships.sponsor_id })
        .from(schema.bill_sponsorships)
        .where(
          and(
            eq(schema.bill_sponsorships.bill_id, bill_id),
            eq(schema.bill_sponsorships.is_active, true),
          ),
        );

      const sponsor_ids = billSponsors.map((s: { sponsor_id: string }) => s.sponsor_id);

      if (sponsor_ids.length === 0) {
        logger.info(
          { component: 'BillComprehensiveAnalysisService', bill_id },
          'No active sponsors found — returning low-risk conflict summary',
        );
        return {
          overallRisk: 'low',
          affectedSponsorsCount: 0,
          totalFinancialExposureEstimate: 0,
          directConflictCount: 0,
          indirectConflictCount: 0,
        };
      }

      // Detect conflicts for each sponsor in parallel
      const allConflicts: ConflictDetectionResult[] = [];
      await Promise.all(
        sponsor_ids.map(async (sponsor_id: string) => {
          try {
            const sponsorConflicts = await sponsorConflictAnalysisService.detectConflicts(
              sponsor_id as unknown as number,
            );
            allConflicts.push(...sponsorConflicts);
          } catch (detectErr) {
            logger.error(
              { component: 'BillComprehensiveAnalysisService', sponsor_id, bill_id, error: detectErr },
              'Failed to detect conflicts for sponsor',
            );
          }
        }),
      );

      const relevant = allConflicts.filter((c) =>
        sponsor_ids.includes(c.sponsor_id as unknown as string),
      );

      const overallRisk = this.determineOverallRiskFromSeverity(
        relevant.map((c) => c.severity),
      );
      const totalFinancialExposureEstimate = relevant.reduce(
        (sum, c) => sum + (c.financialImpact ?? 0),
        0,
      );
      const directConflictCount   = relevant.filter((c) => c.conflictType === 'financial_direct').length;
      const indirectConflictCount = relevant.filter(
        (c) => c.conflictType === 'financial_indirect' || c.conflictType === 'organizational',
      ).length;
      const affectedSponsors = new Set(relevant.map((c) => c.sponsor_id));

      return {
        overallRisk,
        affectedSponsorsCount: affectedSponsors.size,
        totalFinancialExposureEstimate,
        directConflictCount,
        indirectConflictCount,
      };

    } catch (error) {
      logger.error(
        { component: 'BillComprehensiveAnalysisService', bill_id, error },
        'Failed to analyze sponsor conflicts',
      );
      return this.getDefaultConflictSummary(error);
    }
  }

  // ============================================================================
  // PRIVATE — PERSISTENCE
  // ============================================================================

  /**
   * Stores analysis results in the database.
   * Fire-and-forget from the caller — errors are logged but not rethrown.
   */
  private async storeAnalysisResults(
    bill_id: string,
    analysisData: StoredAnalysisData,
  ): Promise<void> {
    logger.debug({ component: 'BillComprehensiveAnalysisService', bill_id }, 'Storing analysis results');

    try {
      type AnalysisInsert = typeof schema.analysis.$inferInsert;

      const insertData: AnalysisInsert = {
        bill_id,
        analysis_type: 'comprehensive_v1',
        results: analysisData as unknown as Record<string, unknown>,
        confidence: analysisData.overallConfidence.toString(),
        created_at: new Date(),
        updated_at: new Date(),
        is_approved: false,
      };

      await db
        .insert(schema.analysis)
        .values(insertData)
        .onConflictDoUpdate({
          target: [schema.analysis.bill_id, schema.analysis.analysis_type],
          set: {
            results: analysisData as unknown as Record<string, unknown>,
            confidence: analysisData.overallConfidence.toString(),
            updated_at: new Date(),
          },
        });

      logger.info(
        { component: 'BillComprehensiveAnalysisService', bill_id },
        'Analysis results stored successfully',
      );
    } catch (error) {
      logger.error(
        { component: 'BillComprehensiveAnalysisService', bill_id, error },
        'Failed to store analysis results',
      );
      // Non-fatal — storage is secondary to returning the analysis result.
    }
  }

  // ============================================================================
  // PRIVATE — HELPERS
  // ============================================================================

  private determineOverallRiskFromSeverity(
    severities: Array<'info' | 'low' | 'medium' | 'high' | 'critical'>,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high'))     return 'high';
    if (severities.includes('medium'))   return 'medium';
    return 'low';
  }

  // ============================================================================
  // PRIVATE — DEFAULT FALLBACKS
  // ============================================================================

  private getDefaultConstitutionalResult(reason: unknown): ConstitutionalAnalysisResult {
    logger.warn(
      { component: 'BillComprehensiveAnalysisService', reason },
      'Using default constitutional result due to error',
    );
    return {
      constitutionalityScore: 0,
      concerns: [],
      precedents: [],
      riskAssessment: 'high',
      confidenceLevel: 0,
      requiresExpertReview: true,
      metadata: {
        analysisTimestamp: new Date(),
        billContentLength: 0,
        patternsMatched: 0,
        precedentsFound: 0,
      },
    };
  }

  private getDefaultStakeholderResult(reason: unknown): StakeholderAnalysisResult {
    logger.warn(
      { component: 'BillComprehensiveAnalysisService', reason },
      'Using default stakeholder result due to error',
    );
    return {
      primaryBeneficiaries: [],
      negativelyAffected: [],
      affectedPopulations: [],
      economicImpact: {
        estimatedCost: 0,
        estimatedBenefit: 0,
        netImpact: 0,
        timeframe: 'N/A',
        confidence: 0,
      },
      socialImpact: {
        equityEffect: 0,
        accessibilityEffect: 0,
        publicHealthEffect: 0,
        environmentalEffect: 0,
      },
    };
  }

  private getDefaultConflictSummary(reason: unknown): ConflictSummary {
    logger.warn(
      { component: 'BillComprehensiveAnalysisService', reason },
      'Using default conflict summary due to error',
    );
    return {
      overallRisk: 'medium',
      affectedSponsorsCount: 0,
      totalFinancialExposureEstimate: 0,
      directConflictCount: 0,
      indirectConflictCount: 0,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const billComprehensiveAnalysisService = new BillComprehensiveAnalysisService();