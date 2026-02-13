/**
 * Sponsors Domain Types
 * 
 * Centralized type definitions for sponsor management, stakeholder analysis,
 * and sponsor-related functionality.
 */

import { NotificationChannel } from '@shared/types';
export { NotificationChannel };

// Stakeholder Types (extracted from shared/types/expert.ts)
export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  type: string;
  influence: number;
  notificationPreferences: NotificationChannel[];
}

// Re-export common sponsor types from schema for convenience
export type {
  Sponsor,
} from '@server/infrastructure/schema';

// Re-export sponsor-related types from common types
export type {
  Affiliation,
  TransparencyInfo,
  FinancialBreakdown
} from '@shared/core/types';


