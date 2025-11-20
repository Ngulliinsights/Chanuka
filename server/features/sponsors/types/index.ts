/**
 * Sponsors Domain Types
 * 
 * Centralized type definitions for sponsor management, stakeholder analysis,
 * and sponsor-related functionality.
 */

// Stakeholder Types (extracted from shared/types/expert.ts)
export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  type: string;
  influence: number;
  notificationPreferences: NotificationChannel[];
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

// Re-export common sponsor types from schema for convenience
export type {
  Sponsor,
} from '@shared/schema';

// Re-export sponsor-related types from common types
export type {
  Affiliation,
  TransparencyInfo,
  FinancialBreakdown
} from '@shared/core/types';
