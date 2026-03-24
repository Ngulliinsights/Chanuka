/**
 * Content Analysis Service
 *
 * Performs automated content analysis for policy violations,
 * spam detection, and content quality assessment.
 *
 * All pattern detection uses word-boundary regex to prevent
 * substring false positives (e.g. "skill" ≠ "kill").
 */

import { ContentAnalysisResult } from '@server/features/admin/moderation/types';
import { logger } from '@server/infrastructure/observability';

// ─── Types ────────────────────────────────────────────────────────────────────

type IssueSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

interface DetectedIssue {
  type: string;
  description: string;
  confidence: number; // 0–1
  severity: IssueSeverity;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_WEIGHTS: Readonly<Record<IssueSeverity, number>> = {
  info: 0.5,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** Overall score thresholds that map to severity bands. */
const SCORE_THRESHOLDS = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
} as const;

const FLAG_SCORE_THRESHOLD = 2;
const MIN_CONTENT_LENGTH = 10;

// Pattern lists are module-level constants so they are allocated once.

const PROFANITY_WORDS = [
  'fuck', 'shit', 'damn', 'bastard', 'asshole', 'bitch',
  'crap', 'piss', 'dick', 'cock', 'pussy',
] as const;

const HATE_SPEECH_WORDS = [
  'hate', 'kill', 'die', 'destroy', 'eliminate',
  'inferior', 'subhuman', 'vermin', 'scum',
] as const;

/**
 * Targeted harassment phrases – tightly scoped to avoid matching
 * benign constructions like "you are correct".
 */
const HARASSMENT_PHRASES = [
  'you idiot', 'you moron', "you're stupid", 'you are stupid',
  'shut up', 'kill yourself', 'you loser', 'you are pathetic',
] as const;

const MISINFORMATION_PHRASES = [
  "they don't want you to know",
  "the truth they're hiding",
  'big pharma',
  'wake up sheeple',
  'do your own research',
  "mainstream media won't tell you",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wraps a term in a word-boundary regex, case-insensitive. */
function wordBoundaryRegex(term: string): RegExp {
  // Escape special regex characters in the term before wrapping.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

/** Counts how many terms from a list appear in content (word-boundary aware). */
function countMatches(content: string, terms: readonly string[]): number {
  return terms.filter(t => wordBoundaryRegex(t).test(content)).length;
}

/** Clamps a value between 0 and 1. */
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

// ─── Service ──────────────────────────────────────────────────────────────────

export class ContentAnalysisService {
  private static instance: ContentAnalysisService;

  static getInstance(): ContentAnalysisService {
    if (!ContentAnalysisService.instance) {
      ContentAnalysisService.instance = new ContentAnalysisService();
    }
    return ContentAnalysisService.instance;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Analyses content for policy violations without creating a report.
   *
   * @param _contentType - Reserved for future type-specific rule sets.
   * @param content - Raw content string to analyse.
   * @param _additionalContext - Reserved for future contextual scoring.
   */
  async analyzeContent(
    _contentType: 'bill' | 'comment',
    content: string,
    _additionalContext?: { authorId?: string; relatedContentId?: number },
  ): Promise<ContentAnalysisResult> {
    try {
      const detectedIssues = [
        this.detectProfanity(content),
        this.detectSpam(content),
        this.detectHateSpeech(content),
        this.detectHarassment(content),
        this.checkContentQuality(content),
        this.detectMisinformation(content),
      ].filter((issue): issue is DetectedIssue => issue !== null);

      return this.calculateOverallAssessment(detectedIssues);
    } catch (error) {
      logger.error(
        {
          component: 'ContentAnalysis',
          error: error instanceof Error ? error.message : String(error),
        },
        'Error analyzing content',
      );

      return {
        shouldFlag: false,
        severity: 'info',
        detectedIssues: [],
        overallScore: 0,
        recommendations: ['Content analysis temporarily unavailable'],
      };
    }
  }

  /**
   * Returns the default severity level for a given user-report type.
   */
  calculateSeverity(reportType: string): IssueSeverity {
    const severityMap: Record<string, IssueSeverity> = {
      harassment: 'critical',
      misinformation: 'high',
      copyright: 'high',
      spam: 'medium',
      inappropriate: 'medium',
      other: 'low',
    };

    return severityMap[reportType.toLowerCase()] ?? 'info';
  }

  // ─── Detection methods ───────────────────────────────────────────────────────

  private detectProfanity(content: string): DetectedIssue | null {
    const count = countMatches(content, PROFANITY_WORDS);
    if (count === 0) return null;

    return {
      type: 'inappropriate',
      description: `Detected ${count} instance(s) of explicit language`,
      confidence: clamp01(count * 0.3),
      severity: count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low',
    };
  }

  private detectSpam(content: string): DetectedIssue | null {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    const upperRatio = letters.length > 0
      ? content.replace(/[^A-Z]/g, '').length / letters.length
      : 0;

    const linkCount = (content.match(/https?:\/\//g) ?? []).length;
    const words = content.split(/\s+/).filter(Boolean);
    const uniqueRatio = words.length > 0
      ? new Set(words.map(w => w.toLowerCase())).size / words.length
      : 1;

    const signals = [
      upperRatio > 0.5,
      linkCount > 3,
      words.length > 10 && uniqueRatio < 0.3,
    ].filter(Boolean).length;

    if (signals === 0) return null;

    return {
      type: 'spam',
      description: 'Content shows spam characteristics (excessive caps, links, or repetition)',
      confidence: clamp01(signals * 0.33),
      severity: signals >= 2 ? 'high' : 'medium',
    };
  }

  private detectHateSpeech(content: string): DetectedIssue | null {
    const count = countMatches(content, HATE_SPEECH_WORDS);
    if (count === 0) return null;

    return {
      type: 'harassment',
      description: 'Content may contain hate speech or violent language',
      confidence: clamp01(count * 0.4),
      severity: count >= 3 ? 'critical' : count >= 2 ? 'high' : 'medium',
    };
  }

  private detectHarassment(content: string): DetectedIssue | null {
    const count = countMatches(content, HARASSMENT_PHRASES);
    if (count === 0) return null;

    return {
      type: 'harassment',
      description: 'Content may contain personal attacks or harassment',
      confidence: clamp01(count * 0.35),
      severity: count >= 2 ? 'high' : 'medium',
    };
  }

  private checkContentQuality(content: string): DetectedIssue | null {
    if (content.trim().length >= MIN_CONTENT_LENGTH) return null;

    return {
      type: 'inappropriate',
      description: 'Content is extremely short and may not be substantive',
      confidence: 0.6,
      severity: 'low',
    };
  }

  private detectMisinformation(content: string): DetectedIssue | null {
    const count = countMatches(content, MISINFORMATION_PHRASES);
    if (count === 0) return null;

    return {
      type: 'misinformation',
      description: 'Content contains phrases commonly associated with misinformation',
      confidence: clamp01(count * 0.3),
      severity: 'medium',
    };
  }

  // ─── Scoring ─────────────────────────────────────────────────────────────────

  private calculateOverallAssessment(detectedIssues: DetectedIssue[]): ContentAnalysisResult {
    const overallScore = detectedIssues.reduce(
      (acc, issue) => acc + issue.confidence * SEVERITY_WEIGHTS[issue.severity],
      0,
    );

    const hasCritical = detectedIssues.some(i => i.severity === 'critical');
    const shouldFlag = hasCritical || overallScore >= FLAG_SCORE_THRESHOLD;

    const severity = this.scoreToSeverity(overallScore, hasCritical);

    return {
      shouldFlag,
      severity,
      detectedIssues,
      overallScore: Math.round(overallScore * 100) / 100,
      recommendations: this.generateRecommendations(detectedIssues),
    };
  }

  private scoreToSeverity(score: number, hasCritical: boolean): IssueSeverity {
    if (hasCritical || score >= SCORE_THRESHOLDS.critical) return 'critical';
    if (score >= SCORE_THRESHOLDS.high)   return 'high';
    if (score >= SCORE_THRESHOLDS.medium) return 'medium';
    if (score >= SCORE_THRESHOLDS.low)    return 'low';
    return 'info';
  }

  private generateRecommendations(detectedIssues: DetectedIssue[]): string[] {
    const RECOMMENDATION_MAP: Record<string, string> = {
      inappropriate: 'Consider removing explicit language to maintain a professional tone',
      spam:          'Reduce repetition, excessive capitalisation, or the number of links',
      harassment:    'Focus on ideas rather than personal attacks; remove hateful or violent language',
      misinformation:'Support claims with credible sources and avoid conspiracy language',
    };

    const issueTypes = new Set(detectedIssues.map(i => i.type));
    const recommendations = [...issueTypes]
      .map(type => RECOMMENDATION_MAP[type])
      .filter((r): r is string => r !== undefined);

    return recommendations.length > 0
      ? recommendations
      : ['Content appears to meet community guidelines'];
  }
}

export const contentAnalysisService = ContentAnalysisService.getInstance();