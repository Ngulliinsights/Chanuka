#!/usr/bin/env node

/**
 * Performance Budget Checker
 * 
 * Validates bundle sizes and resource counts against defined budgets.
 * Fails CI/CD if budgets are exceeded.
 * 
 * Usage:
 *   node scripts/check-performance-budget.js
 *   npm run check:performance-budget
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function checkBudgets() {
  log('\n📊 Performance Budget Check\n', 'bright');

  // Load budgets
  const budgetsPath = path.join(__dirname, '../performance-budgets.json');
  if (!fs.existsSync(budgetsPath)) {
    log('❌ Performance budgets file not found!', 'red');
    log(`   Expected: ${budgetsPath}`, 'red');
    process.exit(1);
  }

  const budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));

  // Check if build stats exist
  const statsPath = path.join(__dirname, '../dist/stats.json');
  const distPath = path.join(__dirname, '../dist');

  if (!fs.existsSync(distPath)) {
    log('⚠️  Build directory not found. Run build first:', 'yellow');
    log('   npm run build', 'cyan');
    process.exit(0);
  }

  let stats = null;
  if (fs.existsSync(statsPath)) {
    stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  }

  // Analyze dist directory
  const distFiles = getAllFiles(distPath);
  const analysis = analyzeFiles(distFiles);

  let violations = [];
  let warnings = [];
  let passed = [];

  // Check Bundle Size budgets
  const bundleBudget = budgets.budgets.find(b => b.name === 'Bundle Size');
  if (bundleBudget) {
    log('📦 Bundle Size Analysis\n', 'bright');

    // Total size
    const totalResult = checkMetric(
      'Total Bundle Size',
      analysis.totalSize,
      bundleBudget.metrics.total.good,
      bundleBudget.metrics.total.warning,
      'bytes'
    );
    logResult(totalResult);
    categorizeResult(totalResult, violations, warnings, passed);

    // JavaScript size
    const jsResult = checkMetric(
      'JavaScript Bundle',
      analysis.jsSize,
      bundleBudget.metrics.javascript.good,
      bundleBudget.metrics.javascript.warning,
      'bytes'
    );
    logResult(jsResult);
    categorizeResult(jsResult, violations, warnings, passed);

    // CSS size
    const cssResult = checkMetric(
      'CSS Bundle',
      analysis.cssSize,
      bundleBudget.metrics.css.good,
      bundleBudget.metrics.css.warning,
      'bytes'
    );
    logResult(cssResult);
    categorizeResult(cssResult, violations, warnings, passed);

    console.log('');
  }

  // Check Resource Counts
  const resourceBudget = budgets.budgets.find(b => b.name === 'Resource Counts');
  if (resourceBudget) {
    log('📁 Resource Count Analysis\n', 'bright');

    // Total requests
    const requestsResult = checkMetric(
      'Total Requests',
      analysis.fileCount,
      resourceBudget.metrics.requests.good,
      resourceBudget.metrics.requests.warning,
      'count'
    );
    logResult(requestsResult);
    categorizeResult(requestsResult, violations, warnings, passed);

    // Images
    const imagesResult = checkMetric(
      'Image Count',
      analysis.imageCount,
      resourceBudget.metrics.images.good,
      resourceBudget.metrics.images.warning,
      'count'
    );
    logResult(imagesResult);
    categorizeResult(imagesResult, violations, warnings, passed);

    // Fonts
    const fontsResult = checkMetric(
      'Font Count',
      analysis.fontCount,
      resourceBudget.metrics.fonts.good,
      resourceBudget.metrics.fonts.warning,
      'count'
    );
    logResult(fontsResult);
    categorizeResult(fontsResult, violations, warnings, passed);

    console.log('');
  }

  // Summary
  log('📋 Summary\n', 'bright');
  log(`✅ Passed: ${passed.length}`, 'green');
  if (warnings.length > 0) {
    log(`⚠️  Warnings: ${warnings.length}`, 'yellow');
  }
  if (violations.length > 0) {
    log(`❌ Violations: ${violations.length}`, 'red');
  }
  console.log('');

  // Detailed warnings
  if (warnings.length > 0) {
    log('⚠️  Warnings (exceeds good threshold):\n', 'yellow');
    warnings.forEach(w => log(`  • ${w}`, 'yellow'));
    console.log('');
  }

  // Detailed violations
  if (violations.length > 0) {
    log('❌ Violations (exceeds warning threshold):\n', 'red');
    violations.forEach(v => log(`  • ${v}`, 'red'));
    console.log('');
    log('Build failed due to performance budget violations!', 'red');
    log('Please optimize your bundle or update budgets with justification.', 'yellow');
    process.exit(1);
  }

  if (warnings.length > 0) {
    log('⚠️  Build passed with warnings. Consider optimizing.', 'yellow');
  } else {
    log('✅ All performance budgets met!', 'green');
  }
  console.log('');
}

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

function analyzeFiles(files) {
  let totalSize = 0;
  let jsSize = 0;
  let cssSize = 0;
  let imageCount = 0;
  let fontCount = 0;

  files.forEach(file => {
    const stat = fs.statSync(file);
    const ext = path.extname(file).toLowerCase();

    totalSize += stat.size;

    if (ext === '.js' || ext === '.mjs') {
      jsSize += stat.size;
    } else if (ext === '.css') {
      cssSize += stat.size;
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(ext)) {
      imageCount++;
    } else if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
      fontCount++;
    }
  });

  return {
    totalSize,
    jsSize,
    cssSize,
    fileCount: files.length,
    imageCount,
    fontCount,
  };
}

function checkMetric(name, value, goodThreshold, warningThreshold, unit) {
  let status = 'good';
  let message = '';

  if (value > warningThreshold) {
    status = 'violation';
    message = `${name}: ${formatValue(value, unit)} (exceeds ${formatValue(warningThreshold, unit)})`;
  } else if (value > goodThreshold) {
    status = 'warning';
    message = `${name}: ${formatValue(value, unit)} (exceeds ${formatValue(goodThreshold, unit)})`;
  } else {
    status = 'passed';
    message = `${name}: ${formatValue(value, unit)} (within ${formatValue(goodThreshold, unit)})`;
  }

  return { name, value, status, message, unit };
}

function formatValue(value, unit) {
  if (unit === 'bytes') {
    return formatBytes(value);
  }
  return `${value} ${unit}`;
}

function logResult(result) {
  const icon = result.status === 'passed' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌';
  const color = result.status === 'passed' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';
  log(`${icon} ${result.message}`, color);
}

function categorizeResult(result, violations, warnings, passed) {
  if (result.status === 'violation') {
    violations.push(result.message);
  } else if (result.status === 'warning') {
    warnings.push(result.message);
  } else {
    passed.push(result.message);
  }
}

// Run the check
try {
  checkBudgets();
} catch (error) {
  log('\n❌ Error checking performance budgets:', 'red');
  log(error.message, 'red');
  if (error.stack) {
    log('\nStack trace:', 'yellow');
    console.log(error.stack);
  }
  process.exit(1);
}
