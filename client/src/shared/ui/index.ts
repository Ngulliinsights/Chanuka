/**
 * Shared UI Components
 *
 * Components that are genuinely used across multiple features.
 * These components should have zero feature-specific logic.
 */

// Layout Components
export { default as Layout } from './layout/Layout';
export { default as Header } from './layout/Header';

// Navigation Components
export * from './navigation';

// Loading Components
export { default as LoadingSpinner } from './loading/LoadingSpinner';

// Mobile Components
export * from './mobile';

// Dashboard Components
export * from './dashboard';

// Real-time Components
export * from './realtime';