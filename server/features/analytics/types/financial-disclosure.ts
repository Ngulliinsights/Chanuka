// Financial Disclosure domain types

export interface FinancialDisclosure {
  id: number;
  sponsor_id: number;
  disclosureType: string;
  description: string;
  amount?: number;
  source?: string;
  dateReported: Date;
  is_verified: boolean;
  completenessScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

export interface FinancialRelationship {
  sponsor_id: number;
  relatedEntity: string;
  relationshipType: 'investment' | 'ownership' | 'business_partner' | 'employment' | 'family';
  strength: number; // 0-100
  financialValue?: number;
  start_date?: Date;
  end_date?: Date;
  is_active: boolean;
  conflictPotential: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConflictOfInterest {
  entity: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  relatedRelationships: FinancialRelationship[];
  potentialImpact: string;
}

export interface RelationshipMapping {
  sponsor_id: number;
  sponsorName: string;
  relationships: FinancialRelationship[];
  totalFinancialExposure: number;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  detectedConflicts: ConflictOfInterest[];
  networkMetrics: {
    centralityScore: number;
    clusteringCoefficient: number;
    riskPropagation: number;
    riskConcentration: number;
  };
  lastMappingUpdate: Date;
}

export interface CompletenessReport {
  sponsor_id: number;
  sponsorName: string;
  overallScore: number;
  requiredDisclosures: number;
  completedDisclosures: number;
  missingDisclosures: readonly string[];
  lastUpdateDate: Date;
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
  temporalTrend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
  detailedMetrics: {
    requiredDisclosureScore: number;
    verificationScore: number;
    recencyScore: number;
    detailScore: number;
  };
}

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
  riskDistribution: Record<'low' | 'medium' | 'high' | 'critical', number>;
  topPerformers: Array<{
    sponsor_id: number;
    sponsorName: string;
    score: number;
  }>;
  needsAttention: Array<{
    sponsor_id: number;
    sponsorName: string;
    score: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  anomalyStatistics?: {
    sponsorsWithAnomalies: number;
    anomaliesBySeverity: Record<'low' | 'medium' | 'high' | 'critical', number>;
    anomaliesByType: Record<string, number>;
    averageRiskScore: number;
  };
}

export interface SponsorInfo {
  id: number;
  name: string;
  is_active: boolean;
}

export interface SponsorAffiliation {
  id?: number;
  sponsor_id?: number;
  organization?: string;
  type: 'economic' | 'professional' | 'ownership' | 'family';
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  conflictType?: 'financial' | 'ownership' | null;
}






































