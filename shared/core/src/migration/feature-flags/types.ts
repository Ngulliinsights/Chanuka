// Define the available feature flags
export enum MigrationFlag {
  USE_NEW_CACHE = 'USE_NEW_CACHE',
  USE_NEW_AUTH = 'USE_NEW_AUTH',
  USE_NEW_VALIDATION = 'USE_NEW_VALIDATION',
  USE_NEW_LOGGING = 'USE_NEW_LOGGING',
}

// Define the structure of flag configurations
export interface FlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  description: string;
}

// Export the flag value type
export type FlagValue = boolean | number | string;

// Define flag state interface
export interface FlagState {
  [key: string]: FlagConfig;
}












































