export interface Analysis {
  id: string;
  topic: string;
  content: string;
  billId: number;
  analysisType: string;
  confidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expert {
  id: string;
  name: string;
  email: string;
  expertise: string[];
  qualifications: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  reputationScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtendedExpert extends Expert {
  topic: string[];
  specializations: string[];
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  notificationUrl?: string;
}

export interface VerificationTask {
  id: string;
  analysisId: string;
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
  createdAt?: Date;
  processedAt?: string | null;
}

export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISPUTED = 'disputed'
}

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

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  type: string;
  influence: number;
  notificationPreferences: NotificationChannel[];
}

export class ExpertError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ExpertError';
  }
}












































