/**
 * Environment Configuration
 * Centralized configuration management for different environments
 */

// Note: Avoiding logger import to prevent circular dependency

interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableAnalytics: boolean;
  enableSecurityMonitoring: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  oauth: {
    google: {
      clientId: string;
      enabled: boolean;
    };
    github: {
      clientId: string;
      enabled: boolean;
    };
  };
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
}

interface WindowWithEnv extends Window {
  ENV?: Record<string, string>;
}

interface ImportMetaWithEnv {
  env?: Record<string, string>;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Helper function to safely access environment variables
  const getEnv = (key: string, defaultValue = ''): string => {
    if (typeof window !== 'undefined' && (window as WindowWithEnv).ENV) {
      return (window as WindowWithEnv).ENV?.[key] || defaultValue;
    }
    // Fallback for build-time environment variables
    try {
      return (import.meta as ImportMetaWithEnv).env?.[key] || defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const config = {
    apiUrl: getEnv('VITE_API_URL') || (isDevelopment ? 'http://localhost:3000' : ''),
    wsUrl: getEnv('VITE_WS_URL') || (isDevelopment ? 'ws://localhost:3000' : ''),
    environment: isProduction ? 'production' : isDevelopment ? 'development' : 'staging',
    enableAnalytics: getEnv('VITE_ENABLE_ANALYTICS') === 'true',
    enableSecurityMonitoring: getEnv('VITE_ENABLE_SECURITY_MONITORING') !== 'false',
    logLevel: (getEnv('VITE_LOG_LEVEL') || (isDevelopment ? 'debug' : 'info')) as
      | 'debug'
      | 'info'
      | 'warn'
      | 'error',
    oauth: {
      google: {
        clientId: getEnv('VITE_GOOGLE_CLIENT_ID'),
        enabled: !!getEnv('VITE_GOOGLE_CLIENT_ID'),
      },
      github: {
        clientId: getEnv('VITE_GITHUB_CLIENT_ID'),
        enabled: !!getEnv('VITE_GITHUB_CLIENT_ID'),
      },
    },
    security: {
      enableCSP: getEnv('VITE_ENABLE_CSP') !== 'false',
      enableHSTS: getEnv('VITE_ENABLE_HSTS') !== 'false',
      sessionTimeout: parseInt(getEnv('VITE_SESSION_TIMEOUT', '1800000'), 10), // 30 minutes
      maxLoginAttempts: parseInt(getEnv('VITE_MAX_LOGIN_ATTEMPTS', '5'), 10),
    },
  } as const;

  // Environment configuration loaded successfully
  if (process.env.NODE_ENV === 'development') {
    console.log('Environment configuration loaded', {
      environment: config.environment,
      oauthEnabled: {
        google: config.oauth.google.enabled,
        github: config.oauth.github.enabled,
      },
    });
  }

  return config;
};

export const envConfig = getEnvironmentConfig();

export default envConfig;
