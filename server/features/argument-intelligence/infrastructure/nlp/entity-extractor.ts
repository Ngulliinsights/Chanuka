// ============================================================================
// ARGUMENT INTELLIGENCE - Entity Extractor
// ============================================================================
// Extracts named entities and domain-specific entities from text

import { logger  } from '@shared/core';

export interface ExtractedEntity {
  text: string;
  type: EntityType;
  confidence: number;
  startIndex: number;
  endIndex: number;
  context: string;
  attributes?: Record<string, unknown>;
}

export type EntityType = 
  | 'PERSON'
  | 'ORGANIZATION' 
  | 'LOCATION'
  | 'STAKEHOLDER'
  | 'POLICY_AREA'
  | 'LEGAL_REFERENCE'
  | 'MONETARY_VALUE'
  | 'PERCENTAGE'
  | 'DATE'
  | 'LEGISLATION'
  | 'GOVERNMENT_BODY'
  | 'TOPIC'
  | 'DEMOGRAPHIC_GROUP';

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  processingTime: number;
  confidence: number;
  extractionMethod: 'rule_based' | 'ml_model' | 'hybrid';
}

export class EntityExtractor {
  private readonly stakeholderPatterns = [
    /\b(farmers?|students?|teachers?|workers?|employees?)\b/gi,
    /\b(small businesses?|entrepreneurs?|smes?)\b/gi,
    /\b(elderly|seniors?|youth|young people)\b/gi,
    /\b(women|men|mothers?|fathers?)\b/gi,
    /\b(disabled|persons? with disabilities)\b/gi,
    /\b(rural communities|urban residents?)\b/gi,
    /\b(taxpayers?|consumers?|patients?|citizens?)\b/gi
  ];

  private readonly organizationPatterns = [
    /\b([A-Z][a-z]+ (?:Association|Organization|Society|Union|Federation|Coalition))\b/g,
    /\b([A-Z][a-z]+ (?:Ltd|Limited|Inc|Corporation|Corp|Company))\b/g,
    /\b(Ministry of [A-Z][a-z ]+)\b/g,
    /\b(Department of [A-Z][a-z ]+)\b/g,
    /\b([A-Z][a-z]+ (?:NGO|Foundation|Trust|Institute))\b/g
  ];

  private readonly locationPatterns = [
    /\b(Nairobi|Mombasa|Kisumu|Nakuru|Eldoret|Thika|Malindi|Kitale|Garissa|Kakamega)\b/gi,
    /\b([A-Z][a-z]+ County)\b/g,
    /\b(Kenya|Uganda|Tanzania|Ethiopia|Somalia|South Sudan)\b/gi
  ];

  private readonly policyAreaPatterns = [
    /\b(healthcare?|health|medical|hospital)\b/gi,
    /\b(education|school|university|learning)\b/gi,
    /\b(agriculture|farming|livestock|crops?)\b/gi,
    /\b(environment|climate|pollution|conservation)\b/gi,
    /\b(security|safety|crime|police)\b/gi,
    /\b(economy|economic|finance|budget|taxation)\b/gi,
    /\b(infrastructure|roads?|transport|water|electricity)\b/gi,
    /\b(employment|jobs?|unemployment|labor)\b/gi,
    /\b(housing|shelter|urban planning)\b/gi,
    /\b(technology|digital|internet|cyber)\b/gi
  ];

  private readonly legalReferencePatterns = [
    /\b(Article \d+(?:\(\d+\))?)\b/g,
    /\b(Section \d+(?:\(\d+\))?)\b/g,
    /\b(Chapter \d+)\b/g,
    /\b(Constitution of Kenya)\b/gi,
    /\b([A-Z][a-z ]+ Act(?:,? \d{4})?)\b/g,
    /\b(Bill No\.? \d+)\b/g
  ];

  private readonly monetaryPatterns = [
    /\b(?:KSh|Ksh|USD|US\$|\$|€|£)\s*[\d,]+(?:\.\d{2})?\b/g,
    /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\s*(?:shillings?|dollars?|euros?|pounds?)\b/gi,
    /\b(?:million|billion|trillion)\s*(?:shillings?|dollars?|KSh|Ksh)\b/gi
  ];

  private readonly percentagePatterns = [
    /\b\d+(?:\.\d+)?%\b/g,
    /\b\d+(?:\.\d+)?\s*percent\b/gi,
    /\b(?:half|quarter|third|two-thirds|three-quarters)\b/gi
  ];

  private readonly datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{4}\b/g // Years
  ];

  private readonly governmentBodyPatterns = [
    /\b(Parliament|National Assembly|Senate)\b/gi,
    /\b(Cabinet|Executive|Presidency)\b/gi,
    /\b(Judiciary|Supreme Court|Court of Appeal|High Court)\b/gi,
    /\b(County Government|County Assembly)\b/gi,
    /\b(IEBC|EACC|CAJ|KNCHR)\b/g // Kenyan institutions
  ];

  constructor() {}

  /**
   * Extract entities from text
   */
  async extractEntities(text: string): Promise<EntityExtractionResult> {
    const startTime = Date.now();
    
    try {
      logger.debug(`Extracting entities from text`, {
        component: 'EntityExtractor',
        textLength: text.length
      });

      const entities: ExtractedEntity[] = [];

      // Extract different types of entities
      entities.push(...this.extractStakeholders(text));
      entities.push(...this.extractOrganizations(text));
      entities.push(...this.extractLocations(text));
      entities.push(...this.extractPolicyAreas(text));
      entities.push(...this.extractLegalReferences(text));
      entities.push(...this.extractMonetaryValues(text));
      entities.push(...this.extractPercentages(text));
      entities.push(...this.extractDates(text));
      entities.push(...this.extractGovernmentBodies(text));

      // Remove overlapping entities
      const filteredEntities = this.removeOverlappingEntities(entities);

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(filteredEntities);

      const result: EntityExtractionResult = {
        entities: filteredEntities,
        processingTime: Date.now() - startTime,
        confidence,
        extractionMethod: 'rule_based'
      };

      logger.debug(`Entity extraction completed`, {
        component: 'EntityExtractor',
        entitiesFound: filteredEntities.length,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      logger.error(`Entity extraction failed`, {
        component: 'EntityExtractor',
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        entities: [],
        processingTime: Date.now() - startTime,
        confidence: 0,
        extractionMethod: 'rule_based'
      };
    }
  }

  /**
   * Extract entities of a specific type
   */
  async extractEntitiesByType(text: string, entityType: EntityType): Promise<ExtractedEntity[]> {
    const result = await this.extractEntities(text);
    return result.entities.filter(entity => entity.type === entityType);
  }

  /**
   * Extract stakeholder groups mentioned in text
   */
  async extractStakeholderGroups(text: string): Promise<string[]> {
    const stakeholders = await this.extractEntitiesByType(text, 'STAKEHOLDER');
    return stakeholders.map(entity => entity.text.toLowerCase());
  }

  // Private extraction methods

  private extractStakeholders(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.stakeholderPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[1] || match[0],
          type: 'STAKEHOLDER',
          confidence: 0.85,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            category: this.categorizeStakeholder(match[1] || match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractOrganizations(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.organizationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[1] || match[0],
          type: 'ORGANIZATION',
          confidence: 0.80,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            orgType: this.categorizeOrganization(match[1] || match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractLocations(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[1] || match[0],
          type: 'LOCATION',
          confidence: 0.90,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            locationType: this.categorizeLocation(match[1] || match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractPolicyAreas(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.policyAreaPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'POLICY_AREA',
          confidence: 0.75,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            domain: this.categorizePolicyArea(match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractLegalReferences(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.legalReferencePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[1] || match[0],
          type: 'LEGAL_REFERENCE',
          confidence: 0.95,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            referenceType: this.categorizeLegalReference(match[1] || match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractMonetaryValues(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.monetaryPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'MONETARY_VALUE',
          confidence: 0.90,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            currency: this.extractCurrency(match[0]),
            amount: this.extractAmount(match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractPercentages(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.percentagePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          type: 'PERCENTAGE',
          confidence: 0.95,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            value: this.extractPercentageValue(match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractDates(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.datePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Skip standalone years that might be false positives
        if (pattern === this.datePatterns[3] && !this.isLikelyYear(match[0])) {
          continue;
        }

        entities.push({
          text: match[0],
          type: 'DATE',
          confidence: 0.80,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            dateType: this.categorizeDateType(match[0])
          }
        });
      }
    });

    return entities;
  }

  private extractGovernmentBodies(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.governmentBodyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[1] || match[0],
          type: 'GOVERNMENT_BODY',
          confidence: 0.90,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
          attributes: {
            branch: this.categorizeGovernmentBranch(match[1] || match[0])
          }
        });
      }
    });

    return entities;
  }

  // Helper methods for categorization

  private categorizeStakeholder(stakeholder: string): string {
    const lower = stakeholder.toLowerCase();
    
    if (lower.includes('farmer') || lower.includes('agriculture')) return 'agricultural';
    if (lower.includes('student') || lower.includes('teacher') || lower.includes('education')) return 'educational';
    if (lower.includes('business') || lower.includes('entrepreneur')) return 'business';
    if (lower.includes('worker') || lower.includes('employee')) return 'labor';
    if (lower.includes('elderly') || lower.includes('youth')) return 'demographic';
    if (lower.includes('women') || lower.includes('men')) return 'gender';
    if (lower.includes('disabled')) return 'disability';
    if (lower.includes('rural') || lower.includes('urban')) return 'geographic';
    
    return 'general';
  }

  private categorizeOrganization(org: string): string {
    const lower = org.toLowerCase();
    
    if (lower.includes('ministry') || lower.includes('department')) return 'government';
    if (lower.includes('ltd') || lower.includes('inc') || lower.includes('corp')) return 'private';
    if (lower.includes('ngo') || lower.includes('foundation') || lower.includes('trust')) return 'nonprofit';
    if (lower.includes('association') || lower.includes('union') || lower.includes('federation')) return 'membership';
    
    return 'unknown';
  }

  private categorizeLocation(location: string): string {
    const lower = location.toLowerCase();
    
    if (lower.includes('county')) return 'county';
    if (['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret'].includes(lower)) return 'major_city';
    if (['kenya', 'uganda', 'tanzania', 'ethiopia', 'somalia'].includes(lower)) return 'country';
    
    return 'city';
  }

  private categorizePolicyArea(area: string): string {
    const lower = area.toLowerCase();
    
    if (lower.includes('health') || lower.includes('medical')) return 'health';
    if (lower.includes('education') || lower.includes('school')) return 'education';
    if (lower.includes('agriculture') || lower.includes('farming')) return 'agriculture';
    if (lower.includes('environment') || lower.includes('climate')) return 'environment';
    if (lower.includes('security') || lower.includes('safety')) return 'security';
    if (lower.includes('economy') || lower.includes('finance')) return 'economic';
    if (lower.includes('infrastructure') || lower.includes('transport')) return 'infrastructure';
    if (lower.includes('employment') || lower.includes('job')) return 'employment';
    if (lower.includes('housing') || lower.includes('urban')) return 'housing';
    if (lower.includes('technology') || lower.includes('digital')) return 'technology';
    
    return 'general';
  }

  private categorizeLegalReference(ref: string): string {
    const lower = ref.toLowerCase();
    
    if (lower.includes('article')) return 'constitutional_article';
    if (lower.includes('section')) return 'section';
    if (lower.includes('chapter')) return 'chapter';
    if (lower.includes('constitution')) return 'constitution';
    if (lower.includes('act')) return 'legislation';
    if (lower.includes('bill')) return 'bill';
    
    return 'legal_document';
  }

  private extractCurrency(monetaryValue: string): string {
    if (monetaryValue.includes('KSh') || monetaryValue.includes('Ksh') || monetaryValue.includes('shilling')) return 'KES';
    if (monetaryValue.includes('USD') || monetaryValue.includes('US$') || monetaryValue.includes('$')) return 'USD';
    if (monetaryValue.includes('€')) return 'EUR';
    if (monetaryValue.includes('£')) return 'GBP';
    
    return 'unknown';
  }

  private extractAmount(monetaryValue: string): number {
    const numberMatch = monetaryValue.match(/[\d,]+(?:\.\d{2})?/);
    if (numberMatch) {
      return parseFloat(numberMatch[0].replace(/,/g, ''));
    }
    return 0;
  }

  private extractPercentageValue(percentage: string): number {
    const numberMatch = percentage.match(/\d+(?:\.\d+)?/);
    if (numberMatch) {
      return parseFloat(numberMatch[0]);
    }
    
    // Handle word-based percentages
    const lower = percentage.toLowerCase();
    if (lower.includes('half')) return 50;
    if (lower.includes('quarter')) return 25;
    if (lower.includes('third')) return 33.33;
    if (lower.includes('two-thirds')) return 66.67;
    if (lower.includes('three-quarters')) return 75;
    
    return 0;
  }

  private isLikelyYear(yearStr: string): boolean {
    const year = parseInt(yearStr);
    const currentYear = new Date().getFullYear();
    
    // Consider years from 1900 to 50 years in the future as likely years
    return year >= 1900 && year <= currentYear + 50;
  }

  private categorizeDateType(date: string): string {
    if (/\d{4}/.test(date) && date.length === 4) return 'year';
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(date)) return 'date_slash';
    if (/\d{1,2}-\d{1,2}-\d{4}/.test(date)) return 'date_dash';
    if (/[A-Za-z]+ \d{1,2},? \d{4}/.test(date)) return 'date_written';
    
    return 'unknown';
  }

  private categorizeGovernmentBranch(body: string): string {
    const lower = body.toLowerCase();
    
    if (lower.includes('parliament') || lower.includes('assembly') || lower.includes('senate')) return 'legislative';
    if (lower.includes('cabinet') || lower.includes('executive') || lower.includes('presidency')) return 'executive';
    if (lower.includes('court') || lower.includes('judiciary')) return 'judicial';
    if (lower.includes('county')) return 'county';
    
    return 'institution';
  }

  private getContext(text: string, startIndex: number, length: number): string {
    const contextLength = 50;
    const start = Math.max(0, startIndex - contextLength);
    const end = Math.min(text.length, startIndex + length + contextLength);
    
    return text.substring(start, end).trim();
  }

  private removeOverlappingEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    // Sort entities by start index
    const sorted = entities.sort((a, b) => a.startIndex - b.startIndex);
    const filtered: ExtractedEntity[] = [];

    for (const entity of sorted) {
      // Check if this entity overlaps with any already accepted entity
      const overlaps = filtered.some(existing => 
        (entity.startIndex >= existing.startIndex && entity.startIndex < existing.endIndex) ||
        (entity.endIndex > existing.startIndex && entity.endIndex <= existing.endIndex) ||
        (entity.startIndex <= existing.startIndex && entity.endIndex >= existing.endIndex)
      );

      if (!overlaps) {
        filtered.push(entity);
      } else {
        // If there's an overlap, keep the entity with higher confidence
        const overlappingIndex = filtered.findIndex(existing =>
          (entity.startIndex >= existing.startIndex && entity.startIndex < existing.endIndex) ||
          (entity.endIndex > existing.startIndex && entity.endIndex <= existing.endIndex) ||
          (entity.startIndex <= existing.startIndex && entity.endIndex >= existing.endIndex)
        );

        if (overlappingIndex !== -1 && entity.confidence > filtered[overlappingIndex].confidence) {
          filtered[overlappingIndex] = entity;
        }
      }
    }

    return filtered;
  }

  private calculateOverallConfidence(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 0;
    
    const totalConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0);
    return totalConfidence / entities.length;
  }

  /**
   * Get entity statistics for analysis
   */
  getEntityStatistics(entities: ExtractedEntity[]): {
    totalEntities: number;
    entitiesByType: Map<EntityType, number>;
    averageConfidence: number;
    confidenceDistribution: { low: number; medium: number; high: number };
  } {
    const entitiesByType = new Map<EntityType, number>();
    let totalConfidence = 0;
    let lowConfidence = 0;
    let mediumConfidence = 0;
    let highConfidence = 0;

    entities.forEach(entity => {
      entitiesByType.set(entity.type, (entitiesByType.get(entity.type) || 0) + 1);
      totalConfidence += entity.confidence;

      if (entity.confidence < 0.6) lowConfidence++;
      else if (entity.confidence < 0.8) mediumConfidence++;
      else highConfidence++;
    });

    return {
      totalEntities: entities.length,
      entitiesByType,
      averageConfidence: entities.length > 0 ? totalConfidence / entities.length : 0,
      confidenceDistribution: {
        low: lowConfidence,
        medium: mediumConfidence,
        high: highConfidence
      }
    };
  }
}


