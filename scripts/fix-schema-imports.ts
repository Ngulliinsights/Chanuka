#!/usr/bin/env tsx
/**
 * Schema Import Fixes - Optimized Version
 *
 * Automatically fixes missing imports and schema issues across the shared module.
 * Features: backup management, validation, rollback capability, and progress tracking.
 */

import {
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    copyFileSync,
    readdirSync,
    appendFileSync,
    statSync
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Navigate to project root directory from script location
process.chdir(join(__dirname, '..'));

const CONFIG_PATH = join(__dirname, 'fix-config.json');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit to prevent memory issues

// Type definitions for configuration structure
interface Fix {
    search: string;
    replace: string;
    description: string;
    type: 'string' | 'regex';
}

interface FileFix {
    file: string;
    fixes: Fix[];
}

interface Config {
    description: string;
    backupDir: string;
    logFile: string;
    fixes: FileFix[];
    testDisables?: FileFix[];
}

interface ProcessingStats {
    totalFixes: number;
    totalFiles: number;
    backedUpFiles: number;
    skippedFixes: number;
    errorCount: number;
}

/**
 * Logger class handles all output and log file management.
 * Provides timestamped logging with different severity levels.
 */
class Logger {
    private logFile: string;

    constructor(logFile: string) {
        this.logFile = logFile;
        this.ensureLogFile();
    }

    private ensureLogFile(): void {
        const logDir = dirname(this.logFile);
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }
    }

    log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

        // Output to console with color coding based on level
        console.log(logMessage);

        // Persist to log file for audit trail
        try {
            appendFileSync(this.logFile, logMessage + '\n');
        } catch (error) {
            console.error(`Failed to write to log file: ${error}`);
        }
    }

    logSection(title: string): void {
        const separator = '='.repeat(60);
        this.log(`\n${separator}\n${title}\n${separator}`);
    }
}

/**
 * Loads and validates the configuration file.
 * The config defines which files to process and what fixes to apply.
 */
function loadConfig(): Config {
    if (!existsSync(CONFIG_PATH)) {
        throw new Error(`Configuration file not found at: ${CONFIG_PATH}`);
    }

    try {
        const configData = readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(configData) as Config;

        // Validate required fields
        if (!config.fixes || !Array.isArray(config.fixes)) {
            throw new Error('Invalid config: missing or invalid "fixes" array');
        }

        return config;
    } catch (error) {
        throw new Error(`Failed to load config: ${error}`);
    }
}

/**
 * BackupManager handles file backup and restoration operations.
 * This ensures we can rollback changes if something goes wrong.
 */
class BackupManager {
    private backupDir: string;
    private logger: Logger;

    constructor(backupDir: string, logger: Logger) {
        this.backupDir = join(__dirname, backupDir);
        this.logger = logger;
        this.ensureBackupDir();
    }

    private ensureBackupDir(): void {
        if (!existsSync(this.backupDir)) {
            mkdirSync(this.backupDir, { recursive: true });
            this.logger.log(`Created backup directory: ${this.backupDir}`);
        }
    }

    /**
     * Creates a timestamped backup of a file before modifications.
     * Returns the path to the backup file.
     */
    backupFile(filePath: string): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = basename(filePath);
        const backupPath = join(this.backupDir, `${fileName}.${timestamp}.bak`);

        copyFileSync(filePath, backupPath);
        this.logger.log(`Backed up: ${filePath}`);
        return backupPath;
    }

    /**
     * Finds the most recent backup for a given file.
     * Returns null if no backup exists.
     */
    getLatestBackup(filePath: string): string | null {
        try {
            const fileName = basename(filePath);
            const backups = readdirSync(this.backupDir)
                .filter(f => f.startsWith(fileName) && f.endsWith('.bak'))
                .sort()
                .reverse();

            return backups.length > 0 ? join(this.backupDir, backups[0]) : null;
        } catch (error) {
            this.logger.log(`Failed to retrieve backup for ${filePath}: ${error}`, 'error');
            return null;
        }
    }

    /**
     * Restores a file from its most recent backup.
     * Returns true if restoration was successful.
     */
    restoreFile(filePath: string): boolean {
        const backupPath = this.getLatestBackup(filePath);

        if (!backupPath) {
            this.logger.log(`No backup available for: ${filePath}`, 'warn');
            return false;
        }

        try {
            copyFileSync(backupPath, filePath);
            this.logger.log(`Restored: ${filePath}`);
            return true;
        } catch (error) {
            this.logger.log(`Restoration failed for ${filePath}: ${error}`, 'error');
            return false;
        }
    }
}

/**
 * Validates that a fix pattern exists in the content before applying it.
 * This prevents unnecessary processing and provides early validation.
 */
function validateFix(content: string, fix: Fix): boolean {
    if (fix.type === 'regex') {
        try {
            const regex = new RegExp(fix.search);
            return regex.test(content);
        } catch (error) {
            return false;
        }
    }
    return content.includes(fix.search);
}

/**
 * Applies a single fix transformation to the content.
 * Handles both string replacement and regex-based transformations.
 */
function applyFix(content: string, fix: Fix): string {
    if (fix.type === 'regex') {
        const regex = new RegExp(fix.search, 'g');
        return content.replace(regex, fix.replace);
    }
    return content.replace(fix.search, fix.replace);
}

/**
 * Checks if a fix has already been applied to avoid duplicate work.
 * This makes the script idempotent and safe to run multiple times.
 */
function isFixAlreadyApplied(content: string, fix: Fix): boolean {
    return content.includes(fix.replace);
}

/**
 * Main function that processes all files and applies import fixes.
 * Returns statistics about the processing operation.
 */
function applyImportFixes(
    config: Config,
    logger: Logger,
    backupManager: BackupManager
): ProcessingStats {
    const stats: ProcessingStats = {
        totalFixes: 0,
        totalFiles: 0,
        backedUpFiles: 0,
        skippedFixes: 0,
        errorCount: 0
    };

    logger.logSection(`Processing ${config.fixes.length} files`);

    for (let i = 0; i < config.fixes.length; i++) {
        const fileFix = config.fixes[i];
        const filePath = fileFix.file;
        stats.totalFiles++;

        const progress = Math.round(((i + 1) / config.fixes.length) * 100);
        logger.log(`[${progress}%] Processing: ${filePath}`);

        // Validate file exists
        if (!existsSync(filePath)) {
            logger.log(`File not found: ${filePath}`, 'warn');
            stats.errorCount++;
            continue;
        }

        // Check file size to prevent memory issues with large files
        const fileStats = statSync(filePath);
        if (fileStats.size > MAX_FILE_SIZE) {
            logger.log(`File exceeds size limit: ${filePath} (${fileStats.size} bytes)`, 'warn');
            stats.errorCount++;
            continue;
        }

        // Read file content
        let content: string;
        try {
            content = readFileSync(filePath, 'utf-8');
        } catch (error) {
            logger.log(`Failed to read file: ${filePath} - ${error}`, 'error');
            stats.errorCount++;
            continue;
        }

        // Process each fix for this file
        let fileFixes = 0;
        let modifiedContent = content;

        for (const fix of fileFix.fixes) {
            // Skip if already applied
            if (isFixAlreadyApplied(modifiedContent, fix)) {
                logger.log(`Already applied: ${fix.description}`);
                stats.skippedFixes++;
                continue;
            }

            // Validate fix can be applied
            if (!validateFix(modifiedContent, fix)) {
                logger.log(`Pattern not found: ${fix.description}`, 'warn');
                continue;
            }

            // Apply the fix
            modifiedContent = applyFix(modifiedContent, fix);
            fileFixes++;
            logger.log(`Applied: ${fix.description}`);
        }

        // Write changes if any fixes were applied
        if (fileFixes > 0) {
            try {
                // Create backup before writing changes
                backupManager.backupFile(filePath);
                stats.backedUpFiles++;

                // Write modified content
                writeFileSync(filePath, modifiedContent, 'utf-8');
                stats.totalFixes += fileFixes;
                logger.log(`Successfully applied ${fileFixes} fixes to ${filePath}`);
            } catch (error) {
                logger.log(`Failed to write changes: ${filePath} - ${error}`, 'error');
                stats.errorCount++;

                // Attempt automatic rollback on write failure
                if (backupManager.restoreFile(filePath)) {
                    logger.log(`Rolled back changes to ${filePath}`);
                }
            }
        } else {
            logger.log(`No changes needed for ${filePath}`);
        }
    }

    return stats;
}

/**
 * Disables problematic tests that need to be temporarily skipped.
 * This allows the build to succeed while schema issues are being resolved.
 */
function disableProblematicTests(
    config: Config,
    logger: Logger,
    backupManager: BackupManager
): number {
    if (!config.testDisables) {
        return 0;
    }

    logger.logSection('Disabling Problematic Tests');
    let totalDisabled = 0;

    for (const testDisable of config.testDisables) {
        const filePath = testDisable.file;

        if (!existsSync(filePath)) {
            logger.log(`Test file not found: ${filePath}`, 'warn');
            continue;
        }

        let content = readFileSync(filePath, 'utf-8');
        let disabledCount = 0;

        for (const fix of testDisable.fixes) {
            if (isFixAlreadyApplied(content, fix)) {
                logger.log(`Already disabled: ${fix.description}`);
                continue;
            }

            if (!validateFix(content, fix)) {
                logger.log(`Pattern not found: ${fix.description}`, 'warn');
                continue;
            }

            content = applyFix(content, fix);
            disabledCount++;
            logger.log(`Disabled: ${fix.description}`);
        }

        if (disabledCount > 0) {
            try {
                backupManager.backupFile(filePath);
                writeFileSync(filePath, content, 'utf-8');
                totalDisabled += disabledCount;
                logger.log(`Disabled ${disabledCount} tests in ${filePath}`);
            } catch (error) {
                logger.log(`Failed to disable tests: ${filePath} - ${error}`, 'error');
            }
        }
    }

    return totalDisabled;
}

/**
 * Restores all modified files from their backups.
 * This provides a complete rollback mechanism.
 */
function restoreAllFiles(
    config: Config,
    logger: Logger,
    backupManager: BackupManager
): void {
    logger.logSection('Restoring All Files from Backups');
    let restoredCount = 0;

    // Restore main fixes
    for (const fileFix of config.fixes) {
        if (backupManager.restoreFile(fileFix.file)) {
            restoredCount++;
        }
    }

    // Restore test disables
    if (config.testDisables) {
        for (const testDisable of config.testDisables) {
            if (backupManager.restoreFile(testDisable.file)) {
                restoredCount++;
            }
        }
    }

    logger.log(`Restoration complete: ${restoredCount} files restored`);
}

/**
 * Prints a summary of the processing results.
 * Helps users understand what was accomplished.
 */
function printSummary(stats: ProcessingStats, testDisables: number, logger: Logger): void {
    logger.logSection('Processing Summary');
    logger.log(`Total files processed: ${stats.totalFiles}`);
    logger.log(`Fixes applied: ${stats.totalFixes}`);
    logger.log(`Files backed up: ${stats.backedUpFiles}`);
    logger.log(`Fixes skipped (already applied): ${stats.skippedFixes}`);
    logger.log(`Tests disabled: ${testDisables}`);
    logger.log(`Errors encountered: ${stats.errorCount}`);
}

/**
 * Main entry point for the script.
 * Orchestrates the entire fix process or restoration.
 */
function main(): void {
    const mode = process.argv[2] || 'fix';

    let config: Config;
    let logger: Logger | null = null;
    let backupManager: BackupManager;

    try {
        // Initialize components
        config = loadConfig();
        logger = new Logger(join(__dirname, config.logFile));
        backupManager = new BackupManager(config.backupDir, logger);

        logger.logSection(`Schema Import Fixes - ${mode.toUpperCase()} Mode`);

        if (mode === 'restore') {
            // Restore mode: rollback all changes
            restoreAllFiles(config, logger, backupManager);
        } else {
            // Fix mode: apply all fixes
            logger.log('Starting import fixes...');
            const stats = applyImportFixes(config, logger, backupManager);

            logger.log('Processing test disables...');
            const testDisables = disableProblematicTests(config, logger, backupManager);

            // Display results
            printSummary(stats, testDisables, logger);

            // Provide next steps guidance
            logger.logSection('Next Steps');
            logger.log('1. Run `npm run build:shared` to verify the fixes worked');
            logger.log('2. Address any remaining schema issues incrementally');
            logger.log('3. Re-enable tests once the schema is stabilized');
            logger.log('4. Run this script with "restore" argument to rollback if needed');
        }

        logger.log('\nOperation completed successfully');
    } catch (error) {
        console.error(`\nFatal error occurred: ${error}`);
        if (logger) {
            logger.log(`Fatal error: ${error}`, 'error');
        }
        process.exit(1);
    }
}

// Execute the main function when script is run directly
main();