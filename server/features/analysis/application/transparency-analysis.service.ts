import { readDatabase } from '@shared/database/connection';
import * as schema from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../utils/logger.js';
// Import the result type from sponsor conflict analysis
// Ensure this path is correct based on your final structure
// Note: ConflictSummary is defined locally in bill-comprehensive-analysis.service.ts, not exported from sponsor-conflict-analysis.service.ts
// import type { ConflictSummary } from '../../sponsors/application/sponsor-conflict-analysis.service.js'; // Updated path

// Define ConflictSummary locally since it's not exported from sponsor-conflict-analysis.service.ts
export interface ConflictSummary {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  affectedSponsorsCount: number;
  totalFinancialExposureEstimate: number;
  directConflictCount: number;
  indirectConflictCount: number;
  relatedConflictDetails?: any[]; // Optional: Include raw details
}

// --- Interface Definitions ---
export interface TransparencyScoreResult {
  overall: number; // Score 0-100
  breakdown: {
    sponsorDisclosure: number; // Renamed from sponsorTransparency
    legislativeProcess: number; // Renamed from processTransparency
    financialConflicts: number; // Renamed from financialTransparency
    publicAccessibility: number; // Renamed from publicAccess
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Service for calculating the transparency score of a bill.
 */
export class TransparencyAnalysisService {
    private get db() { return readDatabase; }

    /**
     * Calculates the transparency score based on bill data and conflict analysis.
     */
    async calculateScore(billId: number, conflictAnalysis: ConflictSummary): Promise<TransparencyScoreResult> {
        logger.info(`📊 Calculating transparency score for bill ${billId}`);
         try {
            const bill = await this.getBillDetails(billId); // Fetch more details if needed
            if (!bill) {
                 logger.warn(`Bill ${billId} not found for transparency scoring.`);
                 return { overall: 0, breakdown: { sponsorDisclosure: 0, legislativeProcess: 0, financialConflicts: 0, publicAccessibility: 0 }, grade: 'F' };
             }

            // --- Calculate individual components ---
            const sponsorScore = await this.calculateSponsorDisclosureScore(bill.sponsorId, conflictAnalysis);
            const processScore = this.calculateProcessTransparencyScore(bill); // Pass relevant bill fields
            const conflictScore = this.calculateFinancialConflictScore(conflictAnalysis);
            const accessScore = this.calculatePublicAccessibilityScore(bill); // Pass relevant bill fields

            const overall = Math.round((sponsorScore + processScore + conflictScore + accessScore) / 4);
            const grade = this.calculateTransparencyGrade(overall);

            return {
                overall,
                breakdown: {
                    sponsorDisclosure: sponsorScore,
                    legislativeProcess: processScore,
                    financialConflicts: conflictScore,
                    publicAccessibility: accessScore
                },
                grade
            };
         } catch (error) {
             logger.error(`Error calculating transparency score for bill ${billId}:`, { component: 'TransparencyAnalysisService'}, error);
             return { overall: 0, breakdown: { sponsorDisclosure: 0, legislativeProcess: 0, financialConflicts: 0, publicAccessibility: 0 }, grade: 'F' };
         }
    }

    /** Fetches bill details relevant for transparency scoring */
    private async getBillDetails(billId: number): Promise<Pick<schema.Bill, 'id' | 'sponsorId' | 'status'> | null> {
         // Add fields like committee meeting count, public comment flags, full text URL etc. if available
         const [bill] = await this.db
             .select({ id: schema.bills.id, sponsorId: schema.bills.sponsorId, status: schema.bills.status })
             .from(schema.bills)
             .where(eq(schema.bills.id, billId))
             .limit(1);
         return bill;
     }

    /** Calculates score based on sponsor's historical transparency and current conflicts */
    private async calculateSponsorDisclosureScore(sponsorId: number | null, conflictAnalysis: ConflictSummary): Promise<number> {
        logger.debug(`Calculating sponsor disclosure score (Sponsor ID: ${sponsorId})`);
        if (!sponsorId) return 50; // Neutral score if no specific sponsor

        try {
            const [sponsor] = await this.db.select({ transparencyScore: schema.sponsors.transparencyScore })
                .from(schema.sponsors)
                .where(eq(schema.sponsors.id, sponsorId));

             // Base score on sponsor's general transparency record
            let score = parseFloat(sponsor?.transparencyScore || '50'); // Default to 50 if no score

             // Penalize based on current bill's conflict risk
             const riskPenalties = { low: 0, medium: 10, high: 25, critical: 40 };
             score -= riskPenalties[conflictAnalysis.overallRisk] || 0;

            return Math.max(0, Math.min(100, Math.round(score)));
        } catch (error) {
             logger.error(`Error fetching sponsor data for transparency score (Sponsor ID: ${sponsorId}):`, { component: 'TransparencyAnalysisService'}, error);
             return 30; // Lower score on error
        }
    }

    /** Calculates score based on the bill's legislative process steps */
    private calculateProcessTransparencyScore(bill: Pick<schema.Bill, 'status'>): number {
        // *** Needs refinement based on actual available data ***
        // Example: Check if committee hearings held, public comments allowed, amendments tracked
        logger.debug("Calculating legislative process transparency score.");
        let score = 40; // Base score
        // if (bill.committeeHearingsCount > 0) score += 20;
        // if (bill.publicCommentPeriodEnabled) score += 20;
        // if (bill.amendmentsArePublic) score += 15;
         // Add score based on current status (e.g., more points if passed committee)
         if (['committee', 'passed', 'signed'].includes(bill.status)) score += 10;

        return Math.min(100, score);
    }

    /** Calculates score based on detected financial conflicts */
    private calculateFinancialConflictScore(conflictAnalysis: ConflictSummary): number {
        logger.debug("Calculating financial conflict transparency score.");
         // Higher penalty for direct conflicts
         const directConflictPenalty = (conflictAnalysis.directConflictCount || 0) * 20;
         const indirectConflictPenalty = (conflictAnalysis.indirectConflictCount || 0) * 10;
         // Penalty based on overall risk level
         const riskPenalties = { low: 0, medium: 5, high: 15, critical: 30 };
         const riskPenalty = riskPenalties[conflictAnalysis.overallRisk] || 0;


         return Math.max(0, 100 - directConflictPenalty - indirectConflictPenalty - riskPenalty);
     }

    /** Calculates score based on public accessibility of bill information */
    private calculatePublicAccessibilityScore(bill: any): number {
        // *** Needs refinement based on actual available data ***
        // Example: Check if full text URL, summary, sponsor info, vote records are available
        logger.debug("Calculating public accessibility score.");
         let score = 40;
         // Assume these fields might exist on the bill object or related data
         // if (bill.fullTextUrl) score += 25;
         // if (bill.summary) score += 15;
         // if (bill.sponsorId) score += 10; // Basic sponsor info available
         // if (bill.voteRecordsAvailable) score += 10;

        return Math.min(100, score);
     }

     /** Converts numeric score to letter grade */
     private calculateTransparencyGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
     }
}

export const transparencyAnalysisService = new TransparencyAnalysisService();