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

// Re-export specific components for convenience
export { SponsorCard } from './ui/SponsorCard';
export { SponsorList } from './ui/SponsorList';
export { ConflictVisualization } from './ui/ConflictVisualization';
export { RiskProfile } from './ui/RiskProfile';
export { SponsorsPage } from './pages/SponsorsPage';
export { SponsorDetailPage } from './pages/SponsorDetailPage';