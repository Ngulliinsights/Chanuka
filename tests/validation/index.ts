/**
 * System Validation & Testing Helpers - Barrel Export
 * 
 * This module provides validators and helpers for:
 * - Architecture validation (design patterns, service registration)
 * - Migration validation (security, error handling, compatibility)
 * - Import validation (module availability checks)
 * - Test environment helpers (error simulation, state cleanup)
 * 
 * Usage in CI/CD:
 *   import { MigrationValidator, ArchitectureValidator } from '@tests/validation';
 *   
 *   const migrationResult = await new MigrationValidator().runValidation();
 *   const archResult = await ArchitectureValidator.validate();
 * 
 * Usage in tests:
 *   import { simulateError, clearAllCaches, getTestEnvironment } from '@tests/validation';
 *   
 *   await clearAllCaches();
 *   const env = getTestEnvironment();
 *   simulateError('javascript');
 */

// Validators (architecture, migration, imports)
export {
  ImportValidator,
  MigrationValidator,
  ArchitectureValidator,
  ValidationResult,
  ValidationSummary,
  ArchitectureValidationResult,
} from './validators';

// Test environment helpers (error simulation, state management)
export {
  simulateError,
  clearAllCaches,
  getTestEnvironment,
  TestEnvironmentHelpers,
} from './test-environment-helpers';
