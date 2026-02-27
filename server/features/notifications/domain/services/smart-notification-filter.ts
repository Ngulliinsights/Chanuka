/**
 * Smart Notification Filter Service
 *
 * Single responsibility: decide WHETHER a notification should be sent,
 * to WHICH channels, and at WHAT priority — based on merged user
 * preferences, content relevance, and historical engagement.
 *
 * This service never sends notifications. It only returns a FilterResult
 * that the orchestration layer (NotificationService) acts on.
 *
 * Fixes applied vs. original source
 * ──────────────────────────────────
 * • Removed mutual recursion between shouldSendNotification / applySmartFilter
 *   (duplicate-function TS2393 + unreachable-code TS7027).
 * • Logger calls rewritten to the project's single-string pino API via log().
 * • Schema table names corrected:
 *     bill_sponsorship  → bill_sponsorships
 *     user_interest     → user_interests
 *     bill (join alias) → bills
 *     sponsor (alias)   → sponsors
 *     bill_tag          → removed entirely (not in schema; tag profile returns [])
 * • FilterResult.reasons is now always string[], never undefined.
 * • Quiet-hours split values guarded with ?? 0 to satisfy TS18048.
 * • cacheService.delete() replaced with a 1 ms overwrite (method absent on CacheService).
 * • Unused imports removed: db, bill_cosponsors, comments, users, sql.
 * • catch clauses typed as unknown; error access via String(err).
 * • Implicit-any callback params given explicit types.
 */

import type { CombinedBillTrackingPreferences } from '@server/features/notifications/domain/types';
import { logger } from '@server/infrastructure/observability';
import { getDefaultCache } from '@server/infrastructure/cache';
import { db } from '@server/infrastructure/database';
import {
  bill_engagement,
  bill_sponsorships,
  bills,
  sponsors,
  user_interests,
} from '@server/infrastructure/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Logger helper — wraps pino's single-string API
// ---------------------------------------------------------------------------
function log(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, unknown>,
): void {
  const suffix = context ? ` | ${JSON.stringify(context)}` : '';
  logger[level](`${message}${suffix}`);
}

// ---------------------------------------------------------------------------
// Cache constants
// ---------------------------------------------------------------------------
const CACHE_KEYS = {
  USER_ENGAGEMENT_PROFILE: (user_id: string) => `user:engagement:${user_id}`,
  USER_PREFERENCES:        (user_id: string) => `user:preferences:${user_id}`,
  BILL_DATA:               (bill_id: number) => `bill:data:${bill_id}`,
  NOTIFICATION_HISTORY:    (user_id: string) => `notification:history:${user_id}`,
  FILTER_RESULTS: (user_id: string, hash: string) => `filter:results:${user_id}:${hash}`,
};

const CACHE_TTL = {
  USER_DATA_SHORT:    300_000,    //  5 minutes
  USER_DATA_LONG:  86_400_000,    // 24 hours
  BILL_DATA:        3_600_000,    //  1 hour
  NOTIFICATION_DATA: 1_800_000,   // 30 minutes
  FILTER_RESULTS:      600_000,   // 10 minutes
};

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface FilterCriteria {
  user_id:          string;
  bill_id?:         number;
  category?:        string;
  /** Tags associated with the bill / event (used for profile matching only). */
  tags?:            string[];
  sponsorName?:     string;
  priority:         'low' | 'medium' | 'high' | 'urgent';
  notificationType: 'bill_update' | 'comment_reply' | 'verification_status' | 'system_alert' | 'digest';
  subType?:         'status_change' | 'new_comment' | 'amendment' | 'voting_scheduled' | 'sponsor_update';
  content?:         { title: string; message: string };
  /** Fully merged preferences supplied by the orchestrator. */
  userPreferences:  CombinedBillTrackingPreferences;
}

export interface FilterResult {
  shouldNotify:        boolean;
  confidence:          number;
  reasons:             string[];   // always string[], never undefined
  suggestedPriority:   'low' | 'medium' | 'high' | 'urgent';
  recommendedChannels: Array<'inApp' | 'email' | 'sms' | 'push'>;
  shouldBatch:         boolean;
}

export interface UserEngagementProfile {
  user_id:         string;
  topCategories:   Array<{ category: string; score: number }>;
  topSponsors:     Array<{ sponsor_id: number; name: string; score: number }>;
  /** Tags: always [] until a bill_tags table is added to the schema. */
  topTags:         Array<{ tag: string; score: number }>;
  engagementLevel: 'low' | 'medium' | 'high';
}

// ---------------------------------------------------------------------------
// Internal helper type for individual checks
// ---------------------------------------------------------------------------
interface CheckResult {
  shouldNotify: boolean;
  confidence:   number;
  reasons:      string[];   // always string[]
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SmartNotificationFilterService {
  private get database()     { return db; }
  private get cacheService() { return getDefaultCache(); }
  private readonly CACHE_DURATION_PROFILE = CACHE_TTL.USER_DATA_LONG;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Primary gate. Returns whether to send, on which channels, and at
   * what priority. `applySmartFilter` is an alias kept for backward
   * compatibility — both ultimately call `_filter`.
   */
  async shouldSendNotification(criteria: FilterCriteria): Promise<FilterResult> {
    return this._filter(criteria);
  }

  /** Backward-compatible alias — delegates to shouldSendNotification. */
  async applySmartFilter(criteria: FilterCriteria): Promise<FilterResult> {
    return this._filter(criteria);
  }

  async getEngagementProfileForUser(user_id: string): Promise<UserEngagementProfile> {
    return this.getUserEngagementProfile(user_id);
  }

  /**
   * Evicts the engagement profile cache for a user.
   * Uses a 1 ms TTL overwrite because CacheService has no delete() method.
   */
  async clearUserCache(user_id: string): Promise<void> {
    const key = CACHE_KEYS.USER_ENGAGEMENT_PROFILE(user_id);
    try {
      await this.cacheService.set(key, this.defaultProfile(user_id), 1);
      log('debug', `Cleared engagement profile cache for user ${user_id}`);
    } catch (err: unknown) {
      log('error', `Failed to clear engagement profile cache for user ${user_id}`, {
        err: String(err),
      });
    }
  }

  // ── Core filter logic ──────────────────────────────────────────────────────

  private async _filter(criteria: FilterCriteria): Promise<FilterResult> {
    const ctx = {
      component: 'SmartFilter',
      user_id:   criteria.user_id,
      type:      criteria.notificationType,
      bill_id:   criteria.bill_id,
    };

    log('debug', 'Starting smart filtering', ctx);

    try {
      const preferences    = criteria.userPreferences;
      const smartFiltering = preferences.smartFiltering;

      // ── 1. Mandatory checks (always evaluated) ──────────────────────────

      const typeCheck = this.checkNotificationTypeEnabled(criteria, preferences);
      if (!typeCheck.shouldNotify) {
        return this.blockedResult(typeCheck, criteria);
      }

      const quietCheck = this.checkQuietHours(preferences);
      if (!quietCheck.shouldNotify && criteria.priority !== 'urgent') {
        return this.blockedResult(quietCheck, criteria);
      }

      // ── 2. Smart filtering disabled → pass straight through ─────────────

      if (!smartFiltering.enabled) {
        log('debug', 'Smart filtering disabled — allowing notification', ctx);
        return {
          shouldNotify:        true,
          confidence:          1.0,
          reasons:             ['Smart filtering disabled'],
          suggestedPriority:   criteria.priority,
          recommendedChannels: this.getEnabledChannels(preferences),
          shouldBatch:
            preferences.alert_frequency !== 'immediate' &&
            criteria.priority !== 'urgent',
        };
      }

      // ── 3. Relevance checks (concurrent) ────────────────────────────────

      const profile = await this.getUserEngagementProfile(criteria.user_id);

      const checks = await Promise.all([
        this.checkPriorityThreshold(criteria, smartFiltering),
        this.checkCategoryRelevance(criteria, smartFiltering, profile),
        this.checkKeywordRelevance(criteria, smartFiltering),
        this.checkSponsorRelevance(criteria, smartFiltering, profile),
        this.checkTagRelevance(criteria, smartFiltering, profile),
        this.checkInterestBasedRelevance(criteria, smartFiltering),
      ]);

      // ── 4. Combine ───────────────────────────────────────────────────────

      return this.combineFilterResults(checks, criteria, preferences);

    } catch (err: unknown) {
      log('error', 'Error during smart filtering — failing open', {
        ...ctx, err: String(err),
      });
      return {
        shouldNotify:        true,
        confidence:          0.3,
        reasons:             ['Filtering error occurred — allowing notification'],
        suggestedPriority:   criteria.priority,
        recommendedChannels: this.getEnabledChannels(criteria.userPreferences),
        shouldBatch:         false,
      };
    }
  }

  // ── Individual checks ──────────────────────────────────────────────────────

  /** Check 1 — Is this notification type enabled in the user's preferences? */
  private checkNotificationTypeEnabled(
    criteria:    FilterCriteria,
    preferences: CombinedBillTrackingPreferences,
  ): CheckResult {
    type TrackingKey = 'statusChanges' | 'newComments' | 'amendments' | 'votingSchedule';

    let enabled  = false;
    let typeKey: TrackingKey | null = null;

    switch (criteria.notificationType) {
      case 'bill_update':
        if      (criteria.subType === 'status_change')    typeKey = 'statusChanges';
        else if (criteria.subType === 'new_comment')      typeKey = 'newComments';
        else if (criteria.subType === 'amendment')        typeKey = 'amendments';
        else if (criteria.subType === 'voting_scheduled') typeKey = 'votingSchedule';
        break;
      case 'comment_reply':
        typeKey = 'newComments';
        break;
      // System, verification, digest are implicitly enabled when channels are configured
      case 'system_alert':
      case 'verification_status':
      case 'digest':
        enabled = true;
        break;
    }

    if (typeKey) {
      enabled = preferences.tracking_types?.includes(typeKey) ?? false;
    }

    const label  = criteria.subType ?? criteria.notificationType;
    const reason = enabled
      ? `Notification type '${label}' is enabled.`
      : `Notification type '${label}' is disabled.`;

    return { shouldNotify: enabled, confidence: 1.0, reasons: [reason] };
  }

  /** Check 2 — Is the current server time within the user's quiet hours? */
  private checkQuietHours(preferences: CombinedBillTrackingPreferences): CheckResult {
    const qh = preferences.quietHours;
    if (!qh?.enabled) {
      return { shouldNotify: true, confidence: 1.0, reasons: ['Quiet hours not enabled'] };
    }

    try {
      const now        = new Date();
      const nowMins    = now.getHours() * 60 + now.getMinutes();

      // .split(':').map(Number) produces (number | undefined)[] — guard with ?? 0
      const [rawSH, rawSM] = qh.startTime.split(':').map(Number);
      const [rawEH, rawEM] = qh.endTime.split(':').map(Number);
      const startMins      = (rawSH ?? 0) * 60 + (rawSM ?? 0);
      const endMins        = (rawEH ?? 0) * 60 + (rawEM ?? 0);

      // Same-day window (e.g. 09:00–17:00) vs midnight-spanning (e.g. 22:00–08:00)
      const inQuiet = startMins <= endMins
        ? nowMins >= startMins && nowMins < endMins
        : nowMins >= startMins || nowMins < endMins;

      const reason = inQuiet
        ? `Currently within quiet hours (${qh.startTime}–${qh.endTime}).`
        : 'Outside quiet hours.';

      return { shouldNotify: !inQuiet, confidence: 1.0, reasons: [reason] };

    } catch (err: unknown) {
      log('error', 'Error parsing quiet hours — failing open', {
        component: 'SmartFilter',
        quietHours: String(qh),
        err: String(err),
      });
      return { shouldNotify: true, confidence: 0.5, reasons: ['Could not determine quiet hours status'] };
    }
  }

  /** Check 3 — Does the notification priority meet the user's threshold? */
  private checkPriorityThreshold(
    criteria:       FilterCriteria,
    smartFiltering: CombinedBillTrackingPreferences['smartFiltering'],
  ): CheckResult {
    const vals: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
    const threshold = vals[smartFiltering.priorityThreshold ?? 'low'] ?? 1;
    const actual    = vals[criteria.priority] ?? 1;
    const passes    = actual >= threshold;

    return {
      shouldNotify: passes,
      confidence:   1.0,
      reasons: [passes
        ? `Priority '${criteria.priority}' meets threshold '${smartFiltering.priorityThreshold}'.`
        : `Priority '${criteria.priority}' is below threshold '${smartFiltering.priorityThreshold}'.`],
    };
  }

  /** Check 4 — Is the bill's category relevant? */
  private checkCategoryRelevance(
    criteria:       FilterCriteria,
    smartFiltering: CombinedBillTrackingPreferences['smartFiltering'],
    profile:        UserEngagementProfile,
  ): CheckResult {
    const category = criteria.category?.toLowerCase();
    if (!category) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['Notification has no category'] };
    }

    // Explicit allowlist takes precedence
    const explicit = smartFiltering.categoryFilters?.map((f) => f.toLowerCase()) ?? [];
    if (explicit.length > 0) {
      const allowed = explicit.includes(category);
      return {
        shouldNotify: allowed,
        confidence:   1.0,
        reasons: [allowed
          ? `Category '${criteria.category}' matches user filter list.`
          : `Category '${criteria.category}' blocked by user filter list.`],
      };
    }

    // Engagement score fallback
    const match = profile.topCategories.find((c) => c.category.toLowerCase() === category);
    if (match) {
      const relevant   = match.score > 20;
      const confidence = Math.min(1.0, match.score / 50);
      return {
        shouldNotify: relevant,
        confidence,
        reasons: [relevant
          ? `Category '${criteria.category}' relevant by engagement (score: ${match.score.toFixed(0)}).`
          : `Category '${criteria.category}' has low engagement score (${match.score.toFixed(0)}).`],
      };
    }

    return {
      shouldNotify: true,
      confidence:   0.4,
      reasons: [`Category '${criteria.category}' not filtered or engaged with.`],
    };
  }

  /** Check 5 — Does notification content match any keyword filters? */
  private checkKeywordRelevance(
    criteria:       FilterCriteria,
    smartFiltering: CombinedBillTrackingPreferences['smartFiltering'],
  ): CheckResult {
    const filters = smartFiltering.keywordFilters?.map((f) => f.toLowerCase()) ?? [];
    if (filters.length === 0) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No keyword filters set'] };
    }
    if (!criteria.content) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['No content to check keywords against'] };
    }

    const text    = `${criteria.content.title} ${criteria.content.message}`.toLowerCase();
    const matched = filters.filter((kw) => text.includes(kw));
    const passes  = matched.length > 0;

    return {
      shouldNotify: passes,
      confidence:   1.0,
      reasons: [passes
        ? `Content matched keywords: [${matched.join(', ')}].`
        : 'Content did not match any keyword filters.'],
    };
  }

  /** Check 6 — Is the bill's sponsor relevant? */
  private checkSponsorRelevance(
    criteria:       FilterCriteria,
    smartFiltering: CombinedBillTrackingPreferences['smartFiltering'],
    profile:        UserEngagementProfile,
  ): CheckResult {
    const name = criteria.sponsorName?.toLowerCase();
    if (!name) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['Notification has no sponsor info'] };
    }

    const explicit = smartFiltering.sponsorFilters?.map((f) => f.toLowerCase()) ?? [];
    if (explicit.length > 0) {
      const allowed = explicit.includes(name);
      return {
        shouldNotify: allowed,
        confidence:   1.0,
        reasons: [allowed
          ? `Sponsor '${criteria.sponsorName}' matches user filter list.`
          : `Sponsor '${criteria.sponsorName}' blocked by user filter list.`],
      };
    }

    const match = profile.topSponsors.find((s) => s.name.toLowerCase() === name);
    if (match) {
      const relevant   = match.score > 15;
      const confidence = Math.min(1.0, match.score / 40);
      return {
        shouldNotify: relevant,
        confidence,
        reasons: [relevant
          ? `Sponsor '${criteria.sponsorName}' relevant by engagement (score: ${match.score.toFixed(0)}).`
          : `Sponsor '${criteria.sponsorName}' has low engagement score (${match.score.toFixed(0)}).`],
      };
    }

    return {
      shouldNotify: true,
      confidence:   0.4,
      reasons: [`Sponsor '${criteria.sponsorName}' not filtered or engaged with.`],
    };
  }

  /**
   * Check 7 — Are the bill's tags relevant?
   *
   * Tag DB queries are omitted because bill_tags is not yet in the schema.
   * Profile topTags will always be [] until that table is added; in the
   * meantime, keyword filters serve as a tag allowlist.
   */
  private checkTagRelevance(
    criteria:       FilterCriteria,
    smartFiltering: CombinedBillTrackingPreferences['smartFiltering'],
    profile:        UserEngagementProfile,
  ): CheckResult {
    const tags = criteria.tags?.map((t) => t.toLowerCase()) ?? [];
    if (tags.length === 0) {
      return { shouldNotify: true, confidence: 0.5, reasons: ['Notification has no tags'] };
    }

    // Keywords can double as tag allowlist
    const kwFilters = smartFiltering.keywordFilters?.map((f) => f.toLowerCase()) ?? [];
    if (kwFilters.length > 0) {
      const matched = tags.filter((t) => kwFilters.includes(t));
      if (matched.length > 0) {
        return {
          shouldNotify: true,
          confidence:   0.9,
          reasons: [`Bill tags match keyword filters: [${matched.join(', ')}]`],
        };
      }
    }

    // Engagement score fallback (topTags is [] until bill_tags schema exists)
    const profileMatches = profile.topTags.filter((pt) => tags.includes(pt.tag.toLowerCase()));
    if (profileMatches.length > 0) {
      const maxScore  = Math.max(...profileMatches.map((pt) => pt.score));
      const relevant  = maxScore > 25;
      const confidence = Math.min(1.0, maxScore / 60);
      const matched   = profileMatches.filter((pt) => pt.score > 25).map((pt) => pt.tag);
      return {
        shouldNotify: relevant,
        confidence,
        reasons: [relevant
          ? `Bill tags relevant by engagement (matched: [${matched.join(', ')}], max score: ${maxScore.toFixed(0)}).`
          : `Bill tags have low engagement scores (max score: ${maxScore.toFixed(0)}).`],
      };
    }

    return {
      shouldNotify: true,
      confidence:   0.4,
      reasons: ['Bill tags not filtered or engaged with.'],
    };
  }

  /** Check 8 — Does the bill match the user's declared interests? */
  private async checkInterestBasedRelevance(
    criteria:       FilterCriteria,
    smartFiltering: CombinedBillTrackingPreferences['smartFiltering'],
  ): Promise<CheckResult> {
    if (!smartFiltering.interestBasedFiltering || !criteria.bill_id) {
      return {
        shouldNotify: true,
        confidence:   0.5,
        reasons: ['Interest-based filtering disabled or no bill ID'],
      };
    }

    try {
      const rows = await this.database
        .select({ interest: user_interests.interest })
        .from(user_interests)
        .where(eq(user_interests.user_id, criteria.user_id));

      const interests = rows.map((r: { interest: string }) => r.interest.toLowerCase());

      if (interests.length === 0) {
        return { shouldNotify: true, confidence: 0.5, reasons: ['User has no configured interests'] };
      }

      const billData = await this.getBillCategory(criteria.bill_id);
      if (!billData) {
        return { shouldNotify: true, confidence: 0.5, reasons: ['Could not retrieve bill data for interest check'] };
      }

      const categoryMatch = billData.category && interests.includes(billData.category.toLowerCase());

      if (categoryMatch) {
        return {
          shouldNotify: true,
          confidence:   0.9,
          reasons: [`Bill matches user interest: category '${billData.category ?? ''}'`],
        };
      }

      return {
        shouldNotify: false,
        confidence:   1.0,
        reasons: ["Bill does not match user's configured interests"],
      };

    } catch (err: unknown) {
      log('error', 'Error in interest-based relevance check — failing open', {
        component: 'SmartFilter',
        user_id:   criteria.user_id,
        bill_id:   criteria.bill_id,
        err:       String(err),
      });
      return {
        shouldNotify: true,
        confidence:   0.5,
        reasons: ['Error during interest check — allowing notification'],
      };
    }
  }

  // ── Combining logic ────────────────────────────────────────────────────────

  private combineFilterResults(
    checks:      CheckResult[],
    criteria:    FilterCriteria,
    preferences: CombinedBillTrackingPreferences,
  ): FilterResult {
    const blocking = checks.find((c) => !c.shouldNotify);

    if (blocking) {
      // Urgent notifications bypass relevance-based blocks but NOT
      // type-disabled or quiet-hours blocks.
      const canBypass =
        criteria.priority === 'urgent' &&
        !blocking.reasons.some(
          (r) => r.includes('disabled') || r.includes('quiet hours'),
        );

      if (!canBypass) {
        log('debug', 'Notification blocked', {
          component: 'SmartFilter',
          user_id:   criteria.user_id,
          reasons:   blocking.reasons,
        });
        return {
          shouldNotify:        false,
          confidence:          blocking.confidence,
          reasons:             blocking.reasons,
          suggestedPriority:   'low',
          recommendedChannels: [],
          shouldBatch:         false,
        };
      }

      log('debug', `Urgent notification bypassing filter: ${blocking.reasons.join('; ')}`, {
        component: 'SmartFilter',
        user_id:   criteria.user_id,
      });
    }

    // All checks passed (or bypassed) — aggregate confidence & channels
    const passing       = checks.filter((c) => c.shouldNotify);
    const avgConfidence = passing.length > 0
      ? passing.reduce((sum, c) => sum + c.confidence, 0) / passing.length
      : 0.5;

    const reasons = [...new Set(passing.flatMap((c) => c.reasons))];

    let suggestedPriority = criteria.priority;
    if (avgConfidence > 0.8 && criteria.priority === 'medium') suggestedPriority = 'high';
    else if (avgConfidence < 0.4 && criteria.priority === 'medium') suggestedPriority = 'low';

    const recommendedChannels = this.determineChannels(avgConfidence, suggestedPriority, preferences);
    const shouldBatch =
      preferences.alert_frequency !== 'immediate' &&
      suggestedPriority !== 'urgent' &&
      suggestedPriority !== 'high';

    log('debug', 'Notification allowed', {
      component:  'SmartFilter',
      user_id:    criteria.user_id,
      confidence: avgConfidence,
      priority:   suggestedPriority,
      channels:   recommendedChannels,
      batch:      shouldBatch,
    });

    return {
      shouldNotify:        true,
      confidence:          parseFloat(avgConfidence.toFixed(2)),
      reasons,
      suggestedPriority,
      recommendedChannels,
      shouldBatch,
    };
  }

  // ── Channel recommendation ─────────────────────────────────────────────────

  private determineChannels(
    confidence: number,
    priority:   FilterResult['suggestedPriority'],
    prefs:      CombinedBillTrackingPreferences,
  ): FilterResult['recommendedChannels'] {
    const ch      = prefs.notificationChannels;
    const result: FilterResult['recommendedChannels'] = [];

    if (ch.inApp) result.push('inApp');
    if (ch.push  && (confidence > 0.6  || priority === 'high' || priority === 'urgent')) result.push('push');
    if (ch.email && (confidence > 0.75 || priority === 'high' || priority === 'urgent')) result.push('email');
    if (ch.sms   && priority === 'urgent') result.push('sms');

    if (result.length === 0) {
      const first = this.getEnabledChannels(prefs)[0];
      if (first) return [first];
    }

    return result;
  }

  private getEnabledChannels(prefs: CombinedBillTrackingPreferences): FilterResult['recommendedChannels'] {
    return (Object.entries(prefs.notificationChannels) as Array<[string, boolean]>)
      .filter(([, enabled]) => enabled)
      .map(([ch]) => ch as FilterResult['recommendedChannels'][number]);
  }

  // ── Engagement profile ─────────────────────────────────────────────────────

  private async getUserEngagementProfile(user_id: string): Promise<UserEngagementProfile> {
    const key = CACHE_KEYS.USER_ENGAGEMENT_PROFILE(user_id);
    try {
      const cached = await this.cacheService.get(key) as UserEngagementProfile | null;
      if (cached) {
        log('debug', `Cache hit for engagement profile: ${key}`);
        return cached;
      }
      log('debug', `Cache miss for engagement profile: ${key}`);
      const profile = await this.buildEngagementProfile(user_id);
      await this.cacheService.set(key, profile, this.CACHE_DURATION_PROFILE);
      return profile;
    } catch (err: unknown) {
      log('error', `Error loading engagement profile for user ${user_id}`, {
        component: 'SmartFilter',
        err: String(err),
      });
      return this.defaultProfile(user_id);
    }
  }

  private async buildEngagementProfile(user_id: string): Promise<UserEngagementProfile> {
    log('debug', `Building engagement profile for user ${user_id}`);
    try {
      const history = await this.database
        .select({
          bill_id:          bill_engagement.bill_id,
          engagement_score: bill_engagement.engagement_score,
          lastEngaged:      bill_engagement.last_engaged_at,
          billCategory:     bills.category,
        })
        .from(bill_engagement)
        .innerJoin(bills, eq(bill_engagement.bill_id, bills.id))
        .where(eq(bill_engagement.user_id, user_id))
        .orderBy(desc(bill_engagement.last_engaged_at))
        .limit(100);

      return {
        user_id,
        topCategories:  this.analyzeCategoryEngagement(history),
        topSponsors:    await this.analyzeSponsorEngagement(user_id, history),
        topTags:        [], // bill_tags table not yet in schema
        engagementLevel: this.calculateEngagementLevel(history),
      };

    } catch (err: unknown) {
      log('error', `Error building engagement profile for user ${user_id}`, {
        component: 'SmartFilter',
        err: String(err),
      });
      return this.defaultProfile(user_id);
    }
  }

  private defaultProfile(user_id: string): UserEngagementProfile {
    return { user_id, topCategories: [], topSponsors: [], topTags: [], engagementLevel: 'low' };
  }

  private analyzeCategoryEngagement(
    history: Array<{ billCategory: string | null; engagement_score: string | null }>,
  ): UserEngagementProfile['topCategories'] {
    const map = new Map<string, number>();
    for (const e of history) {
      const cat   = e.billCategory ?? 'Uncategorized';
      const score = parseFloat(e.engagement_score ?? '0') || 0;
      map.set(cat, (map.get(cat) ?? 0) + Math.max(1, score));
    }
    return Array.from(map.entries())
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  private async analyzeSponsorEngagement(
    user_id: string,
    history: Array<{ bill_id: number; engagement_score: string | null }>,
  ): Promise<UserEngagementProfile['topSponsors']> {
    if (history.length === 0) return [];

    const billIds = [...new Set(history.map((e) => e.bill_id))];

    try {
      const rows = await this.database
        .select({
          sponsor_id:       sponsors.id,
          sponsorName:      sponsors.name,
          bill_id:          bill_sponsorships.bill_id,
          sponsorshipType:  bill_sponsorships.sponsorship_type,
        })
        .from(bill_sponsorships)
        .innerJoin(sponsors, eq(bill_sponsorships.sponsor_id, sponsors.id))
        .where(
          and(
            inArray(bill_sponsorships.bill_id, billIds),
            eq(bill_sponsorships.is_active, true),
          ),
        );

      type SponsorRow = {
        sponsor_id:      number;
        sponsorName:     string;
        bill_id:         number;
        sponsorshipType: string;
      };

      const engMap   = new Map(history.map((e) => [e.bill_id, parseFloat(e.engagement_score ?? '0') || 0]));
      const scoreMap = new Map<number, { name: string; score: number }>();

      for (const sp of rows as SponsorRow[]) {
        const eng = engMap.get(sp.bill_id) ?? 0;
        if (eng <= 0) continue;
        const multiplier = sp.sponsorshipType === 'primary' ? 1.5 : 1.0;
        const current    = scoreMap.get(sp.sponsor_id) ?? { name: sp.sponsorName, score: 0 };
        scoreMap.set(sp.sponsor_id, {
          name:  sp.sponsorName,
          score: current.score + Math.max(1, eng) * multiplier,
        });
      }

      return Array.from(scoreMap.entries())
        .map(([sponsor_id, data]) => ({ sponsor_id, name: data.name, score: data.score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    } catch (err: unknown) {
      log('error', `Error analyzing sponsor engagement for user ${user_id}`, {
        component: 'SmartFilter',
        err: String(err),
      });
      return [];
    }
  }

  private calculateEngagementLevel(
    history: Array<{ engagement_score: string | null }>,
  ): 'low' | 'medium' | 'high' {
    if (history.length < 3) return 'low';
    const total = history.reduce((sum, e) => sum + (parseFloat(e.engagement_score ?? '0') || 0), 0);
    const avg   = total / history.length;
    if (avg > 40) return 'high';
    if (avg > 15) return 'medium';
    return 'low';
  }

  /**
   * Returns bill category only. Tag lookup is omitted until bill_tags is
   * added to the schema.
   */
  private async getBillCategory(
    bill_id: number,
  ): Promise<{ category: string | null } | null> {
    try {
      const rows = await this.database
        .select({ category: bills.category })
        .from(bills)
        .where(eq(bills.id, bill_id))
        .limit(1) as any[];
      const row = rows[0];
      return row ?? null;
    } catch (err: unknown) {
      log('error', `Error fetching category for bill ${bill_id}`, {
        component: 'SmartFilter',
        err: String(err),
      });
      return null;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Convenience builder for a fully-typed blocked FilterResult. */
  private blockedResult(check: CheckResult, criteria: FilterCriteria): FilterResult {
    return {
      shouldNotify:        false,
      confidence:          check.confidence,
      reasons:             check.reasons,
      suggestedPriority:   criteria.priority,
      recommendedChannels: [],
      shouldBatch:         false,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const smartNotificationFilterService = new SmartNotificationFilterService();