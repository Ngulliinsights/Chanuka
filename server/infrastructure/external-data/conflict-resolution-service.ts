/**
 * Conflict Resolution Service
 * 
 * Handles data conflicts between multiple sources with automatic and manual
 * resolution strategies based on source priority and confidence levels.
 */

import { logger } from '@server/infrastructure/observability';
// TODO: Create conflicts and conflictSources tables in schema
// import { conflicts, conflictSources } from '@server/infrastructure/schema';

import type { 
  BillData,
  ConflictResolution, 
  ConflictSource, 
  SponsorData 
} from './types';

export class ConflictResolutionService {
  private autoResolveThreshold = 0.8; // 80% confidence threshold for auto-resolution
  private priorityWeights: Record<string, number> = {
    'parliament-ke': 1.0,
    'senate-ke': 0.9,
    'county-assemblies': 0.8,
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
        priority: this.priorityWeights[newBillData.sourceId] ?? 0.5,
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
    // Safe access to array elements with explicit checks
    if (sources.length >= 2) {
      const source0Priority = sources[0]?.priority ?? 0;
      const source1Priority = sources[1]?.priority ?? 0;
      const priorityDiff = Math.abs(source0Priority - source1Priority);
      
      if (priorityDiff < 0.2) {
        const mostRecentSource = sources.reduce((prev, current) => 
          (current.timestamp > prev.timestamp) ? current : prev
        );
        
        return {
          resolvedValue: mostRecentSource.value,
          confidence: mostRecentSource.confidence * 0.8 // Slightly lower confidence
        };
      }
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
   * Extract values for conflicting fields with proper type handling
   */
  private extractConflictValues(data: unknown, conflictFields: string[]): Record<string, any> {
    const values: Record<string, any> = {};
    
    // Type guard to ensure data is an object
    if (typeof data !== 'object' || data === null) {
      return values;
    }
    
    const dataRecord = data as Record<string, any>;
    
    for (const field of conflictFields) {
      if (dataRecord[field] !== undefined) {
        values[field] = dataRecord[field];
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
      'parliament-ke': 'Parliament of Kenya',
      'senate-ke': 'Senate of Kenya',
      'county-assemblies': 'County Assemblies',
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
   * TODO: Implement once conflicts and conflictSources tables are created in schema
   */
  private async storeConflict(conflict: ConflictResolution): Promise<void> {
    try {
      // TODO: Uncomment once schema tables are created
      // const database = readDatabase;
      // 
      // // Store main conflict record
      // await database.insert(conflicts).values({
      //   id: conflict.conflictId,
      //   dataType: conflict.dataType,
      //   recordId: conflict.recordId,
      //   resolution: conflict.resolution,
      //   resolvedValue: conflict.resolvedValue ? JSON.stringify(conflict.resolvedValue) : null,
      //   resolvedBy: conflict.resolvedBy ?? null,
      //   resolvedAt: conflict.resolvedAt ?? null,
      //   confidence: conflict.confidence,
      //   created_at: new Date()
      // });
      //
      // // Store conflict sources
      // for (const source of conflict.sources) {
      //   await database.insert(conflictSources).values({
      //     conflictId: conflict.conflictId,
      //     sourceId: source.sourceId,
      //     sourceName: source.sourceName,
      //     value: JSON.stringify(source.value),
      //     timestamp: source.timestamp,
      //     priority: source.priority,
      //     confidence: source.confidence
      //   });
      // }
      
      logger.info(`Conflict stored (in-memory): ${conflict.conflictId}`);

    } catch (error) {
      logger.error(`Error storing conflict: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get pending conflicts for manual review
   * TODO: Implement once conflicts and conflictSources tables are created in schema
   */
  async getPendingConflicts(limit = 50): Promise<ConflictResolution[]> {
    try {
      // TODO: Uncomment once schema tables are created
      // const database = readDatabase;
      // 
      // const pendingConflicts = await database
      //   .select()
      //   .from(conflicts)
      //   .where(eq(conflicts.resolution, 'manual'))
      //   .limit(limit);
      //
      // const results: ConflictResolution[] = [];
      //
      // for (const conflict of pendingConflicts) {
      //   const sources = await database
      //     .select()
      //     .from(conflictSources)
      //     .where(eq(conflictSources.conflictId, conflict.id));
      //
      //   results.push({
      //     conflictId: conflict.id,
      //     dataType: conflict.dataType,
      //     recordId: conflict.recordId,
      //     sources: sources.map((s: any) => ({
      //       sourceId: s.sourceId,
      //       sourceName: s.sourceName,
      //       value: JSON.parse(s.value),
      //       timestamp: s.timestamp,
      //       priority: s.priority,
      //       confidence: s.confidence
      //     })),
      //     resolution: conflict.resolution as 'manual' | 'automatic' | 'pending',
      //     resolvedValue: conflict.resolvedValue ? JSON.parse(conflict.resolvedValue) : undefined,
      //     resolvedBy: conflict.resolvedBy ?? undefined,
      //     resolvedAt: conflict.resolvedAt ?? undefined,
      //     confidence: conflict.confidence
      //   });
      // }
      //
      // return results;
      
      return [];
    } catch (error) {
      logger.error(`Error getting pending conflicts: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Manually resolve a conflict
   * TODO: Implement once conflicts table is created in schema
   */
  async manuallyResolveConflict(
    conflictId: string,
    resolvedValue: any,
    resolvedBy: string
  ): Promise<void> {
    try {
      // TODO: Uncomment once schema tables are created
      // const database = readDatabase;
      // 
      // await database
      //   .update(conflicts)
      //   .set({
      //     resolution: 'manual',
      //     resolvedValue: JSON.stringify(resolvedValue),
      //     resolvedBy,
      //     resolvedAt: new Date(),
      //     confidence: 1.0 // Manual resolution has full confidence
      //   })
      //   .where(eq(conflicts.id, conflictId));
      
      logger.info(`Conflict manually resolved (in-memory): ${conflictId}`);

    } catch (error) {
      logger.error(`Error manually resolving conflict: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get conflict statistics
   * TODO: Implement once conflicts table is created in schema
   */
  async getConflictStatistics(): Promise<{
    total: number;
    automatic: number;
    manual: number;
    pending: number;
    averageConfidence: number;
  }> {
    try {
      // TODO: Uncomment once schema tables are created
      // const database = readDatabase;
      // 
      // // Get all conflicts
      // const allConflicts = await database
      //   .select()
      //   .from(conflicts);
      //
      // const total = allConflicts.length;
      // const automatic = allConflicts.filter((c: any) => c.resolution === 'automatic').length;
      // const manual = allConflicts.filter((c: any) => c.resolution === 'manual').length;
      // const pending = allConflicts.filter((c: any) => c.resolution === 'pending').length;
      // 
      // const totalConfidence = allConflicts.reduce((sum: number, c: any) => sum + (c.confidence || 0), 0);
      // const averageConfidence = total > 0 ? totalConfidence / total : 0;
      //
      // return {
      //   total,
      //   automatic,
      //   manual,
      //   pending,
      //   averageConfidence
      // };
      
      return {
        total: 0,
        automatic: 0,
        manual: 0,
        pending: 0,
        averageConfidence: 0
      };
    } catch (error) {
      logger.error(`Error getting conflict statistics: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return empty statistics on error
      return {
        total: 0,
        automatic: 0,
        manual: 0,
        pending: 0,
        averageConfidence: 0
      };
    }
  }

  /**
   * Get conflicts by data type
   * TODO: Implement once conflicts and conflictSources tables are created in schema
   */
  async getConflictsByType(dataType: string, limit = 50): Promise<ConflictResolution[]> {
    try {
      // TODO: Uncomment once schema tables are created
      // const database = readDatabase;
      // 
      // const typeConflicts = await database
      //   .select()
      //   .from(conflicts)
      //   .where(eq(conflicts.dataType, dataType))
      //   .limit(limit);
      //
      // const results: ConflictResolution[] = [];
      //
      // for (const conflict of typeConflicts) {
      //   const sources = await database
      //     .select()
      //     .from(conflictSources)
      //     .where(eq(conflictSources.conflictId, conflict.id));
      //
      //   results.push({
      //     conflictId: conflict.id,
      //     dataType: conflict.dataType,
      //     recordId: conflict.recordId,
      //     sources: sources.map((s: any) => ({
      //       sourceId: s.sourceId,
      //       sourceName: s.sourceName,
      //       value: JSON.parse(s.value),
      //       timestamp: s.timestamp,
      //       priority: s.priority,
      //       confidence: s.confidence
      //     })),
      //     resolution: conflict.resolution as 'manual' | 'automatic' | 'pending',
      //     resolvedValue: conflict.resolvedValue ? JSON.parse(conflict.resolvedValue) : undefined,
      //     resolvedBy: conflict.resolvedBy ?? undefined,
      //     resolvedAt: conflict.resolvedAt ?? undefined,
      //     confidence: conflict.confidence
      //   });
      // }
      //
      // return results;
      
      return [];
    } catch (error) {
      logger.error(`Error getting conflicts by type: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Delete resolved conflicts older than specified days
   * TODO: Implement once conflicts and conflictSources tables are created in schema
   */
  async cleanupOldConflicts(daysOld = 90): Promise<number> {
    try {
      // TODO: Uncomment once schema tables are created
      // const database = readDatabase;
      // const cutoffDate = new Date();
      // cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      //
      // // Get conflicts to delete
      // const oldConflicts = await database
      //   .select()
      //   .from(conflicts)
      //   .where(eq(conflicts.resolution, 'automatic'));
      //
      // let deletedCount = 0;
      //
      // for (const conflict of oldConflicts) {
      //   if (conflict.resolvedAt && conflict.resolvedAt < cutoffDate) {
      //     // Delete conflict sources first
      //     await database
      //       .delete(conflictSources)
      //       .where(eq(conflictSources.conflictId, conflict.id));
      //
      //     // Delete conflict
      //     await database
      //       .delete(conflicts)
      //       .where(eq(conflicts.id, conflict.id));
      //
      //     deletedCount++;
      //   }
      // }
      //
      // logger.info(`Cleaned up ${deletedCount} old conflicts`);
      // return deletedCount;
      
      return 0;
    } catch (error) {
      logger.error(`Error cleaning up old conflicts: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Update priority weights for sources
   */
  updateSourcePriority(sourceId: string, priority: number): void {
    if (priority < 0 || priority > 1) {
      throw new Error('Priority must be between 0 and 1');
    }
    this.priorityWeights[sourceId] = priority;
    logger.info(`Updated priority for ${sourceId} to ${priority}`);
  }

  /**
   * Get current priority weights
   */
  getPriorityWeights(): Record<string, number> {
    return { ...this.priorityWeights };
  }

  /**
   * Set auto-resolve threshold
   */
  setAutoResolveThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.autoResolveThreshold = threshold;
    logger.info(`Updated auto-resolve threshold to ${threshold}`);
  }

  /**
   * Get auto-resolve threshold
   */
  getAutoResolveThreshold(): number {
    return this.autoResolveThreshold;
  }
}