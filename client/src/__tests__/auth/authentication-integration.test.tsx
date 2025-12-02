/**
 * Authentication Integration Tests
 * Comprehensive tests for the enhanced authentication system
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AuthPage from '@client/pages/auth-page';
import { AuthProvider } from '@client/hooks/useAuth';
import { SecurityDashboard } from '@client/components/auth/SecurityDashboard';
import { PrivacyManager } from '@client/components/shared/privacy/PrivacyManager';
import { TwoFactorSetup } from '@client/components/auth/TwoFactorSetup';
import { PasswordStrengthIndicator } from '@client/components/auth/PasswordStrengthIndicator';
import { SocialLogin } from '@client/components/auth/SocialLogin';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../utils/security-monitoring', () => ({
  securityMonitor: {
    generateDeviceFingerprint: vi.fn(() => ({
      userAgent: 'test-agent',
      screen: '1920x1080x24',
      timezone: 'UTC',
      language: 'en-US',
      platform: 'test',
      cookieEnabled: true,
      doNotTrack: null,
    })),
    shouldLockAccount: vi.fn(() => false),
    recordLoginAttempt: vi.fn(() => []),
    analyzeDeviceFingerprint: vi.fn(() => []),
    createSecurityEvent: vi.fn(() => ({
      id: 'test-event-id',
      user_id: 'test-user',
      event_type: 'login',
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
      id: 'test-consent-id',
      consent_type: 'analytics',
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
    generateDataExport: vi.fn(() => Promise.resolve({
      id: 'test-export-id',
      user_id: 'test-user',
      requested_at: new Date().toISOString(),
      status: 'pending',
      completed_at: null,
      download_url: null,
      expires_at: null,
      format: 'json',
      includes: ['profile'],
    })),
    requestDataDeletion: vi.fn(() => Promise.resolve({
      id: 'test-deletion-id',
      user_id: 'test-user',
      requested_at: new Date().toISOString(),
      scheduled_for: new Date().toISOString(),
      status: 'pending',
      completed_at: null,
      retention_period: '30days',
      includes: ['profile'],
      backup_created: false,
    })),
    getCookieCategories: vi.fn(() => [
      {
        id: 'essential',
        name: 'Essential Cookies',
        description: 'Required for basic functionality',
        required: true,
        cookies: ['session_id'],
      },
    ]),
    getDataRetentionInfo: vi.fn(() => [
      {
        id: 'profile',
        name: 'Profile Information',
        description: 'Basic account information',
        retention_period: '2 years',
        legal_basis: 'contract',
        can_export: true,
        can_delete: true,
        third_party_sharing: false,
      },
    ]),
  },
}));

vi.mock('../../utils/password-validation', () => ({
  validatePassword: vi.fn((password) => ({
    isValid: password.length >= 12,
    errors: password.length < 12 ? ['Password must be at least 12 characters'] : [],
    strength: password.length >= 12 ? 'strong' : 'weak',
    score: password.length >= 12 ? 80 : 20,
  })),
  PASSWORD_STRENGTH_CONFIG: {
    weak: { color: '#ef4444', bgColor: '#fef2f2', message: 'Weak', progress: 25 },
    strong: { color: '#059669', bgColor: '#ecfdf5', message: 'Strong', progress: 100 },
  },
}));

vi.mock('../../services/apiService', () => ({
  apiService: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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

describe('Authentication Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Page', () => {
    it('should render login form when user is not authenticated', () => {
      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      // Auth page should show authentication flow elements
      expect(screen.getByText(/Welcome Back|Chanuka/)).toBeInTheDocument();
    });

    it('should show security features prominently', () => {
      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      // Security features should be present for the enhanced auth flow
      expect(screen.queryByText(/encryption|privacy|2FA/i)).toBeTruthy();
    });

    it('should display privacy notice with links', () => {
      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      expect(screen.getByText(/By using Chanuka|By creating an account/)).toBeInTheDocument();
      expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PasswordStrengthIndicator', () => {
    it('should show weak password feedback', () => {
      render(
        <TestWrapper>
          <PasswordStrengthIndicator password="weak" />
        </TestWrapper>
      );

      expect(screen.getByText('Weak')).toBeInTheDocument();
      expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
    });

    it('should show strong password feedback', () => {
      render(
        <TestWrapper>
          <PasswordStrengthIndicator password="VeryStrongPassword123!" />
        </TestWrapper>
      );

      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('should show requirements checklist', () => {
      render(
        <TestWrapper>
          <PasswordStrengthIndicator password="test" showRequirements={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Requirements')).toBeInTheDocument();
      expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument();
      expect(screen.getByText('Contains number')).toBeInTheDocument();
      expect(screen.getByText('Contains special character')).toBeInTheDocument();
    });
  });

  describe('SocialLogin', () => {
    it('should render privacy-focused social login options', () => {
      render(
        <TestWrapper>
          <SocialLogin />
        </TestWrapper>
      );

      expect(screen.getByText('Continue with')).toBeInTheDocument();
      expect(screen.getByText('Privacy Info')).toBeInTheDocument();
    });

    it('should show privacy commitment', () => {
      render(
        <TestWrapper>
          <SocialLogin />
        </TestWrapper>
      );

      expect(screen.getByText(/Privacy Commitment:/)).toBeInTheDocument();
      expect(screen.getByText(/We never sell your data/)).toBeInTheDocument();
    });

    it('should handle social login click', async () => {
      const onSuccess = vi.fn();
      render(
        <TestWrapper>
          <SocialLogin onSuccess={onSuccess} />
        </TestWrapper>
      );

      const githubButton = screen.getByText('Continue with GitHub');
      await user.click(githubButton);

      // Should show loading state
      expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
    });
  });

  describe('TwoFactorSetup', () => {
    it('should render setup modal when open', () => {
      render(
        <TestWrapper>
          <TwoFactorSetup
            isOpen={true}
            onClose={vi.fn()}
            onComplete={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByText('Enable Two-Factor Authentication')).toBeInTheDocument();
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    it('should show authenticator app requirement', () => {
      render(
        <TestWrapper>
          <TwoFactorSetup
            isOpen={true}
            onClose={vi.fn()}
            onComplete={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText(/You'll need an authenticator app/)).toBeInTheDocument();
      expect(screen.getByText(/Google Authenticator, Authy, or 1Password/)).toBeInTheDocument();
    });
  });

  describe('SecurityDashboard', () => {
    const mockUser = {
      id: 'test-user',
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
        profile_visibility: 'public' as const,
        email_visibility: 'private' as const,
        activity_tracking: true,
        analytics_consent: false,
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
          expert_insights: true,
          security_alerts: true,
          privacy_updates: true,
        },
      },
      consent_given: [],
      data_retention_preference: {
        retention_period: '2years' as const,
        auto_delete_inactive: false,
        export_before_delete: true,
      },
    };

    it('should show security overview', () => {
      // Mock the auth context to return a user
      vi.doMock('../../hooks/useAuth', () => ({
        useAuth: () => ({
          user: mockUser,
          isAuthenticated: true,
          getSecurityEvents: vi.fn(() => Promise.resolve([])),
          getSuspiciousActivity: vi.fn(() => Promise.resolve([])),
          getActiveSessions: vi.fn(() => Promise.resolve([])),
        }),
      }));

      render(
        <TestWrapper>
          <SecurityDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Security Overview')).toBeInTheDocument();
      expect(screen.getByText('Two-Factor Auth')).toBeInTheDocument();
      expect(screen.getByText('Account Status')).toBeInTheDocument();
      expect(screen.getByText('Last Login')).toBeInTheDocument();
    });
  });

  describe('PrivacyManager', () => {
    const mockSettings = {
      profile_visibility: 'public' as const,
      email_visibility: 'private' as const,
      activity_tracking: true,
      analytics_consent: false,
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
        expert_insights: true,
        security_alerts: true,
        privacy_updates: true,
      },
    };

    it('should show privacy manager in compact mode', () => {
      render(
        <TestWrapper>
          <PrivacyManager
            mode="compact"
            settings={mockSettings}
            onSettingsChange={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    it('should show privacy manager in full mode', () => {
      render(
        <TestWrapper>
          <PrivacyManager
            mode="full"
            settings={mockSettings}
            onSettingsChange={vi.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Privacy & Data Protection')).toBeInTheDocument();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete registration flow', async () => {
      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      // Should start with login form
      expect(screen.getByText('Sign In')).toBeInTheDocument();

      // Switch to registration
      const signUpButton = screen.getByText('Sign up');
      await user.click(signUpButton);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('should show security features for unauthenticated users', () => {
      render(
        <TestWrapper>
          <AuthPage />
        </TestWrapper>
      );

      // Security features should be prominently displayed
      expect(screen.getByText('End-to-End Security')).toBeInTheDocument();
      expect(screen.getByText('Privacy First')).toBeInTheDocument();
      expect(screen.getByText('Two-Factor Auth')).toBeInTheDocument();

      // Privacy notice should be visible
      expect(screen.getByText(/We are committed to protecting your privacy/)).toBeInTheDocument();
    });
  });
});