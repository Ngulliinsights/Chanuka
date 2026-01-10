/**
 * Core domain type definitions
 */

export interface Bill {
  id: string;
  title: string;
  description: string;
  status: string;
  dateIntroduced: string;
  sponsors: string[];
  tags: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface BillAnalysis {
  id: string;
  billId: string;
  summary: string;
  keyPoints: string[];
  impact: string;
  score: number;
}
