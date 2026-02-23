/**
 * Constitutional Intelligence Feature
 * 
 * Main entry point for constitutional analysis functionality.
 * Provides tools for analyzing bills against Kenya's Constitution 2010.
 */

// Domain Layer
export * from './domain';

// Application Layer
export * from './application';

// Feature metadata
export const FEATURE_NAME = 'constitutional-intelligence';
export const FEATURE_VERSION = '1.0.0';
export const FEATURE_DESCRIPTION = 'Constitutional analysis and violation detection for legislative bills';
