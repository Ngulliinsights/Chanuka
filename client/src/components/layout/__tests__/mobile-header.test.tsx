import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileHeader } from '../mobile-header';
import { HeaderAction } from '@shared/types';
import { LayoutRenderError } from '../errors';

// Mock dependencies
vi.mock('@/components/ui/logo', () => ({
  Logo: (props: any) => (
    <div data-testid="logo" data-size={props.size} data-show-text={props.showText} className={props.textClassName}>
      Logo
    </div>
  ),
}));

vi.mock('../../lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('wouter', () => ({
  Link: (props: any) => (
    <a href={props.to} onClick={props.onClick} className={props.className} data-testid="nav-link">
      {props.children}
    </a>
  ),
  useLocation: () => ['/dashboard'],
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('MobileHeader Component', () => {
  const defaultProps = {
    title: 'Test App',
    showLogo: true,
    showSearch: true,
    showMenu: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('logo')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    });

    it('should render with title when logo is hidden', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} showLogo={false} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('logo')).not.toBeInTheDocument();
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('should hide search button when showSearch is false', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} showSearch={false} />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Search')).not.toBeInTheDocument();
    });

    it('should hide menu button when showMenu is false', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} showMenu={false} />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Open menu')).not.toBeInTheDocument();
    });
  });

  describe('Header Actions', () => {
    it('should render left actions', () => {
      const leftActions: HeaderAction[] = [
        {
          id: 'back',
          icon: <span>←</span>,
          label: 'Go back',
          onClick: vi.fn(),
        },
      ];

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} leftActions={leftActions} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('should render right actions', () => {
      const rightActions: HeaderAction[] = [
        {
          id: 'notifications',
          icon: <span>🔔</span>,
          label: 'Notifications',
          onClick: vi.fn(),
          badge: 3,
        },
      ];

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} rightActions={rightActions} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should handle action clicks', async () => {
      const user = userEvent.setup();
      const onActionClick = vi.fn();
      const leftActions: HeaderAction[] = [
        {
          id: 'test-action',
          icon: <span>Test</span>,
          label: 'Test Action',
          onClick: onActionClick,
        },
      ];

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} leftActions={leftActions} />
        </TestWrapper>
      );

      const actionButton = screen.getByLabelText('Test Action');
      await user.click(actionButton);

      expect(onActionClick).toHaveBeenCalledTimes(1);
    });

    it('should display badge with 99+ for large numbers', () => {
      const rightActions: HeaderAction[] = [
        {
          id: 'notifications',
          icon: <span>🔔</span>,
          label: 'Notifications',
          onClick: vi.fn(),
          badge: 150,
        },
      ];

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} rightActions={rightActions} />
        </TestWrapper>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should disable actions when disabled prop is true', () => {
      const rightActions: HeaderAction[] = [
        {
          id: 'disabled-action',
          icon: <span>❌</span>,
          label: 'Disabled Action',
          onClick: vi.fn(),
          disabled: true,
        },
      ];

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} rightActions={rightActions} />
        </TestWrapper>
      );

      const actionButton = screen.getByLabelText('Disabled Action');
      expect(actionButton).toBeDisabled();
    });
  });

  describe('Menu Functionality', () => {
    it('should toggle menu when menu button is clicked', async () => {
      const user = userEvent.setup();
      const onMenuToggle = vi.fn();

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} onMenuToggle={onMenuToggle} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(onMenuToggle).toHaveBeenCalledTimes(1);
    });

    it('should show mobile menu when menu is open', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      // Menu should be visible
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
    });

    it('should close menu when navigation item is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      // Open menu
      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      // Click navigation item
      const navLink = screen.getByText('Dashboard');
      await user.click(navLink);

      // Menu should be closed (navigation should not be visible)
      await waitFor(() => {
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      });
    });

    it('should update menu button aria-label when menu state changes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should handle search button click', async () => {
      const user = userEvent.setup();
      const onSearchClick = vi.fn();

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} onSearchClick={onSearchClick} />
        </TestWrapper>
      );

      const searchButton = screen.getByLabelText('Search');
      await user.click(searchButton);

      expect(onSearchClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid header actions gracefully', () => {
      const invalidActions = [
        {
          id: '', // Invalid empty id
          label: 'Invalid Action',
          onClick: vi.fn(),
        },
      ] as HeaderAction[];

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} leftActions={invalidActions} />
        </TestWrapper>
      );

      // Should render error state
      expect(screen.getByText(/Header Error/)).toBeInTheDocument();
    });

    it('should recover from error when recover button is clicked', async () => {
      const user = userEvent.setup();
      const invalidActions = [
        {
          id: '',
          label: 'Invalid Action',
          onClick: vi.fn(),
        },
      ] as HeaderAction[];

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} leftActions={invalidActions} />
        </TestWrapper>
      );

      const recoverButton = screen.getByText('Recover');
      await user.click(recoverButton);

      await waitFor(() => {
        expect(screen.queryByText(/Header Error/)).not.toBeInTheDocument();
      });
    });

    it('should handle menu toggle errors', async () => {
      const user = userEvent.setup();
      const onMenuToggle = vi.fn(() => {
        throw new Error('Menu toggle failed');
      });

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} onMenuToggle={onMenuToggle} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(screen.getByText(/Header Error/)).toBeInTheDocument();
    });

    it('should handle search click errors', async () => {
      const user = userEvent.setup();
      const onSearchClick = vi.fn(() => {
        throw new Error('Search failed');
      });

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} onSearchClick={onSearchClick} />
        </TestWrapper>
      );

      const searchButton = screen.getByLabelText('Search');
      await user.click(searchButton);

      expect(screen.getByText(/Header Error/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    });

    it('should have proper navigation role', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      // Open menu to show navigation
      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Mobile navigation');
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      const searchButton = screen.getByLabelText('Search');
      const menuButton = screen.getByLabelText('Open menu');

      expect(searchButton).toHaveAttribute('type', 'button');
      expect(menuButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-card', 'border-b', 'border-border');
    });

    it('should handle custom className', () => {
      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} className="custom-header" />
        </TestWrapper>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('Navigation Items', () => {
    it('should highlight active navigation item', async () => {
      const user = userEvent.setup();

      // Mock current location as /dashboard
      require('wouter').useLocation.mockReturnValue(['/dashboard']);

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      // Open menu
      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      const dashboardLink = screen.getByText('Dashboard');
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('should render all default navigation items', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MobileHeader {...defaultProps} />
        </TestWrapper>
      );

      // Open menu
      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Bills')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Sponsorship')).toBeInTheDocument();
      expect(screen.getByText('Verification')).toBeInTheDocument();
    });
  });
});