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

// Hooks
export * from './hooks/useCommunity';
export * from './hooks';

// Argument Intelligence Integration Hooks
export { useArgumentsForBill } from './hooks/useArgumentsForBill';
export { useArgumentClusters } from './hooks/useArgumentClusters';
export { useLegislativeBrief } from './hooks/useLegislativeBrief';

// UI Components
export * from './ui';
