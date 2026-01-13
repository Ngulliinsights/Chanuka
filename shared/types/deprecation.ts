// ============================================================================
// DEPRECATION SYSTEM - Type and Feature Deprecation Management
// ============================================================================
// Provides utilities for marking, tracking, and managing deprecated types
// Helps coordinate smooth transitions to new type system

/**
 * Information about a deprecated item
 */
export interface DeprecationInfo {
  readonly since: string;
  readonly replacement: string;
  readonly reason: string;
  readonly removalDate: string;
  readonly severity: 'info' | 'warning' | 'error';
}

/**
 * Registry of deprecated types with migration paths
 */
export const DEPRECATED_TYPES: Record<string, DeprecationInfo> = {
  // Type consolidation deprecations
  'DashboardState': {
    since: '1.0.0',
    replacement: 'DashboardData',
    reason: 'Consolidation of duplicate types in standardization',
    removalDate: '1.2.0',
    severity: 'warning',
  },

  'WidgetTabsProps': {
    since: '1.0.0',
    replacement: 'WidgetTabsPropsLayout',
    reason: 'Renamed to avoid collision with other component props',
    removalDate: '1.2.0',
    severity: 'warning',
  },

  // Legacy type imports deprecations
  'core.ts exports': {
    since: '1.0.0',
    replacement: 'shared/types/domains exports',
    reason: 'Moved to standardized domain-based type system',
    removalDate: '1.3.0',
    severity: 'warning',
  },

  // Branded type deprecations (if applicable)
  'RawUserId': {
    since: '1.0.0',
    replacement: 'UserId (branded type)',
    reason: 'Replaced with branded type for compile-time safety',
    removalDate: '1.2.0',
    severity: 'info',
  },
};

/**
 * Registry of deprecated functions
 */
export const DEPRECATED_FUNCTIONS: Record<string, DeprecationInfo> = {
  'getLegacyUserData': {
    since: '1.0.0',
    replacement: 'getValidatedUserData',
    reason: 'New function includes validation',
    removalDate: '1.2.0',
    severity: 'warning',
  },

  'parseOldBillSchema': {
    since: '1.0.0',
    replacement: 'validateDatabaseEntity("bills", data)',
    reason: 'Integrated into unified validation registry',
    removalDate: '1.2.0',
    severity: 'warning',
  },
};

/**
 * Emit deprecation warning
 * Can be controlled via environment variable NODE_DEPRECATION_LEVEL
 */
export function deprecationWarning(
  name: string,
  type: 'type' | 'function' | 'module' = 'type'
): void {
  const registry = type === 'function' ? DEPRECATED_FUNCTIONS : DEPRECATED_TYPES;
  const info = registry[name];

  if (!info) {
    return; // Not deprecated
  }

  const level = process.env.NODE_DEPRECATION_LEVEL ?? 'warn';
  const timestamp = new Date().toISOString();
  const message = `[DEPRECATED ${timestamp}] ${type.toUpperCase()}: "${name}" is deprecated since ${info.since}. Use "${info.replacement}" instead. (${info.reason}) Scheduled for removal in ${info.removalDate}.`;

  if (level === 'off') {
    return;
  } else if (level === 'info') {
    console.info(message);
  } else if (level === 'error') {
    throw new Error(message);
  } else {
    // default: warn
    console.warn(message);
  }
}

/**
 * Check if an item is deprecated
 */
export function isDeprecated(name: string, type: 'type' | 'function' | 'module' = 'type'): boolean {
  const registry = type === 'function' ? DEPRECATED_FUNCTIONS : DEPRECATED_TYPES;
  return name in registry;
}

/**
 * Get deprecation info for an item
 */
export function getDeprecationInfo(
  name: string,
  type: 'type' | 'function' | 'module' = 'type'
): DeprecationInfo | undefined {
  const registry = type === 'function' ? DEPRECATED_FUNCTIONS : DEPRECATED_TYPES;
  return registry[name];
}

/**
 * List all deprecated items
 */
export function listDeprecatedItems(): {
  readonly types: string[];
  readonly functions: string[];
} {
  return {
    types: Object.keys(DEPRECATED_TYPES),
    functions: Object.keys(DEPRECATED_FUNCTIONS),
  };
}

/**
 * Generate deprecation report
 */
export function generateDeprecationReport(): string {
  const types = Object.entries(DEPRECATED_TYPES);
  const functions = Object.entries(DEPRECATED_FUNCTIONS);

  let report = '# Deprecation Report\n\n';

  report += '## Deprecated Types\n\n';
  for (const [name, info] of types) {
    report += `- **${name}** → ${info.replacement}\n`;
    report += `  - Since: ${info.since}\n`;
    report += `  - Reason: ${info.reason}\n`;
    report += `  - Removal: ${info.removalDate}\n\n`;
  }

  report += '## Deprecated Functions\n\n';
  for (const [name, info] of functions) {
    report += `- **${name}** → ${info.replacement}\n`;
    report += `  - Since: ${info.since}\n`;
    report += `  - Reason: ${info.reason}\n`;
    report += `  - Removal: ${info.removalDate}\n\n`;
  }

  return report;
}

/**
 * Decorator for marking functions as deprecated
 * Usage: @deprecated()
 */
export function deprecated(options?: Partial<DeprecationInfo>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const info: DeprecationInfo = {
        since: options?.since ?? '1.0.0',
        replacement: options?.replacement ?? 'TBD',
        reason: options?.reason ?? 'This method is deprecated',
        removalDate: options?.removalDate ?? 'TBD',
        severity: options?.severity ?? 'warning',
      };

      deprecationWarning(propertyKey, 'function');
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Export deprecation information for documentation
 */
export const DEPRECATION_SUMMARY = {
  totalDeprecations: Object.keys(DEPRECATED_TYPES).length + Object.keys(DEPRECATED_FUNCTIONS).length,
  deprecatedTypes: Object.keys(DEPRECATED_TYPES),
  deprecatedFunctions: Object.keys(DEPRECATED_FUNCTIONS),
  lastUpdated: new Date().toISOString(),
} as const;
