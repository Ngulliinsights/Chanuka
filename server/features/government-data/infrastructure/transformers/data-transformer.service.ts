/**
 * Government Data Transformation Service
 * Handles data transformation between external sources and internal format
 */

import { logger } from '@server/infrastructure/observability';
import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { GovernmentDataCreateInput } from '../../domain/repositories/government-data.repository';

// ==========================================================================
// Types
// ==========================================================================

export interface ExternalDataSource {
  id: string;
  name: string;
  type: string;
  format: 'json' | 'xml' | 'csv' | 'html';
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface TransformationRule {
  sourceField: string;
  targetField: string;
  transformer?: (value: any) => any;
  required?: boolean;
  defaultValue?: any;
}

export interface TransformationConfig {
  source: ExternalDataSource;
  rules: TransformationRule[];
  contentExtractor?: (data: any) => any;
  metadataExtractor?: (data: any) => any;
}

// ==========================================================================
// Data Transformer Service
// ==========================================================================

export class DataTransformerService {
  private transformationConfigs: Map<string, TransformationConfig> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Register a transformation configuration for a data source
   */
  registerTransformation(sourceId: string, config: TransformationConfig): void {
    this.transformationConfigs.set(sourceId, config);
    logger.info({ sourceId, sourceName: config.source.name }, 'Registered transformation config');
  }

  /**
   * Transform external data to internal format
   */
  async transformData(
    sourceId: string, 
    externalData: any[]
  ): AsyncServiceResult<GovernmentDataCreateInput[]> {
    return safeAsync(async () => {
      const logContext = { 
        component: 'DataTransformerService', 
        operation: 'transformData',
        sourceId,
        recordCount: externalData.length
      };
      logger.info(logContext, 'Transforming external data');

      const config = this.transformationConfigs.get(sourceId);
      if (!config) {
        throw new Error(`No transformation config found for source: ${sourceId}`);
      }

      const transformedData: GovernmentDataCreateInput[] = [];

      for (const record of externalData) {
        try {
          const transformed = await this.transformRecord(record, config);
          transformedData.push(transformed);
        } catch (error) {
          logger.warn({ 
            sourceId, 
            record: JSON.stringify(record).substring(0, 200),
            error: error instanceof Error ? error.message : 'Unknown error'
          }, 'Failed to transform record, skipping');
        }
      }

      logger.info({ 
        sourceId, 
        originalCount: externalData.length,
        transformedCount: transformedData.length
      }, 'Data transformation completed');

      return transformedData;
    }, { 
      service: 'DataTransformerService', 
      operation: 'transformData',
      context: { sourceId, recordCount: externalData.length }
    });
  }

  /**
   * Transform a single record
   */
  private async transformRecord(
    record: any, 
    config: TransformationConfig
  ): Promise<GovernmentDataCreateInput> {
    const transformed: Partial<GovernmentDataCreateInput> = {
      source: config.source.id,
    };

    // Apply transformation rules
    for (const rule of config.rules) {
      const sourceValue = this.getNestedValue(record, rule.sourceField);
      
      if (sourceValue === undefined || sourceValue === null) {
        if (rule.required) {
          throw new Error(`Required field ${rule.sourceField} is missing`);
        }
        if (rule.defaultValue !== undefined) {
          this.setNestedValue(transformed, rule.targetField, rule.defaultValue);
        }
        continue;
      }

      let transformedValue = sourceValue;
      if (rule.transformer) {
        transformedValue = rule.transformer(sourceValue);
      }

      this.setNestedValue(transformed, rule.targetField, transformedValue);
    }

    // Extract content
    if (config.contentExtractor) {
      transformed.content = config.contentExtractor(record);
    } else {
      transformed.content = record;
    }

    // Extract metadata
    if (config.metadataExtractor) {
      transformed.metadata = config.metadataExtractor(record);
    }

    // Validate required fields
    if (!transformed.data_type) {
      throw new Error('data_type is required');
    }

    return transformed as GovernmentDataCreateInput;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Initialize default transformation configurations
   */
  private initializeDefaultConfigs(): void {
    // Parliament of Kenya Bills
    this.registerTransformation('parliament-kenya-bills', {
      source: {
        id: 'parliament-kenya',
        name: 'Parliament of Kenya',
        type: 'bills',
        format: 'json'
      },
      rules: [
        {
          sourceField: 'bill_number',
          targetField: 'external_id',
          required: true
        },
        {
          sourceField: 'title',
          targetField: 'title',
          required: true
        },
        {
          sourceField: 'type',
          targetField: 'data_type',
          transformer: (value: string) => value.toLowerCase().replace(/\s+/g, '_'),
          defaultValue: 'bill'
        },
        {
          sourceField: 'status',
          targetField: 'status',
          transformer: (value: string) => value.toLowerCase().replace(/\s+/g, '_'),
          defaultValue: 'active'
        },
        {
          sourceField: 'publication_date',
          targetField: 'published_date',
          transformer: (value: string) => new Date(value)
        },
        {
          sourceField: 'effective_date',
          targetField: 'effective_date',
          transformer: (value: string) => new Date(value)
        }
      ],
      contentExtractor: (data: any) => ({
        summary: data.summary,
        full_text: data.full_text,
        sponsor: data.sponsor,
        committee: data.committee,
        amendments: data.amendments || []
      }),
      metadataExtractor: (data: any) => ({
        house: data.originating_house,
        bill_type: data.bill_type,
        reading_stage: data.reading_stage,
        committee_stage: data.committee_stage,
        voting_records: data.voting_records || []
      })
    });

    // Kenya Law Reports
    this.registerTransformation('kenya-law-reports', {
      source: {
        id: 'kenya-law',
        name: 'Kenya Law Reports',
        type: 'legal_documents',
        format: 'json'
      },
      rules: [
        {
          sourceField: 'document_id',
          targetField: 'external_id',
          required: true
        },
        {
          sourceField: 'title',
          targetField: 'title',
          required: true
        },
        {
          sourceField: 'document_type',
          targetField: 'data_type',
          transformer: (value: string) => value.toLowerCase().replace(/\s+/g, '_'),
          defaultValue: 'legal_document'
        },
        {
          sourceField: 'status',
          targetField: 'status',
          defaultValue: 'active'
        },
        {
          sourceField: 'published_date',
          targetField: 'published_date',
          transformer: (value: string) => new Date(value)
        }
      ],
      contentExtractor: (data: any) => ({
        content: data.content,
        summary: data.summary,
        keywords: data.keywords || []
      }),
      metadataExtractor: (data: any) => ({
        court: data.court,
        judges: data.judges || [],
        case_number: data.case_number,
        citation: data.citation,
        subject_areas: data.subject_areas || []
      })
    });

    // Mzalendo Trust Data
    this.registerTransformation('mzalendo-data', {
      source: {
        id: 'mzalendo',
        name: 'Mzalendo Trust',
        type: 'parliamentary_data',
        format: 'json'
      },
      rules: [
        {
          sourceField: 'id',
          targetField: 'external_id',
          required: true
        },
        {
          sourceField: 'title',
          targetField: 'title',
          required: true
        },
        {
          sourceField: 'type',
          targetField: 'data_type',
          transformer: (value: string) => value.toLowerCase().replace(/\s+/g, '_'),
          defaultValue: 'parliamentary_record'
        },
        {
          sourceField: 'date',
          targetField: 'published_date',
          transformer: (value: string) => new Date(value)
        }
      ],
      contentExtractor: (data: any) => ({
        content: data.content,
        hansard_reference: data.hansard_reference,
        speakers: data.speakers || []
      }),
      metadataExtractor: (data: any) => ({
        session: data.session,
        sitting_date: data.sitting_date,
        house: data.house,
        agenda_items: data.agenda_items || []
      })
    });

    logger.info({ configCount: this.transformationConfigs.size }, 'Initialized default transformation configs');
  }

  /**
   * Get available transformation configurations
   */
  getAvailableTransformations(): Array<{ sourceId: string; sourceName: string; type: string }> {
    return Array.from(this.transformationConfigs.entries()).map(([sourceId, config]) => ({
      sourceId,
      sourceName: config.source.name,
      type: config.source.type
    }));
  }

  /**
   * Validate transformation configuration
   */
  validateTransformationConfig(config: TransformationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.source.id) {
      errors.push('Source ID is required');
    }

    if (!config.source.name) {
      errors.push('Source name is required');
    }

    if (!config.rules || config.rules.length === 0) {
      errors.push('At least one transformation rule is required');
    }

    // Check for required data_type rule
    const hasDataTypeRule = config.rules.some(rule => 
      rule.targetField === 'data_type' && (rule.defaultValue || !rule.required)
    );
    if (!hasDataTypeRule) {
      errors.push('data_type transformation rule is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const dataTransformerService = new DataTransformerService();