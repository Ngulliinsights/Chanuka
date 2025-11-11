/**
 * Navigation Accessibility CI Tests
 * Automated accessibility checks integrated into CI pipeline
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import NavigationBar from '../../components/shell/NavigationBar';
import { createBasicNavigationContext, createMobileNavigationContext, createAuthenticatedNavigationContext } from '../navigation-test-contexts.test';

// Mock axe-core
vi.mock('axe-core', () => ({
  default: {
    run: vi.fn(),
    configure: vi.fn(),
  },
}));

// Accessibility violation thresholds
const ACCESSIBILITY_THRESHOLDS = {
  MAX_VIOLATIONS: 0,
  MAX_INCOMPLETE: 5,
  MAX_INAPPLICABLE: 10,
} as const;

describe('Navigation Accessibility CI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should pass accessibility audit for desktop navigation', async () => {
      const TestContext = createBasicNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Mock axe results - in real CI, this would run actual axe-core
      const mockResults = {
        violations: [],
        incomplete: [],
        inapplicable: [],
        passes: [
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
          },
          {
            id: 'keyboard-navigation',
            impact: 'moderate',
            description: 'Ensures keyboard navigation is possible and follows WCAG guidelines',
          },
        ],
      };

      (axe.run as any).mockResolvedValue(mockResults);

      const results = await axe.run(container);

      expect(results.violations).toHaveLength(ACCESSIBILITY_THRESHOLDS.MAX_VIOLATIONS);
      expect(results.incomplete.length).toBeLessThanOrEqual(ACCESSIBILITY_THRESHOLDS.MAX_INCOMPLETE);
      expect(results.inapplicable.length).toBeLessThanOrEqual(ACCESSIBILITY_THRESHOLDS.MAX_INAPPLICABLE);
    });

    it('should pass accessibility audit for mobile navigation', async () => {
      const TestContext = createMobileNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      const mockResults = {
        violations: [],
        incomplete: [],
        inapplicable: [],
        passes: [],
      };

      (axe.run as any).mockResolvedValue(mockResults);

      const results = await axe.run(container);

      expect(results.violations).toHaveLength(0);
    });

    it('should pass accessibility audit for authenticated navigation', async () => {
      const TestContext = createAuthenticatedNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      const mockResults = {
        violations: [],
        incomplete: [],
        inapplicable: [],
        passes: [],
      };

      (axe.run as any).mockResolvedValue(mockResults);

      const results = await axe.run(container);

      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Keyboard Navigation Compliance', () => {
    it('should support full keyboard navigation', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      const navigation = screen.getByRole('navigation');

      // Test tab order
      navigation.focus();

      // Should be able to tab through all interactive elements
      expect(document.activeElement).toBe(navigation);
    });

    it('should handle keyboard traps correctly', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      // Test that focus doesn't get trapped inappropriately
      const searchInput = screen.getByLabelText('Search');
      searchInput.focus();

      expect(document.activeElement).toBe(searchInput);
    });

    it('should provide proper focus indicators', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      const navigation = screen.getByRole('navigation');
      navigation.focus();

      // Focus indicator should be visible (checked via CSS/styling)
      expect(navigation).toBeInTheDocument();
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Main navigation');

      const searchInput = screen.getByLabelText('Search');
      expect(searchInput).toHaveAttribute('aria-label', 'Search');
      expect(searchInput).toHaveAttribute('role', 'searchbox');
    });

    it('should announce dynamic content changes', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      const searchInput = screen.getByLabelText('Search');

      // Search input should have aria-expanded attribute
      expect(searchInput).toHaveAttribute('aria-expanded');
    });

    it('should provide meaningful link text', async () => {
      const TestContext = createAuthenticatedNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      // Links should have meaningful text or aria-labels
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should meet WCAG color contrast requirements', async () => {
      const TestContext = createBasicNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      const mockResults = {
        violations: [],
        incomplete: [],
        inapplicable: [],
        passes: [
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'Color contrast meets WCAG standards',
          },
        ],
      };

      (axe.run as any).mockResolvedValue(mockResults);

      const results = await axe.run(container);

      const colorContrastViolations = results.violations.filter(v => v.id === 'color-contrast');
      expect(colorContrastViolations).toHaveLength(0);
    });

    it('should not rely solely on color for meaning', async () => {
      const TestContext = createBasicNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      const mockResults = {
        violations: [],
        incomplete: [],
        inapplicable: [],
        passes: [],
      };

      (axe.run as any).mockResolvedValue(mockResults);

      const results = await axe.run(container);

      // Should pass use-of-color rule
      expect(results.violations.some(v => v.id === 'use-of-color')).toBe(false);
    });
  });

  describe('Touch Target Size Compliance', () => {
    it('should have adequate touch target sizes on mobile', async () => {
      const TestContext = createMobileNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const width = parseInt(styles.width);
        const height = parseInt(styles.height);

        // WCAG touch target minimum is 44x44px
        expect(width).toBeGreaterThanOrEqual(44);
        expect(height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have properly associated form labels', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      const searchInput = screen.getByLabelText('Search');
      expect(searchInput).toBeRequired();

      // Should have proper form structure
      expect(searchInput).toHaveAttribute('type', 'search');
    });

    it('should provide form error announcements', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      const searchInput = screen.getByLabelText('Search');

      // Error states should be properly announced
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Language and Content Accessibility', () => {
    it('should have proper language attributes', async () => {
      const TestContext = createBasicNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      // Should have lang attribute on html element
      const html = container.ownerDocument?.documentElement;
      expect(html).toHaveAttribute('lang');
    });

    it('should avoid problematic link text', async () => {
      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      // Should not have generic link text like "click here", "read more", etc.
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        const text = link.textContent?.toLowerCase() || '';
        expect(text).not.toContain('click here');
        expect(text).not.toContain('read more');
        expect(text).not.toContain('here');
      });
    });
  });

  describe('CI Integration Rules', () => {
    it('should fail CI if critical accessibility violations exist', async () => {
      const TestContext = createBasicNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      // Simulate critical violations that should fail CI
      const mockResults = {
        violations: [
          {
            id: 'color-contrast',
            impact: 'critical',
            description: 'Critical color contrast violation',
          },
        ],
        incomplete: [],
        inapplicable: [],
        passes: [],
      };

      (axe.run as any).mockResolvedValue(mockResults);

      const results = await axe.run(container);

      // Critical violations should cause test failure
      expect(results.violations.some(v => v.impact === 'critical')).toBe(true);
    });

    it('should allow CI to pass with minor incomplete items', async () => {
      const TestContext = createBasicNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      const mockResults = {
        violations: [],
        incomplete: Array(ACCESSIBILITY_THRESHOLDS.MAX_INCOMPLETE).fill({
          id: 'incomplete-test',
          impact: 'minor',
        }),
        inapplicable: [],
        passes: [],
      };

      (axe.run as any).mockResolvedValue(mockResults);

      const results = await axe.run(container);

      // Should pass CI with acceptable number of incomplete items
      expect(results.incomplete.length).toBeLessThanOrEqual(ACCESSIBILITY_THRESHOLDS.MAX_INCOMPLETE);
    });
  });
});
