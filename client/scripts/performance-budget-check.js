#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Performance budgets by environment
const BUDGETS = {
  development: {
    js: 200 * 1024, // 200KB
    css: 100 * 1024, // 100KB
    images: 500 * 1024, // 500KB
    total: 1000 * 1024, // 1MB
  },
  staging: {
    js: 150 * 1024, // 150KB
    css: 75 * 1024, // 75KB
    images: 400 * 1024, // 400KB
    total: 800 * 1024, // 800KB
  },
  production: {
    js: 100 * 1024, // 100KB
    css: 50 * 1024, // 50KB
    images: 300 * 1024, // 300KB
    total: 600 * 1024, // 600KB
  },
};

class PerformanceBudgetChecker {
  constructor(environment = 'production') {
    this.environment = environment;
    this.budget = BUDGETS[environment] || BUDGETS.production;
    this.distPath = path.resolve(process.cwd(), 'dist');
  }

  async check() {
    console.log(`🔍 Checking performance budgets for ${this.environment}...`);
    
    if (!fs.existsSync(this.distPath)) {
      throw new Error('Build directory not found. Run build first.');
    }

    const assets = this.analyzeAssets();
    const results = this.checkBudgets(assets);
    
    this.generateReport(results);
    
    if (results.failed.length > 0) {
      console.error('❌ Performance budget check failed!');
      process.exit(1);
    } else {
      console.log('✅ All performance budgets passed!');
    }
  }

  analyzeAssets() {
    const assets = {
      js: [],
      css: [],
      images: [],
      other: [],
    };

    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else {
          const ext = path.extname(file).toLowerCase();
          const size = stat.size;
          const relativePath = path.relative(this.distPath, filePath);
          
          const asset = { name: relativePath, size };
          
          if (ext === '.js') {
            assets.js.push(asset);
          } else if (ext === '.css') {
            assets.css.push(asset);
          } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) {
            assets.images.push(asset);
          } else {
            assets.other.push(asset);
          }
        }
      }
    };

    scanDirectory(this.distPath);
    return assets;
  }

  checkBudgets(assets) {
    const results = {
      passed: [],
      failed: [],
      warnings: [],
    };

    // Calculate totals
    const totals = {
      js: assets.js.reduce((sum, asset) => sum + asset.size, 0),
      css: assets.css.reduce((sum, asset) => sum + asset.size, 0),
      images: assets.images.reduce((sum, asset) => sum + asset.size, 0),
      total: Object.values(assets).flat().reduce((sum, asset) => sum + asset.size, 0),
    };

    // Check each budget
    for (const [type, budget] of Object.entries(this.budget)) {
      const actual = totals[type];
      const percentage = (actual / budget) * 100;
      
      const result = {
        type,
        budget: this.formatSize(budget),
        actual: this.formatSize(actual),
        percentage: percentage.toFixed(1) + '%',
        status: actual <= budget ? 'pass' : 'fail',
      };

      if (actual <= budget) {
        results.passed.push(result);
      } else {
        results.failed.push(result);
      }

      // Add warnings for assets close to budget (80-100%)
      if (percentage >= 80 && percentage <= 100) {
        results.warnings.push({
          ...result,
          message: `${type} assets are ${percentage.toFixed(1)}% of budget`,
        });
      }
    }

    // Check individual large assets
    const largeAssets = Object.values(assets)
      .flat()
      .filter(asset => asset.size > 50 * 1024) // Assets larger than 50KB
      .sort((a, b) => b.size - a.size);

    if (largeAssets.length > 0) {
      results.warnings.push({
        type: 'large-assets',
        message: `Found ${largeAssets.length} assets larger than 50KB`,
        assets: largeAssets.slice(0, 5).map(asset => ({
          name: asset.name,
          size: this.formatSize(asset.size),
        })),
      });
    }

    return results;
  }

  generateReport(results) {
    console.log('\n📊 Performance Budget Report');
    console.log('================================');
    
    // Passed budgets
    if (results.passed.length > 0) {
      console.log('\n✅ Passed Budgets:');
      results.passed.forEach(result => {
        console.log(`  ${result.type.padEnd(10)} ${result.actual.padEnd(10)} / ${result.budget.padEnd(10)} (${result.percentage})`);
      });
    }

    // Failed budgets
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Budgets:');
      results.failed.forEach(result => {
        console.log(`  ${result.type.padEnd(10)} ${result.actual.padEnd(10)} / ${result.budget.padEnd(10)} (${result.percentage})`);
      });
    }

    // Warnings
    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(warning => {
        console.log(`  ${warning.message}`);
        if (warning.assets) {
          warning.assets.forEach(asset => {
            console.log(`    - ${asset.name}: ${asset.size}`);
          });
        }
      });
    }

    // Recommendations
    if (results.failed.length > 0 || results.warnings.length > 0) {
      console.log('\n💡 Recommendations:');
      
      const jsFailure = results.failed.find(r => r.type === 'js');
      if (jsFailure) {
        console.log('  - Consider code splitting and lazy loading');
        console.log('  - Remove unused dependencies');
        console.log('  - Use dynamic imports for large libraries');
      }

      const cssFailure = results.failed.find(r => r.type === 'css');
      if (cssFailure) {
        console.log('  - Remove unused CSS');
        console.log('  - Use CSS-in-JS for component-specific styles');
        console.log('  - Consider critical CSS extraction');
      }

      const imageFailure = results.failed.find(r => r.type === 'images');
      if (imageFailure) {
        console.log('  - Optimize images (WebP, compression)');
        console.log('  - Use responsive images');
        console.log('  - Consider lazy loading for images');
      }
    }

    // Save detailed report
    const reportPath = path.join(this.distPath, 'performance-budget-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: this.environment,
      budget: this.budget,
      results,
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// CLI interface
const main = () => {
  const environment = process.argv[2] || process.env.NODE_ENV || 'production';
  
  if (!BUDGETS[environment]) {
    console.error(`❌ Unknown environment: ${environment}`);
    console.error(`Available environments: ${Object.keys(BUDGETS).join(', ')}`);
    process.exit(1);
  }

  const checker = new PerformanceBudgetChecker(environment);
  checker.check().catch(error => {
    console.error('❌ Performance budget check failed:', error.message);
    process.exit(1);
  });
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { PerformanceBudgetChecker };