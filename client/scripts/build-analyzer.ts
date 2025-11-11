#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { gzipSync, brotliCompressSync } from 'zlib';

interface BundleStats {
  totalSize: number;
  gzipSize: number;
  brotliSize: number;
  chunks: ChunkInfo[];
  assets: AssetInfo[];
  performance: PerformanceMetrics;
}

interface ChunkInfo {
  name: string;
  size: number;
  gzipSize: number;
  brotliSize: number;
  modules: string[];
}

interface AssetInfo {
  name: string;
  size: number;
  type: 'js' | 'css' | 'image' | 'font' | 'other';
}

interface PerformanceMetrics {
  mainBundleSize: number;
  vendorBundleSize: number;
  cssSize: number;
  imageSize: number;
  budgetStatus: 'pass' | 'warn' | 'fail';
  recommendations: string[];
}

class BundleAnalyzer {
  private distPath: string;
  private budgets = {
    mainBundle: 100 * 1024, // 100KB
    vendorBundle: 200 * 1024, // 200KB
    totalJS: 500 * 1024, // 500KB
    totalCSS: 50 * 1024, // 50KB
    totalAssets: 2 * 1024 * 1024, // 2MB
  };

  constructor() {
    this.distPath = resolve(process.cwd(), 'dist');
  }

  async analyze(): Promise<BundleStats> {
    console.log('🔍 Starting bundle analysis...');
    
    // Build the project first
    this.buildProject();
    
    // Analyze the build output
    const chunks = this.analyzeChunks();
    const assets = this.analyzeAssets();
    const performance = this.calculatePerformanceMetrics(chunks, assets);
    
    const stats: BundleStats = {
      totalSize: this.calculateTotalSize(chunks, assets),
      gzipSize: this.calculateCompressedSize(chunks, assets, 'gzip'),
      brotliSize: this.calculateCompressedSize(chunks, assets, 'brotli'),
      chunks,
      assets,
      performance,
    };
    
    this.generateReport(stats);
    this.checkBudgets(stats);
    
    return stats;
  }

  private buildProject(): void {
    console.log('📦 Building project for production...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }

  private analyzeChunks(): ChunkInfo[] {
    const chunks: ChunkInfo[] = [];
    
    // Read build manifest or analyze files directly
    const jsFiles = this.getFilesByExtension('.js');
    
    for (const file of jsFiles) {
      const content = readFileSync(resolve(this.distPath, file));
      const gzipSize = gzipSync(content).length;
      const brotliSize = brotliCompressSync(content).length;
      
      chunks.push({
        name: file,
        size: content.length,
        gzipSize,
        brotliSize,
        modules: this.extractModules(content.toString()),
      });
    }
    
    return chunks;
  }

  private analyzeAssets(): AssetInfo[] {
    const assets: AssetInfo[] = [];
    
    const allFiles = this.getAllFiles();
    
    for (const file of allFiles) {
      const content = readFileSync(resolve(this.distPath, file));
      
      assets.push({
        name: file,
        size: content.length,
        type: this.getAssetType(file),
      });
    }
    
    return assets;
  }

  private calculatePerformanceMetrics(chunks: ChunkInfo[], assets: AssetInfo[]): PerformanceMetrics {
    const mainBundle = chunks.find(c => c.name.includes('index')) || chunks[0];
    const vendorBundles = chunks.filter(c => c.name.includes('vendor'));
    const cssAssets = assets.filter(a => a.type === 'css');
    
    const mainBundleSize = mainBundle?.size || 0;
    const vendorBundleSize = vendorBundles.reduce((sum, chunk) => sum + chunk.size, 0);
    const cssSize = cssAssets.reduce((sum, asset) => sum + asset.size, 0);
    const imageSize = assets.filter(a => a.type === 'image').reduce((sum, asset) => sum + asset.size, 0);
    
    const recommendations: string[] = [];
    let budgetStatus: 'pass' | 'warn' | 'fail' = 'pass';
    
    // Check budgets and generate recommendations
    if (mainBundleSize > this.budgets.mainBundle) {
      budgetStatus = 'fail';
      recommendations.push(`Main bundle (${this.formatSize(mainBundleSize)}) exceeds budget (${this.formatSize(this.budgets.mainBundle)})`);
    }
    
    if (vendorBundleSize > this.budgets.vendorBundle) {
      if (budgetStatus === 'pass') budgetStatus = 'warn';
      recommendations.push(`Vendor bundles (${this.formatSize(vendorBundleSize)}) exceed budget (${this.formatSize(this.budgets.vendorBundle)})`);
    }
    
    if (cssSize > this.budgets.totalCSS) {
      if (budgetStatus === 'pass') budgetStatus = 'warn';
      recommendations.push(`CSS size (${this.formatSize(cssSize)}) exceeds budget (${this.formatSize(this.budgets.totalCSS)})`);
    }
    
    // Performance recommendations
    if (chunks.length > 10) {
      recommendations.push('Consider consolidating chunks to reduce HTTP requests');
    }
    
    if (imageSize > 500 * 1024) {
      recommendations.push('Consider optimizing images or using WebP format');
    }
    
    return {
      mainBundleSize,
      vendorBundleSize,
      cssSize,
      imageSize,
      budgetStatus,
      recommendations,
    };
  }

  private generateReport(stats: BundleStats): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSize: this.formatSize(stats.totalSize),
        gzipSize: this.formatSize(stats.gzipSize),
        brotliSize: this.formatSize(stats.brotliSize),
        compressionRatio: ((1 - stats.gzipSize / stats.totalSize) * 100).toFixed(1) + '%',
      },
      performance: stats.performance,
      chunks: stats.chunks.map(chunk => ({
        name: chunk.name,
        size: this.formatSize(chunk.size),
        gzipSize: this.formatSize(chunk.gzipSize),
        brotliSize: this.formatSize(chunk.brotliSize),
        moduleCount: chunk.modules.length,
      })),
      assets: stats.assets.map(asset => ({
        name: asset.name,
        size: this.formatSize(asset.size),
        type: asset.type,
      })),
    };
    
    // Write JSON report
    writeFileSync(
      resolve(this.distPath, 'bundle-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Write human-readable report
    const humanReport = this.generateHumanReport(report);
    writeFileSync(
      resolve(this.distPath, 'bundle-report.md'),
      humanReport
    );
    
    console.log('📊 Bundle analysis complete!');
    console.log(`📁 Reports saved to ${this.distPath}/bundle-report.*`);
  }

  private generateHumanReport(report: any): string {
    return `# Bundle Analysis Report

Generated: ${report.timestamp}

## Summary

- **Total Size**: ${report.summary.totalSize}
- **Gzipped**: ${report.summary.gzipSize}
- **Brotli**: ${report.summary.brotliSize}
- **Compression Ratio**: ${report.summary.compressionRatio}

## Performance Status: ${report.performance.budgetStatus.toUpperCase()}

### Bundle Sizes
- Main Bundle: ${this.formatSize(report.performance.mainBundleSize)}
- Vendor Bundles: ${this.formatSize(report.performance.vendorBundleSize)}
- CSS: ${this.formatSize(report.performance.cssSize)}
- Images: ${this.formatSize(report.performance.imageSize)}

### Recommendations
${report.performance.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## Chunks
${report.chunks.map((chunk: any) => `
### ${chunk.name}
- Size: ${chunk.size}
- Gzipped: ${chunk.gzipSize}
- Brotli: ${chunk.brotliSize}
- Modules: ${chunk.moduleCount}
`).join('')}

## Assets by Type
${Object.entries(this.groupAssetsByType(report.assets)).map(([type, assets]: [string, any]) => `
### ${type.toUpperCase()}
${(assets as any[]).map(asset => `- ${asset.name}: ${asset.size}`).join('\n')}
`).join('')}
`;
  }

  private checkBudgets(stats: BundleStats): void {
    const { performance } = stats;
    
    console.log('\n📏 Budget Check:');
    console.log(`Main Bundle: ${this.formatSize(performance.mainBundleSize)} / ${this.formatSize(this.budgets.mainBundle)} ${performance.mainBundleSize <= this.budgets.mainBundle ? '✅' : '❌'}`);
    console.log(`Vendor Bundles: ${this.formatSize(performance.vendorBundleSize)} / ${this.formatSize(this.budgets.vendorBundle)} ${performance.vendorBundleSize <= this.budgets.vendorBundle ? '✅' : '❌'}`);
    console.log(`CSS: ${this.formatSize(performance.cssSize)} / ${this.formatSize(this.budgets.totalCSS)} ${performance.cssSize <= this.budgets.totalCSS ? '✅' : '❌'}`);
    
    if (performance.budgetStatus === 'fail') {
      console.log('\n❌ Budget check failed!');
      process.exit(1);
    } else if (performance.budgetStatus === 'warn') {
      console.log('\n⚠️  Budget warnings detected');
    } else {
      console.log('\n✅ All budgets passed!');
    }
  }

  // Utility methods
  private getFilesByExtension(ext: string): string[] {
    // Implementation would scan dist directory for files with extension
    return [];
  }

  private getAllFiles(): string[] {
    // Implementation would recursively scan dist directory
    return [];
  }

  private extractModules(content: string): string[] {
    // Extract module names from bundle content
    const moduleRegex = /\/\*\s*([^*]+)\s*\*\//g;
    const modules: string[] = [];
    let match;
    
    while ((match = moduleRegex.exec(content)) !== null) {
      modules.push(match[1].trim());
    }
    
    return modules;
  }

  private getAssetType(filename: string): 'js' | 'css' | 'image' | 'font' | 'other' {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    if (ext === 'js') return 'js';
    if (ext === 'css') return 'css';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) return 'image';
    if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext || '')) return 'font';
    return 'other';
  }

  private calculateTotalSize(chunks: ChunkInfo[], assets: AssetInfo[]): number {
    return chunks.reduce((sum, chunk) => sum + chunk.size, 0) +
           assets.reduce((sum, asset) => sum + asset.size, 0);
  }

  private calculateCompressedSize(chunks: ChunkInfo[], assets: AssetInfo[], type: 'gzip' | 'brotli'): number {
    return chunks.reduce((sum, chunk) => sum + (type === 'gzip' ? chunk.gzipSize : chunk.brotliSize), 0);
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private groupAssetsByType(assets: any[]): Record<string, any[]> {
    return assets.reduce((groups, asset) => {
      const type = asset.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(asset);
      return groups;
    }, {});
  }
}

// Run analyzer if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze().catch(console.error);
}

export { BundleAnalyzer };