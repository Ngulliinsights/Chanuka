/**
 * Mock services for testing
 */
import { vi } from 'vitest';

export const mockAuthService = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  refreshTokens: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  changePassword: vi.fn(),
  setupTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  verifyTwoFactor: vi.fn(),
  updateUserProfile: vi.fn(),
  loginWithOAuth: vi.fn(),
  getOAuthUrl: vi.fn(),
  extendSession: vi.fn(),
  getActiveSessions: vi.fn(),
  terminateSession: vi.fn(),
  terminateAllOtherSessions: vi.fn(),
  updatePrivacySettings: vi.fn(),
  requestDataExport: vi.fn(),
  requestDataDeletion: vi.fn(),
  getSecurityEvents: vi.fn(),
  getSuspiciousActivity: vi.fn(),
  validateStoredTokens: vi.fn(),
  getCurrentUserSync: vi.fn(),
  checkPermission: vi.fn(),
  getUserRoles: vi.fn(),
  getResourcePermissions: vi.fn(),
};

export const mockUserApiService = {
  getUserProfile: vi.fn(),
  updateProfile: vi.fn(),
  updatePreferences: vi.fn(),
  getDashboardData: vi.fn(),
  getAchievements: vi.fn(),
  getSavedBills: vi.fn(),
  saveBill: vi.fn(),
  unsaveBill: vi.fn(),
  updateSavedBill: vi.fn(),
  getEngagementHistory: vi.fn(),
  trackEngagement: vi.fn(),
};

// Mock repository interfaces for backward compatibility
export interface IAuthRepository {
  login: any;
  register: any;
  logout: any;
  getCurrentUser: any;
  refreshTokens: any;
  verifyEmail: any;
  requestPasswordReset: any;
  resetPassword: any;
  changePassword: any;
  setupTwoFactor: any;
  enableTwoFactor: any;
  disableTwoFactor: any;
  verifyTwoFactor: any;
}

export interface IUserRepository {
  getUserProfile: any;
  updateProfile: any;
  updatePreferences: any;
  getDashboardData: any;
  getAchievements: any;
  getSavedBills: any;
  saveBill: any;
  unsaveBill: any;
  updateSavedBill: any;
  getEngagementHistory: any;
  trackEngagement: any;
}

export const AuthRepository = mockAuthService;
export const UserRepository = mockUserApiService;

export interface AuthRepositoryConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface UserRepositoryConfig {
  baseUrl?: string;
  timeout?: number;
}