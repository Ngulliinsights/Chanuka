/**
 * Pretext Detection Domain Types
 * 
 * Core types for the pretext detection feature following DDD patterns
 */

export interface PretextAnalysisInput {
  billId: string;
  force?: boolean;
}

export interface PretextDetection {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  confidence: number;
}

export interface PretextAnalysisResult {
  billId: string;
  detections: PretextDetection[];
  score: number;
  confidence: number;
  analyzedAt: Date;
}

export interface PretextAlert {
  id: string;
  billId: string;
  detections: PretextDetection[];
  score: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface PretextReviewInput {
  alertId: string;
  status: 'approved' | 'rejected';
  notes?: string;
  reviewedBy: string;
}
