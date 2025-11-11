#!/usr/bin/env node

/**
 * Advanced Bundle Analyzer for Production Deployment
 * 
 * Provides comprehensive bundle analysis includingis with:
 * - Size optimization recommendations
 * - Performance impact assessment
 * - CDN optimization strategies
 * - Real-time monitoring integration
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { gzipSync, brotliCompressSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AdvancedBundleAnalyzer {
  constructor(options = {}) {
    this.options = {
      distPath: join(__dirname, '../dist'),
      outputPath: join(__dirname, '../reports/bundle-analysis'),
      thresholds: {
        mainBundle: 150 * 1024, // 150KB
        chunkBundle: 100 * 1024, // 100KB
        totalSize: 500 * 1024, // 500KB
        gzipRatio: 0.3, // 30% compression minimum
        brotliRatio: 0.25, // 25% compression minimum
      },
      cdnOptimization: true,
      performanceMetrics: true,
      ...options
    };

    this.results = {
      bundles: [],
      recommendations: [],
      performance: {},
      cdn: {},
      monitoring: {}
    };
  }

  async analyze() {
    console.log('🔍 Starting advanced bundle analysis...');

    try {
      await this.ensureOutputDirectory();
      await this.analyzeBundles();
      await this.analyzeCompression();
      await this.generateCDNOptimizations();
      await this.assessPerformanceImpact();
      await this.generateMonitoringConfig();
      await this.generateRecommendations();
      await this.generateReports();

      console.log('✅ Bundle analysis completed successfully');
      return this.results;
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      throw error;
    }
  }

  async ensureOutputDirectory() {
    if (!existsSync(this.options.outputPath)) {
      mkdirSync(this.options.outputPath, { recursive: true });
    }
  }

  async analyzeBundles() {
    console.log('📦 Analyzing bundle composition...');

    const distPath = this.options.distPath;
    if (!existsSync(distPath)) {
      throw new Error(`Distribution directory not found: ${distPath}`);
    }

    // Find all JavaScript bundles
    const jsFiles = this.findFiles(distPath, /\.js$/);
    const cssFiles = this.findFiles(distPath, /\.css$/);

    for (const file of jsFiles) {
      const bundle = await this.analyzeSingleBundle(file, 'javascript');
      this.results.bundles.push(bundle);
    }

    for (const file of cssFiles) {
      const bundle = await this.analyzeSingleBundle(file, 'css');
      this.results.bundles.push(bundle);
    }

    // Calculate totals
    this.results.totals = {
      size: this.results.bundles.reduce((sum, b) => sum + b.size, 0),
      gzipSize: this.results.bundles.reduce((sum, b) => sum + b.gzipSize, 0),
      brotliSize: this.results.bundles.reduce((sum, b) => sum + b.brotliSize, 0),
      count: this.results.bundles.length
    };
  }

  async analyzeSingleBundle(filePath, type) {
    const content = readFileSync(filePath);
    const size = content.length;
    const gzipSize = gzipSync(content).length;
    const brotliSize = brotliCompressSync(content).length;

    const bundle = {
      name: this.getRelativePath(filePath),
      type,
      size,
      gzipSize,
      brotliSize,
      gzipRatio: gzipSize / size,
      brotliRatio: brotliSize / size,
      sizeFormatted: this.formatBytes(size),
      gzipSizeFormatted: this.formatBytes(gzipSize),
      brotliSizeFormatted: this.formatBytes(brotliSize),
      path: filePath
    };

    // Analyze bundle content for optimization opportunities
    if (type === 'javascript') {
      bundle.analysis = await this.analyzeJavaScriptBundle(content.toString());
    }

    return bundle;
  }

  async analyzeJavaScriptBundle(content) {
    const analysis = {
      hasSourceMap: content.includes('//# sourceMappingURL='),
      hasConsoleStatements: /console\.(log|info|debug|warn)/.test(content),
      hasDebugCode: /debugger|__DEV__|development/.test(content),
      duplicateCode: this.findDuplicatePatterns(content),
      largeStrings: this.findLargeStrings(content),
      unusedExports: this.findUnusedExports(content)
    };

    return analysis;
  }

  async analyzeCompression() {
    console.log('🗜️ Analyzing compression efficiency...');

    for (const bundle of this.results.bundles) {
      // Check compression thresholds
      if (bundle.gzipRatio > this.options.thresholds.gzipRatio) {
        this.results.recommendations.push({
          type: 'compression',
          severity: 'warning',
          bundle: bundle.name,
          message: `Poor gzip compression ratio: ${(bundle.gzipRatio * 100).toFixed(1)}%`,
          suggestion: 'Consider minifying code further or removing redundant content'
        });
      }

      if (bundle.brotliRatio > this.options.thresholds.brotliRatio) {
        this.results.recommendations.push({
          type: 'compression',
          severity: 'info',
          bundle: bundle.name,
          message: `Brotli compression could be improved: ${(bundle.brotliRatio * 100).toFixed(1)}%`,
          suggestion: 'Enable Brotli compression on your CDN/server'
        });
      }
    }
  }

  async generateCDNOptimizations() {
    console.log('🌐 Generating CDN optimization strategies...');

    this.results.cdn = {
      cacheStrategies: this.generateCacheStrategies(),
      compressionConfig: this.generateCompressionConfig(),
      edgeOptimizations: this.generateEdgeOptimizations(),
      preloadHints: this.generatePreloadHints()
    };
  }

  generateCacheStrategies() {
    const strategies = [];

    // Static assets with hash-based names can be cached indefinitely
    const hashedAssets = this.results.bundles.filter(b => 
      /\-[a-f0-9]{8,}\.(js|css)$/.test(b.name)
    );

    if (hashedAssets.length > 0) {
      strategies.push({
        pattern: '*.{js,css}',
        cacheControl: 'public, max-age=31536000, immutable',
        description: 'Hash-based assets can be cached for 1 year'
      });
    }

    // HTML files should have short cache times
    strategies.push({
      pattern: '*.html',
      cacheControl: 'public, max-age=300, must-revalidate',
      description: 'HTML files cached for 5 minutes with revalidation'
    });

    // API responses
    strategies.push({
      pattern: '/api/*',
      cacheControl: 'private, no-cache',
      description: 'API responses not cached by default'
    });

    return strategies;
  }

  generateCompressionConfig() {
    return {
      gzip: {
        enabled: true,
        level: 6,
        minSize: 1024,
        types: ['text/plain', 'text/css', 'application/javascript', 'application/json']
      },
      brotli: {
        enabled: true,
        quality: 6,
        minSize: 1024,
        types: ['text/plain', 'text/css', 'application/javascript', 'application/json']
      }
    };
  }

  generateEdgeOptimizations() {
    return {
      http2Push: this.generateHttp2PushHints(),
      prefetch: this.generatePrefetchHints(),
      preconnect: this.generatePreconnectHints()
    };
  }

  generateHttp2PushHints() {
    // Critical CSS and JS should be pushed
    const criticalAssets = this.results.bundles
      .filter(b => b.name.includes('main') || b.name.includes('app'))
      .slice(0, 3); // Limit to avoid over-pushing

    return criticalAssets.map(asset => ({
      path: `/${asset.name}`,
      type: asset.type === 'javascript' ? 'script' : 'style',
      priority: 'high'
    }));
  }

  generatePrefetchHints() {
    // Non-critical chunks can be prefetched
    const nonCriticalAssets = this.results.bundles
      .filter(b => !b.name.includes('main') && !b.name.includes('app'))
      .slice(0, 5);

    return nonCriticalAssets.map(asset => ({
      path: `/${asset.name}`,
      type: asset.type === 'javascript' ? 'script' : 'style',
      priority: 'low'
    }));
  }

  generatePreconnectHints() {
    return [
      { href: 'https://fonts.googleapis.com', crossorigin: true },
      { href: 'https://api.chanuka.ke', crossorigin: true },
      { href: 'https://cdn.chanuka.ke', crossorigin: false }
    ];
  }

  generatePreloadHints() {
    // Critical resources should be preloaded
    const criticalAssets = this.results.bundles
      .filter(b => b.name.includes('main') || b.size > 50 * 1024)
      .slice(0, 3);

    return criticalAssets.map(asset => ({
      href: `/${asset.name}`,
      as: asset.type === 'javascript' ? 'script' : 'style',
      crossorigin: asset.type === 'javascript' ? 'anonymous' : undefined
    }));
  }

  async assessPerformanceImpact() {
    console.log('⚡ Assessing performance impact...');

    const totalSize = this.results.totals.size;
    const gzipSize = this.results.totals.gzipSize;

    // Estimate load times for different connection speeds
    const connectionSpeeds = {
      '3G': 1.6 * 1024 * 1024 / 8, // 1.6 Mbps in bytes/sec
      '4G': 10 * 1024 * 1024 / 8,  // 10 Mbps in bytes/sec
      'WiFi': 50 * 1024 * 1024 / 8, // 50 Mbps in bytes/sec
      'Fiber': 100 * 1024 * 1024 / 8 // 100 Mbps in bytes/sec
    };

    this.results.performance = {
      loadTimes: {},
      metrics: {
        totalSize: this.formatBytes(totalSize),
        gzipSize: this.formatBytes(gzipSize),
        compressionSavings: this.formatBytes(totalSize - gzipSize),
        compressionRatio: ((1 - gzipSize / totalSize) * 100).toFixed(1) + '%'
      }
    };

    for (const [name, speed] of Object.entries(connectionSpeeds)) {
      const loadTime = (gzipSize / speed * 1000).toFixed(0); // in milliseconds
      this.results.performance.loadTimes[name] = `${loadTime}ms`;
    }

    // Performance recommendations
    if (totalSize > this.options.thresholds.totalSize) {
      this.results.recommendations.push({
        type: 'performance',
        severity: 'error',
        message: `Total bundle size exceeds threshold: ${this.formatBytes(totalSize)}`,
        suggestion: 'Consider code splitting or removing unused dependencies'
      });
    }
  }

  async generateMonitoringConfig() {
    console.log('📊 Generating monitoring configuration...');

    this.results.monitoring = {
      sentry: this.generateSentryConfig(),
      datadog: this.generateDatadogConfig(),
      webVitals: this.generateWebVitalsConfig(),
      customMetrics: this.generateCustomMetricsConfig()
    };
  }

  generateSentryConfig() {
    return {
      dsn: '${SENTRY_DSN}',
      environment: '${NODE_ENV}',
      release: '${BUILD_VERSION}',
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      beforeSend: 'filterSensitiveData',
      integrations: [
        'BrowserTracing',
        'Replay'
      ],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    };
  }

  generateDatadogConfig() {
    return {
      applicationId: '${DD_APPLICATION_ID}',
      clientToken: '${DD_CLIENT_TOKEN}',
      site: 'datadoghq.com',
      service: 'chanuka-client',
      env: '${NODE_ENV}',
      version: '${BUILD_VERSION}',
      sessionSampleRate: 100,
      sessionReplaySampleRate: 20,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: 'mask-user-input'
    };
  }

  generateWebVitalsConfig() {
    return {
      thresholds: {
        LCP: 2500, // Largest Contentful Paint
        FID: 100,  // First Input Delay
        CLS: 0.1,  // Cumulative Layout Shift
        FCP: 1800, // First Contentful Paint
        TTFB: 800  // Time to First Byte
      },
      reportingEndpoint: '/api/web-vitals',
      sampleRate: 0.1
    };
  }

  generateCustomMetricsConfig() {
    return {
      bundleLoadTime: {
        name: 'bundle_load_time',
        description: 'Time taken to load JavaScript bundles',
        unit: 'milliseconds'
      },
      chunkLoadFailure: {
        name: 'chunk_load_failure',
        description: 'Failed chunk loading attempts',
        unit: 'count'
      },
      cacheHitRate: {
        name: 'cache_hit_rate',
        description: 'CDN cache hit rate for static assets',
        unit: 'percentage'
      }
    };
  }

  async generateRecommendations() {
    console.log('💡 Generating optimization recommendations...');

    // Bundle size recommendations
    const largeBundles = this.results.bundles.filter(b => 
      b.size > this.options.thresholds.chunkBundle
    );

    for (const bundle of largeBundles) {
      this.results.recommendations.push({
        type: 'optimization',
        severity: 'warning',
        bundle: bundle.name,
        message: `Large bundle detected: ${bundle.sizeFormatted}`,
        suggestion: 'Consider code splitting or lazy loading'
      });
    }

    // Compression recommendations
    const poorCompression = this.results.bundles.filter(b => 
      b.gzipRatio > 0.4
    );

    for (const bundle of poorCompression) {
      this.results.recommendations.push({
        type: 'compression',
        severity: 'info',
        bundle: bundle.name,
        message: `Poor compression ratio: ${(bundle.gzipRatio * 100).toFixed(1)}%`,
        suggestion: 'Check for repeated code patterns or large embedded data'
      });
    }

    // Performance recommendations
    if (this.results.totals.gzipSize > 300 * 1024) {
      this.results.recommendations.push({
        type: 'performance',
        severity: 'warning',
        message: 'Total gzipped size exceeds 300KB',
        suggestion: 'Implement progressive loading and code splitting'
      });
    }
  }

  async generateReports() {
    console.log('📄 Generating analysis reports...');

    // JSON report for programmatic access
    const jsonReport = {
      timestamp: new Date().toISOString(),
      version: process.env.BUILD_VERSION || 'unknown',
      ...this.results
    };

    writeFileSync(
      join(this.options.outputPath, 'bundle-analysis.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Markdown report for human consumption
    const markdownReport = this.generateMarkdownReport();
    writeFileSync(
      join(this.options.outputPath, 'bundle-analysis.md'),
      markdownReport
    );

    // HTML report with interactive visualizations
    const htmlReport = this.generateHtmlReport();
    writeFileSync(
      join(this.options.outputPath, 'bundle-analysis.html'),
      htmlReport
    );

    console.log(`📊 Reports generated in: ${this.options.outputPath}`);
  }

  generateMarkdownReport() {
    const { bundles, totals, performance, recommendations } = this.results;

    return `# Bundle Analysis Report

Generated: ${new Date().toISOString()}
Build Version: ${process.env.BUILD_VERSION || 'unknown'}

## Summary

- **Total Bundles**: ${bundles.length}
- **Total Size**: ${this.formatBytes(totals.size)}
- **Gzipped Size**: ${this.formatBytes(totals.gzipSize)}
- **Compression Savings**: ${performance.metrics.compressionSavings} (${performance.metrics.compressionRatio})

## Performance Impact

### Load Times (Gzipped)
${Object.entries(performance.loadTimes)
  .map(([connection, time]) => `- **${connection}**: ${time}`)
  .join('\n')}

## Bundle Breakdown

| Bundle | Type | Size | Gzipped | Compression |
|--------|------|------|---------|-------------|
${bundles.map(b => 
  `| ${b.name} | ${b.type} | ${b.sizeFormatted} | ${b.gzipSizeFormatted} | ${(b.gzipRatio * 100).toFixed(1)}% |`
).join('\n')}

## Recommendations

${recommendations.length === 0 ? 'No recommendations - bundle is well optimized! 🎉' : 
  recommendations.map(r => 
    `### ${r.severity.toUpperCase()}: ${r.message}\n${r.suggestion}\n`
  ).join('\n')
}

## CDN Configuration

### Cache Strategies
${this.results.cdn.cacheStrategies.map(s => 
  `- **${s.pattern}**: \`${s.cacheControl}\`\n  ${s.description}`
).join('\n')}

### Preload Hints
${this.results.cdn.preloadHints.map(h => 
  `- \`<link rel="preload" href="${h.href}" as="${h.as}"${h.crossorigin ? ' crossorigin' : ''}>\``
).join('\n')}
`;
  }

  generateHtmlReport() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Analysis Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; font-weight: 600; }
        .recommendation { padding: 15px; margin: 10px 0; border-radius: 6px; }
        .recommendation.error { background-color: #fef2f2; border-left: 4px solid #ef4444; }
        .recommendation.warning { background-color: #fffbeb; border-left: 4px solid #f59e0b; }
        .recommendation.info { background-color: #eff6ff; border-left: 4px solid #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Bundle Analysis Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        
        <div class="grid">
            <div class="card metric">
                <div class="metric-value">${this.results.bundles.length}</div>
                <div class="metric-label">Total Bundles</div>
            </div>
            <div class="card metric">
                <div class="metric-value">${this.formatBytes(this.results.totals.size)}</div>
                <div class="metric-label">Total Size</div>
            </div>
            <div class="card metric">
                <div class="metric-value">${this.formatBytes(this.results.totals.gzipSize)}</div>
                <div class="metric-label">Gzipped Size</div>
            </div>
            <div class="card metric">
                <div class="metric-value">${this.results.performance.metrics.compressionRatio}</div>
                <div class="metric-label">Compression Ratio</div>
            </div>
        </div>

        <div class="card">
            <h2>Bundle Breakdown</h2>
            <canvas id="bundleChart" width="400" height="200"></canvas>
        </div>

        <div class="card">
            <h2>Bundle Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Bundle</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Gzipped</th>
                        <th>Compression</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.results.bundles.map(b => `
                        <tr>
                            <td>${b.name}</td>
                            <td>${b.type}</td>
                            <td>${b.sizeFormatted}</td>
                            <td>${b.gzipSizeFormatted}</td>
                            <td>${(b.gzipRatio * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${this.results.recommendations.length > 0 ? `
        <div class="card">
            <h2>Recommendations</h2>
            ${this.results.recommendations.map(r => `
                <div class="recommendation ${r.severity}">
                    <strong>${r.message}</strong><br>
                    ${r.suggestion}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>

    <script>
        const ctx = document.getElementById('bundleChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(this.results.bundles.map(b => b.name))},
                datasets: [{
                    data: ${JSON.stringify(this.results.bundles.map(b => b.gzipSize))},
                    backgroundColor: [
                        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const bytes = context.raw;
                                return context.label + ': ' + (bytes / 1024).toFixed(1) + ' KB';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }

  // Utility methods
  findFiles(dir, pattern) {
    const files = [];
    const items = require('fs').readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...this.findFiles(fullPath, pattern));
      } else if (pattern.test(item.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  getRelativePath(filePath) {
    return filePath.replace(this.options.distPath + '/', '');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  findDuplicatePatterns(content) {
    // Simple duplicate detection - could be enhanced
    const lines = content.split('\n');
    const duplicates = [];
    const seen = new Map();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 50) {
        if (seen.has(trimmed)) {
          duplicates.push(trimmed.substring(0, 100) + '...');
        } else {
          seen.set(trimmed, true);
        }
      }
    }

    return duplicates.slice(0, 5); // Return first 5 duplicates
  }

  findLargeStrings(content) {
    const matches = content.match(/"[^"]{100,}"/g) || [];
    return matches.slice(0, 5).map(s => s.substring(0, 100) + '...');
  }

  findUnusedExports(content) {
    // Basic unused export detection
    const exports = content.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g) || [];
    const imports = content.match(/import\s+.*?\s+from/g) || [];
    
    // This is a simplified check - real implementation would be more sophisticated
    return exports.slice(0, 3);
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new AdvancedBundleAnalyzer();
  
  analyzer.analyze()
    .then(results => {
      console.log('\n📊 Analysis Summary:');
      console.log(`Total Size: ${analyzer.formatBytes(results.totals.size)}`);
      console.log(`Gzipped: ${analyzer.formatBytes(results.totals.gzipSize)}`);
      console.log(`Recommendations: ${results.recommendations.length}`);
      
      if (results.recommendations.some(r => r.severity === 'error')) {
        console.log('\n❌ Critical issues found - check the report for details');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

export default AdvancedBundleAnalyzer;