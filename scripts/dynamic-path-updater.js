#!/usr/bin/env node

/**
 * Dynamic Path Mapping Updater for VS Code Debugging
 *
 * This intelligent tool monitors your project structure during development and debugging
 * sessions, automatically updating TypeScript path mappings to ensure seamless import
 * resolution. It eliminates the frustration of "cannot find module" errors by keeping
 * your tsconfig.json and VS Code debugging configuration synchronized with your actual
 * project structure.
 *
 * Key Features:
 * - Real-time monitoring of file system changes across your project
 * - Automatic synchronization of TypeScript path mappings
 * - VS Code launch configuration updates for proper debugging
 * - Intelligent debouncing to prevent excessive file system writes
 * - Validation of path mappings to catch configuration issues early
 * - Multiple operation modes: continuous, one-time, and validate-only
 *
 * Usage:
 *   npm run update-paths              # Continuous monitoring mode
 *   npm run update-paths -- --once    # Single update and exit
 *   npm run update-paths -- --validate # Validate current mappings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================================
// Module Setup and Path Resolution
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration Constants
// ============================================================================

const CONFIG = {
  // How long to wait after a file change before updating mappings (milliseconds)
  // This prevents rapid successive writes when multiple files change at once
  debounceDelay: 500,
  
  // How often to perform a full scan and update (milliseconds)
  // Even without file changes, we periodically verify mappings are correct
  periodicUpdateInterval: 30000,
  
  // Directories to monitor for changes that might affect path mappings
  watchedDirectories: [
    'client/src',
    'server',
    'shared',
    'scripts'
  ],
  
  // File extensions that might contain imports we care about
  relevantExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  
  // Standard path mapping patterns your project uses
  // Each entry maps an import alias to its corresponding directory
  pathMappingPatterns: [
    { alias: '@/*', path: 'client/src' },
    { alias: '@shared/*', path: 'shared' },
    { alias: '@server/*', path: 'server' },
    { alias: '@scripts/*', path: 'scripts' },
    { alias: '@client/*', path: 'client' }
  ]
};

// ============================================================================
// Main Dynamic Path Updater Class
// ============================================================================

class DynamicPathUpdater {
  constructor() {
    // Establish the project root directory for all path calculations
    this.projectRoot = path.resolve(__dirname, '..');
    
    // Locate the critical configuration files we'll be managing
    this.tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
    this.launchConfigPath = path.join(this.projectRoot, '.vscode', 'launch.json');
    
    // Track which directories we're actively watching to avoid duplicate watchers
    this.watchedPaths = new Set();
    
    // Store the current state of path mappings for comparison
    this.pathMappings = new Map();
    
    // Flag to track whether we're in an active debugging session
    this.isDebugging = false;
    
    // Timer references for cleanup
    this.updateInterval = null;
    this.updateTimeout = null;
  }

  // ==========================================================================
  // Initialization and Setup
  // ==========================================================================

  /**
   * Initializes the dynamic path updater system.
   * This is the entry point that sets up all monitoring and update mechanisms.
   * It loads existing configurations, establishes file watchers, and starts
   * the periodic update cycle that ensures your mappings stay current.
   */
  async initialize() {
    console.log('🔄 Initializing Dynamic Path Mapping Updater...');
    console.log(`📂 Project root: ${this.projectRoot}`);

    try {
      // First, load the current state from configuration files
      // This gives us a baseline to detect future changes
      await this.loadConfigurations();

      // Establish file system watchers on key directories
      // These provide real-time notifications when files change
      this.setupFileWatchers();

      // Start the periodic update cycle that runs even without file changes
      // This catches any issues that might slip through the watchers
      this.startPeriodicUpdates();

      // Perform an initial validation to catch any existing issues
      await this.validateMappings();

      console.log('✅ Dynamic Path Mapping Updater initialized successfully');
      console.log('📁 Monitoring directories for changes...');

    } catch (error) {
      console.error('❌ Failed to initialize Dynamic Path Mapping Updater:', error.message);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }

  /**
   * Loads current configurations from tsconfig.json and launch.json.
   * This establishes our baseline understanding of the current path mappings
   * so we can detect when changes are needed.
   */
  async loadConfigurations() {
    // Load TypeScript configuration if it exists
    if (fs.existsSync(this.tsconfigPath)) {
      try {
        const tsconfigContent = fs.readFileSync(this.tsconfigPath, 'utf8');
        const tsconfig = JSON.parse(tsconfigContent);
        
        // Extract the paths section from compiler options
        const paths = tsconfig.compilerOptions?.paths || {};
        this.pathMappings = new Map(Object.entries(paths));
        
        console.log(`📋 Loaded ${this.pathMappings.size} path mappings from tsconfig.json`);
      } catch (error) {
        console.warn('⚠️  Failed to parse tsconfig.json:', error.message);
        // Initialize with empty mappings rather than failing completely
        this.pathMappings = new Map();
      }
    } else {
      console.warn('⚠️  tsconfig.json not found, will create it if needed');
      this.pathMappings = new Map();
    }

    // Verify launch.json exists for debugging configuration
    if (fs.existsSync(this.launchConfigPath)) {
      console.log('📋 Found launch.json configuration');
    } else {
      console.warn('⚠️  launch.json not found, debugging features may be limited');
    }
  }

  // ==========================================================================
  // File System Monitoring
  // ==========================================================================

  /**
   * Establishes file system watchers on all configured directories.
   * These watchers provide real-time notifications when files are created,
   * modified, or deleted, allowing us to respond immediately to structural changes.
   */
  setupFileWatchers() {
    console.log('\n👀 Setting up file system watchers...');

    CONFIG.watchedDirectories.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      
      if (fs.existsSync(fullPath)) {
        this.watchDirectory(fullPath);
        console.log(`   ✓ Watching: ${dir}`);
      } else {
        console.log(`   ⊗ Skipping (not found): ${dir}`);
      }
    });

    console.log('');
  }

  /**
   * Sets up a recursive watcher on a specific directory.
   * This monitors all subdirectories and files, filtering for relevant file types.
   * We avoid duplicate watchers by tracking which paths are already being monitored.
   */
  watchDirectory(dirPath) {
    // Prevent duplicate watchers on the same directory
    if (this.watchedPaths.has(dirPath)) {
      return;
    }

    this.watchedPaths.add(dirPath);

    try {
      // The recursive option ensures we catch changes in subdirectories too
      fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
        // Only process changes to files we care about
        if (filename && this.isRelevantFile(filename)) {
          this.handleFileChange(eventType, path.join(dirPath, filename));
        }
      });
    } catch (error) {
      console.warn(`⚠️  Failed to watch directory ${dirPath}:`, error.message);
      // Remove from tracked paths since the watcher failed
      this.watchedPaths.delete(dirPath);
    }
  }

  /**
   * Determines whether a file is relevant to import resolution.
   * This filters out temporary files, build artifacts, and other noise
   * that shouldn't trigger path mapping updates.
   */
  isRelevantFile(filename) {
    // Check if the file extension is one we care about
    const hasRelevantExtension = CONFIG.relevantExtensions.some(ext => 
      filename.endsWith(ext)
    );

    // Exclude common patterns that shouldn't trigger updates
    const isExcluded = filename.includes('node_modules') ||
                       filename.includes('.git') ||
                       filename.includes('dist') ||
                       filename.includes('build') ||
                       filename.endsWith('.test.ts') ||
                       filename.endsWith('.test.tsx');

    return hasRelevantExtension && !isExcluded;
  }

  /**
   * Handles a file system change event.
   * This implements intelligent debouncing to avoid excessive updates
   * when multiple files change in rapid succession (like during a git operation).
   */
  handleFileChange(eventType, filePath) {
    const relativePath = path.relative(this.projectRoot, filePath);
    console.log(`📝 File ${eventType}: ${relativePath}`);

    // Clear any pending update to reset the debounce timer
    clearTimeout(this.updateTimeout);
    
    // Schedule an update after the debounce delay
    // This means we'll wait for file changes to "settle" before updating
    this.updateTimeout = setTimeout(() => {
      this.updatePathMappings();
    }, CONFIG.debounceDelay);
  }

  // ==========================================================================
  // Path Mapping Updates
  // ==========================================================================

  /**
   * Performs a complete update of path mappings.
   * This scans the current project structure, determines what mappings should exist,
   * compares them with the current state, and applies changes if needed.
   */
  async updatePathMappings() {
    console.log('\n🔄 Updating path mappings...');

    try {
      // Scan the file system to determine what mappings should exist
      const newMappings = await this.scanProjectStructure();

      // Compare with current mappings to detect changes
      const hasChanges = this.hasMappingsChanged(newMappings);

      if (hasChanges) {
        // Apply the new mappings to all configuration files
        await this.applyPathMappings(newMappings);
        console.log('✅ Path mappings updated successfully\n');
      } else {
        console.log('ℹ️  No changes detected in path mappings\n');
      }

    } catch (error) {
      console.error('❌ Failed to update path mappings:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Scans the project structure to determine required path mappings.
   * This intelligently discovers which directories exist and should have
   * corresponding path aliases in your TypeScript configuration.
   */
  async scanProjectStructure() {
    const mappings = new Map();

    console.log('🔍 Scanning project structure...');

    // Check each configured path pattern to see if it should exist
    for (const pattern of CONFIG.pathMappingPatterns) {
      const fullPath = path.join(this.projectRoot, pattern.path);
      
      if (fs.existsSync(fullPath)) {
        // The directory exists, so we need this mapping
        mappings.set(pattern.alias, [`${pattern.path}/*`]);
        console.log(`   ✓ Found: ${pattern.alias} → ${pattern.path}`);
      } else {
        console.log(`   ⊗ Missing: ${pattern.alias} (${pattern.path} not found)`);
      }
    }

    // Handle special cases like shared/core that need additional mappings
    await this.addSpecialCaseMappings(mappings);

    return mappings;
  }

  /**
   * Adds special case mappings that don't fit the standard pattern.
   * Some parts of your codebase may need multiple aliases or non-standard
   * path configurations. This method handles those edge cases.
   */
  async addSpecialCaseMappings(mappings) {
    // Check for shared/core which often needs both exact and wildcard mappings
    const sharedCorePath = path.join(this.projectRoot, 'shared', 'core');
    if (fs.existsSync(sharedCorePath)) {
      // Add exact match for imports like: import { x } from '@shared/core'
      mappings.set('@shared/core', ['shared/core/src/index.ts']);
      // Add wildcard for imports like: import { x } from '@shared/core/utils'
      mappings.set('@shared/core/*', ['shared/core/*']);
      console.log('   ✓ Found: @shared/core (with special mappings)');
    }

    // Check for database directory which might need a specific mapping
    const dbPath = path.join(this.projectRoot, 'db');
    if (fs.existsSync(dbPath)) {
      mappings.set('@db', ['db/index.ts']);
      console.log('   ✓ Found: @db');
    }
  }

  /**
   * Determines whether the path mappings have actually changed.
   * This prevents unnecessary file writes and rebuild triggers when
   * the structure hasn't actually changed.
   */
  hasMappingsChanged(newMappings) {
    // Quick check: different number of mappings means changes exist
    if (this.pathMappings.size !== newMappings.size) {
      return true;
    }

    // Detailed check: compare each mapping value
    for (const [key, value] of newMappings) {
      const currentValue = this.pathMappings.get(key);
      
      // Missing key or different value indicates a change
      if (!currentValue || JSON.stringify(currentValue) !== JSON.stringify(value)) {
        return true;
      }
    }

    // No differences found
    return false;
  }

  /**
   * Applies updated path mappings to all relevant configuration files.
   * This is the action phase where we actually modify tsconfig.json and launch.json
   * to reflect the current project structure.
   */
  async applyPathMappings(newMappings) {
    console.log('📝 Applying path mappings to configuration files...');
    
    // Update our internal state
    this.pathMappings = newMappings;

    // Update TypeScript configuration for compile-time resolution
    await this.updateTsconfigMappings(newMappings);

    // Update VS Code launch configuration for runtime debugging
    await this.updateLaunchConfigMappings(newMappings);

    // If we're in an active debugging session, notify VS Code
    if (this.isDebugging) {
      this.notifyVSCodeOfChanges();
    }
  }

  // ==========================================================================
  // Configuration File Updates
  // ==========================================================================

  /**
   * Updates tsconfig.json with the new path mappings.
   * This ensures TypeScript can resolve your imports correctly during
   * development and compilation.
   */
  async updateTsconfigMappings(mappings) {
    try {
      // Read the current configuration
      const tsconfigContent = fs.readFileSync(this.tsconfigPath, 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);

      // Ensure the structure exists
      tsconfig.compilerOptions = tsconfig.compilerOptions || {};
      
      // Update the paths section with our new mappings
      tsconfig.compilerOptions.paths = Object.fromEntries(mappings);

      // Write back with formatting that matches TypeScript conventions
      const updatedContent = JSON.stringify(tsconfig, null, 2) + '\n';
      fs.writeFileSync(this.tsconfigPath, updatedContent);
      
      console.log('   ✓ Updated tsconfig.json');
    } catch (error) {
      console.warn('   ⚠️  Failed to update tsconfig.json:', error.message);
    }
  }

  /**
   * Updates launch.json with source map path overrides.
   * This is crucial for debugging - it tells VS Code how to map your compiled
   * JavaScript back to the original TypeScript source files when using path aliases.
   */
  async updateLaunchConfigMappings(mappings) {
    // Skip if launch.json doesn't exist
    if (!fs.existsSync(this.launchConfigPath)) {
      console.log('   ⊗ Skipped launch.json (file not found)');
      return;
    }

    try {
      // Read the current launch configuration
      const launchConfigContent = fs.readFileSync(this.launchConfigPath, 'utf8');
      const launchConfig = JSON.parse(launchConfigContent);

      // Update each Node.js debug configuration
      launchConfig.configurations.forEach(config => {
        if (config.type === 'node' || config.type === 'pwa-node') {
          // Initialize the source map path overrides section
          config.sourceMapPathOverrides = config.sourceMapPathOverrides || {};

          // Add an override for each path mapping
          // This tells the debugger how to map compiled paths back to source
          for (const [alias, paths] of mappings) {
            const aliasBase = alias.replace('/*', '');
            const pathBase = paths[0].replace('/*', '');

            config.sourceMapPathOverrides[`${aliasBase}/*`] = `\${workspaceFolder}/${pathBase}/*`;
          }
        }
      });

      // Write back with proper formatting
      const updatedContent = JSON.stringify(launchConfig, null, 2) + '\n';
      fs.writeFileSync(this.launchConfigPath, updatedContent);
      
      console.log('   ✓ Updated launch.json');
    } catch (error) {
      console.warn('   ⚠️  Failed to update launch.json:', error.message);
    }
  }

  /**
   * Notifies VS Code of configuration changes.
   * While VS Code doesn't provide a direct notification API, we can log
   * changes in a way that's visible in the debug console and provide
   * useful information for developers.
   */
  notifyVSCodeOfChanges() {
    console.log('\n🔄 Configuration changes applied during debugging session');
    console.log('📋 Current path mappings:');
    
    for (const [alias, paths] of this.pathMappings) {
      console.log(`   ${alias} → ${paths.join(', ')}`);
    }
    
    console.log('\n💡 Tip: Restart your debugging session to apply these changes\n');
  }

  // ==========================================================================
  // Periodic Updates and Validation
  // ==========================================================================

  /**
   * Starts the periodic update cycle.
   * Even when file watchers don't detect changes, we periodically verify
   * that mappings are correct. This catches edge cases and provides resilience.
   */
  startPeriodicUpdates() {
    this.updateInterval = setInterval(() => {
      this.updatePathMappings();
    }, CONFIG.periodicUpdateInterval);

    const intervalSeconds = CONFIG.periodicUpdateInterval / 1000;
    console.log(`⏰ Started periodic path mapping updates (every ${intervalSeconds}s)`);
  }

  /**
   * Validates that all current path mappings point to existing locations.
   * This catches configuration errors before they cause runtime problems.
   */
  async validateMappings() {
    console.log('\n🔍 Validating path mappings...');

    const issues = [];

    // Check each mapping to ensure the target exists
    for (const [alias, paths] of this.pathMappings) {
      for (const mappingPath of paths) {
        // Remove wildcards and resolve to actual file system path
        const resolvedPath = mappingPath.replace('/*', '').replace('*', '');
        const fullPath = path.join(this.projectRoot, resolvedPath);

        // Check if the path exists on the file system
        if (!fs.existsSync(fullPath)) {
          issues.push({
            alias,
            mappingPath,
            fullPath,
            issue: 'Path does not exist'
          });
        }
      }
    }

    // Report findings
    if (issues.length > 0) {
      console.warn('⚠️  Path mapping validation found issues:');
      issues.forEach(issue => {
        console.warn(`   ${issue.alias} → ${issue.mappingPath}`);
        console.warn(`      ${issue.issue}: ${issue.fullPath}`);
      });
      console.log('');
    } else {
      console.log('✅ All path mappings are valid\n');
    }

    return issues;
  }

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Gracefully stops the dynamic path updater.
   * This cleans up timers and resources to ensure a clean shutdown.
   */
  stop() {
    console.log('\n🛑 Shutting down Dynamic Path Mapping Updater...');

    // Clear the periodic update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Clear any pending debounced update
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    console.log('✅ Shutdown complete');
  }

  /**
   * Updates the debugging state flag.
   * This allows the tool to behave differently during active debugging sessions,
   * such as providing more verbose output or notifications.
   */
  setDebuggingState(isDebugging) {
    this.isDebugging = isDebugging;
    const state = isDebugging ? 'active' : 'inactive';
    console.log(`🔧 Debugging state changed: ${state}`);
  }

  /**
   * Returns the current path mappings as a plain object.
   * This provides a simple way to inspect the current state.
   */
  getPathMappings() {
    return Object.fromEntries(this.pathMappings);
  }
}

// ============================================================================
// Command Line Interface
// ============================================================================

/**
 * Handles running the tool from the command line.
 * This provides different operational modes depending on command line arguments.
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new DynamicPathUpdater();

  // Set up graceful shutdown handlers
  // These ensure we clean up properly when the process is terminated
  process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal (Ctrl+C)...');
    updater.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received termination signal...');
    updater.stop();
    process.exit(0);
  });

  // Parse command line arguments to determine operation mode
  const args = process.argv.slice(2);
  
  if (args.includes('--validate')) {
    // Validation mode: check current mappings and exit
    updater.initialize().then(async () => {
      await updater.validateMappings();
      console.log('✅ Validation complete');
      updater.stop();
      process.exit(0);
    });
  } else if (args.includes('--once')) {
    // One-time mode: update mappings once and exit
    updater.initialize().then(() => {
      updater.updatePathMappings().then(() => {
        console.log('✅ One-time path mapping update completed');
        updater.stop();
        process.exit(0);
      });
    });
  } else {
    // Continuous mode: keep running and monitoring
    updater.initialize().then(() => {
      console.log('🔄 Dynamic Path Mapping Updater running in continuous mode');
      console.log('💡 Press Ctrl+C to stop\n');
    });
  }
}

export default DynamicPathUpdater;