import { and, eq, gte, or, sql } from 'drizzle-orm';
import { logger } from '@server/infrastructure/observability';
import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import {
  readDatabase,
  withTransaction,
  type DatabaseTransaction,
} from '@server/infrastructure/database/connection';
import {
  rateLimitBlacklist,
  rateLimitConfig,
  rateLimitWhitelist,
  rateLimits,
  type NewRateLimit,
  type RateLimit,
} from '@server/infrastructure/schema/safeguards';

// ==================== Type Definitions ====================

export type { RateLimitRule, RateLimitEvent, RateLimitId } from '@shared/types/domains/safeguards';

export type UserId = string & { readonly __brand: unique symbol };

type Tx = DatabaseTransaction & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select: (...args: unknown[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (...args: unknown[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (...args: unknown[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (...args: unknown[]) => any;
  execute: (query: ReturnType<typeof sql>) => Promise<{ rows: unknown[] }>;
};

type WithIsEnabled = { is_enabled: typeof rateLimitConfig.is_active };
const configTable = rateLimitConfig as typeof rateLimitConfig & WithIsEnabled;

interface RateLimitExtended extends RateLimit {
  consecutive_violations: number | null;
  penalty_multiplier: string | null;
}

// ==================== Public Interfaces ====================

export interface RateLimitContext {
  userId?: UserId;
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

function validateRateLimitContext(context: RateLimitContext): void {
  if (!context.userId && !context.ipAddress && !context.deviceFingerprint && !context.sessionId) {
    throw new Error(
      'At least one identifier (userId, ipAddress, deviceFingerprint, or sessionId) is required'
    );
  }
  if (!context.actionType) {
    throw new Error('Action type is required');
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ==================== Service Class ====================

export class RateLimitService {
  private static instance: RateLimitService;

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  async checkAndRecordRateLimit(context: RateLimitContext) {
    return safeAsync(async () => {
      validateRateLimitContext(context);

      if (await this.isBlacklisted(context)) {
        return {
          allowed: false,
          blockReason: 'Identifier is blacklisted',
          violationSeverity: 'critical',
        };
      }

      if (await this.isWhitelisted(context)) {
        return { allowed: true };
      }

      const config = await this.getRateLimitConfig(context.actionType);
      if (!config) {
        return { allowed: true };
      }

      return await withTransaction(async (rawTx: DatabaseTransaction) => {
        const tx = rawTx as Tx;
        const existingLimit = await this.findExistingRateLimitWithLock(tx, context, config);

        if (!existingLimit) {
          await this.createRateLimitRecordInTransaction(tx, context, config);
          return {
            allowed: true,
            remainingAttempts: config.maxAttempts - 1,
            resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
          };
        }

        if (
          existingLimit.is_blocked &&
          existingLimit.blocked_until &&
          existingLimit.blocked_until > new Date()
        ) {
          await tx
            .update(rateLimits)
            .set({ updated_at: new Date() })
            .where(eq(rateLimits.id, existingLimit.id));

          return {
            allowed: false,
            blockedUntil: existingLimit.blocked_until,
            blockReason: 'Rate limit exceeded',
            violationSeverity: 'medium',
          };
        }

        const windowExpiry = new Date(
          existingLimit.window_start.getTime() +
          existingLimit.window_duration_minutes * 60 * 1000
        );

        if (windowExpiry <= new Date()) {
          await this.resetRateLimitWindowInTransaction(tx, existingLimit.id, config);
          return {
            allowed: true,
            remainingAttempts: config.maxAttempts - 1,
            resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
          };
        }

        const updatedRows = await tx
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

        const updated = updatedRows[0];
        if (!updated) {
          throw new Error('Failed to update rate limit record');
        }

        if (updated.attempt_count >= updated.limit_threshold) {
          const extendedExisting = existingLimit as RateLimitExtended;
          const blockResult = await this.applyRateLimitBlockInTransaction(
            tx,
            extendedExisting,
            config
          );
          return {
            allowed: false,
            blockedUntil: blockResult.blockedUntil,
            blockReason: blockResult.blockReason,
            violationSeverity: blockResult.violationSeverity,
            penaltyMultiplier: parseFloat(extendedExisting.penalty_multiplier ?? '1.0'),
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
    }, { service: 'RateLimitService', operation: 'checkAndRecordRateLimit', ...context });
  }

  private async isBlacklisted(context: RateLimitContext): Promise<boolean> {
    try {
      const now = new Date();
      const conditions: ReturnType<typeof sql>[] = [];

      if (context.userId) conditions.push(sql`identifier_value = ${context.userId}`);
      if (context.ipAddress) conditions.push(sql`identifier_value = ${context.ipAddress}`);
      if (context.deviceFingerprint) conditions.push(sql`identifier_value = ${context.deviceFingerprint}`);
      
      if (conditions.length === 0) return false;

      const result = await readDatabase
        .select()
        .from(rateLimitBlacklist)
        .where(
          and(
            sql`(${sql.join(conditions, sql` OR `)})`,
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
      logger.error({ error: getErrorMessage(error), context }, 'Failed to check blacklist');
      return false;
    }
  }

  private async isWhitelisted(context: RateLimitContext): Promise<boolean> {
    try {
      const now = new Date();
      const conditions: ReturnType<typeof sql>[] = [];

      if (context.userId) conditions.push(sql`identifier_value = ${context.userId}`);
      if (context.ipAddress) conditions.push(sql`identifier_value = ${context.ipAddress}`);
      if (conditions.length === 0) return false;

      const result = await readDatabase
        .select()
        .from(rateLimitWhitelist)
        .where(
          and(
            sql`(${sql.join(conditions, sql` OR `)})`,
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
      logger.error({ error: getErrorMessage(error), context }, 'Failed to check whitelist');
      return false;
    }
  }

  private async findExistingRateLimitWithLock(
    tx: Tx,
    context: RateLimitContext,
    config: RateLimitConfigResult
  ): Promise<RateLimit | null> {
    try {
      const conditions: ReturnType<typeof sql>[] = [];

      if (context.userId) conditions.push(sql`user_id = ${context.userId}`);
      if (context.ipAddress) conditions.push(sql`ip_address = ${context.ipAddress}`);
      if (context.deviceFingerprint) conditions.push(sql`device_fingerprint = ${context.deviceFingerprint}`);
      if (context.sessionId) conditions.push(sql`session_id = ${context.sessionId}`);

      conditions.push(sql`action_type = ${context.actionType}`);
      if (context.actionResource) conditions.push(sql`action_resource = ${context.actionResource}`);

      const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);
      conditions.push(sql`window_start >= ${windowStart}`);

      const query = sql`
        SELECT * FROM rate_limits
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `;

      const result = await tx.execute(query);
      if (!result.rows || result.rows.length === 0) return null;

      return result.rows[0] as unknown as RateLimit;
    } catch (error) {
      logger.error({ error: getErrorMessage(error), context }, 'Failed to find existing rate limit with lock');
      return null;
    }
  }

  private async createRateLimitRecordInTransaction(
    tx: Tx,
    context: RateLimitContext,
    config: RateLimitConfigResult
  ): Promise<void> {
    const windowStart = new Date();

    const newRecord: NewRateLimit = {
      user_id: context.userId,
      ip_address: context.ipAddress,
      device_fingerprint: context.deviceFingerprint,
      action_type: context.actionType as NewRateLimit['action_type'],
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
  }

  private async resetRateLimitWindowInTransaction(
    tx: Tx,
    rateLimitId: string,
    config: RateLimitConfigResult
  ): Promise<void> {
    await tx
      .update(rateLimits)
      .set({
        window_start: new Date(),
        window_duration_minutes: config.windowMinutes,
        attempt_count: 1,
        is_blocked: false,
        blocked_until: null,
        block_escalation_count: 0,
        updated_at: new Date(),
      })
      .where(eq(rateLimits.id, rateLimitId));
  }

  private async applyRateLimitBlockInTransaction(
    tx: Tx,
    existingLimit: RateLimitExtended,
    config: RateLimitConfigResult
  ): Promise<{ blockedUntil: Date; blockReason: string; violationSeverity: string }> {
    const now = new Date();
    const consecutiveViolations = (existingLimit.consecutive_violations ?? 0) + 1;

    const penaltyMultiplier = config.enableProgressivePenalties
      ? Math.min(
          parseFloat(existingLimit.penalty_multiplier ?? '1.0') * config.escalationMultiplier,
          config.maxEscalationLevel
        )
      : 1.0;

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

    logger.warn({
      rateLimitId: existingLimit.id,
      consecutiveViolations,
      penaltyMultiplier: effectiveMultiplier,
      blockedUntilMinutes: blockDurationMinutes,
      violationSeverity,
    }, 'Rate limit block applied');

    return { blockedUntil, blockReason, violationSeverity };
  }

  private async getRateLimitConfig(actionType: string): Promise<RateLimitConfigResult | null> {
    try {
      const result = await readDatabase
        .select()
        .from(rateLimitConfig)
        .where(
          and(
            sql`${rateLimitConfig.action_type} = ${actionType}`,
            eq(configTable.is_enabled, true)
          )
        )
        .limit(1);

      if (!result || result.length === 0) return null;

      const config = result[0];
      return {
        maxAttempts: config.default_limit,
        windowMinutes: config.window_minutes,
        blockDurationMinutes: config.first_block_duration_minutes,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        escalationMultiplier: parseFloat((config as any).escalation_multiplier ?? '1.5'),
        maxEscalationLevel: config.max_block_duration_hours,
        enableProgressivePenalties: true,
        enableIpBlocking: true,
        enableFingerprintTracking: true,
        emergencyMode: false,
        emergencyMultiplier: 1.0,
      };
    } catch (error) {
      logger.error({ error: getErrorMessage(error), actionType }, 'Failed to get rate limit config');
      return null;
    }
  }

  async cleanupExpiredRecords(batchSize = 1_000) {
    return safeAsync(async () => {
      let totalDeleted = 0;
      let deletedInBatch: number;

      do {
        deletedInBatch = await withTransaction(async (rawTx: DatabaseTransaction) => {
          const tx = rawTx as Tx;

          const expired: Array<{ id: string }> = await tx
            .select({ id: rateLimits.id })
            .from(rateLimits)
            .where(
              and(
                sql`${rateLimits.window_start} + INTERVAL '1 minute' * ${rateLimits.window_duration_minutes} <= NOW()`,
                eq(rateLimits.is_blocked, false)
              )
            )
            .limit(batchSize);

          if (expired.length === 0) return 0;

          const ids = expired.map((r) => r.id);

          await tx
            .delete(rateLimits)
            .where(
              sql`${rateLimits.id} = ANY(ARRAY[${sql.join(
                ids.map((id: string) => sql`${id}`),
                sql`, `
              )}])`
            );

          return expired.length;
        });

        totalDeleted += deletedInBatch;
      } while (deletedInBatch === batchSize);

      if (totalDeleted > 0) {
        logger.info({ deletedCount: totalDeleted }, 'Cleaned up expired rate limit records');
      }

      return totalDeleted;
    }, { service: 'RateLimitService', operation: 'cleanupExpiredRecords' });
  }

  async unblockRateLimit(rateLimitId: string, reason: string) {
    return safeAsync(async () => {
      if (!rateLimitId || !reason) {
        throw new Error('Rate limit ID and reason are required');
      }

      await withTransaction(async (rawTx: DatabaseTransaction) => {
        const tx = rawTx as Tx;
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

      logger.info({ rateLimitId, reason }, 'Rate limit manually unblocked');
      return true;
    }, { service: 'RateLimitService', operation: 'unblockRateLimit' });
  }
}

export const rateLimitService = RateLimitService.getInstance();
