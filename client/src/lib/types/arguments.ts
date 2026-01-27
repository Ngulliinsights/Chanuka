/**
 * Argument Intelligence Types
 * 
 * Types for the argument extraction and clustering features.
 */

export interface Argument {
  id: string;
  billId: string;
  content: string;
  stance: 'pro' | 'con' | 'neutral';
  confidence?: number;
  sources?: string[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ArgumentCluster {
  id: string;
  billId: string;
  title: string;
  summary: string;
  arguments: Argument[];
  stance: 'pro' | 'con' | 'neutral';
  confidence: number;
  size: number;
  keywords?: string[];
  createdAt: string;
}
