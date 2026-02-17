// Assuming ML service exists and is properly typed
import { MLAnalysisService, MLBeneficiaryResult,MLStakeholderResult } from '@server/features/analysis/infrastructure/adapters/ml-service-adapter'; // Adjust path and types
import { logger } from '@server/infrastructure/observability';
import { readDatabase } from '@server/infrastructure/database';
import { eq } from 'drizzle-orm';

import * as schema from '@/shared/schema';

// --- Interface Definitions ---
export interface StakeholderGroup {
  name: string;
  sizeEstimate: number; // Renamed from size
  impactLevel: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number; // Score 0-100
}

export interface PopulationImpact {
  demographic: string;
  affectedEstimate: number; // Renamed from affected
  impactType: 'benefit' | 'burden' | 'mixed' | 'neutral';
  description: string;
}

export interface EconomicImpact {
  estimatedCost: number;
  estimatedBenefit: number;
  netImpact: number;
  timeframe: string; // e.g., "1-3 years", "5+ years"
  confidence: number; // Score 0-100
  assumptions?: string[]; // Optional field for assumptions made
}

export interface SocialImpact {
  equityEffect: number; // Score -100 (regressive) to 100 (progressive)
  accessibilityEffect: number; // Score -100 (reduces) to 100 (improves)
  publicHealthEffect: number; // Score -100 (negative) to 100 (positive)
  environmentalEffect: number; // Score -100 (negative) to 100 (positive)
}

export interface StakeholderAnalysisResult {
    primaryBeneficiaries: StakeholderGroup[];
    negativelyAffected: StakeholderGroup[]; // Added distinction
    affectedPopulations: PopulationImpact[];
    economicImpact: EconomicImpact;
    socialImpact: SocialImpact;
}

/**
 * Service for analyzing the impact of a bill on various stakeholders.
 */
export class StakeholderAnalysisService {
    private get db() { return readDatabase; }

    /**
     * Performs stakeholder analysis using bill content and potentially ML services.
     */
    async analyzeBill(bill_id: number): Promise<StakeholderAnalysisResult> { logger.info(`👥 Performing stakeholder analysis for bill ${bill_id }`);
        try { const bill = await this.getBillContent(bill_id);
            const billContent = bill?.content ?? '';
            const billTitle = bill?.title ?? '';

            // --- Use ML service if available ---
            let mlStakeholders: MLStakeholderResult | null = null;
            let mlBeneficiaries: MLBeneficiaryResult | null = null;
            try {
                 // Run ML analyses concurrently
                 [mlStakeholders, mlBeneficiaries] = await Promise.all([
                    MLAnalysisService.analyzeStakeholderInfluence(billContent),
                    MLAnalysisService.analyzeBeneficiaries(billContent)
                 ]);
                 logger.debug(`ML analysis results received for bill ${bill_id }`);
            } catch (mlError) { logger.warn(`ML analysis failed for bill ${bill_id }, using fallback methods. Error: ${mlError}`);
            }


            // --- Extract and combine results ---
            const { primaryBeneficiaries, negativelyAffected } = this.extractStakeholderGroups(mlBeneficiaries?.result);
            const populations = this.estimatePopulationImpact(billContent, billTitle);
            const economic = this.calculateEconomicImpact(billContent, billTitle);
            const social = this.assessSocialImpact(billContent, billTitle);

             return { primaryBeneficiaries, negativelyAffected, affectedPopulations, economicImpact: economic, socialImpact: social };
        } catch (error) { logger.error(`Error during stakeholder analysis for bill ${bill_id }:`, { component: 'StakeholderAnalysisService'}, error);
            throw new Error(`Stakeholder analysis failed for bill ${ bill_id }`);
        }
    }

    /** Fetches required bill content and title */
    private async getBillContent(bill_id: number): Promise<Pick<schema.Bill, 'id' | 'content' | 'title'> | null> {
         const [bill] = await this.db
             .select({ id: schema.bills.id, content: schema.bills.content, title: schema.bills.title })
             .from(schema.bills)
             .where(eq(schema.bills.id, bill_id))
             .limit(1);
          if (!bill) throw new Error(`Bill ${ bill_id } not found for stakeholder analysis.`);
         return bill;
     }

    /** Extracts stakeholder groups from ML results or uses fallback */
    private extractStakeholderGroups(beneficiaryData?: unknown): { primaryBeneficiaries: StakeholderGroup[], negativelyAffected: StakeholderGroup[] } {
        logger.debug("Extracting stakeholder groups.");
        const primaryBeneficiaries: StakeholderGroup[] = [];
        const negativelyAffected: StakeholderGroup[] = [];
        const defaultConfidence = beneficiaryData ? 80 : 50; // Lower confidence for fallback

        // --- Use ML data if available ---
        if (beneficiaryData) {
            (beneficiaryData.directBeneficiaries || []).forEach((name: string) => {
                primaryBeneficiaries.push({ name, sizeEstimate: this.estimateGroupSize(name), impactLevel: 'positive', confidence: defaultConfidence });
            });
            (beneficiaryData.indirectBeneficiaries || []).forEach((name: string) => {
                 primaryBeneficiaries.push({ name, sizeEstimate: this.estimateGroupSize(name), impactLevel: 'positive', confidence: defaultConfidence - 10 });
             });

            (beneficiaryData.potentialLosers || []).forEach((name: string) => {
                negativelyAffected.push({ name, sizeEstimate: this.estimateGroupSize(name), impactLevel: 'negative', confidence: defaultConfidence });
            });
             (beneficiaryData.indirectlyAffectedNegatively || []).forEach((name: string) => {
                 negativelyAffected.push({ name, sizeEstimate: this.estimateGroupSize(name), impactLevel: 'negative', confidence: defaultConfidence - 10 });
             });

        } else {
             // --- Fallback: Basic keyword matching (less reliable) ---
             // Add basic fallback logic if needed, e.g., matching common terms
             logger.warn("Using fallback stakeholder group extraction.");
        }
        return { primaryBeneficiaries, negativelyAffected };
    }

    /** Estimates group size based on name (placeholder) */
    private estimateGroupSize(groupName: string): number {
        // *** Placeholder: Replace with more sophisticated estimation (e.g., DB lookup, external data) ***
        const sizeMap: Record<string, number> = {
          'small businesses': 500000, 'consumers': 50000000, 'tech startups': 75000, 'large corporations': 5000,
          'healthcare providers': 200000, 'working families': 25000000, 'rural communities': 5000000, 'students': 15000000
        };
        const lowerName = groupName.toLowerCase();
        for (const [key, size] of Object.entries(sizeMap)) { if (lowerName.includes(key)) return size; }
        return 10000; // Default small size
     }

    /** Estimates impact on specific population demographics */
    private estimatePopulationImpact(billContent: string, billTitle: string): PopulationImpact[] {
        logger.debug("Estimating population impact.");
        const textToAnalyze = `${billTitle} ${billContent}`.toLowerCase();
        const impacts: PopulationImpact[] = [];
        const demographics = [
          { name: 'Low-Income Households', pattern: /low.{0,2}income|poverty|affordable/i, size: 30000000 },
          { name: 'Small Business Owners', pattern: /small.{0,2}business|entrepreneur/i, size: 2000000 },
          { name: 'Healthcare Workers', pattern: /health.{0,2}care|nurse|doctor|medical.{0,2}professional/i, size: 1500000 },
          { name: 'Rural Communities', pattern: /rural|farm|agricultural/i, size: 5000000 },
          { name: 'Students', pattern: /student|education|university|college/i, size: 15000000 },
          { name: 'Elderly Population', pattern: /elderly|senior.{0,2}citizen|retirement/i, size: 20000000 }
        ];

        for (const demo of demographics) {
            if (demo.pattern.test(textToAnalyze)) {
                // Basic impact type guess (needs refinement)
                const impactType = /benefit|support|improve|expand/i.test(textToAnalyze) ? 'benefit' : /burden|restrict|reduce|tax/i.test(textToAnalyze) ? 'burden' : 'mixed';
                impacts.push({
                    demographic: demo.name,
                    affectedEstimate: demo.size,
                    impactType: impactType,
                    description: `Legislation potentially affects ${demo.name}.`
                });
            }
        }
        return impacts;
    }

    /** Calculates estimated economic impact */
    private calculateEconomicImpact(billContent: string, billTitle: string): EconomicImpact {
        logger.debug("Calculating economic impact.");
        const textToAnalyze = `${billTitle} ${billContent}`;
        // Regex to find monetary values with units (more robust)
        const moneyRegex = /\$?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?\s*(million|billion|trillion)?/gi;
        let match;
        let totalCost = 0;
        let totalBenefit = 0;
        let confidence = 50; // Base confidence
        const assumptions = ['Monetary values extracted via regex.', 'Benefit multiplier applied based on keywords.'];

        while ((match = moneyRegex.exec(textToAnalyze)) !== null) {
            const value = this.parseFinancialAmount(match[0]);
            // Simple heuristic: words like 'cost', 'spend', 'fund', 'allocate' suggest cost
            const context = textToAnalyze.substring(Math.max(0, match.index - 30), Math.min(textToAnalyze.length, match.index + match[0].length + 30)).toLowerCase();
            if (/cost|spend|fund|allocate|appropriat|tax\s(?!cut|break)/i.test(context)) {
                totalCost += value;
            } else if (/benefit|revenue|generate|save|invest|growth|stimulus|tax\s(cut|break)/i.test(context)) {
                totalBenefit += value; // Count explicitly mentioned benefits
            } else {
                // If context is unclear, assume cost by default (conservative)
                totalCost += value;
                assumptions.push(`Assumed ambiguous value ${match[0]} is a cost.`);
            }
            confidence = Math.min(90, confidence + 5); // Increase confidence slightly per value found
        }

        // If no explicit benefit found, estimate based on cost and multiplier
        if (totalBenefit === 0 && totalCost > 0) {
            totalBenefit = totalCost * this.getBenefitMultiplier(textToAnalyze);
             assumptions.push(`Benefit estimated using multiplier (${this.getBenefitMultiplier(textToAnalyze)}x).`);
             confidence -= 10; // Reduce confidence if benefit is purely estimated
        } else if (totalBenefit > 0) {
            confidence += 10; // Higher confidence if benefits are mentioned
        }


        return {
            estimatedCost: Math.round(totalCost),
            estimatedBenefit: Math.round(totalBenefit),
            netImpact: Math.round(totalBenefit - totalCost),
            timeframe: this.estimateTimeframe(textToAnalyze),
            confidence: Math.max(20, Math.min(95, confidence)), // Bound confidence
            assumptions
        };
     }

    /** Parses financial strings like "$1.5 billion" */
    private parseFinancialAmount(amountStr: string): number {
        const cleanStr = amountStr.replace(/[$,]/g, '').toLowerCase();
        const numPart = parseFloat(cleanStr);
        if (isNaN(numPart)) return 0;

        if (cleanStr.includes('trillion')) return numPart * 1e12;
        if (cleanStr.includes('billion')) return numPart * 1e9;
        if (cleanStr.includes('million')) return numPart * 1e6;
        return numPart;
    }

    /** Estimates benefit multiplier based on bill content */
    private getBenefitMultiplier(text: string): number {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('infrastructure') || lowerText.includes('investment')) return 2.2;
        if (lowerText.includes('health') || lowerText.includes('medical')) return 2.8;
        if (lowerText.includes('education') || lowerText.includes('research')) return 3.5;
        if (lowerText.includes('environment') || lowerText.includes('climate') || lowerText.includes('renewable')) return 1.8;
        if (lowerText.includes('defense') || lowerText.includes('military')) return 1.2;
        return 1.5; // Default multiplier
    }

     /** Estimates timeframe based on bill content */
     private estimateTimeframe(text: string): string {
         const lowerText = text.toLowerCase();
         if (/\b(immediate|short-term|within\s\d+\s(months?|year))\b/i.test(lowerText)) return "1-3 years";
         if (/\b(medium-term|next\s(few|several)\syears?)\b/i.test(lowerText)) return "3-5 years";
         if (/\b(long-term|decade|over\s\d+\syears?)\b/i.test(lowerText)) return "5+ years";
         return "Unspecified";
     }


    /** Assesses social impact across different dimensions */
    private assessSocialImpact(billContent: string, billTitle: string): SocialImpact {
        logger.debug("Assessing social impact.");
        const textToAnalyze = `${billTitle} ${billContent}`;
        return {
            equityEffect: this.calculateScore(textToAnalyze,
                [/equal.{0,2}access|fairness|reduce.{0,2}inequality|disadvantaged|marginalized|underserved|equity/i, /progressive.{0,2}tax/i], // Positive
                [/regressive|burden.{0,2}poor|benefit.{0,2}wealthy|reduce.{0,2}social.{0,2}program/i, /tax.{0,2}cut.{0,2}(for|on).{0,2}(rich|corporation)/i]  // Negative
            ),
            accessibilityEffect: this.calculateScore(textToAnalyze,
                [/improve.{0,2}access|increase.{0,2}availability|expand.{0,2}service|broadband|transportation|affordable.{0,2}housing/i], // Positive
                [/restrict.{0,2}access|reduce.{0,2}service|increase.{0,2}barrier/i] // Negative
            ),
            publicHealthEffect: this.calculateScore(textToAnalyze,
                [/public.{0,2}health|improve.{0,2}health|prevent.{0,2}disease|mental.{0,2}health|substance.{0,2}abuse|healthcare.{0,2}access/i], // Positive
                [/pollution|toxic|reduce.{0,2}healthcare.{0,2}funding|increase.{0,2}health.{0,2}risk/i] // Negative
            ),
            environmentalEffect: this.calculateScore(textToAnalyze,
                [/environment|climate|sustainable|renewable|clean.{0,2}energy|conservation|reduce.{0,2}emission|carbon.{0,2}(capture|reduction)/i], // Positive
                [/fossil.{0,2}fuel|coal|oil|gas|drill|deregulation.{0,2}environment|increase.{0,2}pollution/i] // Negative
            )
        };
     }

     /** Generic scoring helper based on positive/negative keywords */
     private calculateScore(text: string, positivePatterns: RegExp[], negativePatterns: RegExp[], baseScore = 0, range = 100): number {
         const lowerText = text.toLowerCase();
         let score = baseScore;
         const increment = range / positivePatterns.length / 2; // Smaller increments
         const decrement = range / negativePatterns.length / 2;

         positivePatterns.forEach(pattern => { if (pattern.test(lowerText)) score += increment; });
         negativePatterns.forEach(pattern => { if (pattern.test(lowerText)) score -= decrement; });

         return Math.max(-range, Math.min(range, Math.round(score))); // Clamp score between -range and +range
     }

}

export const stakeholderAnalysisService = new StakeholderAnalysisService();



