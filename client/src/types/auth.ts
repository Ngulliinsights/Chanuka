/**
 * Authentication and Privacy Types
 * Comprehensive type definitions for secure authentication and privacy controls
 */

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  verification_status: string;
  is_active: boolean | null;
  created_at: string;
  reputation: number;
  expertise: string;
  // Enhanced security fields
  two_factor_enabled: boolean;
  last_login: string | null;
  login_count: number;
  account_locked: boolean;
  locked_until: string | null;
  password_changed_at: string;
  // Privacy settings
  privacy_settings: PrivacySettings;
  consent_given: ConsentRecord[];
  data_retention_preference: DataRetentionPreference;
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

export interface LoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
  two_factor_code?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: string;
  privacy_settings?: Partial<PrivacySettings>;
  consent_records?: Omit<ConsentRecord, 'id' | 'granted_at' | 'ip_address' | 'user_agent'>[];
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
  qr_code: string;
  backup_codes: string[];
}

export interface SecurityEvent {
  id: string;
  user_id: string;
  event_type: 'login' | 'logout' | 'password_change' | 'failed_login' | 'suspicious_activity' | 'account_locked' | 'two_factor_enabled' | 'two_factor_disabled';
  ip_address: string;
  user_agent: string;
  location?: string;
  timestamp: string;
  risk_score: number;
  details: Record<string, any>;
}

export interface SuspiciousActivityAlert {
  id: string;
  user_id: string;
  alert_type: 'unusual_location' | 'multiple_failed_logins' | 'new_device' | 'unusual_time' | 'rapid_requests';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  triggered_at: string;
  resolved: boolean;
  resolved_at: string | null;
  actions_taken: string[];
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
  user_id: string;
  created_at: string;
  last_activity: string;
  ip_address: string;
  user_agent: string;
  location?: string;
  is_current: boolean;
  expires_at: string;
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
  data?: any;
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