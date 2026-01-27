/**
 * Configuration utility types
 */

// Application environment
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Application configuration
export type AppConfig = {
  apiUrl: string;
  environment: Environment;
  features: Record<string, boolean>;
  theme: {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
    fontFamily?: string;
  };
  analytics?: {
    enabled: boolean;
    trackingId?: string;
  };
  auth?: {
    enabled: boolean;
    provider?: string;
  };
};
