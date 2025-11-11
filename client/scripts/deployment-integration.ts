#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import SentryMonitoring from '../src/monitoring/sentry-config';
import PerformanceMonitoring from '../src/monitoring/performance-monitoring';
import ErrorMonitoring from '../src/monitoring/error-monitoring';

interface DeploymentConfig {
  environment: 'development' | 'staging' | 'pre-production' | 'production';
  version: string;
  buildTime: string;
  enableMonitoring: boolean;
  performanceThresholds: {
    lcp: number;
    fid: number;
    cls: number;
  };
}

class DeploymentIntegration {
  private config: DeploymentConfig;
  private sentry: SentryMonitoring;
  private performance: PerformanceMonitoring;
  private errorMonitoring: ErrorMonitoring;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.sentry = SentryMonitoring.getInstance();
    this.performance = PerformanceMonitoring.getInstance();
    this.errorMonitoring = ErrorMonitoring.getInstance();
  }

  async initialize(): Promise<void> {
    console.log(`🚀 Initializing deployment integration for ${this.config.environment}`);
    
    // Initialize monitoring services
    if (this.config.enableMonitoring) {
      await this.initializeMonitoring();
    }
    
    // Set up deployment tracking
    await this.setupDeploymentTracking();
    
    // Configure performance monitoring
    await this.configurePerformanceMonitoring();
    
    console.log('✅ Deployment integration initialized');
  }

  private async initializeMonitoring(): Promise<void> {
    const sentryConfig = {
      dsn: process.env.REACT_APP_SENTRY_DSN || '',
      environment: this.config.environment,
      release: this.config.version,
      sampleRate: this.getSampleRate(),
      tracesSampleRate: this.getTracesSampleRate(),
      replaysSessionSampleRate: this.getReplaysSampleRate(),
      replaysOnErrorSampleRate: 1.0,
    };

    this.sentry.initialize(sentryConfig);
    
    // Set deployment context
    this.sentry.setContext('deployment', {
      version: this.config.version,
      buildTime: this.config.buildTime,
      environment: this.config.environment,
    });
  }

  private async setupDeploymentTracking(): Promise<void> {
    // Create deployment marker
    const deploymentInfo = {
      version: this.config.version,
      environment: this.config.environment,
      buildTime: this.config.buildTime,
      timestamp: new Date().toISOString(),
      features: this.getEnabledFeatures(),
    };

    // Write deployment info to public directory
    const deploymentPath = resolve(process.cwd(), 'dist/deployment-info.json');
    writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    // Send deployment event to monitoring services
    await this.sendDeploymentEvent(deploymentInfo);
  }

  private async configurePerformanceMonitoring(): Promise<void> {
    // Set up performance thresholds based on environment
    const thresholds = this.config.performanceThresholds;
    
    this.performance.onMetricsChange((metrics) => {
      // Check against thresholds
      if (metrics.coreWebVitals.lcp && metrics.coreWebVitals.lcp > thresholds.lcp) {
        this.sentry.captureMessage(
          `LCP threshold exceeded: ${metrics.coreWebVitals.lcp}ms`,
          'warning'
        );
      }
      
      if (metrics.coreWebVitals.fid && metrics.coreWebVitals.fid > thresholds.fid) {
        this.sentry.captureMessage(
          `FID threshold exceeded: ${metrics.coreWebVitals.fid}ms`,
          'warning'
        );
      }
      
      if (metrics.coreWebVitals.cls && metrics.coreWebVitals.cls > thresholds.cls) {
        this.sentry.captureMessage(
          `CLS threshold exceeded: ${metrics.coreWebVitals.cls}`,
          'warning'
        );
      }
    });
  }

  private getSampleRate(): number {
    switch (this.config.environment) {
      case 'development': return 1.0;
      case 'staging': return 0.5;
      case 'pre-production': return 0.2;
      case 'production': return 0.1;
      default: return 0.1;
    }
  }

  private getTracesSampleRate(): number {
    switch (this.config.environment) {
      case 'development': return 1.0;
      case 'staging': return 0.5;
      case 'pre-production': return 0.1;
      case 'production': return 0.05;
      default: return 0.05;
    }
  }

  private getReplaysSampleRate(): number {
    switch (this.config.environment) {
      case 'development': return 1.0;
      case 'staging': return 0.1;
      case 'pre-production': return 0.05;
      case 'production': return 0.01;
      default: return 0.01;
    }
  }

  private getEnabledFeatures(): string[] {
    const features = [];
    
    if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true') features.push('analytics');
    if (process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true') features.push('error-reporting');
    if (process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true') features.push('performance-monitoring');
    if (process.env.REACT_APP_ENABLE_DEBUG_MODE === 'true') features.push('debug-mode');
    
    return features;
  }

  private async sendDeploymentEvent(deploymentInfo: any): Promise<void> {
    // Send to Sentry
    this.sentry.captureMessage(
      `Deployment completed: ${deploymentInfo.version}`,
      'info',
      deploymentInfo
    );

    // Send to external monitoring services
    const webhooks = [
      process.env.SLACK_WEBHOOK_URL,
      process.env.DATADOG_WEBHOOK_URL,
    ].filter(Boolean);

    for (const webhook of webhooks) {
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚀 Chanuka Client deployed to ${deploymentInfo.environment}`,
            attachments: [
              {
                color: 'good',
                fields: [
                  { title: 'Version', value: deploymentInfo.version, short: true },
                  { title: 'Environment', value: deploymentInfo.environment, short: true },
                  { title: 'Build Time', value: deploymentInfo.buildTime, short: true },
                  { title: 'Features', value: deploymentInfo.features.join(', '), short: false },
                ],
              },
            ],
          }),
        });
      } catch (error) {
        console.warn(`Failed to send deployment notification to ${webhook}:`, error);
      }
    }
  }

  async validateDeployment(): Promise<boolean> {
    console.log('🔍 Validating deployment...');
    
    const checks = [
      this.checkBuildArtifacts(),
      this.checkEnvironmentConfig(),
      this.checkPerformanceBudgets(),
      this.checkSecurityHeaders(),
    ];

    const results = await Promise.allSettled(checks);
    const failures = results.filter(result => result.status === 'rejected');

    if (failures.length > 0) {
      console.error('❌ Deployment validation failed:');
      failures.forEach((failure, index) => {
        console.error(`  ${index + 1}. ${(failure as PromiseRejectedResult).reason}`);
      });
      return false;
    }

    console.log('✅ Deployment validation passed');
    return true;
  }

  private async checkBuildArtifacts(): Promise<void> {
    const requiredFiles = [
      'dist/index.html',
      'dist/assets',
      'dist/deployment-info.json',
    ];

    for (const file of requiredFiles) {
      if (!existsSync(resolve(process.cwd(), file))) {
        throw new Error(`Missing required build artifact: ${file}`);
      }
    }
  }

  private async checkEnvironmentConfig(): Promise<void> {
    const requiredEnvVars = [
      'REACT_APP_ENV',
      'REACT_APP_API_BASE_URL',
      'REACT_APP_WS_URL',
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }

  private async checkPerformanceBudgets(): Promise<void> {
    const budgetFile = resolve(process.cwd(), 'dist/bundle-report.json');
    
    if (!existsSync(budgetFile)) {
      throw new Error('Bundle analysis report not found');
    }

    const report = JSON.parse(readFileSync(budgetFile, 'utf-8'));
    
    if (report.performance.budgetStatus === 'fail') {
      throw new Error(`Performance budget exceeded: ${report.performance.recommendations.join(', ')}`);
    }
  }

  private async checkSecurityHeaders(): Promise<void> {
    // This would typically check the deployed application
    // For now, we'll just verify the configuration exists
    const securityConfig = {
      csp: process.env.REACT_APP_CSP_NONCE_ENABLED === 'true',
      https: process.env.REACT_APP_ENABLE_HTTPS_ONLY === 'true',
    };

    if (this.config.environment === 'production' && !securityConfig.https) {
      throw new Error('HTTPS must be enabled in production');
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up deployment integration...');
    
    this.performance.destroy();
    this.errorMonitoring.destroy();
    
    console.log('✅ Cleanup complete');
  }
}

// CLI interface
const main = async () => {
  const environment = (process.argv[2] || process.env.NODE_ENV || 'development') as DeploymentConfig['environment'];
  const version = process.env.REACT_APP_VERSION || process.env.npm_package_version || '1.0.0';
  const buildTime = new Date().toISOString();

  const config: DeploymentConfig = {
    environment,
    version,
    buildTime,
    enableMonitoring: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true',
    performanceThresholds: {
      lcp: parseInt(process.env.REACT_APP_LCP_THRESHOLD || '2500'),
      fid: parseInt(process.env.REACT_APP_FID_THRESHOLD || '100'),
      cls: parseFloat(process.env.REACT_APP_CLS_THRESHOLD || '0.1'),
    },
  };

  const integration = new DeploymentIntegration(config);

  try {
    await integration.initialize();
    
    const isValid = await integration.validateDeployment();
    if (!isValid) {
      process.exit(1);
    }
    
    console.log(`🎉 Deployment integration complete for ${environment}`);
    
  } catch (error) {
    console.error('❌ Deployment integration failed:', error);
    process.exit(1);
  } finally {
    await integration.cleanup();
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { DeploymentIntegration };