/**
 * Shared Hooks
 * 
 * Cross-cutting utility and UI hooks used across features
 * These hooks provide general UI patterns, event handling, and utilities
 */

// UI/Utility Hooks - general purpose
export { useToast } from '../../hooks/use-toast';
export { useIsMobile as useMobile } from '../../hooks/use-mobile';
export { useKeyboardFocus } from '../../hooks/use-keyboard-focus';
export { useDebounce } from '../../hooks/useDebounce';
export { useMediaQuery } from '../../hooks/useMediaQuery';
export { useWebSocket } from '../../hooks/use-websocket';
export { useCleanup } from '../../hooks/useCleanup';

// Internationalization
export { useI18n } from '../../hooks/use-i18n';

// Mobile-specific hooks
export * from './mobile';

// System utilities
export {
  useSystemHealth,
  useSystemStats,
  useSystemActivity,
  useSystemSchema,
  useSystemEnvironment
} from '../../hooks/use-system';

// Progressive disclosure and UX
export { useProgressiveDisclosure } from '../../hooks/useProgressiveDisclosure';

// Real-time engagement
export { useRealTimeEngagement } from '../../hooks/useRealTimeEngagement';
