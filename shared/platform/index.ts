/**
 * Platform-Specific Implementations
 * 
 * Exports platform-specific implementations for different countries/regions
 */

// Kenya-specific exports
export * as Kenya from './kenya/anonymity/anonymity-helper';

// Re-export types for convenience
export type {
  AnonymityLevel,
  DisplayIdentity,
  DataRetentionPolicy,
  AnonymityService as IAnonymityService
} from '../core/utils/anonymity-interface';

// Default export for current platform (Kenya)
export { default as AnonymityService } from './kenya/anonymity/anonymity-helper';