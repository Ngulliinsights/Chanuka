import { api } from '../../../services/api';
import type {
  User,
  UserProfile,
  UserPreferences,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  UpdatePreferencesData,
  VerificationRequest,
  AuthResponse,
  ProfileResponse,
  VerificationResponse,
  VerificationStatus
} from '../types';

/**
 * Users API service - handles all user-related API calls
 * Centralizes API endpoints and response handling for the users feature
 */
export const userApi = {
  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return api.post('/api/auth/login', credentials);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return api.post('/api/auth/register', data);
  },

  async logout(): Promise<void> {
    return api.post('/api/auth/logout');
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return api.post('/api/auth/refresh', { refreshToken });
  },

  async getCurrentUser(): Promise<User> {
    return api.get('/api/auth/me');
  },

  // Profile endpoints
  async getProfile(userId?: string): Promise<ProfileResponse> {
    const endpoint = userId ? `/api/users/${userId}/profile` : '/api/users/profile';
    return api.get(endpoint);
  },

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    return api.put('/api/users/profile', data);
  },

  async updateAvatar(file: File): Promise<{ avatar: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return api.post('/api/users/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async deleteAccount(): Promise<void> {
    return api.delete('/api/users/profile');
  },

  // Preferences endpoints
  async getPreferences(): Promise<UserPreferences> {
    return api.get('/api/users/preferences');
  },

  async updatePreferences(data: UpdatePreferencesData): Promise<UserPreferences> {
    return api.put('/api/users/preferences', data);
  },

  // Verification endpoints
  async getVerificationStatus(): Promise<VerificationStatus> {
    return api.get('/api/users/verification');
  },

  async submitVerification(data: VerificationRequest): Promise<VerificationResponse> {
    const formData = new FormData();

    data.documents.forEach((doc, index) => {
      formData.append(`documents[${index}]`, doc);
    });

    formData.append('type', data.type);
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    return api.post('/api/users/verification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async verifyPhone(code: string): Promise<{ verified: boolean }> {
    return api.post('/api/users/verify-phone', { code });
  },

  async resendPhoneVerification(): Promise<void> {
    return api.post('/api/users/verify-phone/resend');
  },

  // Password management
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    return api.put('/api/users/password', data);
  },

  async requestPasswordReset(email: string): Promise<void> {
    return api.post('/api/auth/forgot-password', { email });
  },

  async resetPassword(data: { token: string; newPassword: string }): Promise<void> {
    return api.post('/api/auth/reset-password', data);
  },

  // User search and discovery
  async searchUsers(query: string, limit = 20): Promise<User[]> {
    return api.get(`/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  },

  async getUserById(userId: string): Promise<User> {
    return api.get(`/api/users/${userId}`);
  },

  // Activity and engagement
  async getUserActivity(userId?: string, limit = 50): Promise<any[]> {
    const endpoint = userId ? `/api/users/${userId}/activity` : '/api/users/activity';
    return api.get(`${endpoint}?limit=${limit}`);
  },

  async getUserStats(userId?: string): Promise<any> {
    const endpoint = userId ? `/api/users/${userId}/stats` : '/api/users/stats';
    return api.get(endpoint);
  }
};




































