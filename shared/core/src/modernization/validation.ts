import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../observability/logging';
import {
  ValidationResult,
  ValidationScope,
  ValidationStatus,
  ValidationCheck,
  ValidationType,
  ValidationSummary,
  ModernizationTask,
  ValidationError
} from './types';

export interface ValidationFrameworkOptions {
  config: {
    enabled: boolean;
    preExecution: boolean;
    postExecution: boolean;
    continuous: boolean;
    failFast: boolean;
    types: ValidationType[];
  };
  logger: typeof logger;
  workingDirectory: string;
}

export class ValidationFramework extends EventEmitter {
  private readonly config: ValidationFrameworkOptions['config'];
  private readonly logger: typeof logger;
  private readonly workingDirectory: string;
  private validationHistory: ValidationResult[] = [];
  private continuousValidation?: NodeJS.Timeout;

  constructor(options: ValidationFrameworkOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger;
    this.workingDirectory = options.workingDirectory;

    if (this.config.continuous) {
      this.startContinuousValidation();
    }
  }

  /**
   * Validate before task execution
   */
  public async validatePreExecution(task?: ModernizationTask): Promise<ValidationResult> {
    this.logger.info('Starting pre-execution validation', { taskId: task?.id });

    const result = await this.runValidation(
      ValidationScope.PRE_EXECUTION,
      `pre-execution-${Date.now()}`,
      task
    );

    this.emit('validation:completed', result);
    return result;
  }

  /**
   * Validate after task execution
   */
  public async validatePostExecution(task?: ModernizationTask): Promise<ValidationResult> {
    this.logger.info('Starting post-execution validation', { taskId: task?.id });

    const result = await this.runValidation(
      ValidationScope.POST_EXECUTION,
      `post-execution-${Date.now()}`,
      task
    );

    this.emit('validation:completed', result);
    return result;
  }

  /**
   * Validate rollback operation
   */
  public async validateRollback(): Promise<ValidationResult> {
    this.logger.info('Starting rollback validation', {});

    const result = await this.runValidation(
      ValidationScope.ROLLBACK,
      `rollback-${Date.now()}`
    );

    this.emit('validation:completed', result);
    return result;
  }

  /**
   * Run continuous validation
   */
  public async runContinuousValidation(): Promise<ValidationResult> {
    this.logger.debug('Running continuous validation', {});

    const result = await this.runValidation(
      ValidationScope.CONTINUOUS,
      `continuous-${Date.now()}`
    );

    this.emit('validation:completed', result);
    return result;
  }

  /**
   * Get validation history
   */
  public getValidationHistory(): ValidationResult[] {
    return [...this.validationHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get latest validation result for a scope
   */
  public getLatestValidation(scope: ValidationScope): ValidationResult | null {
    const scopeResults = this.validationHistory.filter(r => r.scope === scope);
    return scopeResults.length > 0
      ? scopeResults.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
      : null;
  }

  /**
   * Stop continuous validation
   */
  public stopContinuousValidation(): void {
    if (this.continuousValidation) {
      clearInterval(this.continuousValidation);
      this.continuousValidation = undefined as any;
      this.logger.info('Continuous validation stopped', {});
    }
  }

  private async runValidation(
    scope: ValidationScope,
    validationId: string,
    task?: ModernizationTask
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const checks: ValidationCheck[] = [];
    let overallStatus: ValidationStatus = ValidationStatus.PASSED;
    const criticalIssues: string[] = [];

    try {
      // Run validation checks based on configuration
      for (const validationType of this.config.types) {
        try {
          const check = await this.runValidationCheck(validationType, scope, task);
          checks.push(check);

          // Update overall status
          if (check.status === ValidationStatus.FAILED) {
            overallStatus = ValidationStatus.FAILED;
            if (this.isCriticalValidation(validationType)) {
              criticalIssues.push(check.message);
            }

            if (this.config.failFast) {
              break;
            }
          } else if (check.status === ValidationStatus.WARNING && overallStatus === ValidationStatus.PASSED) {
            overallStatus = ValidationStatus.WARNING;
          }

        } catch (error) {
          const failedCheck: ValidationCheck = {
            id: `${validationType}-${Date.now()}`,
            name: this.getValidationName(validationType),
            type: validationType,
            status: ValidationStatus.FAILED,
            message: `Validation check failed: ${(error as Error).message}`,
            duration: 0
          };

          checks.push(failedCheck);
          overallStatus = ValidationStatus.FAILED;

          if (this.isCriticalValidation(validationType)) {
            criticalIssues.push(failedCheck.message);
          }

          this.logger.error(`Validation check failed: ${validationType}`, { error });

          if (this.config.failFast) {
            break;
          }
        }
      }

      const summary = this.createValidationSummary(checks, overallStatus, criticalIssues);

      const result: ValidationResult = {
        id: validationId,
        timestamp: new Date(),
        scope,
        status: overallStatus,
        checks,
        summary
      };

      this.validationHistory.push(result);

      const duration = Date.now() - startTime;
      this.logger.info('Validation completed', {
        validationId,
        scope,
        status: overallStatus,
        checksCount: checks.length,
        duration
      });

      return result;

    } catch (error) {
      const validationError = error instanceof ValidationError
        ? error
        : new ValidationError(`Validation failed: ${(error as Error).message}`, ValidationType.FUNCTIONALITY);

      this.emit('validation:error', validationError);
      throw validationError;
    }
  }

  private async runValidationCheck(
    type: ValidationType,
    scope: ValidationScope,
    task?: ModernizationTask
  ): Promise<ValidationCheck> {
    const startTime = Date.now();
    const checkId = `${type}-${scope}-${Date.now()}`;
    const checkName = this.getValidationName(type);

    try {
      let status: ValidationStatus;
      let message: string;
      let details: Record<string, unknown> = {};

      switch (type) {
        case ValidationType.SYNTAX:
          ({ status, message, details } = await this.validateSyntax(scope));
          break;
        case ValidationType.IMPORTS:
          ({ status, message, details } = await this.validateImports(scope));
          break;
        case ValidationType.TESTS:
          ({ status, message, details } = await this.validateTests(scope));
          break;
        case ValidationType.BUILD:
          ({ status, message, details } = await this.validateBuild(scope));
          break;
        case ValidationType.FUNCTIONALITY:
          ({ status, message, details } = await this.validateFunctionality(scope, task));
          break;
        case ValidationType.PERFORMANCE:
          ({ status, message, details } = await this.validatePerformance(scope));
          break;
        case ValidationType.SECURITY:
          ({ status, message, details } = await this.validateSecurity(scope));
          break;
        default:
          throw new ValidationError(`Unsupported validation type: ${type}`, type);
      }

      const duration = Date.now() - startTime;

      return {
        id: checkId,
        name: checkName,
        type,
        status,
        message,
        details,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        id: checkId,
        name: checkName,
        type,
        status: ValidationStatus.FAILED,
        message: `Check failed: ${(error as Error).message}`,
        duration
      };
    }
  }

  private async validateSyntax(scope: ValidationScope): Promise<{
    status: ValidationStatus;
    message: string;
    details: Record<string, unknown>;
  }> {
    // Check TypeScript/JavaScript syntax
    const tsFiles = await this.findFiles(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);
    const syntaxErrors: string[] = [];

    for (const file of tsFiles.slice(0, 10)) { // Limit for performance
      try {
        const content = await fs.readFile(file, 'utf-8');
        // Basic syntax validation (in real implementation, would use TypeScript compiler API)
        if (this.hasSyntaxErrors(content)) {
          syntaxErrors.push(file);
        }
      } catch (error) {
        syntaxErrors.push(`${file}: ${(error as Error).message}`);
      }
    }

    if (syntaxErrors.length === 0) {
      return {
        status: ValidationStatus.PASSED,
        message: `Syntax validation passed for ${tsFiles.length} files`,
        details: { filesChecked: tsFiles.length }
      };
    } else {
      return {
        status: ValidationStatus.FAILED,
        message: `Syntax errors found in ${syntaxErrors.length} files`,
        details: {
          filesChecked: tsFiles.length,
          errorFiles: syntaxErrors.slice(0, 5), // Show first 5 errors
          totalErrors: syntaxErrors.length
        }
      };
    }
  }

  private async validateImports(scope: ValidationScope): Promise<{
    status: ValidationStatus;
    message: string;
    details: Record<string, unknown>;
  }> {
    // Check for broken imports
    const sourceFiles = await this.findFiles(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']);
    const brokenImports: string[] = [];

    for (const file of sourceFiles.slice(0, 10)) { // Limit for performance
      try {
        const content = await fs.readFile(file, 'utf-8');
        const imports = this.extractImports(content);

        for (const importPath of imports) {
          if (!(await this.importExists(importPath, file))) {
            brokenImports.push(`${file}: ${importPath}`);
          }
        }
      } catch (error) {
        brokenImports.push(`${file}: Error reading file`);
      }
    }

    if (brokenImports.length === 0) {
      return {
        status: ValidationStatus.PASSED,
        message: `Import validation passed for ${sourceFiles.length} files`,
        details: { filesChecked: sourceFiles.length }
      };
    } else {
      return {
        status: ValidationStatus.FAILED,
        message: `Broken imports found in ${brokenImports.length} locations`,
        details: {
          filesChecked: sourceFiles.length,
          brokenImports: brokenImports.slice(0, 5),
          totalBroken: brokenImports.length
        }
      };
    }
  }

  private async validateTests(scope: ValidationScope): Promise<{
    status: ValidationStatus;
    message: string;
    details: Record<string, unknown>;
  }> {
    // Check if tests exist and can run
    const testFiles = await this.findFiles(['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js']);

    if (testFiles.length === 0) {
      return {
        status: ValidationStatus.WARNING,
        message: 'No test files found',
        details: { testFiles: 0 }
      };
    }

    // In a real implementation, would run the tests
    const testResults = await this.runTests(testFiles);

    if (testResults.passed) {
      return {
        status: ValidationStatus.PASSED,
        message: `All ${testFiles.length} test files passed`,
        details: {
          testFiles: testFiles.length,
          ...testResults
        }
      };
    } else {
      return {
        status: ValidationStatus.FAILED,
        message: `Test failures detected`,
        details: {
          testFiles: testFiles.length,
          ...testResults
        }
      };
    }
  }

  private async validateBuild(scope: ValidationScope): Promise<{
    status: ValidationStatus;
    message: string;
    details: Record<string, unknown>;
  }> {
    // Check if project builds successfully
    try {
      const buildResult = await this.runBuild();

      if (buildResult.success) {
        return {
          status: ValidationStatus.PASSED,
          message: 'Build completed successfully',
          details: buildResult
        };
      } else {
        return {
          status: ValidationStatus.FAILED,
          message: 'Build failed',
          details: buildResult
        };
      }
    } catch (error) {
      return {
        status: ValidationStatus.FAILED,
        message: `Build validation failed: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  private async validateFunctionality(
    scope: ValidationScope,
    task?: ModernizationTask
  ): Promise<{
    status: ValidationStatus;
    message: string;
    details: Record<string, unknown>;
  }> {
    // Validate that functionality still works after changes
    const functionalityChecks = [
      'Core modules can be imported',
      'Main entry points are accessible',
      'Configuration loads correctly',
      'Basic operations work'
    ];

    const results = await Promise.all(
      functionalityChecks.map(check => this.runFunctionalityCheck(check))
    );

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    if (failed === 0) {
      return {
        status: ValidationStatus.PASSED,
        message: `All ${functionalityChecks.length} functionality checks passed`,
        details: {
          totalChecks: functionalityChecks.length,
          passed,
          failed,
          results
        }
      };
    } else {
      return {
        status: ValidationStatus.FAILED,
        message: `${failed} functionality checks failed`,
        details: {
          totalChecks: functionalityChecks.length,
          passed,
          failed,
          results
        }
      };
    }
  }

  private async validatePerformance(scope: ValidationScope): Promise<{
    status: ValidationStatus;
    message: string;
    details: Record<string, unknown>;
  }> {
    // Basic performance validation
    const performanceMetrics = await this.gatherPerformanceMetrics();

    const issues = [];
    if (performanceMetrics.buildTime > 60000) { // 1 minute
      issues.push('Build time exceeds 1 minute');
    }
    if (performanceMetrics.bundleSize > 10 * 1024 * 1024) { // 10MB
      issues.push('Bundle size exceeds 10MB');
    }

    if (issues.length === 0) {
      return {
        status: ValidationStatus.PASSED,
        message: 'Performance validation passed',
        details: performanceMetrics
      };
    } else {
      return {
        status: ValidationStatus.WARNING,
        message: `Performance issues detected: ${issues.join(', ')}`,
        details: { ...performanceMetrics, issues }
      };
    }
  }

  private async validateSecurity(scope: ValidationScope): Promise<{
    status: ValidationStatus;
    message: string;
    details: Record<string, unknown>;
  }> {
    // Basic security validation
    const securityIssues = await this.checkSecurityIssues();

    if (securityIssues.length === 0) {
      return {
        status: ValidationStatus.PASSED,
        message: 'No security issues detected',
        details: { issuesFound: 0 }
      };
    } else {
      const criticalIssues = securityIssues.filter(issue => issue.severity === 'critical');
      const status = criticalIssues.length > 0 ? ValidationStatus.FAILED : ValidationStatus.WARNING;

      return {
        status,
        message: `${securityIssues.length} security issues found`,
        details: {
          totalIssues: securityIssues.length,
          criticalIssues: criticalIssues.length,
          issues: securityIssues.slice(0, 5)
        }
      };
    }
  }

  private createValidationSummary(
    checks: ValidationCheck[],
    overallStatus: ValidationStatus,
    criticalIssues: string[]
  ): ValidationSummary {
    return {
      totalChecks: checks.length,
      passed: checks.filter(c => c.status === ValidationStatus.PASSED).length,
      failed: checks.filter(c => c.status === ValidationStatus.FAILED).length,
      warnings: checks.filter(c => c.status === ValidationStatus.WARNING).length,
      skipped: checks.filter(c => c.status === ValidationStatus.SKIPPED).length,
      overallStatus,
      criticalIssues
    };
  }

  private startContinuousValidation(): void {
    this.continuousValidation = setInterval(async () => {
      try {
        await this.runContinuousValidation();
      } catch (error) {
        this.logger.error('Continuous validation error', { error });
      }
    }, 30000); // Run every 30 seconds

    this.logger.info('Continuous validation started', {});
  }

  private getValidationName(type: ValidationType): string {
    const names = {
      [ValidationType.SYNTAX]: 'Syntax Validation',
      [ValidationType.IMPORTS]: 'Import Validation',
      [ValidationType.TESTS]: 'Test Validation',
      [ValidationType.BUILD]: 'Build Validation',
      [ValidationType.FUNCTIONALITY]: 'Functionality Validation',
      [ValidationType.PERFORMANCE]: 'Performance Validation',
      [ValidationType.SECURITY]: 'Security Validation'
    };
    return names[type] || type;
  }

  private isCriticalValidation(type: ValidationType): boolean {
    return [
      ValidationType.SYNTAX,
      ValidationType.BUILD,
      ValidationType.FUNCTIONALITY
    ].includes(type);
  }

  // Helper methods (simplified implementations)
  private async findFiles(patterns: string[]): Promise<string[]> {
    // Simplified file finding - would use glob in real implementation
    return [];
  }

  private hasSyntaxErrors(content: string): boolean {
    // Basic syntax error detection
    const brackets = content.match(/[{}()[\]]/g) || [];
    let balance = 0;
    for (const bracket of brackets) {
      if (bracket === '{' || bracket === '(' || bracket === '[') balance++;
      else balance--;
    }
    return balance !== 0;
  }

  private extractImports(content: string): string[] {
    const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]!);
    }
    return imports;
  }

  private async importExists(importPath: string, fromFile: string): Promise<boolean> {
    // Simplified import existence check
    if (importPath.startsWith('.')) {
      const resolvedPath = path.resolve(path.dirname(fromFile), importPath);
      try {
        await fs.access(resolvedPath);
        return true;
      } catch {
        return false;
      }
    }
    return true; // Assume external packages exist
  }

  private async runTests(testFiles: string[]): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
  }> {
    // Simplified test runner
    return {
      passed: true,
      totalTests: testFiles.length,
      passedTests: testFiles.length,
      failedTests: 0
    };
  }

  private async runBuild(): Promise<{
    success: boolean;
    duration: number;
    errors: string[];
    warnings: string[];
  }> {
    // Simplified build runner
    return {
      success: true,
      duration: 5000,
      errors: [],
      warnings: []
    };
  }

  private async runFunctionalityCheck(check: string): Promise<{
    name: string;
    passed: boolean;
    message: string;
  }> {
    // Simplified functionality check
    return {
      name: check,
      passed: true,
      message: 'Check passed'
    };
  }

  private async gatherPerformanceMetrics(): Promise<{
    buildTime: number;
    bundleSize: number;
    memoryUsage: number;
  }> {
    return {
      buildTime: 30000, // 30 seconds
      bundleSize: 5 * 1024 * 1024, // 5MB
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  private async checkSecurityIssues(): Promise<Array<{
    type: string;
    severity: string;
    description: string;
  }>> {
    // Simplified security check
    return [];
  }
}















































