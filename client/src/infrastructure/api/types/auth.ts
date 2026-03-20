/**
 * Authentication Types
 *
 * Type definitions for authentication and user management
 */

// ============================================================================
// Auth Models
// ============================================================================

export enum ExpertStatus {
  NONE = 'none',
  VERIFIED = 'verified',
  CONTRIBUTOR = 'contributor',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export interface Badge {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly earnedAt: string;
}

// ============================================================================
// Auth Form Data
// ============================================================================

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

export interface UpdateUserProfile {
  readonly displayName?: string;
  readonly avatar?: string;
  readonly bio?: string;
  readonly preferences?: Readonly<Record<string, unknown>>;
}
