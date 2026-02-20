/**
 * Shared types for bill translation features
 */

export interface ClauseTranslation {
  clauseRef: string;
  originalText: string;
  plainLanguage: string;
  keyPoints: string[];
  affectedGroups: string[];
  examples: string[];
}

export interface TranslationResponse {
  billId: string;
  translations: ClauseTranslation[];
  summary: string;
  totalClauses: number;
  translatedClauses: number;
}

export interface PersonalImpact {
  billId: string;
  userId?: string;
  financialImpact: {
    annual: number;
    monthly: number;
    breakdown: Array<{
      provision: string;
      clauseRef: string;
      amount: number;
      explanation: string;
    }>;
  };
  affectedRights: string[];
  affectedServices: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  personalizedMessage: string;
  recommendations: string[];
  calculatedAt?: Date;
  confidence?: 'low' | 'medium' | 'high';
  methodology?: string;
}

export interface UserContext {
  county?: string;
  constituency?: string;
  monthlyIncome?: number;
  occupation?: string;
  householdSize?: number;
  useMobileMoney?: boolean;
  useOnlineServices?: boolean;
  isEmployed?: boolean;
}
