// src/types/financial-disclosure-types.ts
// Shared type definitions for the financial disclosure system
// This prevents type duplication and ensures consistency across all modules

import { RequiredDisclosureType } from '../config/financial-disclosure-config';

/**
 * Core financial disclosure record with enriched metadata.
 * This represents a single disclosure entry with all calculated fields.
 */
export interface FinancialDisclosure {
  // Core fields from database
  id: number;
  sponsorId: number;
  disclosureType: RequiredDisclosureType;
  description: string;
  amount?: number;
  source?: string;
  dateReported: Date;
  isVerified: boolean;
  
  // Calculated enrichment fields
  completenessScore: number;  // Individual disclosure quality score (0-100)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

/**
 * Financial relationship between a sponsor and an external entity.
 * Used for network analysis and conflict detection.
 */
export interface FinancialRelationship {
  sponsorId: number;
  relatedEntity: string;
  relationshipType: 'ownership' | 'employment' | 'investment' | 'family' | 'business_partner';
  strength: number; // 0-100 scale indicating connection strength
  financialValue?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  conflictPotential: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Detected conflict of interest with supporting evidence.
 * Generated when relationship patterns suggest competing interests.
 */
export interface ConflictOfInterest {
  entity: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  relatedRelationships: FinancialRelationship[];
  potentialImpact: string;
}

/**
 * Comprehensive relationship mapping for a sponsor.
 * Provides network view of all financial connections and risks.
 */
export interface RelationshipMapping {
  sponsorId: number;
  sponsorName: string;
  relationships: FinancialRelationship[];
  totalFinancialExposure: number;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  detectedConflicts: ConflictOfInterest[];
  networkMetrics: {
    centralityScore: number;        // How connected is this sponsor
    clusteringCoefficient: number;  // How interconnected are relationships
    riskPropagation: number;        // Potential for risk to spread
    riskConcentration: number;      // Concentration of financial exposure
  };
  lastMappingUpdate: Date;
}

/**
 * Detailed completeness analysis for a sponsor.
 * Multi-dimensional assessment of disclosure quality and compliance.
 */
export interface CompletenessReport {
  sponsorId: number;
  sponsorName: string;
  overallScore: number;  // 0-100 composite score
  requiredDisclosures: number;
  completedDisclosures: number;
  missingDisclosures: string[];
  lastUpdateDate: Date;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  temporalTrend: 'stable' | 'improving' | 'declining';
  recommendations: string[];
  detailedMetrics: {
    requiredDisclosureScore: number;  // 0-1 scale
    verificationScore: number;        // 0-1 scale
    recencyScore: number;             // 0-1 scale
    detailScore: number;              // 0-1 scale
  };
}

/**
 * System-wide transparency dashboard data.
 * Aggregated metrics for executive oversight and compliance reporting.
 */
export interface TransparencyDashboard {
  generatedAt: Date;
  totalSponsors: number;
  averageCompletenessScore: number;
  disclosureStatistics: {
    total: number;
    verified: number;
    pending: number;
    byType: Record<string, number>;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topPerformers: Array<{
    sponsorId: number;
    sponsorName: string;
    score: number;
  }>;
  needsAttention: Array<{
    sponsorId: number;
    sponsorName: string;
    score: number;
    riskLevel: string;
  }>;
}

/**
 * Financial disclosure alert/notification.
 * Represents an automated or manual alert about disclosure issues.
 */
export interface FinancialAlert {
  id: string;
  type: 'new_disclosure' | 'updated_disclosure' | 'missing_disclosure' | 
        'threshold_exceeded' | 'conflict_detected' | 'stale_disclosure';
  sponsorId: number;
  sponsorName: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: Date;
  isResolved: boolean;
  metadata: Record<string, any>;
}

/**
 * Monitoring service operational status.
 * Used for observability and health monitoring.
 */
export interface MonitoringStatus {
  isRunning: boolean;
  lastCheckTime: Date | null;
  nextCheckTime: Date | null;
  checksPerformed: number;
  alertsGenerated: number;
  errorsEncountered: number;
  currentBatch?: number;
  totalBatches?: number;
}

/**
 * Basic completeness score (lightweight version for monitoring).
 * Used for quick operational checks without full analytics.
 */
export interface CompletenessScore {
  sponsorId: number;
  score: number;
  missingDisclosures: string[];
  totalRequired: number;
  totalPresent: number;
}

/**
 * Health check result for a single service component.
 */
export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  error?: string;
  stats?: any;
}

/**
 * Overall system health status.
 */
export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  timestamp: Date;
}

/**
 * Sponsor basic information (lightweight).
 */
export interface SponsorInfo {
  id: number;
  name: string;
  isActive: boolean;
}

/**
 * Database affiliation record for relationship mapping.
 */
export interface SponsorAffiliation {
  id: number;
  sponsorId: number;
  organization: string;
  type: 'economic' | 'professional' | 'ownership' | 'family';
  conflictType?: 'ownership' | 'financial' | null;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
}