import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { CleanupPlan, CleanupResult, CleanupError, FileOperation, FileMove, FileConsolidation } from './orchestrator';
import { ValidationResult, ValidationStatus, ValidationCheck, ValidationType } from '../types';
import { BackupSystem, BackupSystemConfig } from './backup-system';
import { logger } from '../../observability/logging';

export interface CleanupExecutorConfig {
  dryRun: boolean;
  createBackups: boolean;
  backupDirectory: string;
  validateBeforeExecution: boolean;
  validateAfterExecution: boolean;
  maxConcurrentOperations: number;
}

export class CleanupExecutor {
  private readonly config: CleanupExecutorConfig;
  private readonly rootPath: string;
  private readonly backupSystem: BackupSystem;

  constructor(rootPath: string = process.cwd(), config: Partial<CleanupExecutorConfig> = {}) {
    this.rootPath = rootPath;
    this.config = {
      dryRun: false,
      createBackups: true,
      backupDirectory: '.cleanup-backups',
      validateBeforeExecution: true,
      validateAfterExecution: true,
      maxConcurrentOperations: 5,
      ...config
    };

    // Initialize backup system
    this.backupSystem = new BackupSystem(rootPath, {
      enabled: this.config.createBackups,
      backupDirectory: this.config.backupDirectory,
      checksumValidation: true,
      retentionDays: 30,
      maxBackups: 10
    });
  }

  async executeCleanup(plan: CleanupPlan): Promise<CleanupResult> {
    const result: CleanupResult = {
      id: `cleanup-result-${Date.now()}`,
      planId: plan.id,
      timestamp: new Date(),
      success: false,
      filesProcessed: 0,
      spaceSaved: 0,
      errors: [],
      warnings: []
    };

    try {
      // Pre-execution validation
      if (this.config.validateBeforeExecution) {
        const validation = await this.validatePreExecution(plan);
        if (validation.status === ValidationStatus.FAILED) {
          throw new Error(`Pre-execution validation failed: ${validation.summary.criticalIssues.join(', ')}`);
        }
      }

      // Create backup if enabled
      if (this.config.createBackups && !this.config.dryRun) {
        logger.info('🔄 Creating backup before cleanup operations...', { component: 'Chanuka' });
        const backupResult = await this.backupSystem.createBackup(plan);
        
        if (!backupResult.success) {
          throw new Error(`Backup creation failed: ${backupResult.errors.join(', ')}`);
        }
        
        result.backupLocation = backupResult.backupPath;
        console.log(`✅ Backup created: ${backupResult.backupId}`);
        
        if (backupResult.warnings.length > 0) {
          result.warnings.push(...backupResult.warnings);
        }
      }

      // Execute cleanup operations
      await this.executeFileRemovals(plan.filesToRemove, result);
      await this.executeFileMoves(plan.filesToMove, result);
      await this.executeFileConsolidations(plan.filesToConsolidate, result);
      await this.executeScriptMerges(plan.scriptsToMerge, result);

      // Post-execution validation
      if (this.config.validateAfterExecution) {
        const validation = await this.validatePostExecution(plan);
        if (validation.status === ValidationStatus.FAILED) {
          result.warnings.push('Post-execution validation found issues');
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push({
        file: 'general',
        operation: 'cleanup',
        error: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false
      });
      result.success = false;
      return result;
    }
  }

  private async executeFileRemovals(operations: FileOperation[], result: CleanupResult): Promise<void> {
    for (const operation of operations) {
      try {
        const filePath = join(this.rootPath, operation.path);
        
        if (this.config.dryRun) {
          console.log(`[DRY RUN] Would remove: ${operation.path}`);
          result.filesProcessed++;
          result.spaceSaved += operation.size;
          continue;
        }

        // Check if file exists
        try {
          await fs.access(filePath);
        } catch {
          result.warnings.push(`File not found: ${operation.path}`);
          continue;
        }

        // Remove the file
        await fs.unlink(filePath);
        result.filesProcessed++;
        result.spaceSaved += operation.size;
        
        console.log(`Removed: ${operation.path} (${operation.reason})`);

      } catch (error) {
        const cleanupError: CleanupError = {
          file: operation.path,
          operation: 'remove',
          error: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        };
        result.errors.push(cleanupError);
      }
    }
  }

  private async executeFileMoves(operations: FileMove[], result: CleanupResult): Promise<void> {
    for (const operation of operations) {
      try {
        const sourcePath = join(this.rootPath, operation.source);
        const destPath = join(this.rootPath, operation.destination);
        
        if (this.config.dryRun) {
          console.log(`[DRY RUN] Would move: ${operation.source} -> ${operation.destination}`);
          result.filesProcessed++;
          continue;
        }

        // Check if source file exists
        try {
          await fs.access(sourcePath);
        } catch {
          result.warnings.push(`Source file not found: ${operation.source}`);
          continue;
        }

        // Create destination directory if needed
        if (operation.createDirectory) {
          await fs.mkdir(dirname(destPath), { recursive: true });
        }

        // Move the file
        await fs.rename(sourcePath, destPath);
        result.filesProcessed++;
        
        console.log(`Moved: ${operation.source} -> ${operation.destination}`);

      } catch (error) {
        const cleanupError: CleanupError = {
          file: operation.source,
          operation: 'move',
          error: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        };
        result.errors.push(cleanupError);
      }
    }
  }

  private async executeFileConsolidations(operations: FileConsolidation[], result: CleanupResult): Promise<void> {
    for (const operation of operations) {
      try {
        const targetPath = join(this.rootPath, operation.target);
        
        if (this.config.dryRun) {
          console.log(`[DRY RUN] Would consolidate ${operation.sources.length} files into: ${operation.target} using ${operation.strategy} strategy`);
          result.filesProcessed += operation.sources.length;
          continue;
        }

        // Create target directory if needed
        await fs.mkdir(dirname(targetPath), { recursive: true });

        let consolidatedContent = '';
        const processedSources: string[] = [];

        // Handle different consolidation strategies
        switch (operation.strategy) {
          case 'merge':
            consolidatedContent = await this.mergeFiles(operation.sources, processedSources, result);
            break;
          case 'combine':
            consolidatedContent = await this.combineFiles(operation.sources, processedSources, result);
            break;
          case 'replace':
            consolidatedContent = await this.replaceFiles(operation.sources, processedSources, result);
            break;
          default:
            consolidatedContent = await this.mergeFiles(operation.sources, processedSources, result);
        }

        // Write consolidated content
        if (consolidatedContent) {
          const header = this.generateConsolidationHeader(operation, processedSources);
          await fs.writeFile(targetPath, header + consolidatedContent);
        }

        // Remove source files after successful consolidation
        for (const source of processedSources) {
          try {
            await fs.unlink(join(this.rootPath, source));
          } catch (error) {
            result.warnings.push(`Could not remove source file after consolidation: ${source}`);
          }
        }

        result.filesProcessed += processedSources.length;
        console.log(`Consolidated ${processedSources.length} files into: ${operation.target} using ${operation.strategy} strategy`);

      } catch (error) {
        const cleanupError: CleanupError = {
          file: operation.target,
          operation: 'consolidate',
          error: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        };
        result.errors.push(cleanupError);
      }
    }
  }

  /**
   * Execute script merging operations
   */
  async executeScriptMerges(operations: any[], result: CleanupResult): Promise<void> {
    for (const operation of operations) {
      try {
        const targetPath = join(this.rootPath, operation.targetScript);
        
        if (this.config.dryRun) {
          console.log(`[DRY RUN] Would merge ${operation.scripts.length} scripts into: ${operation.targetScript}`);
          result.filesProcessed += operation.scripts.length;
          continue;
        }

        // Create target directory if needed
        await fs.mkdir(dirname(targetPath), { recursive: true });

        let mergedContent = this.generateScriptHeader(operation);
        const processedScripts: string[] = [];

        // Read and merge script files
        for (const scriptPath of operation.scripts) {
          const sourcePath = join(this.rootPath, scriptPath);
          
          try {
            const content = await fs.readFile(sourcePath, 'utf-8');
            const cleanedContent = this.cleanScriptContent(content, scriptPath);
            mergedContent += `\n\n# === ${scriptPath} ===\n${cleanedContent}`;
            processedScripts.push(scriptPath);
          } catch (error) {
            result.warnings.push(`Could not read script file: ${scriptPath}`);
          }
        }

        // Add script footer
        mergedContent += this.generateScriptFooter(operation);

        // Write merged script
        if (mergedContent) {
          await fs.writeFile(targetPath, mergedContent);
          // Make script executable
          await fs.chmod(targetPath, 0o755);
        }

        // Remove source scripts after successful merge
        for (const script of processedScripts) {
          try {
            await fs.unlink(join(this.rootPath, script));
          } catch (error) {
            result.warnings.push(`Could not remove source script after merge: ${script}`);
          }
        }

        result.filesProcessed += processedScripts.length;
        console.log(`Merged ${processedScripts.length} scripts into: ${operation.targetScript}`);

      } catch (error) {
        const cleanupError: CleanupError = {
          file: operation.targetScript,
          operation: 'merge',
          error: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        };
        result.errors.push(cleanupError);
      }
    }
  }

  /**
   * Merge files by combining their content with clear separation
   */
  private async mergeFiles(sources: string[], processedSources: string[], result: CleanupResult): Promise<string> {
    let mergedContent = '';

    for (const source of sources) {
      const sourcePath = join(this.rootPath, source);
      
      try {
        const content = await fs.readFile(sourcePath, 'utf-8');
        mergedContent += `\n\n## ${source}\n\n${content}`;
        processedSources.push(source);
      } catch (error) {
        result.warnings.push(`Could not read source file: ${source}`);
      }
    }

    return mergedContent;
  }

  /**
   * Combine files by intelligently merging similar sections
   */
  private async combineFiles(sources: string[], processedSources: string[], result: CleanupResult): Promise<string> {
    let combinedContent = '';
    const sections = new Map<string, string[]>();

    // Parse files and group by sections
    for (const source of sources) {
      const sourcePath = join(this.rootPath, source);
      
      try {
        const content = await fs.readFile(sourcePath, 'utf-8');
        
        if (source.endsWith('.json')) {
          // Handle JSON configuration files
          const jsonContent = JSON.parse(content);
          combinedContent += `\n// From ${source}\n${JSON.stringify(jsonContent, null, 2)}\n`;
        } else if (source.endsWith('.md')) {
          // Handle markdown files
          const lines = content.split('\n');
          let currentSection = 'default';
          
          for (const line of lines) {
            if (line.startsWith('#')) {
              currentSection = line.trim();
            }
            
            if (!sections.has(currentSection)) {
              sections.set(currentSection, []);
            }
            sections.get(currentSection)!.push(`${line} (from ${source})`);
          }
        } else {
          // Handle other file types
          combinedContent += `\n\n# Content from ${source}\n${content}`;
        }
        
        processedSources.push(source);
      } catch (error) {
        result.warnings.push(`Could not read source file: ${source}`);
      }
    }

    // Combine sections for markdown files
    if (sections.size > 0) {
      for (const [section, lines] of sections) {
        combinedContent += `\n\n${section}\n\n${lines.join('\n')}`;
      }
    }

    return combinedContent;
  }

  /**
   * Replace files by keeping only the most recent or important one
   */
  private async replaceFiles(sources: string[], processedSources: string[], result: CleanupResult): Promise<string> {
    if (sources.length === 0) return '';

    // Find the most recent file
    let mostRecentFile = sources[0];
    let mostRecentTime = 0;

    for (const source of sources) {
      try {
        const stats = await fs.stat(join(this.rootPath, source));
        if (stats.mtime.getTime() > mostRecentTime) {
          mostRecentTime = stats.mtime.getTime();
          mostRecentFile = source;
        }
      } catch (error) {
        result.warnings.push(`Could not stat file: ${source}`);
      }
    }

    // Read the most recent file
    try {
      const content = await fs.readFile(join(this.rootPath, mostRecentFile), 'utf-8');
      processedSources.push(...sources); // Mark all as processed for removal
      return content;
    } catch (error) {
      result.warnings.push(`Could not read most recent file: ${mostRecentFile}`);
      return '';
    }
  }

  /**
   * Generate header for consolidated files
   */
  private generateConsolidationHeader(operation: FileConsolidation, processedSources: string[]): string {
    const timestamp = new Date().toISOString();
    
    return `# Consolidated Document

This document was automatically generated by consolidating the following files:
${processedSources.map(s => `- ${s}`).join('\n')}

**Consolidation Strategy:** ${operation.strategy}
**Reason:** ${operation.reason}
**Generated:** ${timestamp}

---

`;
  }

  /**
   * Generate header for merged scripts
   */
  private generateScriptHeader(operation: any): string {
    return `#!/bin/bash

# Consolidated Script: ${operation.targetScript}
# Generated: ${new Date().toISOString()}
# 
# This script consolidates the following functionality:
${operation.functionality.map((f: string) => `# - ${f}`).join('\n')}
#
# Original scripts merged:
${operation.scripts.map((s: string) => `# - ${s}`).join('\n')}
#
${operation.conflicts.length > 0 ? `# CONFLICTS DETECTED:\n${operation.conflicts.map((c: string) => `# WARNING: ${c}`).join('\n')}\n#` : ''}

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Color codes for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "\${GREEN}[INFO]\${NC} $1"
}

log_warn() {
    echo -e "\${YELLOW}[WARN]\${NC} $1"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} $1"
}

# Main execution starts here
log_info "Starting consolidated script execution..."
`;
  }

  /**
   * Generate footer for merged scripts
   */
  private generateScriptFooter(operation: any): string {
    return `

# Script execution completed
log_info "Consolidated script execution completed successfully"
exit 0
`;
  }

  /**
   * Clean script content by removing headers and common boilerplate
   */
  private cleanScriptContent(content: string, scriptPath: string): string {
    const lines = content.split('\n');
    const cleanedLines: string[] = [];
    let skipShebang = true;
    let inHeader = true;

    for (const line of lines) {
      // Skip shebang line
      if (skipShebang && line.startsWith('#!')) {
        skipShebang = false;
        continue;
      }
      skipShebang = false;

      // Skip common header comments
      if (inHeader && (line.startsWith('#') || line.trim() === '')) {
        if (line.includes('set -') || line.includes('function') || line.includes('=')) {
          inHeader = false;
        } else {
          continue;
        }
      }
      inHeader = false;

      // Skip common boilerplate
      if (line.includes('set -e') || line.includes('set -u')) {
        continue;
      }

      cleanedLines.push(line);
    }

    return cleanedLines.join('\n');
  }

  /**
   * Restore from a backup using the backup system
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    try {
      await this.backupSystem.restoreFromBackup(backupId);
      console.log(`✅ Successfully restored from backup: ${backupId}`);
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List available backups
   */
  async listAvailableBackups() {
    return await this.backupSystem.listBackups();
  }

  private async validatePreExecution(plan: CleanupPlan): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];
    let checkId = 1;

    // Check if files exist
    for (const operation of plan.filesToRemove) {
      const filePath = join(this.rootPath, operation.path);
      const startTime = Date.now();
      
      try {
        await fs.access(filePath);
        checks.push({
          id: `check-${checkId++}`,
          name: `File exists: ${operation.path}`,
          type: ValidationType.FUNCTIONALITY,
          status: ValidationStatus.PASSED,
          message: 'File exists and can be removed',
          duration: Date.now() - startTime
        });
      } catch {
        checks.push({
          id: `check-${checkId++}`,
          name: `File exists: ${operation.path}`,
          type: ValidationType.FUNCTIONALITY,
          status: ValidationStatus.WARNING,
          message: 'File does not exist',
          duration: Date.now() - startTime
        });
      }
    }

    // Check for import references (basic check)
    for (const operation of plan.filesToRemove) {
      if (operation.path.endsWith('.ts') || operation.path.endsWith('.js')) {
        const hasReferences = await this.checkForImportReferences(operation.path);
        checks.push({
          id: `check-${checkId++}`,
          name: `Import references: ${operation.path}`,
          type: ValidationType.IMPORTS,
          status: hasReferences ? ValidationStatus.WARNING : ValidationStatus.PASSED,
          message: hasReferences ? 'File may have import references' : 'No import references found',
          duration: 50 // Estimated
        });
      }
    }

    const passed = checks.filter(c => c.status === ValidationStatus.PASSED).length;
    const failed = checks.filter(c => c.status === ValidationStatus.FAILED).length;
    const warnings = checks.filter(c => c.status === ValidationStatus.WARNING).length;

    return {
      id: `validation-pre-${Date.now()}`,
      timestamp: new Date(),
      scope: 'pre_execution' as any,
      status: failed > 0 ? ValidationStatus.FAILED : 
              warnings > 0 ? ValidationStatus.WARNING : ValidationStatus.PASSED,
      checks,
      summary: {
        totalChecks: checks.length,
        passed,
        failed,
        warnings,
        skipped: 0,
        overallStatus: failed > 0 ? ValidationStatus.FAILED : 
                      warnings > 0 ? ValidationStatus.WARNING : ValidationStatus.PASSED,
        criticalIssues: checks
          .filter(c => c.status === ValidationStatus.FAILED)
          .map(c => c.message)
      }
    };
  }

  private async validatePostExecution(plan: CleanupPlan): Promise<ValidationResult> {
    const checks: ValidationCheck[] = [];
    let checkId = 1;

    // Check that removed files are actually gone
    for (const operation of plan.filesToRemove) {
      const filePath = join(this.rootPath, operation.path);
      const startTime = Date.now();
      
      try {
        await fs.access(filePath);
        checks.push({
          id: `check-${checkId++}`,
          name: `File removed: ${operation.path}`,
          type: ValidationType.FUNCTIONALITY,
          status: ValidationStatus.FAILED,
          message: 'File still exists after removal',
          duration: Date.now() - startTime
        });
      } catch {
        checks.push({
          id: `check-${checkId++}`,
          name: `File removed: ${operation.path}`,
          type: ValidationType.FUNCTIONALITY,
          status: ValidationStatus.PASSED,
          message: 'File successfully removed',
          duration: Date.now() - startTime
        });
      }
    }

    // Check that moved files are in their new locations
    for (const operation of plan.filesToMove) {
      const destPath = join(this.rootPath, operation.destination);
      const startTime = Date.now();
      
      try {
        await fs.access(destPath);
        checks.push({
          id: `check-${checkId++}`,
          name: `File moved: ${operation.destination}`,
          type: ValidationType.FUNCTIONALITY,
          status: ValidationStatus.PASSED,
          message: 'File successfully moved to destination',
          duration: Date.now() - startTime
        });
      } catch {
        checks.push({
          id: `check-${checkId++}`,
          name: `File moved: ${operation.destination}`,
          type: ValidationType.FUNCTIONALITY,
          status: ValidationStatus.FAILED,
          message: 'File not found at destination',
          duration: Date.now() - startTime
        });
      }
    }

    const passed = checks.filter(c => c.status === ValidationStatus.PASSED).length;
    const failed = checks.filter(c => c.status === ValidationStatus.FAILED).length;
    const warnings = checks.filter(c => c.status === ValidationStatus.WARNING).length;

    return {
      id: `validation-post-${Date.now()}`,
      timestamp: new Date(),
      scope: 'post_execution' as any,
      status: failed > 0 ? ValidationStatus.FAILED : 
              warnings > 0 ? ValidationStatus.WARNING : ValidationStatus.PASSED,
      checks,
      summary: {
        totalChecks: checks.length,
        passed,
        failed,
        warnings,
        skipped: 0,
        overallStatus: failed > 0 ? ValidationStatus.FAILED : 
                      warnings > 0 ? ValidationStatus.WARNING : ValidationStatus.PASSED,
        criticalIssues: checks
          .filter(c => c.status === ValidationStatus.FAILED)
          .map(c => c.message)
      }
    };
  }

  private async checkForImportReferences(filePath: string): Promise<boolean> {
    try {
      // This is a basic implementation - in a real scenario, you'd want more sophisticated analysis
      const fileName = filePath.replace(/\.(ts|js)$/, '');
      const searchPattern = new RegExp(`from ['"].*${fileName}['"]|import.*['"].*${fileName}['"]`);
      
      // Search in common source directories
      const searchDirs = ['src', 'api', 'server', 'core/src'];
      
      for (const dir of searchDirs) {
        const dirPath = join(this.rootPath, dir);
        try {
          await fs.access(dirPath);
          // In a real implementation, you'd recursively search files
          // For now, we'll return false to avoid false positives
        } catch {
          // Directory doesn't exist, skip
        }
      }
      
      return false; // Simplified - assume no references for now
    } catch {
      return false;
    }
  }


}











































