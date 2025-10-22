#!/usr/bin/env node

/**
 * Advanced Bundle Analyzer Script
 * Provides comprehensive bundle analysis with recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple logger for standalone script
const logger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args)
};

class BundleAnalyzer {
  constructor() {
    this.distPath = path.join(process.cwd(), 'dist', 'public');
    this.assetsPath = path.join(this.distPath, 'assets');
    this.analysis = {
      totalSize: 0,
      gzippedSize: 0,
      files: [],
      chunks: [],
      duplicates: [],
      recommendations: [],
      dependencies: [],
      unusedCode: [],
      performanceMetrics: {},
      timestamp: new Date().toISOString()
    };
  }

  async analyze() {
    logger.info('🔍 Starting bundle analysis...\n', { component: 'Chanuka' });

    try {
      // Check if build exists
      if (!fs.existsSync(this.distPath)) {
        logger.error('❌ Build directory not found. Please run "npm run build" first.', { component: 'Chanuka' });
        process.exit(1);
      }

      // Analyze files
      await this.analyzeFiles();

      // Parse dependency tree
      await this.parseDependencyTree();

      // Detect unused code
      await this.detectUnusedCode();

      // Detect duplicates
      await this.detectDuplicates();

      // Calculate performance metrics
      this.calculatePerformanceMetrics();

      // Generate recommendations
      this.generateRecommendations();
      
      // Display results
      this.displayResults();
      
      // Save analysis
      this.saveAnalysis();
      
      // Open bundle analyzer if requested
      if (process.argv.includes('--open')) {
        this.openBundleAnalyzer();
      }

    } catch (error) {
      logger.error('❌ Analysis failed:', { component: 'Chanuka' }, error.message);
      process.exit(1);
    }
  }

  async analyzeFiles() {
    logger.info('📁 Analyzing files...', { component: 'Chanuka' });

    const analyzeDirectory = (dir, basePath = '') => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.join(basePath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          analyzeDirectory(filePath, relativePath);
        } else {
          const size = stats.size;
          const gzippedSize = this.getGzippedSize(filePath);
          
          const fileInfo = {
            path: relativePath,
            size,
            gzippedSize,
            compressionRatio: gzippedSize / size,
            type: this.getFileType(file),
            isChunk: file.includes('chunk') || file.includes('vendor'),
            hash: this.extractHash(file)
          };

          this.analysis.files.push(fileInfo);
          this.analysis.totalSize += size;
          this.analysis.gzippedSize += gzippedSize;

          if (fileInfo.isChunk) {
            this.analysis.chunks.push(fileInfo);
          }
        }
      });
    };

    analyzeDirectory(this.assetsPath);
    
    // Sort files by size
    this.analysis.files.sort((a, b) => b.size - a.size);
    this.analysis.chunks.sort((a, b) => b.size - a.size);
  }

  getGzippedSize(filePath) {
    try {
      // Try to find .gz version first
      const gzPath = filePath + '.gz';
      if (fs.existsSync(gzPath)) {
        return fs.statSync(gzPath).size;
      }

      // Estimate gzipped size (rough approximation)
      const content = fs.readFileSync(filePath);
      const zlib = require('zlib');
      return zlib.gzipSync(content).length;
    } catch (error) {
      // Fallback to rough estimation
      return Math.floor(fs.statSync(filePath).size * 0.3);
    }
  }

  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.js': return 'javascript';
      case '.css': return 'stylesheet';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.svg':
      case '.webp':
        return 'image';
      case '.woff':
      case '.woff2':
      case '.ttf':
      case '.otf':
        return 'font';
      default: return 'other';
    }
  }

  extractHash(filename) {
    const match = filename.match(/[.-]([a-f0-9]{8,})[.-]/);
    return match ? match[1] : null;
  }

  async parseDependencyTree() {
    logger.info('🔍 Parsing dependency tree...', { component: 'Chanuka' });

    try {
      // Try to read package.json for dependency info
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Analyze each dependency
        for (const [name, version] of Object.entries(allDeps)) {
          try {
            const depPath = path.join(process.cwd(), 'node_modules', name);
            if (fs.existsSync(depPath)) {
              const depSize = this.getDirectorySize(depPath);
              this.analysis.dependencies.push({
                name,
                version,
                size: depSize,
                gzippedSize: Math.floor(depSize * 0.3), // Rough estimate
                isDev: !!packageJson.devDependencies?.[name]
              });
            }
          } catch (error) {
            // Skip problematic dependencies
          }
        }

        // Sort by size
        this.analysis.dependencies.sort((a, b) => b.size - a.size);
      }
    } catch (error) {
      logger.warn('⚠️ Could not parse dependency tree:', { component: 'Chanuka' }, error.message);
    }
  }

  getDirectorySize(dirPath) {
    let totalSize = 0;

    function calculateSize(itemPath) {
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        const items = fs.readdirSync(itemPath);
        items.forEach(item => {
          calculateSize(path.join(itemPath, item));
        });
      } else {
        totalSize += stats.size;
      }
    }

    calculateSize(dirPath);
    return totalSize;
  }

  async detectUnusedCode() {
    logger.info('🔍 Detecting unused code...', { component: 'Chanuka' });

    try {
      // This is a simplified approach - in a real implementation,
      // you'd use tools like @typescript-eslint/no-unused-vars or similar
      const unusedPatterns = [
        /console\.(log|warn|error|info|debug)/g,
        /debugger/g,
        // Add more patterns as needed
      ];

      this.analysis.unusedCode = [];

      // Scan JavaScript files for potential unused code
      const jsFiles = this.analysis.files.filter(f => f.type === 'javascript');
      for (const file of jsFiles) {
        const filePath = path.join(this.assetsPath, file.path);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const issues = [];

          unusedPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
              issues.push({
                type: pattern.source.includes('console') ? 'console-statement' : 'debugger-statement',
                count: matches.length,
                pattern: pattern.source
              });
            }
          });

          if (issues.length > 0) {
            this.analysis.unusedCode.push({
              file: file.path,
              size: file.size,
              issues
            });
          }
        }
      }
    } catch (error) {
      logger.warn('⚠️ Could not detect unused code:', { component: 'Chanuka' }, error.message);
    }
  }

  calculatePerformanceMetrics() {
    logger.info('📊 Calculating performance metrics...', { component: 'Chanuka' });

    const metrics = {
      totalSize: this.analysis.totalSize,
      gzippedSize: this.analysis.gzippedSize,
      compressionRatio: this.analysis.gzippedSize / this.analysis.totalSize,
      fileCount: this.analysis.files.length,
      chunkCount: this.analysis.chunks.length,
      largestFile: this.analysis.files[0]?.size || 0,
      averageFileSize: this.analysis.totalSize / this.analysis.files.length,
      dependencyCount: this.analysis.dependencies.length,
      unusedCodeSize: this.analysis.unusedCode.reduce((sum, item) => sum + item.size, 0),
      duplicateSize: this.analysis.duplicates.reduce((sum, dup) => sum + dup.wastedSize, 0)
    };

    // Calculate bundle efficiency score
    metrics.efficiencyScore = this.calculateEfficiencyScore(metrics);

    this.analysis.performanceMetrics = metrics;
  }

  calculateEfficiencyScore(metrics) {
    let score = 100;

    // Penalize large bundles
    if (metrics.totalSize > 5 * 1024 * 1024) score -= 40; // > 5MB
    else if (metrics.totalSize > 2 * 1024 * 1024) score -= 20; // > 2MB
    else if (metrics.totalSize > 1 * 1024 * 1024) score -= 10; // > 1MB

    // Penalize poor compression
    if (metrics.compressionRatio > 0.8) score -= 15;
    else if (metrics.compressionRatio > 0.6) score -= 8;

    // Penalize too many small chunks (inefficient splitting)
    if (metrics.chunkCount > 20) score -= 10;
    else if (metrics.chunkCount < 3) score -= 5;

    // Penalize duplicates
    if (metrics.duplicateSize > 100 * 1024) score -= 15; // > 100KB wasted

    // Penalize unused code
    if (metrics.unusedCodeSize > 50 * 1024) score -= 10; // > 50KB unused

    return Math.max(0, score);
  }

  async detectDuplicates() {
    logger.info('🔍 Detecting duplicate modules...', { component: 'Chanuka' });

    const moduleNames = new Map();
    const duplicates = [];

    this.analysis.files.forEach(file => {
      if (file.type === 'javascript') {
        // Extract module name (remove hash and extension)
        const baseName = path.basename(file.path)
          .replace(/[.-][a-f0-9]{8,}/, '')
          .replace(/\.(js|ts|tsx?)$/, '');

        if (moduleNames.has(baseName)) {
          const existing = moduleNames.get(baseName);
          duplicates.push({
            name: baseName,
            files: [existing, file],
            wastedSize: Math.min(existing.size, file.size)
          });
        } else {
          moduleNames.set(baseName, file);
        }
      }
    });

    this.analysis.duplicates = duplicates;
  }

  generateRecommendations() {
    logger.info('💡 Generating recommendations...', { component: 'Chanuka' });

    const recommendations = [];
    const metrics = this.analysis.performanceMetrics;

    // Bundle size recommendations
    const totalSizeMB = metrics.totalSize / (1024 * 1024);
    if (totalSizeMB > 2) {
      recommendations.push({
        type: 'bundle-size',
        priority: 'high',
        message: `Total bundle size (${totalSizeMB.toFixed(2)}MB) exceeds recommended 2MB limit`,
        suggestion: 'Consider code splitting, tree shaking, or removing unused dependencies',
        impact: 'High',
        effort: 'Medium'
      });
    }

    // JavaScript size recommendations
    const jsFiles = this.analysis.files.filter(f => f.type === 'javascript');
    const totalJsSize = jsFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
    if (totalJsSize > 1) {
      recommendations.push({
        type: 'javascript-size',
        priority: 'high',
        message: `JavaScript bundle size (${totalJsSize.toFixed(2)}MB) exceeds recommended 1MB limit`,
        suggestion: 'Implement route-based code splitting and lazy loading',
        impact: 'High',
        effort: 'Medium'
      });
    }

    // Chunk recommendations
    if (metrics.chunkCount < 3) {
      recommendations.push({
        type: 'code-splitting',
        priority: 'medium',
        message: `Only ${metrics.chunkCount} chunks detected - insufficient code splitting`,
        suggestion: 'Implement more aggressive code splitting for better caching',
        impact: 'Medium',
        effort: 'Low'
      });
    } else if (metrics.chunkCount > 20) {
      recommendations.push({
        type: 'chunk-consolidation',
        priority: 'medium',
        message: `${metrics.chunkCount} chunks detected - too many small chunks`,
        suggestion: 'Consolidate small chunks to reduce HTTP requests',
        impact: 'Medium',
        effort: 'Low'
      });
    }

    // Compression recommendations
    if (metrics.compressionRatio > 0.7) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        message: `Average compression ratio (${(metrics.compressionRatio * 100).toFixed(1)}%) could be improved`,
        suggestion: 'Enable Brotli compression and optimize asset formats',
        impact: 'Medium',
        effort: 'Low'
      });
    }

    // Large file recommendations
    const largeFiles = this.analysis.files.filter(f => f.size > 500 * 1024); // 500KB
    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'large-files',
        priority: 'medium',
        message: `${largeFiles.length} files exceed 500KB`,
        suggestion: 'Consider splitting large files or lazy loading them',
        impact: 'Medium',
        effort: 'High',
        files: largeFiles.map(f => ({ path: f.path, size: this.formatBytes(f.size) }))
      });
    }

    // Duplicate recommendations
    if (metrics.duplicateSize > 0) {
      recommendations.push({
        type: 'duplicates',
        priority: 'high',
        message: `${this.analysis.duplicates.length} duplicate modules found, wasting ${this.formatBytes(metrics.duplicateSize)}`,
        suggestion: 'Configure webpack/vite to deduplicate modules',
        impact: 'High',
        effort: 'Low',
        duplicates: this.analysis.duplicates
      });
    }

    // Unused code recommendations
    if (metrics.unusedCodeSize > 0) {
      recommendations.push({
        type: 'unused-code',
        priority: 'medium',
        message: `${this.formatBytes(metrics.unusedCodeSize)} of potentially unused code detected`,
        suggestion: 'Remove console statements and debugger calls in production',
        impact: 'Low',
        effort: 'Low',
        unusedCode: this.analysis.unusedCode
      });
    }

    // Dependency optimization recommendations
    const largeDeps = this.analysis.dependencies.filter(d => d.size > 100 * 1024 && !d.isDev); // > 100KB production deps
    if (largeDeps.length > 0) {
      recommendations.push({
        type: 'dependency-optimization',
        priority: 'medium',
        message: `${largeDeps.length} large production dependencies detected`,
        suggestion: 'Consider lazy loading heavy dependencies or finding lighter alternatives',
        impact: 'Medium',
        effort: 'Medium',
        dependencies: largeDeps.slice(0, 5).map(d => ({
          name: d.name,
          size: this.formatBytes(d.size),
          version: d.version
        }))
      });
    }

    // Image optimization recommendations
    const imageFiles = this.analysis.files.filter(f => f.type === 'image');
    const totalImageSize = imageFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalImageSize > 1024 * 1024) { // 1MB
      recommendations.push({
        type: 'image-optimization',
        priority: 'medium',
        message: `Image assets total ${this.formatBytes(totalImageSize)}`,
        suggestion: 'Optimize images with WebP format and responsive images',
        impact: 'Medium',
        effort: 'Medium'
      });
    }

    // Performance score recommendations
    if (metrics.efficiencyScore < 70) {
      recommendations.push({
        type: 'performance-score',
        priority: 'high',
        message: `Bundle efficiency score is ${metrics.efficiencyScore}/100 - needs improvement`,
        suggestion: 'Address high-priority recommendations above to improve score',
        impact: 'High',
        effort: 'Varies'
      });
    }

    // Sort by priority and impact
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const impactOrder = { high: 3, medium: 2, low: 1 };

      const aScore = priorityOrder[a.priority] * 2 + impactOrder[a.impact];
      const bScore = priorityOrder[b.priority] * 2 + impactOrder[b.impact];

      return bScore - aScore;
    });

    this.analysis.recommendations = recommendations;
  }

  displayResults() {
    logger.info('\n📊 Bundle Analysis Results', { component: 'Chanuka' });
    logger.info('='.repeat(50), { component: 'Chanuka' });

    // Summary
    console.log(`\n📦 Bundle Summary:`);
    console.log(`   Total Size: ${this.formatBytes(this.analysis.totalSize)}`);
    console.log(`   Gzipped Size: ${this.formatBytes(this.analysis.gzippedSize)}`);
    console.log(`   Compression Ratio: ${((this.analysis.gzippedSize / this.analysis.totalSize) * 100).toFixed(1)}%`);
    console.log(`   Total Files: ${this.analysis.files.length}`);
    console.log(`   Chunks: ${this.analysis.chunks.length}`);

    // File breakdown by type
    console.log(`\n📁 File Breakdown:`);
    const byType = this.analysis.files.reduce((acc, file) => {
      acc[file.type] = acc[file.type] || { count: 0, size: 0 };
      acc[file.type].count++;
      acc[file.type].size += file.size;
      return acc;
    }, {});

    Object.entries(byType).forEach(([type, stats]) => {
      console.log(`   ${type.padEnd(12)}: ${stats.count.toString().padStart(3)} files, ${this.formatBytes(stats.size)}`);
    });

    // Largest files
    console.log(`\n🔍 Largest Files:`);
    this.analysis.files.slice(0, 10).forEach((file, index) => {
      const sizeStr = this.formatBytes(file.size);
      const gzipStr = this.formatBytes(file.gzippedSize);
      console.log(`   ${(index + 1).toString().padStart(2)}. ${file.path.padEnd(40)} ${sizeStr.padStart(10)} (${gzipStr} gzipped)`);
    });

    // Chunks analysis
    if (this.analysis.chunks.length > 0) {
      console.log(`\n📦 Chunks Analysis:`);
      this.analysis.chunks.forEach((chunk, index) => {
        const sizeStr = this.formatBytes(chunk.size);
        console.log(`   ${(index + 1).toString().padStart(2)}. ${chunk.path.padEnd(40)} ${sizeStr.padStart(10)}`);
      });
    }

    // Duplicates
    if (this.analysis.duplicates.length > 0) {
      console.log(`\n🔄 Duplicate Modules:`);
      this.analysis.duplicates.forEach((dup, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}. ${dup.name} (wasted: ${this.formatBytes(dup.wastedSize)})`);
        dup.files.forEach(file => {
          console.log(`      - ${file.path} (${this.formatBytes(file.size)})`);
        });
      });
    }

    // Recommendations
    if (this.analysis.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      this.analysis.recommendations.forEach((rec, index) => {
        const priority = rec.priority.toUpperCase();
        const priorityColor = rec.priority === 'high' ? '\x1b[31m' : rec.priority === 'medium' ? '\x1b[33m' : '\x1b[32m';
        console.log(`   ${(index + 1).toString().padStart(2)}. ${priorityColor}[${priority}]\x1b[0m ${rec.message}`);
        console.log(`       💡 ${rec.suggestion}`);
        
        if (rec.files) {
          rec.files.slice(0, 3).forEach(file => {
            console.log(`          - ${file.path} (${file.size})`);
          });
          if (rec.files.length > 3) {
            console.log(`          ... and ${rec.files.length - 3} more`);
          }
        }
        if (rec.dependencies) {
          rec.dependencies.forEach(dep => {
            console.log(`          - ${dep.name}@${dep.version} (${dep.size})`);
          });
        }
        if (rec.duplicates) {
          rec.duplicates.slice(0, 2).forEach(dup => {
            console.log(`          - ${dup.name} (${this.formatBytes(dup.wastedSize)} wasted)`);
          });
        }
        console.log(`       Impact: ${rec.impact} | Effort: ${rec.effort}`);
        console.log('');
      });
    }

    // Performance metrics
    console.log(`\n📊 Performance Metrics:`);
    const metrics = this.analysis.performanceMetrics;
    console.log(`   Efficiency Score: ${this.getScoreColor(metrics.efficiencyScore)}${metrics.efficiencyScore}/100\x1b[0m`);
    console.log(`   Compression Ratio: ${(metrics.compressionRatio * 100).toFixed(1)}%`);
    console.log(`   Average File Size: ${this.formatBytes(metrics.averageFileSize)}`);
    console.log(`   Largest File: ${this.formatBytes(metrics.largestFile)}`);
    console.log(`   Dependencies: ${metrics.dependencyCount}`);
    if (metrics.unusedCodeSize > 0) {
      console.log(`   Unused Code: ${this.formatBytes(metrics.unusedCodeSize)}`);
    }
    if (metrics.duplicateSize > 0) {
      console.log(`   Duplicate Waste: ${this.formatBytes(metrics.duplicateSize)}`);
    }

    // Dependencies breakdown
    if (this.analysis.dependencies.length > 0) {
      console.log(`\n📦 Top Dependencies by Size:`);
      this.analysis.dependencies.slice(0, 10).forEach((dep, index) => {
        const sizeStr = this.formatBytes(dep.size);
        const type = dep.isDev ? '(dev)' : '(prod)';
        console.log(`   ${(index + 1).toString().padStart(2)}. ${dep.name.padEnd(25)} ${dep.version.padStart(10)} ${sizeStr.padStart(10)} ${type}`);
      });
    }

    // Unused code analysis
    if (this.analysis.unusedCode.length > 0) {
      console.log(`\n🧹 Potential Unused Code:`);
      this.analysis.unusedCode.forEach((item, index) => {
        console.log(`   ${(index + 1).toString().padStart(2)}. ${item.file} (${this.formatBytes(item.size)})`);
        item.issues.forEach(issue => {
          console.log(`      - ${issue.count} ${issue.type.replace('-', ' ')}(s)`);
        });
      });
    }
  }

  getScoreColor(score) {
    if (score >= 90) return '\x1b[32m'; // Green
    if (score >= 70) return '\x1b[33m'; // Yellow
    return '\x1b[31m'; // Red
  }

  saveAnalysis() {
    const outputPath = path.join(process.cwd(), 'bundle-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(this.analysis, null, 2));
    console.log(`\n💾 Analysis saved to: ${outputPath}`);

    // Generate HTML report
    const BundleReportGenerator = require('./generate-bundle-report.js');
    const reportGenerator = new BundleReportGenerator(this.analysis);
    const htmlPath = reportGenerator.generateHTMLReport();
    console.log(`📊 HTML report saved to: ${htmlPath}`);
  }

  openBundleAnalyzer() {
    try {
      logger.info('\n🌐 Opening bundle analyzer...', { component: 'Chanuka' });
      execSync('npm run analyze:bundle', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Could not open bundle analyzer:', error.message);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
async function main() {
  const analyzer = new BundleAnalyzer();
  
  logger.info('🚀 Chanuka Platform Bundle Analyzer', { component: 'Chanuka' });
  logger.info('=====================================\n', { component: 'Chanuka' });

  await analyzer.analyze();

  logger.info('\n✅ Analysis complete!', { component: 'Chanuka' });
  logger.info('\nNext steps:', { component: 'Chanuka' });
  logger.info('  • Review recommendations above', { component: 'Chanuka' });
  logger.info('  • Run with --open flag to view detailed bundle analyzer', { component: 'Chanuka' });
  logger.info('  • Check bundle-analysis.json for detailed data', { component: 'Chanuka' });
  logger.info('  • Consider implementing suggested optimizations\n', { component: 'Chanuka' });
}

if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Fatal error:', { component: 'Chanuka' }, error);
    process.exit(1);
  });
}

module.exports = BundleAnalyzer;




































