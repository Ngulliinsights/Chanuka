/**
 * Responsive Design System
 * 
 * Main export file for the responsive design system including
 * utilities, components, and configuration.
 * 
 * Requirements: 9.1, 9.5
 */

// Core responsive utilities and configuration
export * from './responsive';

// Responsive components
export * from './components';

// CSS imports (for bundlers that support CSS imports)
export { default as responsiveStyles } from './responsive.css';

