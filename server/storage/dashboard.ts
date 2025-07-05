import { db } from '../db';
import { eq, sql } from 'drizzle-orm';
import { evaluations, departments } from '../schema';
import type { Candidate, DepartmentStat, RadarDatum, EvaluationData } from '../../shared/schema';

export const dashboardStorage = {
  // Add TTL-based cache configuration
  cache: new Map<string, { data: any; timestamp: number }>(),
  cacheTTL: 5 * 60 * 1000, // 5 minutes

  // Fetch all candidate evaluations with optimized querying
  getCandidateEvaluations: async (
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      departmentId?: number;
    } = {},
  ): Promise<{ candidates: Candidate[]; total: number }> => {
    try {
      const { limit = 100, offset = 0, status, departmentId } = options;

      // Build query with all conditions upfront to avoid multiple queries
      let query = db.query.evaluations.findMany({
        with: {
          relation: true,
          department: true,
          competencyAssessment: {
            // Limit related data fetch
            columns: {
              id: true,
              score: true,
              lastUpdated: true,
            },
          },
        },
        where: (evaluations, { and, eq }) => {
          const conditions = [];
          if (status) conditions.push(eq(evaluations.status, status));
          if (departmentId) conditions.push(eq(evaluations.departmentId, departmentId));
          return conditions.length ? and(...conditions) : undefined;
        },
        limit,
        offset,
        orderBy: (evaluations, { desc }) => [desc(evaluations.createdAt)],
      });

      // Execute count query in parallel with main query
      const [results, countResult] = await Promise.all([
        query,
        db.select({ count: sql<number>`count(*)` }).from(evaluations),
      ]);

      return {
        candidates: results,
        total: countResult[0].count,
      };
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      throw new Error('Failed to fetch evaluations');
    }
  },

  // Create a new evaluation with validation
  createEvaluation: async (data: EvaluationData): Promise<number> => {
    try {
      // Validate required fields
      if (!data.candidateName || !data.departmentId) {
        throw new Error('Candidate name and department are required');
      }

      const result = await db
        .insert(evaluations)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'Under Review',
        })
        .onConflict({
          target: [evaluations.candidateName, evaluations.departmentId],
          where: eq(evaluations.status, 'Under Review'),
        })
        .doUpdateSet({
          updatedAt: new Date(),
          ...data, // Update with new data values
        })
        .returning({ id: evaluations.id });

      return result[0]?.id;
    } catch (error) {
      console.error('Error creating evaluation:', error);
      throw new Error('Failed to create evaluation');
    }
  },

  // Update evaluation status with validation
  updateEvaluationStatus: async (id: number, status: string): Promise<boolean> => {
    try {
      // Validate status
      const validStatuses = ['Under Review', 'Approved', 'Rejected', 'On Hold'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const result = await db
        .update(evaluations)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(evaluations.id, id))
        .returning({ id: evaluations.id });

      return result.length > 0;
    } catch (error) {
      console.error(`Error updating evaluation status to ${status}:`, error);
      throw new Error('Failed to update evaluation status');
    }
  },

  // Get department statistics with efficient caching
  getDepartmentStats: async (): Promise<DepartmentStat[]> => {
    const cacheKey = 'departmentStats';
    const cached = dashboardStorage.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < dashboardStorage.cacheTTL) {
      return cached.data;
    }

    try {
      // Fetch all required data in a single query with aggregations
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

      const stats = result.map(dept => ({
        name: dept.name,
        relationHires: dept.hires.filter(h => h.relationType !== 'None').length,
        totalHires: dept.hires.length,
        score:
          dept.hires.length > 0
            ? dept.hires.filter(h => h.relationType !== 'None').length / dept.hires.length
            : 0,
      }));

      // Update cache with new data
      dashboardStorage.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now(),
      });

      return stats;
    } catch (error) {
      console.error('Error fetching department statistics:', error);
      throw new Error('Failed to fetch department statistics');
    }
  },

  // Get competency metrics for a candidate with error handling
  getCompetencyMetrics: async (candidateId: number): Promise<RadarDatum[]> => {
    try {
      if (!candidateId) {
        throw new Error('Candidate ID is required');
      }

      const candidate = await db.query.evaluations.findFirst({
        where: eq(evaluations.id, candidateId),
        with: {
          competencyAssessment: true,
        },
      });

      if (!candidate) {
        throw new Error(`Candidate with ID ${candidateId} not found`);
      }

      return (
        candidate.competencyAssessment?.map(assessment => ({
          subject: assessment.category,
          candidate: assessment.score,
          department: assessment.departmentAverage,
          expected: assessment.industryStandard,
        })) || []
      );
    } catch (error) {
      console.error(`Error fetching competency metrics for candidate ${candidateId}:`, error);
      throw new Error('Failed to fetch competency metrics');
    }
  },
};

// Export a method to clear the cache for testing purposes
export const clearCache = (): void => {
  dashboardStorage.cache.clear();
};
