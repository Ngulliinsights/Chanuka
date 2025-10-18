#!/usr/bin/env node

/**
 * Feature flag management for gradual rollout
 * Controls migration rollout across different parts of the system
 */

const fs = require('fs');
const path = require('path');

/**
 * Feature flag configuration
 */
const FEATURE_FLAGS = {
  // Migration phases
  MIGRATION_PHASE_1: {
    name: 'Migration Phase 1: Primitives',
    description: 'Enable new primitive types and constants',
    enabled: false,
    rollout_percentage: 0,
    affected_modules: ['shared/core/src/primitives']
  },
  MIGRATION_PHASE_2: {
    name: 'Migration Phase 2: Error Management',
    description: 'Enable new error management system',
    enabled: false,
    rollout_percentage: 0,
    affected_modules: ['shared/core/src/error-handling']
  },
  MIGRATION_PHASE_3: {
    name: 'Migration Phase 3: Validation',
    description: 'Enable new validation system',
    enabled: false,
    rollout_percentage: 0,
    affected_modules: ['shared/core/src/validation']
  },
  MIGRATION_PHASE_4: {
    name: 'Migration Phase 4: Infrastructure',
    description: 'Enable new infrastructure components',
    enabled: false,
    rollout_percentage: 0,
    affected_modules: ['server/infrastructure', 'server/core']
  },
  MIGRATION_PHASE_5: {
    name: 'Migration Phase 5: Features',
    description: 'Enable new feature modules',
    enabled: false,
    rollout_percentage: 0,
    affected_modules: ['server/features']
  },

  // Safety flags
  ROLLBACK_ENABLED: {
    name: 'Rollback Enabled',
    description: 'Allow automatic rollback on migration failures',
    enabled: true,
    rollout_percentage: 100
  },
  VALIDATION_STRICT: {
    name: 'Strict Validation',
    description: 'Enforce strict validation during migration',
    enabled: true,
    rollout_percentage: 100
  }
};

/**
 * Feature flag manager class
 */
class FeatureFlagManager {
  constructor(configPath = './migration/feature-flags.json') {
    this.configPath = configPath;
    this.flags = { ...FEATURE_FLAGS };
    this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.flags = { ...this.flags, ...config };
      }
    } catch (error) {
      console.warn('Could not load feature flag config:', error.message);
    }
  }

  /**
   * Save configuration to file
   */
  saveConfig() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.flags, null, 2));
    } catch (error) {
      console.error('Could not save feature flag config:', error.message);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagName, context = {}) {
    const flag = this.flags[flagName];
    if (!flag) {
      console.warn(`Feature flag '${flagName}' not found`);
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rollout_percentage < 100) {
      const rolloutKey = context.rolloutKey || 'default';
      const hash = this.simpleHash(rolloutKey);
      const percentage = (hash % 100) + 1;
      return percentage <= flag.rollout_percentage;
    }

    return true;
  }

  /**
   * Enable a feature flag
   */
  enableFlag(flagName, rolloutPercentage = 100) {
    if (this.flags[flagName]) {
      this.flags[flagName].enabled = true;
      this.flags[flagName].rollout_percentage = rolloutPercentage;
      this.saveConfig();
      console.log(`Enabled feature flag: ${flagName} (${rolloutPercentage}%)`);
    }
  }

  /**
   * Disable a feature flag
   */
  disableFlag(flagName) {
    if (this.flags[flagName]) {
      this.flags[flagName].enabled = false;
      this.saveConfig();
      console.log(`Disabled feature flag: ${flagName}`);
    }
  }

  /**
   * Set rollout percentage for a feature flag
   */
  setRolloutPercentage(flagName, percentage) {
    if (this.flags[flagName]) {
      this.flags[flagName].rollout_percentage = Math.max(0, Math.min(100, percentage));
      this.saveConfig();
      console.log(`Set rollout percentage for ${flagName}: ${percentage}%`);
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags() {
    return { ...this.flags };
  }

  /**
   * Get enabled flags for a specific context
   */
  getEnabledFlags(context = {}) {
    const enabled = {};
    for (const [name, flag] of Object.entries(this.flags)) {
      if (this.isEnabled(name, context)) {
        enabled[name] = flag;
      }
    }
    return enabled;
  }

  /**
   * Check if migration can proceed based on flags
   */
  canProceedWithMigration(phase, context = {}) {
    const phaseFlag = `MIGRATION_PHASE_${phase}`;
    return this.isEnabled(phaseFlag, context) && this.isEnabled('VALIDATION_STRICT', context);
  }

  /**
   * Simple hash function for rollout percentage calculation
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Display current flag status
   */
  displayStatus() {
    console.log('Feature Flag Status:');
    console.log('===================');

    for (const [name, flag] of Object.entries(this.flags)) {
      const status = flag.enabled ? '✅' : '❌';
      const rollout = flag.rollout_percentage ? ` (${flag.rollout_percentage}%)` : '';
      console.log(`${status} ${name}${rollout}: ${flag.description}`);
    }
  }
}

// Export singleton instance
const featureFlagManager = new FeatureFlagManager();

module.exports = {
  FeatureFlagManager,
  featureFlagManager,
  FEATURE_FLAGS
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'status':
      featureFlagManager.displayStatus();
      break;

    case 'enable':
      if (args[1]) {
        const percentage = args[2] ? parseInt(args[2], 10) : 100;
        featureFlagManager.enableFlag(args[1], percentage);
      } else {
        console.log('Usage: node feature-flags.js enable <flag-name> [percentage]');
      }
      break;

    case 'disable':
      if (args[1]) {
        featureFlagManager.disableFlag(args[1]);
      } else {
        console.log('Usage: node feature-flags.js disable <flag-name>');
      }
      break;

    case 'rollout':
      if (args[1] && args[2]) {
        featureFlagManager.setRolloutPercentage(args[1], parseInt(args[2], 10));
      } else {
        console.log('Usage: node feature-flags.js rollout <flag-name> <percentage>');
      }
      break;

    default:
      console.log('Usage: node feature-flags.js <command>');
      console.log('Commands:');
      console.log('  status                    - Show current flag status');
      console.log('  enable <flag> [pct]       - Enable a feature flag with optional rollout percentage');
      console.log('  disable <flag>            - Disable a feature flag');
      console.log('  rollout <flag> <pct>      - Set rollout percentage for a flag');
      break;
  }
}