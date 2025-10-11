import { Request } from 'express';
import { database as db } from '../../../shared/database/connection.js';
import { securityAuditService, SecurityEvent, SecurityIncident } from './security-audit-service.js';
import { emailService } from './email-service.js';
import { pgTable, text, serial, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';
import { sql, and, gte, count, desc, eq } from 'drizzle-orm';
import { logger }from '../../utils/logger';

// Threat intelligence table
const threatIntelligence = pgTable("threat_intelligence", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  threatType: text("threat_type").notNull(), // malicious_ip, bot, scanner, etc.
  severity: text("severity").notNull(),
  source: text("source").notNull(), // internal, external_feed, manual
  firstSeen: timestamp("first_seen").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  occurrences: integer("occurrences").default(1),
  blocked: boolean("blocked").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attack patterns table
const attackPatterns = pgTable("attack_patterns", {
  id: serial("id").primaryKey(),
  patternName: text("pattern_name").notNull(),
  patternType: text("pattern_type").notNull(), // regex, behavioral, statistical
  pattern: text("pattern").notNull(),
  description: text("description"),
  severity: text("severity").notNull(),
  enabled: boolean("enabled").default(true),
  falsePositiveRate: integer("false_positive_rate").default(0),
  detectionCount: integer("detection_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface ThreatDetectionResult {
  isBlocked: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  detectedThreats: DetectedThreat[];
  riskScore: number;
  recommendedAction: 'allow' | 'monitor' | 'challenge' | 'block';
}

export interface DetectedThreat {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  confidence: number; // 0-100
}

export interface BehavioralAnomaly {
  userId: string;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  baselineValue: number;
  currentValue: number;
  deviationScore: number;
  timeWindow: string;
}

/**
 * Advanced intrusion detection and threat monitoring service
 */
export class IntrusionDetectionService {
  private static instance: IntrusionDetectionService;
  
  // Real-time threat tracking
  private ipRequestCounts = new Map<string, { count: number; lastReset: number }>();
  private userActivityPatterns = new Map<string, any>();
  private blockedIPs = new Set<string>();
  
  // Detection thresholds
  private readonly thresholds = {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    failedLoginsPerHour: 10,
    dataAccessPerHour: 500,
    suspiciousPatternScore: 70,
    criticalThreatScore: 85,
    behavioralDeviationThreshold: 3.0, // Standard deviations
  };

  // Known attack patterns
  private readonly attackPatterns = [
    {
      name: 'SQL Injection',
      pattern: /(union.*select|drop.*table|exec.*xp_|script.*alert)/i,
      severity: 'critical' as const,
      type: 'regex' as const
    },
    {
      name: 'XSS Attempt',
      pattern: /(<script|javascript:|onload=|onerror=|eval\()/i,
      severity: 'high' as const,
      type: 'regex' as const
    },
    {
      name: 'Path Traversal',
      pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i,
      severity: 'high' as const,
      type: 'regex' as const
    },
    {
      name: 'Command Injection',
      pattern: /(;.*ls|;.*cat|;.*rm|;.*wget|;.*curl|\|.*nc)/i,
      severity: 'critical' as const,
      type: 'regex' as const
    },
    {
      name: 'LDAP Injection',
      pattern: /(\*\)|&\(|\|\(|%28|%29|%26|%7c)/i,
      severity: 'medium' as const,
      type: 'regex' as const
    }
  ];

  public static getInstance(): IntrusionDetectionService {
    if (!IntrusionDetectionService.instance) {
      IntrusionDetectionService.instance = new IntrusionDetectionService();
    }
    return IntrusionDetectionService.instance;
  }

  /**
   * Analyze incoming request for threats
   */
  async analyzeRequest(req: Request): Promise<ThreatDetectionResult> {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || '';
    const url = req.originalUrl || req.url;
    const method = req.method;
    const body = JSON.stringify(req.body || {});
    
    const detectedThreats: DetectedThreat[] = [];
    let riskScore = 0;

    // 1. Check against threat intelligence
    const threatIntelResult = await this.checkThreatIntelligence(ipAddress);
    if (threatIntelResult.isThreat) {
      detectedThreats.push({
        type: 'known_threat_ip',
        severity: threatIntelResult.severity,
        description: `IP address ${ipAddress} is known ${threatIntelResult.threatType}`,
        evidence: { source: threatIntelResult.source },
        confidence: 95
      });
      riskScore += threatIntelResult.severity === 'critical' ? 50 : 30;
    }

    // 2. Rate limiting analysis
    const rateLimitResult = this.analyzeRateLimit(ipAddress);
    if (rateLimitResult.isExceeded) {
      detectedThreats.push({
        type: 'rate_limit_exceeded',
        severity: rateLimitResult.severity,
        description: `Rate limit exceeded: ${rateLimitResult.requestCount} requests in ${rateLimitResult.timeWindow}`,
        evidence: { requestCount: rateLimitResult.requestCount },
        confidence: 90
      });
      riskScore += 25;
    }

    // 3. Pattern-based attack detection
    const patternResults = this.detectAttackPatterns(url, body, userAgent);
    detectedThreats.push(...patternResults);
    riskScore += patternResults.reduce((sum, threat) => {
      return sum + (threat.severity === 'critical' ? 40 : threat.severity === 'high' ? 25 : 15);
    }, 0);

    // 4. Behavioral analysis (if user is authenticated)
    const userId = (req as any).user?.id;
    if (userId) {
      const behavioralThreats = await this.analyzeBehavioralAnomalies(userId, req);
      detectedThreats.push(...behavioralThreats);
      riskScore += behavioralThreats.length * 20;
    }

    // 5. Geographic and temporal analysis
    const geoTemporal = await this.analyzeGeoTemporalPatterns(ipAddress, userId);
    if (geoTemporal.isAnomalous) {
      detectedThreats.push({
        type: 'geotemporal_anomaly',
        severity: geoTemporal.severity,
        description: geoTemporal.description,
        evidence: geoTemporal.evidence,
        confidence: geoTemporal.confidence
      });
      riskScore += 20;
    }

    // Determine threat level and recommended action
    const threatLevel = this.calculateThreatLevel(riskScore);
    const recommendedAction = this.determineRecommendedAction(threatLevel, detectedThreats);
    const isBlocked = recommendedAction === 'block' || this.blockedIPs.has(ipAddress);

    // Log the analysis
    if (detectedThreats.length > 0) {
      await securityAuditService.logSecurityEvent({
        eventType: 'threat_detection',
        severity: threatLevel === 'critical' ? 'critical' : threatLevel === 'high' ? 'high' : 'medium',
        ipAddress,
        userAgent,
        resource: url,
        action: method,
        success: !isBlocked,
        details: {
          detectedThreats,
          riskScore,
          recommendedAction
        },
        riskScore,
        userId
      });
    }

    return {
      isBlocked,
      threatLevel,
      detectedThreats,
      riskScore,
      recommendedAction
    };
  }

  /**
   * Check IP against threat intelligence database
   */
  private async checkThreatIntelligence(ipAddress: string): Promise<{
    isThreat: boolean;
    threatType?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    source?: string;
  }> {
    try {
      const threat = await db
        .select()
        .from(threatIntelligence)
        .where(eq(threatIntelligence.ipAddress, ipAddress))
        .limit(1);

      if (threat.length > 0) {
        const threatData = threat[0];
        
        // Update last seen
        await db
          .update(threatIntelligence)
          .set({ 
            lastSeen: new Date(),
            occurrences: sql`${threatIntelligence.occurrences} + 1`
          })
          .where(eq(threatIntelligence.id, threatData.id));

        return {
          isThreat: true,
          threatType: threatData.threatType,
          severity: threatData.severity as any,
          source: threatData.source
        };
      }

      return { isThreat: false };
    } catch (error) {
      logger.error('Error checking threat intelligence:', { component: 'SimpleTool' }, error);
      return { isThreat: false };
    }
  }

  /**
   * Analyze rate limiting patterns
   */
  private analyzeRateLimit(ipAddress: string): {
    isExceeded: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    requestCount: number;
    timeWindow: string;
  } {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Get or create request tracking for this IP
    let tracking = this.ipRequestCounts.get(ipAddress);
    if (!tracking || now - tracking.lastReset > oneMinute) {
      tracking = { count: 0, lastReset: now };
      this.ipRequestCounts.set(ipAddress, tracking);
    }
    
    tracking.count++;
    
    // Determine if rate limit is exceeded
    let isExceeded = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (tracking.count > this.thresholds.requestsPerMinute * 3) {
      isExceeded = true;
      severity = 'critical';
    } else if (tracking.count > this.thresholds.requestsPerMinute * 2) {
      isExceeded = true;
      severity = 'high';
    } else if (tracking.count > this.thresholds.requestsPerMinute) {
      isExceeded = true;
      severity = 'medium';
    }
    
    return {
      isExceeded,
      severity,
      requestCount: tracking.count,
      timeWindow: '1 minute'
    };
  }

  /**
   * Detect attack patterns in request data
   */
  private detectAttackPatterns(url: string, body: string, userAgent: string): DetectedThreat[] {
    const threats: DetectedThreat[] = [];
    const fullContent = `${url} ${body} ${userAgent}`;

    for (const pattern of this.attackPatterns) {
      if (pattern.pattern.test(fullContent)) {
        threats.push({
          type: pattern.name.toLowerCase().replace(/\s+/g, '_'),
          severity: pattern.severity,
          description: `${pattern.name} pattern detected in request`,
          evidence: {
            pattern: pattern.pattern.toString(),
            matchedContent: fullContent.substring(0, 200)
          },
          confidence: 85
        });
      }
    }

    // Additional heuristic checks
    if (url.length > 2000) {
      threats.push({
        type: 'unusually_long_url',
        severity: 'medium',
        description: 'Unusually long URL detected',
        evidence: { urlLength: url.length },
        confidence: 70
      });
    }

    if (body.length > 100000) {
      threats.push({
        type: 'large_payload',
        severity: 'medium',
        description: 'Unusually large request payload',
        evidence: { payloadSize: body.length },
        confidence: 75
      });
    }

    return threats;
  }

  /**
   * Analyze behavioral anomalies for authenticated users
   */
  private async analyzeBehavioralAnomalies(userId: string, req: Request): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];
    
    try {
      // Get user's historical behavior patterns
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const userEvents = await db
        .select()
        .from(securityAuditService.securityAuditLogs)
        .where(
          and(
            eq(securityAuditService.securityAuditLogs.userId, userId),
            gte(securityAuditService.securityAuditLogs.timestamp, oneWeekAgo)
          )
        )
        .limit(1000);

      if (userEvents.length < 10) {
        // Not enough data for behavioral analysis
        return threats;
      }

      // Analyze access patterns
      const currentHour = new Date().getHours();
      const historicalHours = userEvents.map(event => 
        new Date(event.timestamp).getHours()
      );
      
      const hourlyActivity = new Array(24).fill(0);
      historicalHours.forEach(hour => hourlyActivity[hour]++);
      
      const avgActivityAtCurrentHour = hourlyActivity[currentHour] / userEvents.length * 24;
      
      if (avgActivityAtCurrentHour < 0.1 && userEvents.length > 50) {
        threats.push({
          type: 'unusual_access_time',
          severity: 'medium',
          description: `User accessing system at unusual time (${currentHour}:00)`,
          evidence: {
            currentHour,
            historicalActivity: avgActivityAtCurrentHour,
            totalEvents: userEvents.length
          },
          confidence: 80
        });
      }

      // Analyze request frequency
      const recentEvents = userEvents.filter(event => 
        Date.now() - new Date(event.timestamp).getTime() < 60 * 60 * 1000 // Last hour
      );
      
      const avgHourlyRequests = userEvents.length / (7 * 24); // Average per hour over week
      
      if (recentEvents.length > avgHourlyRequests * 5) {
        threats.push({
          type: 'unusual_activity_volume',
          severity: 'high',
          description: 'Unusually high activity volume detected',
          evidence: {
            recentRequests: recentEvents.length,
            averageHourly: avgHourlyRequests,
            deviationFactor: recentEvents.length / avgHourlyRequests
          },
          confidence: 85
        });
      }

    } catch (error) {
      logger.error('Error analyzing behavioral anomalies:', { component: 'SimpleTool' }, error);
    }

    return threats;
  }

  /**
   * Analyze geographic and temporal patterns
   */
  private async analyzeGeoTemporalPatterns(ipAddress: string, userId?: string): Promise<{
    isAnomalous: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: Record<string, any>;
    confidence: number;
  }> {
    // This would integrate with IP geolocation services in production
    // For now, we'll do basic analysis based on IP patterns
    
    const isPrivateIP = this.isPrivateIP(ipAddress);
    const isTorExit = await this.checkTorExitNode(ipAddress);
    const isVPN = await this.checkVPNProvider(ipAddress);
    
    if (isTorExit) {
      return {
        isAnomalous: true,
        severity: 'high',
        description: 'Access from Tor exit node detected',
        evidence: { ipAddress, source: 'tor_detection' },
        confidence: 90
      };
    }
    
    if (isVPN) {
      return {
        isAnomalous: true,
        severity: 'medium',
        description: 'Access from VPN/proxy detected',
        evidence: { ipAddress, source: 'vpn_detection' },
        confidence: 75
      };
    }
    
    return {
      isAnomalous: false,
      severity: 'low',
      description: 'Normal geographic pattern',
      evidence: {},
      confidence: 50
    };
  }

  /**
   * Calculate overall threat level
   */
  private calculateThreatLevel(riskScore: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= this.thresholds.criticalThreatScore) return 'critical';
    if (riskScore >= this.thresholds.suspiciousPatternScore) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'none';
  }

  /**
   * Determine recommended action based on threat analysis
   */
  private determineRecommendedAction(
    threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical',
    threats: DetectedThreat[]
  ): 'allow' | 'monitor' | 'challenge' | 'block' {
    if (threatLevel === 'critical') return 'block';
    if (threatLevel === 'high') return 'challenge';
    if (threatLevel === 'medium') return 'monitor';
    
    // Check for specific threat types that require blocking
    const criticalThreats = threats.filter(t => 
      t.type.includes('sql_injection') || 
      t.type.includes('command_injection') ||
      t.severity === 'critical'
    );
    
    if (criticalThreats.length > 0) return 'block';
    
    return 'allow';
  }

  /**
   * Block IP address
   */
  async blockIP(ipAddress: string, reason: string, duration?: number): Promise<void> {
    this.blockedIPs.add(ipAddress);
    
    // Add to threat intelligence database
    await db.insert(threatIntelligence).values({
      ipAddress,
      threatType: 'blocked_ip',
      severity: 'high',
      source: 'internal',
      blocked: true,
      metadata: { reason, blockedAt: new Date() }
    }).onConflictDoUpdate({
      target: threatIntelligence.ipAddress,
      set: {
        blocked: true,
        lastSeen: new Date(),
        occurrences: sql`${threatIntelligence.occurrences} + 1`,
        metadata: { reason, blockedAt: new Date() }
      }
    });

    // Auto-unblock after duration if specified
    if (duration) {
      setTimeout(() => {
        this.unblockIP(ipAddress);
      }, duration);
    }

    console.warn(`🚫 IP ${ipAddress} blocked: ${reason}`);
  }

  /**
   * Unblock IP address
   */
  async unblockIP(ipAddress: string): Promise<void> {
    this.blockedIPs.delete(ipAddress);
    
    await db
      .update(threatIntelligence)
      .set({ blocked: false })
      .where(eq(threatIntelligence.ipAddress, ipAddress));

    console.info(`✅ IP ${ipAddress} unblocked`);
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Utility methods
   */
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  private async checkTorExitNode(ipAddress: string): Promise<boolean> {
    // In production, this would check against Tor exit node lists
    // For now, return false
    return false;
  }

  private async checkVPNProvider(ipAddress: string): Promise<boolean> {
    // In production, this would check against VPN provider IP ranges
    // For now, return false
    return false;
  }

  /**
   * Generate intrusion detection report
   */
  async generateIntrusionReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      const threats = await db
        .select()
        .from(threatIntelligence)
        .where(
          and(
            gte(threatIntelligence.firstSeen, startDate),
            sql`${threatIntelligence.firstSeen} <= ${endDate}`
          )
        )
        .orderBy(desc(threatIntelligence.lastSeen));

      const blockedIPs = threats.filter(t => t.blocked);
      const severityBreakdown = threats.reduce((acc, threat) => {
        acc[threat.severity] = (acc[threat.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        period: { start: startDate, end: endDate },
        summary: {
          totalThreats: threats.length,
          blockedIPs: blockedIPs.length,
          activeThreats: threats.filter(t => !t.blocked).length,
          severityBreakdown
        },
        threats: threats.slice(0, 100),
        recommendations: this.generateIntrusionRecommendations(threats)
      };
    } catch (error) {
      logger.error('Error generating intrusion report:', { component: 'SimpleTool' }, error);
      throw new Error('Failed to generate intrusion detection report');
    }
  }

  private generateIntrusionRecommendations(threats: any[]): string[] {
    const recommendations: string[] = [];
    
    const criticalThreats = threats.filter(t => t.severity === 'critical');
    if (criticalThreats.length > 0) {
      recommendations.push(`${criticalThreats.length} critical threats detected - immediate investigation required`);
    }
    
    const frequentAttackers = threats.filter(t => t.occurrences > 10);
    if (frequentAttackers.length > 0) {
      recommendations.push(`${frequentAttackers.length} IPs with repeated attacks - consider permanent blocking`);
    }
    
    const unblockedThreats = threats.filter(t => !t.blocked && t.severity !== 'low');
    if (unblockedThreats.length > 0) {
      recommendations.push(`${unblockedThreats.length} unblocked threats - review blocking policies`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Threat landscape appears stable - continue monitoring');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const intrusionDetectionService = IntrusionDetectionService.getInstance();

// Export table definitions for migrations
export { threatIntelligence, attackPatterns };








