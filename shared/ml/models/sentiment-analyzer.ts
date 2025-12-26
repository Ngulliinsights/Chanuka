// ============================================================================
// SENTIMENT ANALYZER - ML Model for Public Opinion Analysis
// ============================================================================
// Analyzes public sentiment towards bills, comments, and political content

import { z } from 'zod';

export const SentimentInputSchema = z.object({
  text: z.string().min(1),
  context: z.enum(['bill_comment', 'social_media', 'news_article', 'public_statement', 'parliamentary_debate']),
  language: z.enum(['en', 'sw']).default('en'), // English or Swahili
  authorType: z.enum(['citizen', 'expert', 'politician', 'journalist', 'organization']).optional(),
});

export const SentimentOutputSchema = z.object({
  overallSentiment: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
  sentimentScore: z.number().min(-1).max(1), // -1 (very negative) to 1 (very positive)
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

export class SentimentAnalyzer {
  private modelVersion = '2.0.0';

  // Sentiment lexicons (simplified)
  private readonly POSITIVE_WORDS = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'brilliant',
    'support', 'agree', 'approve', 'endorse', 'commend', 'praise', 'beneficial',
    'progress', 'improvement', 'success', 'effective', 'efficient', 'valuable',
    // Swahili positive words
    'nzuri', 'bora', 'vizuri', 'mzuri', 'kubwa', 'faida', 'maendeleo'
  ];

  private readonly NEGATIVE_WORDS = [
    'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'despise',
    'oppose', 'disagree', 'reject', 'condemn', 'criticize', 'harmful', 'dangerous',
    'failure', 'disaster', 'corrupt', 'ineffective', 'wasteful', 'unfair',
    // Swahili negative words
    'mbaya', 'vibaya', 'hatari', 'kasoro', 'upuuzi', 'rushwa'
  ];

  // Political keywords for lean detection
  private readonly POLITICAL_KEYWORDS = {
    left: ['progressive', 'social justice', 'equality', 'welfare', 'public service'],
    right: ['conservative', 'free market', 'private sector', 'traditional', 'security'],
    center: ['moderate', 'balanced', 'pragmatic', 'compromise', 'bipartisan'],
  };

  // Aspect categories for political content
  private readonly POLITICAL_ASPECTS = [
    'economy', 'healthcare', 'education', 'security', 'corruption', 'governance',
    'human_rights', 'environment', 'infrastructure', 'taxation', 'employment'
  ];

  async analyze(input: SentimentInput): Promise<SentimentOutput> {
    const validatedInput = SentimentInputSchema.parse(input);
    
    // Preprocess text
    const processedText = this.preprocessText(validatedInput.text, validatedInput.language);
    
    // Calculate overall sentiment
    const sentimentScore = this.calculateSentimentScore(processedText);
    const overallSentiment = this.scoresToSentiment(sentimentScore);
    
    // Analyze emotions
    const emotions = this.analyzeEmotions(processedText);
    
    // Extract aspects and their sentiments
    const aspects = this.extractAspects(processedText, validatedInput.context);
    
    // Extract key phrases
    const keyPhrases = this.extractKeyPhrases(processedText, sentimentScore);
    
    // Analyze toxicity
    const toxicity = this.analyzeToxicity(processedText);
    
    // Detect political lean
    const politicalLean = this.detectPoliticalLean(processedText, validatedInput.context);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(processedText, aspects, emotions);

    return {
      overallSentiment,
      sentimentScore,
      confidence,
      emotions,
      aspects,
      keyPhrases,
      toxicity,
      politicalLean,
    };
  }

  private preprocessText(text: string, language: string): string {
    // Convert to lowercase
    let processed = text.toLowerCase();
    
    // Remove URLs, mentions, hashtags
    processed = processed.replace(/https?:\/\/[^\s]+/g, '');
    processed = processed.replace(/@\w+/g, '');
    processed = processed.replace(/#\w+/g, '');
    
    // Remove extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // Language-specific preprocessing
    if (language === 'sw') {
      // Swahili-specific preprocessing could go here
      processed = this.preprocessSwahili(processed);
    }
    
    return processed;
  }

  private preprocessSwahili(text: string): string {
    // Basic Swahili preprocessing
    // Remove common Swahili stopwords, handle prefixes, etc.
    const swahiliStopwords = ['na', 'ya', 'wa', 'za', 'la', 'kwa', 'ni', 'si'];
    const words = text.split(' ');
    return words.filter(word => !swahiliStopwords.includes(word)).join(' ');
  }

  private calculateSentimentScore(text: string): number {
    const words = text.split(/\s+/);
    let score = 0;
    let wordCount = 0;

    for (const word of words) {
      if (this.POSITIVE_WORDS.includes(word)) {
        score += 1;
        wordCount++;
      } else if (this.NEGATIVE_WORDS.includes(word)) {
        score -= 1;
        wordCount++;
      }
    }

    // Handle negations (simplified)
    const negationPattern = /\b(not|no|never|nothing|nobody|nowhere|neither|nor|hardly|scarcely|barely|si|hapana)\s+(\w+)/g;
    let match;
    while ((match = negationPattern.exec(text)) !== null) {
      const negatedWord = match[2];
      if (this.POSITIVE_WORDS.includes(negatedWord)) {
        score -= 2; // Flip and amplify
      } else if (this.NEGATIVE_WORDS.includes(negatedWord)) {
        score += 2; // Flip and amplify
      }
    }

    // Normalize score
    if (wordCount === 0) return 0;
    return Math.max(-1, Math.min(1, score / Math.max(wordCount, 5)));
  }

  private scoresToSentiment(score: number): 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' {
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    if (score >= 0.6) return 'very_positive';
    if (score >= 0.2) return 'positive';
    return 'neutral';
  }

  private analyzeEmotions(text: string) {
    // Simplified emotion detection based on keywords
    const emotionKeywords = {
      anger: ['angry', 'furious', 'outraged', 'mad', 'irritated', 'hasira'],
      fear: ['afraid', 'scared', 'worried', 'anxious', 'terrified', 'hofu'],
      joy: ['happy', 'joyful', 'excited', 'delighted', 'cheerful', 'furaha'],
      sadness: ['sad', 'depressed', 'disappointed', 'grief', 'sorrow', 'huzuni'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'mshangao'],
      trust: ['trust', 'confidence', 'faith', 'believe', 'reliable', 'imani'],
      disgust: ['disgusted', 'revolted', 'sickened', 'appalled', 'chuki'],
      anticipation: ['excited', 'eager', 'hopeful', 'expecting', 'matarajio'],
    };

    const emotions: any = {};
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      emotions[emotion] = Math.min(1, score * 0.2);
    }

    return emotions;
  }

  private extractAspects(text: string, context: string) {
    const aspects = [];
    
    for (const aspect of this.POLITICAL_ASPECTS) {
      const aspectKeywords = this.getAspectKeywords(aspect);
      let mentions = [];
      let aspectSentiment = 0;
      let mentionCount = 0;

      for (const keyword of aspectKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          mentions.push(...matches);
          
          // Calculate sentiment around this keyword
          const contextSentiment = this.getContextualSentiment(text, keyword);
          aspectSentiment += contextSentiment;
          mentionCount++;
        }
      }

      if (mentions.length > 0) {
        const avgSentiment = mentionCount > 0 ? aspectSentiment / mentionCount : 0;
        aspects.push({
          aspect,
          sentiment: avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral' as const,
          confidence: Math.min(1, mentions.length * 0.3),
          mentions: [...new Set(mentions)], // Remove duplicates
        });
      }
    }

    return aspects;
  }

  private getAspectKeywords(aspect: string): string[] {
    const keywords: Record<string, string[]> = {
      economy: ['economy', 'economic', 'gdp', 'growth', 'inflation', 'uchumi'],
      healthcare: ['health', 'medical', 'hospital', 'doctor', 'medicine', 'afya'],
      education: ['education', 'school', 'university', 'teacher', 'student', 'elimu'],
      security: ['security', 'police', 'military', 'safety', 'crime', 'usalama'],
      corruption: ['corruption', 'corrupt', 'bribe', 'fraud', 'embezzlement', 'rushwa'],
      governance: ['government', 'governance', 'administration', 'policy', 'serikali'],
      human_rights: ['rights', 'freedom', 'liberty', 'justice', 'equality', 'haki'],
      environment: ['environment', 'climate', 'pollution', 'conservation', 'mazingira'],
      infrastructure: ['infrastructure', 'roads', 'transport', 'electricity', 'miundombinu'],
      taxation: ['tax', 'taxation', 'revenue', 'budget', 'fiscal', 'kodi'],
      employment: ['employment', 'jobs', 'unemployment', 'work', 'labor', 'ajira'],
    };

    return keywords[aspect] || [];
  }

  private getContextualSentiment(text: string, keyword: string): number {
    const regex = new RegExp(`(.{0,50})\\b${keyword}\\b(.{0,50})`, 'gi');
    const matches = text.match(regex);
    
    if (!matches) return 0;
    
    let totalSentiment = 0;
    for (const match of matches) {
      totalSentiment += this.calculateSentimentScore(match);
    }
    
    return matches.length > 0 ? totalSentiment / matches.length : 0;
  }

  private extractKeyPhrases(text: string, overallSentiment: number) {
    // Extract noun phrases and important terms
    const phrases = [];
    
    // Simple phrase extraction (2-3 word combinations)
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      if (phrase.length > 5 && this.isImportantPhrase(phrase)) {
        phrases.push({
          phrase,
          sentiment: this.calculateSentimentScore(phrase) > 0 ? 'positive' : 
                   this.calculateSentimentScore(phrase) < 0 ? 'negative' : 'neutral' as const,
          importance: this.calculatePhraseImportance(phrase, text),
        });
      }
    }

    // Sort by importance and return top phrases
    return phrases
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
  }

  private isImportantPhrase(phrase: string): boolean {
    // Filter out common unimportant phrases
    const unimportantPatterns = [
      /^(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\s/,
      /\s(the|a|an|and|or|but|in|on|at|to|for|of|with|by)$/,
    ];

    return !unimportantPatterns.some(pattern => pattern.test(phrase.toLowerCase()));
  }

  private calculatePhraseImportance(phrase: string, fullText: string): number {
    // Calculate importance based on frequency and position
    const frequency = (fullText.match(new RegExp(phrase, 'gi')) || []).length;
    const position = fullText.toLowerCase().indexOf(phrase.toLowerCase()) / fullText.length;
    
    // Earlier phrases and more frequent phrases are more important
    return frequency * 0.7 + (1 - position) * 0.3;
  }

  private analyzeToxicity(text: string) {
    const toxicKeywords = [
      'hate', 'kill', 'die', 'stupid', 'idiot', 'moron', 'fool',
      'threat', 'violence', 'attack', 'destroy', 'eliminate',
      // Add more toxic keywords and Swahili equivalents
    ];

    let toxicityScore = 0;
    const categories = [];

    for (const keyword of toxicKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        toxicityScore += 0.2;
        
        // Categorize toxicity type
        if (['hate', 'despise', 'loathe'].includes(keyword)) {
          categories.push('hate_speech');
        } else if (['threat', 'kill', 'attack'].includes(keyword)) {
          categories.push('threat');
        } else if (['stupid', 'idiot', 'moron'].includes(keyword)) {
          categories.push('harassment');
        }
      }
    }

    return {
      isToxic: toxicityScore > 0.3,
      toxicityScore: Math.min(1, toxicityScore),
      categories: [...new Set(categories)] as Array<'hate_speech' | 'harassment' | 'threat' | 'profanity' | 'spam'>,
    };
  }

  private detectPoliticalLean(text: string, context: string): 'left' | 'center_left' | 'center' | 'center_right' | 'right' | 'neutral' | undefined {
    if (context !== 'bill_comment' && context !== 'parliamentary_debate') {
      return undefined; // Only analyze political lean for political content
    }

    let leftScore = 0;
    let rightScore = 0;
    let centerScore = 0;

    for (const [lean, keywords] of Object.entries(this.POLITICAL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword)) {
          if (lean === 'left') leftScore++;
          else if (lean === 'right') rightScore++;
          else centerScore++;
        }
      }
    }

    const total = leftScore + rightScore + centerScore;
    if (total === 0) return 'neutral';

    const leftRatio = leftScore / total;
    const rightRatio = rightScore / total;
    const centerRatio = centerScore / total;

    if (centerRatio > 0.5) return 'center';
    if (leftRatio > rightRatio) {
      return leftRatio > 0.7 ? 'left' : 'center_left';
    } else {
      return rightRatio > 0.7 ? 'right' : 'center_right';
    }
  }

  private calculateConfidence(text: string, aspects: any[], emotions: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence with text length (more content = more reliable)
    const wordCount = text.split(/\s+/).length;
    confidence += Math.min(0.3, wordCount / 100);

    // Increase confidence with detected aspects
    confidence += Math.min(0.2, aspects.length * 0.05);

    // Increase confidence with strong emotions
    const maxEmotion = Math.max(...Object.values(emotions) as number[]);
    confidence += maxEmotion * 0.2;

    return Math.min(1.0, confidence);
  }

  getModelInfo() {
    return {
      name: 'Sentiment Analyzer',
      version: this.modelVersion,
      description: 'Analyzes sentiment, emotions, and political lean in text content',
      capabilities: [
        'Overall sentiment analysis',
        'Emotion detection',
        'Aspect-based sentiment analysis',
        'Key phrase extraction',
        'Toxicity detection',
        'Political lean detection',
        'Multi-language support (English/Swahili)'
      ]
    };
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();