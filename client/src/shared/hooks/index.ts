/**
 * Shared Hooks
 * 
 * Cross-cutting utility and UI hooks used across features
 * These hooks provide general UI patterns, event handling, and utilities
 */

// UI/Utility Hooks - general purpose
export { useToast } from '.././use-toast';
export { useIsMobile as useMobile } from '.././use-mobile';
export { useKeyboardFocus } from '.././use-keyboard-focus';
export { useDebounce } from '.././useDebounce';
export { useMediaQuery } from '.././useMediaQuery';
export { useCleanup } from '.././useCleanup';

// Internationalization
export { useI18n } from './use-i18n';

// Service utilities
export { useService, useServices, useServiceAvailable, useServiceHealth } from './useService';

// Mock data utilities
export { useMockData, useMockDataBatch, useRealTimeEvents, useMockDataService } from './useMockData';

// Mobile-specific hooks
export * from './mobile';

// System utilities
export {
  useSystemHealth,
  useSystemStats,
  useSystemActivity,
  useSystemSchema,
  useSystemEnvironment
} from '.././use-system';

// Progressive disclosure and UX
export { useProgressiveDisclosure } from '.././useProgressiveDisclosure';


