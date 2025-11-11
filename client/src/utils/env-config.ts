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
    apiUrl: process.env.REACT_APP_API_URL || (isDevelopment ? 'http://localhost:5000' : ''),
    wsUrl: process.env.REACT_APP_WS_URL || (isDevelopment ? 'ws://localhost:5000' : ''),
    environment: isProduction ? 'production' : isDevelopment ? 'development' : 'staging',
    enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
    enableSecurityMonitoring: process.env.REACT_APP_ENABLE_SECURITY_MONITORING !== 'false',
    logLevel: (process.env.REACT_APP_LOG_LEVEL as any) || (isDevelopment ? 'debug' : 'info'),
    oauth: {
      google: {
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        enabled: !!process.env.REACT_APP_GOOGLE_CLIENT_ID,
      },
      github: {
        clientId: process.env.REACT_APP_GITHUB_CLIENT_ID || '',
        enabled: !!process.env.REACT_APP_GITHUB_CLIENT_ID,
      },
    },
    security: {
      enableCSP: process.env.REACT_APP_ENABLE_CSP !== 'false',
      enableHSTS: process.env.REACT_APP_ENABLE_HSTS !== 'false',
      sessionTimeout: parseInt(process.env.REACT_APP_SESSION_TIMEOUT || '1800000', 10), // 30 minutes
      maxLoginAttempts: parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS || '5', 10),
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