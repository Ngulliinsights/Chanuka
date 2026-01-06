// ============================================================================
// SENTIMENT ANALYZER - ML Model for Public Opinion Analysis
// ============================================================================
// Analyzes public sentiment towards bills, comments, and political content

import { z } from 'zod';

import { TextProcessor, Statistics, Cache } from './shared_utils';

export const SentimentInputSchema = z.object({
  text: z.string().min(1),
  context: z.enum(['bill_comment', 'social_media', 'news_article', 'public_statement', 'parliamentary_debate']),
  language: z.enum(['en', 'sw']).default('en'),
  authorType: z.enum(['citizen', 'expert', 'politician', 'journalist', 'organization']).optional(),
});

export const SentimentOutputSchema = z.object({
  overallSentiment: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
  sentimentScore: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
  emotions: z.object({
    anger: z.number().min(0).max(1),
    fear: z.number().min(0).max(1),
    joy: z.number().min(0).max(1),
    sadness: z.number().min(0).max(1),
    surprise: z.number().min(0).max(1),
    trust: z.number().min(0).max(1),
    disgust: z.number().min(0).max(1),
    anticipation: z.number().min(0).max(1),
  }),
  aspects: z.array(z.object({
    aspect: z.string(),
    sentiment: z.enum(['negative', 'neutral', 'positive']),
    confidence: z.number().min(0).max(1),
    mentions: z.array(z.string()),
  })),
  keyPhrases: z.array(z.object({
    phrase: z.string(),
    sentiment: z.enum(['negative', 'neutral', 'positive']),
    importance: z.number().min(0).max(1),
  })),
  toxicity: z.object({
    isToxic: z.boolean(),
    toxicityScore: z.number().min(0).max(1),
    categories: z.array(z.enum(['hate_speech', 'harassment', 'threat', 'profanity', 'spam'])),
  }),
  politicalLean: z.enum(['left', 'center_left', 'center', 'center_right', 'right', 'neutral']).optional(),
});

export type SentimentInput = z.infer<typeof SentimentInputSchema>;
export type SentimentOutput = z.infer<typeof SentimentOutputSchema>;

interface SentimentLexicon {
  words: string[];
  weight: number;
  intensifiers?: string[];
}

export class SentimentAnalyzer {
  private modelVersion = '2.1.0';
  private cache = new Cache<SentimentOutput>(600); // 10 minute cache

  private readonly SENTIMENT_LEXICONS = {
    positive: {
      words: [
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'brilliant',
        'support', 'agree', 'approve', 'endorse', 'commend', 'praise', 'beneficial',
        'progress', 'improvement', 'success', 'effective', 'efficient', 'valuable',
        'outstanding', 'exceptional', 'remarkable', 'splendid', 'superb', 'impressive',
        'nzuri', 'bora', 'vizuri', 'mzuri', 'kubwa', 'faida', 'maendeleo', 'mafanikio'
      ],
      weight: 1.0,
      intensifiers: ['very', 'extremely', 'highly', 'absolutely', 'completely']
    },
    negative: {
      words: [
        'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'despise',
        'oppose', 'disagree', 'reject', 'condemn', 'criticize', 'harmful', 'dangerous',
        'failure', 'disaster', 'corrupt', 'ineffective', 'wasteful', 'unfair',
        'poor', 'inadequate', 'disappointing', 'unacceptable', 'atrocious',
        'mbaya', 'vibaya', 'hatari', 'kasoro', 'upuuzi', 'rushwa', 'ufisadi'
      ],
      weight: 1.0,
      intensifiers: ['very', 'extremely', 'highly', 'absolutely', 'completely']
    }
  };

  private readonly NEGATION_WORDS = [
    'not', 'no', 'never', 'nothing', 'nobody', 'nowhere', 'neither', 'nor',
    'hardly', 'scarcely', 'barely', 'si', 'hapana', 'kamwe'
  ];

  private readonly EMOTION_KEYWORDS = {
    anger: {
      words: ['angry', 'furious', 'outraged', 'mad', 'irritated', 'enraged', 'livid', 'hasira'],
      intensity: 1.0
    },
    fear: {
      words: ['afraid', 'scared', 'worried', 'anxious', 'terrified', 'frightened', 'alarmed', 'hofu'],
      intensity: 0.9
    },
    joy: {
      words: ['happy', 'joyful', 'excited', 'delighted', 'cheerful', 'thrilled', 'pleased', 'furaha'],
      intensity: 1.0
    },
    sadness: {
      words: ['sad', 'depressed', 'disappointed', 'grief', 'sorrow', 'unhappy', 'miserable', 'huzuni'],
      intensity: 0.9
    },
    surprise: {
      words: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned', 'startled', 'mshangao'],
      intensity: 0.8
    },
    trust: {
      words: ['trust', 'confidence', 'faith', 'believe', 'reliable', 'dependable', 'imani'],
      intensity: 0.8
    },
    disgust: {
      words: ['disgusted', 'revolted', 'sickened', 'appalled', 'repulsed', 'nauseated', 'chuki'],
      intensity: 0.9
    },
    anticipation: {
      words: ['excited', 'eager', 'hopeful', 'expecting', 'anticipating', 'looking forward', 'matarajio'],
      intensity: 0.7
    }
  };

  private readonly POLITICAL_KEYWORDS = {
    left: {
      keywords: ['progressive', 'social justice', 'equality', 'welfare', 'public service', 
                'redistribution', 'labor rights', 'universal healthcare', 'green'],
      weight: 1.0
    },
    right: {
      keywords: ['conservative', 'free market', 'private sector', 'traditional', 'security',
                'deregulation', 'lower taxes', 'individual responsibility', 'business'],
      weight: 1.0
    },
    center: {
      keywords: ['moderate', 'balanced', 'pragmatic', 'compromise', 'bipartisan',
                'centrist', 'middle ground', 'practical'],
      weight: 1.0
    }
  };

  private readonly POLITICAL_ASPECTS = [
    'economy', 'healthcare', 'education', 'security', 'corruption', 'governance',
    'human_rights', 'environment', 'infrastructure', 'taxation', 'employment',
    'justice', 'democracy', 'devolution', 'parliament'
  ];

  private readonly TOXICITY_PATTERNS = {
    hate_speech: ['hate', 'despise', 'loathe', 'inferior', 'subhuman', 'vermin'],
    harassment: ['stupid', 'idiot', 'moron', 'fool', 'dumb', 'incompetent', 'useless'],
    threat: ['kill', 'murder', 'attack', 'destroy', 'eliminate', 'harm', 'violence'],
    profanity: ['damn', 'hell', 'crap'], // Limited list
  };

  async analyze(input: SentimentInput): Promise<SentimentOutput> {
    const validatedInput = SentimentInputSchema.parse(input);
    
    // Check cache
    const cacheKey = this.generateCacheKey(validatedInput);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Preprocess text
    const processedText = TextProcessor.normalize(validatedInput.text);
    const tokens = TextProcessor.tokenize(validatedInput.text);
    
    // Calculate overall sentiment
    const sentimentScore = this.calculateSentimentScore(processedText, tokens);
    const overallSentiment = this.scoreToSentiment(sentimentScore);
    
    // Analyze emotions
    const emotions = this.analyzeEmotions(processedText, tokens);
    
    // Extract aspects and their sentiments
    const aspects = this.extractAspects(processedText, tokens, validatedInput.context);
    
    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(processedText, tokens, sentimentScore);
    
    // Analyze toxicity
    const toxicity = this.analyzeToxicity(processedText, tokens);
    
    // Detect political lean
    const politicalLean = this.detectPoliticalLean(processedText, tokens, validatedInput.context);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(processedText, tokens, aspects, emotions);

    const result = {
      overallSentiment,
      sentimentScore,
      confidence,
      emotions,
      aspects,
      keyPhrases,
      toxicity,
      politicalLean,
    };
    
    this.cache.set(cacheKey, result);
    
    return result;
  }

  private calculateSentimentScore(text: string, tokens: string[]): number {
    let score = 0;
    let wordCount = 0;
    const window = 3; // Negation window
    
    // Create token map with positions
    const tokenPositions = new Map<string, number[]>();
    tokens.forEach((token, idx) => {
      if (!tokenPositions.has(token)) {
        tokenPositions.set(token, []);
      }
      tokenPositions.get(token)!.push(idx);
    });
    
    // Score positive words
    for (const word of this.SENTIMENT_LEXICONS.positive.words) {
      const positions = tokenPositions.get(word) || [];
      for (const pos of positions) {
        let weight = this.SENTIMENT_LEXICONS.positive.weight;
        
        // Check for intensifiers
        if (pos > 0) {
          const prevToken = tokens[pos - 1];
          if (this.SENTIMENT_LEXICONS.positive.intensifiers?.includes(prevToken)) {
            weight *= 1.5;
          }
        }
        
        // Check for negation
        let isNegated = false;
        for (let i = Math.max(0, pos - window); i < pos; i++) {
          if (this.NEGATION_WORDS.includes(tokens[i])) {
            isNegated = true;
            break;
          }
        }
        
        score += isNegated ? -weight * 1.5 : weight;
        wordCount++;
      }
    }
    
    // Score negative words
    for (const word of this.SENTIMENT_LEXICONS.negative.words) {
      const positions = tokenPositions.get(word) || [];
      for (const pos of positions) {
        let weight = this.SENTIMENT_LEXICONS.negative.weight;
        
        // Check for intensifiers
        if (pos > 0) {
          const prevToken = tokens[pos - 1];
          if (this.SENTIMENT_LEXICONS.negative.intensifiers?.includes(prevToken)) {
            weight *= 1.5;
          }
        }
        
        // Check for negation
        let isNegated = false;
        for (let i = Math.max(0, pos - window); i < pos; i++) {
          if (this.NEGATION_WORDS.includes(tokens[i])) {
            isNegated = true;
            break;
          }
        }
        
        score -= isNegated ? -weight * 1.5 : weight;
        wordCount++;
      }
    }
    
    // Normalize score to -1 to 1 range
    if (wordCount === 0) return 0;
    
    // Use tanh for smooth normalization
    return Math.tanh(score / Math.max(wordCount, 5));
  }

  private scoreToSentiment(score: number): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    return 'neutral';
  }

  private analyzeEmotions(text: string, tokens: string[]) {
    const emotions: any = {};
    
    for (const [emotion, { words, intensity }] of Object.entries(this.EMOTION_KEYWORDS)) {
      let score = 0;
      
      for (const word of words) {
        const count = tokens.filter(t => t === word || text.includes(word)).length;
        score += count * intensity;
      }
      
      // Normalize using sigmoid for smoother distribution
      emotions[emotion] = 1 / (1 + Math.exp(-score + 2));
    }

    return emotions;
  }

  private extractAspects(text: string, tokens: string[], context: string) {
    const aspects = [];
    
    for (const aspect of this.POLITICAL_ASPECTS) {
      const aspectKeywords = this.getAspectKeywords(aspect);
      const mentions = [];
      let aspectSentiment = 0;
      let mentionCount = 0;

      for (const keyword of aspectKeywords) {
        const keywordTokens = keyword.split(/\s+/);
        
        if (keywordTokens.length === 1) {
          // Single word keyword
          const count = tokens.filter(t => t === keyword).length;
          if (count > 0) {
            mentions.push(keyword);
            aspectSentiment += this.getContextualSentiment(text, keyword, tokens) * count;
            mentionCount += count;
          }
        } else {
          // Multi-word phrase
          if (text.includes(keyword)) {
            mentions.push(keyword);
            aspectSentiment += this.getContextualSentiment(text, keyword, tokens);
            mentionCount++;
          }
        }
      }

      if (mentions.length > 0) {
        const avgSentiment = mentionCount > 0 ? aspectSentiment / mentionCount : 0;
        aspects.push({
          aspect,
          sentiment: avgSentiment > 0.15 ? 'positive' : avgSentiment < -0.15 ? 'negative' : 'neutral' as const,
          confidence: Math.min(1, mentions.length * 0.25),
          mentions: Array.from(new Set(mentions)).slice(0, 5),
        });
      }
    }

    return aspects;
  }

  private getAspectKeywords(aspect: string): string[] {
    const keywords: Record<string, string[]> = {
      economy: ['economy', 'economic', 'gdp', 'growth', 'inflation', 'uchumi', 'trade', 'market'],
      healthcare: ['health', 'medical', 'hospital', 'doctor', 'medicine', 'afya', 'treatment'],
      education: ['education', 'school', 'university', 'teacher', 'student', 'elimu', 'learning'],
      security: ['security', 'police', 'military', 'safety', 'crime', 'usalama', 'defense'],
      corruption: ['corruption', 'corrupt', 'bribe', 'fraud', 'embezzlement', 'rushwa', 'graft'],
      governance: ['government', 'governance', 'administration', 'policy', 'serikali', 'leadership'],
      human_rights: ['rights', 'freedom', 'liberty', 'justice', 'equality', 'haki', 'fairness'],
      environment: ['environment', 'climate', 'pollution', 'conservation', 'mazingira', 'wildlife'],
      infrastructure: ['infrastructure', 'roads', 'transport', 'electricity', 'miundombinu', 'construction'],
      taxation: ['tax', 'taxation', 'revenue', 'budget', 'fiscal', 'kodi', 'levy'],
      employment: ['employment', 'jobs', 'unemployment', 'work', 'labor', 'ajira', 'workers'],
      justice: ['justice', 'court', 'judge', 'legal', 'law', 'haki'],
      democracy: ['democracy', 'democratic', 'vote', 'election', 'demokrasia'],
      devolution: ['devolution', 'county', 'local government', 'kaunti'],
      parliament: ['parliament', 'bunge', 'mp', 'senator', 'legislature'],
    };

    return keywords[aspect] || [];
  }

  private getContextualSentiment(text: string, keyword: string, tokens: string[]): number {
    const contextWindow = 10; // words before and after
    const keywordIndex = text.indexOf(keyword);
    
    if (keywordIndex === -1) return 0;
    
    // Extract context around keyword
    const start = Math.max(0, keywordIndex - contextWindow * 5);
    const end = Math.min(text.length, keywordIndex + keyword.length + contextWindow * 5);
    const context = text.substring(start, end);
    const contextTokens = TextProcessor.tokenize(context);
    
    return this.calculateSentimentScore(context, contextTokens);
  }

  private extractKeyPhrases(text: string, tokens: string[], overallSentiment: number) {
    const phrases = [];
    const minPhraseLength = 2;
    const maxPhraseLength = 4;
    
    // Extract n-grams
    for (let n = minPhraseLength; n <= maxPhraseLength; n++) {
      const ngrams = TextProcessor.extractNGrams(tokens, n);
      
      for (const ngram of ngrams) {
        if (this.isImportantPhrase(ngram)) {
          const phraseSentiment = this.calculatePhraseSentiment(ngram);
          const importance = this.calculatePhraseImportance(ngram, text, tokens);
          
          phrases.push({
            phrase: ngram,
            sentiment: phraseSentiment > 0.1 ? 'positive' : 
                      phraseSentiment < -0.1 ? 'negative' : 'neutral' as const,
            importance,
          });
        }
      }
    }

    // Sort by importance and return top phrases
    return phrases
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
  }

  private isImportantPhrase(phrase: string): boolean {
    // Filter out phrases that are too common or not meaningful
    const unimportantPatterns = [
      /^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\s/,
      /\s(the|a|an|and|or|but|in|on|at|to|for|of|with|by)$/,
      /^(is|are|was|were|be|been|being)\s/,
    ];

    return phrase.length > 3 && 
           !unimportantPatterns.some(pattern => pattern.test(phrase.toLowerCase()));
  }

  private calculatePhraseSentiment(phrase: string): number {
    const phraseTokens = phrase.split(/\s+/);
    return this.calculateSentimentScore(phrase, phraseTokens);
  }

  private calculatePhraseImportance(phrase: string, fullText: string, allTokens: string[]): number {
    // Frequency
    const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
    const frequency = (fullText.match(regex) || []).length;
    
    // Position (earlier = more important)
    const position = fullText.toLowerCase().indexOf(phrase.toLowerCase()) / fullText.length;
    
    // Length bonus (longer phrases are often more specific)
    const lengthBonus = phrase.split(/\s+/).length / 5;
    
    // TF-IDF-like scoring
    const tfScore = frequency / Math.max(1, allTokens.length / 100);
    
    return Math.min(1, (tfScore * 0.4) + ((1 - position) * 0.3) + (lengthBonus * 0.3));
  }

  private analyzeToxicity(text: string, tokens: string[]) {
    let toxicityScore = 0;
    const categories = new Set<'hate_speech' | 'harassment' | 'threat' | 'profanity' | 'spam'>();

    for (const [category, keywords] of Object.entries(this.TOXICITY_PATTERNS)) {
      for (const keyword of keywords) {
        if (tokens.includes(keyword) || text.includes(keyword)) {
          toxicityScore += 0.2;
          categories.add(category as any);
        }
      }
    }

    // Check for ALL CAPS (shouting)
    const capsWords = tokens.filter(t => t === t.toUpperCase() && t.length > 3);
    if (capsWords.length > tokens.length * 0.3) {
      toxicityScore += 0.1;
    }

    // Check for excessive punctuation
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 5) {
      toxicityScore += 0.1;
    }

    // Spam indicators
    const repetitivePattern = /(.{10,})\1{3,}/;
    if (repetitivePattern.test(text)) {
      toxicityScore += 0.2;
      categories.add('spam');
    }

    return {
      isToxic: toxicityScore > 0.3,
      toxicityScore: Math.min(1, toxicityScore),
      categories: Array.from(categories),
    };
  }

  private detectPoliticalLean(text: string, tokens: string[], context: string): 'left' | 'center_left' | 'center' | 'center_right' | 'right' | 'neutral' | undefined {
    if (context !== 'bill_comment' && context !== 'parliamentary_debate' && context !== 'public_statement') {
      return undefined;
    }

    const scores = { left: 0, right: 0, center: 0 };

    for (const [lean, { keywords, weight }] of Object.entries(this.POLITICAL_KEYWORDS)) {
      for (const keyword of keywords) {
        const keywordTokens = keyword.split(/\s+/);
        
        if (keywordTokens.length === 1) {
          if (tokens.includes(keyword)) {
            scores[lean as keyof typeof scores] += weight;
          }
        } else {
          if (text.includes(keyword)) {
            scores[lean as keyof typeof scores] += weight * 1.5; // Phrases are more significant
          }
        }
      }
    }

    const total = scores.left + scores.right + scores.center;
    if (total === 0) return 'neutral';

    const leftRatio = scores.left / total;
    const rightRatio = scores.right / total;
    const centerRatio = scores.center / total;

    if (centerRatio > 0.5) return 'center';
    if (leftRatio > rightRatio) {
      return leftRatio > 0.7 ? 'left' : 'center_left';
    } else {
      return rightRatio > 0.7 ? 'right' : 'center_right';
    }
  }

  private calculateConfidence(text: string, tokens: string[], aspects: any[], emotions: any): number {
    let confidence = 0.5; // Base confidence

    // Text length factor
    const wordCount = tokens.length;
    confidence += Math.min(0.25, wordCount / 200);

    // Detected aspects boost confidence
    confidence += Math.min(0.15, aspects.length * 0.03);

    // Strong emotions boost confidence
    const maxEmotion = Math.max(...Object.values(emotions) as number[]);
    confidence += maxEmotion * 0.15;

    // Sentiment word density
    const sentimentWordCount = tokens.filter(t => 
      this.SENTIMENT_LEXICONS.positive.words.includes(t) ||
      this.SENTIMENT_LEXICONS.negative.words.includes(t)
    ).length;
    
    const sentimentDensity = sentimentWordCount / Math.max(1, tokens.length);
    confidence += Math.min(0.15, sentimentDensity * 2);

    return Math.min(1.0, confidence);
  }

  private generateCacheKey(input: SentimentInput): string {
    return `${input.text.substring(0, 100)}-${input.context}-${input.language}`;
  }

  getModelInfo() {
    return {
      name: 'Sentiment Analyzer',
      version: this.modelVersion,
      description: 'Advanced sentiment analysis with emotion detection and political lean analysis',
      capabilities: [
        'Sentiment scoring with negation handling',
        'Emotion detection (8 emotions)',
        'Aspect-based sentiment analysis',
        'Key phrase extraction with importance scoring',
        'Toxicity detection',
        'Political lean detection',
        'Multi-language support (English/Swahili)',
        'Performance optimization with caching',
        'Contextual sentiment analysis'
      ]
    };
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();
