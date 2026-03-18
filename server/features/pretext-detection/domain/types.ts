/**
 * Pretext Detection Types - Re-export from Shared Layer
 * 
 * Core types for the pretext detection feature have been migrated to
 * @shared/types/features/analysis/pretext-types.ts
 * This file now simply re-exports them for backward compatibility.
 */

export type {
  PretextAnalysisInput,
  PretextDetection,
  PretextAnalysisResult
} from '@shared/types';

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
