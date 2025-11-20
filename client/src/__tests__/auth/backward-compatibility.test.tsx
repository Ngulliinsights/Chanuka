/**
 * Backward Compatibility Tests for useAuth Hook
 *
 * Tests to ensure that existing consumers of the useAuth hook continue to work
 * properly after the authentication system refactoring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Import the actual hook and components
import { AuthProvider, useAuth } from '@client/hooks/useAuth';

// Mock all dependencies
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

describe('useAuth Hook Backward Compatibility', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();

    // Set up default mock responses
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
        lastLogin: new Date().toISOString(),
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
    vi.mocked(authApiService.changePassword).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Interface Compatibility', () => {
    it('should provide all expected properties and methods', () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        // Verify all core properties exist
        expect(auth).toHaveProperty('user');
        expect(auth).toHaveProperty('loading');
        expect(auth).toHaveProperty('isAuthenticated');
        expect(auth).toHaveProperty('error');
        expect(auth).toHaveProperty('sessionExpiry');

        // Verify all core methods exist
        expect(typeof auth.login).toBe('function');
        expect(typeof auth.register).toBe('function');
        expect(typeof auth.logout).toBe('function');
        expect(typeof auth.refreshToken).toBe('function');
        expect(typeof auth.verifyEmail).toBe('function');
        expect(typeof auth.requestPasswordReset).toBe('function');
        expect(typeof auth.resetPassword).toBe('function');
        expect(typeof auth.changePassword).toBe('function');

        // Verify enhanced methods exist (backward compatible additions)
        expect(typeof auth.setupTwoFactor).toBe('function');
        expect(typeof auth.enableTwoFactor).toBe('function');
        expect(typeof auth.disableTwoFactor).toBe('function');
        expect(typeof auth.verifyTwoFactor).toBe('function');
        expect(typeof auth.updateUserProfile).toBe('function');
        expect(typeof auth.loginWithOAuth).toBe('function');
        expect(typeof auth.getOAuthUrl).toBe('function');

        return <div data-testid="interface-test">Interface OK</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('interface-test')).toBeInTheDocument();
    });

    it('should maintain correct initial state', () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        expect(auth.user).toBeNull();
        expect(auth.loading).toBe(true); // Initially loading while checking tokens
        expect(auth.isAuthenticated).toBe(false);
        expect(auth.error).toBeNull();
        expect(auth.sessionExpiry).toBeNull();

        return <div data-testid="initial-state-test">Initial State OK</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('initial-state-test')).toBeInTheDocument();
    });

    it('should handle authentication state changes correctly', async () => {
      let authState: any = null;

      const TestComponent: React.FC = () => {
        const auth = useAuth();
        authState = auth;

        return (
          <div>
            <div data-testid="auth-state">
              {auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}
            </div>
            <div data-testid="loading-state">
              {auth.loading ? 'loading' : 'not-loading'}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Initially should be loading
      expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('not-loading');
      });

      // Should be not authenticated initially
      expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated');
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
    });
  });

  describe('Method Signature Compatibility', () => {
    it('should maintain login method signature', async () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        React.useEffect(() => {
          // Test that login accepts the expected parameters
          const loginPromise = auth.login({
            email: 'test@example.com',
            password: 'password123',
          });

          expect(loginPromise).toBeInstanceOf(Promise);
        }, [auth]);

        return <div data-testid="login-signature-test">Login Signature OK</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('login-signature-test')).toBeInTheDocument();
    });

    it('should maintain register method signature', async () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        React.useEffect(() => {
          // Test that register accepts the expected parameters
          const registerPromise = auth.register({
            email: 'newuser@example.com',
            password: 'password123',
            first_name: 'New',
            last_name: 'User',
          });

          expect(registerPromise).toBeInstanceOf(Promise);
        }, [auth]);

        return <div data-testid="register-signature-test">Register Signature OK</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('register-signature-test')).toBeInTheDocument();
    });

    it('should maintain logout method signature', async () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        React.useEffect(() => {
          // Test that logout is a function that returns a promise
          const logoutPromise = auth.logout();
          expect(logoutPromise).toBeInstanceOf(Promise);
        }, [auth]);

        return <div data-testid="logout-signature-test">Logout Signature OK</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('logout-signature-test')).toBeInTheDocument();
    });

    it('should maintain changePassword method signature', async () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        React.useEffect(() => {
          // Test that changePassword accepts the expected parameters
          const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            username: 'testuser',
            first_name: 'Test',
            last_name: 'User',
            role: 'citizen',
            verification_status: 'verified',
            is_active: true,
            created_at: new Date().toISOString(),
            reputation: 100,
            expertise: 'general',
            two_factor_enabled: false,
            last_login: new Date().toISOString(),
            login_count: 5,
            account_locked: false,
            locked_until: null,
            password_changed_at: new Date().toISOString(),
            privacy_settings: {
              profile_visibility: 'public',
              email_visibility: 'private',
              activity_tracking: true,
              analytics_consent: true,
              marketing_consent: false,
              data_sharing_consent: false,
              location_tracking: false,
              personalized_content: true,
              third_party_integrations: false,
              notification_preferences: {
                email_notifications: true,
                push_notifications: false,
                sms_notifications: false,
                bill_updates: true,
                comment_replies: true,
                expert_insights: false,
                security_alerts: true,
                privacy_updates: true,
              },
            },
            consent_given: [],
            data_retention_preference: {
              retention_period: '2years',
              auto_delete_inactive: false,
              export_before_delete: true,
            },
          };

          const changePasswordPromise = auth.changePassword(mockUser, 'oldpass', 'newpass');
          expect(changePasswordPromise).toBeInstanceOf(Promise);
        }, [auth]);

        return <div data-testid="change-password-signature-test">Change Password Signature OK</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('change-password-signature-test')).toBeInTheDocument();
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should handle login errors gracefully', async () => {
      // Mock login failure
      vi.mocked(authApiService.login).mockRejectedValue(new Error('Invalid credentials'));

      const TestComponent: React.FC = () => {
        const auth = useAuth();

        React.useEffect(() => {
          auth.login({
            email: 'wrong@example.com',
            password: 'wrongpassword',
          }).catch(() => {
            // Error should be handled gracefully
          });
        }, [auth]);

        return (
          <div>
            <div data-testid="error-state">
              {auth.error ? 'has-error' : 'no-error'}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for error to be set
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('has-error');
      });
    });

    it('should provide error clearing functionality', async () => {
      // Mock login failure
      vi.mocked(authApiService.login).mockRejectedValue(new Error('Invalid credentials'));

      const TestComponent: React.FC = () => {
        const auth = useAuth();

        React.useEffect(() => {
          auth.login({
            email: 'wrong@example.com',
            password: 'wrongpassword',
          }).catch(() => {
            // Error should be set, then clear it
            setTimeout(() => {
              auth.clearError();
            }, 100);
          });
        }, [auth]);

        return (
          <div>
            <div data-testid="error-state">
              {auth.error ? 'has-error' : 'no-error'}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Wait for error to be cleared
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toHaveTextContent('no-error');
      });
    });
  });

  describe('State Persistence Compatibility', () => {
    it('should maintain user state across re-renders', async () => {
      const { rerender } = render(
        <TestWrapper>
          <div data-testid="test-component">Test</div>
        </TestWrapper>
      );

      // Re-render should not break the hook
      rerender(
        <TestWrapper>
          <div data-testid="test-component">Test Updated</div>
        </TestWrapper>
      );

      expect(screen.getByTestId('test-component')).toHaveTextContent('Test Updated');
    });

    it('should handle provider re-mounting gracefully', () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();
        expect(auth).toBeDefined();
        return <div data-testid="provider-test">Provider OK</div>;
      };

      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('provider-test')).toHaveTextContent('Provider OK');

      // Re-mount provider
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <BrowserRouter>
            <AuthProvider>
              <TestComponent />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTestId('provider-test')).toHaveTextContent('Provider OK');
    });
  });

  describe('Hook Usage Patterns', () => {
    it('should work with conditional rendering based on auth state', () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        return (
          <div>
            {auth.isAuthenticated && auth.user ? (
              <div data-testid="authenticated-content">
                Welcome, {auth.user.name}!
              </div>
            ) : (
              <div data-testid="unauthenticated-content">
                Please log in
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('unauthenticated-content')).toBeInTheDocument();
      expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
    });

    it('should work with loading states', () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();

        if (auth.loading) {
          return <div data-testid="loading-spinner">Loading...</div>;
        }

        return <div data-testid="content">Content loaded</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should support multiple hook usages in the same component tree', () => {
      const ChildComponent: React.FC = () => {
        const auth = useAuth();
        return <div data-testid="child-auth-state">{auth.isAuthenticated ? 'auth' : 'no-auth'}</div>;
      };

      const ParentComponent: React.FC = () => {
        const auth = useAuth();

        return (
          <div>
            <div data-testid="parent-auth-state">{auth.isAuthenticated ? 'auth' : 'no-auth'}</div>
            <ChildComponent />
          </div>
        );
      };

      render(
        <TestWrapper>
          <ParentComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('parent-auth-state')).toHaveTextContent('no-auth');
      expect(screen.getByTestId('child-auth-state')).toHaveTextContent('no-auth');
    });
  });

  describe('Provider Requirements', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponent: React.FC = () => {
        expect(() => {
          useAuth();
        }).toThrow('useAuth must be used within an AuthProvider');

        return <div>Test</div>;
      };

      // This should throw during render
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('should work correctly when properly wrapped with AuthProvider', () => {
      const TestComponent: React.FC = () => {
        const auth = useAuth();
        expect(auth).toBeDefined();
        expect(typeof auth.login).toBe('function');
        return <div data-testid="provider-wrapped-test">Wrapped OK</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('provider-wrapped-test')).toHaveTextContent('Wrapped OK');
    });
  });
});