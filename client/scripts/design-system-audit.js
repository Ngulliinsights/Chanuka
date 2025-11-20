#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import performance monitoring (if available)
let performanceMonitor = null;
try {
  const { performanceMonitor: monitor } = await import('@shared/core/src/performance/monitoring.js');
  performanceMonitor = monitor;
} catch (error) {
  // Performance monitoring not available, continue without it
  console.warn('Performance monitoring not available, skipping integration');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Design system configuration
const DESIGN_SYSTEM = {
  // CSS custom properties that should be used instead of hardcoded values
  colorTokens: [
    '--color-background', '--color-foreground', '--color-card', '--color-card-foreground',
    '--color-popover', '--color-popover-foreground', '--color-primary', '--color-primary-foreground',
    '--color-secondary', '--color-secondary-foreground', '--color-muted', '--color-muted-foreground',
    '--color-accent', '--color-accent-foreground', '--color-destructive', '--color-destructive-foreground',
    '--color-border', '--color-input', '--color-ring', '--color-success', '--color-warning', '--color-error'
  ],

  // Typography tokens
  typographyTokens: [
    '--text-xs', '--text-sm', '--text-base', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl', '--text-4xl',
    '--leading-tight', '--leading-snug', '--leading-normal', '--leading-relaxed', '--leading-loose'
  ],

  // Spacing tokens
  spacingTokens: [
    '--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl', '--space-2xl'
  ],

  // Unified components that should be used
  unifiedComponents: [
    'UnifiedButton', 'UnifiedCard', 'UnifiedCardHeader', 'UnifiedCardTitle', 'UnifiedCardDescription',
    'UnifiedCardContent', 'UnifiedCardFooter', 'UnifiedBadge', 'UnifiedInput', 'UnifiedAlert',
    'UnifiedAlertTitle', 'UnifiedAlertDescription', 'UnifiedTabs', 'UnifiedTabsList', 'UnifiedTabsTrigger',
    'UnifiedTabsContent', 'UnifiedAccordion', 'UnifiedAccordionTrigger', 'UnifiedAccordionContent',
    'UnifiedAccordionGroup', 'UnifiedToolbar', 'UnifiedToolbarButton', 'UnifiedToolbarSeparator'
  ],

  // Common color patterns to avoid
  forbiddenColorPatterns: [
    /#[0-9a-fA-F]{3,6}/g, // Hex colors
    /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g, // RGB colors
    /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g, // RGBA colors
    /hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/g, // HSL colors
    /hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)/g, // HSLA colors
    /color:\s*[^v]/g, // color: not followed by var(
  ],

  // Required accessibility attributes
  requiredAriaAttributes: {
    button: ['aria-label'],
    input: ['aria-label', 'aria-describedby'],
    img: ['alt'],
    'role=button': ['aria-label', 'tabindex']
  }
};

// Audit results storage
const auditResults = {
  violations: [],
  warnings: [],
  passed: [],
  summary: {
    filesScanned: 0,
    violationsFound: 0,
    warningsFound: 0,
    componentsChecked: 0
  }
};

// Utility functions
function isTypeScriptFile(filePath) {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

function isReactFile(filePath) {
  return filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
}

function findFiles(dir, pattern) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findFiles(fullPath, pattern));
    } else if (stat.isFile() && pattern(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

// Violation detection functions
function checkHardcodedColors(content, filePath) {
  const violations = [];

  DESIGN_SYSTEM.forbiddenColorPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Skip if it's part of a comment or import
        const lineIndex = content.indexOf(match);
        const beforeMatch = content.substring(0, lineIndex);
        if (!beforeMatch.includes('//') && !beforeMatch.includes('/*') && !beforeMatch.includes('import')) {
          violations.push({
            type: 'hardcoded-color',
            file: path.relative(process.cwd(), filePath),
            line: content.substring(0, lineIndex).split('\n').length,
            message: `Hardcoded color found: ${match.trim()}. Use CSS custom properties instead.`,
            suggestion: 'Replace with var(--color-*) from design system'
          });
        }
      });
    }
  });

  return violations;
}

function checkComponentUsage(content, filePath) {
  const violations = [];
  const warnings = [];

  // Check for non-unified component usage
  const componentPatterns = [
    { pattern: /<button[^>]*>/g, replacement: 'UnifiedButton' },
    { pattern: /<input[^>]*>/g, replacement: 'UnifiedInput' },
    { pattern: /<div[^>]*className="[^"]*card[^"]*"[^>]*>/g, replacement: 'UnifiedCard' },
    { pattern: /<div[^>]*className="[^"]*badge[^"]*"[^>]*>/g, replacement: 'UnifiedBadge' }
  ];

  componentPatterns.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Check if this is not already using unified components
        if (!content.includes(`import.*${replacement}`) && !match.includes('Unified')) {
          warnings.push({
            type: 'non-unified-component',
            file: path.relative(process.cwd(), filePath),
            line: content.indexOf(match) !== -1 ? content.substring(0, content.indexOf(match)).split('\n').length : 0,
            message: `Using native HTML element instead of unified component.`,
            suggestion: `Use ${replacement} from unified-components.tsx`
          });
        }
      });
    }
  });

  return { violations, warnings };
}

function checkInlineStyles(content, filePath) {
  const violations = [];

  // Check for style attributes
  const stylePattern = /style=\{[^}]*\}/g;
  const matches = content.match(stylePattern);

  if (matches) {
    matches.forEach(match => {
      violations.push({
        type: 'inline-style',
        file: path.relative(process.cwd(), filePath),
        line: content.indexOf(match) !== -1 ? content.substring(0, content.indexOf(match)).split('\n').length : 0,
        message: 'Inline styles found. Use design system classes instead.',
        suggestion: 'Move styles to CSS classes using design tokens'
      });
    });
  }

  return violations;
}

function checkAccessibility(content, filePath) {
  const violations = [];

  // Check for missing alt attributes on images
  const imgPattern = /<img[^>]*>/g;
  const imgMatches = content.match(imgPattern);

  if (imgMatches) {
    imgMatches.forEach(match => {
      if (!match.includes('alt=')) {
        violations.push({
          type: 'missing-alt',
          file: path.relative(process.cwd(), filePath),
          line: content.indexOf(match) !== -1 ? content.substring(0, content.indexOf(match)).split('\n').length : 0,
          message: 'Image missing alt attribute.',
          suggestion: 'Add alt="descriptive text" to img tag'
        });
      }
    });
  }

  // Check for buttons without accessible names
  const buttonPattern = /<button[^>]*>(.*?)<\/button>/g;
  const buttonMatches = content.match(buttonPattern);

  if (buttonMatches) {
    buttonMatches.forEach(match => {
      const buttonContent = match.replace(/<button[^>]*>/, '').replace(/<\/button>/, '').trim();
      if (!buttonContent && !match.includes('aria-label')) {
        violations.push({
          type: 'button-accessibility',
          file: path.relative(process.cwd(), filePath),
          line: content.indexOf(match) !== -1 ? content.substring(0, content.indexOf(match)).split('\n').length : 0,
          message: 'Button without accessible name.',
          suggestion: 'Add aria-label or visible text content'
        });
      }
    });
  }

  return violations;
}

function checkDesignTokenUsage(content, filePath) {
  const violations = [];

  // Check if file uses any design tokens
  const hasDesignTokens = DESIGN_SYSTEM.colorTokens.some(token =>
    content.includes(token) || content.includes(token.replace('--color-', '--'))
  );

  if (!hasDesignTokens && isReactFile(filePath)) {
    // This is just informational - not necessarily a violation
    auditResults.passed.push({
      type: 'design-token-check',
      file: path.relative(process.cwd(), filePath),
      message: 'File does not use design system tokens (may be acceptable for utility files)'
    });
  }

  return violations;
}

// Main audit function
function auditFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    auditResults.summary.filesScanned++;

    let fileViolations = [];
    let fileWarnings = [];

    // Run all checks
    fileViolations.push(...checkHardcodedColors(content, filePath));
    const componentResults = checkComponentUsage(content, filePath);
    fileViolations.push(...componentResults.violations);
    fileWarnings.push(...componentResults.warnings);
    fileViolations.push(...checkInlineStyles(content, filePath));
    fileViolations.push(...checkAccessibility(content, filePath));
    fileViolations.push(...checkDesignTokenUsage(content, filePath));

    auditResults.violations.push(...fileViolations);
    auditResults.warnings.push(...fileWarnings);
    auditResults.summary.violationsFound += fileViolations.length;
    auditResults.summary.warningsFound += fileWarnings.length;

  } catch (error) {
    console.error(`Error auditing ${filePath}:`, error.message);
  }
}

// Report generation
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: auditResults.summary,
    violations: auditResults.violations,
    warnings: auditResults.warnings,
    passed: auditResults.passed
  };

  return report;
}

function printReport(report) {
  console.log('\n🎨 Design System Audit Report');
  console.log('=' .repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   Files scanned: ${report.summary.filesScanned}`);
  console.log(`   Violations found: ${report.summary.violationsFound}`);
  console.log(`   Warnings found: ${report.summary.warningsFound}`);

  if (report.violations.length > 0) {
    console.log('\n❌ Violations:');
    report.violations.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.file}:${v.line} - ${v.message}`);
      console.log(`      💡 ${v.suggestion}`);
    });
  }

  if (report.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    report.warnings.forEach((w, i) => {
      console.log(`   ${i + 1}. ${w.file}:${w.line} - ${w.message}`);
      console.log(`      💡 ${w.suggestion}`);
    });
  }

  if (report.violations.length === 0 && report.warnings.length === 0) {
    console.log('\n✅ No violations or warnings found!');
  }
}

function saveReport(report) {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'design-system-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const markdownPath = path.join(reportDir, 'design-system-audit-report.md');
  let markdown = '# Design System Audit Report\n\n';
  markdown += `**Generated:** ${report.timestamp}\n\n`;
  markdown += '## Summary\n\n';
  markdown += `- Files scanned: ${report.summary.filesScanned}\n`;
  markdown += `- Violations found: ${report.summary.violationsFound}\n`;
  markdown += `- Warnings found: ${report.summary.warningsFound}\n\n`;

  if (report.violations.length > 0) {
    markdown += '## Violations\n\n';
    report.violations.forEach((v, i) => {
      markdown += `${i + 1}. **${v.file}:${v.line}**\n`;
      markdown += `   - ${v.message}\n`;
      markdown += `   - Suggestion: ${v.suggestion}\n\n`;
    });
  }

  if (report.warnings.length > 0) {
    markdown += '## Warnings\n\n';
    report.warnings.forEach((w, i) => {
      markdown += `${i + 1}. **${w.file}:${w.line}**\n`;
      markdown += `   - ${w.message}\n`;
      markdown += `   - Suggestion: ${w.suggestion}\n\n`;
    });
  }

  fs.writeFileSync(markdownPath, markdown);

  console.log(`\n📄 Reports saved to:`);
  console.log(`   JSON: ${reportPath}`);
  console.log(`   Markdown: ${markdownPath}`);
}

// Main execution
function main() {
  const srcDir = path.join(__dirname, '../src');

  console.log('🔍 Starting Design System Audit...');
  console.log(`📁 Scanning directory: ${srcDir}`);

  // Find all TypeScript/React files
  const files = findFiles(srcDir, isTypeScriptFile);

  console.log(`📋 Found ${files.length} files to audit`);

  // Audit each file
  files.forEach(auditFile);

  // Generate and display report
  const report = generateReport();
  printReport(report);
  saveReport(report);

  // Record results in performance monitoring if available
  if (performanceMonitor) {
    try {
      performanceMonitor.recordDesignSystemAudit({
        violationsFound: report.summary.violationsFound,
        warningsFound: report.summary.warningsFound,
        filesScanned: report.summary.filesScanned,
      }, {
        environment: process.env.NODE_ENV || 'development',
        ci: process.env.CI === 'true',
      });
      console.log('✅ Design system audit results recorded in performance monitoring');
    } catch (error) {
      console.warn('Failed to record design system audit in performance monitoring:', error.message);
    }
  }

  // Exit with error code if violations found
  if (report.summary.violationsFound > 0) {
    console.log('\n❌ Design system violations found. Please fix them before proceeding.');
    process.exit(1);
  } else {
    console.log('\n✅ Design system audit passed!');
  }
}

// Run the audit
main();