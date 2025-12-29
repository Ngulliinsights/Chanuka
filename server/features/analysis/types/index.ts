/**
 * Analysis Domain Types
 * 
 * Centralized type definitions for all analysis-related functionality
 * including legal analysis, constitutional analysis, and comprehensive bill analysis.
 */

// Legal Analysis Types (migrated from shared/types/legal-analysis.ts)
export interface AnalysisResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  confidence?: number;
  timestamp?: Date;
}

export interface LegalAnalysisConfig {
  timeout?: number;
  maxRetries?: number;
  pythonExecutable?: string;
}

export interface ConstitutionalAnalysis {
  isConstitutional: boolean;
  concerns: string[];
  confidence: number;
  reasoning: string;
}

export interface StakeholderAnalysis {
  stakeholders: Array<{
    name: string;
    type: string;
    influence: number;
    position: 'support' | 'oppose' | 'neutral';
  }>;
  majorConcerns: string[];
  publicOpinion: number; // -100 to 100
}

// Re-export existing analysis types for consistency
export type {
  ConstitutionalAnalysisResult,
  LegalPrecedent,
  ComprehensiveBillAnalysis,
  ConstitutionalConcern
} from '@shared/application/constitutional-analysis.service';

export type {
  ComprehensiveBillAnalysis as BillComprehensiveAnalysis
} from '@shared/application/bill-comprehensive-analysis.service';


