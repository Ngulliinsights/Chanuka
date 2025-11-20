/**
 * Cookie Consent Banner Component
 * GDPR-compliant cookie consent management with granular controls
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  Cookie, 
  Settings, 
  Shield, 
  BarChart3, 
  Palette,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { privacyCompliance } from '@client/utils/privacy-compliance';
import { logger } from '@client/utils/logger';

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
}

export function CookieConsentBanner({ onConsentChange, className = '' }: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const existingConsent = localStorage.getItem('cookie-consent');
    const consentTimestamp = localStorage.getItem('cookie-consent-timestamp');
    
    if (!existingConsent || !consentTimestamp) {
      setIsVisible(true);
    } else {
      // Check if consent is older than 1 year (GDPR requirement for reconfirmation)
      const consentDate = new Date(consentTimestamp);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (consentDate < oneYearAgo) {
        setIsVisible(true);
      }
    }

    // Initialize cookie categories
    const cookieCategories = privacyCompliance.getCookieCategories();
    const initialCategories: CookieCategory[] = cookieCategories.map(cat => ({
      ...cat,
      enabled: cat.required || false, // Required cookies are always enabled
    }));
    
    setCategories(initialCategories);
  }, []);

  const handleCategoryToggle = (categoryId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId && !cat.required 
        ? { ...cat, enabled: !cat.enabled }
        : cat
    ));
    setHasInteracted(true);
  };

  const handleAcceptAll = () => {
    const updatedCategories = categories.map(cat => ({ ...cat, enabled: true }));
    setCategories(updatedCategories);
    saveConsent(updatedCategories);
  };

  const handleAcceptSelected = () => {
    saveConsent(categories);
  };

  const handleRejectAll = () => {
    const updatedCategories = categories.map(cat => ({ 
      ...cat, 
      enabled: cat.required // Only keep required cookies
    }));
    setCategories(updatedCategories);
    saveConsent(updatedCategories);
  };

  const saveConsent = (consentCategories: CookieCategory[]) => {
    const consent = consentCategories.reduce((acc, cat) => {
      acc[cat.id] = cat.enabled;
      return acc;
    }, {} as Record<string, boolean>);

    // Save to localStorage
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());

    // Record consent in privacy compliance system
    consentCategories.forEach(cat => {
      if (!cat.required) { // Don't record consent for required cookies
        privacyCompliance.recordConsent(
          'anonymous', // Would be actual user ID if logged in
          'cookies',
          cat.enabled
        );
      }
    });

    // Notify parent component
    onConsentChange?.(consent);

    // Hide banner
    setIsVisible(false);

    // Apply cookie settings
    applyCookieSettings(consent);

    logger.info('Cookie consent saved', {
      component: 'CookieConsentBanner',
      consent,
      timestamp: new Date().toISOString(),
    });
  };

  const applyCookieSettings = (consent: Record<string, boolean>) => {
    // Apply analytics cookies
    if (consent.analytics) {
      // Enable analytics tracking
      (window as any).gtag?.('consent', 'update', {
        analytics_storage: 'granted'
      });
    } else {
      // Disable analytics tracking
      (window as any).gtag?.('consent', 'update', {
        analytics_storage: 'denied'
      });
    }

    // Apply functional cookies
    if (!consent.functional) {
      // Clear functional cookies
      const functionalCookies = ['theme_preference', 'language_setting', 'sidebar_state'];
      functionalCookies.forEach(cookie => {
        document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    }

    // Apply marketing cookies
    if (!consent.marketing) {
      // Clear marketing cookies
      const marketingCookies = ['marketing_id', 'campaign_tracking'];
      marketingCookies.forEach(cookie => {
        document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'essential':
        return <Shield className="h-4 w-4" />;
      case 'functional':
        return <Palette className="h-4 w-4" />;
      case 'analytics':
        return <BarChart3 className="h-4 w-4" />;
      case 'marketing':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <Cookie className="h-4 w-4" />;
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <Card className="max-w-4xl mx-auto shadow-lg border-2">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <Cookie className="h-6 w-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  Cookie Preferences
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
                  You can customize your preferences below or accept our recommended settings.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            {!showDetails && (
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAcceptAll} className="flex-1 sm:flex-none">
                  Accept All
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleRejectAll}
                  className="flex-1 sm:flex-none"
                >
                  Reject All
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Customize
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Detailed Settings */}
            {showDetails && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Cookie Categories</h4>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowDetails(false)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category.id)}
                          <span className="font-medium">{category.name}</span>
                          {category.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={category.enabled}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                          disabled={category.required}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {category.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {category.cookies.map((cookie) => (
                          <Badge key={cookie} variant="outline" className="text-xs">
                            {cookie}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button 
                    onClick={handleAcceptSelected}
                    disabled={!hasInteracted}
                    className="flex-1 sm:flex-none"
                  >
                    Save Preferences
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleAcceptAll}
                    className="flex-1 sm:flex-none"
                  >
                    Accept All
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleRejectAll}
                    className="flex-1 sm:flex-none"
                  >
                    Reject All
                  </Button>
                </div>
              </div>
            )}

            {/* Footer Links */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t">
              <a 
                href="/privacy-policy" 
                className="hover:text-blue-600 inline-flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
                <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="/cookie-policy" 
                className="hover:text-blue-600 inline-flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cookie Policy
                <ExternalLink className="h-3 w-3" />
              </a>
              <span>
                Last updated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}