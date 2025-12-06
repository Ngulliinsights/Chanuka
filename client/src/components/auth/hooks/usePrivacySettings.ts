/**
 * Privacy Settings Hook
 * Manages privacy settings state and validation for registration and user preferences
 */

import { useState, useCallback, useEffect } from 'react';

import { PrivacySettings } from '@client/types/auth';
import { logger } from '@client/utils/logger';
import { privacyCompliance } from '@client/utils/privacy-compliance';

export interface UsePrivacySettingsOptions {
  initialSettings?: Partial<PrivacySettings>;
  onSettingsChange?: (settings: PrivacySettings) => void;
  validateOnChange?: boolean;
}

export interface UsePrivacySettingsReturn {
  settings: PrivacySettings;
  errors: Partial<Record<keyof PrivacySettings, string>>;
  isValid: boolean;
  updateSetting: <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => void;
  updateNotificationPreference: <K extends keyof PrivacySettings['notification_preferences']>(
    key: K,
    value: PrivacySettings['notification_preferences'][K]
  ) => void;
  updateSettings: (newSettings: Partial<PrivacySettings>) => void;
  resetToDefaults: () => void;
  validateSettings: () => boolean;
  clearErrors: () => void;
}

// Default privacy settings for registration
const defaultPrivacySettings: PrivacySettings = {
  profile_visibility: 'registered',
  email_visibility: 'private',
  activity_tracking: false,
  analytics_consent: false,
  marketing_consent: false,
  data_sharing_consent: false,
  location_tracking: false,
  personalized_content: true,
  third_party_integrations: false,
  notification_preferences: {
    email_notifications: true,
    push_notifications: false,
    sms_notifications: false,
    bill_updates: true,
    comment_replies: true,
    expert_insights: true,
    security_alerts: true,
    privacy_updates: true,
  },
};

export function usePrivacySettings(options: UsePrivacySettingsOptions = {}): UsePrivacySettingsReturn {
  const {
    initialSettings = {},
    onSettingsChange,
    validateOnChange = true,
  } = options;

  const [settings, setSettings] = useState<PrivacySettings>(() => ({
    ...defaultPrivacySettings,
    ...initialSettings,
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof PrivacySettings, string>>>({});

  // Validate settings using privacy compliance utility
  const validateSettings = useCallback((): boolean => {
    try {
      const validation = privacyCompliance.validatePrivacySettings(settings);

      if (!validation.isValid) {
        const newErrors: Partial<Record<keyof PrivacySettings, string>> = {};

        // Map validation errors to field-specific errors
        validation.errors?.forEach(error => {
          // Extract field name from error message if possible
          if (error.includes('profile_visibility')) {
            newErrors.profile_visibility = error;
          } else if (error.includes('email_visibility')) {
            newErrors.email_visibility = error;
          } else if (error.includes('consent')) {
            newErrors.analytics_consent = error;
          } else {
            // Generic error for settings that don't have specific field mapping
            newErrors.activity_tracking = error;
          }
        });

        setErrors(newErrors);
        return false;
      }

      setErrors({});
      return true;
    } catch (error) {
      logger.error('Privacy settings validation failed:', { component: 'usePrivacySettings' }, error);
      setErrors({ activity_tracking: 'Settings validation failed' });
      return false;
    }
  }, [settings]);

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      onSettingsChange?.(newSettings);

      if (validateOnChange) {
        // Validate after update
        setTimeout(() => validateSettings(), 0);
      }

      return newSettings;
    });
  }, [onSettingsChange, validateOnChange, validateSettings]);

  // Update notification preference
  const updateNotificationPreference = useCallback(<K extends keyof PrivacySettings['notification_preferences']>(
    key: K,
    value: PrivacySettings['notification_preferences'][K]
  ) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        notification_preferences: {
          ...prev.notification_preferences,
          [key]: value,
        },
      };
      onSettingsChange?.(newSettings);

      if (validateOnChange) {
        setTimeout(() => validateSettings(), 0);
      }

      return newSettings;
    });
  }, [onSettingsChange, validateOnChange, validateSettings]);

  // Update multiple settings at once
  const updateSettings = useCallback((newSettings: Partial<PrivacySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      onSettingsChange?.(updated);

      if (validateOnChange) {
        setTimeout(() => validateSettings(), 0);
      }

      return updated;
    });
  }, [onSettingsChange, validateOnChange, validateSettings]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(defaultPrivacySettings);
    setErrors({});
    onSettingsChange?.(defaultPrivacySettings);
  }, [onSettingsChange]);

  // Clear validation errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Check if settings are valid
  const isValid = Object.keys(errors).length === 0;

  // Validate on mount if initial settings provided
  useEffect(() => {
    if (Object.keys(initialSettings).length > 0 && validateOnChange) {
      validateSettings();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    settings,
    errors,
    isValid,
    updateSetting,
    updateNotificationPreference,
    updateSettings,
    resetToDefaults,
    validateSettings,
    clearErrors,
  };
}