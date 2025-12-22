/**
 * Anonymity Service Implementation
 * 
 * Moved from shared/utils/anonymity-helper.ts to core utilities
 * Provides platform-agnostic anonymity management
 */

// Re-export platform-specific implementation
export { default } from '../../../platform/kenya/anonymity/anonymity-helper';
export * from '../../../platform/kenya/anonymity/anonymity-helper';

// Re-export types for convenience
export type {
  AnonymityLevel,
  DisplayIdentity,
  DataRetentionPolicy,
  AnonymityService
} from './anonymity-interface';