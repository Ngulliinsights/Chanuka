/**
 * Environment Configuration Validator
 * Ensures all required environment variables are available and valid
 */

interface EnvConfig {
  apiUrl: string;
  appName: string;
  appVersion: string;
  environment: 'development' | 'production' | 'test';
  enableAnalytics: boolean;
  enableDebug: boolean;
  enableServiceWorker: boolean;
  apiTimeout: number;
  apiRetryAttempts: number;
  enablePerformanceMonitoring: boolean;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

function getNumberEnvVar(key: string, defaultValue: number): number {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid number for ${key}: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

export function getEnvConfig(): EnvConfig {
  try {
    return {
      apiUrl: getEnvVar('VITE_API_URL', 
        process.env.NODE_ENV === 'production' 
          ? window.location.origin 
          : 'http://localhost:3000'
      ),
      appName: getEnvVar('VITE_APP_NAME', 'Chanuka Platform'),
      appVersion: getEnvVar('VITE_APP_VERSION', '1.0.0'),
      environment: getEnvVar('VITE_ENVIRONMENT', process.env.NODE_ENV || 'development') as EnvConfig['environment'],
      enableAnalytics: getBooleanEnvVar('VITE_ENABLE_ANALYTICS', true),
      enableDebug: getBooleanEnvVar('VITE_ENABLE_DEBUG', process.env.NODE_ENV === 'development'),
      enableServiceWorker: getBooleanEnvVar('VITE_ENABLE_SERVICE_WORKER', process.env.NODE_ENV === 'production'),
      apiTimeout: getNumberEnvVar('VITE_API_TIMEOUT', 10000),
      apiRetryAttempts: getNumberEnvVar('VITE_API_RETRY_ATTEMPTS', 3),
      enablePerformanceMonitoring: getBooleanEnvVar('VITE_ENABLE_PERFORMANCE_MONITORING', true),
    };
  } catch (error) {
    console.error('Environment configuration error:', error);
    // Return safe defaults
    return {
      apiUrl: process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3000',
      appName: 'Chanuka Platform',
      appVersion: '1.0.0',
      environment: (process.env.NODE_ENV || 'development') as EnvConfig['environment'],
      enableAnalytics: false,
      enableDebug: process.env.NODE_ENV === 'development',
      enableServiceWorker: process.env.NODE_ENV === 'production',
      apiTimeout: 10000,
      apiRetryAttempts: 3,
      enablePerformanceMonitoring: false,
    };
  }
}

// Export singleton instance
export const envConfig = getEnvConfig();

// Validate configuration on module load
if (envConfig.enableDebug) {
  console.log('Environment configuration loaded:', envConfig);
}