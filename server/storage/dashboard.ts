import { db } from '../../db/index.js';
import { eq, sql, and, desc, count } from 'drizzle-orm';
import { bills, analysis, evaluations, departments } from '../../shared/schema.js';
import type { Candidate, DepartmentStat, RadarDatum, EvaluationData } from '../../shared/schema.js';

// Enhanced cache interface with better type safety
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number; // Track cache usage for optimization
}

// Cache configuration with environment-based TTL
const CACHE_CONFIG = {
  TTL: process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 30 * 1000, // 5min prod, 30s dev
  MAX_SIZE: 100, // Prevent memory leaks
  CLEANUP_INTERVAL: 10 * 60 * 1000, // Clean up every 10 minutes
};

// Valid statuses as a readonly constant to prevent mutations
const VALID_STATUSES = ['Under Review', 'Approved', 'Rejected', 'On Hold'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

class DashboardStorageService {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start automatic cache cleanup to prevent memory leaks
    this.startCacheCleanup();
  }

  /**
   * Automatic cache cleanup to prevent memory accumulation
   * Removes expired entries and enforces size limits
   */
  private startCacheCleanup(): void {
    if (this.cleanupTimer) return; // Prevent multiple timers

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Identify expired entries
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > CACHE_CONFIG.TTL) {
          expiredKeys.push(key);
        }
      }

      // Remove expired entries
      expiredKeys.forEach(key => this.cache.delete(key));

      // Enforce size limit by removing least recently used entries
      if (this.cache.size > CACHE_CONFIG.MAX_SIZE) {
        const entries = Array.from(this.cache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp) // Sort by timestamp
          .slice(0, this.cache.size - CACHE_CONFIG.MAX_SIZE);

        entries.forEach(([key]) => this.cache.delete(key));
      }
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  /**
   * Enhanced cache retrieval with usage tracking
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > CACHE_CONFIG.TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // Track cache hits for optimization insights
    entry.hits++;
    return entry.data;
  }

  /**
   * Enhanced cache storage with metadata
   */
  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Validates evaluation status against allowed values
   */
  private validateStatus(status: string): status is ValidStatus {
    return VALID_STATUSES.includes(status as ValidStatus);
  }

  /**
   * Fetch candidate evaluations with enhanced filtering and pagination
   * Now supports more flexible querying with better error handling
   */
  async getCandidateEvaluations(
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      departmentId?: number;
      searchTerm?: string; // New: support name searching
      sortBy?: 'createdAt' | 'updatedAt' | 'candidateName'; // New: flexible sorting
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

      // Input validation
      if (limit > 1000) {
        throw new Error('Limit cannot exceed 1000 records');
      }

      if (status && !this.validateStatus(status)) {
        throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      // Build dynamic where conditions
      const whereConditions = [];
      if (status) whereConditions.push(eq(evaluations.status, status));
      if (departmentId) whereConditions.push(eq(evaluations.departmentId, departmentId));
      if (searchTerm) {
        // Add case-insensitive search capability
        whereConditions.push(
          sql`LOWER(${evaluations.candidateName}) LIKE LOWER(${'%' + searchTerm + '%'})`,
        );
      }

      // Build order by clause
      const orderByClause = sortOrder === 'desc' 
        ? desc(evaluations[sortBy])
        : evaluations[sortBy];

      // Execute optimized parallel queries
      const [results, countResult] = await Promise.all([
        db.query.evaluations.findMany({
          with: {
            relation: true,
            department: {
              columns: { id: true, name: true }, // Limit department data
            },
            competencyAssessment: {
              columns: {
                id: true,
                score: true,
                lastUpdated: true,
                category: true, // Include category for better UX
              },
            },
          },
          where: whereConditions.length ? and(...whereConditions) : undefined,
          limit: limit + 1, // Fetch one extra to check if there are more
          offset,
          orderBy: orderByClause,
        }),
        db.select({ count: count() }).from(evaluations)
          .where(whereConditions.length ? and(...whereConditions) : undefined),
      ]);

      // Check if there are more results
      const hasMore = results.length > limit;
      const candidates = hasMore ? results.slice(0, limit) : results;

      return {
        candidates,
        total: countResult[0].count,
        hasMore,
      };
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      // Provide more specific error information
      if (error instanceof Error) {
        throw new Error(`Failed to fetch evaluations: ${error.message}`);
      }
      throw new Error('Failed to fetch evaluations: Unknown error');
    }
  }

  /**
   * Create evaluation with enhanced validation and conflict resolution
   */
  async createEvaluation(data: EvaluationData): Promise<number> {
    try {
      // Enhanced validation
      if (!data.candidateName?.trim()) {
        throw new Error('Candidate name is required and cannot be empty');
      }
      if (!data.departmentId || data.departmentId <= 0) {
        throw new Error('Valid department ID is required');
      }

      // Sanitize input data
      const sanitizedData = {
        ...data,
        candidateName: data.candidateName.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'Under Review' as const,
      };

      const result = await db
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
        throw new Error('Failed to create evaluation: No ID returned');
      }

      // Invalidate related caches
      this.invalidateRelatedCaches(['departmentStats']);

      return result[0].id;
    } catch (error) {
      console.error('Error creating evaluation:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create evaluation: ${error.message}`);
      }
      throw new Error('Failed to create evaluation: Unknown error');
    }
  }

  /**
   * Update evaluation status with enhanced validation and optimistic updates
   */
  async updateEvaluationStatus(id: number, status: string): Promise<boolean> {
    try {
      // Enhanced validation
      if (!id || id <= 0) {
        throw new Error('Valid evaluation ID is required');
      }

      if (!this.validateStatus(status)) {
        throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      // Check if evaluation exists before updating
      const existingEvaluation = await db.query.evaluations.findFirst({
        where: eq(evaluations.id, id),
        columns: { id: true, status: true },
      });

      if (!existingEvaluation) {
        throw new Error(`Evaluation with ID ${id} not found`);
      }

      // Skip update if status is the same
      if (existingEvaluation.status === status) {
        return true;
      }

      const result = await db
        .update(evaluations)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(evaluations.id, id))
        .returning({ id: evaluations.id });

      const success = result.length > 0;

      // Invalidate related caches on successful update
      if (success) {
        this.invalidateRelatedCaches(['departmentStats']);
      }

      return success;
    } catch (error) {
      console.error(`Error updating evaluation status to ${status}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to update evaluation status: ${error.message}`);
      }
      throw new Error('Failed to update evaluation status: Unknown error');
    }
  }

  /**
   * Get department statistics with intelligent caching and fallback
   */
  async getDepartmentStats(): Promise<DepartmentStat[]> {
    const cacheKey = 'departmentStats';
    const cached = this.getCachedData<DepartmentStat[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Optimized query with better joins and aggregations
      const result = await db.query.departments.findMany({
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

      // Process data with better error handling
      const stats = result.map(dept => {
        const relationHires = dept.hires.filter(h => h.relationType && h.relationType !== 'None').length;
        const totalHires = dept.hires.length;

        return {
          name: dept.name,
          relationHires,
          totalHires,
          score: totalHires > 0 ? Number((relationHires / totalHires).toFixed(3)) : 0,
        };
      });

      // Cache the processed data
      this.setCachedData(cacheKey, stats);

      return stats;
    } catch (error) {
      console.error('Error fetching department statistics:', error);

      // Fallback to empty array with warning rather than throwing
      console.warn('Returning empty department statistics due to error');
      return [];
    }
  }

  /**
   * Get competency metrics with enhanced error handling and caching
   */
  async getCompetencyMetrics(candidateId: number): Promise<RadarDatum[]> {
    try {
      if (!candidateId || candidateId <= 0) {
        throw new Error('Valid candidate ID is required');
      }

      // Try cache first for frequently accessed data
      const cacheKey = `competencyMetrics:${candidateId}`;
      const cached = this.getCachedData<RadarDatum[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const candidate = await db.query.evaluations.findFirst({
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

      // Transform data with validation
      const metrics = candidate.competencyAssessment?.map(assessment => ({
        subject: assessment.category || 'Unknown',
        candidate: Math.max(0, Math.min(100, assessment.score || 0)), // Clamp between 0-100
        department: Math.max(0, Math.min(100, assessment.departmentAverage || 0)),
        expected: Math.max(0, Math.min(100, assessment.industryStandard || 0)),
      })) || [];

      // Cache the results
      this.setCachedData(cacheKey, metrics);

      return metrics;
    } catch (error) {
      console.error(`Error fetching competency metrics for candidate ${candidateId}:`, error);
      if (error instanceof Error) {
        throw new Error(`Failed to fetch competency metrics: ${error.message}`);
      }
      throw new Error('Failed to fetch competency metrics: Unknown error');
    }
  }

  /**
   * Invalidate specific cache entries when data changes
   */
  private invalidateRelatedCaches(cacheKeys: string[]): void {
    cacheKeys.forEach(key => {
      this.cache.delete(key);
      // Also delete pattern-based caches
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
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; hitRate: number; entries: Array<{ key: string; hits: number; age: number }> } {
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
   * Clear cache for testing or manual refresh
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Graceful shutdown - cleanup resources
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

// Export utility functions for backward compatibility
export const clearCache = (): void => {
  dashboardStorage.clearCache();
};

// Export cache stats for monitoring
export const getCacheStats = () => {
  return dashboardStorage.getCacheStats();
};

// Graceful shutdown helper
export const shutdownDashboardStorage = (): void => {
  dashboardStorage.shutdown();
};