/**
 * Comprehensive Accessibility Audit for Chanuka Client UI
 * 
 * This test suite conducts a thorough accessibility audit of all major components
 * to ensure WCAG 2.1 AA compliance as required by REQ-PA-002 and REQ-PA-004
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components for testing
import App from '../../App';
import NavigationBar from '../../components/shell/NavigationBar';
import BillCard from '../../components/bills/BillCard';
import FilterPanel from '../../components/bills/FilterPanel';
import BillDetailView from '../../components/bill-detail/BillDetailView';
import DiscussionThread from '../../components/discussion/DiscussionThread';
import ExpertBadge from '../../components/verification/ExpertBadge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

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
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock data for testing
const mockBill = {
  id: '1',
  billNumber: 'HB-2024-001',
  title: 'Test Bill for Accessibility',
  summary: 'A comprehensive test bill to verify accessibility compliance',
  status: 'active' as const,
  urgencyLevel: 'high' as const,
  introducedDate: new Date('2024-01-01'),
  lastUpdated: new Date('2024-01-15'),
  sponsors: [],
  committees: [],
  amendments: [],
  relatedBills: [],
  constitutionalFlags: [],
  pretextDetection: null,
  impactAssessment: {
    overallScore: 8.5,
    categories: {
      economic: 7.5,
      social: 9.0,
      environmental: 8.0,
      constitutional: 9.5,
    },
    confidence: 0.85,
    methodology: 'AI-assisted analysis with expert review',
  },
  viewCount: 1250,
  saveCount: 89,
  commentCount: 23,
  shareCount: 15,
  policyAreas: ['Healthcare', 'Education'],
  geographicScope: 'national' as const,
  complexity: 'medium' as const,
  readingTime: {
    minutes: 15,
    difficulty: 'intermediate' as const,
  },
};

const mockExpert = {
  userId: '1',
  verificationType: 'official' as const,
  credentials: [
    {
      id: '1',
      type: 'degree',
      institution: 'Test University',
      field: 'Constitutional Law',
      year: 2010,
      verified: true,
    },
  ],
  affiliations: [
    {
      id: '1',
      organization: 'Test Legal Institute',
      role: 'Senior Researcher',
      startDate: new Date('2015-01-01'),
      current: true,
      verified: true,
    },
  ],
  specializations: ['Constitutional Law', 'Civil Rights'],
  credibilityScore: 9.2,
  contributionCount: 45,
  avgCommunityRating: 4.8,
  verified: true,
  verificationDate: new Date('2024-01-01'),
};

describe('Comprehensive Accessibility Audit', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Set up document language
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    // Clean up after each test
    document.body.innerHTML = '';
  });

  describe('Core Application Structure', () => {
    it('should have proper document structure and landmarks', async () => {
      const { container } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Check for proper document structure
      expect(document.documentElement).toHaveAttribute('lang', 'en');
      
      // Check for main landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Run axe accessibility check
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide skip links for keyboard navigation', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Check for skip link
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Navigation Accessibility', () => {
    it('should have accessible navigation with proper ARIA labels', async () => {
      const { container } = render(
        <TestWrapper>
          <NavigationBar />
        </TestWrapper>
      );

      // Check navigation landmark
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');

      // Check search functionality
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label', 'Search bills and legislation');

      // Run axe check
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support full keyboard navigation', async () => {
      render(
        <TestWrapper>
          <NavigationBar />
        </TestWrapper>
      );

      const nav = screen.getByRole('navigation');
      
      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      // Test that all interactive elements are reachable
      const interactiveElements = nav.querySelectorAll(
        'button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(interactiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Bill Components Accessibility', () => {
    it('should render accessible bill cards', async () => {
      const { container } = render(
        <TestWrapper>
          <BillCard bill={mockBill} />
        </TestWrapper>
      );

      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();

      // Check for accessible status indicators
      const statusBadge = screen.getByText(/active/i);
      expect(statusBadge).toHaveAttribute('aria-label');

      // Check for proper button labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible filter panel', async () => {
      const { container } = render(
        <TestWrapper>
          <FilterPanel />
        </TestWrapper>
      );

      // Check for proper form structure
      const filterForm = container.querySelector('form') || container;
      expect(filterForm).toBeInTheDocument();

      // Check for proper labels
      const inputs = screen.getAllByRole('combobox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Bill Detail Accessibility', () => {
    it('should have accessible bill detail view with proper tab structure', async () => {
      const { container } = render(
        <TestWrapper>
          <BillDetailView bill={mockBill} />
        </TestWrapper>
      );

      // Check for tab list
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      // Check for proper tab structure
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);

      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('aria-selected');
      });

      // Check for tab panels
      const tabPanels = screen.getAllByRole('tabpanel');
      expect(tabPanels.length).toBeGreaterThan(0);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation between tabs', async () => {
      render(
        <TestWrapper>
          <BillDetailView bill={mockBill} />
        </TestWrapper>
      );

      const tabs = screen.getAllByRole('tab');
      const firstTab = tabs[0];
      const secondTab = tabs[1];

      // Focus first tab
      firstTab.focus();
      expect(document.activeElement).toBe(firstTab);

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(secondTab);

      // Test Enter key activation
      await user.keyboard('{Enter}');
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Community Features Accessibility', () => {
    it('should have accessible discussion threads', async () => {
      const mockComments = [
        {
          id: '1',
          content: 'This is a test comment for accessibility testing',
          author: 'Test User',
          timestamp: new Date(),
          votes: { up: 5, down: 1 },
          replies: [],
        },
      ];

      const { container } = render(
        <TestWrapper>
          <DiscussionThread comments={mockComments} />
        </TestWrapper>
      );

      // Check for proper comment structure
      const comments = screen.getAllByRole('article');
      expect(comments.length).toBeGreaterThan(0);

      // Check for accessible voting buttons
      const voteButtons = screen.getAllByRole('button');
      voteButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible expert badges', async () => {
      const { container } = render(
        <TestWrapper>
          <ExpertBadge expert={mockExpert} />
        </TestWrapper>
      );

      // Check for proper badge structure
      const badge = container.querySelector('[role="img"]');
      expect(badge).toHaveAttribute('aria-label');

      // Check for accessible tooltip or description
      const badgeElement = screen.getByText(/official expert/i);
      expect(badgeElement).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Form Accessibility', () => {
    it('should have accessible form controls', async () => {
      const { container } = render(
        <TestWrapper>
          <form>
            <label htmlFor="test-input">Test Input</label>
            <Input id="test-input" type="text" required />
            
            <label htmlFor="test-select">Test Select</label>
            <Select>
              <option value="">Choose an option</option>
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
            </Select>
            
            <Button type="submit">Submit</Button>
          </form>
        </TestWrapper>
      );

      // Check for proper form labels
      const input = screen.getByLabelText('Test Input');
      expect(input).toBeRequired();

      // Check for accessible error states
      fireEvent.invalid(input);
      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid');
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide proper error messages', async () => {
      const { container } = render(
        <TestWrapper>
          <form>
            <label htmlFor="email-input">Email Address</label>
            <Input 
              id="email-input" 
              type="email" 
              required 
              aria-describedby="email-error"
            />
            <div id="email-error" role="alert" aria-live="polite">
              Please enter a valid email address
            </div>
          </form>
        </TestWrapper>
      );

      const input = screen.getByLabelText('Email Address');
      const errorMessage = screen.getByRole('alert');

      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(errorMessage).toHaveAttribute('aria-live', 'polite');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG color contrast requirements', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <h1>Main Heading</h1>
            <p>Regular paragraph text</p>
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
          </div>
        </TestWrapper>
      );

      // Run axe with color contrast rules
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    it('should not rely solely on color for meaning', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <span className="text-red-600" aria-label="Error: Required field">
              * Required
            </span>
            <span className="text-green-600" aria-label="Success: Valid input">
              ✓ Valid
            </span>
          </div>
        </TestWrapper>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });
  });

  describe('Touch Target Accessibility', () => {
    it('should have adequate touch target sizes', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <Button>Regular Button</Button>
            <button className="p-2">Icon Button</button>
            <a href="#" className="inline-block p-3">Link</a>
          </div>
        </TestWrapper>
      );

      // Check touch target sizes
      const buttons = container.querySelectorAll('button, a');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        
        // WCAG 2.1 AA requires minimum 44x44px touch targets
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide proper ARIA labels and descriptions', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <button aria-label="Close dialog">×</button>
            <input 
              type="search" 
              aria-label="Search bills" 
              aria-describedby="search-help"
            />
            <div id="search-help">
              Enter keywords to search for bills and legislation
            </div>
            <div role="status" aria-live="polite">
              Search results updated
            </div>
          </div>
        </TestWrapper>
      );

      // Check for proper ARIA attributes
      const closeButton = screen.getByLabelText('Close dialog');
      expect(closeButton).toBeInTheDocument();

      const searchInput = screen.getByLabelText('Search bills');
      expect(searchInput).toHaveAttribute('aria-describedby', 'search-help');

      const statusMessage = screen.getByRole('status');
      expect(statusMessage).toHaveAttribute('aria-live', 'polite');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should announce dynamic content changes', async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);
        
        return (
          <div>
            <button onClick={() => setCount(c => c + 1)}>
              Increment
            </button>
            <div role="status" aria-live="polite">
              Count: {count}
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const button = screen.getByText('Increment');
      const status = screen.getByRole('status');

      expect(status).toHaveTextContent('Count: 0');

      await user.click(button);
      expect(status).toHaveTextContent('Count: 1');
    });
  });

  describe('Keyboard Navigation Patterns', () => {
    it('should support proper focus management in modals', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <div>
            <button onClick={() => setIsOpen(true)}>
              Open Modal
            </button>
            {isOpen && (
              <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h2 id="modal-title">Test Modal</h2>
                <button onClick={() => setIsOpen(false)}>
                  Close
                </button>
                <button>Action Button</button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestModal />
        </TestWrapper>
      );

      const openButton = screen.getByText('Open Modal');
      await user.click(openButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');

      // Focus should be trapped within modal
      const closeButton = screen.getByText('Close');
      expect(document.activeElement).toBe(closeButton);
    });

    it('should handle escape key for dismissible components', async () => {
      const TestDropdown = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <div>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              Toggle Dropdown
            </button>
            {isOpen && (
              <div role="menu">
                <button role="menuitem" onClick={() => setIsOpen(false)}>
                  Option 1
                </button>
                <button role="menuitem" onClick={() => setIsOpen(false)}>
                  Option 2
                </button>
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestDropdown />
        </TestWrapper>
      );

      const toggleButton = screen.getByText('Toggle Dropdown');
      await user.click(toggleButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Test escape key
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('Loading States and Progress Indicators', () => {
    it('should provide accessible loading states', async () => {
      const TestLoadingComponent = () => {
        const [loading, setLoading] = React.useState(true);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setLoading(false), 1000);
          return () => clearTimeout(timer);
        }, []);
        
        if (loading) {
          return (
            <div role="status" aria-live="polite">
              <span className="sr-only">Loading content...</span>
              <div aria-hidden="true">⏳</div>
            </div>
          );
        }
        
        return <div>Content loaded</div>;
      };

      const { container } = render(
        <TestWrapper>
          <TestLoadingComponent />
        </TestWrapper>
      );

      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText('Loading content...')).toHaveClass('sr-only');

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});