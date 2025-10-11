import { apiRequest } from '../utils/api';
import { cache } from '../utils/cache';
import { logger } from '../utils/metrics';

interface VerificationRule {
  id: string;
  name: string;
  description: string;
  entityType: 'bill' | 'stakeholder' | 'committee' | 'vote' | 'amendment';
  requiredFields: string[];
  conditionalChecks?: Array<{
    condition: string;
    fields: string[];
  }>;
  dataSourcePriority?: string[];
  minimumCompleteness: number; // 0-100 percentage
}

interface VerificationResult {
  entityId: string;
  entityType: string;
  overallCompleteness: number; // 0-100 percentage
  missingFields: string[];
  incompleteFields: Array<{
    field: string;
    completeness: number;
    issues: string[];
  }>;
  dataSources: Array<{
    name: string;
    fieldsProvided: string[];
    reliability: number; // 0-100 percentage
  }>;
  verifiedAt: string;
  recommendations: Array<{
    field: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
    potentialSources: string[];
  }>;
}

/**
 * Data Completeness Verification Service
 *
 * Provides functionality to verify the completeness of legislative data:
 * - Identifies missing or incomplete data fields
 * - Evaluates data quality and reliability
 * - Generates recommendations for improving data completeness
 * - Tracks verification history and improvements over time
 */
export class DataCompletenessService {
  private verificationRules: VerificationRule[] = [
    {
      id: 'bill-basic-info',
      name: 'Bill Basic Information',
      description: 'Verifies essential information about a bill is present',
      entityType: 'bill',
      requiredFields: [
        'title',
        'billNumber',
        'status',
        'introducedDate',
        'summary',
        'primarySponsor',
      ],
      minimumCompleteness: 90,
    },
    {
      id: 'bill-content',
      name: 'Bill Content Verification',
      description: 'Verifies the bill text and related content is complete',
      entityType: 'bill',
      requiredFields: ['fullText', 'sections', 'amendments'],
      conditionalChecks: [
        {
          condition: 'status !== "draft"',
          fields: ['officialPdf', 'legalReferences'],
        },
      ],
      minimumCompleteness: 85,
    },
    {
      id: 'stakeholder-info',
      name: 'Stakeholder Information',
      description: 'Verifies stakeholder data is complete',
      entityType: 'stakeholder',
      requiredFields: ['name', 'type', 'position', 'influence', 'contactInformation'],
      minimumCompleteness: 80,
    },
    {
      id: 'committee-info',
      name: 'Committee Information',
      description: 'Verifies committee data is complete',
      entityType: 'committee',
      requiredFields: ['name', 'jurisdiction', 'members', 'chairperson', 'meetingSchedule'],
      minimumCompleteness: 85,
    },
    {
      id: 'vote-record',
      name: 'Vote Record Verification',
      description: 'Verifies voting record data is complete',
      entityType: 'vote',
      requiredFields: [
        'date',
        'billId',
        'chamber',
        'voteType',
        'result',
        'votesFor',
        'votesAgainst',
        'abstentions',
      ],
      minimumCompleteness: 95,
    },
    {
      id: 'amendment-info',
      name: 'Amendment Information',
      description: 'Verifies amendment data is complete',
      entityType: 'amendment',
      requiredFields: [
        'amendmentId',
        'billId',
        'proposedBy',
        'dateProposed',
        'status',
        'text',
        'changeDescription',
      ],
      minimumCompleteness: 90,
    },
  ];

  /**
   * Verifies the completeness of a specific entity
   */
  async verifyEntity(entityType: string, entityId: string): Promise<VerificationResult> {
    // Get applicable rules for this entity type
    const rules = this.verificationRules.filter(rule => rule.entityType === entityType);

    if (rules.length === 0) {
      throw new Error(`No verification rules defined for entity type: ${entityType}`);
    }

    // Fetch entity data
    const entityData = await this.fetchEntityData(entityType, entityId);
    if (!entityData) {
      throw new Error(`Entity not found: ${entityType} ${entityId}`);
    }

    // Fetch data sources information
    const dataSources = await this.fetchDataSources(entityType, entityId);

    // Initialize verification result
    const result: VerificationResult = {
      entityId,
      entityType,
      overallCompleteness: 0,
      missingFields: [],
      incompleteFields: [],
      dataSources,
      verifiedAt: new Date().toISOString(),
      recommendations: [],
    };

    // Apply all applicable rules
    let totalFields = 0;
    let completeFields = 0;

    for (const rule of rules) {
      // Check required fields
      for (const field of rule.requiredFields) {
        totalFields++;

        if (
          !(field in entityData) ||
          entityData[field] === null ||
          entityData[field] === undefined
        ) {
          // Field is completely missing
          result.missingFields.push(field);

          // Generate recommendation
          result.recommendations.push({
            field,
            action: 'Collect missing data',
            priority: this.determinePriority(field, rule),
            potentialSources: this.suggestDataSources(field, entityType),
          });
        } else if (this.isFieldIncomplete(field, entityData[field])) {
          // Field exists but is incomplete
          const completeness = this.calculateFieldCompleteness(field, entityData[field]);
          completeFields += completeness / 100;

          result.incompleteFields.push({
            field,
            completeness,
            issues: this.identifyFieldIssues(field, entityData[field]),
          });

          // Generate recommendation if completeness is below threshold
          if (completeness < 70) {
            result.recommendations.push({
              field,
              action: 'Enhance existing data',
              priority: completeness < 40 ? 'high' : 'medium',
              potentialSources: this.suggestDataSources(field, entityType),
            });
          }
        } else {
          // Field is complete
          completeFields++;
        }
      }

      // Check conditional fields if applicable
      if (rule.conditionalChecks) {
        for (const check of rule.conditionalChecks) {
          // Evaluate the condition
          if (this.evaluateCondition(check.condition, entityData)) {
            // Condition is true, check these fields too
            for (const field of check.fields) {
              totalFields++;

              if (
                !(field in entityData) ||
                entityData[field] === null ||
                entityData[field] === undefined
              ) {
                result.missingFields.push(field);

                result.recommendations.push({
                  field,
                  action: 'Collect conditional data',
                  priority: this.determinePriority(field, rule),
                  potentialSources: this.suggestDataSources(field, entityType),
                });
              } else if (this.isFieldIncomplete(field, entityData[field])) {
                const completeness = this.calculateFieldCompleteness(field, entityData[field]);
                completeFields += completeness / 100;

                result.incompleteFields.push({
                  field,
                  completeness,
                  issues: this.identifyFieldIssues(field, entityData[field]),
                });

                if (completeness < 70) {
                  result.recommendations.push({
                    field,
                    action: 'Enhance conditional data',
                    priority: completeness < 40 ? 'high' : 'medium',
                    potentialSources: this.suggestDataSources(field, entityType),
                  });
                }
              } else {
                completeFields++;
              }
            }
          }
        }
      }
    }

    // Calculate overall completeness
    result.overallCompleteness =
      totalFields > 0 ? Math.round((completeFields / totalFields) * 100) : 0;

    // Store verification result
    await this.storeVerificationResult(result);

    return result;
  }

  /**
   * Fetches entity data from the appropriate source
   */
  private async fetchEntityData(entityType: string, entityId: string): Promise<any> {
    // Define API endpoints for different entity types
    const endpoints: Record<string, string> = {
      bill: `/api/bills/${entityId}`,
      stakeholder: `/api/stakeholders/${entityId}`,
      committee: `/api/committees/${entityId}`,
      vote: `/api/votes/${entityId}`,
      amendment: `/api/amendments/${entityId}`,
    };

    const endpoint = endpoints[entityType];
    if (!endpoint) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    try {
      // Check cache first
      const cachedData = await cache.get(`entity:${entityType}:${entityId}`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Fetch from API
      const response = await apiRequest('GET', endpoint);
      const data = await response.json();

      // Cache the result
      await cache.set(`entity:${entityType}:${entityId}`, JSON.stringify(data), 3600); // 1 hour

      return data;
    } catch (error) {
      logger.error('Failed to fetch entity data', { entityType, entityId, error });
      return null;
    }
  }

  /**
   * Fetches information about data sources for this entity
   */
  private async fetchDataSources(
    entityType: string,
    entityId: string,
  ): Promise<VerificationResult['dataSources']> {
    try {
      const response = await apiRequest('GET', `/api/data-sources/${entityType}/${entityId}`);
      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch data sources', { entityType, entityId, error });
      return [];
    }
  }

  /**
   * Determines if a field is incomplete based on its type and value
   */
  private isFieldIncomplete(field: string, value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }

    if (Array.isArray(value) && value.length === 0) {
      return true;
    }

    // Field-specific checks
    switch (field) {
      case 'summary':
      case 'fullText':
        return typeof value === 'string' && value.length < 100;

      case 'sections':
        return (
          Array.isArray(value) &&
          value.some(section => !section.title || !section.content || section.content.length < 50)
        );

      case 'amendments':
        return (
          Array.isArray(value) &&
          value.some(amendment => !amendment.text || !amendment.changeDescription)
        );

      case 'stakeholders':
        return (
          Array.isArray(value) &&
          value.some(stakeholder => !stakeholder.name || !stakeholder.position)
        );

      case 'votes':
        return (
          Array.isArray(value) &&
          value.some(
            vote => !vote.date || vote.votesFor === undefined || vote.votesAgainst === undefined,
          )
        );

      default:
        return false;
    }
  }

  /**
   * Calculates completeness percentage for a specific field
   */
  private calculateFieldCompleteness(field: string, value: any): number {
    if (value === null || value === undefined) {
      return 0;
    }

    // Field-specific completeness calculations
    switch (field) {
      case 'summary':
        if (typeof value !== 'string') return 0;
        // Longer summaries are considered more complete up to a point
        return Math.min(100, Math.max(0, (value.length / 500) * 100));

      case 'fullText':
        if (typeof value !== 'string') return 0;
        // Longer texts are considered more complete up to a point
        return Math.min(100, Math.max(0, (value.length / 5000) * 100));

      case 'sections':
        if (!Array.isArray(value) || value.length === 0) return 0;
        // Calculate average completeness of all sections
        const sectionCompleteness = value.map(section => {
          if (!section.title || !section.content) return 0;
          return Math.min(100, Math.max(0, (section.content.length / 1000) * 100));
        });
        return sectionCompleteness.reduce((sum, val) => sum + val, 0) / sectionCompleteness.length;

      case 'stakeholders':
        if (!Array.isArray(value) || value.length === 0) return 0;
        // Calculate average completeness of stakeholder records
        const stakeholderFields = ['name', 'type', 'position', 'influence', 'contactInformation'];
        const stakeholderCompleteness = value.map(stakeholder => {
          const fieldsPresent = stakeholderFields.filter(
            field => stakeholder[field] !== undefined && stakeholder[field] !== null,
          ).length;
          return (fieldsPresent / stakeholderFields.length) * 100;
        });
        return (
          stakeholderCompleteness.reduce((sum, val) => sum + val, 0) /
          stakeholderCompleteness.length
        );

      // Add more field-specific calculations as needed

      default:
        // For simple fields, just check if they exist
        return value !== undefined && value !== null && value !== '' ? 100 : 0;
    }
  }

  /**
   * Identifies specific issues with a field's data
   */
  private identifyFieldIssues(field: string, value: any): string[] {
    const issues: string[] = [];

    if (value === null || value === undefined) {
      issues.push('Field is null or undefined');
      return issues;
    }

    // Field-specific issue identification
    switch (field) {
      case 'title':
        if (typeof value !== 'string') {
          issues.push('Title is not a string');
        } else {
          if (value.length < 10) issues.push('Title is too short');
          if (value.length > 300) issues.push('Title is unusually long');
          if (!/[A-Z]/.test(value[0])) issues.push('Title should start with a capital letter');
        }
        break;

      case 'summary':
        if (typeof value !== 'string') {
          issues.push('Summary is not a string');
        } else {
          if (value.length < 50) issues.push('Summary is too short');
          if (value.length > 2000) issues.push('Summary is unusually long');
          if (!/[A-Z]/.test(value[0])) issues.push('Summary should start with a capital letter');
          if (!value.endsWith('.') && !value.endsWith('!') && !value.endsWith('?')) {
            issues.push('Summary should end with proper punctuation');
          }
        }
        break;

      case 'introducedDate':
        try {
          const date = new Date(value);
          const now = new Date();
          if (isNaN(date.getTime())) {
            issues.push('Invalid date format');
          } else if (date > now) {
            issues.push('Future date detected');
          } else if (date.getFullYear() < 2000) {
            issues.push('Date seems too old');
          }
        } catch (e) {
          issues.push('Invalid date format');
        }
        break;

      case 'sections':
        if (!Array.isArray(value)) {
          issues.push('Sections is not an array');
        } else {
          if (value.length === 0) {
            issues.push('No sections defined');
          } else {
            const sectionIssues = value.flatMap((section, index) => {
              const secIssues: string[] = [];
              if (!section.title) secIssues.push(`Section ${index + 1} missing title`);
              if (!section.content) secIssues.push(`Section ${index + 1} missing content`);
              else if (section.content.length < 50)
                secIssues.push(`Section ${index + 1} content too short`);
              return secIssues;
            });
            issues.push(...sectionIssues);
          }
        }
        break;

      // Add more field-specific validations as needed
    }

    return issues;
  }

  /**
   * Evaluates a condition string against entity data
   */
  private evaluateCondition(condition: string, data: any): boolean {
    try {
      // Create a safe evaluation context with only the data
      const context = { ...data };

      // Use Function constructor to create a function that evaluates the condition
      // This is safer than eval() but still requires careful validation of condition strings
      const conditionFn = new Function(...Object.keys(context), `return ${condition};`);

      return conditionFn(...Object.values(context));
    } catch (error) {
      logger.error('Failed to evaluate condition', { condition, error });
      return false;
    }
  }

  /**
   * Determines priority of a missing field
   */
  private determinePriority(field: string, rule: VerificationRule): 'low' | 'medium' | 'high' {
    // High priority for fields in rules with high minimum completeness
    if (rule.minimumCompleteness >= 90) {
      return 'high';
    }

    // Field-specific priority assignments
    const highPriorityFields = [
      'title',
      'billNumber',
      'status',
      'fullText',
      'votesFor',
      'votesAgainst',
    ];
    const mediumPriorityFields = ['summary', 'introducedDate', 'primarySponsor', 'amendments'];

    if (highPriorityFields.includes(field)) {
      return 'high';
    }

    if (mediumPriorityFields.includes(field)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Suggests potential data sources for a specific field
   */
  private suggestDataSources(field: string, entityType: string): string[] {
    // Field-specific source suggestions
    const fieldSources: Record<string, string[]> = {
      title: ['Official Government Gazette', 'Parliament Website', 'Legislative Database'],
      billNumber: ['Official Government Gazette', 'Parliament Website', 'Legislative Database'],
      status: ['Parliament Website', 'Legislative Tracking System', 'Government Bulletin'],
      introducedDate: ['Parliament Website', 'Legislative Calendar', 'Government Gazette'],
      summary: ['Parliament Website', 'Legislative Digest', 'Committee Reports'],
      fullText: ['Official Government Gazette', 'Parliament Website', 'National Archives'],
      amendments: ['Committee Records', 'Parliament Website', 'Legislative Database'],
      stakeholders: ['Committee Hearings', 'Public Submissions', 'Lobbying Registry'],
      votes: ['Parliamentary Voting Records', 'Hansard', 'Committee Minutes'],
      legalReferences: ['Legal Databases', 'Law Library', 'Judiciary Records'],
    };

    // Entity-specific source suggestions
    const entitySources: Record<string, string[]> = {
      bill: ['Parliament Website', 'Government Gazette', 'Legislative Database'],
      stakeholder: ['Lobbying Registry', 'Organization Websites', 'Public Submissions'],
      committee: ['Parliament Website', 'Committee Records', 'Government Directory'],
      vote: ['Parliamentary Voting Records', 'Hansard', 'Parliament Website'],
      amendment: ['Committee Records', 'Parliament Website', 'Legislative Database'],
    };

    // Combine field-specific and entity-specific sources
    const fieldSpecificSources = fieldSources[field] || [];
    const entitySpecificSources = entitySources[entityType] || [];

    // Combine and deduplicate
    return [...new Set([...fieldSpecificSources, ...entitySpecificSources])];
  }

  /**
   * Stores verification result for historical tracking
   */
  private async storeVerificationResult(result: VerificationResult): Promise<void> {
    try {
      await apiRequest('POST', '/internal/verification-results', result);
      logger.info('Stored verification result', {
        entityType: result.entityType,
        entityId: result.entityId,
        completeness: result.overallCompleteness,
      });
    } catch (error) {
      logger.error('Failed to store verification result', {
        entityType: result.entityType,
        entityId: result.entityId,
        error,
      });
    }
  }

  /**
   * Verifies multiple entities of the same type
   */
  async verifyMultipleEntities(
    entityType: string,
    entityIds: string[],
  ): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    for (const entityId of entityIds) {
      try {
        const result = await this.verifyEntity(entityType, entityId);
        results.push(result);
      } catch (error) {
        logger.error('Failed to verify entity', { entityType, entityId, error });
      }
    }

    return results;
  }

  /**
   * Generates a data completeness report for a collection of entities
   */
  async generateCompletenessReport(entityType: string): Promise<any> {
    try {
      // Fetch all entities of this type
      const response = await apiRequest('GET', `/api/${entityType}s`);
      const entities = await response.json();

      // Verify each entity
      const entityIds = entities.map((entity: any) => entity.id);
      const verificationResults = await this.verifyMultipleEntities(entityType, entityIds);

      // Calculate overall statistics
      const totalEntities = verificationResults.length;
      const averageCompleteness =
        totalEntities > 0
          ? verificationResults.reduce((sum, result) => sum + result.overallCompleteness, 0) /
            totalEntities
          : 0;

      const completeEntities = verificationResults.filter(
        result => result.overallCompleteness >= 90,
      ).length;
      const partialEntities = verificationResults.filter(
        result => result.overallCompleteness >= 50 && result.overallCompleteness < 90,
      ).length;
      const incompleteEntities = verificationResults.filter(
        result => result.overallCompleteness < 50,
      ).length;

      // Identify common missing fields
      const allMissingFields = verificationResults.flatMap(result => result.missingFields);
      const missingFieldCounts: Record<string, number> = {};

      allMissingFields.forEach(field => {
        missingFieldCounts[field] = (missingFieldCounts[field] || 0) + 1;
      });

      const commonMissingFields = Object.entries(missingFieldCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([field, count]) => ({ field, count, percentage: (count / totalEntities) * 100 }));

      // Generate report
      return {
        entityType,
        totalEntities,
        averageCompleteness,
        completeEntities,
        partialEntities,
        incompleteEntities,
        commonMissingFields: commonMissingFields.slice(0, 10), // Top 10 missing fields
        generatedAt: new Date().toISOString(),
        recommendations: this.generateReportRecommendations(commonMissingFields, entityType),
      };
    } catch (error) {
      logger.error('Failed to generate completeness report', { entityType, error });
      throw error;
    }
  }

  /**
   * Generates recommendations based on report findings
   */
  private generateReportRecommendations(
    commonMissingFields: Array<{ field: string; count: number; percentage: number }>,
    entityType: string,
  ): any[] {
    const recommendations = [];

    // Recommend actions for common missing fields
    for (const { field, percentage } of commonMissingFields) {
      if (percentage >= 50) {
        // High priority if missing in more than 50% of entities
        recommendations.push({
          action: `Implement systematic data collection for "${field}"`,
          priority: 'high',
          rationale: `Missing in ${Math.round(percentage)}% of ${entityType} records`,
          potentialSources: this.suggestDataSources(field, entityType),
        });
      } else if (percentage >= 20) {
        // Medium priority if missing in 20-50% of entities
        recommendations.push({
          action: `Enhance data collection for "${field}"`,
          priority: 'medium',
          rationale: `Missing in ${Math.round(percentage)}% of ${entityType} records`,
          potentialSources: this.suggestDataSources(field, entityType),
        });
      }
    }

    return recommendations;
  }

  /**
   * Schedules regular verification of entities
   */
  scheduleRegularVerification(intervalHours = 24): void {
    // This would typically be implemented with a job scheduler
    // For now, we'll just log that it's been scheduled
    logger.info('Scheduled regular verification', { intervalHours });
  }
}

// Export singleton instance
export const dataCompletenessService = new DataCompletenessService();







