// ============================================================================
// TYPO CORRECTION & SYNONYM HANDLING SERVICE
// ============================================================================
// Advanced fuzzy matching, synonym recognition, and multilingual support
// for intelligent query correction and expansion

import { logger } from '@shared/core';

export interface CorrectionResult {
  originalQuery: string;
  correctedQuery: string;
  corrections: Array<{
    original: string;
    corrected: string;
    type: 'typo' | 'synonym' | 'phonetic' | 'contextual';
    confidence: number;
    position: number;
  }>;
  confidence: number;
}

export interface SynonymResult {
  term: string;
  synonyms: Array<{
    term: string;
    type: 'exact' | 'related' | 'broader' | 'narrower';
    language: string;
    confidence: number;
  }>;
}

export class TypoCorrectionService {
  private static instance: TypoCorrectionService;
  private synonymCache = new Map<string, SynonymResult>();
  private correctionCache = new Map<string, CorrectionResult>();

  // Common synonyms by domain
  private static readonly DOMAIN_SYNONYMS: Record<string, Record<string, string[]>> = {
    healthcare: {
      'healthcare': ['medical care', 'health services', 'medical system'],
      'hospital': ['medical center', 'health facility', 'clinic'],
      'doctor': ['physician', 'medical practitioner', 'healthcare provider'],
      'patient': ['medical patient', 'healthcare recipient']
    },
    education: {
      'school': ['educational institution', 'learning center', 'academy'],
      'teacher': ['educator', 'instructor', 'faculty member'],
      'student': ['learner', 'pupil', 'scholar'],
      'university': ['college', 'higher education institution', 'academic institution']
    },
    environment: {
      'climate': ['weather patterns', 'atmospheric conditions'],
      'environment': ['ecosystem', 'natural surroundings', 'habitat'],
      'pollution': ['contamination', 'environmental degradation'],
      'sustainability': ['environmental sustainability', 'eco-friendly practices']
    },
    finance: {
      'budget': ['financial plan', 'fiscal plan', 'expenditure plan'],
      'tax': ['taxation', 'revenue collection', 'fiscal policy'],
      'economy': ['economic system', 'financial system'],
      'investment': ['capital investment', 'financial investment']
    }
  };

  // Common typos and corrections
  private static readonly COMMON_TYPOS: Record<string, string> = {
    'healtcare': 'healthcare',
    'heathcare': 'healthcare',
    'helthcare': 'healthcare',
    'eduction': 'education',
    'enviornment': 'environment',
    'climat': 'climate',
    'chang': 'change',
    'taxs': 'taxes',
    'polciy': 'policy',
    'goverment': 'government',
    'parliment': 'parliament',
    'legistation': 'legislation',
    'amendmant': 'amendment',
    'constituion': 'constitution',
    'electon': 'election',
    'votng': 'voting',
    'infrastructur': 'infrastructure',
    'technlogy': 'technology',
    'developement': 'development',
    'adminstration': 'administration',
    'organzation': 'organization',
    'managment': 'management',
    'comunity': 'community',
    'servic': 'service',
    'program': 'programme',
    'centre': 'center',
    'colour': 'color',
    'realise': 'realize',
    'organise': 'organize'
  };

  // Multilingual synonyms (English base with common translations)
  private static readonly MULTILINGUAL_SYNONYMS: Record<string, Record<string, string[]>> = {
    healthcare: {
      sw: ['afya', 'huduma za afya', 'hospitali'],
      fr: ['soins de santé', 'services médicaux', 'hôpital']
    },
    education: {
      sw: ['elimu', 'shule', 'vyuo vikuu'],
      fr: ['éducation', 'école', 'université']
    },
    government: {
      sw: ['serikali', 'uongozi'],
      fr: ['gouvernement', 'administration']
    },
    development: {
      sw: ['maendeleo', 'ukuzaji'],
      fr: ['développement', 'croissance']
    }
  };

  static getInstance(): TypoCorrectionService {
    if (!TypoCorrectionService.instance) {
      TypoCorrectionService.instance = new TypoCorrectionService();
    }
    return TypoCorrectionService.instance;
  }

  /**
   * Correct typos and spelling errors in a query
   */
  async correctQuery(query: string): Promise<CorrectionResult> {
    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    if (this.correctionCache.has(cacheKey)) {
      return this.correctionCache.get(cacheKey)!;
    }

    const words = query.toLowerCase().split(/\s+/);
    const corrections: CorrectionResult['corrections'] = [];
    let correctedWords = [...words];
    let totalConfidence = 0;
    let correctionCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Skip short words and numbers
      if (!word || word.length < 3 || /^\d+$/.test(word)) continue;

      // Check common typos
      const correction = TypoCorrectionService.COMMON_TYPOS[word];
      if (correction) {
        corrections.push({
          original: word,
          corrected: correction,
          type: 'typo',
          confidence: 0.9,
          position: i
        });
        correctedWords[i] = correction;
        totalConfidence += 0.9;
        correctionCount++;
        continue;
      }

      // Fuzzy matching for similar words
      const fuzzyCorrection = this.findFuzzyMatch(word);
      if (fuzzyCorrection && fuzzyCorrection.confidence > 0.7) {
        corrections.push({
          original: word,
          corrected: fuzzyCorrection.term,
          type: 'typo',
          confidence: fuzzyCorrection.confidence,
          position: i
        });
        correctedWords[i] = fuzzyCorrection.term;
        totalConfidence += fuzzyCorrection.confidence;
        correctionCount++;
        continue;
      }

      // Phonetic matching
      const phoneticCorrection = this.findPhoneticMatch(word);
      if (phoneticCorrection && phoneticCorrection.confidence > 0.6) {
        corrections.push({
          original: word,
          corrected: phoneticCorrection.term,
          type: 'phonetic',
          confidence: phoneticCorrection.confidence,
          position: i
        });
        correctedWords[i] = phoneticCorrection.term;
        totalConfidence += phoneticCorrection.confidence;
        correctionCount++;
      }
    }

    const result: CorrectionResult = {
      originalQuery: query,
      correctedQuery: correctedWords.join(' '),
      corrections,
      confidence: correctionCount > 0 ? totalConfidence / correctionCount : 1.0
    };

    // Cache result
    this.correctionCache.set(cacheKey, result);

    return result;
  }

  /**
   * Find synonyms for a term
   */
  async findSynonyms(term: string, language: string = 'en'): Promise<SynonymResult> {
    const cacheKey = `${term.toLowerCase()}_${language}`;
    if (this.synonymCache.has(cacheKey)) {
      return this.synonymCache.get(cacheKey)!;
    }

    const synonyms: SynonymResult['synonyms'] = [];
    const lowerTerm = term.toLowerCase();

    // Check domain-specific synonyms
    for (const [, domainSynonyms] of Object.entries(TypoCorrectionService.DOMAIN_SYNONYMS)) {
      const termSynonyms = domainSynonyms[lowerTerm];
      if (termSynonyms) {
        termSynonyms.forEach(synonym => {
          synonyms.push({
            term: synonym,
            type: 'related',
            language: 'en',
            confidence: 0.8
          });
        });
      }

      // Check reverse lookup
      for (const [key, values] of Object.entries(domainSynonyms)) {
        if (values.some(v => v.toLowerCase().includes(lowerTerm))) {
          synonyms.push({
            term: key,
            type: 'related',
            language: 'en',
            confidence: 0.7
          });
        }
      }
    }

    // Check multilingual synonyms
    const langSynonyms = TypoCorrectionService.MULTILINGUAL_SYNONYMS[lowerTerm]?.[language];
    if (language !== 'en' && langSynonyms) {
      langSynonyms.forEach(synonym => {
        synonyms.push({
          term: synonym,
          type: 'exact',
          language,
          confidence: 0.9
        });
      });
    }

    // Find related terms through semantic similarity
    const relatedTerms = await this.findSemanticallyRelatedTerms(term);
    synonyms.push(...relatedTerms);

    const result: SynonymResult = {
      term,
      synonyms: synonyms.slice(0, 10) // Limit results
    };

    // Cache result
    this.synonymCache.set(cacheKey, result);

    return result;
  }

  /**
   * Expand query with synonyms and related terms
   */
  async expandQuery(query: string, language: string = 'en'): Promise<string[]> {
    const words = query.toLowerCase().split(/\s+/);
    const expansions = new Set<string>();

    // Add original query
    expansions.add(query);

    for (const word of words) {
      if (word.length < 3) continue;

      const synonyms = await this.findSynonyms(word, language);
      for (const synonym of synonyms.synonyms) {
        if (synonym.confidence > 0.6) {
          // Replace word with synonym
          const expandedQuery = words.map(w => w === word ? synonym.term : w).join(' ');
          expansions.add(expandedQuery);
        }
      }
    }

    return Array.from(expansions).slice(0, 5); // Limit expansions
  }

  /**
   * Find fuzzy matches using Levenshtein distance
   */
  private findFuzzyMatch(word: string): { term: string; confidence: number } | null {
    const candidates = Object.keys(TypoCorrectionService.COMMON_TYPOS);
    let bestMatch: { term: string; confidence: number } | null = null;

    for (const candidate of candidates) {
      const distance = this.levenshteinDistance(word, candidate);
      const maxLength = Math.max(word.length, candidate.length);
      const similarity = 1 - (distance / maxLength);

      if (similarity > 0.8 && (!bestMatch || similarity > bestMatch.confidence)) {
        bestMatch = {
          term: TypoCorrectionService.COMMON_TYPOS[candidate]!,
          confidence: similarity
        };
      }
    }

    return bestMatch;
  }

  /**
   * Find phonetic matches using Soundex-like algorithm
   */
  private findPhoneticMatch(word: string): { term: string; confidence: number } | null {
    const wordCode = this.generateSoundexCode(word);
    const candidates = [...Object.keys(TypoCorrectionService.COMMON_TYPOS), 'healthcare', 'education', 'government', 'infrastructure'];

    for (const candidate of candidates) {
      const candidateCode = this.generateSoundexCode(candidate);
      if (wordCode === candidateCode && word !== candidate) {
        return {
          term: candidate,
          confidence: 0.7
        };
      }
    }

    return null;
  }

  /**
   * Generate Soundex code for phonetic matching
   */
  private generateSoundexCode(word: string): string {
    if (!word) return '0000';

    const phoneticMap: Record<string, string> = {
      'b': '1', 'f': '1', 'p': '1', 'v': '1',
      'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
      'd': '3', 't': '3',
      'l': '4',
      'm': '5', 'n': '5',
      'r': '6',
      'a': '0', 'e': '0', 'i': '0', 'o': '0', 'u': '0', 'y': '0', 'h': '0', 'w': '0'
    };

    const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleaned.length === 0) return '0000';

    let code = cleaned.charAt(0).toUpperCase();
    let prevCode = '';

    for (let i = 1; i < cleaned.length && code.length < 4; i++) {
      const charCode = phoneticMap[cleaned.charAt(i)] || '';
      if (charCode && charCode !== '0' && charCode !== prevCode) {
        code += charCode;
        prevCode = charCode;
      }
    }

    // Pad with zeros
    while (code.length < 4) {
      code += '0';
    }

    return code;
  }

  /**
   * Find semantically related terms
   */
  private async findSemanticallyRelatedTerms(term: string): Promise<SynonymResult['synonyms']> {
    const related: SynonymResult['synonyms'] = [];
    const lowerTerm = term.toLowerCase();

    // Simple semantic expansion based on common patterns
    const semanticMap: Record<string, string[]> = {
      'health': ['medical', 'care', 'wellness', 'treatment'],
      'education': ['learning', 'teaching', 'schooling', 'training'],
      'environment': ['ecology', 'nature', 'conservation', 'sustainability'],
      'economy': ['finance', 'business', 'commerce', 'trade'],
      'technology': ['innovation', 'digital', 'automation', 'computing'],
      'policy': ['regulation', 'law', 'guideline', 'procedure'],
      'development': ['growth', 'progress', 'advancement', 'improvement'],
      'community': ['society', 'public', 'citizens', 'residents']
    };

    for (const [key, values] of Object.entries(semanticMap)) {
      if (lowerTerm.includes(key) || values.some(v => lowerTerm.includes(v))) {
        [...values, key].forEach(relatedTerm => {
          if (relatedTerm !== lowerTerm) {
            related.push({
              term: relatedTerm,
              type: 'related',
              language: 'en',
              confidence: 0.6
            });
          }
        });
      }
    }

    return related.slice(0, 5);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0)) as number[][];

    // Initialize first column and row
    for (let i = 0; i <= len1; i++) {
      matrix[i]![0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0]![j] = j;
    }

    // Fill in the rest of the matrix using dynamic programming
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1, // substitution
            matrix[i]![j - 1]! + 1,     // insertion
            matrix[i - 1]![j]! + 1      // deletion
          );
        }
      }
    }

    return matrix[len1]![len2]!;
  }

  /**
   * Clear caches for memory management
   */
  clearCaches(): void {
    this.synonymCache.clear();
    this.correctionCache.clear();
    logger.info('Typo correction and synonym caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { synonymCacheSize: number; correctionCacheSize: number } {
    return {
      synonymCacheSize: this.synonymCache.size,
      correctionCacheSize: this.correctionCache.size
    };
  }
}

// Export singleton instance
export const typoCorrectionService = TypoCorrectionService.getInstance();