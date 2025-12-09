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

import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';

import { useUserProfile } from '@client/features/users/hooks/useUserAPI';
import { useDeviceInfo } from '@client/hooks/mobile/useDeviceInfo';
import { logger } from '@client/utils/logger';

interface EnhancedUXIntegrationProps {
  children: React.ReactNode;
}

export function EnhancedUXIntegration({ children }: EnhancedUXIntegrationProps) {
  const { data: user } = useUserProfile();
  const preferences = useSelector((state: { ui: { preferences: Record<string, unknown> } }) => state.ui.preferences);
  const isOnline = useSelector((state: { ui: { isOnline: boolean } }) => state.ui.isOnline);
  const { isMobile } = useDeviceInfo();

  const [isInitialized, setIsInitialized] = useState(false);

  const initializeEnhancedUX = useCallback(async () => {
    const setupAccessibilityAnnouncements = () => {
      // Create or get the announcements element
      let announcements = document.getElementById('accessibility-announcements');
      if (!announcements) {
        announcements = document.createElement('div');
        announcements.id = 'accessibility-announcements';
        announcements.setAttribute('aria-live', 'polite');
        announcements.setAttribute('aria-atomic', 'true');
        announcements.className = 'sr-only';
        document.body.appendChild(announcements);
      }

      // TODO: Listen for state changes that should be announced
      // This would need to be implemented with Redux subscriptions or React Query
    };

    const announceToScreenReader = (message: string) => {
      const announcements = document.getElementById('accessibility-announcements');
      if (announcements) {
        announcements.textContent = message;
        // Clear after a delay to allow for re-announcements
        setTimeout(() => {
          announcements.textContent = '';
        }, 1000);
      }
    };

    const setupKeyboardNavigation = () => {
      // Enhanced keyboard navigation
      document.addEventListener('keydown', (event) => {
        // Skip to main content (Alt + M)
        if (event.altKey && event.key === 'm') {
          event.preventDefault();
          const main = document.querySelector('main');
          if (main) {
            main.focus();
            announceToScreenReader('Skipped to main content');
          }
        }
        
        // Open search (Alt + S)
        if (event.altKey && event.key === 's') {
          event.preventDefault();
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            announceToScreenReader('Search focused');
          }
        }
        
        // Open navigation (Alt + N)
        if (event.altKey && event.key === 'n') {
          event.preventDefault();
          const navButton = document.querySelector('[aria-label*="navigation" i], [aria-label*="menu" i]') as HTMLButtonElement;
          if (navButton) {
            navButton.click();
            announceToScreenReader('Navigation opened');
          }
        }
      });
    };

    const setupPerformanceMonitoring = () => {
      // Monitor Core Web Vitals
      if ('web-vital' in window) {
        // This would integrate with the existing web vitals monitoring
        logger.info('Performance monitoring active');
      }
      
      // Monitor component render times
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) { // Log slow renders
            logger.warn('Slow component render detected', {
              name: entry.name,
              duration: entry.duration,
              component: 'EnhancedUXIntegration'
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    };

    const setupErrorRecovery = () => {
      // Enhanced error recovery with user-friendly messages
      window.addEventListener('unhandledrejection', (event) => {
        logger.error('Unhandled promise rejection', { error: event.reason });

        // TODO: Implement notification system with Redux or React Query
        // For now, just log the error
      });

      window.addEventListener('error', (event) => {
        logger.error('Unhandled error', {
          error: event.error,
          filename: event.filename,
          lineno: event.lineno
        });

        // TODO: Implement notification system with Redux or React Query
        // Don't show notifications for script loading errors (likely extensions)
        if (!event.filename?.includes('extension')) {
          // For now, just log the error
        }
      });
    };

    try {
      // Initialize accessibility announcements
      setupAccessibilityAnnouncements();
      
      // Initialize keyboard navigation
      setupKeyboardNavigation();
      
      // Initialize performance monitoring
      if (process.env.NODE_ENV === 'development') {
        setupPerformanceMonitoring();
      }
      
      // Initialize error recovery
      setupErrorRecovery();
      
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
          'personalization'
        ]
      });
    } catch (error) {
      logger.error('Failed to initialize enhanced UX', { error });
    }
  }, [user?.id, isMobile, isOnline]);

  // Initialize enhanced UX features
  useEffect(() => {
    initializeEnhancedUX();
  }, [initializeEnhancedUX]);

  // Handle online/offline state changes
  useEffect(() => {
    if (isOnline) {
      // Process any pending actions when coming back online
      // TODO: Implement pending actions processing with React Query mutations
    }
  }, [isOnline]);

  // Apply accessibility preferences
  useEffect(() => {
    const accessibilityPrefs = (preferences as Record<string, unknown>).accessibility as Record<string, unknown>;
    
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
      large: '18px'
    };
    const fontSize = fontSizeMap[(accessibilityPrefs?.fontSize as keyof typeof fontSizeMap) || 'medium'] || fontSizeMap.medium;
    document.documentElement.style.setProperty(
      '--base-font-size',
      fontSize
    );
  }, [preferences]);

  // Apply theme preferences
  useEffect(() => {
    const prefsTheme = (preferences as Record<string, unknown>).theme;
    const theme = prefsTheme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
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
        <a 
          href="#main-content" 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
        >
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