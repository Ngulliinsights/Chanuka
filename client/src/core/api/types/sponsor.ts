/**
 * Sponsor Types
 * 
 * Type definitions for sponsors and stakeholder models
 */

// ============================================================================
// Sponsor Model
// ============================================================================

export interface Sponsor {
  readonly id: number;
  readonly name: string;
  readonly party: string;
  readonly district?: string;
  readonly position: string;
  readonly isPrimary?: boolean;
  readonly state?: string;
}
