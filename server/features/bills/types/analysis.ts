/**
 * Bill Analysis Types
 * 
 * Domain-specific types for bill complexity, transparency, and sentiment analysis.
 * Migrated from shared/types/bill.ts to maintain proper domain boundaries.
 */

import type {
  ConflictIndicator,
  SentimentAnalysis
} from '../../types/common.js';

export interface BillAnalysis {
  id: number;
  billId: number;
  complexity: number;
  transparency: number;
  conflicts: ConflictIndicator[];
  sentiment: SentimentAnalysis;
  keyTerms: string[];
  summary: string;
  riskFactors: string[];
  recommendations?: string[];
  lastUpdated: Date;
  createdAt: Date;
}