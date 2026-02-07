/**
 * Batch Processor
 * 
 * Processes fixes in batches with validation and rollback capability.
 */

import { Project } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';
import {
  Fix,
  FixBatch,
  BatchResult,
  ValidationResult,
  FixPhase,
  ErrorCategory
} from '../types';
import { RemediationConfig } from '../config';
import { TypeValidator } from './type-validator';

export class BatchProcessor {
  private project: Project;
  private config: RemediationConfig;
  private validator: TypeValidator;
  private backupDirectory: string;

  constructor(config: RemediationConfig) {
    this.config = config;
    this.project = new Project({
      tsConfigFilePath: config.tsconfigPath
    });
    this.validator = new TypeValidator(config);
    this.backupDirectory = path.join(config.progressTracking.reportDirectory, 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDirectory)) {
      fs.mkdirSync(this.backupDirectory, { recursive: true });
    }
  }

  /**
   * Process fixes in batches
   */
  async processBatch(fixes: Fix[]): Promise<BatchResult> {
    // Group related fixes
    const batches = this.groupRelatedFixes(fixes);
    
    let totalFixesApplied = 0;
    let totalErrorsFixed = 0;
    let totalNewErrors = 0;
    let lastValidationResult: ValidationResult = {
      success: true,
      errorCount: 0,
      errors: [],
      warnings: []
    };

    // Process each batch
    for (const batch of batches) {
      const result = await this.applyWithRollback(batch);
      
      totalFixesApplied += result.fixesApplied;
      totalErrorsFixed += result.errorsFixed;
      totalNewErrors += result.newErrors;
      lastValidationResult = result.validationResult;

      if (!result.success) {
        // If a batch fails, stop processing
        return {
          batchId: 'combined',
          success: false,
          fixesApplied: totalFixesApplied,
          errorsFixed: totalErrorsFixed,
          newErrors: totalNewErrors,
          validationResult: lastValidationResult
        };
      }
    }

    return {
      batchId: 'combined',
      success: true,
      fixesApplied: totalFixesApplied,
      errorsFixed: totalErrorsFixed,
      newErrors: totalNewErrors,
      validationResult: lastValidationResult
    };
  }

  /**
   * Group related fixes together
   */
  groupRelatedFixes(fixes: Fix[]): FixBatch[] {
    const batches: FixBatch[] = [];
    const maxBatchSize = this.config.batchProcessing.maxBatchSize;

    // Group fixes by file and category
    const fixesByFile = new Map<string, Fix[]>();
    const fixesByCategory = new Map<ErrorCategory, Fix[]>();

    for (const fix of fixes) {
      // Group by file if the fix has a file property
      if ('file' in fix && typeof fix.file === 'string') {
        const file = fix.file;
        if (!fixesByFile.has(file)) {
          fixesByFile.set(file, []);
        }
        fixesByFile.get(file)!.push(fix);
      }

      // Group by category
      if (!fixesByCategory.has(fix.category)) {
        fixesByCategory.set(fix.category, []);
      }
      fixesByCategory.get(fix.category)!.push(fix);
    }

    // Create batches by file (prioritize file-based grouping)
    let batchId = 0;
    for (const [file, fileFixes] of fixesByFile) {
      // Split into smaller batches if needed
      for (let i = 0; i < fileFixes.length; i += maxBatchSize) {
        const batchFixes = fileFixes.slice(i, i + maxBatchSize);
        batches.push({
          id: `batch-${batchId++}`,
          phase: this.determinePhase(batchFixes[0].category),
          fixes: batchFixes,
          dependencies: []
        });
      }
    }

    // If no file-based grouping, group by category
    if (batches.length === 0) {
      for (const [category, categoryFixes] of fixesByCategory) {
        for (let i = 0; i < categoryFixes.length; i += maxBatchSize) {
          const batchFixes = categoryFixes.slice(i, i + maxBatchSize);
          batches.push({
            id: `batch-${batchId++}`,
            phase: this.determinePhase(category),
            fixes: batchFixes,
            dependencies: []
          });
        }
      }
    }

    // If still no batches, create a single batch with all fixes
    if (batches.length === 0 && fixes.length > 0) {
      for (let i = 0; i < fixes.length; i += maxBatchSize) {
        const batchFixes = fixes.slice(i, i + maxBatchSize);
        batches.push({
          id: `batch-${batchId++}`,
          phase: this.determinePhase(batchFixes[0].category),
          fixes: batchFixes,
          dependencies: []
        });
      }
    }

    return batches;
  }

  /**
   * Apply fixes with rollback capability
   */
  async applyWithRollback(batch: FixBatch): Promise<BatchResult> {
    const affectedFiles = this.getAffectedFiles(batch.fixes);
    
    // Create backup of affected files
    const backupId = await this.createBackup(affectedFiles);

    try {
      // Apply all fixes in the batch
      const results = await Promise.all(
        batch.fixes.map(fix => fix.apply())
      );

      // Count successes and failures
      const successfulFixes = results.filter(r => r.success);
      const failedFixes = results.filter(r => !r.success);

      // Collect all modified files
      const filesModified = new Set<string>();
      const errorsFixed: string[] = [];
      const newErrors: string[] = [];

      for (const result of results) {
        result.filesModified.forEach(f => filesModified.add(f));
        errorsFixed.push(...result.errorsFixed);
        newErrors.push(...result.newErrors);
      }

      // Validate if configured
      let validationResult: ValidationResult = {
        success: true,
        errorCount: 0,
        errors: [],
        warnings: []
      };

      if (this.config.batchProcessing.validateAfterEachBatch) {
        validationResult = await this.validator.validateTypeScript(
          Array.from(filesModified)
        );

        // Check if validation failed
        const validationFailed = !validationResult.success || 
          (this.config.validation.failOnNewErrors && validationResult.errorCount > 0);

        if (validationFailed && this.config.batchProcessing.rollbackOnFailure) {
          // Rollback changes
          await this.rollback(backupId, affectedFiles);
          
          return {
            batchId: batch.id,
            success: false,
            fixesApplied: 0,
            errorsFixed: 0,
            newErrors: validationResult.errorCount,
            validationResult
          };
        }
      }

      // Clean up backup if successful
      await this.cleanupBackup(backupId);

      return {
        batchId: batch.id,
        success: failedFixes.length === 0,
        fixesApplied: successfulFixes.length,
        errorsFixed: errorsFixed.length,
        newErrors: newErrors.length,
        validationResult
      };
    } catch (error) {
      // Rollback on exception
      if (this.config.batchProcessing.rollbackOnFailure) {
        await this.rollback(backupId, affectedFiles);
      }

      return {
        batchId: batch.id,
        success: false,
        fixesApplied: 0,
        errorsFixed: 0,
        newErrors: 1,
        validationResult: {
          success: false,
          errorCount: 1,
          errors: [],
          warnings: []
        }
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get all files affected by a set of fixes
   */
  private getAffectedFiles(fixes: Fix[]): string[] {
    const files = new Set<string>();

    for (const fix of fixes) {
      if ('file' in fix && typeof fix.file === 'string') {
        files.add(fix.file);
      }
      if ('filesModified' in fix && Array.isArray(fix.filesModified)) {
        (fix.filesModified as string[]).forEach(f => files.add(f));
      }
    }

    return Array.from(files);
  }

  /**
   * Create backup of files
   */
  private async createBackup(files: string[]): Promise<string> {
    const backupId = `backup-${Date.now()}`;
    const backupPath = path.join(this.backupDirectory, backupId);

    // Create backup directory
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    // Copy each file to backup
    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const relativePath = path.relative(this.config.clientRoot, file);
      const backupFilePath = path.join(backupPath, relativePath);
      const backupFileDir = path.dirname(backupFilePath);

      // Ensure backup subdirectory exists
      if (!fs.existsSync(backupFileDir)) {
        fs.mkdirSync(backupFileDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(file, backupFilePath);
    }

    return backupId;
  }

  /**
   * Rollback changes from backup
   */
  private async rollback(backupId: string, files: string[]): Promise<void> {
    const backupPath = path.join(this.backupDirectory, backupId);

    if (!fs.existsSync(backupPath)) {
      console.warn(`Backup ${backupId} not found, cannot rollback`);
      return;
    }

    // Restore each file from backup
    for (const file of files) {
      const relativePath = path.relative(this.config.clientRoot, file);
      const backupFilePath = path.join(backupPath, relativePath);

      if (!fs.existsSync(backupFilePath)) continue;

      // Restore file
      fs.copyFileSync(backupFilePath, file);
    }

    console.log(`Rolled back changes from batch using backup ${backupId}`);
  }

  /**
   * Clean up backup after successful application
   */
  private async cleanupBackup(backupId: string): Promise<void> {
    const backupPath = path.join(this.backupDirectory, backupId);

    if (!fs.existsSync(backupPath)) return;

    // Recursively delete backup directory
    fs.rmSync(backupPath, { recursive: true, force: true });
  }

  /**
   * Determine phase from error category
   */
  private determinePhase(category: ErrorCategory): FixPhase {
    switch (category) {
      case ErrorCategory.MODULE_RESOLUTION:
        return FixPhase.MODULE_LOCATION_DISCOVERY;
      
      case ErrorCategory.EXPORT_PATH:
        return FixPhase.IMPORT_PATH_UPDATES;
      
      case ErrorCategory.ID_TYPE:
      case ErrorCategory.TYPE_COMPARISON:
      case ErrorCategory.PAGINATION:
      case ErrorCategory.HTTP_STATUS:
      case ErrorCategory.NAMING_CONSISTENCY:
        return FixPhase.TYPE_STANDARDIZATION;
      
      case ErrorCategory.INTERFACE_COMPLETION:
      case ErrorCategory.ERROR_CONSTRUCTOR:
        return FixPhase.INTERFACE_COMPLETION;
      
      case ErrorCategory.EXPLICIT_TYPES:
      case ErrorCategory.INTERFACE_COMPATIBILITY:
      case ErrorCategory.UNDEFINED_SAFETY:
      case ErrorCategory.ENUM_LITERAL:
        return FixPhase.TYPE_SAFETY;
      
      case ErrorCategory.IMPORT_CLEANUP:
      case ErrorCategory.EXPORT_DISAMBIGUATION:
      case ErrorCategory.TYPE_ASSERTION:
        return FixPhase.IMPORT_CLEANUP_AND_VALIDATION;
      
      default:
        return FixPhase.TYPE_SAFETY;
    }
  }
}
