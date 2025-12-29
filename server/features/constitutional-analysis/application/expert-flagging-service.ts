// ============================================================================
// EXPERT FLAGGING SERVICE - Expert Review Decision Engine
// ============================================================================
// Service that determines when constitutional analyses need expert human review

import { logger  } from '@shared/core';
import { ExpertReviewQueueRepository } from '@shared/infrastructure/repositories/expert-review-queue-repository.js';
import { ConstitutionalAnalysis } from '@shared/schema/index.js';

export interface ExpertReviewDecision {
  shouldFlag: boolean;
  priority: number; // 1-10 scale
  complexityScore: number; // 0-100
  uncertaintyFlags: string[];
  recommendedExpertise: string[];
  estimatedReviewTime: number; // minutes
  reasoning: string;
}

export class ExpertFlaggingService {
  constructor(
    private readonly expertQueueRepo: ExpertReviewQueueRepository
  ) {}

  /**
   * Determines if analyses should be flagged for expert review
   */
  async shouldFlagForReview(
    analyses: ConstitutionalAnalysis[],
    overallRisk: string,
    overallConfidence: number
  ): Promise<boolean> {
    try {
      logger.info('🎯 Evaluating need for expert review', {
        component: 'ExpertFlagging',
        analysisCount: analyses.length,
        overallRisk,
        overallConfidence
      });

      if (analyses.length === 0) {
        return false;
      }

      // Analyze each individual analysis
      const decisions: ExpertReviewDecision[] = [];
      
      for (const analysis of analyses) {
        const decision = await this.evaluateAnalysisForReview(analysis);
        decisions.push(decision);
      }

      // Make overall decision based on individual decisions and aggregate factors
      const overallDecision = this.makeOverallReviewDecision(
        decisions,
        overallRisk,
        overallConfidence,
        analyses
      );

      if (overallDecision.shouldFlag) {
        // Queue for expert review
        await this.queueForExpertReview(analyses, overallDecision);
        
        logger.info('✅ Flagged for expert review', {
          component: 'ExpertFlagging',
          priority: overallDecision.priority,
          complexity: overallDecision.complexityScore,
          reasoning: overallDecision.reasoning
        });
      } else {
        logger.info('ℹ️ No expert review needed', {
          component: 'ExpertFlagging',
          overallConfidence,
          overallRisk
        });
      }

      return overallDecision.shouldFlag;

    } catch (error) {
      logger.error('❌ Failed to evaluate expert review need', {
        component: 'ExpertFlagging',
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Default to flagging for review on error (safer approach)
      return true;
    }
  }

  /**
   * Evaluates a single analysis for expert review need
   */
  private async evaluateAnalysisForReview(analysis: ConstitutionalAnalysis): Promise<ExpertReviewDecision> {
    let shouldFlag = false;
    let priority = 1;
    let complexityScore = 30; // Base complexity
    const uncertaintyFlags: string[] = [];
    const recommendedExpertise: string[] = [];
    let estimatedReviewTime = 30; // Base 30 minutes

    // 1. Confidence-based flagging
    if (analysis.confidence_percentage < 60) {
      shouldFlag = true;
      priority += 3;
      complexityScore += 20;
      uncertaintyFlags.push('Low confidence analysis');
      estimatedReviewTime += 20;
    } else if (analysis.confidence_percentage < 75) {
      shouldFlag = true;
      priority += 2;
      complexityScore += 10;
      uncertaintyFlags.push('Moderate confidence concerns');
      estimatedReviewTime += 10;
    }

    // 2. Risk-based flagging
    if (analysis.constitutional_risk === 'critical') {
      shouldFlag = true;
      priority += 4;
      complexityScore += 25;
      uncertaintyFlags.push('Critical constitutional risk identified');
      recommendedExpertise.push('Constitutional law specialist');
      estimatedReviewTime += 30;
    } else if (analysis.constitutional_risk === 'high') {
      shouldFlag = true;
      priority += 3;
      complexityScore += 15;
      uncertaintyFlags.push('High constitutional risk');
      recommendedExpertise.push('Constitutional law expert');
      estimatedReviewTime += 20;
    }

    // 3. Analysis type complexity
    if (analysis.analysis_type === 'potential_conflict') {
      complexityScore += 15;
      uncertaintyFlags.push('Potential constitutional conflict');
      recommendedExpertise.push('Rights law specialist');
      estimatedReviewTime += 15;
    }

    // 4. Impact severity flagging
    if (analysis.impact_severity_percentage >= 80) {
      shouldFlag = true;
      priority += 2;
      complexityScore += 10;
      uncertaintyFlags.push('High impact severity');
      estimatedReviewTime += 15;
    }

    // 5. Precedent complexity
    if (analysis.supporting_precedents.length === 0) {
      complexityScore += 10;
      uncertaintyFlags.push('No supporting precedents found');
      estimatedReviewTime += 10;
    } else if (analysis.supporting_precedents.length > 5) {
      complexityScore += 15;
      uncertaintyFlags.push('Multiple conflicting precedents');
      recommendedExpertise.push('Case law specialist');
      estimatedReviewTime += 20;
    }

    // 6. Rights category sensitivity
    const provision = await this.getProvisionDetails(analysis.provision_id);
    if (provision?.rights_category === 'expression') {
      shouldFlag = true;
      priority += 2;
      complexityScore += 15;
      uncertaintyFlags.push('Freedom of expression implications');
      recommendedExpertise.push('First Amendment specialist');
      estimatedReviewTime += 15;
    } else if (provision?.rights_category === 'religion') {
      shouldFlag = true;
      priority += 2;
      complexityScore += 15;
      uncertaintyFlags.push('Religious freedom implications');
      recommendedExpertise.push('Religious liberty expert');
      estimatedReviewTime += 15;
    }

    // 7. Novel legal questions
    if (this.detectNovelLegalQuestions(analysis)) {
      shouldFlag = true;
      priority += 3;
      complexityScore += 20;
      uncertaintyFlags.push('Novel constitutional questions');
      recommendedExpertise.push('Constitutional theory expert');
      estimatedReviewTime += 25;
    }

    // Cap values
    priority = Math.min(priority, 10);
    complexityScore = Math.min(complexityScore, 100);
    estimatedReviewTime = Math.min(estimatedReviewTime, 180); // Max 3 hours

    const reasoning = this.generateReviewReasoning(
      shouldFlag,
      uncertaintyFlags,
      analysis.confidence_percentage,
      analysis.constitutional_risk
    );

    return {
      shouldFlag,
      priority,
      complexityScore,
      uncertaintyFlags,
      recommendedExpertise: [...new Set(recommendedExpertise)], // Remove duplicates
      estimatedReviewTime,
      reasoning
    };
  }

  /**
   * Makes overall review decision based on individual analysis decisions
   */
  private makeOverallReviewDecision(
    decisions: ExpertReviewDecision[],
    overallRisk: string,
    overallConfidence: number,
    analyses: ConstitutionalAnalysis[]
  ): ExpertReviewDecision {
    // If any individual analysis needs review, flag the whole set
    const shouldFlag = decisions.some(d => d.shouldFlag) || 
                      overallRisk === 'critical' || 
                      overallConfidence < 70;

    // Calculate aggregate metrics
    const maxPriority = Math.max(...decisions.map(d => d.priority), 1);
    const avgComplexity = decisions.length > 0 
      ? Math.round(decisions.reduce((sum, d) => sum + d.complexityScore, 0) / decisions.length)
      : 30;
    
    const allUncertaintyFlags = decisions.flatMap(d => d.uncertaintyFlags);
    const allRecommendedExpertise = [...new Set(decisions.flatMap(d => d.recommendedExpertise))];
    const totalEstimatedTime = decisions.reduce((sum, d) => sum + d.estimatedReviewTime, 0);

    // Add aggregate-level flags
    if (analyses.length > 3) {
      allUncertaintyFlags.push('Multiple constitutional provisions affected');
    }

    if (overallRisk === 'critical') {
      allUncertaintyFlags.push('Critical overall constitutional risk');
    }

    const reasoning = shouldFlag 
      ? `Expert review recommended due to: ${allUncertaintyFlags.slice(0, 3).join(', ')}`
      : 'Analysis confidence and risk levels are within acceptable thresholds';

    return {
      shouldFlag,
      priority: maxPriority,
      complexityScore: avgComplexity,
      uncertaintyFlags: [...new Set(allUncertaintyFlags)],
      recommendedExpertise: allRecommendedExpertise,
      estimatedReviewTime: Math.min(totalEstimatedTime, 240), // Max 4 hours total
      reasoning
    };
  }

  /**
   * Queues analyses for expert review
   */
  private async queueForExpertReview(
    analyses: ConstitutionalAnalysis[],
    decision: ExpertReviewDecision
  ): Promise<void> {
    try {
      for (const analysis of analyses) {
        await this.expertQueueRepo.queueForReview({
          analysis_id: analysis.id,
          bill_id: analysis.bill_id,
          priority: decision.priority,
          complexityScore: decision.complexityScore,
          uncertaintyFlags: decision.uncertaintyFlags,
          estimatedReviewTime: decision.estimatedReviewTime,
          recommendedExpertise: decision.recommendedExpertise
        });
      }

      logger.info('📋 Queued analyses for expert review', {
        component: 'ExpertFlagging',
        analysisCount: analyses.length,
        priority: decision.priority,
        estimatedTime: decision.estimatedReviewTime
      });

    } catch (error) {
      logger.error('❌ Failed to queue for expert review', {
        component: 'ExpertFlagging',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Detects novel legal questions that need expert attention
   */
  private detectNovelLegalQuestions(analysis: ConstitutionalAnalysis): boolean {
    // Check for indicators of novel legal questions
    const analysisText = analysis.analysis_text.toLowerCase();
    
    const noveltyIndicators = [
      'first time', 'unprecedented', 'novel', 'new interpretation',
      'emerging technology', 'digital rights', 'artificial intelligence',
      'social media', 'internet', 'cyber', 'data protection'
    ];

    return noveltyIndicators.some(indicator => analysisText.includes(indicator));
  }

  /**
   * Generates reasoning for review decision
   */
  private generateReviewReasoning(
    shouldFlag: boolean,
    uncertaintyFlags: string[],
    confidence: number,
    risk: string
  ): string {
    if (!shouldFlag) {
      return `Analysis confidence (${confidence}%) and risk level (${risk}) are within acceptable thresholds for automated analysis.`;
    }

    const reasons: string[] = [];
    
    if (confidence < 60) {
      reasons.push(`low confidence (${confidence}%)`);
    }
    
    if (risk === 'critical' || risk === 'high') {
      reasons.push(`${risk} constitutional risk`);
    }
    
    if (uncertaintyFlags.length > 0) {
      reasons.push(uncertaintyFlags.slice(0, 2).join(' and '));
    }

    return `Expert review recommended due to: ${reasons.join(', ')}.`;
  }

  /**
   * Gets provision details (placeholder - would integrate with repository)
   */
  private async getProvisionDetails(provisionId: string): Promise<{ rights_category?: string } | null> {
    // This would integrate with the constitutional provisions repository
    // For now, return null to avoid dependency issues
    return null;
  }

  /**
   * Gets current expert review queue status
   */
  async getQueueStatus(): Promise<{
    pendingCount: number;
    averageWaitTime: number;
    highPriorityCount: number;
  }> {
    try {
      return await this.expertQueueRepo.getQueueStatus();
    } catch (error) {
      logger.error('Failed to get expert review queue status', {
        component: 'ExpertFlagging',
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        pendingCount: 0,
        averageWaitTime: 0,
        highPriorityCount: 0
      };
    }
  }

  /**
   * Updates expert review requirements based on system learning
   */
  async updateReviewCriteria(
    analysis_id: string,
    expertFeedback: {
      wasReviewNecessary: boolean;
      actualComplexity: number;
      actualReviewTime: number;
      expertNotes: string;
    }
  ): Promise<void> {
    try {
      // This would update machine learning models or rule weights
      // based on expert feedback to improve future flagging decisions
      
      logger.info('📈 Updated review criteria based on expert feedback', {
        component: 'ExpertFlagging',
        analysis_id,
        wasNecessary: expertFeedback.wasReviewNecessary,
        actualComplexity: expertFeedback.actualComplexity
      });

    } catch (error) {
      logger.error('Failed to update review criteria', {
        component: 'ExpertFlagging',
        analysis_id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}


