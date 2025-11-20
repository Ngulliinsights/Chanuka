/**
 * Conflict Resolution Service
 * 
 * Handles data conflicts between multiple sources with automatic and manual
 * resolution strategies based on source priority and confidence levels.
 */

import { readDatabase } from '@shared/database';
import { 
  ConflictResolution, 
  ConflictSource, 
  DataSource,
  BillData,
  SponsorData 
} from './types.js';
import { data_sources } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger   } from '@shared/core/src/index.js';

export class ConflictResolutionService {
  private autoResolveThreshold = 0.8; // 80% confidence threshold for auto-resolution
  private priorityWeights: Record<string, number> = {
    'congress.gov': 1.0,
    'house.gov': 0.9,
    'senate.gov': 0.9,
    'govtrack.us': 0.7,
    'propublica': 0.6
  };

  /**
   * Resolve conflicts for bill data
   */
  async resolveBillConflicts(
    existingBill: any,
    newBillData: BillData,
    conflictFields: string[]
  ): Promise<ConflictResolution> {
    const conflictId = `bill-${existingBill.id}-${Date.now()}`;
    
    const sources: ConflictSource[] = [
      {
        sourceId: 'existing',
        sourceName: 'Database',
        value: this.extractConflictValues(existingBill, conflictFields),
        timestamp: existingBill.updated_at || existingBill.created_at,
        priority: 0.5, // Lower priority for existing data
        confidence: 0.7
      },
      {
        sourceId: newBillData.sourceId,
        sourceName: this.getSourceName(newBillData.sourceId),
        value: this.extractConflictValues(newBillData, conflictFields),
        timestamp: new Date(),
        priority: this.priorityWeights[newBillData.sourceId] || 0.5,
        confidence: this.calculateDataConfidence(newBillData)
      }
    ];

    const resolution: ConflictResolution = {
      conflictId,
      dataType: 'bill',
      recordId: existingBill.id.toString(),
      sources,
      resolution: 'pending',
      confidence: 0
    };

    // Attempt automatic resolution
    const autoResolution = await this.attemptAutoResolution(resolution);
    
    if (autoResolution.confidence >= this.autoResolveThreshold) {
      resolution.resolution = 'automatic';
      resolution.resolvedValue = autoResolution.resolvedValue;
      resolution.confidence = autoResolution.confidence;
      resolution.resolvedAt = new Date();
    } else {
      resolution.resolution = 'manual';
    }

    // Store conflict in database
  await this.storeConflict(resolution);

    return resolution;
  }

  /**
   * Resolve conflicts for sponsor data
   */
  async resolveSponsorConflicts(
    existingSponsor: any,
    newSponsorData: SponsorData,
    conflictFields: string[]
  ): Promise<ConflictResolution> {
    const conflictId = `sponsor-${existingSponsor.id}-${Date.now()}`;
    
    const sources: ConflictSource[] = [
      {
        sourceId: 'existing',
        sourceName: 'Database',
        value: this.extractConflictValues(existingSponsor, conflictFields),
        timestamp: existingSponsor.updated_at || existingSponsor.created_at,
        priority: 0.5,
        confidence: 0.7
      },
      {
        sourceId: 'external',
        sourceName: 'External API',
        value: this.extractConflictValues(newSponsorData, conflictFields),
        timestamp: new Date(),
        priority: 0.8,
        confidence: this.calculateSponsorDataConfidence(newSponsorData)
      }
    ];

    const resolution: ConflictResolution = {
      conflictId,
      dataType: 'sponsor',
      recordId: existingSponsor.id.toString(),
      sources,
      resolution: 'pending',
      confidence: 0
    };

    const autoResolution = await this.attemptAutoResolution(resolution);
    
    if (autoResolution.confidence >= this.autoResolveThreshold) {
      resolution.resolution = 'automatic';
      resolution.resolvedValue = autoResolution.resolvedValue;
      resolution.confidence = autoResolution.confidence;
      resolution.resolvedAt = new Date();
    } else {
      resolution.resolution = 'manual';
    }

    await this.storeConflict(resolution);
    return resolution;
  }

  /**
   * Attempt automatic conflict resolution
   */
  private async attemptAutoResolution(conflict: ConflictResolution): Promise<{
    resolvedValue: any;
    confidence: number;
  }> {
    const { sources } = conflict;
    
    // Strategy 1: Use highest priority source if confidence is high
    const highestPrioritySource = sources.reduce((prev, current) => 
      (current.priority > prev.priority) ? current : prev
    );

    if (highestPrioritySource.confidence >= 0.9 && highestPrioritySource.priority >= 0.8) {
      return {
        resolvedValue: highestPrioritySource.value,
        confidence: highestPrioritySource.confidence * highestPrioritySource.priority
      };
    }

    // Strategy 2: Use most recent data if sources have similar priority
    const priorityDiff = Math.abs(sources[0].priority - sources[1].priority);
    if (priorityDiff < 0.2) {
      const mostRecentSource = sources.reduce((prev, current) => 
        (current.timestamp > prev.timestamp) ? current : prev
      );
      
      return {
        resolvedValue: mostRecentSource.value,
        confidence: mostRecentSource.confidence * 0.8 // Slightly lower confidence
      };
    }

    // Strategy 3: Merge compatible values
    const mergedValue = await this.attemptValueMerge(sources, conflict.dataType);
    if (mergedValue) {
      return {
        resolvedValue: mergedValue.value,
        confidence: mergedValue.confidence
      };
    }

    // Strategy 4: Default to highest priority with reduced confidence
    return {
      resolvedValue: highestPrioritySource.value,
      confidence: highestPrioritySource.confidence * 0.6
    };
  }

  /**
   * Attempt to merge values from different sources
   */
  private async attemptValueMerge(
    sources: ConflictSource[], 
    dataType: string
  ): Promise<{ value: any; confidence: number } | null> {
    if (dataType === 'bill') {
      return this.mergeBillValues(sources);
    } else if (dataType === 'sponsor') {
      return this.mergeSponsorValues(sources);
    }
    
    return null;
  }

  /**
   * Merge bill values from different sources
   */
  private mergeBillValues(sources: ConflictSource[]): { value: any; confidence: number } | null {
    const mergedValue: any = {};
    let totalConfidence = 0;
    let fieldCount = 0;

    for (const source of sources) {
      const value = source.value;
      
      // Merge title - prefer longer, more descriptive titles
      if (value.title) {
        if (!mergedValue.title || value.title.length > mergedValue.title.length) {
          mergedValue.title = value.title;
        }
      }

      // Merge summary - prefer non-empty summaries
      if (value.summary && value.summary.trim()) {
        if (!mergedValue.summary || value.summary.length > mergedValue.summary.length) {
          mergedValue.summary = value.summary;
        }
      }

      // Merge status - prefer more recent status
      if (value.status) {
        mergedValue.status = value.status; // Latest source wins
      }

      totalConfidence += source.confidence;
      fieldCount++;
    }

    if (fieldCount === 0) return null;

    return {
      value: mergedValue,
      confidence: totalConfidence / fieldCount * 0.7 // Reduce confidence for merged data
    };
  }

  /**
   * Merge sponsor values from different sources
   */
  private mergeSponsorValues(sources: ConflictSource[]): { value: any; confidence: number } | null {
    const mergedValue: any = {};
    let totalConfidence = 0;
    let fieldCount = 0;

    for (const source of sources) {
      const value = source.value;
      
      // Merge name - prefer official names
      if (value.name) {
        mergedValue.name = value.name;
      }

      // Merge party - prefer consistent party affiliation
      if (value.party) {
        mergedValue.party = value.party;
      }

      // Merge state and district
      if (value.state) {
        mergedValue.state = value.state;
      }
      
      if (value.district) {
        mergedValue.district = value.district;
      }

      totalConfidence += source.confidence;
      fieldCount++;
    }

    if (fieldCount === 0) return null;

    return {
      value: mergedValue,
      confidence: totalConfidence / fieldCount * 0.8
    };
  }

  /**
   * Extract values for conflicting fields
   */
  private extractConflictValues(data: any, conflictFields: string[]): any {
    const values: any = {};
    
    for (const field of conflictFields) {
      if (data[field] !== undefined) {
        values[field] = data[field];
      }
    }
    
    return values;
  }

  /**
   * Calculate confidence score for bill data
   */
  private calculateDataConfidence(billData: BillData): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on data completeness
    if (billData.title && billData.title.trim()) confidence += 0.1;
    if (billData.summary && billData.summary.trim()) confidence += 0.1;
    if (billData.content && billData.content.trim()) confidence += 0.1;
    if (billData.sponsors && billData.sponsors.length > 0) confidence += 0.1;
    if (billData.introduced_date) confidence += 0.05;
    if (billData.last_action_date) confidence += 0.05;
    if (billData.sourceUrl) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate confidence score for sponsor data
   */
  private calculateSponsorDataConfidence(sponsorData: SponsorData): number {
    let confidence = 0.6; // Base confidence for sponsor data
    
    if (sponsorData.name && sponsorData.name.trim()) confidence += 0.1;
    if (sponsorData.party) confidence += 0.1;
    if (sponsorData.state) confidence += 0.1;
    if (sponsorData.district) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get human-readable source name
   */
  private getSourceName(sourceId: string): string {
    const sourceNames: Record<string, string> = {
      'congress.gov': 'Congress.gov',
      'house.gov': 'House.gov',
      'senate.gov': 'Senate.gov',
      'govtrack.us': 'GovTrack.us',
      'propublica': 'ProPublica Congress API'
    };
    
    return sourceNames[sourceId] || sourceId;
  }

  /**
   * Store conflict in database
   */
  private async storeConflict(conflict: ConflictResolution): Promise<void> {
    try {
      // Store main conflict record
  const database = readDatabase;
      await database.insert(conflicts).values({
        id: conflict.conflictId,
        dataType: conflict.dataType,
        recordId: conflict.recordId,
        resolution: conflict.resolution,
        resolvedValue: conflict.resolvedValue ? JSON.stringify(conflict.resolvedValue) : null,
        resolvedBy: conflict.resolvedBy,
        resolvedAt: conflict.resolvedAt,
        confidence: conflict.confidence,
        created_at: new Date()
      });

      // Store conflict sources
      for (const source of conflict.sources) {
        await database.insert(conflictSources).values({
          conflictId: conflict.conflictId,
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          value: JSON.stringify(source.value),
          timestamp: source.timestamp,
          priority: source.priority,
          confidence: source.confidence
        });
      }

    } catch (error) {
      logger.error('Error storing conflict:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Get pending conflicts for manual review
   */
  async getPendingConflicts(limit = 50): Promise<ConflictResolution[]> {
    try {
  const database = readDatabase;
      const pendingConflicts = await database
        .select()
        .from(conflicts)
        .where(eq(conflicts.resolution, 'manual'))
        .limit(limit);

      const results: ConflictResolution[] = [];

      for (const conflict of pendingConflicts) {
        const sources = await database
          .select()
          .from(conflictSources)
          .where(eq(conflictSources.conflictId, conflict.id));

        results.push({
          conflictId: conflict.id,
          dataType: conflict.dataType,
          recordId: conflict.recordId,
          sources: sources.map(s => ({
            sourceId: s.sourceId,
            sourceName: s.sourceName,
            value: JSON.parse(s.value),
            timestamp: s.timestamp,
            priority: s.priority,
            confidence: s.confidence
          })),
          resolution: conflict.resolution as 'manual' | 'automatic' | 'pending',
          resolvedValue: conflict.resolvedValue ? JSON.parse(conflict.resolvedValue) : undefined,
          resolvedBy: conflict.resolvedBy,
          resolvedAt: conflict.resolvedAt,
          confidence: conflict.confidence
        });
      }

      return results;
    } catch (error) {
      logger.error('Error getting pending conflicts:', { component: 'Chanuka' }, error);
      return [];
    }
  }

  /**
   * Manually resolve a conflict
   */
  async manuallyResolveConflict(
    conflictId: string,
    resolvedValue: any,
    resolvedBy: string
  ): Promise<void> {
    try {
  const database = readDatabase;
      await database
        .update(conflicts)
        .set({
          resolution: 'manual',
          resolvedValue: JSON.stringify(resolvedValue),
          resolvedBy,
          resolvedAt: new Date(),
          confidence: 1.0 // Manual resolution has full confidence
        })
        .where(eq(conflicts.id, conflictId));

    } catch (error) {
      logger.error('Error manually resolving conflict:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  /**
   * Get conflict statistics
   */
  async getConflictStatistics(): Promise<{
    total: number;
    automatic: number;
    manual: number;
    pending: number;
    averageConfidence: number;
  }> {
    try {
      // This would need proper aggregation queries
      // For now, returning mock data structure
      return {
        total: 0,
        automatic: 0,
        manual: 0,
        pending: 0,
        averageConfidence: 0
      };
    } catch (error) {
      logger.error('Error getting conflict statistics:', { component: 'Chanuka' }, error);
      throw error;
    }
  }
}












































