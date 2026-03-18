import { ErrorMonitor, initializeErrorMonitoring } from './index';
import { datadogRum } from '@datadog/browser-rum';

export interface MonitoringConfig {
  environment: string;
  version: string;
  enableErrorMonitoring?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableAnalytics?: boolean;
  sentry?: {
    dsn: string;
    tracesSampleRate?: number;
    replaysSessionSampleRate?: number;
    replaysOnErrorSampleRate?: number;
  };
  datadog?: {
    applicationId: string;
    clientToken: string;
    site?: string;
    service?: string;
    sessionSampleRate?: number;
    sessionReplaySampleRate?: number;
  };
}

class MonitoringInstance {
  private config: MonitoringConfig;
  private initialized = false;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  async initialize() {
    if (this.initialized) return;

    console.log(`[Monitoring] Initializing for ${this.config.environment} v${this.config.version}`);

    // Initialize Sentry via Error Monitoring
    if (this.config.enableErrorMonitoring) {
      if (!this.config.sentry?.dsn) {
        console.warn('Error monitoring enabled but no Sentry DSN provided');
      } else {
        initializeErrorMonitoring({
          enabled: true,
          sentryDsn: this.config.sentry.dsn,
          environment: this.config.environment,
          release: this.config.version,
        });
      }
    }

    // Initialize Datadog RUM
    if (this.config.enableAnalytics) {
      if (!this.config.datadog?.applicationId || !this.config.datadog?.clientToken) {
        console.warn('Analytics enabled but Datadog config incomplete');
      } else {
        try {
          datadogRum.init({
            applicationId: this.config.datadog.applicationId,
            clientToken: this.config.datadog.clientToken,
            site: (this.config.datadog.site as Site) || 'datadoghq.com',
            service: this.config.datadog.service || 'simple-tool',
            env: this.config.environment,
            version: this.config.version,
            sessionSampleRate: this.config.datadog.sessionSampleRate ?? 100,
            sessionReplaySampleRate: this.config.datadog.sessionReplaySampleRate ?? 20,
            trackUserInteractions: true,
            trackResources: true,
            trackLongTasks: true,
            defaultPrivacyLevel: 'mask-user-input',
          });
          console.log('[Monitoring] Datadog RUM initialized');
        } catch (error) {
          console.error('[Monitoring] Datadog initialization failed:', error);
        }
      }
    }

    this.initialized = true;
  }

  updateUserContext(userId: string, metadata?: any) {
    // Sentry user context
    const errorMonitor = ErrorMonitor.getInstance();
    errorMonitor.setUserContext(userId, metadata);

    // Datadog user context
    if (this.config.enableAnalytics) {
      datadogRum.setUser({
        id: userId,
        ...metadata,
      });
    }
  }

  trackBusinessEvent(eventName: string, metadata?: any) {
    if (this.config.enableAnalytics) {
      datadogRum.addAction(eventName, metadata);
    }
  }

  trackError(error: Error, context?: Record<string, unknown>) {
    const errorMonitor = ErrorMonitor.getInstance();
    errorMonitor.trackError(error, context);
  }

  getStatus() {
    return {
      initialized: this.initialized,
      errorMonitoring: !!this.config.enableErrorMonitoring,
      performanceMonitoring: !!this.config.enablePerformanceMonitoring,
      analytics: !!this.config.enableAnalytics,
      services: {
        sentry: !!this.config.sentry?.dsn,
        datadog: !!this.config.datadog?.applicationId,
      },
    };
  }
}

let globalInstance: MonitoringInstance | null = null;

export function validateConfig(config: MonitoringConfig) {
  if (!config.environment) throw new Error('Monitoring config must include environment');
  if (!config.version) throw new Error('Monitoring config must include version');
}

export async function initializeMonitoring(config: MonitoringConfig): Promise<void> {
  validateConfig(config);
  globalInstance = new MonitoringInstance(config);
  await globalInstance.initialize();
}

export function getMonitoringInstance(): MonitoringInstance | null {
  return globalInstance;
}

export function destroyMonitoring() {
  globalInstance = null;
}

export function autoInitializeMonitoring() {
  if (typeof window === 'undefined') return;

  const env = process.env.NODE_ENV || 'development';
  const version = (process.env as unknown as Record<string, unknown>).BUILD_VERSION || '1.0.0';

  // In real implementation, these would come from env vars
  const config: MonitoringConfig = {
    environment: env,
    version: version,
    enableErrorMonitoring: env === 'production',
    enablePerformanceMonitoring: true,
    enableAnalytics: env === 'production',
    sentry: {
      dsn: (import.meta as unknown as Record<string, unknown>).env?.VITE_SENTRY_DSN || '',
    },
    datadog: {
      applicationId:
        (import.meta as unknown as Record<string, unknown>).env?.VITE_DATADOG_APPLICATION_ID || '',
      clientToken:
        (import.meta as unknown as Record<string, unknown>).env?.VITE_DATADOG_CLIENT_TOKEN || '',
    },
  };

  if (env === 'production') {
    initializeMonitoring(config).catch(err => {
      console.error('[Monitoring] Auto-initialization failed:', err);
    });
  }
}
