#!/usr/bin/env node

/**
 * Advanced Bundle Analyzer Script
 * Provides comprehensive bundle analysis with recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
      timestamp: new Date().toISOString()
    };
  }

  async analyze() {
    logger.info('🔍 Starting bundle analysis...\n', { component: 'Chanuka' });

    try {
      // Check if build exists
      if (!fs.existsSync(this.distPath)) {
        logger.error('❌ Build directory not found. Please run ', { component: 'Chanuka' }, npm run build" first.');
        process.exit(1);
      }

      // Analyze files
      await this.analyzeFiles();
      
      // Detect duplicates
      await this.detectDuplicates();
      
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

    // Bundle size recommendations
    const totalSizeMB = this.analysis.totalSize / (1024 * 1024);
    if (totalSizeMB > 2) {
      recommendations.push({
        type: 'bundle-size',
        priority: 'high',
        message: `Total bundle size (${totalSizeMB.toFixed(2)}MB) exceeds recommended 2MB limit`,
        suggestion: 'Consider code splitting, tree shaking, or removing unused dependencies'
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
        suggestion: 'Implement route-based code splitting and lazy loading'
      });
    }

    // Chunk recommendations
    if (this.analysis.chunks.length < 3) {
      recommendations.push({
        type: 'code-splitting',
        priority: 'medium',
        message: `Only ${this.analysis.chunks.length} chunks detected`,
        suggestion: 'Implement more aggressive code splitting for better caching'
      });
    }

    // Compression recommendations
    const avgCompressionRatio = this.analysis.files.reduce((sum, f) => sum + f.compressionRatio, 0) / this.analysis.files.length;
    if (avgCompressionRatio > 0.7) {
      recommendations.push({
        type: 'compression',
        priority: 'medium',
        message: `Average compression ratio (${(avgCompressionRatio * 100).toFixed(1)}%) could be improved`,
        suggestion: 'Enable Brotli compression and optimize asset formats'
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
        files: largeFiles.map(f => ({ path: f.path, size: this.formatBytes(f.size) }))
      });
    }

    // Duplicate recommendations
    if (this.analysis.duplicates.length > 0) {
      const wastedSize = this.analysis.duplicates.reduce((sum, d) => sum + d.wastedSize, 0);
      recommendations.push({
        type: 'duplicates',
        priority: 'high',
        message: `${this.analysis.duplicates.length} duplicate modules found, wasting ${this.formatBytes(wastedSize)}`,
        suggestion: 'Configure webpack/vite to deduplicate modules',
        duplicates: this.analysis.duplicates
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
        suggestion: 'Optimize images with WebP format and responsive images'
      });
    }

    this.analysis.recommendations = recommendations;
  }

  displayResults() {
    logger.info('\n📊 Bundle Analysis Results', { component: 'Chanuka' });
    logger.info('=', { component: 'Chanuka' }, .repeat(50));

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
        logger.info('', { component: 'Chanuka' });
      });
    }

    // Performance score
    const score = this.calculatePerformanceScore();
    const scoreColor = score >= 90 ? '\x1b[32m' : score >= 70 ? '\x1b[33m' : '\x1b[31m';
    console.log(`\n🎯 Performance Score: ${scoreColor}${score}/100\x1b[0m`);
  }

  calculatePerformanceScore() {
    let score = 100;

    // Deduct points for large bundle size
    const totalSizeMB = this.analysis.totalSize / (1024 * 1024);
    if (totalSizeMB > 2) score -= 30;
    else if (totalSizeMB > 1) score -= 15;

    // Deduct points for poor compression
    const avgCompressionRatio = this.analysis.files.reduce((sum, f) => sum + f.compressionRatio, 0) / this.analysis.files.length;
    if (avgCompressionRatio > 0.8) score -= 20;
    else if (avgCompressionRatio > 0.6) score -= 10;

    // Deduct points for lack of code splitting
    if (this.analysis.chunks.length < 3) score -= 15;

    // Deduct points for duplicates
    if (this.analysis.duplicates.length > 0) {
      score -= Math.min(20, this.analysis.duplicates.length * 5);
    }

    return Math.max(0, score);
  }

  saveAnalysis() {
    const outputPath = path.join(process.cwd(), 'bundle-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(this.analysis, null, 2));
    console.log(`\n💾 Analysis saved to: ${outputPath}`);
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