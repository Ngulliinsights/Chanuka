/**
 * Cookie Consent Banner Component
 * GDPR-compliant cookie consent management with granular controls
 * Optimized for accessibility, performance, and user experience
 */

import React from 'react';
import {
  Settings, 
  Shield, 
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Type definitions for better type safety
interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  cookies: string[];
  enabled: boolean;
}

interface CookieConsentBannerProps {
  onConsentChange?: (consent: Record<string, boolean>) => void;
  className?: string;
  position?: 'bottom' | 'top';
  theme?: 'light' | 'dark';
}

interface ConsentRecord {
  consent: Record<string, boolean>;
  timestamp: string;
  version: string;
}

// Constants for better maintainability
const STORAGE_KEYS = {
  CONSENT: 'cookie-consent',
  TIMESTAMP: 'cookie-consent-timestamp',
  VERSION: 'cookie-consent-version'
} as const;

const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_DAYS = 365;

// Default cookie categories with detailed information
const DEFAULT_CATEGORIES: Omit<CookieCategory, 'enabled'>[] = [
  {
    id: 'essential',
    name: 'Essential Cookies',
    description: 'These cookies are necessary for the website to function and cannot be switched off. They are usually only set in response to actions you make, such as setting your privacy preferences, logging in, or filling in forms.',
    required: true,
    cookies: ['session_id', 'csrf_token', 'auth_token']
  },
  {
    id: 'functional',
    name: 'Functional Cookies',
    description: 'These cookies enable enhanced functionality and personalization, such as remembering your preferences and settings. If you do not allow these cookies, some or all of these services may not function properly.',
    required: false,
    cookies: ['theme_preference', 'language_setting', 'sidebar_state', 'user_preferences']
  },
  {
    id: 'analytics',
    name: 'Analytics Cookies',
    description: 'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website and your experience.',
    required: false,
    cookies: ['_ga', '_gid', '_gat', 'analytics_session']
  },
  {
    id: 'marketing',
    name: 'Marketing Cookies',
    description: 'These cookies track your online activity to help advertisers deliver more relevant advertising or to limit how many times you see an ad. They may be set by us or by third-party providers whose services we use.',
    required: false,
    cookies: ['marketing_id', 'campaign_tracking', 'ad_preferences', 'conversion_tracking']
  }
];

export function CookieConsentBanner({ 
  onConsentChange, 
  className = '',
  position = 'bottom',
  theme = 'light'
}: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Helper to clear specific cookies
  const clearCookies = useCallback((cookieNames: string[]) => {
    cookieNames.forEach(name => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  }, []);

  // Apply or remove cookies based on consent settings
  const applyCookieSettings = useCallback((consent: Record<string, boolean>) => {
    // Apply analytics consent to Google Analytics if present
    if (typeof window !== 'undefined') {
      const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (gtag) {
        gtag('consent', 'update', {
          analytics_storage: consent.analytics ? 'granted' : 'denied',
          ad_storage: consent.marketing ? 'granted' : 'denied',
          ad_user_data: consent.marketing ? 'granted' : 'denied',
          ad_personalization: consent.marketing ? 'granted' : 'denied'
        });
      }
    }

    // Clear non-consented cookies
    if (!consent.functional) {
      clearCookies(['theme_preference', 'language_setting', 'sidebar_state', 'user_preferences']);
    }

    if (!consent.marketing) {
      clearCookies(['marketing_id', 'campaign_tracking', 'ad_preferences', 'conversion_tracking']);
    }

    // Dispatch custom event for other parts of the application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: consent }));
    }
  }, [clearCookies]);

  // Helper function to announce changes to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, []);

  // Save consent preferences to storage and apply settings
  const saveConsentToStorage = useCallback((consent: Record<string, boolean>) => {
    try {
      // Save to localStorage with version tracking
      localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(consent));
      localStorage.setItem(STORAGE_KEYS.TIMESTAMP, new Date().toISOString());
      localStorage.setItem(STORAGE_KEYS.VERSION, CONSENT_VERSION);

      // Notify parent component of consent change
      onConsentChange?.(consent);

      // Apply cookie settings immediately
      applyCookieSettings(consent);

      // Log consent for audit trail
      console.info('Cookie consent saved:', {
        consent,
        timestamp: new Date().toISOString(),
        version: CONSENT_VERSION
      });

      // Hide banner with animation
      setIsAnimating(false);
      setTimeout(() => setIsVisible(false), 300);

      // Announce success to screen readers
      announceToScreenReader('Cookie preferences saved successfully');
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
      announceToScreenReader('Failed to save cookie preferences. Please try again.');
    }
  }, [onConsentChange, applyCookieSettings, announceToScreenReader]);

  // Check if consent has expired based on timestamp
  const isConsentExpired = useCallback((timestamp: string): boolean => {
    try {
      const consentDate = new Date(timestamp);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - CONSENT_EXPIRY_DAYS);
      return consentDate < expiryDate;
    } catch {
      return true;
    }
  }, []);

  // Load existing consent from storage
  const loadExistingConsent = useCallback((): ConsentRecord | null => {
    try {
      const consentStr = localStorage.getItem(STORAGE_KEYS.CONSENT);
      const timestamp = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);
      const version = localStorage.getItem(STORAGE_KEYS.VERSION);

      if (!consentStr || !timestamp) {
        return null;
      }

      const consent = JSON.parse(consentStr);
      return { consent, timestamp, version: version || '0.0' };
    } catch (error) {
      console.error('Failed to load cookie consent:', error);
      return null;
    }
  }, []);

  // Initialize component state and check for existing consent
  useEffect(() => {
    const existingConsent = loadExistingConsent();
    
    // Show banner if no consent exists, consent expired, or version changed
    if (!existingConsent || 
        isConsentExpired(existingConsent.timestamp) ||
        existingConsent.version !== CONSENT_VERSION) {
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      // Apply existing consent settings
      applyCookieSettings(existingConsent.consent);
    }

    // Initialize categories with default or saved preferences
    const initialCategories: CookieCategory[] = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      enabled: existingConsent?.consent[cat.id] ?? cat.required
    }));
    
    setCategories(initialCategories);
  }, [loadExistingConsent, isConsentExpired, applyCookieSettings]);

  // Handle category toggle with accessibility announcement
  const handleCategoryToggle = useCallback((categoryId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId && !cat.required) {
        const newEnabled = !cat.enabled;
        const message = `${cat.name} ${newEnabled ? 'enabled' : 'disabled'}`;
        announceToScreenReader(message);
        return { ...cat, enabled: newEnabled };
      }
      return cat;
    }));
    setHasInteracted(true);
  }, [announceToScreenReader]);

  // Accept all cookies
  const handleAcceptAll = useCallback(() => {
    const updatedCategories = categories.map(cat => ({ ...cat, enabled: true }));
    setCategories(updatedCategories);
    
    const consent = updatedCategories.reduce((acc, cat) => {
      acc[cat.id] = cat.enabled;
      return acc;
    }, {} as Record<string, boolean>);
    
    saveConsentToStorage(consent);
  }, [categories, saveConsentToStorage]);

  // Accept only selected categories
  const handleAcceptSelected = useCallback(() => {
    const consent = categories.reduce((acc, cat) => {
      acc[cat.id] = cat.enabled;
      return acc;
    }, {} as Record<string, boolean>);
    
    saveConsentToStorage(consent);
  }, [categories, saveConsentToStorage]);

  // Reject all non-essential cookies
  const handleRejectAll = useCallback(() => {
    const updatedCategories = categories.map(cat => ({ 
      ...cat, 
      enabled: cat.required
    }));
    setCategories(updatedCategories);
    
    const consent = updatedCategories.reduce((acc, cat) => {
      acc[cat.id] = cat.enabled;
      return acc;
    }, {} as Record<string, boolean>);
    
    saveConsentToStorage(consent);
  }, [categories, saveConsentToStorage]);

  // Get appropriate icon for each cookie category
  const getCategoryIcon = useCallback((categoryId: string) => {
    const iconProps = { className: "h-4 w-4", "aria-hidden": true as const };
    switch (categoryId) {
      case 'essential':
        return <Shield {...iconProps} />;
      case 'functional':
        return <Settings {...iconProps} />;
      case 'analytics':
        return <BarChart3 {...iconProps} />;
      case 'marketing':
        return <BarChart3 {...iconProps} />;
      default:
        return <Settings {...iconProps} />;
    }
  }, []);

  // Calculate summary of enabled categories for screen readers
  const enabledSummary = useMemo(() => {
    const enabled = categories.filter(c => c.enabled && !c.required).length;
    const optional = categories.filter(c => !c.required).length;
    return `${enabled} of ${optional} optional cookie categories enabled`;
  }, [categories]);

  // Don't render if banner shouldn't be visible
  if (!isVisible) {
    return null;
  }

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';
  const themeClasses = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white';
  const animationClasses = isAnimating ? 'animate-slide-up opacity-100' : 'opacity-0';

  return (
    <div 
      className={`fixed ${positionClasses} left-0 right-0 z-50 p-4 transition-opacity duration-300 ${animationClasses} ${className}`}
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      aria-modal="false"
    >
      <div className={`max-w-4xl mx-auto rounded-lg shadow-2xl border-2 ${themeClasses} p-6`}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Settings className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <h2 id="cookie-banner-title" className="text-lg font-semibold mb-2">
                Cookie Preferences
              </h2>
              <p id="cookie-banner-description" className="text-sm text-gray-600 dark:text-gray-300">
                We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
                You can customize your preferences below or accept our recommended settings.
              </p>
              {showDetails && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" aria-live="polite">
                  {enabledSummary}
                </p>
              )}
            </div>
          </div>

          {/* Quick action buttons when details are hidden */}
          {!showDetails && (
            <div className="flex flex-wrap gap-3" role="group" aria-label="Cookie consent actions">
              <button
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                aria-expanded={showDetails}
              >
                <Settings className="h-4 w-4" aria-hidden />
                Customize
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          {/* Detailed category settings */}
          {showDetails && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-base">Cookie Categories</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Collapse cookie categories"
                  aria-expanded={showDetails}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3" role="group" aria-label="Cookie categories">
                {categories.map((category) => (
                  <div 
                    key={category.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getCategoryIcon(category.id)}
                        <span className="font-medium">{category.name}</span>
                        {category.required && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            Required
                          </span>
                        )}
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <span className="sr-only">
                          {category.required ? `${category.name} (always enabled)` : `Toggle ${category.name}`}
                        </span>
                        <input
                          type="checkbox"
                          checked={category.enabled}
                          onChange={() => handleCategoryToggle(category.id)}
                          disabled={category.required}
                          className="sr-only peer"
                          aria-describedby={`${category.id}-description`}
                        />
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${
                          category.enabled 
                            ? 'bg-blue-600' 
                            : 'bg-gray-200 dark:bg-gray-700'
                        } ${category.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <div className={`absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-transform ${
                            category.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </div>
                      </label>
                    </div>
                    <p id={`${category.id}-description`} className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {category.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5" aria-label={`Cookies in ${category.name} category`}>
                      {category.cookies.map((cookie) => (
                        <span
                          key={cookie}
                          className="inline-flex items-center px-2 py-1 rounded text-xs border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        >
                          {cookie}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons for detailed view */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700" role="group" aria-label="Save cookie preferences">
                <button
                  onClick={handleAcceptSelected}
                  disabled={!hasInteracted}
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  aria-disabled={!hasInteracted}
                >
                  Save Preferences
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Accept All
                </button>
                <button
                  onClick={handleRejectAll}
                  className="flex-1 sm:flex-none px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Reject All
                </button>
              </div>
            </div>
          )}

          {/* Footer with policy links */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
            <a 
              href="/privacy-policy" 
              className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 focus:outline-none focus:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
              <span aria-hidden>→</span>
            </a>
            <a 
              href="/cookie-policy" 
              className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 focus:outline-none focus:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cookie Policy
              <span aria-hidden>→</span>
            </a>
            <span aria-label={`Last updated ${new Date().toLocaleDateString()}`}>
              Last updated: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}