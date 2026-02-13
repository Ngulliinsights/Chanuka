/**
 * Users Domain Types
 * 
 * Centralized type definitions for user management, expert verification,
 * and user-related functionality.
 */

// Expert and Verification Types (migrated from shared/types/expert.ts)
export interface Analysis { id: string;
  topic: string;
  content: string;
  bill_id: number;
  analysis_type: string;
  confidence?: number;
  created_at: Date;
  updated_at: Date;
 }

export interface Expert {
  id: string;
  name: string;
  email: string;
  expertise: string[];
  qualifications: string[];
  verification_status: 'pending' | 'verified' | 'rejected';
  reputation_score: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ExtendedExpert extends Expert {
  topic: string[];
  specializations: string[];
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  notificationUrl?: string;
}

export interface VerificationTask {
  id: string;
  analysis_id: string;
  expertId: string;
  status: VerificationStatus;
  assignedAt: Date;
  completedAt?: Date;
  feedback?: string;
  confidence?: number;
}

export interface ExtendedVerificationTask extends VerificationTask {
  verdict?: VerificationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number; // in minutes
  complexity: number; // 1-10 scale
  created_at?: Date;
  processedAt?: string | null;
}

// Import VerificationStatus from shared types
import { VerificationStatus } from '@shared/types';
export { VerificationStatus };

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface ServiceExpertError extends Error {
  code: string;
  details?: any;
}

// Import NotificationChannel from shared types
import { NotificationChannel } from '@shared/types';
export { NotificationChannel };

export class ExpertError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ExpertError';
  }
}

// Re-export core user types for convenience
export type {
  User,
  UserRole,
  UserProfile,
  AuthenticatedRequest
} from '@shared/core/types/auth.types';


