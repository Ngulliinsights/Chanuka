/**
 * Mock Argument Analysis Service
 * Uses heuristic-based analysis for MVP (not ML)
 * Can be easily swapped for production ML implementation
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { logger } from '@server/infrastructure/observability';
import type { IArgumentAnalysisService } from '../../domain/interfaces/IArgumentAnalysisService';
import type { ArgumentAnalysis } from '../../application/community-validation.schemas';

export class MockArgumentAnalysisService implements IArgumentAnalysisService {
  private analyses = new Map<string, ArgumentAnalysis>();

  async analyzeComment(commentId: string, content: string): Promise<AsyncServiceResult<ArgumentAnalysis>> {
    return safeAsync(async () => {
      logger.info({ 
        comment_id: commentId, 
        content_length: content.length 
      }, 'Analyzing comment (mock heuristic)');
      
      // Heuristic-based analysis (simple pattern matching)
      const heuristic = this.performHeuristicAnalysis(content);
      
      // Create and store analysis
      const analysis: ArgumentAnalysis = {
        comment_id: commentId,
        structure: heuristic.structure,
        quality_metrics: heuristic.quality_metrics,
        related_arguments: [],
        counter_arguments: [],
        suggested_improvements: heuristic.suggested_improvements,
        analyzed_at: new Date(),
      };
      
      this.analyses.set(commentId, analysis);
      return analysis;
    }, { service: 'MockArgumentAnalysisService', operation: 'analyzeComment' });
  }

  async findRelatedArguments(
    commentId: string,
    threshold: number,
    limit: number
  ): Promise<AsyncServiceResult<string[]>> {
    return safeAsync(async () => {
      // Find analyses with similar quality scores (in-memory)
      const currentAnalysis = this.analyses.get(commentId);
      if (!currentAnalysis) return [];
      
      const currentScore = currentAnalysis.quality_metrics.overall_score;
      const range = 1.0; // +/- 1.0 quality score
      
      const related = Array.from(this.analyses.entries())
        .filter(([id, analysis]) => {
          return id !== commentId &&
                 analysis.quality_metrics.overall_score >= (currentScore - range) &&
                 analysis.quality_metrics.overall_score <= (currentScore + range);
        })
        .sort(([, a], [, b]) => {
          const aDiff = Math.abs(a.quality_metrics.overall_score - currentScore);
          const bDiff = Math.abs(b.quality_metrics.overall_score - currentScore);
          return aDiff - bDiff;
        })
        .slice(0, limit)
        .map(([id]) => id);
      
      return related;
    }, { service: 'MockArgumentAnalysisService', operation: 'findRelatedArguments' });
  }

  async findCounterArguments(
    commentId: string,
    limit: number
  ): Promise<AsyncServiceResult<string[]>> {
    return safeAsync(async () => {
      // Simplified: Return empty array (would require comment repository integration)
      // In production, this would query the comment repository for replies
      logger.debug({ comment_id: commentId }, 'Finding counter arguments (not implemented in mock)');
      return [];
    }, { service: 'MockArgumentAnalysisService', operation: 'findCounterArguments' });
  }

  async getAnalysis(commentId: string): Promise<AsyncServiceResult<ArgumentAnalysis | null>> {
    return safeAsync(async () => {
      return this.analyses.get(commentId) || null;
    }, { service: 'MockArgumentAnalysisService', operation: 'getAnalysis' });
  }

  async saveAnalysis(analysis: ArgumentAnalysis): Promise<AsyncServiceResult<ArgumentAnalysis>> {
    return safeAsync(async () => {
      this.analyses.set(analysis.comment_id, analysis);
      return analysis;
    }, { service: 'MockArgumentAnalysisService', operation: 'saveAnalysis' });
  }

  /**
   * Perform heuristic-based analysis (simple pattern matching)
   * This is a simplified version for MVP - production would use ML models
   */
  private performHeuristicAnalysis(content: string): {
    structure: ArgumentAnalysis['structure'];
    quality_metrics: ArgumentAnalysis['quality_metrics'];
    suggested_improvements: string[];
  } {
    const lowerContent = content.toLowerCase();
    
    // Detect evidence keywords
    const evidenceKeywords = [
      'according to', 'study shows', 'data indicates', 'research suggests',
      'report', 'statistics', 'evidence', 'documented', 'proven',
      'cbo', 'congressional', 'section', 'usc', 'precedent'
    ];
    const hasEvidence = evidenceKeywords.some(kw => lowerContent.includes(kw));
    const evidenceCount = evidenceKeywords.filter(kw => lowerContent.includes(kw)).length;
    
    // Detect fallacy keywords
    const fallacyPatterns = [
      { type: 'hasty_generalization', keywords: ['always', 'never', 'everyone', 'nobody', 'all'], severity: 'high' },
      { type: 'appeal_to_emotion', keywords: ['terrible', 'destroy', 'disaster', 'catastrophe'], severity: 'medium' },
      { type: 'false_dichotomy', keywords: ['either', 'only two', 'must choose'], severity: 'medium' },
      { type: 'ad_hominem', keywords: ['stupid', 'idiot', 'ignorant'], severity: 'high' },
    ];
    
    const detectedFallacies = fallacyPatterns
      .filter(pattern => pattern.keywords.some(kw => lowerContent.includes(kw)))
      .map(pattern => ({ type: pattern.type, severity: pattern.severity, confidence: 0.7 }));
    
    // Calculate metrics
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);
    
    // Evidence strength (0-1)
    const evidenceStrength = hasEvidence 
      ? Math.min(0.3 + (evidenceCount * 0.2), 1.0)
      : 0.1;
    
    // Logical validity (0-1) - penalize fallacies
    const fallacyPenalty = detectedFallacies.length * 0.2;
    const logicalValidity = Math.max(0.8 - fallacyPenalty, 0.2);
    
    // Clarity (0-1) - based on sentence structure
    const clarity = avgWordsPerSentence > 30 ? 0.5 : (avgWordsPerSentence < 10 ? 0.6 : 0.8);
    
    // Relevance (0-1) - assume relevant if it mentions bill-related terms
    const relevanceKeywords = ['bill', 'section', 'provision', 'legislation', 'law', 'policy'];
    const relevance = relevanceKeywords.some(kw => lowerContent.includes(kw)) ? 0.9 : 0.6;
    
    // Overall quality score (0-10)
    const overallScore = (
      (evidenceStrength * 3) +
      (logicalValidity * 2.5) +
      (clarity * 2) +
      (relevance * 2.5)
    );
    
    // Coherence score
    const coherenceScore = (logicalValidity + clarity) / 2;
    
    // Reasoning type
    const reasoningType = hasEvidence ? 'deductive' : (detectedFallacies.length > 0 ? 'unclear' : 'inductive');
    
    // Extract simple claims (sentences ending with periods)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const claims = sentences.slice(0, 3).map(s => ({
      text: s.trim(),
      type: hasEvidence ? 'factual' : 'value',
      confidence: hasEvidence ? 0.8 : 0.5,
    }));
    
    // Extract evidence mentions
    const evidence = evidenceKeywords
      .filter(kw => lowerContent.includes(kw))
      .slice(0, 3)
      .map(kw => ({
        text: kw,
        source_type: 'citation',
        strength: 0.7,
      }));
    
    // Suggested improvements
    const improvements: string[] = [];
    if (!hasEvidence) {
      improvements.push('Provide specific evidence or citations to support your claims');
    }
    if (detectedFallacies.length > 0) {
      improvements.push('Avoid logical fallacies like absolute statements (always/never)');
    }
    if (avgWordsPerSentence > 30) {
      improvements.push('Break down complex sentences for better clarity');
    }
    if (wordCount < 50) {
      improvements.push('Provide more detailed reasoning to strengthen your argument');
    }
    
    return {
      structure: {
        claims,
        evidence,
        fallacies: detectedFallacies,
        reasoning_type: reasoningType,
        coherence_score: coherenceScore,
      },
      quality_metrics: {
        overall_score: Math.round(overallScore * 10) / 10,
        evidence_strength: Math.round(evidenceStrength * 100) / 100,
        logical_validity: Math.round(logicalValidity * 100) / 100,
        clarity: Math.round(clarity * 100) / 100,
        relevance: Math.round(relevance * 100) / 100,
        fallacy_penalty: fallacyPenalty,
      },
      suggested_improvements: improvements,
    };
  }
}
