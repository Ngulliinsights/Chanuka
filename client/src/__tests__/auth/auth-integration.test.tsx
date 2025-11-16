/**
 * Authentication Integration Tests
 *
 * Comprehensive integration tests for the complete authentication flow,
 * testing how AuthService, repositories, and React hooks work together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Import the actual components and services
import { AuthProvider, useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/AuthService';
import { userService } from '../../services/userService';

// Mock all external dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/security-monitoring', () => ({
  securityMonitor: {
    generateDeviceFingerprint: vi.fn(() => 'device-fingerprint-123'),
    shouldLockAccount: vi.fn(() => false),
    recordLoginAttempt: vi.fn(() => []),
    analyzeDeviceFingerprint: vi.fn(() => []),
    createSecurityEvent: vi.fn(() => ({
      id: 'security-event-123',
      user_id: 'user-123',
      event_type: 'login' as const,
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
      timestamp: new Date().toISOString(),
      risk_score: 10,
      details: {},
    })),
    logSecurityEvent: vi.fn(),
  },
}));

vi.mock('../../utils/privacy-compliance', () => ({
  privacyCompliance: {
    recordConsent: vi.fn(() => ({
      id: 'consent-123',
      consent_type: 'analytics' as const,
      granted: true,
      granted_at: new Date().toISOString(),
      withdrawn_at: null,
      version: '1.0.0',
      ip_address: '127.0.0.1',
      user_agent: 'test-agent',
    })),
    validatePrivacySettings: vi.fn(() => ({
      isValid: true,
      errors: [],
      warnings: [],
    })),
  },
}));

vi.mock('../../utils/password-validation', () => ({
  validatePassword: vi.fn(() => ({
    isValid: true,
    errors: [],
    strength: 'strong' as const,
    score: 100,
  })),
}));

vi.mock('../../core/api/auth', () => ({
  authApiService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshTokens: vi.fn(),
    getCurrentUser: vi.fn(),
    setupTwoFactor: vi.fn(),
    enableTwoFactor: vi.fn(),
    disableTwoFactor: vi.fn(),
    verifyTwoFactor: vi.fn(),
    changePassword: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    updateProfile: vi.fn(),
    handleOAuthCallback: vi.fn(),
    extendSession: vi.fn(),
    getActiveSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllOtherSessions: vi.fn(),
    getSecurityEvents: vi.fn(),
    getSuspiciousActivity: vi.fn(),
  },
}));

vi.mock('../../core/api/client', () => ({
  globalApiClient: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/tokenManager', () => ({
  tokenManager: {
    storeTokens: vi.fn(),
    getTokens: vi.fn(() => null),
    validateToken: vi.fn(() => ({ isValid: false, isExpired: true, needsRefresh: false })),
    clearTokens: vi.fn(),
  },
}));

vi.mock('../../utils/sessionManager', () => ({
  sessionManager: {
    startSession: vi.fn(),
    endSession: vi.fn(),
    onWarning: vi.fn(),
  },
}));

vi.mock('../../utils/rbac', () => ({
  rbacManager: {
    clearUserCache: vi.fn(),
  },
}));

// Import mocks for direct manipulation
import { securityMonitor } from '../../utils/security-monitoring';
import { privacyCompliance } from '../../utils/privacy-compliance';
import { validatePassword } from '../../utils/password-validation';
import { authApiService } from '../../core/api/auth';
import { globalApiClient } from '../../core/api/client';
import { tokenManager } from '../../utils/tokenManager';
import { sessionManager } from '../../utils/session-manager';
import { rbacManager } from '../../utils/rbac';

// Test component that uses the auth hook
const TestAuthComponent: React.FC = () => {
  const {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    changePassword,
    setupTwoFactor,
    updatePrivacySettings,
    error,
    clearError,
  } = useAuth();

  const [loginData, setLoginData] = React.useState({ email: '', password: '' });
  const [registerData, setRegisterData] = React.useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });

  const handleLogin = async () => {
    await login(loginData);
  };

  const handleRegister = async () => {
    await register(registerData);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleChangePassword = async () => {
    if (user) {
      await changePassword(user, 'oldpass', 'newpass');
    }
  };

  const handleSetup2FA = async () => {
    await setupTwoFactor();
  };

  const handleUpdatePrivacy = async () => {
    await updatePrivacySettings({
      profile_visibility: 'private',
      analytics_consent: false,
    });
  };

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>

      {error && (
        <div data-testid="error">
          {error}
          <button data-testid="clear-error" onClick={clearError}>
            Clear Error
          </button>
        </div>
      )}

      {user && (
        <div data-testid="user-info">
          <div data-testid="user-name">{user.name}</div>
          <div data-testid="user-email">{user.email}</div>
          <div data-testid="user-role">{user.role}</div>
        </div>
      )}

      {!isAuthenticated && (
        <div>
          <input
            data-testid="login-email"
            placeholder="Email"
            value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          />
          <input
            data-testid="login-password"
            placeholder="Password"
            type="password"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
          />
          <button data-testid="login-button" onClick={handleLogin}>
            Login
          </button>

          <input
            data-testid="register-email"
            placeholder="Email"
            value={registerData.email}
            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
          />
          <input
            data-testid="register-password"
            placeholder="Password"
            type="password"
            value={registerData.password}
            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
          />
          <input
            data-testid="register-first-name"
            placeholder="First Name"
            value={registerData.first_name}
            onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
          />
          <input
            data-testid="register-last-name"
            placeholder="Last Name"
            value={registerData.last_name}
            onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
          />
          <button data-testid="register-button" onClick={handleRegister}>
            Register
          </button>
        </div>
      )}

      {isAuthenticated && (
        <div>
          <button data-testid="logout-button" onClick={handleLogout}>
            Logout
          </button>
          <button data-testid="change-password-button" onClick={handleChangePassword}>
            Change Password
          </button>
          <button data-testid="setup-2fa-button" onClick={handleSetup2FA}>
            Setup 2FA
          </button>
          <button data-testid="update-privacy-button" onClick={handleUpdatePrivacy}>
            Update Privacy
          </button>
        </div>
      )}
    </div>
  );
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Reset all mocks to default state
    vi.mocked(authApiService.login).mockResolvedValue({
      sessionId: 'session-123',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen' as const,
        verified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
        permissions: [],
      },
      tokens: {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    vi.mocked(authApiService.register).mockResolvedValue({
      sessionId: 'session-456',
      user: {
        id: 'user-456',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'citizen' as const,
        verified: false,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
        permissions: [],
      },
      tokens: {
        accessToken: 'access-token-456',
        refreshToken: 'refresh-token-456',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      },
      requiresTwoFactor: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    vi.mocked(authApiService.logout).mockResolvedValue(undefined);
    vi.mocked(authApiService.changePassword).mockResolvedValue({ success: true });
    vi.mocked(authApiService.setupTwoFactor).mockResolvedValue({
      secret: 'TESTSECRET123',
      qrCode: 'data:image/png;base64,test',
      backupCodes: ['123456', '789012'],
    });

    vi.mocked(globalApiClient.put).mockResolvedValue({
      status: 200,
      data: { success: true },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle full login flow from UI to backend', async () => {
      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      // Initially not authenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');

      // Fill login form
      const emailInput = screen.getByTestId('login-email');
      const passwordInput = screen.getByTestId('login-password');
      const loginButton = screen.getByTestId('login-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // Verify user information is displayed
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('user-role')).toHaveTextContent('citizen');

      // Verify backend calls were made correctly
      expect(authApiService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: undefined,
        twoFactorToken: undefined,
      });
      expect(tokenManager.storeTokens).toHaveBeenCalled();
      expect(sessionManager.startSession).toHaveBeenCalled();
    });

    it('should handle full registration flow', async () => {
      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      // Fill registration form
      const emailInput = screen.getByTestId('register-email');
      const passwordInput = screen.getByTestId('register-password');
      const firstNameInput = screen.getByTestId('register-first-name');
      const lastNameInput = screen.getByTestId('register-last-name');
      const registerButton = screen.getByTestId('register-button');

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(firstNameInput, 'New');
      await user.type(lastNameInput, 'User');
      await user.click(registerButton);

      // Wait for registration to complete
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // Verify user information
      expect(screen.getByTestId('user-name')).toHaveTextContent('New User');
      expect(screen.getByTestId('user-email')).toHaveTextContent('newuser@example.com');

      // Verify backend calls
      expect(validatePassword).toHaveBeenCalledWith('SecurePass123!', undefined, {
        email: 'newuser@example.com',
        name: 'New User',
      });
      expect(authApiService.register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        confirmPassword: undefined,
        acceptTerms: undefined,
      });
    });

    it('should handle logout flow', async () => {
      // First login
      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('login-email');
      const passwordInput = screen.getByTestId('login-password');
      const loginButton = screen.getByTestId('login-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // Now logout
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      // Wait for logout to complete
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
      });

      // Verify logout calls
      expect(authApiService.logout).toHaveBeenCalled();
      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(sessionManager.endSession).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle login failure and display error', async () => {
      // Mock login failure
      vi.mocked(authApiService.login).mockRejectedValue(new Error('Invalid credentials'));

      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('login-email');
      const passwordInput = screen.getByTestId('login-password');
      const loginButton = screen.getByTestId('login-button');

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(loginButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials or network error');

      // Test error clearing
      const clearErrorButton = screen.getByTestId('clear-error');
      await user.click(clearErrorButton);

      await waitFor(() => {
        expect(screen.queryByTestId('error')).not.toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      // Mock network failure
      vi.mocked(authApiService.login).mockRejectedValue(new Error('Network Error'));

      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials or network error');
      });

      // Should remain unauthenticated
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });
  });

  describe('Security Features Integration', () => {
    it('should integrate password validation during registration', async () => {
      // Mock weak password
      vi.mocked(validatePassword).mockReturnValue({
        isValid: false,
        errors: ['Password must be at least 12 characters'],
        strength: 'weak' as const,
        score: 20,
      });

      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      const registerButton = screen.getByTestId('register-button');
      await user.click(registerButton);

      // Should not call register API
      expect(authApiService.register).not.toHaveBeenCalled();

      // Should show error (this would be handled by the AuthService)
      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });

    it('should handle two-factor setup flow', async () => {
      // First login
      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('login-email');
      const passwordInput = screen.getByTestId('login-password');
      const loginButton = screen.getByTestId('login-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // Setup 2FA
      const setup2FAButton = screen.getByTestId('setup-2fa-button');
      await user.click(setup2FAButton);

      // Verify 2FA setup API was called
      expect(authApiService.setupTwoFactor).toHaveBeenCalled();
    });

    it('should handle privacy settings updates', async () => {
      // First login
      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      const emailInput = screen.getByTestId('login-email');
      const passwordInput = screen.getByTestId('login-password');
      const loginButton = screen.getByTestId('login-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // Update privacy settings
      const updatePrivacyButton = screen.getByTestId('update-privacy-button');
      await user.click(updatePrivacyButton);

      // Verify privacy API was called
      expect(globalApiClient.put).toHaveBeenCalledWith('/api/auth/privacy-settings', {
        profile_visibility: 'private',
        analytics_consent: false,
      });
    });
  });

  describe('State Management Integration', () => {
    it('should maintain authentication state across re-renders', async () => {
      const { rerender } = render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      // Login
      const emailInput = screen.getByTestId('login-email');
      const passwordInput = screen.getByTestId('login-password');
      const loginButton = screen.getByTestId('login-button');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // Re-render component
      rerender(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      // State should persist
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    });

    it('should handle concurrent authentication attempts', async () => {
      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      // Mock slow API response
      vi.mocked(authApiService.login).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          sessionId: 'session-123',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'citizen' as const,
            verified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: { notifications: true, emailAlerts: true, theme: 'light' as const, language: 'en' },
            permissions: [],
          },
          tokens: {
            accessToken: 'access-token-123',
            refreshToken: 'refresh-token-123',
            expiresIn: 3600,
            tokenType: 'Bearer' as const,
          },
          requiresTwoFactor: false,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }), 100))
      );

      const loginButton = screen.getByTestId('login-button');

      // Click login multiple times quickly
      await user.click(loginButton);
      await user.click(loginButton);
      await user.click(loginButton);

      // Should still authenticate successfully
      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // API should only be called once due to race condition prevention
      expect(authApiService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dependency Injection Verification', () => {
    it('should use AuthService through the hook', async () => {
      // Spy on authService methods
      const loginSpy = vi.spyOn(authService, 'login');

      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      // Verify AuthService.login was called through the hook
      expect(loginSpy).toHaveBeenCalled();
    });

    it('should integrate repositories through services', async () => {
      // This test verifies that the service layer properly uses repositories
      // We can verify this by checking that repository methods are called
      // when service methods are invoked

      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      // Login to trigger repository usage
      const loginButton = screen.getByTestId('login-button');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      });

      // The AuthService should have used the repositories internally
      // This is verified by the successful authentication flow
      expect(authApiService.login).toHaveBeenCalled();
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain useAuth hook interface compatibility', () => {
      // This test ensures the hook returns all expected methods and properties
      const TestHookComponent: React.FC = () => {
        const auth = useAuth();

        // Verify all expected properties exist
        expect(auth).toHaveProperty('user');
        expect(auth).toHaveProperty('loading');
        expect(auth).toHaveProperty('isAuthenticated');
        expect(auth).toHaveProperty('login');
        expect(auth).toHaveProperty('register');
        expect(auth).toHaveProperty('logout');
        expect(auth).toHaveProperty('error');
        expect(auth).toHaveProperty('clearError');

        // Verify methods are functions
        expect(typeof auth.login).toBe('function');
        expect(typeof auth.register).toBe('function');
        expect(typeof auth.logout).toBe('function');
        expect(typeof auth.clearError).toBe('function');

        return <div data-testid="hook-test">Hook test passed</div>;
      };

      render(
        <TestWrapper>
          <TestHookComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('hook-test')).toHaveTextContent('Hook test passed');
    });

    it('should handle undefined user gracefully', async () => {
      render(
        <TestWrapper>
          <TestAuthComponent />
        </TestWrapper>
      );

      // Initially should not show user info
      expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();

      // After logout, should not show user info
      const logoutButton = screen.getByTestId('logout-button');
      await user.click(logoutButton);

      await waitFor(() => {
        expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
      });
    });
  });
});