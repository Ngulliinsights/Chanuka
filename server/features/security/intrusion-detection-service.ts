import { logger } from '@shared/core';
import { database as db } from '@shared/database';
import { desc,eq, gt, sql } from 'drizzle-orm';
import { boolean,integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { Request } from 'express';

import { securityAuditService } from './security-audit-service';

// ----------------------------------------------------------------------
// 1. Database Schema Definitions
// ----------------------------------------------------------------------

export const threatIntelligence = pgTable("threat_intelligence", {
  id: serial("id").primaryKey(),
  ip_address: text("ip_address").notNull(),
  threatType: text("threat_type").notNull(), // malicious_ip, bot, scanner, etc.
  severity: text("severity").notNull(),
  source: text("source").notNull(), // internal, external_feed, manual
  firstSeen: timestamp("first_seen").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  occurrences: integer("occurrences").default(1),
  blocked: boolean("blocked").default(false),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
});

export const attackPatterns = pgTable("attack_patterns", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  type: text("type").notNull(), // sql_injection, xss, etc.
  description: text("description"),
  severity: text("severity").notNull(),
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// ----------------------------------------------------------------------
// 2. Types & Interfaces
// ----------------------------------------------------------------------

export interface ThreatDetectionResult {
  action: 'allow' | 'block' | 'flag';
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown>;
}

interface IPTracking {
  count: number;
  lastReset: number;
  violations: number;
}

interface IntrusionStats {
  count: number;
  threatType: string;
  severity: string;
}

// ----------------------------------------------------------------------
// 3. The Optimized Service
// ----------------------------------------------------------------------

export class IntrusionDetectionService {
  private static instance: IntrusionDetectionService;

  // Memory Management: Map with auto-cleanup to prevent leaks
  private ipRequestCounts = new Map<string, IPTracking>();
  private blockedIPs = new Set<string>();
  private cleanupInterval: NodeJS.Timeout;

  // Configuration
  private readonly config = {
    requestThreshold: 200, // Requests per minute (High to avoid false positives on assets)
    cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    violationThreshold: 3 // Block after 3 detected malicious payloads
  };

  /**
   * Consolidated Regex Patterns
   * Compiled once at startup for O(1) access.
   * Fixed: Removed unnecessary escape characters.
   */
  private readonly patterns = {
    sqlInjection: /(union[\s+]+select|drop[\s+]+table|exec[\s+]+xp_|script[\s+]+alert|waitfor[\s+]+delay|benchmark\()/i,
    xss: /(<script|javascript:|onload=|onerror=|eval\(|vbscript:|data:text\/html)/i,
    pathTraversal: /(\.\.\/|\.\.\\|%2e%2e%2f|\/etc\/passwd|c:\\windows\\system32)/i,
    commandInjection: /[;&|`$]|\b(rm|del|mkfs|wget|curl|nc|netcat|bash|sh|cmd|powershell|python|perl|whoami)\b/i,
    envManipulation: /\b(export|set|env|PATH|LD_LIBRARY_PATH)\b/i,
    prototypePollution: /(__proto__|prototype|constructor)/i
  };

  private constructor() {
    // Start Garbage Collection
    this.cleanupInterval = setInterval(() => this.runCleanup(), this.config.cleanupIntervalMs);
  }

  public static getInstance(): IntrusionDetectionService {
    if (!IntrusionDetectionService.instance) {
      IntrusionDetectionService.instance = new IntrusionDetectionService();
    }
    return IntrusionDetectionService.instance;
  }

  /**
   * Graceful Shutdown
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Main Analysis Pipeline
   */
  async analyzeRequest(req: Request): Promise<ThreatDetectionResult> {
    const ip = this.getClientIP(req);

    // 1. Blocklist Check (Fastest)
    if (this.blockedIPs.has(ip)) {
      return { action: 'block', reason: 'IP is currently in blocklist', severity: 'high' };
    }

    // 2. Rate Limit & Behavioral Analysis (In-Memory)
    if (this.checkRateLimit(ip)) {
      await this.blockIP(ip, 'Rate limit exceeded (DoS behavior)');
      return { action: 'block', reason: 'Rate limit exceeded', severity: 'medium' };
    }

    // 3. Payload Inspection (CPU Intensive - Skip for GET if possible, or keep light)
    // We inspect query params, body, and headers
    const payload = JSON.stringify(req.body || {}) + JSON.stringify(req.query || {}) + (req.headers['user-agent'] || '');

    // Only scan if payload exists and isn't empty JSON
    if (payload.length > 4) {
      const threat = this.detectPatterns(payload);
      if (threat.detected) {
        await this.handleViolation(ip, threat.type!, req);
        return {
          action: 'block',
          reason: `Malicious payload detected: ${threat.type}`,
          severity: 'critical',
          details: { pattern: threat.type }
        };
      }
    }

    return { action: 'allow' };
  }

  private detectPatterns(content: string): { detected: boolean; type?: string } {
    if (this.patterns.sqlInjection.test(content)) return { detected: true, type: 'SQL Injection' };
    if (this.patterns.xss.test(content)) return { detected: true, type: 'XSS' };
    if (this.patterns.pathTraversal.test(content)) return { detected: true, type: 'Path Traversal' };
    if (this.patterns.commandInjection.test(content)) return { detected: true, type: 'Command Injection' };
    if (this.patterns.prototypePollution.test(content)) return { detected: true, type: 'Prototype Pollution' };
    if (this.patterns.envManipulation.test(content)) return { detected: true, type: 'Environment Manipulation' };

    return { detected: false };
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    let tracker = this.ipRequestCounts.get(ip);

    if (!tracker || (now - tracker.lastReset > 60000)) {
      tracker = { count: 1, lastReset: now, violations: tracker?.violations || 0 };
      this.ipRequestCounts.set(ip, tracker);
      return false;
    }

    tracker.count++;
    return tracker.count > this.config.requestThreshold;
  }

  private async handleViolation(ip: string, threatType: string, req: Request) {
    const tracker = this.ipRequestCounts.get(ip) || { count: 0, lastReset: Date.now(), violations: 0 };
    tracker.violations++;
    this.ipRequestCounts.set(ip, tracker);

    await securityAuditService.logSecurityEvent({
      event_type: 'threat_detected',
      severity: 'critical',
      ip_address: ip,
      action: 'block',
      result: 'blocked',
      success: false,
      resource: req.path,
      details: { threatType, userAgent: req.headers['user-agent'] }
    });

    // Log to Threat Intelligence DB
    try {
      await db.insert(threatIntelligence).values({
        ip_address: ip,
        threatType: threatType,
        severity: 'critical',
        source: 'internal_firewall',
        occurrences: 1,
        blocked: true,
        metadata: { path: req.path, method: req.method }
      });
    } catch (err: unknown) {
      logger.error('Failed to log threat to DB', {
        error: err instanceof Error ? err.message : String(err)
      });
    }

    if (tracker.violations >= 1) {
      await this.blockIP(ip, `Repeated violations: ${threatType}`);
    }
  }

  async blockIP(ip: string, reason: string): Promise<void> {
    if (this.blockedIPs.has(ip)) return;

    this.blockedIPs.add(ip);
    logger.warn(`🚫 Blocking IP ${ip}: ${reason}`);

    setTimeout(() => {
      this.blockedIPs.delete(ip);
      logger.info(`🔓 Unblocking IP ${ip} after timeout`);
    }, this.config.blockDurationMs);
  }

  private runCleanup() {
    const now = Date.now();
    for (const [ip, tracker] of this.ipRequestCounts.entries()) {
      if (now - tracker.lastReset > 300000) {
        this.ipRequestCounts.delete(ip);
      }
    }
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
  }

  /**
   * Generate Report
   * Used by Admin Dashboard
   * Fixed: Now uses 'days' parameter to filter results
   */
  async generateIntrusionReport(days = 7): Promise<{ generatedAt: Date; period: string; stats: IntrusionStats[] } | { error: string }> {
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const stats = await db.select({
        count: sql<number>`count(*)`.mapWith(Number),
        threatType: threatIntelligence.threatType,
        severity: threatIntelligence.severity
      })
        .from(threatIntelligence)
        .where(gt(threatIntelligence.created_at, fromDate))
        .groupBy(threatIntelligence.threatType, threatIntelligence.severity)
        .orderBy(desc(sql`count(*)`));

      return {
        generatedAt: new Date(),
        period: `${days} days`,
        stats: stats as IntrusionStats[]
      };
    } catch (error) {
      logger.error('Error generating intrusion report', { error });
      return { error: 'Failed to generate report' };
    }
  }
}

export const intrusionDetectionService = IntrusionDetectionService.getInstance();