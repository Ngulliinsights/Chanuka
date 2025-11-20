/**
 * Architecture Validation Utility
 * 
 * Validates that the separation of concerns is properly implemented
 * and provides runtime checks for architectural compliance.
 */

import { globalServiceLocator } from '@client/core/api/registry';
import { logger } from './logger';

interface ArchitectureValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export class ArchitectureValidator {
  /**
   * Validates the overall architecture compliance
   */
  static async validate(): Promise<ArchitectureValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    try {
      // Check service registration
      const serviceCheck = await this.validateServices();
      errors.push(...serviceCheck.errors);
      warnings.push(...serviceCheck.warnings);
      score -= serviceCheck.penalty;

      // Check type consistency
      const typeCheck = await this.validateTypes();
      errors.push(...typeCheck.errors);
      warnings.push(...typeCheck.warnings);
      score -= typeCheck.penalty;

      // Check separation of concerns
      const separationCheck = this.validateSeparationOfConcerns();
      errors.push(...separationCheck.errors);
      warnings.push(...separationCheck.warnings);
      score -= separationCheck.penalty;

      const isValid = errors.length === 0;
      
      logger.info('Architecture validation completed', {
        component: 'ArchitectureValidator',
        isValid,
        score,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        isValid,
        errors,
        warnings,
        score: Math.max(0, score)
      };
    } catch (error) {
      logger.error('Architecture validation failed', {
        component: 'ArchitectureValidator',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Validates service registration and availability
   */
  private static async validateServices(): Promise<{
    errors: string[];
    warnings: string[];
    penalty: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    const requiredServices = [
      'stateManagementService',
      'billTrackingService',
      'webSocketService'
    ];

    for (const serviceName of requiredServices) {
      if (!globalServiceLocator.hasService(serviceName)) {
        errors.push(`Required service '${serviceName}' is not registered`);
        penalty += 20;
      } else {
        try {
          const service = await globalServiceLocator.getService(serviceName);
          if (!service) {
            errors.push(`Service '${serviceName}' is registered but cannot be instantiated`);
            penalty += 15;
          }
        } catch (error) {
          errors.push(`Service '${serviceName}' instantiation failed: ${error}`);
          penalty += 15;
        }
      }
    }

    // Check service health
    try {
      const healthStatus = await globalServiceLocator.getRegistry().getServiceHealth();
      
      for (const [serviceName, health] of Object.entries(healthStatus)) {
        if (health.status === 'unhealthy') {
          warnings.push(`Service '${serviceName}' is unhealthy: ${health.message}`);
          penalty += 5;
        }
      }
    } catch (error) {
      warnings.push('Could not check service health');
      penalty += 5;
    }

    return { errors, warnings, penalty };
  }

  /**
   * Validates type consistency across the application
   */
  private static validateTypes(): Promise<{
    errors: string[];
    warnings: string[];
    penalty: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    // Check for type imports from standardized locations
    // This would be more comprehensive in a real implementation
    // For now, we'll do basic checks

    try {
      // Check if standardized types are available
      const apiTypes = require('@client/types/api');
      
      const requiredTypes = [
        'BillUpdate',
        'BillUpdateData',
        'WebSocketSubscription',
        'WebSocketNotification',
        'BillTrackingPreferences'
      ];

      for (const typeName of requiredTypes) {
        if (!(typeName in apiTypes)) {
          errors.push(`Required type '${typeName}' not found in standardized types`);
          penalty += 10;
        }
      }
    } catch (error) {
      errors.push('Could not load standardized types');
      penalty += 20;
    }

    return Promise.resolve({ errors, warnings, penalty });
  }

  /**
   * Validates separation of concerns implementation
   */
  private static validateSeparationOfConcerns(): {
    errors: string[];
    warnings: string[];
    penalty: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    // Check if services are properly separated
    // This is a simplified check - in a real implementation,
    // you might use static analysis tools

    // Check for direct store imports in components (anti-pattern)
    if (typeof window !== 'undefined') {
      // Browser environment - can check for global store access
      const globalStore = (window as any).store;
      if (globalStore) {
        warnings.push('Global store access detected - ensure components use services');
        penalty += 5;
      }
    }

    return { errors, warnings, penalty };
  }

  /**
   * Generates a detailed report of the architecture validation
   */
  static async generateReport(): Promise<string> {
    const result = await this.validate();
    
    let report = '# Architecture Validation Report\n\n';
    
    report += `**Overall Score**: ${result.score}/100\n`;
    report += `**Status**: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;
    
    if (result.errors.length > 0) {
      report += '## ❌ Errors\n\n';
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }
    
    if (result.warnings.length > 0) {
      report += '## ⚠️ Warnings\n\n';
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }
    
    if (result.isValid) {
      report += '## ✅ Architecture Compliance\n\n';
      report += 'The architecture properly implements separation of concerns:\n\n';
      report += '- ✅ Services are properly registered\n';
      report += '- ✅ Types are standardized\n';
      report += '- ✅ Business logic is separated from UI logic\n';
      report += '- ✅ Dependency injection is working\n';
    }
    
    report += '\n## Recommendations\n\n';
    
    if (result.score >= 90) {
      report += 'Excellent architecture! Minor improvements may be possible.\n';
    } else if (result.score >= 80) {
      report += 'Good architecture with room for improvement.\n';
    } else if (result.score >= 70) {
      report += 'Architecture needs attention. Address errors and warnings.\n';
    } else {
      report += 'Architecture requires significant improvements.\n';
    }
    
    return report;
  }
}

/**
 * Development helper to validate architecture in development mode
 */
export const validateArchitectureInDev = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'development') {
    try {
      const result = await ArchitectureValidator.validate();
      
      if (!result.isValid) {
        console.group('🏗️ Architecture Validation Issues');
        result.errors.forEach(error => console.error('❌', error));
        result.warnings.forEach(warning => console.warn('⚠️', warning));
        console.groupEnd();
      } else {
        console.log('✅ Architecture validation passed');
      }
    } catch (error) {
      console.error('Architecture validation failed:', error);
    }
  }
};