#!/usr/bin/env node

/**
 * Performance Budget Checker
 * Validates build output against performance budgets
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

// Load performance budgets
const budgetsPath = path.join(__dirname, '../../performance-budgets.json');
const budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));

// Build output directory
const distDir = path.join(__dirname, '../dist');

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Get gzipped file size
 */
function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = gzipSync(content);
    return gzipped.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Get all files in directory recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Analyze bundle composition
 */
function analyzeBundles() {
  if (!fs.existsSync(distDir)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const allFiles = getAllFiles(distDir);
  const jsFiles = allFiles.filter(file => file.endsWith('.js'));
  const cssFiles = allFiles.filter(file => file.endsWith('.css'));
  const assetFiles = allFiles.filter(file => 
    /\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/i.test(file)
  );

  // Calculate total sizes
  const totalSize = allFiles.reduce((sum, file) => sum + getFileSize(file), 0);
  const totalGzippedSize = allFiles.reduce((sum, file) => sum + getGzippedSize(file), 0);
  
  // Calculate JS bundle sizes
  const jsTotalSize = jsFiles.reduce((sum, file) => sum + getFileSize(file), 0);
  const jsGzippedSize = jsFiles.reduce((sum, file) => sum + getGzippedSize(file), 0);
  
  // Find largest chunk
  let largestChunk = { file: '', size: 0 };
  jsFiles.forEach(file => {
    const size = getFileSize(file);
    if (size > largestChunk.size) {
      largestChunk = { file: path.basename(file), size };
    }
  });

  // Find initial chunk (usually contains 'index' or 'main')
  const initialChunk = jsFiles.find(file => 
    /index|main/.test(path.basename(file))
  );
  const initialChunkSize = initialChunk ? getFileSize(initialChunk) : 0;

  return {
    totalSize,
    totalGzippedSize,
    jsTotalSize,
    jsGzippedSize,
    largestChunkSize: largestChunk.size,
    initialChunkSize,
    chunkCount: jsFiles.length,
    cssSize: cssFiles.reduce((sum, file) => sum + getFileSize(file), 0),
    assetSize: assetFiles.reduce((sum, file) => sum + getFileSize(file), 0),
    files: {
      js: jsFiles.length,
      css: cssFiles.length,
      assets: assetFiles.length
    }
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check budget violations
 */
function checkBudgets(analysis) {
  const violations = [];
  const warnings = [];
  const bundleBudgets = budgets.budgets.bundle;

  // Check total size
  if (analysis.totalSize > bundleBudgets.totalSize.limit) {
    violations.push({
      metric: 'Total Bundle Size',
      actual: analysis.totalSize,
      limit: bundleBudgets.totalSize.limit,
      description: bundleBudgets.totalSize.description
    });
  }

  // Check gzipped size
  if (analysis.totalGzippedSize > bundleBudgets.gzippedSize.limit) {
    violations.push({
      metric: 'Gzipped Bundle Size',
      actual: analysis.totalGzippedSize,
      limit: bundleBudgets.gzippedSize.limit,
      description: bundleBudgets.gzippedSize.description
    });
  }

  // Check initial chunk size
  if (analysis.initialChunkSize > bundleBudgets.initialChunkSize.limit) {
    violations.push({
      metric: 'Initial Chunk Size',
      actual: analysis.initialChunkSize,
      limit: bundleBudgets.initialChunkSize.limit,
      description: bundleBudgets.initialChunkSize.description
    });
  }

  // Check largest chunk size
  if (analysis.largestChunkSize > bundleBudgets.largestChunkSize.limit) {
    violations.push({
      metric: 'Largest Chunk Size',
      actual: analysis.largestChunkSize,
      limit: bundleBudgets.largestChunkSize.limit,
      description: bundleBudgets.largestChunkSize.description
    });
  }

  // Check for warnings (90% of limit)
  const warningThreshold = budgets.thresholds.warning;
  
  if (analysis.totalSize > bundleBudgets.totalSize.limit * warningThreshold) {
    warnings.push({
      metric: 'Total Bundle Size',
      actual: analysis.totalSize,
      limit: bundleBudgets.totalSize.limit,
      percentage: (analysis.totalSize / bundleBudgets.totalSize.limit * 100).toFixed(1)
    });
  }

  return { violations, warnings };
}

/**
 * Generate recommendations
 */
function generateRecommendations(analysis, violations) {
  const recommendations = [];

  if (violations.some(v => v.metric.includes('Bundle Size'))) {
    recommendations.push('🔧 Consider implementing code splitting to reduce bundle size');
    recommendations.push('🌳 Enable tree shaking to remove unused code');
    recommendations.push('📦 Use dynamic imports for non-critical features');
  }

  if (violations.some(v => v.metric.includes('Chunk Size'))) {
    recommendations.push('✂️  Split large chunks into smaller, more focused modules');
    recommendations.push('🔄 Move vendor libraries to separate chunks');
  }

  if (analysis.chunkCount < 3) {
    recommendations.push('📊 Increase code splitting - you have too few chunks');
  }

  if (analysis.chunkCount > 20) {
    recommendations.push('🎯 Consider consolidating some chunks to reduce HTTP requests');
  }

  return recommendations;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing bundle performance...\n');

  const analysis = analyzeBundles();
  const { violations, warnings } = checkBudgets(analysis);
  const recommendations = generateRecommendations(analysis, violations);

  // Display analysis results
  console.log('📊 Bundle Analysis Results:');
  console.log('─'.repeat(50));
  console.log(`Total Size:        ${formatBytes(analysis.totalSize)}`);
  console.log(`Gzipped Size:      ${formatBytes(analysis.totalGzippedSize)}`);
  console.log(`JS Bundle Size:    ${formatBytes(analysis.jsTotalSize)}`);
  console.log(`CSS Size:          ${formatBytes(analysis.cssSize)}`);
  console.log(`Assets Size:       ${formatBytes(analysis.assetSize)}`);
  console.log(`Largest Chunk:     ${formatBytes(analysis.largestChunkSize)}`);
  console.log(`Initial Chunk:     ${formatBytes(analysis.initialChunkSize)}`);
  console.log(`Chunk Count:       ${analysis.chunkCount}`);
  console.log(`Compression Ratio: ${(analysis.totalGzippedSize / analysis.totalSize * 100).toFixed(1)}%`);
  console.log();

  // Display warnings
  if (warnings.length > 0) {
    console.log('⚠️  Performance Warnings:');
    console.log('─'.repeat(50));
    warnings.forEach(warning => {
      console.log(`${warning.metric}: ${formatBytes(warning.actual)} (${warning.percentage}% of budget)`);
    });
    console.log();
  }

  // Display violations
  if (violations.length > 0) {
    console.log('❌ Budget Violations:');
    console.log('─'.repeat(50));
    violations.forEach(violation => {
      console.log(`${violation.metric}:`);
      console.log(`  Actual: ${formatBytes(violation.actual)}`);
      console.log(`  Limit:  ${formatBytes(violation.limit)}`);
      console.log(`  Excess: ${formatBytes(violation.actual - violation.limit)}`);
      console.log(`  Info:   ${violation.description}`);
      console.log();
    });
  }

  // Display recommendations
  if (recommendations.length > 0) {
    console.log('💡 Optimization Recommendations:');
    console.log('─'.repeat(50));
    recommendations.forEach(rec => console.log(rec));
    console.log();
  }

  // Final result
  if (violations.length === 0) {
    console.log('✅ All performance budgets are within limits!');
    
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} warning(s) - consider optimizing soon`);
      process.exit(0);
    } else {
      console.log('🎉 Excellent performance - no issues detected!');
      process.exit(0);
    }
  } else {
    console.log(`❌ ${violations.length} budget violation(s) detected`);
    
    // Check if we should fail the build
    const environment = process.env.NODE_ENV || 'development';
    const envConfig = budgets.environments[environment];
    
    if (envConfig && envConfig.failOnViolation) {
      console.log('🚫 Build failed due to performance budget violations');
      process.exit(1);
    } else {
      console.log('⚠️  Continuing build despite violations (non-strict mode)');
      process.exit(0);
    }
  }
}

// Run the checker
if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundles,
  checkBudgets,
  formatBytes
};