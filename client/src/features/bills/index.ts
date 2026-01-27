/**
 * Bills Feature - Tracking, Analysis, Legislative Monitoring
 * Flattened Feature-Sliced Design exports
 */

// Types
export * from './types';

// Hooks (React Query)
export * from './hooks';

// Services (business logic)
export * from './services';

// UI Components
export { default as BillCard } from './ui/list/BillCard';
export { BillList } from './BillList';
export { default as BillAnalysis } from './BillAnalysis';
export { BillHeader } from './BillHeader';

// Legacy UI exports for compatibility
export * from './ui';
