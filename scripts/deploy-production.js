#!/usr/bin/env node

/**
 * Production Deployment Script
 * 
 * Orchestrates the complete production deployment process including:
 * - Build optimization and validation
 * - CDN deployment and configuration
 * - Error monitoring setup
 * - Performance monitoring initialization
 * - Health checks and verification
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import AdvancedBundleAnalyzer from '../client/scripts/advanced-bundle-analyzer.js';
import CDNDeployment from '../deployment/cdn-config.js';
import MonitoringDeployment from '../deployment/monitoring-dashboards.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ProductionDeployment {
  constructor(options = {}) {
    this.options = {
      environment: 'production',
      skipTests: false,
      skipBuild: false,
      dryRun: false,
      verbose: false,
      ...options
    };

    this.deploymentId = `deploy-${Date.now()}`;
    this.startTime = Date.now();
    this.results = {
      phases: {},
      metrics: {},
      errors: []
    };
  }

  async deploy() {
    console.log(`🚀 Starting production deployment: ${this.deploymentId}`);
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Dry run: ${this.options.dryRun ? 'Yes' : 'No'}`);

    try {
      // Phase 1: Pre-deployment validation
      await this.runPhase('validation', () => this.validateEnvironment());

      // Phase 2: Build optimization
      await this.runPhase('build', () => this.buildOptimized());

      // Phase 3: Bundle analysis
      await this.runPhase('analysis', () => this.analyzeBundles());

      // Phase 4: CDN deployment
      await this.runPhase('cdn', () => this.deployCDN());

      // Phase 5: Monitoring setup
      await this.runPhase('monitoring', () => this.setupMonitoring());

      // Phase 6: Application deployment
      await this.runPhase('application', () => this.deployApplication());

      // Phase 7: Post-deployment verification
      await this.runPhase('verification', () => this.verifyDeployment());

      // Phase 8: Cleanup and reporting
      await this.runPhase('cleanup', () => this.cleanup());

      console.log('✅ Production deployment completed successfully!');
      this.generateDeploymentReport();

    } catch (error) {
      console.error('❌ Production deployment failed:', error.message);
      this.results.errors.push({
        phase: this.currentPhase,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      await this.handleDeploymentFailure(error);
      throw error;
    }
  }

  async runPhase(name, fn) {
    this.currentPhase = name;
    const startTime = Date.now();
    
    console.log(`\n📋 Phase ${Object.keys(this.results.phases).length + 1}: ${name.toUpperCase()}`);
    console.log('─'.repeat(50));

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.results.phases[name] = {
        status: 'success',
        duration,
        result,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ ${name} completed in ${duration}ms`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.phases[name] = {
        status: 'failed',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      console.log(`❌ ${name} failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating deployment environment...');

    // Check required environment variables
    const requiredEnvVars = [
      'NODE_ENV',
      'SENTRY_DSN',
      'DATADOG_API_KEY',
      'CLOUDFLARE_API_TOKEN'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '20';
    if (!nodeVersion.startsWith(`v${requiredVersion}`)) {
      throw new Error(`Node.js ${requiredVersion} required, found ${nodeVersion}`);
    }

    // Check disk space
    const diskUsage = execSync('df -h /', { encoding: 'utf8' });
    console.log('Disk usage:', diskUsage.split('\n')[1]);

    // Validate network connectivity
    try {
      execSync('curl -f https://api.github.com/zen', { stdio: 'pipe' });
      console.log('✅ Network connectivity verified');
    } catch (error) {
      throw new Error('Network connectivity check failed');
    }

    // Run pre-deployment tests if not skipped
    if (!this.options.skipTests) {
      console.log('🧪 Running pre-deployment tests...');
      execSync('npm run test:ci', { stdio: 'inherit' });
    }

    return { nodeVersion, diskUsage, envVarsValid: true };
  }

  async buildOptimized() {
    console.log('🔨 Building optimized production bundles...');

    if (this.options.skipBuild) {
      console.log('⏭️ Skipping build (--skip-build flag)');
      return { skipped: true };
    }

    // Clean previous builds
    execSync('rm -rf client/dist server/dist', { stdio: 'inherit' });

    // Build shared packages first
    console.log('📦 Building shared packages...');
    execSync('pnpm run build:shared', { stdio: 'inherit' });

    // Build client with production optimizations
    console.log('🎨 Building client application...');
    const clientEnv = {
      ...process.env,
      NODE_ENV: 'production',
      ANALYZE: 'true',
      VITE_SENTRY_DSN: process.env.SENTRY_DSN,
      VITE_DATADOG_APPLICATION_ID: process.env.DATADOG_APPLICATION_ID,
      VITE_DATADOG_CLIENT_TOKEN: process.env.DATADOG_CLIENT_TOKEN,
      BUILD_VERSION: process.env.GITHUB_SHA || 'local',
      BUILD_TIME: new Date().toISOString()
    };

    execSync('npm run build', { 
      stdio: 'inherit', 
      cwd: 'client',
      env: clientEnv
    });

    // Build server
    console.log('⚙️ Building server application...');
    execSync('pnpm run build:server', { stdio: 'inherit' });

    // Verify builds
    const clientDistExists = existsSync('client/dist');
    const serverDistExists = existsSync('server/dist');

    if (!clientDistExists || !serverDistExists) {
      throw new Error('Build verification failed - missing dist directories');
    }

    return {
      clientBuild: clientDistExists,
      serverBuild: serverDistExists,
      buildTime: new Date().toISOString()
    };
  }

  async analyzeBundles() {
    console.log('📊 Analyzing bundle composition and performance...');

    const analyzer = new AdvancedBundleAnalyzer({
      distPath: join(__dirname, '../client/dist'),
      outputPath: join(__dirname, '../reports/deployment-analysis')
    });

    const analysis = await analyzer.analyze();

    // Check bundle size thresholds
    const maxTotalSize = 500 * 1024; // 500KB
    const maxGzipSize = 150 * 1024;  // 150KB

    if (analysis.totals.size > maxTotalSize) {
      console.warn(`⚠️ Total bundle size (${analyzer.formatBytes(analysis.totals.size)}) exceeds threshold`);
    }

    if (analysis.totals.gzipSize > maxGzipSize) {
      console.warn(`⚠️ Gzipped bundle size (${analyzer.formatBytes(analysis.totals.gzipSize)}) exceeds threshold`);
    }

    // Fail deployment if critical issues found
    const criticalIssues = analysis.recommendations.filter(r => r.severity === 'error');
    if (criticalIssues.length > 0) {
      throw new Error(`Critical bundle issues found: ${criticalIssues.map(i => i.message).join(', ')}`);
    }

    this.results.metrics.bundleAnalysis = {
      totalSize: analysis.totals.size,
      gzipSize: analysis.totals.gzipSize,
      bundleCount: analysis.bundles.length,
      recommendations: analysis.recommendations.length
    };

    return analysis;
  }

  async deployCDN() {
    console.log('🌐 Deploying CDN configuration...');

    if (this.options.dryRun) {
      console.log('🔍 Dry run: CDN deployment skipped');
      return { dryRun: true };
    }

    const cdnDeployment = new CDNDeployment('cloudflare', this.options.environment);
    
    // Deploy CDN configuration
    await cdnDeployment.deploy();

    // Set up performance monitoring
    const monitoring = await cdnDeployment.setupPerformanceMonitoring();

    // Invalidate cache for new deployment
    await cdnDeployment.invalidateCache(['/*']);

    return {
      provider: 'cloudflare',
      environment: this.options.environment,
      monitoring: monitoring.realUserMonitoring.enabled
    };
  }

  async setupMonitoring() {
    console.log('📈 Setting up monitoring and alerting...');

    if (this.options.dryRun) {
      console.log('🔍 Dry run: Monitoring setup skipped');
      return { dryRun: true };
    }

    const monitoringDeployment = new MonitoringDeployment('datadog');
    
    // Deploy monitoring dashboards
    await monitoringDeployment.deployDashboards();

    // Initialize error monitoring
    const errorMonitoringConfig = {
      dsn: process.env.SENTRY_DSN,
      environment: this.options.environment,
      release: process.env.BUILD_VERSION || 'unknown',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    };

    // Initialize performance monitoring
    const performanceMonitoringConfig = {
      reportingEndpoint: '/api/performance/metrics',
      batchSize: 10,
      reportingInterval: 30000
    };

    return {
      errorMonitoring: errorMonitoringConfig,
      performanceMonitoring: performanceMonitoringConfig,
      dashboards: ['system-health', 'user-experience', 'business-metrics']
    };
  }

  async deployApplication() {
    console.log('🚀 Deploying application to production...');

    if (this.options.dryRun) {
      console.log('🔍 Dry run: Application deployment skipped');
      return { dryRun: true };
    }

    // Build and push Docker image
    const imageTag = process.env.GITHUB_SHA || `local-${Date.now()}`;
    const imageName = `ghcr.io/chanuka/platform:${imageTag}`;

    console.log('🐳 Building Docker image...');
    execSync(`docker build -t ${imageName} .`, { stdio: 'inherit' });

    console.log('📤 Pushing Docker image...');
    execSync(`docker push ${imageName}`, { stdio: 'inherit' });

    // Deploy to Kubernetes (if configured)
    if (process.env.KUBE_CONFIG) {
      console.log('☸️ Deploying to Kubernetes...');
      execSync(`kubectl set image deployment/chanuka-app chanuka-app=${imageName}`, { 
        stdio: 'inherit',
        env: { ...process.env, KUBECONFIG: process.env.KUBE_CONFIG }
      });

      // Wait for rollout to complete
      execSync('kubectl rollout status deployment/chanuka-app --timeout=600s', {
        stdio: 'inherit',
        env: { ...process.env, KUBECONFIG: process.env.KUBE_CONFIG }
      });
    }

    return {
      image: imageName,
      deploymentTime: new Date().toISOString()
    };
  }

  async verifyDeployment() {
    console.log('✅ Verifying deployment health...');

    const baseUrl = this.getBaseUrl();
    const checks = [];

    // Health check
    try {
      const healthResponse = await this.httpCheck(`${baseUrl}/api/health`);
      checks.push({ name: 'health', status: 'pass', response: healthResponse });
    } catch (error) {
      checks.push({ name: 'health', status: 'fail', error: error.message });
    }

    // Homepage check
    try {
      const homepageResponse = await this.httpCheck(baseUrl);
      checks.push({ name: 'homepage', status: 'pass', response: homepageResponse });
    } catch (error) {
      checks.push({ name: 'homepage', status: 'fail', error: error.message });
    }

    // API functionality check
    try {
      const apiResponse = await this.httpCheck(`${baseUrl}/api/bills?limit=1`);
      checks.push({ name: 'api', status: 'pass', response: apiResponse });
    } catch (error) {
      checks.push({ name: 'api', status: 'fail', error: error.message });
    }

    // Performance check with Lighthouse
    if (!this.options.dryRun) {
      try {
        console.log('🔍 Running Lighthouse performance audit...');
        const lighthouseResult = execSync(`npx lighthouse ${baseUrl} --output=json --quiet`, { 
          encoding: 'utf8' 
        });
        const lighthouse = JSON.parse(lighthouseResult);
        
        checks.push({
          name: 'performance',
          status: lighthouse.lhr.categories.performance.score > 0.8 ? 'pass' : 'warn',
          score: lighthouse.lhr.categories.performance.score,
          metrics: {
            lcp: lighthouse.lhr.audits['largest-contentful-paint'].numericValue,
            fid: lighthouse.lhr.audits['max-potential-fid'].numericValue,
            cls: lighthouse.lhr.audits['cumulative-layout-shift'].numericValue
          }
        });
      } catch (error) {
        checks.push({ name: 'performance', status: 'fail', error: error.message });
      }
    }

    // Check for any failed verifications
    const failures = checks.filter(check => check.status === 'fail');
    if (failures.length > 0) {
      throw new Error(`Deployment verification failed: ${failures.map(f => f.name).join(', ')}`);
    }

    return { checks, verificationTime: new Date().toISOString() };
  }

  async cleanup() {
    console.log('🧹 Cleaning up deployment artifacts...');

    // Clean up temporary files
    execSync('rm -rf /tmp/deployment-*', { stdio: 'pipe' });

    // Archive deployment logs
    const logFile = `deployment-${this.deploymentId}.log`;
    writeFileSync(logFile, JSON.stringify(this.results, null, 2));

    return { logFile, cleanupTime: new Date().toISOString() };
  }

  async handleDeploymentFailure(error) {
    console.log('🚨 Handling deployment failure...');

    // Send failure notification
    if (process.env.SLACK_WEBHOOK) {
      try {
        await this.sendSlackNotification({
          color: 'danger',
          title: 'Production Deployment Failed',
          text: `Deployment ${this.deploymentId} failed in phase: ${this.currentPhase}`,
          fields: [
            { title: 'Error', value: error.message, short: false },
            { title: 'Environment', value: this.options.environment, short: true },
            { title: 'Build', value: process.env.GITHUB_SHA || 'local', short: true }
          ]
        });
      } catch (notificationError) {
        console.warn('Failed to send failure notification:', notificationError.message);
      }
    }

    // Create incident report
    const incidentReport = {
      deploymentId: this.deploymentId,
      failurePhase: this.currentPhase,
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: this.options.environment,
      results: this.results
    };

    writeFileSync(`incident-${this.deploymentId}.json`, JSON.stringify(incidentReport, null, 2));
    console.log(`📄 Incident report saved: incident-${this.deploymentId}.json`);
  }

  generateDeploymentReport() {
    const totalDuration = Date.now() - this.startTime;
    const report = {
      deploymentId: this.deploymentId,
      environment: this.options.environment,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      totalDuration,
      phases: this.results.phases,
      metrics: this.results.metrics,
      summary: {
        phasesCompleted: Object.keys(this.results.phases).length,
        phasesSuccessful: Object.values(this.results.phases).filter(p => p.status === 'success').length,
        totalErrors: this.results.errors.length
      }
    };

    const reportFile = `deployment-report-${this.deploymentId}.json`;
    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log('\n📊 DEPLOYMENT SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Deployment ID: ${this.deploymentId}`);
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Phases Completed: ${report.summary.phasesCompleted}`);
    console.log(`Bundle Size: ${this.results.metrics.bundleAnalysis ? 
      this.formatBytes(this.results.metrics.bundleAnalysis.gzipSize) : 'N/A'}`);
    console.log(`Report: ${reportFile}`);
  }

  getBaseUrl() {
    const urls = {
      production: 'https://chanuka.ke',
      'pre-production': 'https://pre-prod.chanuka.ke',
      staging: 'https://staging.chanuka.ke'
    };
    return urls[this.options.environment] || 'http://localhost:5000';
  }

  async httpCheck(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    };
  }

  async sendSlackNotification(payload) {
    if (!process.env.SLACK_WEBHOOK) return;

    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [payload]
      })
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--environment':
      case '-e':
        options.environment = args[++i];
        break;
      case '--skip-tests':
        options.skipTests = true;
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node deploy-production.js [options]

Options:
  -e, --environment <env>  Target environment (staging|pre-production|production)
  --skip-tests            Skip test execution
  --skip-build            Skip build process
  --dry-run               Simulate deployment without making changes
  --verbose               Enable verbose logging
  -h, --help              Show this help message

Examples:
  node deploy-production.js --environment staging
  node deploy-production.js --environment production --dry-run
  node deploy-production.js --skip-tests --skip-build
        `);
        process.exit(0);
    }
  }

  const deployment = new ProductionDeployment(options);
  
  deployment.deploy()
    .then(() => {
      console.log('\n🎉 Deployment completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deployment failed:', error.message);
      process.exit(1);
    });
}

export default ProductionDeployment;