/**
 * Integration Types
 */

import type { PrivacyAnalyticsService } from '@client/lib/services/privacyAnalyticsService';

import type { DeviceDetector } from '@client/infrastructure/mobile';
// TouchHandler is deprecated - using SwipeGestures instead

export interface IntegrationStatus {
  security: 'pending' | 'loading' | 'success' | 'error';
  privacy: 'pending' | 'loading' | 'success' | 'error';
  ui: 'pending' | 'loading' | 'success' | 'error';
  mobile: 'pending' | 'loading' | 'success' | 'error';
}

export interface IntegrationServices {
  privacyAnalytics?: PrivacyAnalyticsService;
  deviceDetector?: DeviceDetector;
  // touchHandler removed - use SwipeGestures component instead
}

export interface IntegrationContextValue {
  status: IntegrationStatus;
  services: IntegrationServices;
  isReady: boolean;
  error?: Error;
  retry: () => void;
}
