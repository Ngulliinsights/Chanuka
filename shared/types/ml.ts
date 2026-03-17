export interface AnalysisResult {
  confidence: number;
  result: any;
  analysis_type: string;
  metadata?: any;
}

export interface ComprehensiveAnalysisResult extends AnalysisResult {
  // Add specific fields if needed by the caller
}

export interface ImplementationWorkaroundDetection {
  confidence: number;
  workarounds: any[];
  metadata?: any;
}

export interface SimilarityAnalysis {
  confidence: number;
  similarityScore: number;
  metadata?: any;
}
