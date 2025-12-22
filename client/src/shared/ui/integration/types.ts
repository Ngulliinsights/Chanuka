/**
 * Integration Types
 */

import type { CSPManager, DOMSanitizer, InputValidator, PasswordValidator } from '@client/utils/security';
import type { DeviceDetector } from '@client/core/mobile';
import type { PrivacyAnalyticsService } from '@client/services/privacyAnalyticsService';
import type { TouchHandler } from '@/core/mobile/touch-handler';

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
  touchHandler?: TouchHandler;
}

export interface IntegrationContextValue {
  status: IntegrationStatus;
  services: IntegrationServices;
  isReady: boolean;
  error?: Error;
  retry: () => void;
}