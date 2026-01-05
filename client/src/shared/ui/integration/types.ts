/**
 * Integration Types
 */

import type { CSPManager, DOMSanitizer, InputValidator, PasswordValidator } from '@/utils/security';
import type { DeviceDetector } from '@/core/mobile';
import type { PrivacyAnalyticsService } from '@/services/privacyAnalyticsService';
// TouchHandler is deprecated - using SwipeGestures instead
// import type { SwipeGestureConfig } from '@/hooks/mobile/useSwipeGesture'; // Module not found

export interface IntegrationStatus {
  security: 'pending' | 'loading' | 'success' | 'error';
  privacy: 'pending' | 'loading' | 'success' | 'error';
  ui: 'pending' | 'loading' | 'success' | 'error';
  mobile: 'pending' | 'loading' | 'success' | 'error';
}

export interface IntegrationServices {
  cspManager?: CSPManager;
  domSanitizer?: DOMSanitizer;
  inputValidator?: InputValidator;
  passwordValidator?: PasswordValidator;
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
