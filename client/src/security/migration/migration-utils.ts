/**
 * Security Migration Utilities
 * Helper functions for migrating from legacy to unified security
 */

import {
  UnifiedSecurityConfig,
  MigrationValidationResult,
  SecurityError,
  SecurityErrorType
} from '../unified/security-interface';
import { STANDARD_CSP_CONFIG } from '../unified/csp-config';
import { SecurityErrorFactory } from '../unified/error-handler';

export interface LegacySecurityConfig {
  enableCSP: boolean;
  enableInputSanitization: boolean;
  enableRateLimit: boolean;
  enableCSRF: boolean;
  enableVulnerabilityScanning: boolean;
  csp?: {
    nonce?: string;
    directives?: Record<string, string[]>;
  };
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  windowMs?: number;
  maxRequests?: number;
}

export class SecurityMigrationUtils {
  /**
   * Migrate legacy configuration to unified format
   */
  static async migrateConfiguration(
    legacyConfig: LegacySecurityConfig
  ): Promise<UnifiedSecurityConfig> {
    return {
      csp: {
        enabled: legacyConfig.enableCSP,
        reportOnly: process.env.NODE_ENV === 'development',
        directives: this.convertCSPDirectives(legacyConfig.csp),
        nonce: legacyConfig.csp?.nonce,
      },
      inputSanitization: {
        enabled: legacyConfig.enableInputSanitization,
        mode: 'comprehensive', // Default to comprehensive mode
        allowedTags: legacyConfig.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
        allowedAttributes: legacyConfig.allowedAttributes || {},
      },
      rateLimiting: {
        enabled: legacyConfig.enableRateLimit,
        windowMs: legacyConfig.windowMs || 15 * 60 * 1000, // 15 minutes
        maxRequests: legacyConfig.maxRequests || 100,
      },
      errorHandling: {
        mode: 'strict', // Default to strict mode
        logLevel: 'info',
        reportToBackend: true,
      },
    };
  }

  private static convertCSPDirectives(legacyCSP: any): any {
    // Convert legacy CSP configuration to unified format
    return {
      'default-src': legacyCSP?.defaultSrc || ["'self'"],
      'script-src': legacyCSP?.scriptSrc || ["'self'"],
      'style-src': legacyCSP?.styleSrc || ["'self'"],
      'img-src': legacyCSP?.imgSrc || ["'self'", 'data:', 'https:'],
      'connect-src': legacyCSP?.connectSrc || ["'self'"],
      'font-src': legacyCSP?.fontSrc || ["'self'"],
      'object-src': legacyCSP?.objectSrc || ["'none'"],
      'frame-src': legacyCSP?.frameSrc || ["'none'"],
      'form-action': legacyCSP?.formAction || ["'self'"],
    };
  }

  /**
   * Validate migration configuration
   */
  static validateMigration(config: UnifiedSecurityConfig): MigrationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate CSP configuration
    if (config.csp.enabled) {
      const cspErrors = this.validateCSPConfig(config.csp);
      errors.push(...cspErrors);
    }

    // Validate input sanitization configuration
    if (config.inputSanitization.enabled) {
      const sanitizationErrors = this.validateSanitizationConfig(config.inputSanitization);
      errors.push(...sanitizationErrors);
    }

    // Validate rate limiting configuration
    if (config.rateLimiting.enabled) {
      const rateLimitErrors = this.validateRateLimitConfig(config.rateLimiting);
      errors.push(...rateLimitErrors);
    }

    // Validate error handling configuration
    const errorHandlingErrors = this.validateErrorHandlingConfig(config.errorHandling);
    errors.push(...errorHandlingErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateCSPConfig(csp: any): string[] {
    const errors: string[] = [];

    if (!csp.directives) {
      errors.push('CSP directives are required when CSP is enabled');
    }

    if (csp.directives && !csp.directives['default-src']) {
      errors.push('CSP default-src directive is required');
    }

    // Check for unsafe directives in production
    if (process.env.NODE_ENV === 'production') {
      const unsafeDirectives = ['unsafe-eval', 'unsafe-inline'];
      for (const [directive, sources] of Object.entries(csp.directives)) {
        const sourceArray = Array.isArray(sources) ? sources : [];
        for (const source of sourceArray) {
          if (typeof source === 'string' && unsafeDirectives.some(unsafe => source.includes(unsafe))) {
            errors.push(`Unsafe directive ${source} found in ${directive} for production environment`);
          }
        }
      }
    }

    return errors;
  }

  private static validateSanitizationConfig(sanitization: any): string[] {
    const errors: string[] = [];

    if (!Array.isArray(sanitization.allowedTags)) {
      errors.push('allowedTags must be an array');
    }

    if (typeof sanitization.allowedAttributes !== 'object') {
      errors.push('allowedAttributes must be an object');
    }

    if (!['basic', 'comprehensive', 'auto'].includes(sanitization.mode)) {
      errors.push('sanitization mode must be basic, comprehensive, or auto');
    }

    return errors;
  }

  private static validateRateLimitConfig(rateLimit: any): string[] {
    const errors: string[] = [];

    if (typeof rateLimit.windowMs !== 'number' || rateLimit.windowMs <= 0) {
      errors.push('rateLimiting.windowMs must be a positive number');
    }

    if (typeof rateLimit.maxRequests !== 'number' || rateLimit.maxRequests <= 0) {
      errors.push('rateLimiting.maxRequests must be a positive number');
    }

    return errors;
  }

  private static validateErrorHandlingConfig(errorHandling: any): string[] {
    const errors: string[] = [];

    if (!['strict', 'permissive'].includes(errorHandling.mode)) {
      errors.push('errorHandling.mode must be strict or permissive');
    }

    if (!['debug', 'info', 'warn', 'error'].includes(errorHandling.logLevel)) {
      errors.push('errorHandling.logLevel must be debug, info, warn, or error');
    }

    if (typeof errorHandling.reportToBackend !== 'boolean') {
      errors.push('errorHandling.reportToBackend must be a boolean');
    }

    return errors;
  }

  /**
   * Generate migration report
   */
  static generateMigrationReport(
    legacyConfig: LegacySecurityConfig,
    unifiedConfig: UnifiedSecurityConfig,
    validationResult: MigrationValidationResult
  ): MigrationReport {
    const report: MigrationReport = {
      timestamp: new Date(),
      legacyConfig,
      unifiedConfig,
      validationResult,
      changes: [],
      recommendations: [],
    };

    // Analyze changes
    if (legacyConfig.enableCSP !== unifiedConfig.csp.enabled) {
      report.changes.push({
        type: 'configuration',
        component: 'CSP',
        description: `CSP enabled: ${legacyConfig.enableCSP} -> ${unifiedConfig.csp.enabled}`,
      });
    }

    if (legacyConfig.enableInputSanitization !== unifiedConfig.inputSanitization.enabled) {
      report.changes.push({
        type: 'configuration',
        component: 'InputSanitization',
        description: `Input sanitization enabled: ${legacyConfig.enableInputSanitization} -> ${unifiedConfig.inputSanitization.enabled}`,
      });
    }

    if (legacyConfig.enableRateLimit !== unifiedConfig.rateLimiting.enabled) {
      report.changes.push({
        type: 'configuration',
        component: 'RateLimiting',
        description: `Rate limiting enabled: ${legacyConfig.enableRateLimit} -> ${unifiedConfig.rateLimiting.enabled}`,
      });
    }

    // Generate recommendations
    if (process.env.NODE_ENV === 'development') {
      report.recommendations.push({
        type: 'development',
        priority: 'medium',
        description: 'Consider using report-only CSP mode in development',
      });
    }

    if (unifiedConfig.inputSanitization.mode === 'comprehensive') {
      report.recommendations.push({
        type: 'security',
        priority: 'high',
        description: 'Comprehensive sanitization mode provides better security',
      });
    }

    if (validationResult.errors.length > 0) {
      report.recommendations.push({
        type: 'configuration',
        priority: 'critical',
        description: 'Fix validation errors before deployment',
      });
    }

    return report;
  }

  /**
   * Create migration plan
   */
  static createMigrationPlan(legacyConfig: LegacySecurityConfig): MigrationPlan {
    const plan: MigrationPlan = {
      phases: [],
      rollbackPlan: {
        steps: [
          'Set USE_UNIFIED_SECURITY=false environment variable',
          'Restart application to use legacy system',
          'Investigate and fix issues in unified system',
          'Re-enable unified system after fixes',
        ],
        estimatedTime: '5 minutes',
      },
      estimatedDuration: '2-4 hours',
      riskLevel: 'medium',
    };

    // Phase 1: Preparation
    plan.phases.push({
      name: 'Preparation',
      steps: [
        'Audit current security implementation',
        'Identify all security dependencies',
        'Create backup of current configuration',
        'Set up monitoring for migration',
      ],
      duration: '30 minutes',
    });

    // Phase 2: Configuration Migration
    plan.phases.push({
      name: 'Configuration Migration',
      steps: [
        'Convert legacy configuration to unified format',
        'Validate new configuration',
        'Test configuration in staging environment',
      ],
      duration: '1 hour',
    });

    // Phase 3: Component Migration
    plan.phases.push({
      name: 'Component Migration',
      steps: [
        'Enable compatibility layer',
        'Migrate CSP implementation',
        'Migrate input sanitization',
        'Migrate rate limiting',
        'Migrate error handling',
      ],
      duration: '1-2 hours',
    });

    // Phase 4: Testing and Validation
    plan.phases.push({
      name: 'Testing and Validation',
      steps: [
        'Test each component individually',
        'Run integration tests',
        'Monitor for security issues',
        'Update documentation',
      ],
      duration: '30 minutes',
    });

    return plan;
  }

  /**
   * Execute migration with rollback capability
   */
  static async executeMigration(
    legacyConfig: LegacySecurityConfig,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedConfig: null,
      report: null,
      errors: [],
    };

    try {
      // Step 1: Migrate configuration
      const unifiedConfig = await this.migrateConfiguration(legacyConfig);

      // Step 2: Validate configuration
      const validationResult = this.validateMigration(unifiedConfig);

      if (!validationResult.valid) {
        result.errors = validationResult.errors.map(error =>
          SecurityErrorFactory.createError(
            SecurityErrorType.CONFIGURATION_ERROR,
            error,
            'SecurityMigrationUtils'
          )
        );
        return result;
      }

      // Step 3: Generate migration report
      const report = this.generateMigrationReport(legacyConfig, unifiedConfig, validationResult);

      // Step 4: Execute migration if validation passes
      if (options.execute !== false) {
        // Set environment variable to enable unified security
        if (options.enableUnified !== false) {
          process.env.USE_UNIFIED_SECURITY = 'true';
        }

        // Apply configuration
        if (options.applyConfig !== false) {
          // This would typically involve updating configuration files
          // For now, we'll just return the configuration
        }
      }

      result.success = true;
      result.migratedConfig = unifiedConfig;
      result.report = report;

    } catch (error) {
      const securityError = SecurityErrorFactory.createError(
        SecurityErrorType.CONFIGURATION_ERROR,
        error instanceof Error ? error.message : 'Migration failed',
        'SecurityMigrationUtils',
        { legacyConfig, options }
      );

      result.errors.push(securityError);
    }

    return result;
  }
}

// Type definitions
interface MigrationReport {
  timestamp: Date;
  legacyConfig: LegacySecurityConfig;
  unifiedConfig: UnifiedSecurityConfig;
  validationResult: MigrationValidationResult;
  changes: Array<{
    type: string;
    component: string;
    description: string;
  }>;
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
}

interface MigrationPlan {
  phases: Array<{
    name: string;
    steps: string[];
    duration: string;
  }>;
  rollbackPlan: {
    steps: string[];
    estimatedTime: string;
  };
  estimatedDuration: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface MigrationOptions {
  execute?: boolean;
  enableUnified?: boolean;
  applyConfig?: boolean;
}

interface MigrationResult {
  success: boolean;
  migratedConfig: UnifiedSecurityConfig | null;
  report: MigrationReport | null;
  errors: SecurityError[];
}
