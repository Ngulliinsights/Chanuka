// Users feature types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  roles: string[];
  preferences: UserPreferences;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  interests: string[];
  expertise: string[];
  socialLinks: SocialLinks;
  privacySettings: PrivacySettings;
  notificationPreferences: NotificationPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  billTrackingAlerts: boolean;
  commentReplies: boolean;
  weeklyDigest: boolean;
}

export interface VerificationStatus {
  citizen: VerificationLevel;
  expert: VerificationLevel;
  documents: VerificationDocument[];
  lastVerifiedAt?: string;
  expiresAt?: string;
}

export interface VerificationDocument {
  id: string;
  type: 'id' | 'license' | 'passport' | 'certificate' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  url: string;
  notes?: string;
}

export type VerificationLevel = 'unverified' | 'pending' | 'verified' | 'expert';

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  website?: string;
  github?: string;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  showEmail: boolean;
  showPhone: boolean;
  showActivity: boolean;
  allowMessaging: boolean;
}

export interface NotificationPreferences {
  email: {
    bills: boolean;
    comments: boolean;
    system: boolean;
    marketing: boolean;
  };
  push: {
    bills: boolean;
    comments: boolean;
    system: boolean;
  };
  sms: {
    urgent: boolean;
    verification: boolean;
  };
}

// API request/response types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  location?: string;
  interests?: string[];
  expertise?: string[];
  socialLinks?: Partial<SocialLinks>;
}

export interface UpdatePreferencesData {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  billTrackingAlerts?: boolean;
  commentReplies?: boolean;
  weeklyDigest?: boolean;
}

export interface VerificationRequest {
  documents: File[];
  type: 'citizen' | 'expert';
  notes?: string;
}

// Response types
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ProfileResponse {
  profile: UserProfile;
  isComplete: boolean;
}

export interface VerificationResponse {
  status: VerificationStatus;
  message: string;
  nextSteps?: string[];
}





































