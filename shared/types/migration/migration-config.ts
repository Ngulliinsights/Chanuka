/**
 * MIGRATION CONFIG - Migration Configuration Management
 *
 * Centralized configuration for type migration processes
 */

// ============================================================================
// MIGRATION CONFIGURATION INTERFACES
// ============================================================================

export interface MigrationConfig {
  enabled: boolean;
  batchSize: number;
  validateBeforeMigration: boolean;
  validateAfterMigration: boolean;
  logMigrationDetails: boolean;
  throwOnMigrationError: boolean;
  preserveLegacyData: boolean;
  migrationTimeout?: number;
  retryFailedMigrations: boolean;
  maxMigrationRetries: number;
  migrationRetryDelay: number;
}

export interface TypeMigrationConfig extends MigrationConfig {
  sourceType: string;
  targetType: string;
  fieldMappings: Record<string, string>;
  defaultValues?: Record<string, any>;
  postMigrationHooks?: Array<(migratedItem: any) => any>;
}

export interface GlobalMigrationSettings {
  defaultConfig: MigrationConfig;
  typeSpecificConfigs: Record<string, TypeMigrationConfig>;
  deprecatedTypes: string[];
  migrationBlacklist: string[];
  migrationWhitelist: string[];
}

// ============================================================================
// MIGRATION CONFIG MANAGER
// ============================================================================

export class MigrationConfigManager {
  private config: GlobalMigrationSettings;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): GlobalMigrationSettings {
    return {
      defaultConfig: {
        enabled: true,
        batchSize: 100,
        validateBeforeMigration: true,
        validateAfterMigration: true,
        logMigrationDetails: true,
        throwOnMigrationError: process.env.NODE_ENV === 'development',
        preserveLegacyData: false,
        migrationTimeout: 30000,
        retryFailedMigrations: true,
        maxMigrationRetries: 3,
        migrationRetryDelay: 1000,
      },
      typeSpecificConfigs: {},
      deprecatedTypes: [],
      migrationBlacklist: [],
      migrationWhitelist: [],
    };
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  public setConfig(config: Partial<GlobalMigrationSettings>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): GlobalMigrationSettings {
    return { ...this.config };
  }

  public setDefaultConfig(config: Partial<MigrationConfig>): void {
    this.config.defaultConfig = { ...this.config.defaultConfig, ...config };
  }

  public getDefaultConfigCopy(): MigrationConfig {
    return { ...this.config.defaultConfig };
  }

  public addTypeSpecificConfig(typeName: string, config: TypeMigrationConfig): void {
    this.config.typeSpecificConfigs[typeName] = config;
  }

  public getTypeSpecificConfig(typeName: string): TypeMigrationConfig | undefined {
    return this.config.typeSpecificConfigs[typeName];
  }

  public removeTypeSpecificConfig(typeName: string): void {
    delete this.config.typeSpecificConfigs[typeName];
  }

  // ============================================================================
  // DEPRECATED TYPES MANAGEMENT
  // ============================================================================

  public addDeprecatedType(typeName: string): void {
    if (!this.config.deprecatedTypes.includes(typeName)) {
      this.config.deprecatedTypes.push(typeName);
    }
  }

  public removeDeprecatedType(typeName: string): void {
    this.config.deprecatedTypes = this.config.deprecatedTypes.filter(
      t => t !== typeName
    );
  }

  public isTypeDeprecated(typeName: string): boolean {
    return this.config.deprecatedTypes.includes(typeName);
  }

  public getDeprecatedTypes(): string[] {
    return [...this.config.deprecatedTypes];
  }

  // ============================================================================
  // MIGRATION WHITELIST/BLACKLIST
  // ============================================================================

  public addToMigrationBlacklist(typeName: string): void {
    if (!this.config.migrationBlacklist.includes(typeName)) {
      this.config.migrationBlacklist.push(typeName);
    }
  }

  public removeFromMigrationBlacklist(typeName: string): void {
    this.config.migrationBlacklist = this.config.migrationBlacklist.filter(
      t => t !== typeName
    );
  }

  public isMigrationBlacklisted(typeName: string): boolean {
    return this.config.migrationBlacklist.includes(typeName);
  }

  public addToMigrationWhitelist(typeName: string): void {
    if (!this.config.migrationWhitelist.includes(typeName)) {
      this.config.migrationWhitelist.push(typeName);
    }
  }

  public removeFromMigrationWhitelist(typeName: string): void {
    this.config.migrationWhitelist = this.config.migrationWhitelist.filter(
      t => t !== typeName
    );
  }

  public isMigrationWhitelisted(typeName: string): boolean {
    return this.config.migrationWhitelist.includes(typeName);
  }

  // ============================================================================
  // MIGRATION ELIGIBILITY
  // ============================================================================

  public canMigrateType(typeName: string): boolean {
    // Check if migration is enabled
    if (!this.config.defaultConfig.enabled) {
      return false;
    }

    // Check blacklist
    if (this.isMigrationBlacklisted(typeName)) {
      return false;
    }

    // Check whitelist (if not empty)
    if (this.config.migrationWhitelist.length > 0 &&
        !this.isMigrationWhitelisted(typeName)) {
      return false;
    }

    return true;
  }

  public getMigrationConfigForType(typeName: string): MigrationConfig {
    const typeConfig = this.getTypeSpecificConfig(typeName);
    if (typeConfig) {
      return { ...this.config.defaultConfig, ...typeConfig };
    }
    return { ...this.config.defaultConfig };
  }

  // ============================================================================
  // CONFIGURATION VALIDATION
  // ============================================================================

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate default config
    if (this.config.defaultConfig.batchSize <= 0) {
      errors.push('batchSize must be greater than 0');
    }

    if (this.config.defaultConfig.maxMigrationRetries < 0) {
      errors.push('maxMigrationRetries cannot be negative');
    }

    if (this.config.defaultConfig.migrationRetryDelay < 0) {
      errors.push('migrationRetryDelay cannot be negative');
    }

    // Validate type-specific configs
    for (const [typeName, typeConfig] of Object.entries(this.config.typeSpecificConfigs)) {
      if (typeConfig.batchSize <= 0) {
        errors.push(`batchSize for ${typeName} must be greater than 0`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // CONFIGURATION EXPORT/IMPORT
  // ============================================================================

  public exportConfig(): GlobalMigrationSettings {
    return JSON.parse(JSON.stringify(this.config));
  }

  public importConfig(config: GlobalMigrationSettings): void {
    this.config = { ...this.getDefaultConfig(), ...config };
  }

  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
  }
}

// ============================================================================
// GLOBAL CONFIGURATION INSTANCE
// ============================================================================

export const migrationConfig = new MigrationConfigManager();

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const MigrationConfigUtils = {
  MigrationConfigManager,
  migrationConfig,
};