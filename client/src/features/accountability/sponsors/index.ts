/**
 * Sponsors Feature - Political Transparency & Conflict Analysis
 * Complete client-side implementation for sponsor management and conflict detection
 */

// Types
export * from './types';

// Hooks (React Query)
export * from './hooks';

// Services (API integration)
export * from './services/api';

// UI Components
export { default as SponsorCard } from './ui/SponsorCard';
export { default as SponsorList } from './ui/SponsorList';
export { default as ConflictVisualization } from './ui/ConflictVisualization';
export { default as RiskProfile } from './ui/RiskProfile';

// Pages
export { default as SponsorsPage } from './pages/SponsorsPage';
export { default as SponsorDetailPage } from './pages/SponsorDetailPage';

// Named re-exports removed — already exported as defaults above