import { and, eq, gte, lte, or, sql } from 'drizzle-orm';

import { logger } from '@shared/core';
import {
  readDatabase,
  withTransaction,
  writeDatabase,
  type DatabaseTransaction,
} from '@shared/database/connection';
import {
  rateLimitBlacklist,
  rateLimitConfig,
  rateLimitWhitelist,
  rateLimits,
  type NewRateLimit,
  type RateLimit,
  type RateLimitConfig,
} from '@shared/schema/safeguards';

// ==================== Type Definitions ====================

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

// ==================== Helper Functions ====================

/**
 * Validate rate limit context
 */
function validateRateLimitContext(context: RateLimitContext): void {
  if (!context.userId && !context.ipAddress && !context.deviceFingerprint && !context.sessionId) {
    throw new Error('At least one identifier (userId, ipAddress, deviceFingerprint, or sessionId) is required');
  }
  if (!context.actionType) {
    throw new Error('Action type is required');
  }
}

/**
 * Get error message from unknown error
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// ==================== Service Class ====================

/**
 * Service for rate limiting with atomic operations and race condition prevention
 *
 * SECURITY & CONCURRENCY FEATURES:
 * - Atomic check-and-increment using database transactions
 * - Row-level locking (FOR UPDATE) to prevent concurrent modifications
 * - Whitelist/blacklist support for exemptions and bans
 * - Progressive penalties with escalation
 * - Emergency mode for platform-wide restrictions
 * - Comprehensive audit trail
 */
export class RateLimitService {
  private static instance: RateLimitService;

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  /**
   * Atomically check rate limit and record attempt
   * This prevents race conditions between check and record operations
   * Uses FOR UPDATE locking to ensure exclusive access during transaction
   */
  async checkAndRecordRateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    try {
      // Validate input
      validateRateLimitContext(context);

      // Check blacklist first (immediate block)
      if (await this.isBlacklisted(context)) {
        return {
          allowed: false,
          blockReason: 'Identifier is blacklisted',
          violationSeverity: 'critical',
        };
      }

      // Check whitelist (immediate allow)
      if (await this.isWhitelisted(context)) {
        return { allowed: true };
      }

      // Get rate limit configuration
      const config = await this.getRateLimitConfig(context.actionType);
      if (!config) {
        // No config means no rate limiting
        return { allowed: true };
      }

      // Use transaction to ensure atomicity
      return await withTransaction(async (tx: DatabaseTransaction) => {
        // Find existing rate limit record with row-level locking
        const existingLimit = await this.findExistingRateLimitWithLock(tx, context, config);

        if (!existingLimit) {
          // First attempt, create new record
          await this.createRateLimitRecordInTransaction(tx, context, config);
          return {
            allowed: true,
            remainingAttempts: config.maxAttempts - 1,
            resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
          };
        }

        // Check if currently blocked
        if (
          existingLimit.is_blocked &&
          existingLimit.blocked_until &&
          existingLimit.blocked_until > new Date()
        ) {
          // Record failed attempt
          await tx
            .update(rateLimits)
            .set({
              updated_at: new Date(),
            })
            .where(eq(rateLimits.id, existingLimit.id));

          return {
            allowed: false,
            blockedUntil: existingLimit.blocked_until,
            blockReason: 'Rate limit exceeded',
            violationSeverity: 'medium',
          };
        }

        // Check if window has expired (calculate from window_start + duration)
        const windowExpiry = new Date(
          existingLimit.window_start.getTime() +
          existingLimit.window_duration_minutes * 60 * 1000
        );

        if (windowExpiry <= new Date()) {
          // Reset window and record this attempt
          await this.resetRateLimitWindowInTransaction(tx, existingLimit.id, config);
          return {
            allowed: true,
            remainingAttempts: config.maxAttempts - 1,
            resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
          };
        }

        // Increment attempt count atomically
        const updatedLimit = await tx
          .update(rateLimits)
          .set({
            attempt_count: sql`${rateLimits.attempt_count} + 1`,
            updated_at: new Date(),
            metadata: sql`jsonb_set(
              COALESCE(${rateLimits.metadata}, '{}'::jsonb),
              '{last_attempt_time}',
              to_jsonb(${new Date().toISOString()}::text)
            )`,
          })
          .where(eq(rateLimits.id, existingLimit.id))
          .returning();

        const updated = updatedLimit[0];
        if (!updated) {
          throw new Error('Failed to update rate limit record');
        }

        // Check if limit exceeded
        if (updated.attempt_count >= updated.limit_threshold) {
          // Apply blocking atomically
          const blockResult = await this.applyRateLimitBlockInTransaction(tx, updated, config);
          return {
            allowed: false,
            blockedUntil: blockResult.blockedUntil,
            blockReason: blockResult.blockReason,
            violationSeverity: blockResult.violationSeverity,
            penaltyMultiplier: parseFloat(updated.penalty_multiplier || '1.0'),
          };
        }

        return {
          allowed: true,
          remainingAttempts: updated.limit_threshold - updated.attempt_count,
          resetTime: new Date(
            updated.window_start.getTime() +
            updated.window_duration_minutes * 60 * 1000
          ),
        };
      });
    } catch (error) {
      logger.error('Atomic rate limit check failed', { error: getErrorMessage(error), context });
      // Fail open - allow action if rate limiting fails (configurable per use case)
      return { allowed: true };
    }
  }

  /**
   * Check if identifier is blacklisted
   */
  private async isBlacklisted(context: RateLimitContext): Promise<boolean> {
    try {
      const now = new Date();
      const conditions = [];

      if (context.userId) {
        conditions.push(eq(rateLimitBlacklist.identifier_value, context.userId));
      }
      if (context.ipAddress) {
        conditions.push(eq(rateLimitBlacklist.identifier_value, context.ipAddress));
      }
      if (context.deviceFingerprint) {
        conditions.push(eq(rateLimitBlacklist.identifier_value, context.deviceFingerprint));
      }

      if (conditions.length === 0) {
        return false;
      }

      const result = await readDatabase
        .select()
        .from(rateLimitBlacklist)
        .where(
          and(
            or(...conditions),
            eq(rateLimitBlacklist.is_active, true),
            or(
              sql`${rateLimitBlacklist.expires_at} IS NULL`,
              gte(rateLimitBlacklist.expires_at, now)
            )
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      logger.error('Failed to check blacklist', { error: getErrorMessage(error), context });
      return false;
    }
  }

  /**
   * Check if identifier is whitelisted
   */
  private async isWhitelisted(context: RateLimitContext): Promise<boolean> {
    try {
      const now = new Date();
      const conditions = [];

      if (context.userId) {
        conditions.push(eq(rateLimitWhitelist.identifier_value, context.userId));
      }
      if (context.ipAddress) {
        conditions.push(eq(rateLimitWhitelist.identifier_value, context.ipAddress));
      }

      if (conditions.length === 0) {
        return false;
      }

      const result = await readDatabase
        .select()
        .from(rateLimitWhitelist)
        .where(
          and(
            or(...conditions),
            eq(rateLimitWhitelist.is_active, true),
            or(
              sql`${rateLimitWhitelist.expires_at} IS NULL`,
              gte(rateLimitWhitelist.expires_at, now)
            )
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      logger.error('Failed to check whitelist', { error: getErrorMessage(error), context });
      return false;
    }
  }

  /**
   * Find existing rate limit record with row-level locking
   * Uses FOR UPDATE to ensure exclusive access during transaction
   */
  private async findExistingRateLimitWithLock(
    tx: DatabaseTransaction,
    context: RateLimitContext,
    config: RateLimitConfigResult
  ): Promise<RateLimit | null> {
    try {
      const conditions = [];

      if (context.userId) {
        conditions.push(sql`user_id = ${context.userId}`);
      }
      if (context.ipAddress) {
        conditions.push(sql`ip_address = ${context.ipAddress}`);
      }
      if (context.deviceFingerprint) {
        conditions.push(sql`device_fingerprint = ${context.deviceFingerprint}`);
      }
      if (context.sessionId) {
        conditions.push(sql`session_id = ${context.sessionId}`);
      }

      conditions.push(sql`action_type = ${context.actionType}`);

      if (context.actionResource) {
        conditions.push(sql`action_resource = ${context.actionResource}`);
      }

      // Only check within current window
      const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);
      conditions.push(sql`window_start >= ${windowStart}`);

      // Build WHERE clause
      const whereClause = conditions.join(' AND ');

      // Use FOR UPDATE to lock the row
      const query = sql`
        SELECT * FROM rate_limits
        WHERE ${sql.raw(whereClause)}
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `;

      const result = await tx.execute(query);

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      // Map the result to RateLimit type
      return result.rows[0] as unknown as RateLimit;
    } catch (error) {
      logger.error('Failed to find existing rate limit with lock', {
        error: getErrorMessage(error),
        context
      });
      return null;
    }
  }

  /**
   * Create new rate limit record within transaction
   */
  private async createRateLimitRecordInTransaction(
    tx: DatabaseTransaction,
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
        action_type: context.actionType,
        window_start: windowStart,
        window_duration_minutes: config.windowMinutes,
        attempt_count: 1,
        limit_threshold: config.maxAttempts,
        is_blocked: false,
        block_escalation_count: 0,
        is_verified_user: false,
        access_method: 'web',
        metadata: {
          last_attempt_time: new Date().toISOString(),
          user_agent: context.userAgent,
          geo_location: context.geoLocation,
        },
      };

      await tx.insert(rateLimits).values(newRecord);
    } catch (error) {
      logger.error('Failed to create rate limit record', {
        error: getErrorMessage(error),
        context
      });
      throw error;
    }
  }

  /**
   * Reset rate limit window within transaction
   */
  private async resetRateLimitWindowInTransaction(
    tx: DatabaseTransaction,
    rateLimitId: string,
    config: RateLimitConfigResult
  ): Promise<void> {
    try {
      const windowStart = new Date();
      const expiresAt = new Date(windowStart.getTime() + config.windowMinutes * 60 * 1000);

      await tx
        .update(rateLimits)
        .set({
          window_start: windowStart,
          attempt_count: 1,
          is_blocked: false,
          blocked_until: null,
          block_escalation_count: 0,
          updated_at: new Date(),
        })
        .where(eq(rateLimits.id, rateLimitId));
    } catch (error) {
      logger.error('Failed to reset rate limit window', {
        error: getErrorMessage(error),
        rateLimitId
      });
      throw error;
    }
  }

  /**
   * Apply rate limit block within transaction
   */
  private async applyRateLimitBlockInTransaction(
    tx: DatabaseTransaction,
    existingLimit: RateLimit,
    config: RateLimitConfigResult
  ): Promise<{
    blockedUntil: Date;
    blockReason: string;
    violationSeverity: string;
  }> {
    try {
      const now = new Date();
      const consecutiveViolations = (existingLimit.consecutive_violations || 0) + 1;

      // Calculate penalty multiplier with progressive escalation
      const penaltyMultiplier = config.enableProgressivePenalties
        ? Math.min(
            parseFloat(existingLimit.penalty_multiplier || '1.0') * config.escalationMultiplier,
            config.maxEscalationLevel
          )
        : 1.0;

      // Apply emergency multiplier if in emergency mode
      const effectiveMultiplier = config.emergencyMode
        ? penaltyMultiplier * config.emergencyMultiplier
        : penaltyMultiplier;

      const blockDurationMinutes = Math.floor(config.blockDurationMinutes * effectiveMultiplier);
      const blockedUntil = new Date(now.getTime() + blockDurationMinutes * 60 * 1000);

      let violationSeverity = 'low';
      if (consecutiveViolations >= 15) violationSeverity = 'critical';
      else if (consecutiveViolations >= 10) violationSeverity = 'high';
      else if (consecutiveViolations >= 5) violationSeverity = 'medium';

      const blockReason = `Exceeded ${existingLimit.limit_threshold} attempts in ${existingLimit.window_duration_minutes} minutes`;

      await tx
        .update(rateLimits)
        .set({
          is_blocked: true,
          blocked_until: blockedUntil,
          block_escalation_count: sql`${rateLimits.block_escalation_count} + 1`,
          last_violation: now,
          updated_at: now,
        })
        .where(eq(rateLimits.id, existingLimit.id));

      logger.warn('Rate limit block applied', {
        rateLimitId: existingLimit.id,
        consecutiveViolations,
        penaltyMultiplier: effectiveMultiplier,
        blockedUntilMinutes: blockDurationMinutes,
        violationSeverity,
      });

      return {
        blockedUntil,
        blockReason,
        violationSeverity,
      };
    } catch (error) {
      logger.error('Failed to apply rate limit block', {
        error: getErrorMessage(error),
        existingLimit
      });
      throw error;
    }
  }

  /**
   * Get rate limit configuration for action type
   */
  private async getRateLimitConfig(actionType: string): Promise<RateLimitConfigResult | null> {
    try {
      const result = await readDatabase
        .select()
        .from(rateLimitConfig)
        .where(
          and(
            eq(rateLimitConfig.action_type, actionType),
            eq(rateLimitConfig.is_enabled, true)
          )
        )
        .limit(1);

      if (!result || result.length === 0) {
        return null;
      }

      const config = result[0];
      return {
        maxAttempts: config.default_limit,
        windowMinutes: config.window_minutes,
        blockDurationMinutes: config.first_block_duration_minutes,
        escalationMultiplier: parseFloat(config.escalation_multiplier || '1.5'),
        maxEscalationLevel: config.max_block_duration_hours,
        enableProgressivePenalties: true,
        enableIpBlocking: true,
        enableFingerprintTracking: true,
        emergencyMode: false,
        emergencyMultiplier: 1.0,
      };
    } catch (error) {
      logger.error('Failed to get rate limit config', {
        error: getErrorMessage(error),
        actionType
      });
      return null;
    }
  }

  /**
   * Clean up expired rate limit records (should be called by background job)
   * Uses batch deletion for performance
   */
  async cleanupExpiredRecords(batchSize = 1000): Promise<number> {
    try {
      let totalDeleted = 0;
      let deletedInBatch = 0;

      do {
        deletedInBatch = await withTransaction(async (tx: DatabaseTransaction) => {
          // Find expired records (calculate expiry from window_start + duration)
          const expired = await tx
            .select({ id: rateLimits.id })
            .from(rateLimits)
            .where(
              and(
                sql`${rateLimits.window_start} + INTERVAL '1 minute' * ${rateLimits.window_duration_minutes} <= NOW()`,
                eq(rateLimits.is_blocked, false)
              )
            )
            .limit(batchSize);

          if (expired.length === 0) {
            return 0;
          }

          const idsToDelete = expired.map(r => r.id);

          // Delete in batch
          await tx
            .delete(rateLimits)
            .where(
              sql`${rateLimits.id} = ANY(ARRAY[${sql.join(idsToDelete.map(id => sql`${id}`), sql`, `)}])`
            );

          return expired.length;
        });

        totalDeleted += deletedInBatch;
      } while (deletedInBatch === batchSize);

      if (totalDeleted > 0) {
        logger.info('Cleaned up expired rate limit records', { deletedCount: totalDeleted });
      }

      return totalDeleted;
    } catch (error) {
      logger.error('Failed to cleanup expired rate limit records', {
        error: getErrorMessage(error)
      });
      return 0;
    }
  }

  /**
   * Manually unblock a rate limit (admin function)
   */
  async unblockRateLimit(rateLimitId: string, reason: string): Promise<boolean> {
    try {
      if (!rateLimitId || !reason) {
        throw new Error('Rate limit ID and reason are required');
      }

      await withTransaction(async (tx: DatabaseTransaction) => {
        await tx
          .update(rateLimits)
          .set({
            is_blocked: false,
            blocked_until: null,
            block_reason: null,
            updated_at: new Date(),
            metadata: sql`jsonb_set(
              COALESCE(${rateLimits.metadata}, '{}'::jsonb),
              '{manual_unblock_reason}',
              to_jsonb(${reason}::text)
            )`,
          })
          .where(eq(rateLimits.id, rateLimitId));
      });

      logger.info('Rate limit manually unblocked', { rateLimitId, reason });
      return true;
    } catch (error) {
      logger.error('Failed to unblock rate limit', {
        error: getErrorMessage(error),
        rateLimitId
      });
      return false;
    }
  }
}

// Export singleton instance
export const rateLimitService = RateLimitService.getInstance();
