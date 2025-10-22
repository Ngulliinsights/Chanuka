import { readDatabase } from '@shared/database/connection';
import * as schema from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../../shared/core/index.js';

// --- Interface Definitions ---
export interface ConstitutionalConcern {
  section: string;
  concern: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  article: string;
  explanation: string;
}

export interface LegalPrecedent {
  caseName: string;
  year: number;
  relevance: number; // Score 0-100
  outcome: string;
  applicability: string;
}

export interface ConstitutionalAnalysisResult {
    constitutionalityScore: number; // Score 0-100
    concerns: ConstitutionalConcern[];
    precedents: LegalPrecedent[];
    riskAssessment: 'low' | 'medium' | 'high';
}

/**
 * Service dedicated to analyzing the constitutional aspects of a bill.
 */
export class ConstitutionalAnalysisService {
    private get db() { return readDatabase; }

    // Define constitutional check patterns (can be moved to config)
    private readonly constitutionalChecks = [
      { pattern: /federal.*power|commerce.*clause/i, article: 'Article I, Section 8', concern: 'Federal authority and commerce regulation', defaultSeverity: 'moderate' as const },
      { pattern: /due.*process|equal.*protection/i, article: 'Amendment XIV', concern: 'Due process and equal protection rights', defaultSeverity: 'major' as const },
      { pattern: /freedom.*speech|first.*amendment/i, article: 'Amendment I', concern: 'First Amendment protections', defaultSeverity: 'major' as const },
      { pattern: /search.*seizure|fourth.*amendment/i, article: 'Amendment IV', concern: 'Fourth Amendment protections', defaultSeverity: 'major' as const },
      { pattern: /state.*rights|tenth.*amendment/i, article: 'Amendment X', concern: 'States rights and federal overreach', defaultSeverity: 'moderate' as const }
    ];

    /**
     * Performs constitutional analysis on a given bill ID.
     */
    async analyzeBill(billId: number): Promise<ConstitutionalAnalysisResult> {
        logger.info(`🏛️ Performing constitutional analysis for bill ${billId}`);
        try {
            const bill = await this.getBillContent(billId);
            const billContent = bill?.content ?? '';

            const concerns = this.identifyConstitutionalConcerns(billContent);
            const precedents = await this.findRelevantPrecedents(billContent); // Keep async if DB lookup happens
            const score = this.calculateConstitutionalityScore(concerns);
            const risk = this.assessConstitutionalRisk(score, concerns);

            return { constitutionalityScore: score, concerns, precedents, riskAssessment: risk };
        } catch (error) {
            logger.error(`Error during constitutional analysis for bill ${billId}:`, { component: 'ConstitutionalAnalysisService'}, error);
            throw new Error(`Constitutional analysis failed for bill ${billId}`);
        }
    }

    /** Fetches required bill content */
    private async getBillContent(billId: number): Promise<Pick<schema.Bill, 'id' | 'content'> | null> {
         const [bill] = await this.db
             .select({ id: schema.bills.id, content: schema.bills.content })
             .from(schema.bills)
             .where(eq(schema.bills.id, billId))
             .limit(1);
         if (!bill) throw new Error(`Bill ${billId} not found for constitutional analysis.`);
         return bill;
     }

    /** Identifies potential constitutional concerns using regex patterns */
    private identifyConstitutionalConcerns(billContent: string): ConstitutionalConcern[] {
        logger.debug("Identifying constitutional concerns based on content.");
        const concerns: ConstitutionalConcern[] = [];
        for (const check of this.constitutionalChecks) {
            if (check.pattern.test(billContent)) {
                concerns.push({
                    section: this.findRelevantSection(billContent, check.pattern),
                    concern: check.concern,
                    severity: check.defaultSeverity,
                    article: check.article,
                    explanation: `Provision may implicate ${check.concern} under ${check.article}. Review needed.`
                });
            }
        }
        return concerns;
    }

    /** Extracts relevant section snippet around a regex match */
    private findRelevantSection(content: string, pattern: RegExp): string {
        const match = content.match(pattern);
        if (!match || match.index === undefined) return 'Unknown section';
        const start = Math.max(0, match.index - 150); // Increased context
        const end = Math.min(content.length, match.index + match[0].length + 150); // Increased context
        return `...${content.substring(start, end).trim()}...`;
    }

    /** Finds relevant legal precedents (placeholder - needs integration) */
    private async findRelevantPrecedents(billContent: string): Promise<LegalPrecedent[]> {
        logger.debug("Finding relevant legal precedents (using placeholder).");
        // *** Placeholder: Replace with actual legal database query/API call ***
        const precedents: LegalPrecedent[] = [];
        if (/commerce.*clause/i.test(billContent)) {
            precedents.push({ caseName: 'Wickard v. Filburn', year: 1942, relevance: 75, outcome: 'Expanded federal commerce power', applicability: 'Relevant for federal regulation scope' });
            precedents.push({ caseName: 'United States v. Lopez', year: 1995, relevance: 68, outcome: 'Limited federal commerce power', applicability: 'Potential constraint on federal authority' });
        }
         if (/equal.*protection/i.test(billContent)) {
             precedents.push({ caseName: 'Brown v. Board of Education', year: 1954, relevance: 80, outcome: 'Ended segregation in schools', applicability: 'Core equal protection principle' });
         }

        return precedents;
    }

    /** Calculates a score based on identified concerns */
    private calculateConstitutionalityScore(concerns: ConstitutionalConcern[]): number {
        logger.debug(`Calculating constitutionality score based on ${concerns.length} concerns.`);
        if (concerns.length === 0) return 95; // Start high if no obvious concerns

        const severityWeights = { minor: 5, moderate: 15, major: 30, critical: 50 }; // Adjusted weights
        const totalPenalty = concerns.reduce((sum, concern) => sum + (severityWeights[concern.severity] || 10), 0);

        return Math.max(0, 100 - totalPenalty);
    }

    /** Assesses overall risk based on score and severity */
    private assessConstitutionalRisk(score: number, concerns: ConstitutionalConcern[]): 'low' | 'medium' | 'high' {
        logger.debug(`Assessing constitutional risk based on score ${score} and ${concerns.length} concerns.`);
        const hasCritical = concerns.some(c => c.severity === 'critical');
        const hasMajor = concerns.some(c => c.severity === 'major');

        if (hasCritical || score < 40) return 'high';
        if (hasMajor || score < 65) return 'medium'; // Adjusted threshold
        return 'low';
    }
}

export const constitutionalAnalysisService = new ConstitutionalAnalysisService();