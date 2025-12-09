/**
 * Authentication and Privacy Types
 * Comprehensive type definitions for secure authentication and privacy controls
 * 
 * Consolidated from client/src/types/auth.ts into core/auth module
 */

export interface User {
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
  verification_status?: 'pending' | 'verified' | 'rejected';
  expertise?: string | string[];
  is_active?: boolean;
  reputation?: number;
  two_factor_enabled?: boolean;
  last_login?: string;
  login_count?: number;
  account_locked?: boolean;
  locked_until?: string | null;
  password_changed_at?: string;
  privacy_settings?: PrivacySettings;
  consent_given?: ConsentRecord[];
  data_retention_preference?: DataRetentionPreference;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'registered' | 'private';
  email_visibility: 'public' | 'registered' | 'private';
  activity_tracking: boolean;
  analytics_consent: boolean;
  marketing_consent: boolean;
  data_sharing_consent: boolean;
  location_tracking: boolean;
  personalized_content: boolean;
  third_party_integrations: boolean;
  notification_preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  bill_updates: boolean;
  comment_replies: boolean;
  expert_insights: boolean;
  security_alerts: boolean;
  privacy_updates: boolean;
}

export interface ConsentRecord {
  id: string;
  consent_type: 'analytics' | 'marketing' | 'data_sharing' | 'cookies' | 'location';
  granted: boolean;
  granted_at: string;
  withdrawn_at: string | null;
  version: string;
  ip_address: string;
  user_agent: string;
}

export interface DataRetentionPreference {
  retention_period: '1year' | '2years' | '5years' | 'indefinite';
  auto_delete_inactive: boolean;
  export_before_delete: boolean;
}

export interface UserPreferences {
  notifications: boolean;
  emailAlerts: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

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

export interface PasswordRequirements {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  max_age_days: number;
  prevent_reuse_count: number;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'permission_change' | 'suspicious_activity';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SuspiciousActivityAlert {
  id: string;
  type: string;
  description: string;
  detectedAt: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export interface SocialLoginProvider {
  id: string;
  name: string;
  icon: string;
  privacy_focused: boolean;
  data_collection_minimal: boolean;
  supports_oidc: boolean;
  enabled: boolean;
}

export interface DataExportRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completed_at: string | null;
  download_url: string | null;
  expires_at: string | null;
  format: 'json' | 'csv' | 'xml';
  includes: string[];
}

export interface DataDeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_for: string;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'cancelled';
  completed_at: string | null;
  retention_period: string;
  includes: string[];
  backup_created: boolean;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  location?: string;
  lastActive: string;
  createdAt: string;
  current: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AuthResponse>;
  verifyEmail: (token: string) => Promise<AuthResponse>;
  requestPasswordReset: (email: string) => Promise<AuthResponse>;
  resetPassword: (token: string, password: string) => Promise<AuthResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse>;
  setupTwoFactor: () => Promise<TwoFactorSetup>;
  enableTwoFactor: (code: string) => Promise<AuthResponse>;
  disableTwoFactor: (password: string) => Promise<AuthResponse>;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<AuthResponse>;
  requestDataExport: (format: 'json' | 'csv' | 'xml', includes: string[]) => Promise<DataExportRequest>;
  requestDataDeletion: (retentionPeriod: string, includes: string[]) => Promise<DataDeletionRequest>;
  getSecurityEvents: (limit?: number) => Promise<SecurityEvent[]>;
  getSuspiciousActivity: () => Promise<SuspiciousActivityAlert[]>;
  getActiveSessions: () => Promise<SessionInfo[]>;
  terminateSession: (sessionId: string) => Promise<AuthResponse>;
  terminateAllSessions: () => Promise<AuthResponse>;
  loading: boolean;
  isAuthenticated: boolean;
  updateUser: (userData: Partial<User>) => void;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  data?: unknown;
  requiresVerification?: boolean;
  requires2FA?: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
}

export interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  consentType: 'analytics' | 'marketing' | 'data_sharing' | 'cookies' | 'location';
  onConsent: (granted: boolean) => void;
}

export interface PrivacyDashboardProps {
  user: User;
  onUpdateSettings: (settings: Partial<PrivacySettings>) => void;
  onExportData: () => void;
  onDeleteAccount: () => void;
}

// Additional types for token management (from utils/storage.ts)
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: 'Bearer' | 'Basic';
  scope?: string[];
}

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: 'Bearer' | 'Basic';
  scope?: string[];
}

export interface SessionValidation {
  isValid: boolean;
  expiresAt: Date;
  timeUntilExpiry: number;
  shouldRefresh: boolean;
}

export interface TokenValidation {
  isValid: boolean;
  expiresAt: Date;
  timeUntilExpiry: number;
  shouldRefresh: boolean;
}

// Legacy compatibility - re-export with old names
export type AuthUser = User;