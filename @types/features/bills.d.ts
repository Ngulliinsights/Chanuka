/**
 * Features bills type declarations
 */

export interface Bill {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'introduced' | 'committee' | 'passed' | 'rejected';
  sponsor: string;
  coSponsors?: string[];
  introducedDate: string;
  lastAction?: string;
  tags: string[];
  content?: string;
}

export interface BillAnalysis {
  billId: string;
  summary: string;
  keyPoints: string[];
  impact: 'low' | 'medium' | 'high';
  stakeholders: string[];
  timeline?: string;
}

export interface BillComment {
  id: string;
  billId: string;
  userId: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  createdAt: string;
}
