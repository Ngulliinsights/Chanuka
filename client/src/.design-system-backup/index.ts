/**
 * Design System - UNIFIED EXPORT
 *
 * ✅ SINGLE SOURCE OF TRUTH - All components from unified /components/ directory
 * ✅ TOKEN-BASED - All components use design tokens via CSS custom properties
 * ✅ TYPE-SAFE - Full TypeScript support with IntelliSense
 * 
 * This is the main entry point for the Chanuka Design System.
 * Import everything you need from here:
 * 
 * import { Button, Card, Input, Alert } from '@client/shared/design-system';
 */

// ✅ UNIFIED COMPONENTS - Single source of truth for all UI components
export * from './feedback';
export * from './interactive';
export * from './media';
export * from './typography';

// Design Tokens - Colors, spacing, typography tokens
export * from './tokens';

// Theme System - Light/dark mode and theme management
export * from './themes';

// Utilities - Design system utilities
export { cn } from './utils/cn';

// Accessibility - A11y utilities and helpers
export * from './accessibility';

// Styles - CSS files and design tokens
export * from './styles';

// Primitives - Core UI primitives
export * from './primitives';

// Utils - Design system utilities
export * from './utils';