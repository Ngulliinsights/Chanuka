/**
 * Client-Safe Argument Types
 * 
 * Defines types for arguments as they appear in API responses
 * Safe to use in both client and server code
 */

import type { ArgumentId, ArgumentEvidenceId, BillId, UserId } from '../../core/branded';

/**
 * Argument position in bill debate
 */
export type ArgumentPosition = 'support' | 'oppose' | 'neutral' | 'conditional';

/**
 * API Argument interface - matches server response format
 * Safe for client-side consumption
 */
export interface Argument {
  id: ArgumentId;
  billId: BillId;
  userId: UserId;
  position: ArgumentPosition;
  argument_text: string;
  strength_score?: number | null;
  confidence_score?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  evidence?: ArgumentEvidence[] | null;
  reasoning?: string | null;
  tags?: string[] | null;
}

/**
 * Evidence supporting an argument
 */
export interface ArgumentEvidence {
  id: ArgumentEvidenceId;
  argumentId: ArgumentId;
  text: string;
  source?: string | null;
  verified?: boolean;
  type?: 'statistical' | 'anecdotal' | 'expert_opinion' | 'legal_precedent';
}

/**
 * Arguments response from API
 */
export interface ArgumentsResponse {
  arguments: Argument[];
  total: number;
  page?: number;
  pageSize?: number;
}

/**
 * Type guard to check if position is valid
 */
export function isValidArgumentPosition(value: unknown): value is ArgumentPosition {
  return typeof value === 'string' && ['support', 'oppose', 'neutral', 'conditional'].includes(value);
}
