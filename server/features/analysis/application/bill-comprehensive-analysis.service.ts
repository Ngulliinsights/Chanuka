import { readDatabase } from '@shared/database';
import * as schema from '@/shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger  } from '@shared/core';
import { databaseService } from '@/infrastructure/database/database-service.js'; // For storing results


// Import individual analysis services and their result types
import { constitutionalAnalysisService, ConstitutionalAnalysisResult } from '@server/features/analysis/application/constitutional-analysis.service.ts';
import { stakeholderAnalysisService, StakeholderAnalysisResult } from '@server/features/analysis/application/stakeholder-analysis.service.ts';
import { transparencyAnalysisService, TransparencyScoreResult } from '@server/features/analysis/application/transparency-analysis.service.ts';
import { publicInterestAnalysisService, PublicInterestScoreResult } from '@server/features/analysis/application/public-interest-analysis.service.ts';
// Import sponsor conflict analysis service and its necessary types/functions
// Adjust path based on final location of sponsor conflict analysis
import { sponsorConflictAnalysisService } from '@server/features/sponsors/application/sponsor-conflict-analysis.service.ts'; // Updated path
import type { ConflictDetectionResult } from '@server/features/sponsors/application/sponsor-conflict-analysis.service.ts'; // Updated path


// --- Define ConflictSummary type based on sponsor conflict service output ---
// This might need adjustment depending on what sponsorConflictAnalysisService returns
export interface ConflictSummary {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    affectedSponsorsCount: number; // Renamed from affectedSponsors
    totalFinancialExposureEstimate: number; // Renamed & specified estimate
    directConflictCount: number; // Renamed from directConflicts
    indirectConflictCount: number; // Renamed from indirectConflicts
    relatedConflictDetails?: ConflictDetectionResult[]; // Optional: Include raw details
}


// --- Define the final comprehensive analysis result structure ---
export interface ComprehensiveBillAnalysis { bill_id: number;
    analysis_id: string; // Unique ID for this analysis run
    timestamp: Date;
    constitutionalAnalysis: ConstitutionalAnalysisResult;
    conflictAnalysisSummary: ConflictSummary; // Use the summary type
    stakeholderImpact: StakeholderAnalysisResult;
    transparency_score: TransparencyScoreResult;
    publicInterestScore: PublicInterestScoreResult;
    recommendedActions: string[];
    overallConfidence: number; // Score 0-100
 }

/**
 * Orchestrates various analysis services to provide a comprehensive
 * real-time analysis of a legislative bills.
 */
export class BillComprehensiveAnalysisService {
    private get db() { return readDatabase; }

    /**
     * Runs all relevant analyses for a given bill ID.
     */
    async analyzeBill(bill_id: number): Promise<ComprehensiveBillAnalysis> { const analysis_id = `comp_analysis_${bill_id }_${Date.now()}`;
        const timestamp = new Date();
        logger.info(`🚀 Starting comprehensive analysis for bill ${ bill_id } (ID: ${analysis_id})`);

        try { // --- Step 1: Run independent analyses concurrently ---
            // Use Promise.allSettled to allow partial results even if one service fails
            const results = await Promise.allSettled([
                 constitutionalAnalysisService.analyzeBill(bill_id),
                 stakeholderAnalysisService.analyzeBill(bill_id),
                 this.analyzeSponsorConflictsForBill(bill_id) // Analyze conflicts related to this bill
             ]);


             // Process results, handling potential failures
             const constitutional = results[0].status === 'fulfilled' ? results[0].value : this.getDefaultConstitutionalResult(results[0].reason);
             const stakeholder = results[1].status === 'fulfilled' ? results[1].value : this.getDefaultStakeholderResult(results[1].reason);
             const conflictSummary = results[2].status === 'fulfilled' ? results[2].value : this.getDefaultConflictSummary(results[2].reason);


            // --- Step 2: Run dependent analyses (require results from step 1) ---
            const transparency = await transparencyAnalysisService.calculateScore(bill_id, conflictSummary);
            const publicInterest = publicInterestAnalysisService.calculateScore(stakeholder, transparency);

            // --- Step 3: Generate recommendations and confidence ---
             const recommendations = this.generateRecommendedActions(constitutional, conflictSummary, stakeholder, transparency);
             const confidence = this.calculateOverallConfidence(constitutional, conflictSummary, stakeholder, transparency); // Include transparency


            // --- Step 4: Store results (asynchronously, don't block response) ---
            const analysisDataToStore = {
                analysis_id, constitutionalAnalysis: constitutional, conflictAnalysisSummary: conflictSummary,
                stakeholderImpact: stakeholder, transparency_score: transparency, publicInterestScore: publicInterest,
                overallConfidence: confidence, recommendations // Store recommendations too
             };
            this.storeAnalysisResults(bill_id, analysisDataToStore)
                .catch(err => logger.error(`Failed to store analysis results for bill ${ bill_id } asynchronously:`, { component: 'BillComprehensiveAnalysisService' }, err));


            // --- Step 5: Assemble and return the final result ---
            const finalResult: ComprehensiveBillAnalysis = { bill_id, analysis_id, timestamp, constitutionalAnalysis: constitutional,
                conflictAnalysisSummary: conflictSummary, stakeholderImpact: stakeholder,
                transparency_score: transparency, publicInterestScore: publicInterest,
                recommendedActions: recommendations, overallConfidence: confidence
             };

            logger.info(`✅ Comprehensive analysis complete for bill ${ bill_id } (ID: ${analysis_id})`);
            return finalResult;

        } catch (error) { // Catch errors not handled by Promise.allSettled (e.g., initial DB checks)
            logger.error(`Critical error during comprehensive analysis orchestration for bill ${bill_id }:`, { component: 'BillComprehensiveAnalysisService'}, error);
            // Optionally store a 'failed' analysis record here
            throw new Error(`Comprehensive analysis orchestration failed for bill ${ bill_id }: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

     /** Analyzes conflicts of interest related to sponsors of a specific bill */
     private async analyzeSponsorConflictsForBill(bill_id: number): Promise<ConflictSummary> { logger.debug(`Analyzing sponsor conflicts related to bill ${bill_id }.`);
         try {
             // 1. Find active sponsors for the bill
             const billSponsors = await this.db.select({ sponsor_id: schema.bill_sponsorships.sponsor_id })
                 .from(schema.bill_sponsorships)
                 .where(and(eq(schema.bill_sponsorships.bill_id, bill_id), eq(schema.bill_sponsorships.is_active, true)));

             const sponsor_ids = billSponsors.map(s => s.sponsor_id);
             if (sponsor_ids.length === 0) { logger.info(`No active sponsors found for bill ${bill_id }, returning low conflict summary.`);
                 return { overallRisk: 'low', affectedSponsorsCount: 0, totalFinancialExposureEstimate: 0, directConflictCount: 0, indirectConflictCount: 0 };
             }
             logger.debug(`Found ${sponsor_ids.length} sponsors for bill ${ bill_id }: ${sponsor_ids.join(', ')}`);


             // 2. Detect conflicts for these sponsors (potentially filtering by bill context if service supports it)
             // Use detectConflicts which analyzes sponsors individually, then aggregate.
             // Assume detectConflicts returns ConflictDetectionResult[]
             const allConflicts: ConflictDetectionResult[] = [];
             // Run in parallel for efficiency
             await Promise.all(sponsor_ids.map(async (sponsor_id) => { try {
                     // Pass bill_id for context if the service method supports it, otherwise it analyzes the sponsor generally
                     // const sponsorConflicts = await sponsorConflictAnalysisService.detectConflicts(sponsor_id, bill_id);
                     const sponsorConflicts = await sponsorConflictAnalysisService.detectConflicts(sponsor_id); // Assuming general analysis
                     allConflicts.push(...sponsorConflicts);
                  } catch (sponsorError) {
                     logger.error(`Failed to detect conflicts for sponsor ${sponsor_id} regarding bill ${ bill_id }:`, { component: 'BillComprehensiveAnalysisService'}, sponsorError);
                 }
             }));


             // 3. Aggregate results into ConflictSummary
             const relevantConflicts = allConflicts.filter(c => sponsor_ids.includes(c.sponsor_id)); // Ensure only relevant sponsors
             const riskLevels = relevantConflicts.map(c => c.severity); // Map severity ('low', 'medium', etc.) to risk
             const overallRisk = this.determineOverallRiskFromSeverity(riskLevels); // Use helper

             // Estimate financial exposure (sum 'financialImpact' from relevant conflicts)
             const totalFinancialExposureEstimate = relevantConflicts.reduce((sum, c) => sum + (c.financialImpact || 0), 0);

             // Count conflict types
             const directConflictCount = relevantConflicts.filter(c => c.conflictType === 'financial_direct').length;
             const indirectConflictCount = relevantConflicts.filter(c => c.conflictType === 'financial_indirect' || c.conflictType === 'organizational').length; // Example grouping

             const affectedSponsors = new Set(relevantConflicts.map(c => c.sponsor_id));


             return {
                 overallRisk,
                 affectedSponsorsCount: affectedSponsors.size,
                 totalFinancialExposureEstimate,
                 directConflictCount,
                 indirectConflictCount,
                 // relatedConflictDetails: relevantConflicts // Optionally include details
             };

         } catch (error) { logger.error(`Failed to analyze sponsor conflicts for bill ${bill_id }:`, { component: 'BillComprehensiveAnalysisService'}, error);
              return this.getDefaultConflictSummary(error); // Return default on error
         }
     }


    /** Generates recommended actions based on analysis results */
    private generateRecommendedActions(
         constitutional: ConstitutionalAnalysisResult,
         conflict: ConflictSummary,
         stakeholder: StakeholderAnalysisResult,
         transparency: TransparencyScoreResult
     ): string[] {
         logger.debug("Generating recommended actions.");
         const actions: string[] = [];

         // Constitutional Recommendations
         if (constitutional.riskAssessment === 'high') actions.push('High constitutional risk detected. Recommend detailed legal review and possible amendment.');
         else if (constitutional.riskAssessment === 'medium') actions.push('Moderate constitutional concerns identified. Review flagged sections.');
         constitutional.concerns.filter(c => c.severity === 'critical' || c.severity === 'major').forEach(c => {
             actions.push(`Address major/critical constitutional concern: ${c.concern} (${c.article})`);
         });


         // Conflict of Interest Recommendations
         if (conflict.overallRisk === 'critical') actions.push('Critical conflict of interest risk. Recommend sponsor recusal and independent ethics review.');
         else if (conflict.overallRisk === 'high') actions.push('High conflict of interest risk. Mandate full disclosure from affected sponsors and monitor closely.');
         if (conflict.directConflictCount > 0) actions.push(`Address ${conflict.directConflictCount} direct financial conflicts.`);


         // Transparency Recommendations
         if (transparency.grade === 'D' || transparency.grade === 'F') actions.push('Low transparency score. Increase public access to documents and process details.');
         if (transparency.breakdown.sponsorDisclosure < 60) actions.push('Improve sponsor disclosure transparency.');


         // Stakeholder & Impact Recommendations
         if (stakeholder.economicImpact.netImpact < 0 && stakeholder.economicImpact.confidence > 60) actions.push('Negative net economic impact projected. Re-evaluate economic assumptions or seek mitigation.');
         if (stakeholder.socialImpact.equityEffect < -30) actions.push('Potential negative equity impact identified. Review for fairness and consider amendments.');
         if (stakeholder.negativelyAffected.length > 0) actions.push(`Address concerns of negatively affected stakeholders: ${stakeholder.negativelyAffected.map(s => s.name).slice(0, 3).join(', ')}.`);


         if (actions.length === 0) actions.push('No immediate high-priority actions recommended based on automated analysis.');

         return actions;
    }

    /** Calculates overall confidence score based on component analyses */
     private calculateOverallConfidence(
         constitutional: ConstitutionalAnalysisResult,
         conflict: ConflictSummary,
         stakeholder: StakeholderAnalysisResult,
         transparency: TransparencyScoreResult // Added transparency
     ): number {
         logger.debug("Calculating overall analysis confidence.");
         // Base confidence (adjust based on overall system reliability)
         let confidence = 80;

         // Penalties based on complexity or uncertainty
         confidence -= constitutional.concerns.length * 1.5; // More concerns = less certainty
         confidence -= conflict.affectedSponsorsCount * 1;    // More conflicts = complex interactions
         confidence -= (100 - stakeholder.economicImpact.confidence) * 0.2; // Factor in economic uncertainty
         confidence -= (transparency.overall < 50 ? 5 : 0); // Lower confidence if transparency is very low

         // Boost based on high scores (optional)
         // confidence += (constitutional.constitutionalityScore > 90 ? 3 : 0);

         return Math.max(30, Math.min(95, Math.round(confidence))); // Clamp between 30 and 95
    }

    /** Stores the analysis results in the database */
     private async storeAnalysisResults(bill_id: number, analysisData: any): Promise<void> { logger.debug(`Storing analysis results for bill ${bill_id }.`);
         try { const insertData: schema.InsertAnalysis = {
                bill_id,
                analysis_type: 'comprehensive_v1', // Use a versioned type name
                results: analysisData, // Store the full structured data
                confidence: analysisData.overallConfidence?.toString() ?? "0", // Store overall confidence
                // Add model versions if applicable
                // model_version: `const:${constVersion }_stake:${stakeVersion}_transp:${transpVersion}`,
                created_at: new Date(),
                updated_at: new Date(),
                // Default is_approved to false, requires manual review maybe?
                 is_approved: false,
             };
             await this.db.insert(schema.analysis).values(insertData)
                .onConflictDoUpdate({ // Update if analysis for this bill+type exists
                    target: [schema.analysis.bill_id, schema.analysis.analysis_type],
                    set: {
                        results: analysisData,
                        confidence: analysisData.overallConfidence?.toString() ?? "0",
                        updated_at: new Date(),
                        // Reset approval status on update? Or keep existing? Depends on workflow.
                        // is_approved: false,
                        // approved_by: null,
                    }
                });

             logger.info(`Successfully stored/updated analysis results for bill ${ bill_id }`);
         } catch (error) { logger.error(`Failed to store analysis results for bill ${bill_id }:`, { component: 'BillComprehensiveAnalysisService' }, error);
             // Do not re-throw, storing is secondary to providing the analysis result
         }
     }

     /** Helper to map severity levels to risk levels */
     private determineOverallRiskFromSeverity(severities: Array<'info' | 'low' | 'medium' | 'high' | 'critical'>): 'low' | 'medium' | 'high' | 'critical' {
        if (severities.includes('critical')) return 'critical';
        if (severities.includes('high')) return 'high';
        if (severities.includes('medium')) return 'medium';
        return 'low'; // Default to low if only info/low found
    }

     // --- Default result generators for error handling ---
     private getDefaultConstitutionalResult(reason: any): ConstitutionalAnalysisResult {
         logger.warn(`Using default constitutional result due to error: ${reason}`);
         return { constitutionalityScore: 0, concerns: [], precedents: [], riskAssessment: 'high' };
     }
     private getDefaultStakeholderResult(reason: any): StakeholderAnalysisResult {
         logger.warn(`Using default stakeholder result due to error: ${reason}`);
         return { primaryBeneficiaries: [], negativelyAffected: [], affectedPopulations: [], economicImpact: { estimatedCost: 0, estimatedBenefit: 0, netImpact: 0, timeframe: 'N/A', confidence: 0 }, socialImpact: { equityEffect: 0, accessibilityEffect: 0, publicHealthEffect: 0, environmentalEffect: 0 } };
     }
      private getDefaultConflictSummary(reason: any): ConflictSummary {
         logger.warn(`Using default conflict summary due to error: ${reason}`);
         return { overallRisk: 'medium', affectedSponsorsCount: 0, totalFinancialExposureEstimate: 0, directConflictCount: 0, indirectConflictCount: 0 };
     }

}

export const billComprehensiveAnalysisService = new BillComprehensiveAnalysisService();

