/**
 * Content Analysis Service
 * 
 * Handles automated content analysis for policy violations,
 * spam detection, and content quality assessment.
 */

import { ContentAnalysisResult } from '@server/features/admin/moderation/types.ts';
import { logger  } from '@shared/core';

export class ContentAnalysisService {
  private static instance: ContentAnalysisService;

  public static getInstance(): ContentAnalysisService {
    if (!ContentAnalysisService.instance) {
      ContentAnalysisService.instance = new ContentAnalysisService();
    }
    return ContentAnalysisService.instance;
  }

  /**
   * Analyzes content for policy violations without creating a report
   */
  async analyzeContent(
    content_type: 'bill' | 'comment',
    content: string,
    additionalContext?: {
      authorId?: string;
      relatedContentId?: number;
    }
  ): Promise<ContentAnalysisResult> {
    try {
      const detectedIssues: {
        type: string;
        description: string;
        confidence: number;
        severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
      }[] = [];

      const lowerContent = content.toLowerCase();

      // Check for profanity and explicit language
      const profanityIssues = this.detectProfanity(lowerContent);
      if (profanityIssues) {
        detectedIssues.push(profanityIssues);
      }

      // Check for spam indicators
      const spamIssues = this.detectSpam(content, lowerContent);
      if (spamIssues) {
        detectedIssues.push(spamIssues);
      }

      // Check for hate speech and violent language
      const hateSpeechIssues = this.detectHateSpeech(lowerContent);
      if (hateSpeechIssues) {
        detectedIssues.push(hateSpeechIssues);
      }

      // Check for personal attacks and harassment
      const harassmentIssues = this.detectHarassment(lowerContent);
      if (harassmentIssues) {
        detectedIssues.push(harassmentIssues);
      }

      // Check content quality
      const qualityIssues = this.checkContentQuality(content);
      if (qualityIssues) {
        detectedIssues.push(qualityIssues);
      }

      // Check for misinformation markers
      const misinformationIssues = this.detectMisinformation(lowerContent);
      if (misinformationIssues) {
        detectedIssues.push(misinformationIssues);
      }

      // Calculate overall risk score and determine action
      const result = this.calculateOverallAssessment(detectedIssues);

      return result;
    } catch (error) {
      logger.error('Error analyzing content:', {
        component: 'ContentAnalysis',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        shouldFlag: false,
        severity: 'info',
        detectedIssues: [],
        overallScore: 0,
        recommendations: ['Content analysis temporarily unavailable']
      };
    }
  }

  /**
   * Calculates severity level based on report type
   */
  calculateSeverity(reportType: string): 'info' | 'low' | 'medium' | 'high' | 'critical' {
    const criticalTypes = ['harassment'];
    const highTypes = ['misinformation', 'copyright'];
    const mediumTypes = ['spam', 'inappropriate'];
    const lowTypes = ['other'];

    const normalizedType = reportType.toLowerCase();

    if (criticalTypes.includes(normalizedType)) {
      return 'critical';
    } else if (highTypes.includes(normalizedType)) {
      return 'high';
    } else if (mediumTypes.includes(normalizedType)) {
      return 'medium';
    } else if (lowTypes.includes(normalizedType)) {
      return 'low';
    }

    return 'info';
  }

  // Private analysis methods

  private detectProfanity(lowerContent: string) {
    const profanityPatterns = [
      'fuck', 'shit', 'damn', 'bastard', 'asshole', 'bitch',
      'crap', 'piss', 'dick', 'cock', 'pussy'
    ];

    const profanityCount = profanityPatterns.filter(word =>
      lowerContent.includes(word)
    ).length;

    if (profanityCount > 0) {
      return {
        type: 'inappropriate',
        description: `Detected ${profanityCount} instance(s) of explicit language`,
        confidence: Math.min(profanityCount * 0.3, 1),
        severity: profanityCount >= 3 ? 'high' : profanityCount >= 2 ? 'medium' : 'low'
      } as const;
    }

    return null;
  }

  private detectSpam(content: string, lowerContent: string) {
    const hasExcessiveCaps = content.split('').filter(c =>
      c === c.toUpperCase() && c !== c.toLowerCase()
    ).length / content.length > 0.5;

    const linkCount = (content.match(/https?:\/\//g) || []).length;
    const hasExcessiveLinks = linkCount > 3;

    const words = content.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const hasRepetitiveText = words.length > 10 && uniqueWords.size / words.length < 0.3;

    if (hasExcessiveCaps || hasExcessiveLinks || hasRepetitiveText) {
      const spamSignals = [hasExcessiveCaps, hasExcessiveLinks, hasRepetitiveText]
        .filter(Boolean).length;

      return {
        type: 'spam',
        description: 'Content shows characteristics of spam (excessive caps, links, or repetition)',
        confidence: spamSignals * 0.33,
        severity: spamSignals >= 2 ? 'high' : 'medium'
      } as const;
    }

    return null;
  }

  private detectHateSpeech(lowerContent: string) {
    const hateSpeechPatterns = [
      'hate', 'kill', 'die', 'destroy', 'eliminate',
      'inferior', 'subhuman', 'vermin', 'scum'
    ];

    const hateSpeechCount = hateSpeechPatterns.filter(word =>
      lowerContent.includes(word)
    ).length;

    if (hateSpeechCount > 0) {
      return {
        type: 'harassment',
        description: 'Content may contain hate speech or violent language',
        confidence: Math.min(hateSpeechCount * 0.4, 1),
        severity: hateSpeechCount >= 3 ? 'critical' : hateSpeechCount >= 2 ? 'high' : 'medium'
      } as const;
    }

    return null;
  }

  private detectHarassment(lowerContent: string) {
    const harassmentPatterns = [
      'you are', 'you\'re a', 'idiot', 'moron', 'stupid',
      'shut up', 'kill yourself', 'loser', 'pathetic'
    ];

    const harassmentCount = harassmentPatterns.filter(phrase =>
      lowerContent.includes(phrase)
    ).length;

    if (harassmentCount > 0) {
      return {
        type: 'harassment',
        description: 'Content may contain personal attacks or harassment',
        confidence: Math.min(harassmentCount * 0.35, 1),
        severity: harassmentCount >= 2 ? 'high' : 'medium'
      } as const;
    }

    return null;
  }

  private checkContentQuality(content: string) {
    if (content.length < 10) {
      return {
        type: 'inappropriate',
        description: 'Content is extremely short and may not be substantive',
        confidence: 0.6,
        severity: 'low'
      } as const;
    }

    return null;
  }

  private detectMisinformation(lowerContent: string) {
    const misinformationMarkers = [
      'they don\'t want you to know', 'the truth they\'re hiding',
      'big pharma', 'wake up', 'do your own research',
      'mainstream media won\'t tell you'
    ];

    const misinformationCount = misinformationMarkers.filter(phrase =>
      lowerContent.includes(phrase)
    ).length;

    if (misinformationCount > 0) {
      return {
        type: 'misinformation',
        description: 'Content contains phrases commonly associated with misinformation',
        confidence: misinformationCount * 0.3,
        severity: 'medium'
      } as const;
    }

    return null;
  }

  private calculateOverallAssessment(detectedIssues: unknown[]): ContentAnalysisResult {
    const severityWeights = {
      info: 0.5,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4
    };

    const overallScore = detectedIssues.reduce((score, issue) => {
      return score + (issue.confidence * severityWeights[issue.severity]);
    }, 0);

    const hasCriticalIssues = detectedIssues.some(i => i.severity === 'critical');
    const shouldFlag = hasCriticalIssues || overallScore >= 2;

    // Determine overall severity
    let overallSeverity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    if (hasCriticalIssues || overallScore >= 4) {
      overallSeverity = 'critical';
    } else if (overallScore >= 3) {
      overallSeverity = 'high';
    } else if (overallScore >= 2) {
      overallSeverity = 'medium';
    } else if (overallScore >= 1) {
      overallSeverity = 'low';
    } else {
      overallSeverity = 'info';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(detectedIssues);

    return {
      shouldFlag,
      severity: overallSeverity,
      detectedIssues,
      overallScore: Math.round(overallScore * 100) / 100,
      recommendations
    };
  }

  private generateRecommendations(detectedIssues: unknown[]): string[] {
    const recommendations: string[] = [];

    if (detectedIssues.some(i => i.type === 'inappropriate')) {
      recommendations.push('Consider removing explicit language to maintain a professional tone');
    }

    if (detectedIssues.some(i => i.type === 'spam')) {
      recommendations.push('Reduce repetition, excessive capitalization, or number of links');
    }

    if (detectedIssues.some(i => i.type === 'harassment')) {
      recommendations.push('Focus on ideas rather than personal attacks. Remove any hateful or violent language');
    }

    if (detectedIssues.some(i => i.type === 'misinformation')) {
      recommendations.push('Support claims with credible sources and avoid conspiracy language');
    }

    if (recommendations.length === 0) {
      recommendations.push('Content appears to meet community guidelines');
    }

    return recommendations;
  }
}

export const contentAnalysisService = ContentAnalysisService.getInstance();


