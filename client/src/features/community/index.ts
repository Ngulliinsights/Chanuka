/**
 * Community Feature - Discussions, Expertise, Activity
 * Feature-Sliced Design barrel exports
 * 
 * Integrations:
 * - Argument Intelligence: Structured argument extraction and synthesis
 * - Constitutional Analysis: Legal compliance checking
 * - Coalition Finding: Stakeholder analysis and partnerships
 */

// Services
export * from './services';
export { communityApiService } from './services/api';

// Hooks - Business logic hooks
export * from './hooks/useCommunity';
export * from './hooks';

// Unified hooks (migrated from infrastructure)
export { useUnifiedCommunity } from './hooks/useUnifiedCommunity';
export { useUnifiedDiscussion } from './hooks/useUnifiedDiscussion';
export { useRealtime } from './hooks/useRealtime';

// Argument Intelligence Integration Hooks
export { useArgumentsForBill } from './hooks/useArgumentsForBill';
export { useArgumentClusters } from './hooks/useArgumentClusters';
export { useLegislativeBrief } from './hooks/useLegislativeBrief';

// UI Components
export * from './ui';
