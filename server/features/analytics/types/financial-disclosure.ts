// Financial Disclosure domain types

export interface FinancialDisclosure {
  id: number;
  sponsorId: number;
  disclosureType: string;
  description: string;
  amount?: number;
  source?: string;
  dateReported: Date;
  isVerified: boolean;
  completenessScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

export interface FinancialRelationship {
  sponsorId: number;
  relatedEntity: string;
  relationshipType: 'investment' | 'ownership' | 'business_partner' | 'employment' | 'family';
  strength: number; // 0-100
  financialValue?: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
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
  sponsorId: number;
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
  sponsorId: number;
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
    sponsorId: number;
    sponsorName: string;
    score: number;
  }>;
  needsAttention: Array<{
    sponsorId: number;
    sponsorName: string;
    score: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export interface SponsorInfo {
  id: number;
  name: string;
  isActive: boolean;
}

export interface SponsorAffiliation {
  id?: number;
  sponsorId?: number;
  organization?: string;
  type: 'economic' | 'professional' | 'ownership' | 'family';
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  conflictType?: 'financial' | 'ownership' | null;
}





































