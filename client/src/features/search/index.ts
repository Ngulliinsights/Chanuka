/**
 * Search Feature - Public API
 *
 * Provides access to search functionality including:
 * - Intelligent dual-engine search service
 * - Core API client for direct endpoint access
 * - Type definitions
 * - React components and hooks
 */

// Main search service (business logic)
export { intelligentSearch as searchService } from './services/intelligent-search';
export { IntelligentSearchService } from './services/intelligent-search';

// Core API client (direct API access)
export { searchApiClient } from '@client/infrastructure/api/search';

// Types
export type * from './types';

// Components
export * from './ui';

// Hooks
export * from './hooks/useSearch';
export * from './hooks/useIntelligentSearch';

// For backward compatibility
export { searchApiClient as searchApi } from '@client/infrastructure/api/search';
