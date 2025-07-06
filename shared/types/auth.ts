export type OAuthProvider = 'google' | 'github' | 'facebook' | 'twitter';

export interface AuthResponse {
  userId: number;
  username: string;
  token?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthState {
  userId?: number;
  username?: string;
  isAuthenticated: boolean;
  error?: string;
  loading: boolean;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  expertise?: string;
  createdAt: Date;
  reputation: number;
  onboardingCompleted: boolean;
}

export interface UserSettings {
  darkMode: boolean;
  emailDigest: boolean;
  billUpdates: boolean;
  commentResponses: boolean;
  newFeatures: boolean;
  publicProfile: boolean;
  showExpertise: boolean;
}
