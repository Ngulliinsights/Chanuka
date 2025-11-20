/**
 * Environment Configuration
 * Centralized configuration management for different environments
 */

import { logger } from './logger';

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

const getEnvironmentConfig = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config = {
    apiUrl: import.meta.env.VITE_API_URL || (isDevelopment ? 'http://localhost:3000' : ''),
    wsUrl: import.meta.env.VITE_WS_URL || (isDevelopment ? 'ws://localhost:3000' : ''),
    environment: isProduction ? 'production' : isDevelopment ? 'development' : 'staging',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableSecurityMonitoring: import.meta.env.VITE_ENABLE_SECURITY_MONITORING !== 'false',
    logLevel: (import.meta.env.VITE_LOG_LEVEL as any) || (isDevelopment ? 'debug' : 'info'),
    oauth: {
      google: {
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        enabled: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
      },
      github: {
        clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
        enabled: !!import.meta.env.VITE_GITHUB_CLIENT_ID,
      },
    },
    security: {
      enableCSP: import.meta.env.VITE_ENABLE_CSP !== 'false',
      enableHSTS: import.meta.env.VITE_ENABLE_HSTS !== 'false',
      sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT || '1800000', 10), // 30 minutes
      maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS || '5', 10),
    },
  } as const;

  logger.info('Environment configuration loaded', { 
    component: 'EnvConfig',
    environment: config.environment,
    oauthEnabled: {
      google: config.oauth.google.enabled,
      github: config.oauth.github.enabled
    }
  });
  
  return config;
};

export const envConfig = getEnvironmentConfig();

export default envConfig;