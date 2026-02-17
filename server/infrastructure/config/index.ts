/**
 * Configuration Manager
 * Unified export for configuration management
 */
import { ConfigurationManager } from './manager';

// Re-export everything from manager
export * from './manager';

// Alias for backward compatibility
export { ConfigurationManager as ConfigManager };

// Re-export utilities if needed
export * from './utilities';

// Default export (already in manager, but re-exporting here)
export { default } from './manager';
