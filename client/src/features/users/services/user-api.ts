import { globalApiClient } from '@client/core/api/client';
import { logger } from '@client/shared/utils/logger';

// Define types locally since they're not available in the types directory
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface UserProfile extends User {
  bio?: string;
  location?: string;
  preferences?: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  privacy: 'public' | 'private';
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface UpdateProfileData {
  name?: string;
  bio?: string;
  location?: string;
}

interface UpdatePreferencesData {
  theme?: 'light' | 'dark' | 'system';
  notifications?: boolean;
  privacy?: 'public' | 'private';
}

interface VerificationRequest {
  type: 'citizen' | 'expert';
  documents: File[];
  notes?: string;
}

interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
  expiresAt: string;
}

interface ProfileResponse {
  user: UserProfile;
}

interface VerificationResponse {
  success: boolean;
  message: string;
}

interface VerificationStatus {
  email: boolean;
  phone: boolean;
}

interface SavedBillsFilters {
  page?: number;
  limit?: number;
  category?: string;
}

interface SavedBillsResponse {
  bills: Record<string, unknown>[];
  total: number;
  page: number;
}

interface EngagementHistoryFilters {
  page?: number;
  limit?: number;
  type?: string;
}

interface EngagementHistoryResponse {
  activities: Record<string, unknown>[];
  total: number;
  page: number;
}

interface EngagementAction {
  action_type: 'view' | 'comment' | 'save' | 'share' | 'vote' | 'track';
  entity_type: 'bill' | 'comment' | 'discussion' | 'expert_analysis';
  entity_id: string;
  metadata?: Record<string, unknown>;
}

interface DashboardData {
  savedBills: number;
  trackedBills: number;
  recentActivity: Record<string, unknown>[];
}

/**
 * Users API service - handles all user-related API calls
 * Centralizes API endpoints and response handling for the users feature
 */
export const userApi = {
  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await globalApiClient.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await globalApiClient.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await globalApiClient.post('/api/auth/logout');
  },

  async refreshToken(refresh_token: string): Promise<AuthResponse> {
    const response = await globalApiClient.post<AuthResponse>('/api/auth/refresh', {
      refresh_token,
    });
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await globalApiClient.get<User>('/api/auth/me');
    return response.data;
  },

  // Profile endpoints
  async getUserProfile(user_id?: string): Promise<ProfileResponse> {
    const endpoint = user_id ? `/api/users/${user_id}/profile` : '/api/users/profile';
    const response = await globalApiClient.get<ProfileResponse>(endpoint);
    return response.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await globalApiClient.put<UserProfile>('/api/users/profile', data);
    return response.data;
  },

  async updateAvatar(file: File): Promise<{ avatar: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await globalApiClient.post<{ avatar: string }>(
      '/api/users/profile/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async deleteAccount(): Promise<void> {
    await globalApiClient.delete('/api/users/profile');
  },

  // Preferences endpoints
  async getPreferences(): Promise<UserPreferences> {
    const response = await globalApiClient.get<UserPreferences>('/api/users/preferences');
    return response.data;
  },

  async updatePreferences(data: UpdatePreferencesData): Promise<UserPreferences> {
    const response = await globalApiClient.put<UserPreferences>('/api/users/preferences', data);
    return response.data;
  },

  // Verification endpoints
  async getVerificationStatus(): Promise<VerificationStatus> {
    const response = await globalApiClient.get<VerificationStatus>('/api/users/verification');
    return response.data;
  },

  async submitVerification(data: VerificationRequest): Promise<VerificationResponse> {
    const formData = new FormData();

    if (data.documents) {
      data.documents.forEach((doc: File, index: number) => {
        formData.append(`documents[${index}]`, doc);
      });
    }

    formData.append('type', data.type);
    if (data.notes) {
      formData.append('notes', data.notes);
    }

    const response = await globalApiClient.post<VerificationResponse>(
      '/api/users/verification',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async verifyPhone(code: string): Promise<{ verified: boolean }> {
    const response = await globalApiClient.post<{ verified: boolean }>('/api/users/verify-phone', {
      code,
    });
    return response.data;
  },

  async resendPhoneVerification(): Promise<void> {
    await globalApiClient.post('/api/users/verify-phone/resend');
  },

  // Password management
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await globalApiClient.put('/api/users/password', data);
  },

  async requestPasswordReset(email: string): Promise<void> {
    await globalApiClient.post('/api/auth/forgot-password', { email });
  },

  async resetPassword(data: { token: string; newPassword: string }): Promise<void> {
    await globalApiClient.post('/api/auth/reset-password', data);
  },

  // User search and discovery
  async searchUsers(query: string, limit = 20): Promise<User[]> {
    const response = await globalApiClient.get<User[]>(
      `/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data;
  },

  async getUserById(user_id: string): Promise<User> {
    const response = await globalApiClient.get<User>(`/api/users/${user_id}`);
    return response.data;
  },

  // Activity and engagement
  async getUserActivity(user_id?: string, limit = 50): Promise<Record<string, unknown>[]> {
    const endpoint = user_id ? `/api/users/${user_id}/activity` : '/api/users/activity';
    const response = await globalApiClient.get<Record<string, unknown>[]>(
      `${endpoint}?limit=${limit}`
    );
    return response.data;
  },

  async getUserStats(user_id?: string): Promise<Record<string, unknown>> {
    const endpoint = user_id ? `/api/users/${user_id}/stats` : '/api/users/stats';
    const response = await globalApiClient.get<Record<string, unknown>>(endpoint);
    return response.data;
  },

  // Saved bills management
  async getSavedBills(
    page = 1,
    limit = 20,
    filters?: SavedBillsFilters
  ): Promise<SavedBillsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Add filters only if they have values
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await globalApiClient.get<SavedBillsResponse>(
      `/api/users/saved-bills?${params.toString()}`,
      { cacheTTL: 3 * 60 * 1000 } // 3 minutes cache
    );
    return response.data;
  },

  async saveBill(
    billId: string,
    notes?: string,
    tags: string[] = []
  ): Promise<Record<string, unknown>> {
    const response = await globalApiClient.post<Record<string, unknown>>(
      '/api/users/saved-bills',
      {
        bill_id: billId,
        notes,
        tags,
        notification_enabled: true,
      },
      { skipCache: true }
    );
    return response.data;
  },

  async unsaveBill(billId: string): Promise<void> {
    await globalApiClient.delete(`/api/users/saved-bills/${billId}`, { skipCache: true });
  },

  async updateSavedBill(
    billId: string,
    updates: {
      notes?: string;
      tags?: string[];
      notification_enabled?: boolean;
    }
  ): Promise<Record<string, unknown>> {
    const response = await globalApiClient.patch<Record<string, unknown>>(
      `/api/users/saved-bills/${billId}`,
      updates,
      { skipCache: true }
    );
    return response.data;
  },

  // Engagement tracking
  async getEngagementHistory(
    page = 1,
    limit = 50,
    filters?: EngagementHistoryFilters
  ): Promise<EngagementHistoryResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await globalApiClient.get<EngagementHistoryResponse>(
      `/api/users/engagement-history?${params.toString()}`,
      { cacheTTL: 5 * 60 * 1000 } // 5 minutes cache
    );
    return response.data;
  },

  async trackEngagement(action: EngagementAction): Promise<void> {
    try {
      await globalApiClient.post('/api/users/engagement', action, {
        timeout: 5000, // Shorter timeout for tracking
        skipCache: true,
      });
      logger.debug('Engagement tracked', {
        component: 'UserApiService',
        action: action.action_type,
        entity: action.entity_type,
        entityId: action.entity_id,
      });
    } catch (error) {
      // Silent failure - tracking should never block user actions
      logger.warn('Engagement tracking failed (non-blocking)', {
        component: 'UserApiService',
        action: action.action_type,
        entity: action.entity_type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  // Achievements and gamification
  async getAchievements(): Promise<{
    badges: Record<string, unknown>[];
    achievements: Record<string, unknown>[];
    next_milestones: Record<string, unknown>[];
  }> {
    const response = await globalApiClient.get<{
      badges: Record<string, unknown>[];
      achievements: Record<string, unknown>[];
      next_milestones: Record<string, unknown>[];
    }>('/api/users/achievements', { cacheTTL: 10 * 60 * 1000 }); // 10 minutes cache
    return response.data;
  },

  // Dashboard data
  async getDashboardData(): Promise<DashboardData> {
    const response = await globalApiClient.get<DashboardData>('/api/users/dashboard', {
      timeout: 15000, // Longer timeout for aggregated data
      cacheTTL: 2 * 60 * 1000, // 2 minutes cache
    });
    return response.data;
  },
};
