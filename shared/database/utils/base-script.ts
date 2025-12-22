/**
 * Base Database Script
 * 
 * Provides a unified foundation for all database operational scripts,
 * ensuring consistent error handling, logging, configuration, and
 * connection management across the platform.
 */

import { DatabaseOrchestrator } from '../core/database-orchestrator';
import { DatabaseConfigManager } from '../core/unified-config';
import { logger, LoggerChild } from '../../core/src/observability/logging';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ScriptOptions {
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
  timeout?: number;
  environment?: string;
}

export interface ScriptResult {
  success: boolean;
  message: string;
  details?: any;
  duration: number;
  warnings?: string[];
  errors?: string[];
}

export interface ScriptContext {
  orchestrator: DatabaseOrchestrator;
  config: DatabaseConfigManager;
  logger: DatabaseScriptLogger;
  options: ScriptOptions;
  startTime: Date;
}

// ============================================================================
// Enhanced Script Logger
// ============================================================================

export class DatabaseScriptLogger {
  private logger: LoggerChild;
  private _scriptName: string = '';
  private verbose: boolean;

  constructor(scriptName: string, verbose = false) {
    this._scriptName = scriptName;
    this.verbose = verbose;
    this.logger = logger.child({ scriptName });
  }

  /**
   * Log script start
   */
  logStart(message: string, details?: unknown): void {
    this.logger.info(`🚀 ${message}`, details);
  }

  /**
   * Log successful operation
   */
  logSuccess(message: string, details?: unknown): void {
    this.logger.info(`✅ ${message}`, details);
  }

  /**
   * Log operation in progress
   */
  logOperation(message: string, details?: unknown): void {
    this.logger.info(`🔧 ${message}`, details);
  }

  /**
   * Log warning
   */
  logWarning(message: string, details?: unknown): void {
    this.logger.warn(`⚠️ ${message}`, details);
  }

  /**
   * Log error
   */
  logError(message: string, error?: Error | any): void {
    this.logger.error(`❌ ${message}`, { error });
  }

  /**
   * Log completion
   */
  logComplete(message: string, duration: number, details?: unknown): void {
    this.logger.info(`🏁 ${message} (${duration}ms)`, details);
  }

  /**
   * Log verbose information (only if verbose mode is enabled)
   */
  logVerbose(message: string, details?: unknown): void {
    if (this.verbose) {
      this.logger.debug(`🔍 ${message}`, details);
    }
  }

  /**
   * Log dry run information
   */
  logDryRun(message: string, details?: unknown): void {
    this.logger.info(`🧪 [DRY RUN] ${message}`, details);
  }

  /**
   * Create a progress logger for long-running operations
   */
  createProgressLogger(total: number, operation: string) {
    let current = 0;
    return {
      increment: (message?: string) => {
        current++;
        const percentage = Math.round((current / total) * 100);
        this.logOperation(`${operation} progress: ${current}/${total} (${percentage}%)${message ? ` - ${message}` : ''}`);
      },
      complete: () => {
        this.logSuccess(`${operation} completed: ${current}/${total} items processed`);
      }
    };
  }
}

// ============================================================================
// Base Script Class
// ============================================================================

export abstract class BaseDatabaseScript {
  protected scriptName: string;
  protected description: string;
  protected context: ScriptContext | null = null;

  constructor(scriptName: string, description: string) {
    this.scriptName = scriptName;
    this.description = description;
  }

  /**
   * Abstract method that must be implemented by subclasses
   */
  abstract execute(context: ScriptContext): Promise<ScriptResult>;

  /**
   * Optional method for script-specific argument parsing
   */
  protected parseArguments(args: string[]): ScriptOptions {
    const options: ScriptOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--dry-run':
          options.dryRun = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--force':
        case '-f':
          options.force = true;
          break;
        case '--timeout':
          const timeoutArg = args[++i];
          if (timeoutArg === undefined) {
            console.log('DEBUG: args[++i] is undefined for --timeout');
          }
          options.timeout = parseInt(timeoutArg || '300000');
          break;
        case '--environment':
        case '--env':
          const envArg = args[++i];
          if (envArg === undefined) {
            console.log('DEBUG: args[++i] is undefined for --environment');
          }
          if (envArg !== undefined) options.environment = envArg;
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
      }
    }

    return options;
  }

  /**
   * Show help information for the script
   */
  protected showHelp(): void {
    console.log(`
${this.scriptName} - ${this.description}

Usage: npm run ${this.scriptName} [options]

Options:
  --dry-run              Show what would be done without executing
  --verbose, -v          Enable verbose logging
  --force, -f            Skip confirmation prompts
  --timeout <ms>         Set operation timeout (default: 300000ms)
  --environment <env>    Set environment (development, staging, production)
  --help, -h             Show this help message

Examples:
  npm run ${this.scriptName}                    # Run with default options
  npm run ${this.scriptName} -- --dry-run      # Preview changes
  npm run ${this.scriptName} -- --verbose      # Enable detailed logging
  npm run ${this.scriptName} -- --force        # Skip confirmations
    `);
  }

  /**
   * Main entry point for running the script
   */
  async run(args: string[] = []): Promise<ScriptResult> {
    const startTime = new Date();
    let result: ScriptResult;

    try {
      // Parse command line arguments
      const options = this.parseArguments(args);
      
      // Initialize logger
      const logger = new DatabaseScriptLogger(this.scriptName, options.verbose);
      
      logger.logStart(`Starting ${this.scriptName}`, { 
        description: this.description,
        options,
        environment: options.environment || process.env.NODE_ENV || 'development'
      });

      // Initialize configuration
      const config = DatabaseConfigManager.getInstance();
      if (!config['config']) {
        logger.logOperation('Loading database configuration');
        config.loadFromEnvironment();
      }

      // Override environment if specified
      if (options.environment) {
        config.initialize(config['config']!, options.environment);
      }

      // Show configuration info
      logger.logVerbose('Configuration loaded', {
        environment: config.getCurrentEnvironment(),
        features: config['config']?.features,
      });

      // Initialize orchestrator
      logger.logOperation('Initializing database orchestrator');
      const orchestrator = new DatabaseOrchestrator({
        autoInitialize: true,
        enableHealthMonitoring: true,
        gracefulShutdownTimeout: options.timeout || 30000,
      });

      await orchestrator.initialize();

      // Create script context
      this.context = {
        orchestrator,
        config,
        logger,
        options,
        startTime,
      };

      // Show dry run warning if applicable
      if (options.dryRun) {
        logger.logDryRun('Running in dry-run mode - no changes will be made');
      }

      // Execute the script
      logger.logOperation('Executing script logic');
      result = await this.executeWithTimeout(options.timeout || 300000);

      // Log completion
      const duration = Date.now() - startTime.getTime();
      logger.logComplete(
        result.success ? 'Script completed successfully' : 'Script completed with errors',
        duration,
        { result }
      );

    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      result = {
        success: false,
        message: `Script failed: ${errorMessage}`,
        duration,
        errors: [errorMessage],
      };

      if (this.context?.logger) {
        this.context.logger.logError('Script execution failed', error);
      } else {
        console.error(`❌ Script execution failed: ${errorMessage}`);
      }
    } finally {
      // Cleanup
      await this.cleanup();
    }

    return result;
  }

  /**
   * Execute the script with timeout protection
   */
  private async executeWithTimeout(timeoutMs: number): Promise<ScriptResult> {
    if (!this.context) {
      throw new Error('Script context not initialized');
    }

    return Promise.race([
      this.execute(this.context),
      new Promise<ScriptResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Script timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.context?.orchestrator) {
      try {
        this.context.logger.logOperation('Shutting down database orchestrator');
        await this.context.orchestrator.shutdown();
        this.context.logger.logSuccess('Database orchestrator shutdown complete');
      } catch (error) {
        this.context.logger.logError('Error during orchestrator shutdown', error);
      }
    }
    
    this.context = null;
  }

  /**
   * Utility method for confirmation prompts
   */
  protected async confirmAction(message: string, force = false): Promise<boolean> {
    if (force || this.context?.options.force) {
      this.context?.logger.logVerbose(`Skipping confirmation (force mode): ${message}`);
      return true;
    }

    // In a real implementation, you might use a library like 'inquirer' for interactive prompts
    // For now, we'll just log the confirmation and return true
    this.context?.logger.logWarning(`Confirmation required: ${message}`);
    this.context?.logger.logWarning('Use --force to skip confirmations');
    
    // For automated environments, default to false
    if (process.env.CI || process.env.NODE_ENV === 'production') {
      return false;
    }
    
    return true;
  }

  /**
   * Utility method for creating progress indicators
   */
  protected createProgressIndicator(total: number, operation: string) {
    return this.context?.logger.createProgressLogger(total, operation);
  }

  /**
   * Utility method for measuring operation duration
   */
  protected async measureOperation<T>(
    operation: string,
    callback: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    this.context?.logger.logOperation(`Starting ${operation}`);
    
    try {
      const result = await callback();
      const duration = Date.now() - startTime;
      this.context?.logger.logSuccess(`${operation} completed`, { duration });
      return { result, duration };
    } catch (error) {
      this.context?.logger.logError(`${operation} failed after ${Date.now() - startTime}ms`, error);
      throw error;
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create and run a database script
 */
export async function runDatabaseScript(
  script: BaseDatabaseScript,
  args: string[] = []
): Promise<ScriptResult> {
  return script.run(args);
}

/**
 * Create a simple script result
 */
export function createScriptResult(
  success: boolean,
  message: string,
  duration: number,
  details?: any
): ScriptResult {
  return {
    success,
    message,
    duration,
    details,
  };
}


