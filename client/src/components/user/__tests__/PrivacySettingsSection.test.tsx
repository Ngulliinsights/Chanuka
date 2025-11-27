/**
 * PrivacySettingsSection Tests
 * Tests for the consolidated privacy settings management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import PrivacySettingsSection from '@client/PrivacySettingsSection';
import { MockUserFactory } from '@client/test-utils';

// Mock the services
const mockPrivacyService = {
  getPrivacySettings: vi.fn(),
  updatePrivacySettings: vi.fn(),
  exportUserData: vi.fn(),
  deleteUserData: vi.fn(),
  getDataUsageReport: vi.fn(),
};

const mockGDPRService = {
  submitDataRequest: vi.fn(),
  getDataRequests: vi.fn(),
  revokeConsent: vi.fn(),
};

vi.mock('../../../services/privacyService', () => ({
  privacyService: mockPrivacyService,
}));

vi.mock('../../../services/gdprService', () => ({
  gdprService: mockGDPRService,
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('PrivacySettingsSection', () => {
  const mockUser = MockUserFactory.createMockCitizenUser({
    id: 'user-123',
    email: 'john@example.com',
  });

  const mockPrivacySettings = {
    dataSharing: {
      analytics: true,
      marketing: false,
      research: true,
    },
    visibility: {
      profile: 'public',
      activity: 'friends',
      comments: 'public',
    },
    notifications: {
      email: true,
      push: false,
      sms: false,
    },
    cookies: {
      essential: true,
      functional: true,
      analytics: false,
      marketing: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrivacyService.getPrivacySettings.mockResolvedValue({
      success: true,
      data: mockPrivacySettings,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Privacy Settings Display', () => {
    it('displays current privacy settings', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /analytics data sharing/i })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /marketing data sharing/i })).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: /research data sharing/i })).toBeChecked();
      });
    });

    it('organizes settings into logical sections', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /data sharing/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /visibility/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /cookies/i })).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching settings', () => {
      mockPrivacyService.getPrivacySettings.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      expect(screen.getByTestId('privacy-settings-loading')).toBeInTheDocument();
    });
  });

  describe('Settings Modification', () => {
    it('allows toggling data sharing preferences', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.updatePrivacySettings.mockResolvedValue({
        success: true,
        data: { ...mockPrivacySettings, dataSharing: { ...mockPrivacySettings.dataSharing, marketing: true } },
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const marketingCheckbox = screen.getByRole('checkbox', { name: /marketing data sharing/i });
        expect(marketingCheckbox).not.toBeChecked();
      });

      const marketingCheckbox = screen.getByRole('checkbox', { name: /marketing data sharing/i });
      await user.click(marketingCheckbox);

      await waitFor(() => {
        expect(mockPrivacyService.updatePrivacySettings).toHaveBeenCalledWith(mockUser.id, {
          ...mockPrivacySettings,
          dataSharing: { ...mockPrivacySettings.dataSharing, marketing: true },
        });
      });
    });

    it('allows changing visibility settings', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.updatePrivacySettings.mockResolvedValue({
        success: true,
        data: mockPrivacySettings,
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const profileVisibility = screen.getByRole('combobox', { name: /profile visibility/i });
        expect(profileVisibility).toHaveValue('public');
      });

      const profileVisibility = screen.getByRole('combobox', { name: /profile visibility/i });
      await user.selectOptions(profileVisibility, 'private');

      await waitFor(() => {
        expect(mockPrivacyService.updatePrivacySettings).toHaveBeenCalledWith(mockUser.id, {
          ...mockPrivacySettings,
          visibility: { ...mockPrivacySettings.visibility, profile: 'private' },
        });
      });
    });

    it('handles update errors gracefully', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.updatePrivacySettings.mockRejectedValue(new Error('Update failed'));

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const marketingCheckbox = screen.getByRole('checkbox', { name: /marketing data sharing/i });
        expect(marketingCheckbox).toBeInTheDocument();
      });

      const marketingCheckbox = screen.getByRole('checkbox', { name: /marketing data sharing/i });
      await user.click(marketingCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/failed to update privacy settings/i)).toBeInTheDocument();
      });

      // Should revert the checkbox state
      expect(marketingCheckbox).not.toBeChecked();
    });

    it('provides immediate feedback on changes', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.updatePrivacySettings.mockResolvedValue({
        success: true,
        data: mockPrivacySettings,
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const marketingCheckbox = screen.getByRole('checkbox', { name: /marketing data sharing/i });
        expect(marketingCheckbox).toBeInTheDocument();
      });

      const marketingCheckbox = screen.getByRole('checkbox', { name: /marketing data sharing/i });
      await user.click(marketingCheckbox);

      // Should show saving indicator
      expect(screen.getByText(/saving/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/settings saved/i)).toBeInTheDocument();
      });
    });
  });

  describe('GDPR Compliance', () => {
    it('provides data export functionality', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.exportUserData.mockResolvedValue({
        success: true,
        data: { downloadUrl: 'https://example.com/export.zip' },
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      const exportButton = screen.getByRole('button', { name: /export my data/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockPrivacyService.exportUserData).toHaveBeenCalledWith(mockUser.id);
      });

      expect(screen.getByText(/data export ready/i)).toBeInTheDocument();
    });

    it('provides data deletion functionality', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.deleteUserData.mockResolvedValue({
        success: true,
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      const deleteButton = screen.getByRole('button', { name: /delete my data/i });
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/permanently delete all your data/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm deletion/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockPrivacyService.deleteUserData).toHaveBeenCalledWith(mockUser.id);
      });
    });

    it('allows submitting data requests', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockGDPRService.submitDataRequest.mockResolvedValue({
        success: true,
        data: { requestId: 'req-123' },
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      const requestButton = screen.getByRole('button', { name: /submit data request/i });
      await user.click(requestButton);

      // Should show request form
      const requestType = screen.getByRole('combobox', { name: /request type/i });
      await user.selectOptions(requestType, 'access');

      const submitButton = screen.getByRole('button', { name: /submit request/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockGDPRService.submitDataRequest).toHaveBeenCalledWith(mockUser.id, {
          type: 'access',
        });
      });
    });

    it('displays data usage report', async () => {
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.getDataUsageReport.mockResolvedValue({
        success: true,
        data: {
          dataCollected: ['profile', 'activity', 'preferences'],
          purposes: ['service_improvement', 'analytics'],
          thirdParties: ['analytics_provider'],
          retention: '2 years',
        },
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      const reportTab = screen.getByRole('tab', { name: /data usage report/i });
      await userEvent.setup().click(reportTab);

      await waitFor(() => {
        expect(screen.getByText(/data collected/i)).toBeInTheDocument();
        expect(screen.getByText(/purposes/i)).toBeInTheDocument();
        expect(screen.getByText(/third parties/i)).toBeInTheDocument();
        expect(screen.getByText(/retention/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cookie Management', () => {
    it('displays cookie preferences', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByRole('checkbox', { name: /essential cookies/i })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /functional cookies/i })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: /analytics cookies/i })).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: /marketing cookies/i })).not.toBeChecked();
      });
    });

    it('prevents disabling essential cookies', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const essentialCookies = screen.getByRole('checkbox', { name: /essential cookies/i });
        expect(essentialCookies).toBeDisabled();
      });
    });

    it('explains cookie purposes', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const infoButton = screen.getByRole('button', { name: /cookie info/i });
        expect(infoButton).toBeInTheDocument();
      });

      const infoButton = screen.getByRole('button', { name: /cookie info/i });
      await user.click(infoButton);

      expect(screen.getByText(/essential cookies are required/i)).toBeInTheDocument();
    });
  });

  describe('Tabbed Interface', () => {
    it('switches between privacy sections', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      // Should start with settings tab
      expect(screen.getByRole('tab', { name: /settings/i })).toHaveAttribute('aria-selected', 'true');

      // Switch to GDPR tab
      const gdprTab = screen.getByRole('tab', { name: /gdpr rights/i });
      await user.click(gdprTab);

      expect(gdprTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /settings/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('maintains tab state during updates', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockPrivacyService.updatePrivacySettings.mockResolvedValue({
        success: true,
        data: mockPrivacySettings,
      });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      // Switch to cookies tab
      const cookiesTab = screen.getByRole('tab', { name: /cookies/i });
      await user.click(cookiesTab);

      // Make a change
      const functionalCookies = screen.getByRole('checkbox', { name: /functional cookies/i });
      await user.click(functionalCookies);

      // Should stay on cookies tab
      expect(cookiesTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and descriptions', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAccessibleName();
        });
      });
    });

    it('provides clear explanations for privacy options', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/analytics data helps us improve/i)).toBeInTheDocument();
        expect(screen.getByText(/marketing data is used for/i)).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const firstCheckbox = screen.getByRole('checkbox', { name: /analytics data sharing/i });
        firstCheckbox.focus();
      });

      const firstCheckbox = screen.getByRole('checkbox', { name: /analytics data sharing/i });
      await user.keyboard('{Space}');

      await waitFor(() => {
        expect(mockPrivacyService.updatePrivacySettings).toHaveBeenCalled();
      });
    });

    it('has proper heading hierarchy', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 2, name: /privacy settings/i });
        expect(mainHeading).toBeInTheDocument();

        const sectionHeadings = screen.getAllByRole('heading', { level: 3 });
        expect(sectionHeadings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles settings loading errors', async () => {
      mockPrivacyService.getPrivacySettings.mockRejectedValue(new Error('Network error'));

      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/failed to load privacy settings/i)).toBeInTheDocument();
      });
    });

    it('provides retry mechanism for failed operations', async () => {
      const user = userEvent.setup();
      mockPrivacyService.getPrivacySettings.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true, data: mockPrivacySettings });

      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockPrivacyService.getPrivacySettings).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('checkbox', { name: /analytics data sharing/i })).toBeInTheDocument();
      });
    });
  });

  describe('Legal Compliance', () => {
    it('displays privacy policy links', () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    });

    it('shows consent timestamps', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/consent given on/i)).toBeInTheDocument();
      });
    });

    it('allows withdrawing consent', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockGDPRService.revokeConsent.mockResolvedValue({ success: true });

      render(<PrivacySettingsSection user={mockUser} />, { wrapper: TestWrapper });

      const revokeButton = screen.getByRole('button', { name: /withdraw consent/i });
      await user.click(revokeButton);

      // Should show confirmation
      expect(screen.getByText(/withdraw all consent/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm withdrawal/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockGDPRService.revokeConsent).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });
});