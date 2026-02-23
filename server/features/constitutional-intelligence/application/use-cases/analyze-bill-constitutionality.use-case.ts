/**
 * Analyze Bill Constitutionality Use Case
 * 
 * Orchestrates the constitutional analysis of a bill by:
 * 1. Finding relevant constitutional provisions
 * 2. Detecting potential violations
 * 3. Generating analysis report
 * 4. Determining if expert review is needed
 */

import { ConstitutionalAnalysis, CreateAnalysisInput } from '../../domain/entities/constitutional-analysis.entity';
import { ConstitutionalProvision } from '../../domain/entities/constitutional-provision.entity';
import { ProvisionMatcherService } from '../../domain/services/provision-matcher.service';
import { ViolationDetectorService } from '../../domain/services/violation-detector.service';
import { logger } from '@server/infrastructure/observability';

export interface AnalyzeBillCommand {
  billId: string;
  billTitle: string;
  billText: string;
  billSummary?: string;
}

export interface AnalyzeBillResult {
  success: boolean;
  analysisId?: string;
  summary: string;
  violationCount: number;
  criticalViolationCount: number;
  confidenceScore: number;
  expertReviewRequired: boolean;
  provisionsAnalyzed: number;
  message: string;
}

export class AnalyzeBillConstitutionalityUseCase {
  constructor(
    private readonly provisionMatcher: ProvisionMatcherService,
    private readonly violationDetector: ViolationDetectorService,
  ) {}

  async execute(command: AnalyzeBillCommand): Promise<AnalyzeBillResult> {
    try {
      logger.info({
        message: 'Starting constitutional analysis',
        billId: command.billId,
        billTitle: command.billTitle,
      });

      // 1. Load all constitutional provisions (would be from repository in real implementation)
      const allProvisions = await this.loadConstitutionalProvisions();

      // 2. Find relevant provisions
      const relevantMatches = this.provisionMatcher.findRelevantProvisions(
        command.billText,
        allProvisions,
        0.3, // Minimum relevance threshold
      );

      const relevantProvisions = relevantMatches.map(m => m.provision);

      logger.info({
        message: 'Found relevant provisions',
        count: relevantProvisions.length,
        billId: command.billId,
      });

      // 3. Detect potential violations
      const violations = this.violationDetector.detectViolations(
        command.billText,
        relevantProvisions,
      );

      const criticalViolations = violations.filter(v => v.severity === 'critical');

      logger.info({
        message: 'Detected potential violations',
        totalViolations: violations.length,
        criticalViolations: criticalViolations.length,
        billId: command.billId,
      });

      // 4. Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(
        relevantProvisions.length,
        violations.length,
      );

      // 5. Generate analysis summary
      const summary = this.generateSummary(
        command.billTitle,
        relevantProvisions.length,
        violations.length,
        criticalViolations.length,
      );

      // 6. Generate detailed analysis
      const detailedAnalysis = this.generateDetailedAnalysis(
        relevantMatches,
        violations,
      );

      // 7. Generate recommendations
      const recommendations = this.generateRecommendations(violations);

      // 8. Create analysis entity
      const analysisInput: CreateAnalysisInput = {
        billId: command.billId,
        analysisType: 'automated',
        confidenceScore,
        summary,
        detailedAnalysis,
        provisionsC ited: relevantProvisions.map(p => p.id),
        potentialViolations: violations,
        recommendations,
      };

      const analysis = ConstitutionalAnalysis.create(analysisInput);

      // 9. Persist analysis (would be done through repository in real implementation)
      // const savedAnalysis = await this.analysisRepository.save(analysis);

      logger.info({
        message: 'Constitutional analysis completed',
        analysisId: analysis.id,
        billId: command.billId,
        expertReviewRequired: analysis.needsExpertReview,
      });

      return {
        success: true,
        analysisId: analysis.id,
        summary,
        violationCount: violations.length,
        criticalViolationCount: criticalViolations.length,
        confidenceScore,
        expertReviewRequired: analysis.needsExpertReview,
        provisionsAnalyzed: relevantProvisions.length,
        message: analysis.needsExpertReview
          ? 'Analysis completed. Expert review required due to potential violations.'
          : 'Analysis completed successfully.',
      };
    } catch (error) {
      logger.error({
        message: 'Failed to analyze bill constitutionality',
        error: error instanceof Error ? error.message : String(error),
        billId: command.billId,
      });

      return {
        success: false,
        summary: 'Analysis failed',
        violationCount: 0,
        criticalViolationCount: 0,
        confidenceScore: 0,
        expertReviewRequired: true,
        provisionsAnalyzed: 0,
        message: 'Failed to analyze bill. Please try again or request manual review.',
      };
    }
  }

  private async loadConstitutionalProvisions(): Promise<ConstitutionalProvision[]> {
    // In real implementation, load from repository
    // For now, return empty array
    return [];
  }

  private calculateConfidenceScore(provisionCount: number, violationCount: number): number {
    // Base confidence on provision coverage and violation detection
    let score = 0.5;

    // More provisions analyzed = higher confidence
    if (provisionCount > 10) score += 0.2;
    else if (provisionCount > 5) score += 0.1;

    // Fewer violations = higher confidence (less ambiguity)
    if (violationCount === 0) score += 0.3;
    else if (violationCount < 3) score += 0.1;
    else score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private generateSummary(
    billTitle: string,
    provisionCount: number,
    violationCount: number,
    criticalCount: number,
  ): string {
    if (criticalCount > 0) {
      return `Analysis of "${billTitle}" identified ${criticalCount} critical constitutional concern(s) across ${provisionCount} relevant provisions. Immediate expert review recommended.`;
    }

    if (violationCount > 0) {
      return `Analysis of "${billTitle}" identified ${violationCount} potential constitutional issue(s) across ${provisionCount} relevant provisions. Expert review recommended.`;
    }

    return `Analysis of "${billTitle}" found no significant constitutional concerns across ${provisionCount} relevant provisions. Bill appears constitutionally sound.`;
  }

  private generateDetailedAnalysis(
    matches: Array<{ provision: ConstitutionalProvision; relevanceScore: number; context: string }>,
    violations: Array<{ provisionReference: string; description: string; severity: string }>,
  ): string {
    let analysis = '# Constitutional Analysis\n\n';

    analysis += '## Relevant Provisions\n\n';
    for (const match of matches.slice(0, 10)) {
      analysis += `- ${match.provision.referenceString}: ${match.provision.toJSON().title} (Relevance: ${(match.relevanceScore * 100).toFixed(0)}%)\n`;
    }

    if (violations.length > 0) {
      analysis += '\n## Potential Issues\n\n';
      for (const violation of violations) {
        analysis += `- **${violation.severity.toUpperCase()}**: ${violation.description}\n`;
        analysis += `  - Provision: ${violation.provisionReference}\n\n`;
      }
    }

    return analysis;
  }

  private generateRecommendations(
    violations: Array<{ severity: string; description: string }>,
  ): string[] {
    const recommendations: string[] = [];

    if (violations.length === 0) {
      recommendations.push('No constitutional concerns identified. Bill may proceed to next stage.');
      return recommendations;
    }

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push('Immediate expert legal review required before proceeding.');
      recommendations.push('Consider consulting with constitutional law experts.');
    }

    recommendations.push('Review and address all flagged constitutional concerns.');
    recommendations.push('Ensure proper justification for any limitations on fundamental rights.');
    recommendations.push('Consider public participation to address constitutional concerns.');

    return recommendations;
  }
}
