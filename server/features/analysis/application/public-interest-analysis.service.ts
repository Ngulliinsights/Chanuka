import { logger  } from '../../../../shared/core/src/index.js';
// Import result types from other analysis services
import type { StakeholderAnalysisResult, EconomicImpact, SocialImpact } from './stakeholder-analysis.service.js';
import type { TransparencyScoreResult } from './transparency-analysis.service.js';

// --- Interface Definitions ---
export interface PublicInterestScoreResult {
    score: number; // Score 0-100
    factors: {
        economicScoreNormalized: number; // Score 0-100
        socialScoreNormalized: number;   // Score 0-100
        transparency_score: number;       // Score 0-100
    };
    assessment: 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low'; // Qualitative assessment
}

/**
 * Service for calculating a Public Interest Score for a bills.
 */
export class PublicInterestAnalysisService {

    /**
     * Calculates the score based on stakeholder impact and transparency.
     */
    calculateScore(
        stakeholderImpact: StakeholderAnalysisResult,
        transparency_score: TransparencyScoreResult
    ): PublicInterestScoreResult {
        logger.info("⚖️ Calculating public interest score.");
         try {
            const economicScoreNorm = this.normalizeEconomicScore(stakeholderImpact.economicImpact);
            const socialScoreNorm = this.normalizeSocialScore(stakeholderImpact.socialImpact);
            const transparencyWeight = transparency_score.overall; // Use the 0-100 score

            // Define weights (can be adjusted based on policy/config)
            const weights = { economic: 0.3, social: 0.4, transparency: 0.3 };

            const finalScore = Math.max(0, Math.min(100, Math.round(
                economicScoreNorm * weights.economic +
                socialScoreNorm * weights.social +
                transparencyWeight * weights.transparency
            )));

            return {
                score: finalScore,
                factors: {
                    economicScoreNormalized: Math.round(economicScoreNorm),
                    socialScoreNormalized: Math.round(socialScoreNorm),
                    transparency_score: transparency_score.overall
                },
                assessment: this.getQualitativeAssessment(finalScore)
            };
         } catch (error) {
             logger.error("Error calculating public interest score:", { component: 'PublicInterestAnalysisService' }, error);
              return { score: 0, factors: { economicScoreNormalized: 0, socialScoreNormalized: 0, transparency_score: 0 }, assessment: 'Very Low' };
         }
    }

    /** Normalizes economic impact score to 0-100 range */
    private normalizeEconomicScore(economicImpact: EconomicImpact): number {
        logger.debug("Normalizing economic score.");
        // Scale net impact relative to a baseline (e.g., $1B), centered around 50
        const baseline = 1_000_000_000; // $1 Billion
        // Calculate raw score based on net impact relative to baseline
        // A net positive impact of $1B gives +50, net negative $1B gives -50 from the midpoint of 50
        let rawScore = 50 + (economicImpact.netImpact / baseline) * 50;

        // Adjust score by confidence level (e.g., reduce score if confidence is low)
        // Simple linear adjustment: score * (confidence / 100)
        // More nuanced: Penalize more heavily for low confidence
        const confidenceFactor = Math.max(0.3, economicImpact.confidence / 100); // Ensure confidence doesn't drop score too low
        let confidenceAdjustedScore = rawScore * confidenceFactor;


        // Clamp the final score between 0 and 100
        return Math.max(0, Math.min(100, confidenceAdjustedScore));
     }


    /** Normalizes social impact score to 0-100 range */
     private normalizeSocialScore(socialImpact: SocialImpact): number {
         logger.debug("Normalizing social score.");
         // Shift scores from -100 to 100 range to 0-100 range
         const scaledEquity = (socialImpact.equityEffect + 100) / 2;
         const scaledAccessibility = (socialImpact.accessibilityEffect + 100) / 2; // Assuming -100 to 100 range
         const scaledHealth = (socialImpact.publicHealthEffect + 100) / 2;
         const scaledEnv = (socialImpact.environmentalEffect + 100) / 2;

         // Calculate weighted average (adjust weights as needed)
         const weights = { equity: 0.3, accessibility: 0.2, health: 0.3, environment: 0.2 };
         const weightedScore = (
             scaledEquity * weights.equity +
             scaledAccessibility * weights.accessibility +
             scaledHealth * weights.health +
             scaledEnv * weights.environment
         );


         // Clamp the final score between 0 and 100
         return Math.max(0, Math.min(100, weightedScore));
     }

     /** Provides a qualitative assessment based on the numeric score */
     private getQualitativeAssessment(score: number): 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low' {
         if (score >= 85) return 'Very High';
         if (score >= 70) return 'High';
         if (score >= 50) return 'Moderate';
         if (score >= 30) return 'Low';
         return 'Very Low';
     }
}

export const publicInterestAnalysisService = new PublicInterestAnalysisService();
