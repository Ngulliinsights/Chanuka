import { advancedCachingService } from './advanced-caching.js';
import { database as db, bills, sponsors, users, billComments } from '../../../shared/database/connection.js';
import { desc, eq, sql, and } from 'drizzle-orm';
import { logger } from '@shared/core/src/observability/logging';

export interface WarmingRule {
  id: string;
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  schedule: 'startup' | 'hourly' | 'daily' | 'weekly';
  enabled: boolean;
  cacheKey: string;
  ttl: number; // seconds
  fetchFunction: () => Promise<any>;
  dependencies?: string[];
  conditions?: {
    timeRange?: { start: string; end: string };
    userActivity?: 'high' | 'medium' | 'low';
    systemLoad?: 'low' | 'medium' | 'high';
  };
}

export interface WarmingStats {
  totalRules: number;
  activeRules: number;
  lastWarmingTime: Date | null;
  warmingDuration: number; // milliseconds
  successfulWarmings: number;
  failedWarmings: number;
  cacheHitImprovement: number; // percentage
  rulesExecuted: Array<{
    ruleId: string;
    ruleName: string;
    duration: number;
    success: boolean;
    timestamp: Date;
    cacheKey: string;
  }>;
}

export class CacheWarmingService {
  private warmingRules: Map<string, WarmingRule> = new Map();
  private stats: WarmingStats = {
    totalRules: 0,
    activeRules: 0,
    lastWarmingTime: null,
    warmingDuration: 0,
    successfulWarmings: 0,
    failedWarmings: 0,
    cacheHitImprovement: 0,
    rulesExecuted: []
  };

  private isWarming = false;
  private warmingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.scheduleWarmingTasks();
  }

  /**
   * Add a cache warming rule
   */
  addWarmingRule(rule: WarmingRule): void {
    this.warmingRules.set(rule.id, rule);
    this.stats.totalRules = this.warmingRules.size;
    this.stats.activeRules = Array.from(this.warmingRules.values()).filter(r => r.enabled).length;

    // Schedule the rule if it has a recurring schedule
    this.scheduleRule(rule);

    console.log(`[Cache Warming] Added warming rule: ${rule.name}`);
  }

  /**
   * Remove a cache warming rule
   */
  removeWarmingRule(ruleId: string): boolean {
    const rule = this.warmingRules.get(ruleId);
    if (!rule) return false;

    // Clear any scheduled intervals
    const interval = this.warmingIntervals.get(ruleId);
    if (interval) {
      clearInterval(interval);
      this.warmingIntervals.delete(ruleId);
    }

    this.warmingRules.delete(ruleId);
    this.stats.totalRules = this.warmingRules.size;
    this.stats.activeRules = Array.from(this.warmingRules.values()).filter(r => r.enabled).length;

    console.log(`[Cache Warming] Removed warming rule: ${rule.name}`);
    return true;
  }

  /**
   * Execute cache warming for all enabled rules
   */
  async executeWarmingCycle(priority?: 'critical' | 'high' | 'medium' | 'low'): Promise<void> {
    if (this.isWarming) {
      logger.info('[Cache Warming] Warming cycle already in progress, skipping', { component: 'Chanuka' });
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();

    logger.info('[Cache Warming] Starting cache warming cycle...', { component: 'Chanuka' });

    try {
      // Get enabled rules, optionally filtered by priority
      let rulesToExecute = Array.from(this.warmingRules.values())
        .filter(rule => rule.enabled);

      if (priority) {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        rulesToExecute = rulesToExecute.filter(rule => 
          priorityOrder[rule.priority] >= priorityOrder[priority]
        );
      }

      // Sort by priority
      rulesToExecute.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Execute rules
      const results = await Promise.allSettled(
        rulesToExecute.map(rule => this.executeWarmingRule(rule))
      );

      // Update statistics
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.stats.successfulWarmings++;
        } else {
          this.stats.failedWarmings++;
          console.error(`[Cache Warming] Rule failed: ${rulesToExecute[index].name}`, result.reason);
        }
      });

      this.stats.lastWarmingTime = new Date();
      this.stats.warmingDuration = Date.now() - startTime;

      console.log(`[Cache Warming] Completed warming cycle in ${this.stats.warmingDuration}ms`);
      console.log(`[Cache Warming] Success: ${this.stats.successfulWarmings}, Failed: ${this.stats.failedWarmings}`);

    } catch (error) {
      logger.error('[Cache Warming] Error during warming cycle:', { component: 'Chanuka' }, error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Execute a specific warming rule
   */
  async executeWarmingRule(rule: WarmingRule): Promise<void> {
    const startTime = Date.now();

    try {
      // Check conditions if specified
      if (rule.conditions && !this.checkConditions(rule.conditions)) {
        console.log(`[Cache Warming] Skipping rule ${rule.name} - conditions not met`);
        return;
      }

      // Execute the fetch function
      const data = await rule.fetchFunction();

      // Cache the result
      await advancedCachingService.set(rule.cacheKey, data, rule.ttl);

      const duration = Date.now() - startTime;

      // Record execution
      this.stats.rulesExecuted.push({
        ruleId: rule.id,
        ruleName: rule.name,
        duration,
        success: true,
        timestamp: new Date(),
        cacheKey: rule.cacheKey
      });

      // Keep only recent executions
      if (this.stats.rulesExecuted.length > 1000) {
        this.stats.rulesExecuted = this.stats.rulesExecuted.slice(-500);
      }

      console.log(`[Cache Warming] ✅ Warmed cache for ${rule.name} (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;

      this.stats.rulesExecuted.push({
        ruleId: rule.id,
        ruleName: rule.name,
        duration,
        success: false,
        timestamp: new Date(),
        cacheKey: rule.cacheKey
      });

      console.error(`[Cache Warming] ❌ Failed to warm cache for ${rule.name}:`, error);
      throw error;
    }
  }

  /**
   * Get warming statistics
   */
  getWarmingStats(): WarmingStats {
    return { ...this.stats };
  }

  /**
   * Get all warming rules
   */
  getWarmingRules(): WarmingRule[] {
    return Array.from(this.warmingRules.values());
  }

  /**
   * Enable/disable a warming rule
   */
  toggleWarmingRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.warmingRules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    this.stats.activeRules = Array.from(this.warmingRules.values()).filter(r => r.enabled).length;

    if (enabled) {
      this.scheduleRule(rule);
    } else {
      const interval = this.warmingIntervals.get(ruleId);
      if (interval) {
        clearInterval(interval);
        this.warmingIntervals.delete(ruleId);
      }
    }

    console.log(`[Cache Warming] ${enabled ? 'Enabled' : 'Disabled'} rule: ${rule.name}`);
    return true;
  }

  /**
   * Warm cache on application startup
   */
  async warmOnStartup(): Promise<void> {
    logger.info('[Cache Warming] Executing startup cache warming...', { component: 'Chanuka' });
    
    const startupRules = Array.from(this.warmingRules.values())
      .filter(rule => rule.enabled && rule.schedule === 'startup');

    if (startupRules.length === 0) {
      logger.info('[Cache Warming] No startup warming rules configured', { component: 'Chanuka' });
      return;
    }

    await this.executeWarmingCycle('critical');
  }

  /**
   * Initialize default warming rules
   */
  private initializeDefaultRules(): void {
    // Popular bills warming rule
    this.addWarmingRule({
      id: 'popular_bills',
      name: 'Popular Bills',
      description: 'Cache most viewed and commented bills',
      priority: 'high',
      schedule: 'hourly',
      enabled: true,
      cacheKey: 'bills:popular',
      ttl: 3600, // 1 hour
      fetchFunction: async () => {
        try {
          return await db
            .select()
            .from(bills)
            .orderBy(desc(bills.viewCount))
            .limit(50);
        } catch (error) {
          logger.error('Error fetching popular bills:', { component: 'Chanuka' }, error);
          return [];
        }
      }
    });

    // Recent bills warming rule
    this.addWarmingRule({
      id: 'recent_bills',
      name: 'Recent Bills',
      description: 'Cache recently introduced bills',
      priority: 'high',
      schedule: 'hourly',
      enabled: true,
      cacheKey: 'bills:recent',
      ttl: 1800, // 30 minutes
      fetchFunction: async () => {
        try {
          return await db
            .select()
            .from(bills)
            .orderBy(desc(bills.introducedDate))
            .limit(30);
        } catch (error) {
          logger.error('Error fetching recent bills:', { component: 'Chanuka' }, error);
          return [];
        }
      }
    });

    // Active sponsors warming rule
    this.addWarmingRule({
      id: 'active_sponsors',
      name: 'Active Sponsors',
      description: 'Cache active sponsor information',
      priority: 'medium',
      schedule: 'daily',
      enabled: true,
      cacheKey: 'sponsors:active',
      ttl: 7200, // 2 hours
      fetchFunction: async () => {
        try {
          return await db
            .select()
            .from(sponsors)
            .where(eq(sponsors.isActive, true))
            .limit(100);
        } catch (error) {
          logger.error('Error fetching active sponsors:', { component: 'Chanuka' }, error);
          return [];
        }
      }
    });

    // Bill categories warming rule
    this.addWarmingRule({
      id: 'bill_categories',
      name: 'Bill Categories',
      description: 'Cache bill category statistics',
      priority: 'medium',
      schedule: 'daily',
      enabled: true,
      cacheKey: 'bills:categories',
      ttl: 14400, // 4 hours
      fetchFunction: async () => {
        try {
          const result = await db
            .select({
              category: bills.category,
              count: sql<number>`count(*)`.as('count')
            })
            .from(bills)
            .groupBy(bills.category)
            .orderBy(sql`count(*) desc`);
          
          return result;
        } catch (error) {
          logger.error('Error fetching bill categories:', { component: 'Chanuka' }, error);
          return [];
        }
      }
    });

    // User engagement stats warming rule
    this.addWarmingRule({
      id: 'engagement_stats',
      name: 'Engagement Statistics',
      description: 'Cache platform engagement statistics',
      priority: 'low',
      schedule: 'daily',
      enabled: true,
      cacheKey: 'stats:engagement',
      ttl: 21600, // 6 hours
      fetchFunction: async () => {
        try {
          const [userCount, billCount, commentCount] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(users),
            db.select({ count: sql<number>`count(*)` }).from(bills),
            db.select({ count: sql<number>`count(*)` }).from(billComments)
          ]);

          return {
            totalUsers: userCount[0]?.count || 0,
            totalBills: billCount[0]?.count || 0,
            totalComments: commentCount[0]?.count || 0,
            lastUpdated: new Date()
          };
        } catch (error) {
          logger.error('Error fetching engagement stats:', { component: 'Chanuka' }, error);
          return {
            totalUsers: 0,
            totalBills: 0,
            totalComments: 0,
            lastUpdated: new Date()
          };
        }
      }
    });

    // Critical system data warming rule
    this.addWarmingRule({
      id: 'system_critical',
      name: 'Critical System Data',
      description: 'Cache critical system configuration and data',
      priority: 'critical',
      schedule: 'startup',
      enabled: true,
      cacheKey: 'system:critical',
      ttl: 3600, // 1 hour
      fetchFunction: async () => {
        try {
          // Cache critical system configuration
          return {
            systemStatus: 'operational',
            maintenanceMode: false,
            featuresEnabled: {
              comments: true,
              voting: true,
              notifications: true,
              search: true
            },
            lastUpdated: new Date()
          };
        } catch (error) {
          logger.error('Error fetching critical system data:', { component: 'Chanuka' }, error);
          return {
            systemStatus: 'unknown',
            maintenanceMode: false,
            featuresEnabled: {},
            lastUpdated: new Date()
          };
        }
      }
    });

    console.log(`[Cache Warming] Initialized ${this.warmingRules.size} default warming rules`);
  }

  /**
   * Schedule warming tasks based on rule schedules
   */
  private scheduleWarmingTasks(): void {
    // Schedule hourly warming
    setInterval(async () => {
      const hourlyRules = Array.from(this.warmingRules.values())
        .filter(rule => rule.enabled && rule.schedule === 'hourly');
      
      if (hourlyRules.length > 0) {
        logger.info('[Cache Warming] Executing hourly warming cycle...', { component: 'Chanuka' });
        await this.executeWarmingCycle('high');
      }
    }, 3600000); // 1 hour

    // Schedule daily warming
    setInterval(async () => {
      const dailyRules = Array.from(this.warmingRules.values())
        .filter(rule => rule.enabled && rule.schedule === 'daily');
      
      if (dailyRules.length > 0) {
        logger.info('[Cache Warming] Executing daily warming cycle...', { component: 'Chanuka' });
        await this.executeWarmingCycle('medium');
      }
    }, 86400000); // 24 hours

    // Schedule weekly warming
    setInterval(async () => {
      const weeklyRules = Array.from(this.warmingRules.values())
        .filter(rule => rule.enabled && rule.schedule === 'weekly');
      
      if (weeklyRules.length > 0) {
        logger.info('[Cache Warming] Executing weekly warming cycle...', { component: 'Chanuka' });
        await this.executeWarmingCycle('low');
      }
    }, 604800000); // 7 days

    logger.info('[Cache Warming] Scheduled warming tasks', { component: 'Chanuka' });
  }

  /**
   * Schedule individual rule
   */
  private scheduleRule(rule: WarmingRule): void {
    // Clear existing interval if any
    const existingInterval = this.warmingIntervals.get(rule.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Don't schedule startup rules
    if (rule.schedule === 'startup') return;

    let intervalMs: number;
    switch (rule.schedule) {
      case 'hourly':
        intervalMs = 3600000; // 1 hour
        break;
      case 'daily':
        intervalMs = 86400000; // 24 hours
        break;
      case 'weekly':
        intervalMs = 604800000; // 7 days
        break;
      default:
        return;
    }

    const interval = setInterval(async () => {
      if (rule.enabled) {
        try {
          await this.executeWarmingRule(rule);
        } catch (error) {
          console.error(`[Cache Warming] Scheduled execution failed for ${rule.name}:`, error);
        }
      }
    }, intervalMs);

    this.warmingIntervals.set(rule.id, interval);
  }

  /**
   * Check if conditions are met for rule execution
   */
  private checkConditions(conditions: WarmingRule['conditions']): boolean {
    if (!conditions) return true;

    // Check time range
    if (conditions.timeRange) {
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const startTime = parseInt(conditions.timeRange.start.replace(':', ''));
      const endTime = parseInt(conditions.timeRange.end.replace(':', ''));
      
      if (currentTime < startTime || currentTime > endTime) {
        return false;
      }
    }

    // Additional condition checks would go here
    // (user activity, system load, etc.)

    return true;
  }
}

// Export singleton instance
export const cacheWarmingService = new CacheWarmingService();






