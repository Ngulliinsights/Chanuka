import { MigrationFlag, FlagConfig, FlagState } from './types';
import { logger } from '../utils/logger';

export class FlagManager {
  private static instance: FlagManager;
  private flags: FlagState;

  private constructor() {
    this.flags = this.initializeFlags();
  }

  static getInstance(): FlagManager {
    if (!FlagManager.instance) {
      FlagManager.instance = new FlagManager();
    }
    return FlagManager.instance;
  }

  private initializeFlags(): FlagState {
    return {
      [MigrationFlag.USE_NEW_CACHE]: {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Use new caching system',
      },
      [MigrationFlag.USE_NEW_AUTH]: {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Use new authentication system',
      },
      [MigrationFlag.USE_NEW_VALIDATION]: {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Use new validation system',
      },
      [MigrationFlag.USE_NEW_LOGGING]: {
        enabled: false,
        rolloutPercentage: 0,
        description: 'Use new logging system',
      },
    };
  }

  setFlag(flag: MigrationFlag, config: Partial<FlagConfig>): void {
    if (!this.flags[flag]) {
      throw new Error(`Unknown flag: ${flag}`);
    }

    this.flags[flag] = {
      ...this.flags[flag],
      ...config,
    };
  }

  isEnabled(flag: MigrationFlag, entityId?: string): boolean {
    const flagConfig = this.flags[flag];
    if (!flagConfig) {
      return false;
    }

    if (!flagConfig.enabled) {
      return false;
    }

    if (flagConfig.rolloutPercentage === undefined || !entityId) {
      return true;
    }

    // Use entityId to determine if this entity is in the rollout percentage
    const hash = this.hashString(entityId);
    const normalizedHash = hash % 100;
    return normalizedHash < flagConfig.rolloutPercentage;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  getFlag(flag: MigrationFlag): FlagConfig {
    if (!this.flags[flag]) {
      throw new Error(`Unknown flag: ${flag}`);
    }
    return this.flags[flag];
  }

  getAllFlags(): FlagState {
    return { ...this.flags };
  }

  reset(): void {
    this.flags = this.initializeFlags();
  }
}







