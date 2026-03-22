/**
 * Server Features Index
 * 
 * NOTE: Star exports from features are disabled to prevent export conflicts.
 * Import directly from individual feature modules instead:
 * 
 * import { AdminService } from './admin';
 * import { AdvocacyService } from './advocacy';
 * import { AnalysisService } from './analysis';
 * etc.
 * 
 * Individual feature modules maintain their own public API.
 */

// Individual feature modules should be imported directly, not through star exports
// This prevents naming conflicts when multiple features export similar types

// Conditional exports - only export non-conflicting modules
export * from './admin';
export * from './bills';
export * from './community';
export * from './feature-flags';
export * from './government-data';
export * from './market';
export * from './recommendation';
export * from './search';
export * from './security';
export * from './sponsors';
export * from './users';
