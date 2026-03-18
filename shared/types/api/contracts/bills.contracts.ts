/**
 * Bills API Contracts
 * Type-safe specifications for bill search and management endpoints
 */

import { ApiResponse, BaseQueryParams } from './core.contracts';

// ============================================================================
// REQUEST CONTRACTS
// ============================================================================

export interface SearchBillsRequest extends BaseQueryParams {
  query?: string;
  status?: BillStatus;
  chamber?: 'house' | 'senate';
  sponsor?: string;
  tags?: string[];
}

export interface CreateBillRequest {
  billNumber: string;
  title: string;
  summary: string;
  description?: string;
  status: BillStatus;
  chamber: 'house' | 'senate';
  billType: 'bill' | 'resolution' | 'concurrent';
  sponsorId: string;
  tags?: string[];
}

export interface UpdateBillRequest {
  title?: string;
  summary?: string;
  description?: string;
  status?: BillStatus;
  tags?: string[];
}

// ============================================================================
// RESPONSE CONTRACTS
// ============================================================================

export type BillStatus = 'introduced' | 'committee' | 'floor' | 'passed' | 'signed' | 'vetoed' | 'failed';

export interface Bill {
  id: string;
  billNumber: string;
  title: string;
  summary: string;
  description?: string;
  status: BillStatus;
  chamber: 'house' | 'senate';
  billType: 'bill' | 'resolution' | 'concurrent';
  sponsorId: string;
  sponsor?: {
    id: string;
    name: string;
    party?: string;
  };
  tags: string[];
  trackedByCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillDetails extends Bill {
  fullText?: string;
  cosponsors?: Array<{
    id: string;
    name: string;
    joinedAt: string;
  }>;
  commitments?: Array<{
    id: string;
    name: string;
  }>;
  relatedBills?: Array<{
    id: string;
    number: string;
    title: string;
  }>;
}

// ============================================================================
// ENDPOINT RESPONSE TYPES
// ============================================================================

export type ListBillsResponse = ApiResponse<Bill[]>;
export type GetBillResponse = ApiResponse<BillDetails>;
export type SearchBillsResponse = ApiResponse<Bill[]>;
export type CreateBillResponse = ApiResponse<Bill>;
export type UpdateBillResponse = ApiResponse<Bill>;
export type DeleteBillResponse = ApiResponse<{ success: true }>;
