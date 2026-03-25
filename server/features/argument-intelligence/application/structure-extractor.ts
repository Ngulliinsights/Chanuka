// ============================================================================
// ARGUMENT INTELLIGENCE - Structure Extractor — FINAL DRAFT
// ============================================================================
//
// CHANGES FROM PRIOR DRAFT:
// - Extract LOG_COMPONENT constant; remove per-call component repetition
// - Remove redundant buildArgumentChains() call inside the log statement of
//   extractArguments — it built full chains purely for a count, wasting work
//   and masking any errors thrown by that method
// - Parallelise classifySentences: serial for-await loop → Promise.all
// - Parallelise enhanceArguments: serial for-await loop → Promise.all
// - Parallelise the two independent pipeline steps in extractArguments:
//   classifySentences and extractEntities are now launched concurrently
// - Add 'value_judgment' case to buildArgumentChains switch — previously
//   silently dropped; now appended to supportingReasons
// - Promote all keyword arrays (detectPosition, findArgumentativeIndicators,
//   assessEvidenceQuality) to static readonly class constants so they are
//   allocated once, not on every call
// - Name all magic numbers as private static readonly constants:
//   QUALITY_WEIGHTS, CONFIDENCE_MULTIPLIERS, SPAN_LOOKAHEAD, MIN_SENTENCE_LEN
// - Remove _context parameter from identifyArguments — it was unused and
//   leaking the extraction context into a method that doesn't need it
// - Compute text.toLowerCase() once per iteration in findArgumentSpan
// ============================================================================

import { logger } from '@server/infrastructure/observability';

// ── Dependency interfaces ─────────────────────────────────────────────────────

export interface SentenceClassification {
  type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment' | 'other';
  confidence: number;
}

export interface SentenceClassifier {
  classify(sentence: string): Promise<SentenceClassification>;
}

export interface EntityExtractor {
  extractEntities(text: string): Promise<ExtractedEntity[]>;
}

export interface SimilarityCalculator {
  calculateSimilarity(a: string, b: string): Promise<number>;
}

// ── Domain types ──────────────────────────────────────────────────────────────

export interface ExtractionContext {
  bill_id: string;
  userContext?: {
    county?: string;
    ageGroup?: string;
    occupation?: string;
    organizationAffiliation?: string;
  };
  submissionContext?: {
    submissionMethod: 'web' | 'ussd' | 'ambassador' | 'api';
    timestamp: Date;
    session_id?: string;
  };
}

export interface ExtractedArgument {
  id: string;
  type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment';
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  text: string;
  normalizedText: string;
  confidence: number;
  topicTags: string[];
  affectedGroups: string[];
  evidenceQuality: 'none' | 'weak' | 'moderate' | 'strong';
  sentenceSpan: { start: number; end: number };
  parentArgumentId?: string;
  metadata?: {
    userContext?: ExtractionContext['userContext'];
    submissionContext?: ExtractionContext['submissionContext'];
    similarityScore: number;
    extractionTimestamp: Date;
    qualityScore: number;
  };
}

export interface ArgumentChain {
  mainClaim: ExtractedArgument;
  supportingReasons: ExtractedArgument[];
  evidence: ExtractedArgument[];
  predictions: ExtractedArgument[];
  counterArguments: ExtractedArgument[];
}

interface ClassifiedSentence {
  text: string;
  index: number;
  type: 'claim' | 'evidence' | 'reasoning' | 'prediction' | 'value_judgment' | 'other';
  confidence: number;
  position: 'support' | 'oppose' | 'neutral' | 'conditional';
  indicators: string[];
}

export interface ExtractedEntity {
  text: string;
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

const LOG_COMPONENT = 'StructureExtractor';

export class StructureExtractorService {
  // ── Static constants ────────────────────────────────────────────────────────

  /** Minimum character length for a sentence to stand alone (below → merge). */
  private static readonly MIN_SENTENCE_LEN = 20;

  /** Maximum sentence lookahead when extending an argument span. */
  private static readonly SPAN_LOOKAHEAD = 3;

  /** Minimum classifier confidence to admit a sentence as an argument. */
  private static readonly MIN_CONFIDENCE = 0.5;

  /** Weights used in calculateQualityScore (must sum to 100). */
  private static readonly QUALITY_WEIGHTS = {
    confidence: 40,
    topicTagPerItem: 5,
    topicTagCap: 20,
    affectedGroupPerItem: 3,
    affectedGroupCap: 10,
    evidence: { strong: 30, moderate: 20, weak: 10, none: 0 },
  } as const;

  /** Multipliers applied to classifier confidence when context is rich. */
  private static readonly CONFIDENCE_MULTIPLIERS = {
    apiSubmission: 1.1,
    organizationAffiliated: 1.05,
  } as const;

  // Keyword banks — allocated once, not per call.

  private static readonly CONDITIONAL_INDICATORS = [
    'if', 'unless', 'provided that', 'on condition', 'depending on',
    'as long as', 'with amendments',
  ] as const;

  private static readonly SUPPORT_KEYWORDS = [
    'support', 'agree', 'good', 'beneficial', 'necessary', 'important',
    'should pass', 'in favor', 'positive', 'helpful',
  ] as const;

  private static readonly OPPOSE_KEYWORDS = [
    'oppose', 'against', 'bad', 'harmful', 'unnecessary', 'dangerous',
    'should not', 'reject', 'negative', 'problematic',
  ] as const;

  private static readonly INDICATOR_PATTERNS: ReadonlyArray<{ type: string; keywords: readonly string[] }> = [
    { type: 'causal',      keywords: ['because', 'since', 'due to', 'as a result', 'therefore'] },
    { type: 'evidential',  keywords: ['studies show', 'research indicates', 'data suggests', 'according to'] },
    { type: 'comparative', keywords: ['compared to', 'unlike', 'similar to', 'in contrast'] },
    { type: 'temporal',    keywords: ['will lead to', 'in the future', 'eventually', 'over time'] },
    { type: 'conditional', keywords: ['if', 'unless', 'provided that', 'in case'] },
  ];

  private static readonly STRONG_EVIDENCE_KEYWORDS = ['study', 'research', 'data', 'statistics'] as const;
  private static readonly MODERATE_EVIDENCE_KEYWORDS = ['example', 'case', 'experience', 'report'] as const;
  private static readonly WEAK_EVIDENCE_KEYWORDS = ['heard', 'believe', 'think', 'feel'] as const;

  private static readonly POLICY_TOPICS = [
    'healthcare', 'education', 'taxation', 'environment', 'security',
    'agriculture', 'technology', 'infrastructure', 'employment', 'housing',
    'economy', 'governance',
  ] as const;

  private static readonly STAKEHOLDER_GROUPS = [
    'farmers', 'students', 'teachers', 'workers', 'businesses', 'elderly',
    'youth', 'women', 'disabled', 'rural communities', 'urban residents',
    'small businesses', 'taxpayers', 'consumers', 'patients',
  ] as const;

  private static readonly SPAN_EXTENSION_PREFIXES = [
    'this', 'furthermore', 'additionally', 'moreover',
  ] as const;

  // ── Constructor ─────────────────────────────────────────────────────────────

  constructor(
    private readonly sentenceClassifier: SentenceClassifier,
    private readonly entityExtractor: EntityExtractor,
    private readonly similarityCalculator: SimilarityCalculator,
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Extract argumentative structure from a citizen comment.
   */
  async extractArguments(
    commentText: string,
    context: ExtractionContext,
  ): Promise<ExtractedArgument[]> {
    try {
      logger.info(
        { component: LOG_COMPONENT, bill_id: context.bill_id, textLength: commentText.length },
        '🔍 Extracting arguments from comment',
      );

      const sentences = this.segmentIntoSentences(commentText);

      // Sentence classification and entity extraction are independent — run concurrently.
      const [classifiedSentences, entities] = await Promise.all([
        this.classifySentences(sentences),
        this.entityExtractor.extractEntities(commentText),
      ]);

      const args = await this.identifyArguments(classifiedSentences, entities);
      const enhanced = await this.enhanceArguments(args, context);

      logger.info(
        { component: LOG_COMPONENT, bill_id: context.bill_id, argumentsExtracted: enhanced.length },
        '✅ Argument extraction completed',
      );

      return enhanced;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        { component: LOG_COMPONENT, bill_id: context.bill_id, error: errorMessage },
        'Failed to extract arguments',
      );
      throw error;
    }
  }

  /**
   * Extract argument chains showing the logical flow of a comment.
   */
  async extractArgumentChains(
    commentText: string,
    context: ExtractionContext,
  ): Promise<ArgumentChain[]> {
    const args = await this.extractArguments(commentText, context);
    return this.buildArgumentChains(args);
  }

  // ── Pipeline steps ──────────────────────────────────────────────────────────

  /**
   * Segment text into sentences, handling informal citizen-comment patterns.
   *
   * Short fragments (< MIN_SENTENCE_LEN chars) are merged into the preceding
   * sentence rather than standing alone.
   */
  private segmentIntoSentences(text: string): string[] {
    const rawSentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const sentences: string[] = [];
    let current = '';

    for (const sentence of rawSentences) {
      if (sentence.length < StructureExtractorService.MIN_SENTENCE_LEN && current.length > 0) {
        current += '. ' + sentence;
      } else {
        if (current.length > 0) sentences.push(current);
        current = sentence;
      }
    }

    if (current.length > 0) sentences.push(current);
    return sentences;
  }

  /**
   * Classify all sentences concurrently by argumentative function.
   */
  private async classifySentences(sentences: string[]): Promise<ClassifiedSentence[]> {
    const classifications = await Promise.all(
      sentences.map((text) => this.sentenceClassifier.classify(text)),
    );

    return classifications.map((classification, i) => {
      const text = sentences[i] ?? '';
      return {
        text,
        index: i,
        type: classification.type,
        confidence: classification.confidence,
        position: this.detectPosition(text),
        indicators: this.findArgumentativeIndicators(text),
      };
    });
  }

  /**
   * Convert classified sentences into discrete argument objects.
   */
  private async identifyArguments(
    sentences: ClassifiedSentence[],
    entities: ExtractedEntity[],
  ): Promise<ExtractedArgument[]> {
    const args: ExtractedArgument[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (
        !sentence ||
        sentence.type === 'other' ||
        sentence.confidence < StructureExtractorService.MIN_CONFIDENCE
      ) {
        continue;
      }

      const span = this.findArgumentSpan(sentences, i);

      const text =
        span.end > span.start
          ? sentences
              .slice(span.start, span.end + 1)
              .map((s) => s.text)
              .join(' ')
          : sentence.text;

      args.push({
        id: crypto.randomUUID(),
        type: sentence.type,
        position: sentence.position,
        text,
        normalizedText: this.normalizeText(text),
        confidence: sentence.confidence,
        topicTags: this.extractTopicTags(text, entities),
        affectedGroups: this.identifyAffectedGroups(text, entities),
        evidenceQuality: this.assessEvidenceQuality(sentence),
        sentenceSpan: span,
      });
    }

    return args;
  }

  /**
   * Build logical chains connecting related arguments.
   *
   * value_judgment arguments are treated as supporting reasons for the
   * nearest claim — they express the normative basis for a position.
   */
  private buildArgumentChains(args: ExtractedArgument[]): ArgumentChain[] {
    const chains: ArgumentChain[] = [];
    const used = new Set<string>();

    for (const claim of args.filter((a) => a.type === 'claim')) {
      if (used.has(claim.id)) continue;

      const chain: ArgumentChain = {
        mainClaim: claim,
        supportingReasons: [],
        evidence: [],
        predictions: [],
        counterArguments: [],
      };

      const nearby = args.filter(
        (a) =>
          !used.has(a.id) &&
          a.id !== claim.id &&
          Math.abs(a.sentenceSpan.start - claim.sentenceSpan.start) <=
            StructureExtractorService.SPAN_LOOKAHEAD,
      );

      for (const arg of nearby) {
        switch (arg.type) {
          case 'reasoning':
          case 'value_judgment':
            chain.supportingReasons.push(arg);
            break;
          case 'evidence':
            chain.evidence.push(arg);
            break;
          case 'prediction':
            chain.predictions.push(arg);
            break;
          case 'claim':
            if (arg.position !== claim.position) chain.counterArguments.push(arg);
            break;
        }
        used.add(arg.id);
      }

      used.add(claim.id);
      chains.push(chain);
    }

    return chains;
  }

  /**
   * Enrich arguments concurrently with context metadata and quality scores.
   */
  private async enhanceArguments(
    args: ExtractedArgument[],
    context: ExtractionContext,
  ): Promise<ExtractedArgument[]> {
    return Promise.all(
      args.map(async (argument) => {
        const enhancedArg: ExtractedArgument = { ...argument };

        if (context.userContext?.county) {
          enhancedArg.topicTags = this.addGeographicContext(
            enhancedArg.topicTags,
            context.userContext.county,
          );
        }

        if (context.userContext?.occupation) {
          enhancedArg.affectedGroups = this.addOccupationalContext(
            enhancedArg.affectedGroups,
            context.userContext.occupation,
          );
        }

        enhancedArg.confidence = this.adjustConfidenceWithContext(
          enhancedArg.confidence,
          context,
        );

        const similarityScore = await this.calculateSimilarityToExisting(
          argument,
          context.bill_id,
        );

        enhancedArg.metadata = {
          userContext: context.userContext,
          submissionContext: context.submissionContext,
          similarityScore,
          extractionTimestamp: new Date(),
          qualityScore: this.calculateQualityScore(enhancedArg),
        };

        return enhancedArg;
      }),
    );
  }

  // ── Text analysis helpers ───────────────────────────────────────────────────

  private detectPosition(
    text: string,
  ): 'support' | 'oppose' | 'neutral' | 'conditional' {
    const lower = text.toLowerCase();

    if (StructureExtractorService.CONDITIONAL_INDICATORS.some((kw) => lower.includes(kw))) {
      return 'conditional';
    }

    const supportScore = StructureExtractorService.SUPPORT_KEYWORDS.filter((kw) =>
      lower.includes(kw),
    ).length;

    const opposeScore = StructureExtractorService.OPPOSE_KEYWORDS.filter((kw) =>
      lower.includes(kw),
    ).length;

    if (supportScore > opposeScore) return 'support';
    if (opposeScore > supportScore) return 'oppose';
    return 'neutral';
  }

  private findArgumentativeIndicators(text: string): string[] {
    const lower = text.toLowerCase();
    return StructureExtractorService.INDICATOR_PATTERNS
      .filter(({ keywords }) => keywords.some((kw) => lower.includes(kw)))
      .map(({ type }) => type);
  }

  private extractTopicTags(text: string, entities: ExtractedEntity[]): string[] {
    const lower = text.toLowerCase();

    const fromEntities = entities
      .filter((e) => e.type === 'TOPIC' || e.type === 'POLICY_AREA')
      .map((e) => e.text.toLowerCase());

    const fromKeywords = StructureExtractorService.POLICY_TOPICS.filter((t) =>
      lower.includes(t),
    );

    return [...new Set([...fromEntities, ...fromKeywords])];
  }

  private identifyAffectedGroups(text: string, entities: ExtractedEntity[]): string[] {
    const lower = text.toLowerCase();

    const fromEntities = entities
      .filter((e) => e.type === 'STAKEHOLDER' || e.type === 'ORGANIZATION')
      .map((e) => e.text.toLowerCase());

    const fromKeywords = StructureExtractorService.STAKEHOLDER_GROUPS.filter((g) =>
      lower.includes(g),
    );

    return [...new Set([...fromEntities, ...fromKeywords])];
  }

  private assessEvidenceQuality(
    sentence: ClassifiedSentence,
  ): 'none' | 'weak' | 'moderate' | 'strong' {
    if (sentence.type !== 'evidence') return 'none';

    const lower = sentence.text.toLowerCase();

    if (StructureExtractorService.STRONG_EVIDENCE_KEYWORDS.some((kw) => lower.includes(kw))) {
      return 'strong';
    }
    if (StructureExtractorService.MODERATE_EVIDENCE_KEYWORDS.some((kw) => lower.includes(kw))) {
      return 'moderate';
    }
    if (StructureExtractorService.WEAK_EVIDENCE_KEYWORDS.some((kw) => lower.includes(kw))) {
      return 'weak';
    }

    return 'moderate';
  }

  /**
   * Extend an argument's span forward while continuation phrases are present.
   */
  private findArgumentSpan(
    sentences: ClassifiedSentence[],
    startIndex: number,
  ): { start: number; end: number } {
    let end = startIndex;
    const limit = Math.min(
      sentences.length,
      startIndex + StructureExtractorService.SPAN_LOOKAHEAD + 1,
    );

    for (let i = startIndex + 1; i < limit; i++) {
      const lower = sentences[i]?.text.toLowerCase() ?? '';
      if (
        StructureExtractorService.SPAN_EXTENSION_PREFIXES.some((prefix) =>
          lower.startsWith(prefix),
        )
      ) {
        end = i;
      } else {
        break;
      }
    }

    return { start: startIndex, end };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ── Context enrichment helpers ──────────────────────────────────────────────

  private addGeographicContext(tags: string[], county: string): string[] {
    return [...tags, `county_${county.toLowerCase()}`];
  }

  private addOccupationalContext(groups: string[], occupation: string): string[] {
    return [...groups, occupation.toLowerCase()];
  }

  private adjustConfidenceWithContext(
    confidence: number,
    context: ExtractionContext,
  ): number {
    const { CONFIDENCE_MULTIPLIERS } = StructureExtractorService;
    let adjusted = confidence;

    if (context.submissionContext?.submissionMethod === 'api') {
      adjusted *= CONFIDENCE_MULTIPLIERS.apiSubmission;
    }
    if (context.userContext?.organizationAffiliation) {
      adjusted *= CONFIDENCE_MULTIPLIERS.organizationAffiliated;
    }

    return Math.min(1.0, adjusted);
  }

  // ── Quality scoring ─────────────────────────────────────────────────────────

  private calculateQualityScore(argument: ExtractedArgument): number {
    const { QUALITY_WEIGHTS } = StructureExtractorService;

    const score =
      argument.confidence * QUALITY_WEIGHTS.confidence +
      QUALITY_WEIGHTS.evidence[argument.evidenceQuality] +
      Math.min(argument.topicTags.length * QUALITY_WEIGHTS.topicTagPerItem, QUALITY_WEIGHTS.topicTagCap) +
      Math.min(argument.affectedGroups.length * QUALITY_WEIGHTS.affectedGroupPerItem, QUALITY_WEIGHTS.affectedGroupCap);

    return Math.min(score, 100);
  }

  /**
   * Calculate similarity of this argument against existing stored arguments.
   *
   * TODO: Inject a repository, query existing arguments for this bill, and
   *       return the maximum similarity score via this.similarityCalculator.
   *       Example:
   *         const existing = await this.argumentRepo.findByBillId(billId);
   *         const scores = await Promise.all(
   *           existing.map(e =>
   *             this.similarityCalculator.calculateSimilarity(argument.normalizedText, e.normalizedText)
   *           )
   *         );
   *         return Math.max(0, ...scores);
   */
  private async calculateSimilarityToExisting(
    _argument: ExtractedArgument,
    _billId: string,
  ): Promise<number> {
    return Promise.resolve(0.5);
  }
}