import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationProvider } from '@/contexts/NavigationContext';
import MobileNavigation from '../MobileNavigation';
import RoleBasedNavigation from '../RoleBasedNavigation';

// Mock the auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

// Mock the media query hook
vi.mock('@/hooks/use-mobile', () => ({
  useMediaQuery: () => false,
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialPath?: string }> = ({ 
  children, 
  initialPath = '/' 
}) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </MemoryRouter>
);

describe('Active State Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MobileNavigation Active States', () => {
    it('should highlight home page correctly', () => {
      render(
        <TestWrapper initialPath="/">
          <MobileNavigation />
        </TestWrapper>
      );

      // Check bottom navigation - Home should be active
      const homeButton = screen.getByLabelText('Navigate to Home');
      expect(homeButton).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold', 'scale-105');

      // Bills should not be active
      const billsButton = screen.getByLabelText('Navigate to Bills');
      expect(billsButton).toHaveClass('text-gray-500');
      expect(billsButton).not.toHaveClass('bg-blue-50');
    });

    it('should highlight bills page correctly', () => {
      render(
        <TestWrapper initialPath="/bills">
          <MobileNavigation />
        </TestWrapper>
      );

      // Check bottom navigation - Bills should be active
      const billsButton = screen.getByLabelText('Navigate to Bills');
      expect(billsButton).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold', 'scale-105');

      // Home should not be active
      const homeButton = screen.getByLabelText('Navigate to Home');
      expect(homeButton).toHaveClass('text-gray-500');
      expect(homeButton).not.toHaveClass('bg-blue-50');
    });

    it('should handle nested routes correctly', () => {
      render(
        <TestWrapper initialPath="/admin/users">
          <MobileNavigation />
        </TestWrapper>
      );

      // Open mobile menu to access admin navigation
      const menuButton = screen.getByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      // Admin Panel should be active for nested admin routes
      const adminButton = screen.getByText('Admin Panel');
      expect(adminButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold');
    });

    it('should update active states immediately on navigation', () => {
      render(
        <TestWrapper initialPath="/">
          <MobileNavigation />
        </TestWrapper>
      );

      // Initially home should be active
      let homeButton = screen.getByLabelText('Navigate to Home');
      expect(homeButton).toHaveClass('bg-blue-50', 'text-blue-700');

      // Click on bills
      const billsButton = screen.getByLabelText('Navigate to Bills');
      fireEvent.click(billsButton);

      // After navigation, bills should be active and home should not be
      expect(billsButton).toHaveClass('bg-blue-50', 'text-blue-700');
      homeButton = screen.getByLabelText('Navigate to Home');
      expect(homeButton).not.toHaveClass('bg-blue-50');
    });
  });

  describe('RoleBasedNavigation Active States', () => {
    it('should highlight active items correctly', () => {
      render(
        <TestWrapper initialPath="/bills">
          <RoleBasedNavigation section="legislative" />
        </TestWrapper>
      );

      // Bills Dashboard should be active
      const billsButton = screen.getByText('Bills Dashboard');
      expect(billsButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold');

      // Home should not be active
      const homeButton = screen.getByText('Home');
      expect(homeButton.closest('button')).not.toHaveClass('bg-blue-50');
    });

    it('should handle admin-only items with special styling', () => {
      render(
        <TestWrapper initialPath="/admin">
          <RoleBasedNavigation section="admin" />
        </TestWrapper>
      );

      // Admin Panel should be active with admin styling
      const adminButton = screen.getByText('Admin Panel');
      expect(adminButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold');
    });

    it('should show consistent styling across different sections', () => {
      render(
        <TestWrapper initialPath="/community">
          <RoleBasedNavigation section="community" />
        </TestWrapper>
      );

      // Community Input should be active
      const communityButton = screen.getByText('Community Input');
      expect(communityButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold');
    });
  });

  describe('Cross-Component Consistency', () => {
    it('should maintain consistent active states across mobile and role-based navigation', () => {
      render(
        <TestWrapper initialPath="/bills">
          <div>
            <MobileNavigation />
            <RoleBasedNavigation section="legislative" />
          </div>
        </TestWrapper>
      );

      // Both components should show bills as active with consistent styling
      const mobileBillsButton = screen.getByLabelText('Navigate to Bills');
      const roleBasedBillsButton = screen.getByText('Bills Dashboard');

      // Both should have the same active state classes
      expect(mobileBillsButton).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold');
      expect(roleBasedBillsButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold');
    });

    it('should handle exact path matching consistently', () => {
      render(
        <TestWrapper initialPath="/dashboard">
          <div>
            <MobileNavigation />
            <RoleBasedNavigation section="user" />
          </div>
        </TestWrapper>
      );

      // Dashboard should be active in role-based navigation
      const dashboardButton = screen.getByText('Personal Dashboard');
      expect(dashboardButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200', 'font-semibold');
    });
  });

  describe('Icon and Text Styling', () => {
    it('should apply correct icon styling for active states', () => {
      render(
        <TestWrapper initialPath="/">
          <MobileNavigation />
        </TestWrapper>
      );

      // Home icon should have active styling
      const homeButton = screen.getByLabelText('Navigate to Home');
      const iconContainer = homeButton.querySelector('div > div');
      expect(iconContainer).toHaveClass('scale-110', 'text-blue-600');

      // Bills icon should not have active styling
      const billsButton = screen.getByLabelText('Navigate to Bills');
      const billsIconContainer = billsButton.querySelector('div > div');
      expect(billsIconContainer).not.toHaveClass('scale-110');
    });

    it('should apply correct text styling for active states', () => {
      render(
        <TestWrapper initialPath="/">
          <MobileNavigation />
        </TestWrapper>
      );

      // Home text should be semibold
      const homeButton = screen.getByLabelText('Navigate to Home');
      const homeText = homeButton.querySelector('span');
      expect(homeText).toHaveClass('font-semibold');

      // Bills text should be medium weight
      const billsButton = screen.getByLabelText('Navigate to Bills');
      const billsText = billsButton.querySelector('span');
      expect(billsText).toHaveClass('font-medium');
      expect(billsText).not.toHaveClass('font-semibold');
    });
  });

  describe('Route Change Responsiveness', () => {
    it('should update active states immediately when route changes', () => {
      const { rerender } = render(
        <TestWrapper initialPath="/">
          <RoleBasedNavigation section="legislative" />
        </TestWrapper>
      );

      // Initially home should be active
      let homeButton = screen.getByText('Home');
      expect(homeButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700');

      // Re-render with different path
      rerender(
        <TestWrapper initialPath="/bills">
          <RoleBasedNavigation section="legislative" />
        </TestWrapper>
      );

      // Now bills should be active and home should not be
      const billsButton = screen.getByText('Bills Dashboard');
      expect(billsButton.closest('button')).toHaveClass('bg-blue-50', 'text-blue-700');

      homeButton = screen.getByText('Home');
      expect(homeButton.closest('button')).not.toHaveClass('bg-blue-50');
    });
  });
});