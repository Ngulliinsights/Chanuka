export interface AnalysisResult {
  success: boolean;
  data?: any;
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