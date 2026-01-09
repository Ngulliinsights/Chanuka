import { and, eq, gte, lte, or, sql } from 'drizzle-orm';

import { logger } from '@shared/core';
import {
  readDatabase,
  withTransaction,
  writeDatabase,
  type DatabaseTransaction,
} from '@shared/database/connection';
import {
  rate_limit_config,
  rate_limit_exemptions,
  rate_limits,
  type NewRateLimit,
  type RateLimit,
} from '@shared/schema/safeguards';

export interface RateLimitContext {
  userId?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  sessionId?: string;
  actionType: string;
  actionResource?: string;
  userAgent?: string;
  geoLocation?: {
    country?: string;
    county?: string;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  resetTime?: Date;
  blockedUntil?: Date;
  blockReason?: string;
  violationSeverity?: string;
  penaltyMultiplier?: number;
}

export interface RateLimitConfigResult {
  maxAttempts: number;
  windowMinutes: number;
  blockDurationMinutes: number;
  escalationMultiplier: number;
  maxEscalationLevel: number;
  enableProgressivePenalties: boolean;
  enableIpBlocking: boolean;
  enableFingerprintTracking: boolean;
  emergencyMode: boolean;
  emergencyMultiplier: number;
}

export class RateLimitService {
  private static instance: RateLimitService;

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Check if an action is allowed under rate limiting rules
   */
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    try {
      // Check if user is exempt
      if (context.userId && (await this.isUserExempt(context.userId, context.actionType))) {
        return { allowed: true };
      }

      // Get rate limit configuration
      const config = await this.getRateLimitConfig(context.actionType);
      if (!config) {
        // No config means no rate limiting
        return { allowed: true };
      }

      // Find existing rate limit record
      const existingLimit = await this.findExistingRateLimit(context, config);

      if (!existingLimit) {
        // First attempt, create new record
        await this.createRateLimitRecord(context, config);
        return {
          allowed: true,
          remainingAttempts: config.maxAttempts - 1,
        };
      }

      // Check if currently blocked
      if (
        existingLimit.is_blocked &&
        existingLimit.blocked_until &&
        existingLimit.blocked_until > new Date()
      ) {
        return {
          allowed: false,
          blockedUntil: existingLimit.blocked_until,
          blockReason: existingLimit.block_reason || 'Rate limit exceeded',
          violationSeverity: existingLimit.violation_severity || 'low',
        };
      }

      // Check if window has expired
      if (existingLimit.expires_at <= new Date()) {
        // Reset window
        await this.resetRateLimitWindow(existingLimit.id, config);
        return {
          allowed: true,
          remainingAttempts: config.maxAttempts - 1,
        };
      }

      // Increment attempt count
      const updatedLimit = await this.incrementAttemptCount(existingLimit.id, context);

      // Check if limit exceeded
      if (updatedLimit.attempt_count >= updatedLimit.max_attempts) {
        // Apply blocking
        const blockResult = await this.applyRateLimitBlock(updatedLimit, config);
        return {
          allowed: false,
          blockedUntil: blockResult.blockedUntil,
          blockReason: blockResult.blockReason,
          violationSeverity: blockResult.violationSeverity,
          penaltyMultiplier: parseFloat(updatedLimit.penalty_multiplier),
        };
      }

      return {
        allowed: true,
        remainingAttempts: updatedLimit.max_attempts - updatedLimit.attempt_count,
        resetTime: updatedLimit.expires_at,
      };
    } catch (error) {
      logger.error('Rate limit check failed', { error, context });
      // Fail open - allow action if rate limiting fails
      return { allowed: true };
    }
  }

  /**
   * Record a successful or failed attempt
   */
  async recordAttempt(context: RateLimitContext, success: boolean): Promise<void> {
    try {
      const existingLimit = await this.findExistingRateLimit(context);
      if (!existingLimit) return;

      await withTransaction(async (tx: DatabaseTransaction) => {
        if (success) {
          await tx
            .update(rate_limits)
            .set({
              success_count: sql`${rate_limits.success_count} + 1`,
              updated_at: new Date(),
            })
            .where(eq(rate_limits.id, existingLimit.id));
        } else {
          await tx
            .update(rate_limits)
            .set({
              failure_count: sql`${rate_limits.failure_count} + 1`,
              updated_at: new Date(),
            })
            .where(eq(rate_limits.id, existingLimit.id));
        }
      });
    } catch (error) {
      logger.error('Failed to record attempt', { error, context, success });
    }
  }

  /**
   * Check if user is exempt from rate limiting
   */
  private async isUserExempt(userId: string, actionType: string): Promise<boolean> {
    try {
      const exemption = await readDatabase
        .select()
        .from(rate_limit_exemptions)
        .where(
          and(
            eq(rate_limit_exemptions.user_id, userId),
            eq(rate_limit_exemptions.is_active, true),
            or(
              sql`${rate_limit_exemptions.exempted_actions} IS NULL`,
              sql`${actionType} = ANY(${rate_limit_exemptions.exempted_actions})`
            ),
            or(
              sql`${rate_limit_exemptions.expires_at} IS NULL`,
              gte(rate_limit_exemptions.expires_at, new Date())
            )
          )
        )
        .limit(1);

      return exemption.length > 0;
    } catch (error) {
      logger.error('Failed to check user exemption', { error, userId, actionType });
      return false;
    }
  }

  /**
   * Get rate limit configuration for an action
   */
  private async getRateLimitConfig(actionType: string): Promise<RateLimitConfigResult | null> {
    try {
      const config = await readDatabase
        .select()
        .from(rate_limit_config)
        .where(and(eq(rate_limit_config.action_type, actionType), eq(rate_limit_config.is_enabled, true)))
        .limit(1);

      if (config.length === 0) return null;

      const c = config[0];
      if (!c) return null;

      return {
        maxAttempts: c.ip_limit_max, // Use IP limits as default
        windowMinutes: c.ip_limit_window_minutes,
        blockDurationMinutes: c.block_duration_minutes,
        escalationMultiplier: Number(c.escalation_multiplier),
        maxEscalationLevel: c.max_escalation_level,
        enableProgressivePenalties: c.enable_progressive_penalties,
        enableIpBlocking: c.enable_ip_blocking,
        enableFingerprintTracking: c.enable_fingerprint_tracking,
        emergencyMode: c.emergency_mode,
        emergencyMultiplier: Number(c.emergency_multiplier),
      };
    } catch (error) {
      logger.error('Failed to get rate limit config', { error, actionType });
      return null;
    }
  }

  /**
   * Find existing rate limit record
   */
  private async findExistingRateLimit(
    context: RateLimitContext,
    config?: RateLimitConfigResult
  ): Promise<RateLimit | null> {
    try {
      const conditions = [];

      if (context.userId) {
        conditions.push(eq(rate_limits.user_id, context.userId));
      }
      if (context.ipAddress) {
        conditions.push(eq(rate_limits.ip_address, context.ipAddress));
      }
      if (context.deviceFingerprint) {
        conditions.push(eq(rate_limits.device_fingerprint, context.deviceFingerprint));
      }
      if (context.sessionId) {
        conditions.push(eq(rate_limits.session_id, context.sessionId));
      }

      conditions.push(eq(rate_limits.action_type, context.actionType));

      if (context.actionResource) {
        conditions.push(eq(rate_limits.action_resource, context.actionResource));
      }

      if (config) {
        // Only check within current window
        const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);
        conditions.push(gte(rate_limits.window_start, windowStart));
      }

      const result = await readDatabase
        .select()
        .from(rate_limits)
        .where(and(...conditions))
        .orderBy(sql`${rate_limits.created_at} DESC`)
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find existing rate limit', { error, context });
      return null;
    }
  }

  /**
   * Create new rate limit record
   */
  private async createRateLimitRecord(
    context: RateLimitContext,
    config: RateLimitConfigResult
  ): Promise<void> {
    try {
      const windowStart = new Date();
      const expiresAt = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000);

      const newRecord: NewRateLimit = {
        user_id: context.userId,
        ip_address: context.ipAddress,
        device_fingerprint: context.deviceFingerprint,
        session_id: context.sessionId,
        action_type: context.actionType,
        action_resource: context.actionResource,
        window_start: windowStart,
        window_duration_minutes: config.windowMinutes,
        expires_at: expiresAt,
        attempt_count: 1,
        max_attempts: config.maxAttempts,
        metadata: {
          last_attempt_time: new Date().toISOString(),
          user_agent: context.userAgent,
          geo_location: context.geoLocation,
        },
      };

      await writeDatabase.insert(rate_limits).values(newRecord);
    } catch (error) {
      logger.error('Failed to create rate limit record', { error, context });
    }
  }

  /**
   * Reset rate limit window
   */
  private async resetRateLimitWindow(
    rateLimitId: string,
    config: RateLimitConfigResult
  ): Promise<void> {
    try {
      const windowStart = new Date();
      const expiresAt = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000);

      await withTransaction(async (tx: DatabaseTransaction) => {
        await tx
          .update(rate_limits)
          .set({
            window_start: windowStart,
            expires_at: expiresAt,
            attempt_count: 1,
            success_count: 0,
            failure_count: 0,
            blocked_count: 0,
            is_blocked: false,
            blocked_at: null,
            blocked_until: null,
            block_reason: null,
            consecutive_violations: 0,
            penalty_multiplier: '1.0',
            last_violation_at: null,
            updated_at: new Date(),
          })
          .where(eq(rate_limits.id, rateLimitId));
      });
    } catch (error) {
      logger.error('Failed to reset rate limit window', { error, rateLimitId });
    }
  }

  /**
   * Increment attempt count
   */
  private async incrementAttemptCount(
    rateLimitId: string,
    context: RateLimitContext
  ): Promise<RateLimit> {
    try {
      const result = await withTransaction(async (tx: DatabaseTransaction) => {
        const updated = await tx
          .update(rate_limits)
          .set({
            attempt_count: sql`${rate_limits.attempt_count} + 1`,
            updated_at: new Date(),
            metadata: sql`jsonb_set(${rate_limits.metadata}, '{last_attempt_time}', '"${new Date().toISOString()}"'::jsonb)`,
          })
          .where(eq(rate_limits.id, rateLimitId))
          .returning();

        return updated[0];
      });

      if (!result) {
        throw new Error('Failed to increment attempt count - no result returned');
      }

      return result;
    } catch (error) {
      logger.error('Failed to increment attempt count', { error, rateLimitId, context });
      throw error;
    }
  }

  /**
   * Apply rate limit block
   */
  private async applyRateLimitBlock(
    existingLimit: RateLimit,
    config: RateLimitConfigResult
  ): Promise<{
    blockedUntil: Date;
    blockReason: string;
    violationSeverity: string;
  }> {
    try {
      const now = new Date();
      const consecutiveViolations = existingLimit.consecutive_violations + 1;
      const penaltyMultiplier = config.enableProgressivePenalties
        ? Math.min(
            Number(existingLimit.penalty_multiplier) * config.escalationMultiplier,
            config.maxEscalationLevel
          )
        : 1.0;

      const blockDurationMinutes = Math.floor(config.blockDurationMinutes * penaltyMultiplier);
      const blockedUntil = new Date(now.getTime() + blockDurationMinutes * 60 * 1000);

      let violationSeverity = 'low';
      if (consecutiveViolations >= 5) violationSeverity = 'medium';
      if (consecutiveViolations >= 10) violationSeverity = 'high';
      if (consecutiveViolations >= 15) violationSeverity = 'critical';

      const blockReason = `Exceeded ${existingLimit.max_attempts} attempts in ${existingLimit.window_duration_minutes} minutes`;

      await withTransaction(async (tx: DatabaseTransaction) => {
        await tx
          .update(rate_limits)
          .set({
            is_blocked: true,
            blocked_at: now,
            blocked_until: blockedUntil,
            block_reason: blockReason,
            violation_severity: violationSeverity,
            consecutive_violations: consecutiveViolations,
            penalty_multiplier: penaltyMultiplier.toString(),
            last_violation_at: now,
            blocked_count: sql`${rate_limits.blocked_count} + 1`,
            updated_at: now,
          })
          .where(eq(rate_limits.id, existingLimit.id));
      });

      return {
        blockedUntil,
        blockReason,
        violationSeverity,
      };
    } catch (error) {
      logger.error('Failed to apply rate limit block', { error, existingLimit });
      throw error;
    }
  }

  /**
   * Clean up expired rate limit records (should be called by background job)
   */
  async cleanupExpiredRecords(): Promise<number> {
    try {
      const result = await writeDatabase.delete(rate_limits).where(lte(rate_limits.expires_at, new Date()));

      // Drizzle returns an array of deleted rows, not a result with rowCount
      const deletedCount = Array.isArray(result) ? result.length : 0;

      logger.info('Cleaned up expired rate limit records', { deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired rate limit records', { error });
      return 0;
    }
  }
}

// Export singleton instance
export const rateLimitService = RateLimitService.getInstance();
