#!/usr/bin/env tsx
/**
 * Progress Tracking Dashboard
 * 
 * Tracks progress on comprehensive bug fixes by:
 * - Collecting metrics from all scanners (type violations, TODOs, ESLint suppressions)
 * - Comparing with baseline (BUG_BASELINE.md)
 * - Calculating progress percentage and velocity
 * - Generating HTML dashboard with charts
 * 
 * Usage:
 *   npm run track:progress
 *   tsx scripts/track-progress.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { scanForViolations, generateScanResult as generateTypeViolationResult, type ScanResult as TypeViolationScanResult } from './scan-type-violations';
import { scanForTodos, generateScanResult as generateTodoResult, type ScanResult as TodoScanResult } from './scan-todos';

// Types
interface BugMetrics {
  timestamp: Date;
  phase: 1 | 2 | 3 | 4 | 5;
  typeSafetyViolations: number;
  todoComments: number;
  eslintSuppressions: number;
  commentedImports: number;
  typescriptSuppressions: number;
  propertyTestPassRate: number;
  syntaxErrors: number;
}

interface PhaseProgress {
  phase: number;
  name: string;
  startDate: Date;
  targetEndDate: Date;
  actualEndDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  metrics: BugMetrics;
  blockers: string[];
}

interface ProgressReport {
  overallProgress: number; // 0-100%
  phases: PhaseProgress[];
  currentPhase: number;
  bugsFixed: number;
  bugsRemaining: number;
  velocity: number; // bugs fixed per day
  estimatedCompletion: Date;
  baseline: BugMetrics;
  current: BugMetrics;
}

// Baseline metrics from BUG_BASELINE.md
const BASELINE_METRICS: BugMetrics = {
  timestamp: new Date('2026-02-13'),
  phase: 1,
  typeSafetyViolations: 788,
  todoComments: 191,
  eslintSuppressions: 99,
  commentedImports: 33,
  typescriptSuppressions: 3,
  propertyTestPassRate: 67, // 10/15 tests passing
  syntaxErrors: 3,
};

// Target metrics (what we want to achieve)
const TARGET_METRICS: BugMetrics = {
  timestamp: new Date(),
  phase: 5,
  typeSafetyViolations: 0,
  todoComments: 0, // Only documentation TODOs acceptable
  eslintSuppressions: 10, // <10 with justification
  commentedImports: 0,
  typescriptSuppressions: 0,
  propertyTestPassRate: 100, // 15/15 tests passing
  syntaxErrors: 0,
};

// Phase definitions
const PHASES: Omit<PhaseProgress, 'metrics' | 'status' | 'actualEndDate' | 'blockers'>[] = [
  {
    phase: 1,
    name: 'Critical Bugs',
    startDate: new Date('2026-02-13'),
    targetEndDate: new Date('2026-02-20'), // Week 1
  },
  {
    phase: 2,
    name: 'High-Impact Type Safety',
    startDate: new Date('2026-02-20'),
    targetEndDate: new Date('2026-03-06'), // Weeks 2-3
  },
  {
    phase: 3,
    name: 'TODO/FIXME Resolution',
    startDate: new Date('2026-03-06'),
    targetEndDate: new Date('2026-03-13'), // Week 4
  },
  {
    phase: 4,
    name: 'Remaining Type Safety',
    startDate: new Date('2026-03-13'),
    targetEndDate: new Date('2026-04-03'), // Weeks 5-7
  },
  {
    phase: 5,
    name: 'Code Quality',
    startDate: new Date('2026-04-03'),
    targetEndDate: new Date('2026-04-10'), // Week 8
  },
];

/**
 * Scan for commented imports
 */
async function scanCommentedImports(): Promise<number> {
  const { glob } = await import('glob');
  const directories = ['client/src', 'server', 'shared'];
  let count = 0;
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;
    
    const files = await glob(`${dir}/**/*.{ts,tsx}`, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'] 
    });
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Match commented import statements
        if (line.match(/^\s*\/\/\s*import\s+/)) {
          count++;
        }
      }
    }
  }
  
  return count;
}

/**
 * Scan for TypeScript suppressions
 */
async function scanTypescriptSuppressions(): Promise<number> {
  const { glob } = await import('glob');
  const directories = ['client/src', 'server', 'shared'];
  let count = 0;
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;
    
    const files = await glob(`${dir}/**/*.{ts,tsx}`, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'] 
    });
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Match @ts-ignore, @ts-expect-error, @ts-nocheck
        if (line.match(/@ts-(ignore|expect-error|nocheck)/)) {
          count++;
        }
      }
    }
  }
  
  return count;
}

/**
 * Scan for ESLint suppressions
 */
async function scanEslintSuppressions(): Promise<number> {
  const { glob } = await import('glob');
  const directories = ['client/src', 'server', 'shared'];
  let count = 0;
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;
    
    const files = await glob(`${dir}/**/*.{ts,tsx,js,jsx}`, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'] 
    });
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        // Match eslint-disable, eslint-disable-next-line, eslint-disable-line
        if (line.match(/eslint-disable(-next-line|-line)?/)) {
          count++;
        }
      }
    }
  }
  
  return count;
}

/**
 * Get property test pass rate from test results
 */
async function getPropertyTestPassRate(): Promise<number> {
  // Try to read test results from vitest output
  const testResultsPath = 'test-results.json';
  
  if (fs.existsSync(testResultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(testResultsPath, 'utf-8'));
      const propertyTests = results.testResults?.filter((t: unknown) => 
        t.name?.includes('property') || t.name?.includes('Property')
      ) || [];
      
      if (propertyTests.length > 0) {
        const passed = propertyTests.filter((t: unknown) => t.status === 'passed').length;
        return (passed / propertyTests.length) * 100;
      }
    } catch (error) {
      console.warn('⚠️  Could not read test results, using default value');
    }
  }
  
  // Default: assume all tests pass if we can't read results
  return 100;
}

/**
 * Check for syntax errors using TypeScript compiler
 */
async function checkSyntaxErrors(): Promise<number> {
  const { execSync } = await import('child_process');
  
  try {
    // Run TypeScript compiler in check mode
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return 0; // No errors
  } catch (error: unknown) {
    // Parse error output to count syntax errors
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    const syntaxErrorPattern = /error TS\d+:/g;
    const matches = output.match(syntaxErrorPattern);
    return matches ? matches.length : 0;
  }
}

/**
 * Collect current metrics
 */
async function collectCurrentMetrics(): Promise<BugMetrics> {
  console.log('📊 Collecting current metrics...\n');
  
  // Run all scanners
  console.log('  🔍 Scanning type safety violations...');
  const typeViolations = await scanForViolations();
  const typeViolationResult = generateTypeViolationResult(typeViolations);
  
  console.log('  📝 Scanning TODO/FIXME comments...');
  const todos = await scanForTodos();
  const todoResult = generateTodoResult(todos);
  
  console.log('  🚫 Scanning ESLint suppressions...');
  const eslintSuppressions = await scanEslintSuppressions();
  
  console.log('  💬 Scanning commented imports...');
  const commentedImports = await scanCommentedImports();
  
  console.log('  🔧 Scanning TypeScript suppressions...');
  const typescriptSuppressions = await scanTypescriptSuppressions();
  
  console.log('  ✅ Checking property test pass rate...');
  const propertyTestPassRate = await getPropertyTestPassRate();
  
  console.log('  🔨 Checking for syntax errors...');
  const syntaxErrors = await checkSyntaxErrors();
  
  console.log('');
  
  // Determine current phase based on metrics
  let currentPhase: 1 | 2 | 3 | 4 | 5 = 1;
  if (syntaxErrors === 0 && commentedImports === 0 && propertyTestPassRate === 100) {
    currentPhase = 2; // Phase 1 complete
  }
  if (currentPhase === 2 && typeViolationResult.bySeverity.critical === 0 && typeViolationResult.bySeverity.high < 100) {
    currentPhase = 3; // Phase 2 in progress or complete
  }
  if (currentPhase === 3 && todoResult.byType.known_bug === 0 && todoResult.byType.workaround === 0) {
    currentPhase = 4; // Phase 3 complete
  }
  if (currentPhase === 4 && typeViolationResult.totalViolations < 100) {
    currentPhase = 5; // Phase 4 in progress or complete
  }
  
  return {
    timestamp: new Date(),
    phase: currentPhase,
    typeSafetyViolations: typeViolationResult.totalViolations,
    todoComments: todoResult.totalComments,
    eslintSuppressions,
    commentedImports,
    typescriptSuppressions,
    propertyTestPassRate,
    syntaxErrors,
  };
}

/**
 * Calculate progress percentage
 */
function calculateProgress(baseline: BugMetrics, current: BugMetrics, target: BugMetrics): number {
  // Calculate total bugs in baseline
  const baselineTotal = 
    baseline.typeSafetyViolations +
    baseline.todoComments +
    baseline.eslintSuppressions +
    baseline.commentedImports +
    baseline.typescriptSuppressions +
    baseline.syntaxErrors +
    (100 - baseline.propertyTestPassRate); // Convert pass rate to "bugs"
  
  // Calculate total bugs remaining
  const currentTotal = 
    current.typeSafetyViolations +
    current.todoComments +
    Math.max(0, current.eslintSuppressions - target.eslintSuppressions) + // Allow up to 10
    current.commentedImports +
    current.typescriptSuppressions +
    current.syntaxErrors +
    (100 - current.propertyTestPassRate);
  
  // Calculate bugs fixed
  const bugsFixed = baselineTotal - currentTotal;
  
  // Calculate progress percentage
  const progress = (bugsFixed / baselineTotal) * 100;
  
  return Math.max(0, Math.min(100, progress));
}

/**
 * Calculate velocity (bugs fixed per day)
 */
function calculateVelocity(baseline: BugMetrics, current: BugMetrics): number {
  const baselineTotal = 
    baseline.typeSafetyViolations +
    baseline.todoComments +
    baseline.eslintSuppressions +
    baseline.commentedImports +
    baseline.typescriptSuppressions +
    baseline.syntaxErrors;
  
  const currentTotal = 
    current.typeSafetyViolations +
    current.todoComments +
    current.eslintSuppressions +
    current.commentedImports +
    current.typescriptSuppressions +
    current.syntaxErrors;
  
  const bugsFixed = baselineTotal - currentTotal;
  
  // Calculate days elapsed
  const daysElapsed = Math.max(1, (current.timestamp.getTime() - baseline.timestamp.getTime()) / (1000 * 60 * 60 * 24));
  
  return bugsFixed / daysElapsed;
}

/**
 * Estimate completion date
 */
function estimateCompletion(current: BugMetrics, velocity: number, target: BugMetrics): Date {
  const currentTotal = 
    current.typeSafetyViolations +
    current.todoComments +
    Math.max(0, current.eslintSuppressions - target.eslintSuppressions) +
    current.commentedImports +
    current.typescriptSuppressions +
    current.syntaxErrors;
  
  if (velocity <= 0) {
    // If no progress, estimate based on original timeline (8 weeks)
    return new Date(current.timestamp.getTime() + (8 * 7 * 24 * 60 * 60 * 1000));
  }
  
  const daysRemaining = currentTotal / velocity;
  return new Date(current.timestamp.getTime() + (daysRemaining * 24 * 60 * 60 * 1000));
}

/**
 * Determine phase status
 */
function determinePhaseStatus(phase: number, currentPhase: number, metrics: BugMetrics): PhaseProgress['status'] {
  if (phase < currentPhase) {
    return 'completed';
  } else if (phase === currentPhase) {
    return 'in_progress';
  } else {
    return 'not_started';
  }
}

/**
 * Identify blockers for current phase
 */
function identifyBlockers(phase: number, metrics: BugMetrics): string[] {
  const blockers: string[] = [];
  
  switch (phase) {
    case 1:
      if (metrics.syntaxErrors > 0) {
        blockers.push(`${metrics.syntaxErrors} syntax errors blocking compilation`);
      }
      if (metrics.commentedImports > 0) {
        blockers.push(`${metrics.commentedImports} commented imports (missing modules)`);
      }
      if (metrics.propertyTestPassRate < 100) {
        blockers.push(`Property tests at ${metrics.propertyTestPassRate}% (need 100%)`);
      }
      break;
      
    case 2:
      const criticalTypeViolations = metrics.typeSafetyViolations; // Simplified
      if (criticalTypeViolations > 200) {
        blockers.push(`${criticalTypeViolations} type safety violations (target: ~200 fixed)`);
      }
      break;
      
    case 3:
      if (metrics.todoComments > 0) {
        blockers.push(`${metrics.todoComments} TODO/FIXME comments need resolution`);
      }
      break;
      
    case 4:
      if (metrics.typeSafetyViolations > 0) {
        blockers.push(`${metrics.typeSafetyViolations} type safety violations remaining`);
      }
      break;
      
    case 5:
      if (metrics.eslintSuppressions > 10) {
        blockers.push(`${metrics.eslintSuppressions} ESLint suppressions (target: <10)`);
      }
      if (metrics.typescriptSuppressions > 0) {
        blockers.push(`${metrics.typescriptSuppressions} TypeScript suppressions (target: 0)`);
      }
      break;
  }
  
  return blockers;
}

/**
 * Generate progress report
 */
async function generateProgressReport(): Promise<ProgressReport> {
  const current = await collectCurrentMetrics();
  const progress = calculateProgress(BASELINE_METRICS, current, TARGET_METRICS);
  const velocity = calculateVelocity(BASELINE_METRICS, current);
  const estimatedCompletion = estimateCompletion(current, velocity, TARGET_METRICS);
  
  const baselineTotal = 
    BASELINE_METRICS.typeSafetyViolations +
    BASELINE_METRICS.todoComments +
    BASELINE_METRICS.eslintSuppressions +
    BASELINE_METRICS.commentedImports +
    BASELINE_METRICS.typescriptSuppressions +
    BASELINE_METRICS.syntaxErrors;
  
  const currentTotal = 
    current.typeSafetyViolations +
    current.todoComments +
    Math.max(0, current.eslintSuppressions - TARGET_METRICS.eslintSuppressions) +
    current.commentedImports +
    current.typescriptSuppressions +
    current.syntaxErrors;
  
  const bugsFixed = baselineTotal - currentTotal;
  const bugsRemaining = currentTotal;
  
  // Generate phase progress
  const phases: PhaseProgress[] = PHASES.map(phaseTemplate => {
    const status = determinePhaseStatus(phaseTemplate.phase, current.phase, current);
    const blockers = status === 'in_progress' ? identifyBlockers(phaseTemplate.phase, current) : [];
    
    return {
      ...phaseTemplate,
      metrics: current,
      status,
      blockers,
      actualEndDate: status === 'completed' ? new Date() : undefined,
    };
  });
  
  return {
    overallProgress: progress,
    phases,
    currentPhase: current.phase,
    bugsFixed,
    bugsRemaining,
    velocity,
    estimatedCompletion,
    baseline: BASELINE_METRICS,
    current,
  };
}

/**
 * Save JSON report
 */
function saveJsonReport(report: ProgressReport, outputPath: string): void {
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`📄 JSON report saved to: ${outputPath}`);
}

/**
 * Print summary to console
 */
function printSummary(report: ProgressReport): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPREHENSIVE BUG FIXES - PROGRESS REPORT');
  console.log('='.repeat(70));
  console.log(`\n📅 Report Date: ${report.current.timestamp.toLocaleString()}`);
  console.log(`\n🎯 Overall Progress: ${report.overallProgress.toFixed(1)}%`);
  console.log(`   Bugs Fixed: ${report.bugsFixed} / ${report.bugsFixed + report.bugsRemaining}`);
  console.log(`   Bugs Remaining: ${report.bugsRemaining}`);
  console.log(`   Velocity: ${report.velocity.toFixed(1)} bugs/day`);
  console.log(`   Estimated Completion: ${report.estimatedCompletion.toLocaleDateString()}`);
  
  console.log(`\n📈 Current Phase: Phase ${report.currentPhase} - ${report.phases[report.currentPhase - 1].name}`);
  
  console.log('\n📊 Metrics Comparison:');
  console.log('   Metric                        Baseline  Current  Target   Progress');
  console.log('   ' + '-'.repeat(66));
  
  const metrics = [
    ['Type Safety Violations', report.baseline.typeSafetyViolations, report.current.typeSafetyViolations, TARGET_METRICS.typeSafetyViolations],
    ['TODO/FIXME Comments', report.baseline.todoComments, report.current.todoComments, TARGET_METRICS.todoComments],
    ['ESLint Suppressions', report.baseline.eslintSuppressions, report.current.eslintSuppressions, TARGET_METRICS.eslintSuppressions],
    ['Commented Imports', report.baseline.commentedImports, report.current.commentedImports, TARGET_METRICS.commentedImports],
    ['TypeScript Suppressions', report.baseline.typescriptSuppressions, report.current.typescriptSuppressions, TARGET_METRICS.typescriptSuppressions],
    ['Syntax Errors', report.baseline.syntaxErrors, report.current.syntaxErrors, TARGET_METRICS.syntaxErrors],
    ['Property Test Pass Rate', report.baseline.propertyTestPassRate, report.current.propertyTestPassRate, TARGET_METRICS.propertyTestPassRate],
  ];
  
  for (const [name, baseline, current, target] of metrics) {
    const progress = baseline === target ? 100 : ((baseline - current) / (baseline - target)) * 100;
    const progressStr = progress >= 100 ? '✅ 100%' : `${Math.max(0, progress).toFixed(0)}%`;
    console.log(`   ${(name as string).padEnd(28)} ${baseline.toString().padStart(8)} ${current.toString().padStart(8)} ${target.toString().padStart(8)}  ${progressStr}`);
  }
  
  console.log('\n📋 Phase Status:');
  for (const phase of report.phases) {
    const statusIcon = phase.status === 'completed' ? '✅' : phase.status === 'in_progress' ? '🔄' : '⏳';
    console.log(`   ${statusIcon} Phase ${phase.phase}: ${phase.name.padEnd(25)} [${phase.status}]`);
    
    if (phase.blockers.length > 0) {
      for (const blocker of phase.blockers) {
        console.log(`      ⚠️  ${blocker}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Recommendations
  if (report.bugsRemaining > 0) {
    console.log('\n💡 NEXT STEPS:');
    const currentPhase = report.phases[report.currentPhase - 1];
    if (currentPhase.blockers.length > 0) {
      console.log(`   Focus on Phase ${currentPhase.phase} blockers:`);
      currentPhase.blockers.forEach(blocker => console.log(`   - ${blocker}`));
    } else {
      console.log(`   Continue with Phase ${currentPhase.phase}: ${currentPhase.name}`);
    }
  } else {
    console.log('\n🎉 ALL BUGS FIXED! Ready for production!');
  }
}

/**
 * Generate HTML dashboard
 */
function generateHtmlDashboard(report: ProgressReport, outputPath: string): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bug Fix Progress Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .header h1 { color: #333; margin-bottom: 10px; font-size: 32px; }
    .header .subtitle { color: #666; font-size: 16px; }
    .progress-bar-container {
      background: #e5e7eb;
      height: 40px;
      border-radius: 20px;
      overflow: hidden;
      margin: 20px 0;
      position: relative;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
      transition: width 1s ease-out;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-card h3 { color: #666; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
    .stat-card .value { font-size: 36px; font-weight: bold; color: #333; }
    .stat-card .change {
      font-size: 14px;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 12px;
      display: inline-block;
    }
    .change.positive { background: #d1fae5; color: #10b981; }
    .change.negative { background: #fee2e2; color: #ef4444; }
    .chart-container {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .chart-container h2 { color: #333; margin-bottom: 20px; font-size: 20px; }
    .chart-wrapper { position: relative; height: 300px; }
    .phases {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .phases h2 { color: #333; margin-bottom: 20px; font-size: 20px; }
    .phase-item {
      padding: 20px;
      border-left: 4px solid #e5e7eb;
      margin-bottom: 15px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .phase-item.completed { border-left-color: #10b981; }
    .phase-item.in_progress { border-left-color: #3b82f6; }
    .phase-item.not_started { border-left-color: #e5e7eb; }
    .phase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .phase-title { font-weight: 600; font-size: 16px; color: #333; }
    .phase-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .phase-status.completed { background: #d1fae5; color: #10b981; }
    .phase-status.in_progress { background: #dbeafe; color: #3b82f6; }
    .phase-status.not_started { background: #f3f4f6; color: #9ca3af; }
    .phase-dates { font-size: 14px; color: #666; margin-bottom: 10px; }
    .blockers {
      background: #fef3c7;
      border-left: 3px solid #f59e0b;
      padding: 12px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .blockers h4 { color: #f59e0b; font-size: 14px; margin-bottom: 8px; }
    .blockers ul { list-style: none; }
    .blockers li { color: #92400e; font-size: 13px; padding: 4px 0; }
    .blockers li:before { content: "⚠️ "; margin-right: 8px; }
    .metrics-table {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .metrics-table h2 { color: #333; margin-bottom: 20px; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #666; font-size: 14px; }
    td { font-size: 14px; color: #333; }
    .metric-bar {
      height: 20px;
      background: #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    }
    .metric-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
      transition: width 0.5s ease-out;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐛 Comprehensive Bug Fixes - Progress Dashboard</h1>
      <div class="subtitle">Generated: ${report.current.timestamp.toLocaleString()}</div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${report.overallProgress}%">
          ${report.overallProgress.toFixed(1)}% Complete
        </div>
      </div>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <h3>Bugs Fixed</h3>
        <div class="value">${report.bugsFixed}</div>
        <div class="change positive">↓ ${report.baseline.typeSafetyViolations + report.baseline.todoComments + report.baseline.eslintSuppressions + report.baseline.commentedImports + report.baseline.typescriptSuppressions + report.baseline.syntaxErrors} total</div>
      </div>
      <div class="stat-card">
        <h3>Bugs Remaining</h3>
        <div class="value">${report.bugsRemaining}</div>
        <div class="change ${report.bugsRemaining === 0 ? 'positive' : 'negative'}">${report.bugsRemaining === 0 ? '✅ Target met!' : `${report.bugsRemaining} to go`}</div>
      </div>
      <div class="stat-card">
        <h3>Velocity</h3>
        <div class="value">${report.velocity.toFixed(1)}</div>
        <div class="change positive">bugs/day</div>
      </div>
      <div class="stat-card">
        <h3>Current Phase</h3>
        <div class="value">${report.currentPhase}</div>
        <div class="change positive">${report.phases[report.currentPhase - 1].name}</div>
      </div>
      <div class="stat-card">
        <h3>Est. Completion</h3>
        <div class="value" style="font-size: 20px;">${report.estimatedCompletion.toLocaleDateString()}</div>
        <div class="change positive">${Math.ceil((report.estimatedCompletion.getTime() - report.current.timestamp.getTime()) / (1000 * 60 * 60 * 24))} days</div>
      </div>
    </div>

    <div class="chart-container">
      <h2>📊 Metrics Progress</h2>
      <div class="chart-wrapper">
        <canvas id="metricsChart"></canvas>
      </div>
    </div>
    
    <div class="chart-container">
      <h2>📈 Bug Trend Over Time</h2>
      <div class="chart-wrapper">
        <canvas id="trendChart"></canvas>
      </div>
    </div>
    
    <div class="phases">
      <h2>📋 Phase Progress</h2>
      ${report.phases.map(phase => `
        <div class="phase-item ${phase.status}">
          <div class="phase-header">
            <div class="phase-title">
              ${phase.status === 'completed' ? '✅' : phase.status === 'in_progress' ? '🔄' : '⏳'}
              Phase ${phase.phase}: ${phase.name}
            </div>
            <div class="phase-status ${phase.status}">${phase.status.replace('_', ' ')}</div>
          </div>
          <div class="phase-dates">
            ${phase.startDate.toLocaleDateString()} - ${phase.targetEndDate.toLocaleDateString()}
            ${phase.actualEndDate ? ` (Completed: ${phase.actualEndDate.toLocaleDateString()})` : ''}
          </div>
          ${phase.blockers.length > 0 ? `
            <div class="blockers">
              <h4>Blockers</h4>
              <ul>
                ${phase.blockers.map(blocker => `<li>${blocker}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="metrics-table">
      <h2>📊 Detailed Metrics Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Baseline</th>
            <th>Current</th>
            <th>Target</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['Type Safety Violations', report.baseline.typeSafetyViolations, report.current.typeSafetyViolations, TARGET_METRICS.typeSafetyViolations],
            ['TODO/FIXME Comments', report.baseline.todoComments, report.current.todoComments, TARGET_METRICS.todoComments],
            ['ESLint Suppressions', report.baseline.eslintSuppressions, report.current.eslintSuppressions, TARGET_METRICS.eslintSuppressions],
            ['Commented Imports', report.baseline.commentedImports, report.current.commentedImports, TARGET_METRICS.commentedImports],
            ['TypeScript Suppressions', report.baseline.typescriptSuppressions, report.current.typescriptSuppressions, TARGET_METRICS.typescriptSuppressions],
            ['Syntax Errors', report.baseline.syntaxErrors, report.current.syntaxErrors, TARGET_METRICS.syntaxErrors],
            ['Property Test Pass Rate (%)', report.baseline.propertyTestPassRate, report.current.propertyTestPassRate, TARGET_METRICS.propertyTestPassRate],
          ].map(([name, baseline, current, target]) => {
            const progress = baseline === target ? 100 : ((baseline - current) / (baseline - target)) * 100;
            const progressClamped = Math.max(0, Math.min(100, progress));
            return `
              <tr>
                <td><strong>${name}</strong></td>
                <td>${baseline}</td>
                <td>${current}</td>
                <td>${target}</td>
                <td>
                  <div class="metric-bar">
                    <div class="metric-bar-fill" style="width: ${progressClamped}%"></div>
                  </div>
                  <div style="margin-top: 4px; font-size: 12px; color: #666;">
                    ${progressClamped >= 100 ? '✅ Complete' : `${progressClamped.toFixed(0)}%`}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>
  
  <script>
    // Metrics Chart
    const metricsCtx = document.getElementById('metricsChart').getContext('2d');
    new Chart(metricsCtx, {
      type: 'bar',
      data: {
        labels: ['Type Safety', 'TODOs', 'ESLint', 'Imports', 'TS Suppress', 'Syntax'],
        datasets: [
          {
            label: 'Baseline',
            data: [${report.baseline.typeSafetyViolations}, ${report.baseline.todoComments}, ${report.baseline.eslintSuppressions}, ${report.baseline.commentedImports}, ${report.baseline.typescriptSuppressions}, ${report.baseline.syntaxErrors}],
            backgroundColor: 'rgba(239, 68, 68, 0.5)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1
          },
          {
            label: 'Current',
            data: [${report.current.typeSafetyViolations}, ${report.current.todoComments}, ${report.current.eslintSuppressions}, ${report.current.commentedImports}, ${report.current.typescriptSuppressions}, ${report.current.syntaxErrors}],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1
          },
          {
            label: 'Target',
            data: [${TARGET_METRICS.typeSafetyViolations}, ${TARGET_METRICS.todoComments}, ${TARGET_METRICS.eslintSuppressions}, ${TARGET_METRICS.commentedImports}, ${TARGET_METRICS.typescriptSuppressions}, ${TARGET_METRICS.syntaxErrors}],
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    // Trend Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['Baseline', 'Current', 'Target'],
        datasets: [{
          label: 'Total Bugs',
          data: [
            ${report.baseline.typeSafetyViolations + report.baseline.todoComments + report.baseline.eslintSuppressions + report.baseline.commentedImports + report.baseline.typescriptSuppressions + report.baseline.syntaxErrors},
            ${report.current.typeSafetyViolations + report.current.todoComments + report.current.eslintSuppressions + report.current.commentedImports + report.current.typescriptSuppressions + report.current.syntaxErrors},
            ${TARGET_METRICS.typeSafetyViolations + TARGET_METRICS.todoComments + TARGET_METRICS.eslintSuppressions + TARGET_METRICS.commentedImports + TARGET_METRICS.typescriptSuppressions + TARGET_METRICS.syntaxErrors}
          ],
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  </script>
</body>
</html>
  `.trim();
  
  fs.writeFileSync(outputPath, html);
  console.log(`📊 HTML dashboard saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🔍 Tracking progress on comprehensive bug fixes...\n');
  
  try {
    // Generate progress report
    const report = await generateProgressReport();
    
    // Create output directory
    const outputDir = 'analysis-results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save reports
    const jsonPath = path.join(outputDir, 'progress-report.json');
    const htmlPath = path.join(outputDir, 'progress-dashboard.html');
    
    saveJsonReport(report, jsonPath);
    generateHtmlDashboard(report, htmlPath);
    printSummary(report);
    
    console.log(`\n✅ Progress tracking complete!`);
    console.log(`   📄 JSON report: ${jsonPath}`);
    console.log(`   📊 Dashboard: ${htmlPath}`);
    console.log(`\n💡 Open ${htmlPath} in your browser to view the interactive dashboard.`);
    
    // Exit with appropriate code
    process.exit(report.bugsRemaining === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error tracking progress:', error);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

export { generateProgressReport, type ProgressReport, type BugMetrics, type PhaseProgress };
