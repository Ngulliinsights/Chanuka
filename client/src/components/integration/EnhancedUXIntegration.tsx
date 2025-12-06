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

import React, { useEffect, useState } from 'react';
import { useAppStore, useUserPreferences, useOnlineStatus } from '@client/store/unified-state-manager';
import { copySystem } from '@client/content/copy-system';
import { logger } from '@client/utils/logger';
import { useMediaQuery } from '@client/hooks/useMediaQuery';

interface EnhancedUXIntegrationProps {
  children: React.ReactNode;
}

export function EnhancedUXIntegration({ children }: EnhancedUXIntegrationProps) {
  const user = useAppStore(state => state.user.user);
  const preferences = useUserPreferences();
  const { isOnline, syncStatus } = useOnlineStatus();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize enhanced UX features
  useEffect(() => {
    initializeEnhancedUX();
  }, []);

  // Handle online/offline state changes
  useEffect(() => {
    if (isOnline && syncStatus === 'idle') {
      // Process any pending actions when coming back online
      useAppStore.getState().processPendingActions();
    }
  }, [isOnline, syncStatus]);

  // Apply accessibility preferences
  useEffect(() => {
    if (preferences.accessibility.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    }
    
    if (preferences.accessibility.highContrast) {
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
    document.documentElement.style.setProperty(
      '--base-font-size', 
      fontSizeMap[preferences.accessibility.fontSize]
    );
  }, [preferences.accessibility]);

  // Apply theme preferences
  useEffect(() => {
    const theme = preferences.theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : preferences.theme;
      
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [preferences.theme]);

  const initializeEnhancedUX = async () => {
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
        userPersona: user?.persona,
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
  };

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

    // Listen for state changes that should be announced
    useAppStore.subscribe(
      (state) => state.ui.notifications,
      (notifications) => {
        const latestNotification = notifications[0];
        if (latestNotification && !latestNotification.dismissed) {
          announceToScreenReader(latestNotification.message);
        }
      }
    );
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
      
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        useAppStore.getState().addNotification({
          type: 'error',
          message: 'Something went wrong, but we\'re working to fix it. Please try refreshing the page.'
        });
      }, 0);
    });
    
    window.addEventListener('error', (event) => {
      logger.error('Unhandled error', { 
        error: event.error,
        filename: event.filename,
        lineno: event.lineno
      });
      
      // Don't show notifications for script loading errors (likely extensions)
      if (!event.filename?.includes('extension')) {
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          useAppStore.getState().addNotification({
            type: 'error',
            message: 'An unexpected error occurred. Please try refreshing the page.'
          });
        }, 0);
      }
    });
  };

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