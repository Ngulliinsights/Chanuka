export interface UserProfile {
  id: string;
  username?: string | null;
  email: string;
  role: 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
  displayName?: string | null;
  avatarUrl?: string | null;
  expertise?: string[] | null;
  createdAt: Date;
  lastLoginAt?: Date | null;
}

export interface OAuthProvider {
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
}

export interface SocialProfile {
  id: string;
  userId: string;
  provider: string;
  profileId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}











































