/**
 * Navigation Responsive Testing Across Device Sizes
 * Automated testing for navigation behavior across different viewport sizes
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavigationBar from '../components/shell/NavigationBar';
import { createBasicNavigationContext, createMobileNavigationContext } from './navigation-test-contexts.test';

// Device size definitions
const DEVICE_SIZES = {
  MOBILE: { width: 375, height: 667, name: 'Mobile' },
  MOBILE_LARGE: { width: 414, height: 896, name: 'Mobile Large' },
  TABLET: { width: 768, height: 1024, name: 'Tablet' },
  TABLET_LARGE: { width: 1024, height: 768, name: 'Tablet Large' },
  DESKTOP: { width: 1440, height: 900, name: 'Desktop' },
  DESKTOP_WIDE: { width: 1920, height: 1080, name: 'Desktop Wide' },
  MOBILE_LANDSCAPE: { width: 667, height: 375, name: 'Mobile Landscape' },
  TABLET_LANDSCAPE: { width: 1024, height: 768, name: 'Tablet Landscape' },
} as const;

// Responsive breakpoints (matching CSS media queries)
const BREAKPOINTS = {
  MOBILE: 767,      // max-width: 767px
  TABLET: 1024,     // min-width: 768px, max-width: 1024px
  DESKTOP: 1025,    // min-width: 1025px
} as const;

// Mock viewport utilities
const mockViewport = {
  setViewport: vi.fn((width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true });

    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  }),

  getCurrentBreakpoint: (width: number): string => {
    if (width <= BREAKPOINTS.MOBILE) return 'mobile';
    if (width <= BREAKPOINTS.TABLET) return 'tablet';
    return 'desktop';
  },

  reset: () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
  },
};

// Navigation behavior expectations by device type
const NAVIGATION_BEHAVIORS = {
  mobile: {
    menuButton: true,
    sidebar: false,
    searchBar: false,
    fullNavigation: false,
    stackedLayout: true,
  },
  tablet: {
    menuButton: false,
    sidebar: true,
    searchBar: true,
    fullNavigation: true,
    stackedLayout: false,
  },
  desktop: {
    menuButton: false,
    sidebar: true,
    searchBar: true,
    fullNavigation: true,
    stackedLayout: false,
  },
} as const;

describe('Navigation Responsive Testing Across Device Sizes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockViewport.reset();
  });

  afterEach(() => {
    mockViewport.reset();
  });

  describe('Mobile Device Navigation (< 768px)', () => {

    it('should adapt navigation for mobile portrait', async () => {
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Mobile-specific elements should be present
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();

      // Desktop elements should be hidden
      expect(screen.queryByLabelText('Search')).not.toBeInTheDocument();
    });

    it('should handle mobile menu toggle correctly', async () => {
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      const menuButton = screen.getByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Close navigation menu')).toBeInTheDocument();
      });
    });

    it('should hide sidebar on mobile devices', async () => {
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Sidebar toggle should not be present on mobile
      expect(screen.queryByTitle('Collapse sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Tablet Device Navigation (768px - 1024px)', () => {
    it('should display full navigation on tablets', async () => {
      mockViewport.setViewport(DEVICE_SIZES.TABLET.width, DEVICE_SIZES.TABLET.height);

      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should have both search and sidebar
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();

      // Should not have mobile menu button
      expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument();
    });

    it('should handle tablet landscape orientation', async () => {
      mockViewport.setViewport(DEVICE_SIZES.TABLET_LANDSCAPE.width, DEVICE_SIZES.TABLET_LANDSCAPE.height);

      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should maintain full navigation in landscape
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
    });
  });

  describe('Desktop Device Navigation (> 1024px)', () => {
    it('should display complete navigation on desktop', async () => {
      mockViewport.setViewport(DEVICE_SIZES.DESKTOP.width, DEVICE_SIZES.DESKTOP.height);

      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // All desktop features should be available
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      expect(screen.getByText('Chanuka')).toBeInTheDocument();
    });

    it('should handle wide desktop layouts', async () => {
      mockViewport.setViewport(DEVICE_SIZES.DESKTOP_WIDE.width, DEVICE_SIZES.DESKTOP_WIDE.height);

      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should maintain all features on wide screens
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
    });
  });

  describe('Responsive Breakpoint Transitions', () => {
    it('should handle mobile to tablet transition', async () => {
      // Start with mobile
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();
      const { rerender } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should have mobile menu
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();

      // Switch to tablet
      mockViewport.setViewport(DEVICE_SIZES.TABLET.width, DEVICE_SIZES.TABLET.height);

      rerender(TestContext({ children: NavigationBar({}) }));

      await waitFor(() => {
        // Should now have desktop features
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
        // Mobile menu should be gone
        expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument();
      });
    });

    it('should handle tablet to desktop transition', async () => {
      // Start with tablet
      mockViewport.setViewport(DEVICE_SIZES.TABLET.width, DEVICE_SIZES.TABLET.height);

      const TestContext = createBasicNavigationContext();
      const { rerender } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should have tablet features
      expect(screen.getByLabelText('Search')).toBeInTheDocument();

      // Switch to desktop
      mockViewport.setViewport(DEVICE_SIZES.DESKTOP.width, DEVICE_SIZES.DESKTOP.height);

      rerender(TestContext({ children: NavigationBar({}) }));

      await waitFor(() => {
        // Should maintain all features
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });
    });

    it('should handle desktop to mobile transition', async () => {
      // Start with desktop
      mockViewport.setViewport(DEVICE_SIZES.DESKTOP.width, DEVICE_SIZES.DESKTOP.height);

      const TestContext = createBasicNavigationContext();
      const { rerender } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should have desktop features
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();

      // Switch to mobile
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      rerender(TestContext({ children: NavigationBar({}) }));

      await waitFor(() => {
        // Should switch to mobile features
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
        // Desktop features should be hidden
        expect(screen.queryByLabelText('Search')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Collapse sidebar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Touch Target Size Compliance', () => {
    it('should have adequate touch targets on mobile devices', async () => {
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Check touch target sizes for interactive elements
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        // WCAG touch target minimum is 44x44px
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });

    it('should maintain touch targets on tablets', async () => {
      mockViewport.setViewport(DEVICE_SIZES.TABLET.width, DEVICE_SIZES.TABLET.height);

      const TestContext = createBasicNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        // Should still be adequately sized for touch
        expect(rect.width).toBeGreaterThanOrEqual(32);
        expect(rect.height).toBeGreaterThanOrEqual(32);
      });
    });
  });

  describe('Content Readability Across Devices', () => {
    it('should maintain readable font sizes on small screens', async () => {
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Check that text is readable (not too small)
      const textElements = container.querySelectorAll('span, a, button');
      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize);

        // Minimum readable font size for mobile
        expect(fontSize).toBeGreaterThanOrEqual(14);
      });
    });

    it('should prevent horizontal scrolling on mobile', async () => {
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      const nav = container.querySelector('[role="navigation"]');
      expect(nav).toBeDefined();

      const rect = nav!.getBoundingClientRect();
      // Navigation should not exceed viewport width
      expect(rect.width).toBeLessThanOrEqual(window.innerWidth);
    });
  });

  describe('Orientation Changes', () => {
    it('should handle mobile orientation changes', async () => {
      // Start in portrait
      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();
      const { rerender } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();

      // Switch to landscape
      mockViewport.setViewport(DEVICE_SIZES.MOBILE_LANDSCAPE.width, DEVICE_SIZES.MOBILE_LANDSCAPE.height);

      rerender(TestContext({ children: NavigationBar({}) }));

      await waitFor(() => {
        // Should still be mobile (width determines breakpoint)
        expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
      });
    });

    it('should handle tablet orientation changes', async () => {
      // Start in portrait
      mockViewport.setViewport(DEVICE_SIZES.TABLET.height, DEVICE_SIZES.TABLET.width); // Portrait

      const TestContext = createBasicNavigationContext();
      const { rerender } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Switch to landscape
      mockViewport.setViewport(DEVICE_SIZES.TABLET_LANDSCAPE.width, DEVICE_SIZES.TABLET_LANDSCAPE.height);

      rerender(TestContext({ children: NavigationBar({}) }));

      await waitFor(() => {
        // Should maintain tablet features
        expect(screen.getByLabelText('Search')).toBeInTheDocument();
      });
    });
  });

  describe('High DPI Display Support', () => {
    it('should scale appropriately on high DPI displays', async () => {
      // Mock high DPI display
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true });

      mockViewport.setViewport(DEVICE_SIZES.MOBILE.width, DEVICE_SIZES.MOBILE.height);

      const TestContext = createMobileNavigationContext();

      const { container } = render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Elements should still be usable on high DPI
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Zoom Level Compatibility', () => {
    it('should remain functional at 200% zoom', async () => {
      // Simulate 200% zoom by reducing effective viewport
      const zoomedWidth = DEVICE_SIZES.MOBILE.width * 0.5;
      const zoomedHeight = DEVICE_SIZES.MOBILE.height * 0.5;

      mockViewport.setViewport(zoomedWidth, zoomedHeight);

      const TestContext = createMobileNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Navigation should still be functional
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });

    it('should handle 400% zoom accessibility requirement', async () => {
      // Simulate 400% zoom
      const zoomedWidth = DEVICE_SIZES.MOBILE.width * 0.25;
      const zoomedHeight = DEVICE_SIZES.MOBILE.height * 0.25;

      mockViewport.setViewport(zoomedWidth, zoomedHeight);

      const TestContext = createMobileNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should still be accessible at high zoom levels
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();
    });
  });

  describe('Device-Specific Navigation Patterns', () => {
    it('should adapt to iPad-specific behaviors', async () => {
      // Mock iPad user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: true,
      });

      mockViewport.setViewport(DEVICE_SIZES.TABLET.width, DEVICE_SIZES.TABLET.height);

      const TestContext = createBasicNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should behave like tablet navigation
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
    });

    it('should handle foldable device configurations', async () => {
      // Mock foldable device (wide screen but mobile breakpoint)
      mockViewport.setViewport(600, 1000); // Narrow but tall

      const TestContext = createMobileNavigationContext();

      render(TestContext({ children: NavigationBar({}) }));

      await screen.findByRole('navigation');

      // Should use mobile navigation despite height
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });
  });
});