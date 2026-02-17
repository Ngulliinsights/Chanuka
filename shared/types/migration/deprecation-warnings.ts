/**
 * DEPRECATION WARNINGS - Legacy Type Deprecation Management
 *
 * Utilities for managing deprecation warnings and guiding developers
 * to use standardized types instead of legacy ones
 */

// ============================================================================
// DEPRECATION WARNING MANAGEMENT
// ============================================================================

export interface DeprecationWarning {
  typeName: string;
  versionDeprecated: string;
  versionRemoved?: string;
  replacementType: string;
  replacementImport: string;
  migrationGuide?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface DeprecationContext {
  warningsShown: Set<string>;
  suppressWarnings: boolean;
  logToConsole: boolean;
  throwErrors: boolean;
}

// ============================================================================
// DEPRECATION REGISTRY
// ============================================================================

export class DeprecationRegistry {
  private static instance: DeprecationRegistry;
  private warnings: Map<string, DeprecationWarning>;
  private context: DeprecationContext;

  private constructor() {
    this.warnings = new Map();
    this.context = {
      warningsShown: new Set(),
      suppressWarnings: false,
      logToConsole: true,
      throwErrors: false,
    };
  }

  public static getInstance(): DeprecationRegistry {
    if (!DeprecationRegistry.instance) {
      DeprecationRegistry.instance = new DeprecationRegistry();
    }
    return DeprecationRegistry.instance;
  }

  // ============================================================================
  // WARNING REGISTRATION
  // ============================================================================

  public registerDeprecation(warning: DeprecationWarning): void {
    this.warnings.set(warning.typeName, warning);
  }

  public registerMultipleDeprecations(warnings: DeprecationWarning[]): void {
    warnings.forEach(warning => this.registerDeprecation(warning));
  }

  // ============================================================================
  // WARNING EMITTING
  // ============================================================================

  public emitWarning(typeName: string, stackTrace?: string): void {
    const warning = this.warnings.get(typeName);
    if (!warning) return;

    // Check if we should suppress this warning
    if (this.context.suppressWarnings) return;
    if (this.context.warningsShown.has(typeName)) return;

    // Mark as shown
    this.context.warningsShown.add(typeName);

    // Build the warning message
    const message = this.buildWarningMessage(warning, stackTrace);

    // Output the warning
    if (this.context.logToConsole) {
      console.warn(message);
    }

    // Throw error if configured
    if (this.context.throwErrors) {
      throw new Error(`[DEPRECATION] ${warning.message}`);
    }
  }

  private buildWarningMessage(warning: DeprecationWarning, stackTrace?: string): string {
    let message = `\n🚨 DEPRECATION WARNING: ${warning.typeName}\n`;
    message += `📅 Deprecated in: v${warning.versionDeprecated}\n`;

    if (warning.versionRemoved) {
      message += `⚠️  Will be removed in: v${warning.versionRemoved}\n`;
    }

    message += `🔧 Replacement: ${warning.replacementType}\n`;
    message += `📁 Import from: ${warning.replacementImport}\n`;
    message += `💡 Message: ${warning.message}\n`;

    if (warning.migrationGuide) {
      message += `📖 Migration guide: ${warning.migrationGuide}\n`;
    }

    if (stackTrace) {
      message += `\n🔍 Stack trace:\n${stackTrace}\n`;
    }

    message += `\n${'='.repeat(60)}\n`;

    return message;
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  public configure(context: Partial<DeprecationContext>): void {
    this.context = { ...this.context, ...context };
  }

  public suppressWarnings(suppress: boolean = true): void {
    this.context.suppressWarnings = suppress;
  }

  public enableConsoleLogging(enable: boolean = true): void {
    this.context.logToConsole = enable;
  }

  public enableErrorThrowing(enable: boolean = true): void {
    this.context.throwErrors = enable;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  public getWarning(typeName: string): DeprecationWarning | undefined {
    return this.warnings.get(typeName);
  }

  public getAllWarnings(): DeprecationWarning[] {
    return Array.from(this.warnings.values());
  }

  public clearShownWarnings(): void {
    this.context.warningsShown.clear();
  }

  public hasWarnings(): boolean {
    return this.warnings.size > 0;
  }

  public getCriticalWarnings(): DeprecationWarning[] {
    return Array.from(this.warnings.values()).filter(
      w => w.severity === 'critical'
    );
  }
}

// ============================================================================
// DEPRECATION WRAPPER UTILITIES
// ============================================================================

export function createDeprecatedTypeWrapper<T extends new (...args: unknown[]) => any>(
  deprecatedType: T,
  warning: DeprecationWarning
): T {
  const registry = DeprecationRegistry.getInstance();
  registry.registerDeprecation(warning);

  return class extends deprecatedType {
    constructor(...args: unknown[]) {
      registry.emitWarning(warning.typeName);
      super(...args);
    }
  } as T;
}

export function wrapDeprecatedFunction<F extends (...args: unknown[]) => any>(
  deprecatedFunction: F,
  warning: DeprecationWarning
): F {
  const registry = DeprecationRegistry.getInstance();
  registry.registerDeprecation(warning);

  return function (this: unknown, ...args: Parameters<F>): ReturnType<F> {
    registry.emitWarning(warning.typeName);
    return deprecatedFunction.apply(this, args);
  } as F;
}

// ============================================================================
// GLOBAL DEPRECATION HANDLER
// ============================================================================

export function setupGlobalDeprecationHandler(): void {
  const registry = DeprecationRegistry.getInstance();

  // Configure default behavior
  registry.configure({
    suppressWarnings: false,
    logToConsole: true,
    throwErrors: process.env.NODE_ENV === 'development',
  });

  // Handle process warnings
  process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning') {
      console.warn('Global deprecation warning:', warning.message);
    }
  });
}

// Initialize global handler
setupGlobalDeprecationHandler();

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const DeprecationUtils = {
  DeprecationRegistry,
  createDeprecatedTypeWrapper,
  wrapDeprecatedFunction,
  setupGlobalDeprecationHandler,
};

export type { DeprecationWarning, DeprecationContext };