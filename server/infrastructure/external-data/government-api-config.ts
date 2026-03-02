/**
 * Government API Configuration
 * 
 * Configures integration with Kenya government APIs for bill data synchronization.
 * Supports multiple government data sources with authentication and rate limiting.
 * 
 * @module infrastructure/external-data/government-api-config
 */

import { z } from 'zod';

/**
 * Government API Provider Types
 */
export enum GovernmentAPIProvider {
  PARLIAMENT = 'parliament',
  KENYA_GAZETTE = 'kenya_gazette',
  COUNTY_ASSEMBLY = 'county_assembly',
  JUDICIARY = 'judiciary',
}

/**
 * Authentication Method Types
 */
export enum AuthMethod {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  BASIC_AUTH = 'basic_auth',
  BEARER_TOKEN = 'bearer_token',
}

/**
 * API Configuration Schema
 */
export const GovernmentAPIConfigSchema = z.object({
  provider: z.nativeEnum(GovernmentAPIProvider),
  baseUrl: z.string().url(),
  authMethod: z.nativeEnum(AuthMethod),
  credentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    bearerToken: z.string().optional(),
  }),
  rateLimit: z.object({
    requestsPerMinute: z.number().positive(),
    requestsPerHour: z.number().positive(),
    requestsPerDay: z.number().positive(),
  }),
  timeout: z.number().positive().default(30000), // 30 seconds
  retryConfig: z.object({
    maxRetries: z.number().nonnegative().default(3),
    retryDelay: z.number().positive().default(1000), // 1 second
    backoffMultiplier: z.number().positive().default(2),
  }),
  endpoints: z.record(z.string(), z.string()),
  enabled: z.boolean().default(true),
});

export type GovernmentAPIConfig = z.infer<typeof GovernmentAPIConfigSchema>;

/**
 * Default API Configurations
 * 
 * These are template configurations. Actual credentials should be loaded from environment variables.
 */
export const DEFAULT_API_CONFIGS: Record<GovernmentAPIProvider, Partial<GovernmentAPIConfig>> = {
  [GovernmentAPIProvider.PARLIAMENT]: {
    provider: GovernmentAPIProvider.PARLIAMENT,
    baseUrl: process.env.PARLIAMENT_API_URL || 'https://api.parliament.go.ke/v1',
    authMethod: AuthMethod.API_KEY,
    credentials: {
      apiKey: process.env.PARLIAMENT_API_KEY,
    },
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    },
    endpoints: {
      bills: '/bills',
      billDetails: '/bills/:id',
      amendments: '/bills/:id/amendments',
      votes: '/bills/:id/votes',
      committees: '/committees',
      members: '/members',
    },
    enabled: process.env.PARLIAMENT_API_ENABLED !== 'false',
  },
  
  [GovernmentAPIProvider.KENYA_GAZETTE]: {
    provider: GovernmentAPIProvider.KENYA_GAZETTE,
    baseUrl: process.env.GAZETTE_API_URL || 'https://api.kenyagazette.go.ke/v1',
    authMethod: AuthMethod.BEARER_TOKEN,
    credentials: {
      bearerToken: process.env.GAZETTE_API_TOKEN,
    },
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    },
    endpoints: {
      notices: '/notices',
      noticeDetails: '/notices/:id',
      search: '/search',
    },
    enabled: process.env.GAZETTE_API_ENABLED !== 'false',
  },
  
  [GovernmentAPIProvider.COUNTY_ASSEMBLY]: {
    provider: GovernmentAPIProvider.COUNTY_ASSEMBLY,
    baseUrl: process.env.COUNTY_API_URL || 'https://api.countyassembly.go.ke/v1',
    authMethod: AuthMethod.OAUTH2,
    credentials: {
      clientId: process.env.COUNTY_API_CLIENT_ID,
      clientSecret: process.env.COUNTY_API_CLIENT_SECRET,
    },
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    },
    endpoints: {
      bills: '/bills',
      billDetails: '/bills/:id',
      counties: '/counties',
    },
    enabled: process.env.COUNTY_API_ENABLED !== 'false',
  },
  
  [GovernmentAPIProvider.JUDICIARY]: {
    provider: GovernmentAPIProvider.JUDICIARY,
    baseUrl: process.env.JUDICIARY_API_URL || 'https://api.judiciary.go.ke/v1',
    authMethod: AuthMethod.API_KEY,
    credentials: {
      apiKey: process.env.JUDICIARY_API_KEY,
    },
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 5000,
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    },
    endpoints: {
      cases: '/cases',
      caseDetails: '/cases/:id',
      rulings: '/rulings',
    },
    enabled: process.env.JUDICIARY_API_ENABLED !== 'false',
  },
};

/**
 * Load API Configuration
 * 
 * Loads and validates API configuration for a specific provider.
 * 
 * @param provider - Government API provider
 * @returns Validated API configuration
 * @throws Error if configuration is invalid or missing required credentials
 */
export function loadAPIConfig(provider: GovernmentAPIProvider): GovernmentAPIConfig {
  const config = DEFAULT_API_CONFIGS[provider];
  
  if (!config) {
    throw new Error(`No configuration found for provider: ${provider}`);
  }
  
  // Validate configuration
  const result = GovernmentAPIConfigSchema.safeParse(config);
  
  if (!result.success) {
    throw new Error(`Invalid API configuration for ${provider}: ${result.error.message}`);
  }
  
  // Check for required credentials based on auth method
  const validatedConfig = result.data;
  
  switch (validatedConfig.authMethod) {
    case AuthMethod.API_KEY:
      if (!validatedConfig.credentials.apiKey) {
        throw new Error(`API key required for ${provider} but not provided`);
      }
      break;
    case AuthMethod.OAUTH2:
      if (!validatedConfig.credentials.clientId || !validatedConfig.credentials.clientSecret) {
        throw new Error(`OAuth2 credentials required for ${provider} but not provided`);
      }
      break;
    case AuthMethod.BASIC_AUTH:
      if (!validatedConfig.credentials.username || !validatedConfig.credentials.password) {
        throw new Error(`Basic auth credentials required for ${provider} but not provided`);
      }
      break;
    case AuthMethod.BEARER_TOKEN:
      if (!validatedConfig.credentials.bearerToken) {
        throw new Error(`Bearer token required for ${provider} but not provided`);
      }
      break;
  }
  
  return validatedConfig;
}

/**
 * Get All Enabled API Configurations
 * 
 * Returns configurations for all enabled government API providers.
 * 
 * @returns Array of enabled API configurations
 */
export function getAllEnabledConfigs(): GovernmentAPIConfig[] {
  const providers = Object.values(GovernmentAPIProvider);
  const configs: GovernmentAPIConfig[] = [];
  
  for (const provider of providers) {
    try {
      const config = loadAPIConfig(provider);
      if (config.enabled) {
        configs.push(config);
      }
    } catch (error) {
      // Log error but continue with other providers
      console.warn(`Failed to load config for ${provider}:`, error);
    }
  }
  
  return configs;
}

/**
 * Validate API Configuration
 * 
 * Validates that all required environment variables are set for enabled providers.
 * 
 * @returns Validation result with any errors
 */
export function validateAPIConfiguration(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const providers = Object.values(GovernmentAPIProvider);
  
  for (const provider of providers) {
    try {
      loadAPIConfig(provider);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`${provider}: ${error.message}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
