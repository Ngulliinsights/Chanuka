/**
 * Bill Analysis Types
 * 
 * Domain-specific types for bill complexity, transparency, and sentiment analysis.
 * Migrated from shared/types/bills.ts to maintain proper domain boundaries.
 */

import type {
  ConflictIndicator,
  SentimentAnalysis
} from '@server/types/common.js';

export interface BillAnalysis { id: number;
  bill_id: number;
  complexity: number;
  transparency: number;
  conflicts: ConflictIndicator[];
  sentiment: SentimentAnalysis;
  keyTerms: string[];
  summary: string;
  riskFactors: string[];
  recommendations?: string[];
  lastUpdated: Date;
  created_at: Date;
 }
