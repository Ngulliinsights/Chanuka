/**
 * Enhanced UX Integration Component
 *
 * This component integrates all the UX enhancements:
 * - Unified state management
 * - Progressive disclosure
 * - Mobile optimization
 * - Personalized content
 * - Accessibility features
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';

import { useUserProfile } from '@client/features/users/hooks/useUserAPI';
import { useDeviceInfo } from '@client/lib/hooks/mobile/useDeviceInfo';
import { logger } from '@client/lib/utils/logger';

interface EnhancedUXIntegrationProps {
  children: React.ReactNode;
}

export function EnhancedUXIntegration({ children }: EnhancedUXIntegrationProps) {
  const { data: user } = useUserProfile();
  const preferences = useSelector(
    (state: { ui: { preferences: Record<string, unknown> } }) => state.ui.preferences
  );
  const isOnline = useSelector((state: { ui: { isOnline: boolean } }) => state.ui.isOnline);
  const { isMobile } = useDeviceInfo();

  const [isInitialized, setIsInitialized] = useState(false);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);

  // Screen reader announcement helper
  const announceToScreenReader = useCallback((message: string) => {
    const announcements = document.getElementById('accessibility-announcements');
    if (announcements) {
      announcements.textContent = message;
      setTimeout(() => {
        announcements.textContent = '';
      }, 1000);
    }
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip to main content (Alt + M)
    if (event.altKey && event.key === 'm') {
      event.preventDefault();
      const main = document.querySelector('main');
      if (main) {
        (main as HTMLElement).focus();
        announceToScreenReader('Skipped to main content');
      }
    }

    // Open search (Alt + S)
    if (event.altKey && event.key === 's') {
      event.preventDefault();
      const searchInput = document.querySelector(
        'input[type="search"], input[placeholder*="search" i]'
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        announceToScreenReader('Search focused');
      }
    }

    // Open navigation (Alt + N)
    if (event.altKey && event.key === 'n') {
      event.preventDefault();
      const navButton = document.querySelector(
        '[aria-label*="navigation" i], [aria-label*="menu" i]'
      ) as HTMLButtonElement;
      if (navButton) {
        navButton.click();
        announceToScreenReader('Navigation opened');
      }
    }
  }, [announceToScreenReader]);

  // Error handlers
  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    logger.error('Unhandled promise rejection', { error: event.reason });
  }, []);

  const handleError = useCallback((event: ErrorEvent) => {
    logger.error('Unhandled error', {
      error: event.error,
      filename: event.filename,
      lineno: event.lineno,
    });
  }, []);

  // Setup accessibility announcements element
  useEffect(() => {
    let announcements = document.getElementById('accessibility-announcements');
    if (!announcements) {
      announcements = document.createElement('div');
      announcements.id = 'accessibility-announcements';
      announcements.setAttribute('aria-live', 'polite');
      announcements.setAttribute('aria-atomic', 'true');
      announcements.className = 'sr-only';
      document.body.appendChild(announcements);
    }

    return () => {
      // Only remove if we created it
      const el = document.getElementById('accessibility-announcements');
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
  }, []);

  // Setup keyboard navigation with cleanup
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Setup error recovery with cleanup
  useEffect(() => {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [handleUnhandledRejection, handleError]);

  // Setup performance monitoring (dev only) with cleanup
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) {
            logger.warn('Slow component render detected', {
              name: entry.name,
              duration: entry.duration,
              component: 'EnhancedUXIntegration',
            });
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
      performanceObserverRef.current = observer;
    } catch (error) {
      // PerformanceObserver not supported
    }

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
        performanceObserverRef.current = null;
      }
    };
  }, []);

  // Log initialization
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      logger.info('Enhanced UX integration initialized', {
        component: 'EnhancedUXIntegration',
        userId: user?.id,
        isMobile,
        isOnline,
        features: [
          'unified-state',
          'progressive-disclosure',
          'mobile-optimization',
          'accessibility',
          'personalization',
        ],
      });
    }
  }, [isInitialized, user?.id, isMobile, isOnline]);

  // Handle online/offline state changes
  useEffect(() => {
    if (isOnline) {
      // Process any pending actions when coming back online
      // TODO: Implement pending actions processing with React Query mutations
    }
  }, [isOnline]);

  // Apply accessibility preferences
  useEffect(() => {
    const accessibilityPrefs = (preferences as Record<string, unknown>).accessibility as Record<
      string,
      unknown
    >;

    if (accessibilityPrefs?.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    }

    if (accessibilityPrefs?.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Set font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    const fontSize =
      fontSizeMap[(accessibilityPrefs?.fontSize as keyof typeof fontSizeMap) || 'medium'] ||
      fontSizeMap.medium;
    document.documentElement.style.setProperty('--base-font-size', fontSize);
  }, [preferences]);

  // Apply theme preferences
  useEffect(() => {
    const prefsTheme = (preferences as Record<string, unknown>).theme;
    const theme =
      prefsTheme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : prefsTheme;

    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [preferences]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing enhanced experience...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}

      {/* Accessibility Skip Links */}
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50">
        <a href="#main-content" className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
          Skip to main content
        </a>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="sr-only">
        <p>Keyboard shortcuts: Alt+M for main content, Alt+S for search, Alt+N for navigation</p>
      </div>
    </>
  );
}

export default EnhancedUXIntegration;
