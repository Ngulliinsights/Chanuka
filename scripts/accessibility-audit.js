#!/usr/bin/env node

/**
 * Automated Accessibility Audit Script
 * 
 * Runs axe-core accessibility tests on all pages and generates a report
 * 
 * Usage: node scripts/accessibility-audit.js
 */

import { AxePuppeteer } from '@axe-core/puppeteer';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pages to test
const PAGES_TO_TEST = [
  { name: 'Home', url: 'http://localhost:5173/' },
  { name: 'Bills', url: 'http://localhost:5173/bills' },
  { name: 'Dashboard', url: 'http://localhost:5173/dashboard' },
  { name: 'Login', url: 'http://localhost:5173/login' },
  { name: 'Bill Detail', url: 'http://localhost:5173/bills/1' },
  { name: 'Profile', url: 'http://localhost:5173/profile' },
  { name: 'Settings', url: 'http://localhost:5173/settings' },
];

// Severity levels
const SEVERITY_LEVELS = {
  critical: { emoji: '🔴', weight: 4 },
  serious: { emoji: '🟠', weight: 3 },
  moderate: { emoji: '🟡', weight: 2 },
  minor: { emoji: '🔵', weight: 1 },
};

async function runAccessibilityAudit() {
  console.log('🚀 Starting Accessibility Audit...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const allResults = [];
  let totalViolations = 0;
  let totalPasses = 0;

  try {
    for (const page of PAGES_TO_TEST) {
      console.log(`\n📄 Testing: ${page.name} (${page.url})`);
      
      const browserPage = await browser.newPage();
      
      try {
        await browserPage.goto(page.url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });

        // Run axe accessibility tests
        const results = await new AxePuppeteer(browserPage)
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();

        const violations = results.violations || [];
        const passes = results.passes || [];

        totalViolations += violations.length;
        totalPasses += passes.length;

        // Categorize by severity
        const bySeverity = {
          critical: violations.filter(v => v.impact === 'critical'),
          serious: violations.filter(v => v.impact === 'serious'),
          moderate: violations.filter(v => v.impact === 'moderate'),
          minor: violations.filter(v => v.impact === 'minor'),
        };

        console.log(`  ✅ Passes: ${passes.length}`);
        console.log(`  ❌ Violations: ${violations.length}`);
        console.log(`     🔴 Critical: ${bySeverity.critical.length}`);
        console.log(`     🟠 Serious: ${bySeverity.serious.length}`);
        console.log(`     🟡 Moderate: ${bySeverity.moderate.length}`);
        console.log(`     🔵 Minor: ${bySeverity.minor.length}`);

        allResults.push({
          page: page.name,
          url: page.url,
          violations,
          passes,
          bySeverity,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error(`  ❌ Error testing ${page.name}:`, error.message);
        allResults.push({
          page: page.name,
          url: page.url,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } finally {
        await browserPage.close();
      }
    }

  } finally {
    await browser.close();
  }

  // Generate reports
  console.log('\n\n📊 Generating Reports...\n');
  
  const reportDir = path.join(__dirname, '..', 'reports', 'accessibility');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // JSON Report
  const jsonReport = {
    summary: {
      totalPages: PAGES_TO_TEST.length,
      totalViolations,
      totalPasses,
      timestamp: new Date().toISOString(),
    },
    results: allResults,
  };

  const jsonPath = path.join(reportDir, `audit-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`✅ JSON Report: ${jsonPath}`);

  // Markdown Report
  const mdReport = generateMarkdownReport(jsonReport);
  const mdPath = path.join(reportDir, `audit-${Date.now()}.md`);
  fs.writeFileSync(mdPath, mdReport);
  console.log(`✅ Markdown Report: ${mdPath}`);

  // Summary Report
  const summaryPath = path.join(reportDir, 'LATEST_AUDIT.md');
  fs.writeFileSync(summaryPath, mdReport);
  console.log(`✅ Latest Audit: ${summaryPath}`);

  // Console Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Pages Tested: ${PAGES_TO_TEST.length}`);
  console.log(`Total Violations: ${totalViolations}`);
  console.log(`Total Passes: ${totalPasses}`);
  
  const allViolations = allResults.flatMap(r => r.violations || []);
  const criticalCount = allViolations.filter(v => v.impact === 'critical').length;
  const seriousCount = allViolations.filter(v => v.impact === 'serious').length;
  const moderateCount = allViolations.filter(v => v.impact === 'moderate').length;
  const minorCount = allViolations.filter(v => v.impact === 'minor').length;

  console.log(`\nBy Severity:`);
  console.log(`  🔴 Critical: ${criticalCount}`);
  console.log(`  🟠 Serious: ${seriousCount}`);
  console.log(`  🟡 Moderate: ${moderateCount}`);
  console.log(`  🔵 Minor: ${minorCount}`);
  console.log('='.repeat(60) + '\n');

  // Exit with error if critical violations found
  if (criticalCount > 0) {
    console.error('❌ CRITICAL VIOLATIONS FOUND - Fix immediately!');
    process.exit(1);
  }
}

function generateMarkdownReport(jsonReport) {
  const { summary, results } = jsonReport;
  
  let md = `# Accessibility Audit Report\n\n`;
  md += `**Date**: ${new Date(summary.timestamp).toLocaleString()}\n`;
  md += `**Pages Tested**: ${summary.totalPages}\n`;
  md += `**Total Violations**: ${summary.totalViolations}\n`;
  md += `**Total Passes**: ${summary.totalPasses}\n\n`;

  md += `---\n\n`;
  md += `## Summary by Severity\n\n`;

  const allViolations = results.flatMap(r => r.violations || []);
  const bySeverity = {
    critical: allViolations.filter(v => v.impact === 'critical'),
    serious: allViolations.filter(v => v.impact === 'serious'),
    moderate: allViolations.filter(v => v.impact === 'moderate'),
    minor: allViolations.filter(v => v.impact === 'minor'),
  };

  md += `| Severity | Count | Priority |\n`;
  md += `|----------|-------|----------|\n`;
  md += `| 🔴 Critical | ${bySeverity.critical.length} | Fix immediately |\n`;
  md += `| 🟠 Serious | ${bySeverity.serious.length} | Fix this week |\n`;
  md += `| 🟡 Moderate | ${bySeverity.moderate.length} | Fix this month |\n`;
  md += `| 🔵 Minor | ${bySeverity.minor.length} | Fix when possible |\n\n`;

  md += `---\n\n`;
  md += `## Results by Page\n\n`;

  for (const result of results) {
    if (result.error) {
      md += `### ❌ ${result.page}\n\n`;
      md += `**Error**: ${result.error}\n\n`;
      continue;
    }

    const violations = result.violations || [];
    const passes = result.passes || [];

    md += `### ${result.page}\n\n`;
    md += `**URL**: ${result.url}\n`;
    md += `**Passes**: ${passes.length} | **Violations**: ${violations.length}\n\n`;

    if (violations.length > 0) {
      md += `#### Violations\n\n`;

      // Group by severity
      for (const [severity, data] of Object.entries(SEVERITY_LEVELS)) {
        const severityViolations = violations.filter(v => v.impact === severity);
        if (severityViolations.length === 0) continue;

        md += `##### ${data.emoji} ${severity.toUpperCase()} (${severityViolations.length})\n\n`;

        for (const violation of severityViolations) {
          md += `**${violation.id}**: ${violation.description}\n`;
          md += `- **Impact**: ${violation.impact}\n`;
          md += `- **WCAG**: ${violation.tags.filter(t => t.startsWith('wcag')).join(', ')}\n`;
          md += `- **Affected Elements**: ${violation.nodes.length}\n`;
          md += `- **Help**: ${violation.helpUrl}\n\n`;

          // Show first affected element
          if (violation.nodes.length > 0) {
            const node = violation.nodes[0];
            md += `  Example:\n`;
            md += `  \`\`\`html\n`;
            md += `  ${node.html}\n`;
            md += `  \`\`\`\n`;
            md += `  ${node.failureSummary}\n\n`;
          }
        }
      }
    }

    md += `---\n\n`;
  }

  md += `## Next Steps\n\n`;
  md += `1. Fix all critical violations immediately\n`;
  md += `2. Address serious violations this week\n`;
  md += `3. Plan fixes for moderate violations\n`;
  md += `4. Schedule minor violation fixes\n`;
  md += `5. Re-run audit after fixes\n\n`;

  md += `## Resources\n\n`;
  md += `- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)\n`;
  md += `- [axe Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)\n`;
  md += `- [WebAIM](https://webaim.org/)\n\n`;

  return md;
}

// Run the audit
runAccessibilityAudit().catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});
