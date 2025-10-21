import { db } from '@shared/database/pool.js';
import { eq, sql, and, desc, count, ilike } from 'drizzle-orm';
import { bills, analysis, evaluations, departments } from '../../../shared/schema';
import type { DepartmentStat, RadarDatum } from '../../../shared/schema';
import { logger } from '../../../shared/core/src/observability/logging';
import { errorTracker } from '../../core/errors/error-tracker.js';

/**
 * Type definitions for domain entities.
 * These should ideally be exported from your schema file.
 */
interface Candidate {
  id: number;
  candidateName: string;
  departmentId: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  relation?: any;
  department?: {
    id: number;
    name: string;
  };
  competencyAssessment?: Array<{
    id: number;
    score: number;
    lastUpdated: Date;
    category: string;
  }>;
}

interface EvaluationData {
  candidateName: string;
  departmentId: number;
  status?: string;
}

/**
 * Cache entry structure with metadata for tracking usage and freshness.
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

/**
 * Configuration for the caching layer.
 * Shorter TTL in development for faster iteration.
 */
const CACHE_CONFIG = {
  TTL: process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 30 * 1000,
  MAX_SIZE: 100,
  CLEANUP_INTERVAL: 10 * 60 * 1000,
} as const;

/**
 * Valid evaluation status values.
 * Using 'as const' ensures type safety and prevents mutations.
 */
const VALID_STATUSES = ['Under Review', 'Approved', 'Rejected', 'On Hold'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

/**
 * Helper to safely capture errors with the error tracker.
 * This handles cases where the error tracker might not have the capture method.
 */
function safeErrorCapture(error: Error, context: Record<string, any>): void {
  try {
    // Type-safe check for the capture method
    if (errorTracker && typeof errorTracker === 'object' && 'capture' in errorTracker) {
      const tracker = errorTracker as { capture: (error: Error, context: Record<string, any>) => void };
      tracker.capture(error, context);
    }
  } catch (captureError) {
    // If error capture itself fails, log it but don't throw
    logger.warn('Failed to capture error with error tracker', { 
      originalError: error.message,
      captureError 
    });
  }
}

/**
 * Dashboard storage service that handles all database operations
 * for the analytics dashboard with intelligent caching.
 */
class DashboardStorageService {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCacheCleanup();
  }

  /**
   * Starts a periodic cleanup process that removes stale cache entries
   * and enforces size limits to prevent unbounded memory growth.
   */
  private startCacheCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Identify all expired entries based on TTL
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > CACHE_CONFIG.TTL) {
          expiredKeys.push(key);
        }
      }

      // Remove expired entries
      expiredKeys.forEach(key => this.cache.delete(key));

      // If cache exceeds max size, remove oldest entries
      if (this.cache.size > CACHE_CONFIG.MAX_SIZE) {
        const sortedEntries = Array.from(this.cache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const entriesToRemove = sortedEntries.slice(0, this.cache.size - CACHE_CONFIG.MAX_SIZE);
        entriesToRemove.forEach(([key]) => this.cache.delete(key));
      }
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Retrieves data from cache if it exists and hasn't expired.
   * Also tracks cache hits for monitoring purposes.
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > CACHE_CONFIG.TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  /**
   * Stores data in the cache with timestamp metadata.
   */
  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Type guard that validates whether a string is a valid evaluation status.
   */
  private validateStatus(status: string): status is ValidStatus {
    return VALID_STATUSES.includes(status as ValidStatus);
  }

  /**
   * Fetches candidate evaluations with flexible filtering, searching, and pagination.
   * This is the primary method for retrieving evaluation data in the dashboard.
   * 
   * The method supports multiple filtering criteria that can be combined, including
   * status filtering, department filtering, and text search on candidate names.
   */
  async getCandidateEvaluations(
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      departmentId?: number;
      searchTerm?: string;
      sortBy?: 'createdAt' | 'updatedAt' | 'candidateName';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<{ candidates: Candidate[]; total: number; hasMore: boolean }> {
    try {
      const {
        limit = 100,
        offset = 0,
        status,
        departmentId,
        searchTerm,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      // Validate input bounds to prevent abuse
      if (limit > 1000) {
        throw new Error('Limit cannot exceed 1000 records');
      }

      if (status && !this.validateStatus(status)) {
        throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      // Build WHERE clause conditions dynamically based on provided filters
      const whereConditions: any[] = [];
      
      if (status) {
        whereConditions.push(eq(evaluations.status, status));
      }
      
      if (departmentId) {
        whereConditions.push(eq(evaluations.departmentId, departmentId));
      }
      
      if (searchTerm) {
        // Using ilike for case-insensitive search (PostgreSQL)
        // If you're using a different database, you might need to adjust this
        whereConditions.push(ilike(evaluations.candidateName, `%${searchTerm}%`));
      }

      // Combine all conditions with AND, or use undefined if no conditions
      const whereClause = whereConditions.length > 0 
        ? and(...whereConditions) 
        : undefined;

      // Build ORDER BY clause based on sort parameters
      const orderByClause = sortOrder === 'desc' 
        ? desc(evaluations[sortBy])
        : evaluations[sortBy];

      // Execute both queries in parallel for better performance
      // We fetch limit+1 records to determine if there are more pages
      const [results, countResult] = await Promise.all([
          db().query.evaluations.findMany({
          with: {
            department: {
              columns: { id: true, name: true },
            },
            competencyAssessment: {
              columns: {
                id: true,
                score: true,
                lastUpdated: true,
                category: true,
              },
            },
          },
          where: whereClause,
          limit: limit + 1,
          offset,
          orderBy: orderByClause,
        }),
          db().select({ count: count() })
            .from(evaluations)
            .where(whereClause),
      ]);

      // Determine if there are more results beyond this page
      const hasMore = results.length > limit;
      const candidates = hasMore ? results.slice(0, limit) : results;

      return {
        candidates: candidates as Candidate[],
        total: countResult[0]?.count || 0,
        hasMore,
      };
    } catch (error) {
      logger.error('Error fetching evaluations', { 
        component: 'Chanuka',
        options,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch evaluations: ${error.message}`);
      }
      throw new Error('Failed to fetch evaluations: Unknown error');
    }
  }

  /**
   * Creates a new evaluation record in the database.
   * If a duplicate exists (same candidate name and department), it updates instead.
   * 
   * This upsert behavior prevents duplicate entries while allowing updates
   * to existing evaluations when re-submitted.
   */
  async createEvaluation(data: EvaluationData): Promise<number> {
    try {
      // Validate required fields
      if (!data.candidateName?.trim()) {
        throw new Error('Candidate name is required and cannot be empty');
      }
      
      if (!data.departmentId || data.departmentId <= 0) {
        throw new Error('Valid department ID is required');
      }

      // Prepare data with defaults and timestamps
      const sanitizedData = {
        ...data,
        candidateName: data.candidateName.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: (data.status as ValidStatus) || 'Under Review',
      };

      // Insert with conflict resolution (upsert)
      const result = await db()
        .insert(evaluations)
        .values(sanitizedData)
        .onConflictDoUpdate({
          target: [evaluations.candidateName, evaluations.departmentId],
          set: {
            updatedAt: new Date(),
            ...data,
          },
        })
        .returning({ id: evaluations.id });

      if (!result[0]?.id) {
        throw new Error('Failed to create evaluation: No ID returned from database');
      }

      // Invalidate related caches since data has changed
      this.invalidateRelatedCaches(['departmentStats']);

      return result[0].id;
    } catch (error) {
      logger.error('Error creating evaluation', { 
        component: 'Chanuka',
        data: { ...data, candidateName: data.candidateName?.substring(0, 50) }, // Truncate for logging
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (error instanceof Error) {
        throw new Error(`Failed to create evaluation: ${error.message}`);
      }
      throw new Error('Failed to create evaluation: Unknown error');
    }
  }

  /**
   * Updates the status of an existing evaluation.
   * This validates the status value and checks that the evaluation exists
   * before performing the update.
   * 
   * The method is idempotent - if the status is already set to the target value,
   * it returns success without making a database call.
   */
  async updateEvaluationStatus(id: number, status: string): Promise<boolean> {
    try {
      // Validate the evaluation ID
      if (!id || id <= 0) {
        throw new Error('Valid evaluation ID is required');
      }

      // Validate the status value against allowed values
      if (!this.validateStatus(status)) {
        throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      // Check if the evaluation exists and get its current status
  const existingEvaluation = await db().query.evaluations.findFirst({
        where: eq(evaluations.id, id),
        columns: { id: true, status: true },
      });

      if (!existingEvaluation) {
        throw new Error(`Evaluation with ID ${id} not found`);
      }

      // Skip the database update if status hasn't changed (idempotency)
      if (existingEvaluation.status === status) {
        return true;
      }

      // Perform the status update
      const result = await db()
        .update(evaluations)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(evaluations.id, id))
        .returning({ id: evaluations.id });

      const success = result.length > 0;

      // Clear related caches on successful update
      if (success) {
        this.invalidateRelatedCaches(['departmentStats']);
      }

      return success;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Error updating evaluation status', {
        component: 'dashboard',
        evaluationId: id,
        targetStatus: status,
        error: err.message,
      });
      
      // Safely attempt to capture error in tracking system
      safeErrorCapture(err, {
        component: 'dashboard',
        operation: 'updateEvaluationStatus',
        evaluationId: id,
        status,
      });

      throw new Error(`Failed to update evaluation status: ${err.message}`);
    }
  }

  /**
   * Retrieves aggregated statistics for all departments.
   * This calculates the ratio of relation-based hires to total hires,
   * which can be used to analyze hiring patterns.
   * 
   * Results are cached aggressively since department statistics
   * don't change frequently.
   */
  async getDepartmentStats(): Promise<DepartmentStat[]> {
    const cacheKey = 'departmentStats';
    const cached = this.getCachedData<DepartmentStat[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Fetch all departments with their associated hire records
  const result = await db().query.departments.findMany({
        columns: {
          id: true,
          name: true,
        },
        with: {
          hires: {
            columns: {
              id: true,
              relationType: true,
            },
          },
        },
      });

      // Calculate statistics for each department
      const stats: DepartmentStat[] = result.map(dept => {
        // Count hires that came through relationships (excluding 'None')
        const relationHires = dept.hires.filter(
          h => h.relationType && h.relationType !== 'None'
        ).length;
        
        const totalHires = dept.hires.length;

        // Calculate the relationship hire ratio
        return {
          name: dept.name,
          relationHires,
          totalHires,
          score: totalHires > 0 
            ? Number((relationHires / totalHires).toFixed(3)) 
            : 0,
        };
      });

      // Cache the computed statistics
      this.setCachedData(cacheKey, stats);

      return stats;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Error fetching department statistics', {
        component: 'dashboard',
        error: err.message,
      });

      // Attempt to capture in error tracking system
      safeErrorCapture(err, {
        component: 'dashboard',
        operation: 'getDepartmentStats',
      });

      // Return empty array as graceful degradation rather than throwing
      logger.warn('Returning empty department statistics due to error');
      return [];
    }
  }

  /**
   * Retrieves competency assessment metrics for a specific candidate.
   * This data is used to generate radar charts showing how the candidate
   * compares to department averages and industry standards across
   * different competency categories.
   */
  async getCompetencyMetrics(candidateId: number): Promise<RadarDatum[]> {
    try {
      if (!candidateId || candidateId <= 0) {
        throw new Error('Valid candidate ID is required');
      }

      // Check cache first for frequently accessed candidate data
      const cacheKey = `competencyMetrics:${candidateId}`;
      const cached = this.getCachedData<RadarDatum[]>(cacheKey);

      if (cached) {
        return cached;
      }

      // Fetch the candidate with their competency assessments
  const candidate = await db().query.evaluations.findFirst({
        where: eq(evaluations.id, candidateId),
        with: {
          competencyAssessment: {
            columns: {
              category: true,
              score: true,
              departmentAverage: true,
              industryStandard: true,
            },
          },
        },
      });

      if (!candidate) {
        throw new Error(`Candidate with ID ${candidateId} not found`);
      }

      // Transform the assessment data into radar chart format
      // We clamp scores to 0-100 range to prevent display issues
      const metrics: RadarDatum[] = candidate.competencyAssessment?.map(assessment => ({
        subject: assessment.category || 'Unknown',
        candidate: Math.max(0, Math.min(100, assessment.score || 0)),
        department: Math.max(0, Math.min(100, assessment.departmentAverage || 0)),
        expected: Math.max(0, Math.min(100, assessment.industryStandard || 0)),
      })) || [];

      // Cache the processed metrics
      this.setCachedData(cacheKey, metrics);

      return metrics;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      logger.error('Error fetching competency metrics', {
        component: 'dashboard',
        candidateId,
        error: err.message,
      });

      // Capture in error tracking system
      safeErrorCapture(err, {
        component: 'dashboard',
        operation: 'getCompetencyMetrics',
        candidateId,
      });

      throw new Error(`Failed to fetch competency metrics: ${err.message}`);
    }
  }

  /**
   * Invalidates cache entries that match the given keys.
   * Supports both exact key matching and pattern-based matching
   * for invalidating groups of related cache entries.
   */
  private invalidateRelatedCaches(cacheKeys: string[]): void {
    cacheKeys.forEach(key => {
      // Delete the exact key if it exists
      this.cache.delete(key);
      
      // If the key contains a colon, treat it as a pattern prefix
      // This allows invalidating all entries like "competencyMetrics:*"
      if (key.includes(':')) {
        const pattern = key.split(':')[0];
        for (const cacheKey of this.cache.keys()) {
          if (cacheKey.startsWith(pattern)) {
            this.cache.delete(cacheKey);
          }
        }
      }
    });
  }

  /**
   * Returns statistics about cache usage for monitoring and debugging.
   * This can help identify which cached items are most valuable
   * and whether the cache is sized appropriately.
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp,
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      hitRate,
      entries,
    };
  }

  /**
   * Clears all cached data. Useful for testing or forcing a refresh.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Performs cleanup of resources before shutdown.
   * This stops the cleanup timer and clears the cache to prevent memory leaks.
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Create singleton instance
export const dashboardStorage = new DashboardStorageService();

// Export the class as DashboardService for backward compatibility
export { DashboardStorageService as DashboardService };

// Export utility functions for convenience
export const clearCache = (): void => {
  dashboardStorage.clearCache();
};

export const getCacheStats = () => {
  return dashboardStorage.getCacheStats();
};

export const shutdownDashboardStorage = (): void => {
  dashboardStorage.shutdown();
};





































