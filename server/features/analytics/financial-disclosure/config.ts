// src/config/financial-disclosure-config.ts
// Centralized Configuration for Financial Disclosure System
// This file serves as the single source of truth for all system-wide settings

/**
 * Core disclosure types that every active sponsor must maintain.
 * These form the foundation of our completeness scoring system.
 */
export const REQUIRED_DISCLOSURE_TYPES = [
  'financial',
  'business', 
  'investment',
  'income',
  'real_estate',
  'gifts'
] as const;

export type RequiredDisclosureType = typeof REQUIRED_DISCLOSURE_TYPES[number];

/**
 * Monetary thresholds (in KSh) that trigger automated alerts.
 * When a disclosure amount exceeds these values, the monitoring system
 * generates warnings for manual review by compliance officers.
 */
export const DISCLOSURE_THRESHOLDS: Record<RequiredDisclosureType, number> = {
  financial: 10_000,      // General financial transactions
  investment: 50_000,     // Investment activities
  income: 100_000,        // Income from any source
  business: 25_000,       // Business-related expenses or revenue
  real_estate: 500_000,   // Real estate transactions
  gifts: 5_000            // Gifts received
};

/**
 * Risk assessment thresholds used by the analytics engine.
 * These define how we categorize financial exposure and data freshness.
 */
export const RISK_THRESHOLDS = {
  // Financial exposure levels (in KSh)
  financial_exposure: {
    low: 500_000,      // Below this is low risk
    medium: 2_000_000, // Between low and medium thresholds
    high: 5_000_000    // Above medium is high/critical
  },
  
  // Age of disclosure data (in days)
  disclosureAge: {
    current: 90,   // Within 3 months
    recent: 180,   // Within 6 months  
    stale: 365     // Older than 1 year
  }
} as const;

/**
 * Weights for calculating composite completeness scores.
 * These determine the relative importance of different quality dimensions.
 */
export const COMPLETENESS_WEIGHTS = {
  requiredDisclosures: 0.40,  // Having all required disclosure types
  verification_status: 0.30,   // Proportion of verified disclosures
  dataRecency: 0.20,          // How current the information is
  detailCompleteness: 0.10    // Quality and depth of details
} as const;

/**
 * Monitoring cycle configuration.
 * These parameters control the automated background monitoring process.
 */
export const MONITORING_CONFIG = {
  // Processing batch size to prevent database overwhelm
  batchSize: 50,
  
  // How often the monitoring cycle runs (24 hours in milliseconds)
  dailyCheckInterval: 24 * 60 * 60 * 1000,
  
  // Time window to look back for new disclosures (24 hours)
  lookbackWindowHours: 24,
  
  // When disclosures become considered "stale" (6 months)
  staleThresholdDays: 180,
  
  // Retry configuration for failed operations
  retryDelay: 5_000,    // 5 seconds between retries
  maxRetries: 3,        // Maximum retry attempts
  
  // Graceful shutdown timeout (30 seconds)
  shutdownTimeoutMs: 30_000
} as const;

/**
 * Cache configuration with nuanced TTL values.
 * Different data types have different volatility and thus different cache lifetimes.
 */
export const CACHE_CONFIG = {
  // Cache key prefixes (versioned to enable cache busting)
  keyPrefixes: {
    version: 'v3',
    sponsor: (id: number) => `sponsor_v3_${id}`,
    disclosures: (id: number) => `disclosures_v3_${id}`,
    allDisclosures: () => 'disclosures_v3_all',
    relationships: (id: number) => `relationships_v3_${id}`,
    completeness: (id: number) => `completeness_v3_${id}`,
    alerts: (id: string) => `alert_v3_${id}`,
    recentAlerts: () => 'recent_alerts_v3',
    dashboard: () => 'transparency_dashboard_v3',
    health: () => 'health_status_v3'
  },
  
  // Time-To-Live values in seconds
  ttl: {
    sponsorInfo: 6 * 60 * 60,        // 6 hours - sponsor data changes infrequently
    disclosureData: 15 * 60,         // 15 minutes - disclosures updated regularly
    analyticsReport: 60 * 60,        // 1 hour - expensive computations
    relationshipMap: 60 * 60,        // 1 hour - complex network analysis
    dashboard: 5 * 60,               // 5 minutes - needs to be current
    alerts: 7 * 24 * 60 * 60,        // 7 days - historical alert data
    healthCheck: 30                  // 30 seconds - must be very fresh
  }
} as const;

/**
 * Alerting system configuration.
 * Controls how the system generates and routes alert notifications.
 */
export const ALERTING_CONFIG = {
  // User ID for system-generated notifications
  adminUserId: 'system-compliance-officer',
  
  // Whether to create database notifications for alerts
  createNotifications: true,
  
  // Which severity levels trigger notifications
  notificationSeverities: ['warning', 'critical'] as const,
  
  // Maximum alerts to retain in the recent alerts cache
  maxRecentAlerts: 1000
} as const;

/**
 * Analytics engine configuration.
 * Parameters that control the sophisticated analytical calculations.
 */
export const ANALYTICS_CONFIG = {
  // Exponential decay rate for recency scoring
  // With rate 0.002, disclosures lose ~50% value after 1 year
  recencyDecayRate: 0.002,
  
  // Network analysis thresholds
  networkMetrics: {
    strongRelationshipThreshold: 70,  // Strength score above this is "strong"
    highCentralityThreshold: 80,      // Centrality above this indicates high connectivity
    riskConcentrationThreshold: 60    // HHI above this shows dangerous concentration
  },
  
  // Conflict detection sensitivity
  conflictDetection: {
    enableOwnershipInvestmentCheck: true,
    enableEmploymentInvestmentCheck: true,
    minimumConflictValue: 500_000     // KSh threshold for conflict significance
  }
} as const;

/**
 * API configuration for route handlers.
 * Settings that affect HTTP response behavior.
 */
export const API_CONFIG = {
  // HTTP caching headers
  cacheControl: {
    disclosures: 'public, max-age=300',        // 5 minutes
    analytics: 'private, max-age=600',         // 10 minutes
    exports: 'private, no-cache'               // Never cache exports
  },
  
  // Rate limiting (requests per window)
  rateLimits: {
    standard: { windowMs: 15 * 60 * 1000, max: 100 },  // 100 per 15 minutes
    expensive: { windowMs: 15 * 60 * 1000, max: 20 }   // 20 per 15 minutes for analytics
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 50,
    maxLimit: 500
  }
} as const;

/**
 * Export a unified configuration object for convenience.
 * This provides a single import point for all configuration needs.
 */
export const FinancialDisclosureConfig = {
  requiredTypes: REQUIRED_DISCLOSURE_TYPES,
  thresholds: DISCLOSURE_THRESHOLDS,
  riskThresholds: RISK_THRESHOLDS,
  completenessWeights: COMPLETENESS_WEIGHTS,
  monitoring: MONITORING_CONFIG,
  cache: CACHE_CONFIG,
  alerting: ALERTING_CONFIG,
  analytics: ANALYTICS_CONFIG,
  api: API_CONFIG
} as const;

// Type exports for strong typing throughout the application
export type FinancialDisclosureConfigType = typeof FinancialDisclosureConfig;





































