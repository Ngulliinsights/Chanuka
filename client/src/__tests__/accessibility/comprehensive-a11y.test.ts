/**
 * Comprehensive Accessibility Tests
 * Enhanced accessibility testing with automated and manual test scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { renderWithProviders, MockDataFactory, AccessibilityTestUtils } from '@client/test-utils/comprehensive-test-setup';
import { BillsDashboard } from '@client/components/bills/bills-dashboard';
import { BillDetailView } from '@client/components/bill-detail/BillDetailView';
import { IntelligentSearchPage } from '@client/pages/IntelligentSearchPage';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Comprehensive Accessibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should pass axe accessibility tests for bills dashboard', async () => {
      const { container } = renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true },
          'semantic-html': { enabled: true },
        },
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should pass axe accessibility tests for bill detail view', async () => {
      const mockBill = MockDataFactory.createMockBill();
      const { container } = renderWithProviders(<BillDetailView billId={mockBill.id} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bill-detail-view')).toBeInTheDocument();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass axe accessibility tests for search page', async () => {
      const { container } = renderWithProviders(<IntelligentSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('intelligent-search-page')).toBeInTheDocument();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation in bills dashboard', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Test tab navigation through interactive elements
      const interactiveElements = [
        screen.getByPlaceholderText(/search bills/i),
        screen.getByLabelText(/category/i),
        screen.getByLabelText(/status/i),
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link'),
      ];
      
      for (let i = 0; i < interactiveElements.length; i++) {
        await user.tab();
        
        // Verify focus is on an interactive element
        const focusedElement = document.activeElement;
        expect(interactiveElements).toContain(focusedElement);
        
        // Verify focus is visible
        expect(focusedElement).toHaveClass(/focus:/);
      }
    });

    it('should support keyboard shortcuts', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Test search shortcut (Ctrl+K or Cmd+K)
      await user.keyboard('{Control>}k{/Control}');
      
      const searchInput = screen.getByPlaceholderText(/search bills/i);
      expect(searchInput).toHaveFocus();
    });

    it('should handle escape key to close modals', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Open a modal (e.g., share modal)
      const firstBillCard = screen.getAllByTestId(/bill-card-/)[0];
      const shareButton = firstBillCard.querySelector('[aria-label*="share"]');
      
      if (shareButton) {
        await user.click(shareButton);
        
        // Verify modal is open
        await waitFor(() => {
          expect(screen.getByTestId('share-modal')).toBeInTheDocument();
        });
        
        // Press escape to close
        await user.keyboard('{Escape}');
        
        // Verify modal is closed
        await waitFor(() => {
          expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
        });
      }
    });

    it('should trap focus in modals', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Open a modal
      const firstBillCard = screen.getAllByTestId(/bill-card-/)[0];
      const shareButton = firstBillCard.querySelector('[aria-label*="share"]');
      
      if (shareButton) {
        await user.click(shareButton);
        
        const modal = await screen.findByTestId('share-modal');
        const modalButtons = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        
        // Tab through modal elements
        for (let i = 0; i < modalButtons.length + 2; i++) {
          await user.tab();
          
          // Focus should stay within modal
          const focusedElement = document.activeElement;
          expect(modal.contains(focusedElement)).toBe(true);
        }
      }
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<BillsDashboard />);
      
      const headings = screen.getAllByRole('heading');
      
      // Should have at least one h1
      const h1Elements = headings.filter(h => h.tagName === 'H1');
      expect(h1Elements.length).toBeGreaterThanOrEqual(1);
      
      // Verify heading levels are logical
      let previousLevel = 0;
      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1));
        expect(level).toBeGreaterThan(0);
        expect(level).toBeLessThanOrEqual(6);
        
        // Level shouldn't jump more than 1
        if (previousLevel > 0) {
          expect(level - previousLevel).toBeLessThanOrEqual(1);
        }
        
        previousLevel = level;
      });
    });

    it('should have proper ARIA landmarks', () => {
      renderWithProviders(<BillsDashboard />);
      
      // Should have main landmark
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Should have search landmark
      expect(screen.getByRole('search')).toBeInTheDocument();
      
      // Should have navigation if present
      const navigation = screen.queryByRole('navigation');
      if (navigation) {
        expect(navigation).toBeInTheDocument();
      }
    });

    it('should announce live updates', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Simulate a real-time update
      const liveRegion = screen.getByRole('status', { hidden: true });
      
      // Trigger an update (e.g., new bill notification)
      fireEvent(liveRegion, new CustomEvent('update', {
        detail: { message: 'New bill added: Healthcare Reform Act' }
      }));
      
      await AccessibilityTestUtils.testScreenReaderAnnouncements('New bill added: Healthcare Reform Act');
    });

    it('should have descriptive link text', () => {
      renderWithProviders(<BillsDashboard />);
      
      const links = screen.getAllByRole('link');
      
      links.forEach(link => {
        const linkText = link.textContent || link.getAttribute('aria-label');
        
        // Link text should be descriptive (not just "click here" or "read more")
        expect(linkText).toBeTruthy();
        expect(linkText?.toLowerCase()).not.toMatch(/^(click here|read more|more|link)$/);
        
        // Should have at least 4 characters for meaningful description
        expect(linkText?.length).toBeGreaterThan(3);
      });
    });

    it('should have proper form labels', () => {
      renderWithProviders(<BillsDashboard />);
      
      const inputs = screen.getAllByRole('textbox');
      const selects = screen.getAllByRole('combobox');
      const formElements = [...inputs, ...selects];
      
      formElements.forEach(element => {
        // Should have associated label
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('aria-labelledby') ||
                     screen.queryByLabelText(element.getAttribute('placeholder') || '');
        
        expect(label).toBeTruthy();
      });
    });
  });

  describe('Color and Contrast', () => {
    it('should meet color contrast requirements', async () => {
      const { container } = renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Test with axe color-contrast rule
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });
      
      expect(results).toHaveNoViolations();
    });

    it('should not rely solely on color for information', () => {
      renderWithProviders(<BillsDashboard />);
      
      // Check status indicators have text or icons, not just color
      const statusElements = screen.getAllByTestId(/status-/);
      
      statusElements.forEach(element => {
        const hasText = element.textContent && element.textContent.trim().length > 0;
        const hasIcon = element.querySelector('svg, img, [role="img"]');
        const hasAriaLabel = element.getAttribute('aria-label');
        
        // Should have text, icon, or aria-label in addition to color
        expect(hasText || hasIcon || hasAriaLabel).toBe(true);
      });
    });

    it('should work with high contrast mode', async () => {
      // Simulate high contrast mode
      document.documentElement.classList.add('high-contrast');
      
      const { container } = renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Test accessibility in high contrast mode
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      
      // Clean up
      document.documentElement.classList.remove('high-contrast');
    });
  });

  describe('Motion and Animation', () => {
    it('should respect reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // Verify animations are disabled or reduced
      const animatedElements = document.querySelectorAll('[class*="animate-"], [class*="transition-"]');
      
      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        
        // Animation duration should be 0 or very short
        const animationDuration = computedStyle.animationDuration;
        const transitionDuration = computedStyle.transitionDuration;
        
        if (animationDuration !== '0s') {
          expect(parseFloat(animationDuration)).toBeLessThan(0.1);
        }
        
        if (transitionDuration !== '0s') {
          expect(parseFloat(transitionDuration)).toBeLessThan(0.1);
        }
      });
    });

    it('should not cause seizures with flashing content', () => {
      renderWithProviders(<BillsDashboard />);
      
      // Check for elements that might flash
      const flashingElements = document.querySelectorAll('[class*="blink"], [class*="flash"], [class*="strobe"]');
      
      // Should not have flashing elements
      expect(flashingElements.length).toBe(0);
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    it('should have adequate touch target sizes', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 390, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 844, writable: true });
      
      renderWithProviders(<BillsDashboard />);
      
      const interactiveElements = [
        ...screen.getAllByRole('button'),
        ...screen.getAllByRole('link'),
        ...screen.getAllByRole('textbox'),
        ...screen.getAllByRole('combobox'),
      ];
      
      interactiveElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const minSize = 44; // WCAG AA minimum touch target size
        
        // Touch targets should be at least 44x44 pixels
        expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(minSize);
      });
    });

    it('should support zoom up to 200% without horizontal scrolling', () => {
      // Mock zoom level
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true });
      
      renderWithProviders(<BillsDashboard />);
      
      // Content should not cause horizontal scrolling at 200% zoom
      const body = document.body;
      expect(body.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    });
  });

  describe('Error Handling and Feedback', () => {
    it('should provide accessible error messages', async () => {
      // Mock API error
      vi.mocked(require('@client/hooks/useBillsAPI').useBillsAPI).mockReturnValue({
        bills: [],
        loading: false,
        error: new Error('Failed to load bills'),
        fetchBills: vi.fn(),
        searchBills: vi.fn(),
      });
      
      renderWithProviders(<BillsDashboard />);
      
      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent(/failed to load bills/i);
      
      // Error should be announced to screen readers
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });

    it('should provide accessible form validation', async () => {
      renderWithProviders(<IntelligentSearchPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('intelligent-search-page')).toBeInTheDocument();
      });
      
      // Try to submit empty search form
      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);
      
      // Should show validation error
      const errorMessage = await screen.findByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      
      // Error should be associated with the input
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('aria-describedby');
      expect(searchInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should provide accessible loading states', () => {
      // Mock loading state
      vi.mocked(require('@client/hooks/useBillsAPI').useBillsAPI).mockReturnValue({
        bills: [],
        loading: true,
        error: null,
        fetchBills: vi.fn(),
        searchBills: vi.fn(),
      });
      
      renderWithProviders(<BillsDashboard />);
      
      const loadingIndicator = screen.getByRole('status');
      expect(loadingIndicator).toBeInTheDocument();
      expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
      expect(loadingIndicator).toHaveTextContent(/loading/i);
    });
  });

  describe('Complex Interactions', () => {
    it('should handle accessible drag and drop', async () => {
      // If drag and drop is implemented, test keyboard alternatives
      const draggableElements = screen.queryAllByRole('button', { name: /drag/i });
      
      draggableElements.forEach(element => {
        // Should have keyboard alternative
        expect(element).toHaveAttribute('aria-describedby');
        
        // Should provide instructions
        const instructions = document.getElementById(element.getAttribute('aria-describedby') || '');
        expect(instructions).toHaveTextContent(/keyboard/i);
      });
    });

    it('should handle accessible data tables', () => {
      // If data tables are present, test accessibility
      const tables = screen.queryAllByRole('table');
      
      tables.forEach(table => {
        // Should have caption or aria-label
        const caption = table.querySelector('caption');
        const ariaLabel = table.getAttribute('aria-label');
        expect(caption || ariaLabel).toBeTruthy();
        
        // Headers should be properly associated
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope');
        });
      });
    });

    it('should handle accessible infinite scroll', async () => {
      renderWithProviders(<BillsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bills-dashboard')).toBeInTheDocument();
      });
      
      // If infinite scroll is implemented, should have accessible controls
      const loadMoreButton = screen.queryByRole('button', { name: /load more/i });
      
      if (loadMoreButton) {
        // Should be keyboard accessible
        await user.tab();
        expect(loadMoreButton).toHaveFocus();
        
        // Should announce loading state
        await user.click(loadMoreButton);
        
        const loadingStatus = await screen.findByRole('status');
        expect(loadingStatus).toHaveTextContent(/loading/i);
      }
    });
  });

  describe('Accessibility Testing Utilities', () => {
    it('should validate custom accessibility utilities', () => {
      renderWithProviders(<BillsDashboard />);
      
      const dashboard = screen.getByTestId('bills-dashboard');
      
      // Test custom accessibility test utilities
      AccessibilityTestUtils.testAriaAttributes(dashboard, {
        'role': 'main',
        'aria-label': 'Bills Dashboard',
      });
      
      AccessibilityTestUtils.testColorContrast(dashboard);
    });
  });
});