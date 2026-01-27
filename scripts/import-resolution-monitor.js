#!/usr/bin/env node

/**
 * Import Resolution Monitor for Debugging Sessions
 * 
 * This tool monitors and logs module import resolution during Node.js debugging sessions.
 * It provides real-time feedback on path alias resolution, detects problematic import patterns,
 * and integrates with VS Code debugging workflows.
 * 
 * Features:
 * - Tracks all module imports with detailed logging
 * - Validates path alias mappings
 * - Detects deep relative imports and resolution failures
 * - Provides statistics and monitoring APIs
 * - Integrates with VS Code debugging environment
 */

import Module from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ============================================================================
// Configuration and Setup
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// File paths for logging
const LOG_FILES = {
  main: path.join(projectRoot, 'import-resolution.log'),
  debug: path.join(projectRoot, 'debug-import-resolution.log')
};

// Path alias mappings - centralized configuration for your project
const PATH_MAPPINGS = {
  '@': './client/src',
  '@shared': './shared',
  '@server': './server',
  '@shared/core': './shared/core/src/index.ts',
  '@server/infrastructure/schema': './shared/schema/index.ts',
  '@db': './db/index.ts'
};

// Debugging configuration
const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV === 'development' && 
           (process.env.VSCODE_DEBUG_MODE === 'true' || 
            process.env.IMPORT_MONITORING === 'true'),
  statsInterval: 10000, // Report stats every 10 seconds
  deepImportThreshold: 3 // Warn on imports with more than 3 "../" sequences
};

// File extensions to try when resolving modules
const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.js'];

// ============================================================================
// State Management
// ============================================================================

// In-memory logs for quick access and analysis
const resolutionLog = [];
const debugResolutionLog = [];

// ============================================================================
// Initialization
// ============================================================================

/**
 * Clears previous log files to start fresh with each monitoring session.
 * This prevents log files from growing indefinitely across multiple runs.
 */
function initializeLogFiles() {
  Object.values(LOG_FILES).forEach(logPath => {
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  });
}

// ============================================================================
// Import Type Classification
// ============================================================================

/**
 * Determines the type of import based on the request string.
 * This helps categorize imports for better analysis and debugging.
 */
function classifyImportType(request) {
  if (request.startsWith('@')) return 'PATH_ALIAS';
  if (request.startsWith('./') || request.startsWith('../')) return 'RELATIVE';
  if (request.startsWith('/')) return 'ABSOLUTE';
  return 'NPM_PACKAGE';
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Creates a structured log entry for an import resolution attempt.
 * This captures all relevant information needed for debugging import issues.
 */
function createLogEntry(request, parent, resolved) {
  return {
    timestamp: new Date().toISOString(),
    request,
    parent: parent?.filename ? path.relative(projectRoot, parent.filename) : 'unknown',
    resolved: resolved ? path.relative(projectRoot, resolved) : 'unresolved',
    type: classifyImportType(request),
    success: !!resolved,
    error: resolved ? null : 'Module not found'
  };
}

/**
 * Logs an import resolution attempt to both memory and disk.
 * In debug mode, provides real-time console feedback for failures.
 */
function logResolution(request, parent, resolved) {
  const entry = createLogEntry(request, parent, resolved);
  
  // Store in memory for quick access via API
  resolutionLog.push(entry);

  // Write to main log file for persistent record
  const logLine = `[${entry.timestamp}] ${entry.type} ${entry.request} -> ${entry.resolved} (from ${entry.parent})\n`;
  fs.appendFileSync(LOG_FILES.main, logLine);

  // Enhanced logging in debug mode
  if (DEBUG_CONFIG.enabled) {
    debugResolutionLog.push(entry);
    
    const debugLine = `DEBUG: ${entry.type} | ${entry.request} | ${entry.resolved || 'FAILED'} | ${entry.parent}\n`;
    fs.appendFileSync(LOG_FILES.debug, debugLine);

    // Provide immediate feedback for path alias failures
    if (entry.type === 'PATH_ALIAS' && !entry.success) {
      console.warn(`⚠️  Import resolution failed: ${entry.request} (from ${entry.parent})`);
    }
  }
}

// ============================================================================
// Path Alias Resolution
// ============================================================================

/**
 * Attempts to resolve a path alias to a real file path.
 * Tries multiple extensions and index files to find the actual module.
 */
function resolvePathAlias(request, parent) {
  const alias = request.split('/')[0];
  const mapping = PATH_MAPPINGS[alias];

  if (!mapping) {
    return null;
  }

  // Replace the alias with the actual path
  const resolvedPath = request.replace(alias, mapping);
  const fullPath = path.resolve(projectRoot, resolvedPath);

  // Try each extension until we find a file that exists
  for (const ext of MODULE_EXTENSIONS) {
    const testPath = fullPath + ext;
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  return null;
}

// ============================================================================
// Module Resolution Hooks
// ============================================================================

/**
 * Hooks into Node.js module resolution to intercept and log all import attempts.
 * This is the core mechanism that enables monitoring without modifying application code.
 */
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  try {
    const resolved = originalResolveFilename.call(this, request, parent, isMain, options);
    logResolution(request, parent, resolved);
    return resolved;
  } catch (error) {
    logResolution(request, parent, null);
    throw error;
  }
};

/**
 * Enhances module loading to handle custom path aliases.
 * This allows your application to use clean import paths like '@shared/utils'.
 */
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  // Intercept path alias imports for custom resolution
  if (request.startsWith('@')) {
    const resolvedPath = resolvePathAlias(request, parent);
    
    if (resolvedPath) {
      logResolution(request, parent, resolvedPath);
      return originalLoad.call(this, resolvedPath, parent, isMain);
    }
  }

  return originalLoad.call(this, request, parent, isMain);
};

// ============================================================================
// VS Code Debugging Integration
// ============================================================================

/**
 * Sets up integration hooks for VS Code debugging.
 * These breakpoint functions can be extended by VS Code extensions
 * to provide enhanced debugging experiences.
 */
function setupVSCodeIntegration() {
  if (!DEBUG_CONFIG.enabled) return;

  global.vscodeImportBreakpoints = {
    /**
     * Triggered when a path alias import fails to resolve.
     * VS Code extensions can hook into this for automatic breakpoints.
     */
    onImportFailure: (entry) => {
      if (entry.type === 'PATH_ALIAS' && !entry.success) {
        console.error(`🚨 Import breakpoint: ${entry.request} failed to resolve`);
        return true;
      }
      return false;
    },

    /**
     * Triggered when a deep relative import is detected.
     * These often indicate architectural issues worth investigating.
     */
    onDeepImport: (entry) => {
      const depth = entry.request.split('../').length - 1;
      if (entry.type === 'RELATIVE' && depth > DEBUG_CONFIG.deepImportThreshold) {
        console.warn(`⚠️  Deep import warning (depth ${depth}): ${entry.request}`);
        return true;
      }
      return false;
    }
  };
}

// ============================================================================
// Statistics and Analysis
// ============================================================================

/**
 * Calculates comprehensive statistics about import patterns.
 * This helps identify common issues and optimization opportunities.
 */
function calculateStatistics() {
  const stats = {
    total: resolutionLog.length,
    byType: {},
    errors: [],
    warnings: [],
    pathAliases: {
      total: 0,
      successful: 0,
      failed: 0
    }
  };

  resolutionLog.forEach(entry => {
    // Count imports by type
    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

    // Track failed resolutions
    if (!entry.success) {
      stats.errors.push(entry);
    }

    // Detect problematic patterns
    const depth = entry.request.split('../').length - 1;
    if (entry.type === 'RELATIVE' && depth > DEBUG_CONFIG.deepImportThreshold) {
      stats.warnings.push({
        ...entry,
        warning: `Deep relative import detected (depth ${depth})`
      });
    }

    // Track path alias success rates
    if (entry.type === 'PATH_ALIAS') {
      stats.pathAliases.total++;
      if (entry.success) {
        stats.pathAliases.successful++;
      } else {
        stats.pathAliases.failed++;
      }
    }
  });

  return stats;
}

/**
 * Validates that all configured path mappings point to existing directories or files.
 * This catches configuration errors before they cause runtime issues.
 */
function validatePathMappings() {
  const issues = [];
  
  Object.entries(PATH_MAPPINGS).forEach(([alias, mapping]) => {
    const fullPath = path.resolve(projectRoot, mapping.replace('./', ''));
    
    if (!fs.existsSync(fullPath)) {
      issues.push({
        alias,
        mapping,
        issue: 'Path does not exist',
        fullPath
      });
    }
  });
  
  return issues;
}

// ============================================================================
// Global API
// ============================================================================

/**
 * Exposes monitoring functions globally for use in debugging sessions.
 * Access these functions via global.importResolutionMonitor in your code or console.
 */
global.importResolutionMonitor = {
  /**
   * Returns the complete log of all import resolutions.
   */
  getLog: () => [...resolutionLog],

  /**
   * Returns the debug-level logs (only populated in debug mode).
   */
  getDebugLog: () => [...debugResolutionLog],

  /**
   * Returns comprehensive statistics about import patterns and issues.
   */
  getStats: calculateStatistics,

  /**
   * Clears all logs and log files for a fresh start.
   */
  clearLog: () => {
    resolutionLog.length = 0;
    debugResolutionLog.length = 0;
    Object.values(LOG_FILES).forEach(logPath => {
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }
    });
  },

  /**
   * Returns a copy of the current path mappings configuration.
   */
  getPathMappings: () => ({ ...PATH_MAPPINGS }),

  /**
   * Updates a path mapping at runtime for testing different configurations.
   */
  updatePathMapping: (alias, newPath) => {
    PATH_MAPPINGS[alias] = newPath;
    console.log(`🔄 Updated path mapping: ${alias} -> ${newPath}`);
  },

  /**
   * Validates all path mappings and returns any configuration issues found.
   */
  validateMappings: validatePathMappings
};

// ============================================================================
// Startup and Periodic Reporting
// ============================================================================

/**
 * Initializes the monitoring system and reports startup status.
 */
function startup() {
  initializeLogFiles();
  setupVSCodeIntegration();

  console.log('📊 Import Resolution Monitor active');
  console.log('📝 Logs will be written to:', path.relative(process.cwd(), LOG_FILES.main));
  
  if (DEBUG_CONFIG.enabled) {
    console.log('🐛 Debug mode enabled - enhanced logging active');
    console.log('📋 Debug logs:', path.relative(process.cwd(), LOG_FILES.debug));
  }
  
  console.log('💡 Use global.importResolutionMonitor to access monitoring data\n');

  // Validate configuration on startup
  const mappingIssues = validatePathMappings();
  if (mappingIssues.length > 0) {
    console.warn('⚠️  Path mapping validation found issues:');
    mappingIssues.forEach(issue => {
      console.warn(`   ${issue.alias}: ${issue.issue} (${issue.fullPath})`);
    });
  }
}

/**
 * Sets up periodic statistics reporting in debug mode.
 * This provides ongoing visibility into import patterns during long-running sessions.
 */
function setupPeriodicReporting() {
  if (!DEBUG_CONFIG.enabled) return;

  setInterval(() => {
    const stats = calculateStatistics();
    console.log(
      `📊 Import stats: ${stats.total} total, ` +
      `${stats.errors.length} errors, ` +
      `${stats.warnings.length} warnings`
    );
  }, DEBUG_CONFIG.statsInterval);
}

// Start the monitor
startup();
setupPeriodicReporting();