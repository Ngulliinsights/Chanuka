/**
 * Validation functions for consolidation mappings
 */

import type {
  ConsolidationMapping,
  ConsolidationPlan,
  ValidationResult,
} from './types';

/**
 * Validates a single consolidation mapping
 * 
 * @param mapping - The consolidation mapping to validate
 * @param existingModules - List of existing module names
 * @returns Validation result with errors and warnings
 */
export function validateMapping(
  mapping: ConsolidationMapping,
  existingModules: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate source modules exist
  for (const sourceModule of mapping.sourceModules) {
    if (!existingModules.includes(sourceModule)) {
      errors.push(`Source module "${sourceModule}" does not exist`);
    }
  }

  // Validate source modules array is not empty
  if (mapping.sourceModules.length === 0) {
    errors.push('Source modules array cannot be empty');
  }

  // Validate target module name
  if (!mapping.targetModule || mapping.targetModule.trim() === '') {
    errors.push('Target module name cannot be empty');
  }

  // Validate target module name format (kebab-case)
  const kebabCaseRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  if (mapping.targetModule && !kebabCaseRegex.test(mapping.targetModule)) {
    errors.push(
      `Target module name "${mapping.targetModule}" must be in kebab-case format`
    );
  }

  // Validate migrations
  for (const migration of mapping.migrations) {
    if (!migration.from || migration.from.trim() === '') {
      errors.push('Migration "from" path cannot be empty');
    }
    if (!migration.to || migration.to.trim() === '') {
      errors.push('Migration "to" path cannot be empty');
    }
    if (migration.from === migration.to) {
      warnings.push(
        `Migration from "${migration.from}" to "${migration.to}" has identical paths`
      );
    }
  }

  // Validate breaking changes
  for (const breakingChange of mapping.breakingChanges) {
    if (!breakingChange.description || breakingChange.description.trim() === '') {
      errors.push('Breaking change description cannot be empty');
    }
    if (!breakingChange.mitigation || breakingChange.mitigation.trim() === '') {
      warnings.push('Breaking change should include mitigation strategy');
    }
    if (breakingChange.affectedFiles.length === 0) {
      warnings.push(
        `Breaking change "${breakingChange.description}" has no affected files listed`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that mappings don't have conflicts
 * 
 * @param mapping - The mapping to check
 * @param allMappings - All mappings in the plan
 * @returns Validation result
 */
export function validateNoConflicts(
  mapping: ConsolidationMapping,
  allMappings: ConsolidationMapping[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate source modules across mappings
  const sourceModulesInOtherMappings = allMappings
    .filter((m) => m !== mapping)
    .flatMap((m) => m.sourceModules);

  for (const sourceModule of mapping.sourceModules) {
    if (sourceModulesInOtherMappings.includes(sourceModule)) {
      errors.push(
        `Source module "${sourceModule}" appears in multiple consolidation mappings`
      );
    }
  }

  // Check for duplicate target modules
  const targetModulesInOtherMappings = allMappings
    .filter((m) => m !== mapping)
    .map((m) => m.targetModule);

  if (targetModulesInOtherMappings.includes(mapping.targetModule)) {
    errors.push(
      `Target module "${mapping.targetModule}" appears in multiple consolidation mappings`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates an entire consolidation plan
 * 
 * @param plan - The consolidation plan to validate
 * @param existingModules - List of existing module names
 * @returns Validation result
 */
export function validatePlan(
  plan: ConsolidationPlan,
  existingModules: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each mapping
  for (const mapping of plan.mappings) {
    const mappingResult = validateMapping(mapping, existingModules);
    errors.push(...mappingResult.errors);
    warnings.push(...mappingResult.warnings);

    const conflictResult = validateNoConflicts(mapping, plan.mappings);
    errors.push(...conflictResult.errors);
    warnings.push(...conflictResult.warnings);
  }

  // Validate module count targets
  if (plan.moduleCountBefore <= 0) {
    errors.push('Module count before must be positive');
  }

  if (plan.moduleCountAfter <= 0) {
    errors.push('Module count after must be positive');
  }

  if (plan.moduleCountAfter >= plan.moduleCountBefore) {
    warnings.push(
      'Module count after consolidation should be less than before'
    );
  }

  // Validate timeline
  if (plan.timelineWeeks <= 0) {
    errors.push('Timeline must be positive');
  }

  // Check if target module count is achievable
  const totalSourceModules = plan.mappings.reduce(
    (sum, m) => sum + m.sourceModules.length,
    0
  );
  const targetModules = plan.mappings.length;
  const unmappedModules = plan.moduleCountBefore - totalSourceModules;
  const projectedTotal = targetModules + unmappedModules;

  if (Math.abs(projectedTotal - plan.moduleCountAfter) > 2) {
    warnings.push(
      `Projected module count (${projectedTotal}) differs from target (${plan.moduleCountAfter})`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
