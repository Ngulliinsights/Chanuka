/**
 * Authentication Types
 * 
 * Shared types for authentication to break circular dependency between
 * api/auth.ts and api/types/index.ts
 */

import type { UserRole } from '@shared/types/core/enums';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: 'citizen' | 'expert' | 'official' | 'admin' | 'moderator';
  verified: boolean;
  twoFactorEnabled: boolean;
  avatar_url?: string;
  preferences: UserPreferences;
  permissions: string[];
  lastLogin: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  billUpdates: boolean;
  communityActivity: boolean;
  systemAlerts: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showActivity: boolean;
  allowMessaging: boolean;
  dataSharing: boolean;
}

export interface DataExportResponse {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  requestedAt: string;
}

export interface DataDeletionResponse {
  deletionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledFor: string;
  requestedAt: string;
}
