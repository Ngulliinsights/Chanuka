// ============================================================================
// FEATURE FLAGS REPOSITORY - Database Access Layer
// ============================================================================

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getDatabase } from '@server/infrastructure/database';
import {
  featureFlags,
  featureFlagEvaluations,
  featureFlagMetrics,
  type FeatureFlag,
  type NewFeatureFlag,
  type FeatureFlagEvaluation,
  type NewFeatureFlagEvaluation,
  type FeatureFlagMetric,
  type NewFeatureFlagMetric
} from '@server/infrastructure/schema';

export class FeatureFlagRepository {
  private db = getDatabase();

  // ============================================================================
  // FEATURE FLAG CRUD
  // ============================================================================

  async create(data: NewFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await this.writeDatabase.insert(featureFlags).values(data).returning();
    return flag;
  }

  async findById(id: string): Promise<FeatureFlag | undefined> {
    const [flag] = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id))
      .limit(1);
    return flag;
  }

  async findByName(name: string): Promise<FeatureFlag | undefined> {
    const [flag] = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.name, name))
      .limit(1);
    return flag;
  }

  async findAll(): Promise<FeatureFlag[]> {
    return await this.readDatabase.select().from(featureFlags);
  }

  async findEnabled(): Promise<FeatureFlag[]> {
    return await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.enabled, true));
  }

  async update(id: string, data: Partial<NewFeatureFlag>): Promise<FeatureFlag | undefined> {
    const [flag] = await this.db
      .update(featureFlags)
      .set({ ...data, updated_at: new Date() })
      .where(eq(featureFlags.id, id))
      .returning();
    return flag;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(featureFlags)
      .where(eq(featureFlags.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ============================================================================
  // EVALUATIONS
  // ============================================================================

  async recordEvaluation(data: NewFeatureFlagEvaluation): Promise<FeatureFlagEvaluation> {
    const [evaluation] = await this.db
      .insert(featureFlagEvaluations)
      .values(data)
      .returning();
    return evaluation;
  }

  async getEvaluations(
    flagId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<FeatureFlagEvaluation[]> {
    let query = this.db
      .select()
      .from(featureFlagEvaluations)
      .where(eq(featureFlagEvaluations.flag_id, flagId))
      .orderBy(desc(featureFlagEvaluations.evaluated_at));

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async getEvaluationsByUser(
    userId: string,
    options?: { limit?: number }
  ): Promise<FeatureFlagEvaluation[]> {
    let query = this.db
      .select()
      .from(featureFlagEvaluations)
      .where(eq(featureFlagEvaluations.user_id, userId))
      .orderBy(desc(featureFlagEvaluations.evaluated_at));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  async recordMetrics(data: NewFeatureFlagMetric): Promise<FeatureFlagMetric> {
    const [metric] = await this.db
      .insert(featureFlagMetrics)
      .values(data)
      .returning();
    return metric;
  }

  async getMetrics(
    flagId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FeatureFlagMetric[]> {
    let query = this.db
      .select()
      .from(featureFlagMetrics)
      .where(eq(featureFlagMetrics.flag_id, flagId))
      .orderBy(desc(featureFlagMetrics.window_start));

    if (startDate && endDate) {
      query = query.where(
        and(
          eq(featureFlagMetrics.flag_id, flagId),
          gte(featureFlagMetrics.window_start, startDate),
          lte(featureFlagMetrics.window_end, endDate)
        )
      );
    }

    return await query;
  }

  async updateMetrics(
    flagId: string,
    windowStart: Date,
    data: Partial<NewFeatureFlagMetric>
  ): Promise<FeatureFlagMetric | undefined> {
    const [metric] = await this.db
      .update(featureFlagMetrics)
      .set(data)
      .where(
        and(
          eq(featureFlagMetrics.flag_id, flagId),
          eq(featureFlagMetrics.window_start, windowStart)
        )
      )
      .returning();
    return metric;
  }
}
