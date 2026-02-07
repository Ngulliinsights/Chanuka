/**
 * Type Validator
 * 
 * Validates TypeScript compilation and detects new errors introduced by fixes.
 */

import * as ts from 'typescript';
import { Project } from 'ts-morph';
import {
  ValidationResult,
  TypeScriptError,
  TypeScriptWarning,
  ErrorReport,
  CompatibilityReport,
  TypeChange,
  BreakingChange,
  MigrationPattern,
  Severity,
  ErrorCategory
} from '../types';
import { RemediationConfig } from '../config';

export class TypeValidator {
  private project: Project;
  private config: RemediationConfig;

  constructor(config: RemediationConfig) {
    this.config = config;
    this.project = new Project({
      tsConfigFilePath: config.tsconfigPath
    });
  }

  /**
   * Run TypeScript compiler to check for errors
   */
  async validateTypeScript(files?: string[]): Promise<ValidationResult> {
    // Refresh project to pick up any file changes
    this.project = new Project({
      tsConfigFilePath: this.config.tsconfigPath
    });

    const program = this.project.getProgram().compilerObject;
    const allDiagnostics: any[] = [];

    if (files && files.length > 0) {
      // Validate specific files
      for (const filePath of files) {
        const sourceFile = program.getSourceFile(filePath);
        if (sourceFile) {
          // Get semantic diagnostics for this file
          const semanticDiagnostics = program.getSemanticDiagnostics(sourceFile);
          allDiagnostics.push(...semanticDiagnostics);

          // Get syntactic diagnostics for this file
          const syntacticDiagnostics = program.getSyntacticDiagnostics(sourceFile);
          allDiagnostics.push(...syntacticDiagnostics);
        }
      }
    } else {
      // Validate all files
      const sourceFiles = this.project.getSourceFiles();

      for (const sourceFile of sourceFiles) {
        const compilerNode = sourceFile.compilerNode;

        // Get semantic diagnostics
        const semanticDiagnostics = program.getSemanticDiagnostics(compilerNode);
        allDiagnostics.push(...semanticDiagnostics);

        // Get syntactic diagnostics
        const syntacticDiagnostics = program.getSyntacticDiagnostics(compilerNode);
        allDiagnostics.push(...syntacticDiagnostics);
      }

      // Get global diagnostics
      const globalDiagnostics = program.getGlobalDiagnostics();
      allDiagnostics.push(...globalDiagnostics);
    }

    // Separate errors and warnings
    const errors = this.parseDiagnosticsAsErrors(
      allDiagnostics.filter(d => d.category === ts.DiagnosticCategory.Error)
    );
    const warnings = this.parseDiagnosticsAsWarnings(
      allDiagnostics.filter(d => d.category === ts.DiagnosticCategory.Warning)
    );

    return {
      success: errors.length === 0,
      errorCount: errors.length,
      errors,
      warnings
    };
  }

  /**
   * Check for new errors introduced by fixes
   */
  detectNewErrors(before: ErrorReport, after: ErrorReport): TypeScriptError[] {
    const newErrors: TypeScriptError[] = [];

    // Create a set of error signatures from the "before" report
    const beforeErrorSignatures = new Set<string>();
    for (const errors of before.errorsByFile.values()) {
      for (const error of errors) {
        beforeErrorSignatures.add(this.createErrorSignature(error));
      }
    }

    // Check each error in the "after" report
    for (const errors of after.errorsByFile.values()) {
      for (const error of errors) {
        const signature = this.createErrorSignature(error);
        if (!beforeErrorSignatures.has(signature)) {
          newErrors.push(error);
        }
      }
    }

    return newErrors;
  }

  /**
   * Verify backward compatibility
   */
  checkBackwardCompatibility(changes: TypeChange[]): CompatibilityReport {
    const breakingChanges: BreakingChange[] = [];
    const migrationPatterns: MigrationPattern[] = [];

    for (const change of changes) {
      const breakingChange = this.analyzeTypeChange(change);
      if (breakingChange) {
        breakingChanges.push(breakingChange);
        migrationPatterns.push(breakingChange.migrationPattern);
      }
    }

    return {
      compatible: breakingChanges.length === 0,
      breakingChanges,
      migrationRequired: breakingChanges.length > 0,
      migrationPatterns
    };
  }

  /**
   * Create a unique signature for an error
   */
  private createErrorSignature(error: TypeScriptError): string {
    // Create signature based on file, line, column, and error code
    // This allows us to identify the same error across different runs
    return `${error.file}:${error.line}:${error.column}:${error.code}`;
  }

  /**
   * Parse diagnostics as TypeScript errors
   */
  private parseDiagnosticsAsErrors(diagnostics: any[]): TypeScriptError[] {
    return diagnostics.map(diagnostic => {
      const file = diagnostic.file?.fileName || 'unknown';
      const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start || 0);

      return {
        code: `TS${diagnostic.code}`,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        file,
        line: position?.line || 0,
        column: position?.character || 0,
        severity: this.mapSeverity(diagnostic.category),
        category: this.categorizeError(`TS${diagnostic.code}`, diagnostic.messageText.toString())
      };
    });
  }

  /**
   * Parse diagnostics as TypeScript warnings
   */
  private parseDiagnosticsAsWarnings(diagnostics: any[]): TypeScriptWarning[] {
    return diagnostics.map(diagnostic => {
      const file = diagnostic.file?.fileName || 'unknown';
      const position = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start || 0);

      return {
        code: `TS${diagnostic.code}`,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        file,
        line: position?.line || 0,
        column: position?.character || 0
      };
    });
  }

  /**
   * Map TypeScript diagnostic category to severity
   */
  private mapSeverity(category: ts.DiagnosticCategory): Severity {
    switch (category) {
      case ts.DiagnosticCategory.Error:
        return Severity.CRITICAL;
      case ts.DiagnosticCategory.Warning:
        return Severity.MEDIUM;
      default:
        return Severity.LOW;
    }
  }

  /**
   * Categorize error based on error code and message
   */
  private categorizeError(code: string, message: string): ErrorCategory {
    // Categorize based on error code
    if (code === 'TS2307') return ErrorCategory.MODULE_RESOLUTION;
    if (['TS2305', 'TS2724', 'TS2614'].includes(code)) return ErrorCategory.EXPORT_PATH;
    if (code === 'TS2367' && message.includes('id')) return ErrorCategory.ID_TYPE;
    if (['TS2339', 'TS2353'].includes(code)) return ErrorCategory.INTERFACE_COMPLETION;
    if (['TS7006', 'TS7053'].includes(code)) return ErrorCategory.EXPLICIT_TYPES;
    if (code === 'TS2367') return ErrorCategory.TYPE_COMPARISON;
    if (code === 'TS2430') return ErrorCategory.INTERFACE_COMPATIBILITY;
    if (code === 'TS2308') return ErrorCategory.EXPORT_DISAMBIGUATION;
    if (code === 'TS18048') return ErrorCategory.UNDEFINED_SAFETY;

    return ErrorCategory.TYPE_ASSERTION;
  }

  /**
   * Analyze a type change to determine if it's breaking
   */
  private analyzeTypeChange(change: TypeChange): BreakingChange | null {
    // Determine if the change is breaking
    const isBreaking = this.isBreakingChange(change);

    if (!isBreaking) {
      return null;
    }

    // Create breaking change report
    const breakingChange: BreakingChange = {
      type: this.mapChangeTypeToBreakingType(change.type),
      location: change.location,
      description: this.generateChangeDescription(change),
      affectedCode: change.affectedFiles || [],
      migrationPattern: this.generateMigrationPattern(change)
    };

    return breakingChange;
  }

  /**
   * Determine if a type change is breaking
   */
  private isBreakingChange(change: TypeChange): boolean {
    switch (change.type) {
      case 'removal':
        // Removing a type is always breaking
        return true;

      case 'signature_change':
      case 'type_change':
        // Signature or type changes are breaking if they affect public APIs
        return true;

      case 'addition':
        // Adding a type is not breaking
        return false;

      default:
        return false;
    }
  }

  /**
   * Map TypeChange type to BreakingChange type
   */
  private mapChangeTypeToBreakingType(
    changeType: TypeChange['type']
  ): BreakingChange['type'] {
    switch (changeType) {
      case 'removal':
        return 'export_removal';
      case 'signature_change':
        return 'interface_change';
      case 'type_change':
        return 'type_change';
      default:
        return 'type_change';
    }
  }

  /**
   * Generate a human-readable description of the change
   */
  private generateChangeDescription(change: TypeChange): string {
    switch (change.type) {
      case 'removal':
        return `Type '${change.name}' was removed from ${change.location}`;

      case 'signature_change':
        return `Type '${change.name}' signature changed in ${change.location}\n` +
               `  Before: ${change.oldSignature || 'unknown'}\n` +
               `  After: ${change.newSignature || 'unknown'}`;

      case 'type_change':
        return `Type '${change.name}' definition changed in ${change.location}\n` +
               `  Before: ${change.oldSignature || 'unknown'}\n` +
               `  After: ${change.newSignature || 'unknown'}`;

      case 'addition':
        return `Type '${change.name}' was added to ${change.location}`;

      default:
        return `Type '${change.name}' changed in ${change.location}`;
    }
  }

  /**
   * Generate a migration pattern for a type change
   */
  private generateMigrationPattern(change: TypeChange): MigrationPattern {
    const pattern: MigrationPattern = {
      name: `${change.name} Migration`,
      description: this.generateChangeDescription(change),
      before: change.oldSignature || '// Old type definition',
      after: change.newSignature || '// New type definition',
      automated: this.canAutomate(change)
    };

    return pattern;
  }

  /**
   * Determine if a type change can be automated
   */
  private canAutomate(change: TypeChange): boolean {
    // Simple heuristic: additions and some type changes can be automated
    switch (change.type) {
      case 'addition':
        return true;
      case 'type_change':
        // Can automate if we have both old and new signatures
        return !!(change.oldSignature && change.newSignature);
      case 'signature_change':
        // Can automate if we have both old and new signatures
        return !!(change.oldSignature && change.newSignature);
      case 'removal':
        // Cannot automate removals
        return false;
      default:
        return false;
    }
  }
}
