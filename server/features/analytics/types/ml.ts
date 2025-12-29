// ML Analysis domain types

export interface AnalysisResult {
  confidence: number; // 0.0 to 1.0
  result: any;
  analysis_type: string;
  metadata?: {
    processingTime?: number;
    dataSourcesUsed?: string[];
    model_version?: string;
    [key: string]: any;
  };
}

export interface SimilarityAnalysis {
  textSimilarity: number; // 0.0 to 1.0
  structuralSimilarity: number; // 0.0 to 1.0
  intentSimilarity: number; // 0.0 to 1.0
  overallSimilarity: number; // 0.0 to 1.0
  concernLevel: 'low' | 'medium' | 'high';
  // Additional context for better decision making
  analysisBreakdown?: {
    keyPhrasesMatched: string[];
    structuralPatterns: string[];
    intentIndicators: string[];
  };
}

export interface ImplementationWorkaroundDetection {
  workaroundId: string;
  description: string;
  concernLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0.0 to 1.0
  suggestedActions: string[];
  // Enhanced with more actionable information
  detectionContext?: {
    discoveredAt: Date;
    affectedSections: string[];
    riskFactors: string[];
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface ComprehensiveAnalysisResult {
  stakeholderInfluence: AnalysisResult;
  conflictsOfInterest: AnalysisResult;
  beneficiaryAnalysis: AnalysisResult;
  implementationWorkarounds: ImplementationWorkaroundDetection[];
  overallScore: number;
  recommendations: string[];
  // Enhanced with analysis metadata
  analysisMetadata?: {
    completedAt: Date;
    processingDuration: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    dataQuality: 'poor' | 'fair' | 'good' | 'excellent';
  };
}








































