/**
 * UserProfileSection Tests
 * Tests for the consolidated user profile management section
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import UserProfileSection from '@client/UserProfileSection';
import { MockUserFactory } from '@client/test-utils';

// Mock the services
const mockUserService = {
  updateUserProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAccount: vi.fn(),
};

const mockSessionService = {
  getSessions: vi.fn(),
  terminateSession: vi.fn(),
  terminateAllSessions: vi.fn(),
};

vi.mock('../../../services/userService', () => ({
  userService: mockUserService,
}));

vi.mock('../../../services/sessionService', () => ({
  sessionService: mockSessionService,
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

describe('UserProfileSection', () => {
  const mockUser = MockUserFactory.createMockCitizenUser({
    name: 'John Doe',
    email: 'john@example.com',
    verification_status: 'verified',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionService.getSessions.mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          device: 'Chrome on Windows',
          location: 'New York, NY',
          lastActive: '2023-11-18T10:00:00Z',
          current: true,
        },
        {
          id: '2',
          device: 'Safari on iPhone',
          location: 'New York, NY',
          lastActive: '2023-11-17T15:30:00Z',
          current: false,
        },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Profile Display', () => {
    it('displays user information correctly', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText(/verified/i)).toBeInTheDocument();
    });

    it('shows user avatar or initials', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      // Should show avatar or initials
      const avatar = screen.getByTestId('user-avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('displays verification status with appropriate styling', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const verificationBadge = screen.getByTestId('verification-badge');
      expect(verificationBadge).toBeInTheDocument();
      expect(verificationBadge).toHaveClass('verified');
    });

    it('handles unverified users appropriately', () => {
      const unverifiedUser = { ...mockUser, verification_status: 'pending' };
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={unverifiedUser} />, { wrapper: TestWrapper });

      const verificationBadge = screen.getByTestId('verification-badge');
      expect(verificationBadge).toHaveClass('pending');
    });
  });

  describe('Profile Editing', () => {
    it('allows editing profile information', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockUserService.updateUserProfile.mockResolvedValue({
        success: true,
        data: { ...mockUser, name: 'Jane Doe' },
      });

      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Should show edit form
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();

      // Edit name
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Doe');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUserService.updateUserProfile).toHaveBeenCalledWith(mockUser.id, {
          name: 'Jane Doe',
          email: 'john@example.com',
        });
      });
    });

    it('validates form inputs', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Clear required field
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(mockUserService.updateUserProfile).not.toHaveBeenCalled();
    });

    it('handles update errors gracefully', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockUserService.updateUserProfile.mockRejectedValue(new Error('Update failed'));

      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
      });
    });

    it('allows canceling edit mode', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      await user.click(editButton);

      // Make changes
      const nameInput = screen.getByRole('textbox', { name: /name/i });
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should revert to display mode with original data
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Avatar Management', () => {
    it('allows uploading new avatar', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockUserService.uploadAvatar.mockResolvedValue({
        success: true,
        data: { avatarUrl: 'https://example.com/new-avatar.jpg' },
      });

      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const avatarUpload = screen.getByTestId('avatar-upload');
      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      
      await user.upload(avatarUpload, file);

      await waitFor(() => {
        expect(mockUserService.uploadAvatar).toHaveBeenCalledWith(mockUser.id, file);
      });
    });

    it('validates avatar file type and size', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const avatarUpload = screen.getByTestId('avatar-upload');
      const invalidFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      
      await user.upload(avatarUpload, invalidFile);

      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      expect(mockUserService.uploadAvatar).not.toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('displays active sessions', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
        expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
      });
    });

    it('highlights current session', async () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const currentSession = screen.getByTestId('session-1');
        expect(currentSession).toHaveClass('current-session');
      });
    });

    it('allows terminating individual sessions', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockSessionService.terminateSession.mockResolvedValue({ success: true });

      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      await waitFor(() => {
        const terminateButton = screen.getByTestId('terminate-session-2');
        expect(terminateButton).toBeInTheDocument();
      });

      const terminateButton = screen.getByTestId('terminate-session-2');
      await user.click(terminateButton);

      await waitFor(() => {
        expect(mockSessionService.terminateSession).toHaveBeenCalledWith('2');
      });
    });

    it('allows terminating all other sessions', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockSessionService.terminateAllSessions.mockResolvedValue({ success: true });

      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const terminateAllButton = screen.getByRole('button', { name: /terminate all other sessions/i });
      await user.click(terminateAllButton);

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockSessionService.terminateAllSessions).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });

  describe('Account Management', () => {
    it('provides account deletion option', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass('destructive');
    });

    it('requires confirmation for account deletion', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      mockUserService.deleteAccount.mockResolvedValue({ success: true });

      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/permanently delete your account/i)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /type "DELETE"/i })).toBeInTheDocument();

      // Type confirmation
      const confirmInput = screen.getByRole('textbox', { name: /type "DELETE"/i });
      await user.type(confirmInput, 'DELETE');

      const confirmDeleteButton = screen.getByRole('button', { name: /delete account/i });
      await user.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockUserService.deleteAccount).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      // All interactive elements should have proper labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      editButton.focus();
      
      await user.keyboard('{Enter}');
      
      // Should enter edit mode
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    });

    it('provides screen reader friendly content', () => {
      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      // Should have proper headings and landmarks
      expect(screen.getByRole('heading', { name: /profile information/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /active sessions/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const TestWrapper = createTestWrapper();
      
      render(<UserProfileSection user={mockUser} />, { wrapper: TestWrapper });

      const container = screen.getByTestId('profile-section');
      expect(container).toHaveClass('mobile-layout');
    });
  });
});