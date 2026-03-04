#!/usr/bin/env tsx

/**
 * audit-quality.ts — PR / Merge Gate
 *
 * Scans ALL files (source + tests) for AI code smell, architectural drift,
 * test quality gaps, and maintainability issues. Runs pre-merge in CI.
 *
 * Unlike audit-security.ts this script is threshold-based: it fails only when
 * the weighted issue count exceeds --threshold (default: 10). This lets teams
 * tolerate a small amount of medium/low noise without blocking every PR.
 *
 * Exit codes:
 *   0 — weighted score within threshold (merge allowed)
 *   1 — weighted score exceeds threshold (merge blocked)
 *
 * Weighted score = (critical × 4) + (high × 2) + (medium × 1) + (low × 0.5)
 *
 * Usage:
 *   npx tsx audit-quality.ts
 *   npx tsx audit-quality.ts -- --threshold=20
 *   npx tsx audit-quality.ts -- --output=console
 *   npx tsx audit-quality.ts -- --category=test
 *   npx tsx audit-quality.ts -- --help
 *
 * npm script (package.json):
 *   "audit:quality": "tsx scripts/audit-quality.ts"
 */

import * as fs from 'fs';
import { glob } from 'glob';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity    = 'critical' | 'high' | 'medium' | 'low';
type OutputFormat = 'markdown' | 'json' | 'console';

interface AuditFinding {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  file: string;
  line: number;
  code: string;
  recommendation: string;
}

interface AuditReport {
  timestamp: string;
  filesScanned: number;
  weightedScore: number;
  threshold: number;
  passed: boolean;
  findings: AuditFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    byCategory: Record<string, number>;
  };
}

interface AuditOptions {
  severity?: Severity;
  category?: string;
  paths?: string[];
  output?: OutputFormat;
  ignore?: string[];
  concurrency?: number;
  threshold?: number;
}

interface FileContext {
  file: string;
  lines: string[];
  content: string;
  inBlock: boolean[];
  isTestFile: boolean;
}

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const ANSI = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  grey:    '\x1b[90m',
  magenta: '\x1b[35m',
};

function colorize(text: string, ...codes: string[]): string {
  return `${codes.join('')}${text}${ANSI.reset}`;
}

const severityColor: Record<Severity, string> = {
  critical: ANSI.red + ANSI.bold,
  high:     ANSI.red,
  medium:   ANSI.yellow,
  low:      ANSI.grey,
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high:     2,
  medium:   1,
  low:      0.5,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function matchLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

function buildBlockCommentMap(lines: string[]): boolean[] {
  const inBlock: boolean[] = new Array(lines.length).fill(false);
  let inside = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!inside && line.includes('/*')) inside = true;
    inBlock[i] = inside;
    if (inside && line.includes('*/')) inside = false;
  }
  return inBlock;
}

function lineWindow(lines: string[], center: number, before: number, after: number): string {
  return lines
    .slice(Math.max(0, center - before), Math.min(lines.length, center + after + 1))
    .join('\n');
}

// ─── Quality Auditor ──────────────────────────────────────────────────────────

class QualityAuditor {
  private findings: AuditFinding[] = [];
  private filesScanned = 0;
  private idCounter = 0;
  private readonly seenKeys = new Set<string>();

  async audit(options: AuditOptions = {}): Promise<AuditReport> {
    // Scan ALL files including tests — quality applies everywhere
    const patterns = options.paths ?? [
      'src/**/*.ts',
      'server/**/*.ts',
      '!node_modules/**',
      '!dist/**',
    ];

    const ignorePatterns = options.ignore ?? [];
    const allFiles = await glob(patterns);
    const files = allFiles.filter(f => !ignorePatterns.some(p => f.includes(p)));

    console.log(colorize('\n🔎 Quality audit starting…\n', ANSI.bold));
    console.log(colorize(`📁 ${files.length} files to scan (source + tests)\n`, ANSI.cyan));

    const concurrency = options.concurrency ?? 20;
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      await Promise.all(batch.map(f => this.auditFile(f)));
      this.filesScanned += batch.length;
    }

    let { findings } = this;
    if (options.severity) findings = findings.filter(f => f.severity === options.severity);
    if (options.category) {
      const lc = options.category.toLowerCase();
      findings = findings.filter(f => f.category.toLowerCase().includes(lc));
    }

    return this.buildReport(findings, options.threshold ?? 10);
  }

  // ── File-level dispatch ───────────────────────────────────────────────────

  private async auditFile(filePath: string): Promise<void> {
    let content: string;
    try { content = fs.readFileSync(filePath, 'utf-8'); }
    catch { return; }

    const lines = content.split('\n');
    const inBlock = buildBlockCommentMap(lines);
    const isTestFile =
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('__tests__');

    const ctx: FileContext = { file: filePath, lines, content, inBlock, isTestFile };

    // ── AI code smell (all files) ─────────────────────────────────────────
    this.checkFunctionLength(ctx);
    this.checkExcessiveComments(ctx);
    this.checkMagicNumbers(ctx);

    // ── Code hygiene (all files) ──────────────────────────────────────────
    this.checkTodoComments(ctx);
    this.checkConsoleStatements(ctx);
    this.checkCommentedCode(ctx);
    this.checkIncompleteTypes(ctx);

    // ── Architecture (all files) ──────────────────────────────────────────
    this.checkSingletonPattern(ctx);

    // ── Test quality (test files only) ────────────────────────────────────
    if (isTestFile) {
      this.checkBehavioralAssertions(ctx);
      this.checkMissingFailureCases(ctx);
    }
  }

  // ── AI Code Smell ─────────────────────────────────────────────────────────

  /**
   * Functions >40 lines — the point where AI-generated code stops being
   * readable and starts hiding logic errors.
   * "80–90% of AI code skips refactoring completely."
   */
  private checkFunctionLength({ file, content }: FileContext): void {
    const FN_START =
      /\b(?:async\s+)?(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\{/g;

    let match: RegExpExecArray | null;
    while ((match = FN_START.exec(content)) !== null) {
      const startIdx = match.index + match[0].length - 1;
      let depth = 1, pos = startIdx + 1, newlines = 0;

      while (pos < content.length && depth > 0) {
        const ch = content[pos];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '\n') newlines++;
        pos++;
      }

      if (newlines > 40) {
        this.addFinding({
          severity: 'medium', category: 'AI Code Smell - Function Length',
          title: `Function exceeds 40 lines (${newlines} lines)`,
          description:
            `This function is ${newlines} lines long. AI skips refactoring — ` +
            'making functions hard to test, review, and maintain.',
          file, line: matchLineNumber(content, match.index),
          code: match[0].substring(0, 100).trimEnd() + '…',
          recommendation:
            'Extract cohesive sub-steps into named helpers. ' +
            'Use skeleton architecture: you design the interface, AI fills the repetitive internals.',
        });
      }
    }
  }

  /**
   * Regions where >50% of lines are comments.
   * "90–100% of AI code has too many comments."
   */
  private checkExcessiveComments({ file, lines, inBlock }: FileContext): void {
    const WINDOW = 20, MIN_CODE = 5;
    let lastFlagged = -1;

    for (let i = 0; i < lines.length - WINDOW; i++) {
      const slice = lines.slice(i, i + WINDOW);
      const commentCount = slice.filter((l, j) => {
        const t = l.trimStart();
        return inBlock[i + j] || t.startsWith('//') || t.startsWith('*');
      }).length;
      const codeCount = slice.filter(l => l.trim().length > 0).length;
      if (codeCount < MIN_CODE) continue;

      const ratio = commentCount / codeCount;
      if (ratio > 0.5 && i > lastFlagged + WINDOW) {
        lastFlagged = i;
        this.addFinding({
          severity: 'low', category: 'AI Code Smell - Excessive Comments',
          title: `Comment density ${Math.round(ratio * 100)}% in 20-line window`,
          description:
            'More than half the lines in this region are comments — a reliable signal of ' +
            'AI-generated code that explains rather than communicates.',
          file, line: i + 1,
          code: (lines[i] ?? '').trim(),
          recommendation:
            'Delete comments that restate the code. Rename variables/functions to be ' +
            'self-documenting. Keep only comments that explain *why*, not *what*.',
        });
      }
    }
  }

  /**
   * Numeric literals used directly in expressions.
   * AI inlines these everywhere because it doesn't know your domain constants.
   */
  private checkMagicNumbers({ file, lines, inBlock }: FileContext): void {
    const MAGIC = /(?<![.\w])(?!0\.|1\.)\b([2-9]\d{1,}|\d{3,})\b/;
    const SAFE  = /\b(length|size|index|version|port|status|code|timeout|limit|max|min)\b/i;

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (SAFE.test(line)) return;
      if (/\b(test|describe|it|expect)\b/.test(line)) return;
      if (!/[+\-*/%<>=!&|]/.test(line)) return;
      if (MAGIC.test(line)) {
        this.addFinding({
          severity: 'low', category: 'AI Code Smell - Magic Number',
          title: 'Magic number in expression',
          description:
            'An unexplained numeric literal is used directly in logic. ' +
            'AI inlines these without domain context, making intent opaque.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Extract to a named constant: const MAX_RETRY_ATTEMPTS = 3. ' +
            'Group related constants in a dedicated constants file.',
        });
      }
    });
  }

  // ── Code Hygiene ──────────────────────────────────────────────────────────

  private checkTodoComments({ file, lines, inBlock }: FileContext): void {
    const markers: Array<{ pattern: RegExp; severity: Severity; label: string }> = [
      { pattern: /\/\/\s*TODO\b/i,           severity: 'medium',   label: 'TODO'            },
      { pattern: /\/\/\s*FIXME\b/i,          severity: 'high',     label: 'FIXME'           },
      { pattern: /\/\/\s*HACK\b/i,           severity: 'high',     label: 'HACK'            },
      { pattern: /\/\/\s*XXX\b/,             severity: 'high',     label: 'XXX'             },
      { pattern: /\/\/\s*TEMP\b/i,           severity: 'medium',   label: 'TEMP'            },
      { pattern: /not\s+implemented\s+yet/i, severity: 'critical', label: 'Not Implemented' },
      { pattern: /\/\/\s*placeholder/i,      severity: 'medium',   label: 'Placeholder'     },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      markers.forEach(({ pattern, severity, label }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity, category: 'Code Hygiene - Incomplete Work',
            title: `${label} comment in code`,
            description: `${label} signals unfinished work that may be shipping to production.`,
            file, line: i + 1, code: line.trim(),
            recommendation: 'Resolve the issue or create a tracked ticket and remove the marker.',
          });
        }
      });
    });
  }

  private checkConsoleStatements({ file, lines, inBlock, isTestFile }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;

      if (/\bconsole\.(log|warn|debug|info|error)\s*\(/.test(line)) {
        this.addFinding({
          severity: isTestFile ? 'low' : 'medium',
          category: 'Code Hygiene - Debug Code',
          title: 'console statement in code',
          description: 'Raw console calls bypass log levels and structured logging.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Replace with logger.debug() / logger.info() / logger.error().',
        });
      }

      if (/\bdebugger\b/.test(line)) {
        this.addFinding({
          severity: 'high', category: 'Code Hygiene - Debug Code',
          title: 'debugger statement left in code',
          description: 'A debugger statement pauses execution in any environment with DevTools open.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Remove the debugger statement before committing.',
        });
      }
    });
  }

  private checkCommentedCode({ file, lines, inBlock }: FileContext): void {
    const codeIndicators = [
      /^\/\/\s*(const|let|var|function|class|return|if\s*\(|for\s*\(|await\s+|import\s)/,
    ];

    let blockStart = -1;

    const flush = (end: number) => {
      if (blockStart >= 0 && end - blockStart >= 2) {
        this.addFinding({
          severity: 'low', category: 'Code Hygiene - Dead Code',
          title: 'Commented-out code block',
          description: `${end - blockStart} consecutive lines of commented code (lines ${blockStart + 1}–${end}).`,
          file, line: blockStart + 1,
          code: (lines[blockStart] ?? '').trim(),
          recommendation: 'Remove commented code; rely on git history to recover it if needed.',
        });
      }
      blockStart = -1;
    };

    lines.forEach((line, i) => {
      if (inBlock[i]) { flush(i); return; }
      if (codeIndicators.some(p => p.test(line.trimStart()))) {
        if (blockStart < 0) blockStart = i;
      } else {
        flush(i);
      }
    });
    flush(lines.length);
  }

  private checkIncompleteTypes({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;

      if (/:\s*any[\s,;>)]/.test(line) && !line.includes('eslint-disable')) {
        this.addFinding({
          severity: 'low', category: 'Code Hygiene - Types',
          title: 'Explicit any type',
          description: 'any disables type checking for this value and can mask bugs.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use unknown with a type guard, or define a concrete interface.',
        });
      }

      if (/\binterface\s+\w+/.test(line) && i + 1 < lines.length) {
        const next = (lines[i + 1] ?? '').trim();
        if (next === '{' && (lines[i + 2] ?? '').trim() === '}') {
          this.addFinding({
            severity: 'medium', category: 'Code Hygiene - Types',
            title: 'Empty interface',
            description: 'Interface has no members; it provides no type safety.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Add members or remove the interface if unused.',
          });
        }
      }

      if (/\binterface\s+\w+\s*\{\s*\}/.test(line)) {
        this.addFinding({
          severity: 'medium', category: 'Code Hygiene - Types',
          title: 'Empty interface',
          description: 'Interface has no members; it provides no type safety.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Add members or remove the interface if unused.',
        });
      }

      if (/\b(type|interface)\s+(Data|Entity|Item|Thing|Stuff)\b/.test(line)) {
        this.addFinding({
          severity: 'low', category: 'Code Hygiene - Types',
          title: 'Generic type name',
          description: 'The type name is too generic to convey meaning in context.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use a descriptive name that reflects the domain concept.',
        });
      }
    });
  }

  // ── Architecture ──────────────────────────────────────────────────────────

  private checkSingletonPattern({ file, lines, content }: FileContext): void {
    if (
      /\bprivate\s+static\s+instance\b/.test(content) &&
      /\bgetInstance\s*\(\s*\)/.test(content)
    ) {
      const lineIdx = lines.findIndex(l => /\bprivate\s+static\s+instance\b/.test(l));
      this.addFinding({
        severity: 'low', category: 'Architecture - Singleton',
        title: 'Singleton pattern detected',
        description: 'Singletons introduce hidden global state and make unit testing hard.',
        file, line: lineIdx + 1,
        code: (lines[lineIdx] ?? 'private static instance').trim(),
        recommendation: 'Prefer dependency injection; pass the instance through constructors.',
      });
    }
  }

  // ── Test Quality (test files only) ────────────────────────────────────────

  /**
   * Spy-only test files — AI writes tests that confirm functions were called,
   * not that they produced the right result.
   * "Green tests with zero coverage of actual behavior."
   */
  private checkBehavioralAssertions({ file, lines, inBlock }: FileContext): void {
    const SPY = /\b(toHaveBeenCalled|toHaveBeenCalledWith|toHaveBeenCalledTimes)\b/;
    const BEH = /\b(toBe|toEqual|toStrictEqual|toContain|toMatchObject|toMatchSnapshot|toBeGreaterThan|toBeLessThan|toHaveLength|toHaveProperty|toThrow|toResolve|toReject)\b/;

    const spyCount = lines.filter((l, i) => !inBlock[i] && SPY.test(l)).length;
    const behCount = lines.filter((l, i) => !inBlock[i] && BEH.test(l)).length;

    if (spyCount > 0 && behCount === 0) {
      this.addFinding({
        severity: 'high', category: 'Test Quality - Behavioral Assertions',
        title: 'Test file uses only spy assertions — no outcome assertions',
        description:
          `${spyCount} spy assertion(s) found, 0 behavioral assertions (toBe/toEqual/etc.). ` +
          'Spy-only tests confirm functions were called, not that they produced the right result. ' +
          'This is the vibe coder trap: green tests with zero coverage of actual behavior.',
        file, line: 1,
        code: `${spyCount} toHaveBeenCalled* / 0 outcome assertions`,
        recommendation:
          'Add assertions on actual return values, side effects, or state changes. ' +
          'Test what the system *does*, not which functions it *calls*.',
      });
    } else if (spyCount > 0 && behCount > 0 && spyCount / (spyCount + behCount) > 0.7) {
      this.addFinding({
        severity: 'medium', category: 'Test Quality - Behavioral Assertions',
        title: `High spy-to-outcome ratio (${Math.round(spyCount / (spyCount + behCount) * 100)}% spy assertions)`,
        description:
          'The majority of assertions check whether mocks were called, not whether ' +
          'the system produced correct output. Mocks may be hiding real integration failures.',
        file, line: 1,
        code: `${spyCount} spy / ${behCount} outcome assertions`,
        recommendation:
          'Balance spy checks with outcome assertions on return values or DB state. ' +
          'Add at least one integration test without mocks per public endpoint.',
      });
    }
  }

  /**
   * Test files with no failure-path coverage.
   * "AI tests the happy path. The failure case is yours to catch."
   */
  private checkMissingFailureCases({ file, lines, inBlock }: FileContext): void {
    const FAIL_WORDS =
      /\b(reject|throw|error|fail|invalid|missing|empty|null|undefined|400|401|403|404|409|422|500)\b/i;
    const TEST_BLOCK = /\b(it|test)\s*\(/;

    const totalTests   = lines.filter((l, i) => !inBlock[i] && TEST_BLOCK.test(l)).length;
    const failureTests = lines.filter(
      (l, i) => !inBlock[i] && TEST_BLOCK.test(l) && FAIL_WORDS.test(l)
    ).length;

    if (totalTests >= 3 && failureTests === 0) {
      this.addFinding({
        severity: 'high', category: 'Test Quality - Missing Failure Cases',
        title: `${totalTests} tests — no failure-path coverage detected`,
        description:
          `All ${totalTests} test(s) appear to cover success paths only. ` +
          'AI generates the happy-path test. Error cases — network failure, ' +
          'invalid input, unauthorized access — are not tested.',
        file, line: 1,
        code: `${totalTests} tests / 0 failure-path tests`,
        recommendation:
          'Add at least one test per public function covering the failure case: ' +
          'what happens when input is invalid, the DB returns empty, or the service is down.',
      });
    } else if (totalTests >= 5 && failureTests / totalTests < 0.2) {
      this.addFinding({
        severity: 'medium', category: 'Test Quality - Missing Failure Cases',
        title: `Low failure-path coverage (${failureTests}/${totalTests} tests, ${Math.round(failureTests / totalTests * 100)}%)`,
        description:
          'Less than 20% of tests cover failure paths. ' +
          'A codebase that only tests the happy path gives a false sense of safety from green CI.',
        file, line: 1,
        code: `${failureTests} failure-path / ${totalTests} total tests`,
        recommendation:
          'Target a 1:1 ratio of success-to-failure tests for each public API or route handler.',
      });
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private addFinding(finding: Omit<AuditFinding, 'id'>): void {
    const dedupKey = `${finding.file}:${finding.line}:${finding.title}`;
    if (this.seenKeys.has(dedupKey)) return;
    this.seenKeys.add(dedupKey);
    this.findings.push({ id: `QUA-${String(++this.idCounter).padStart(4, '0')}`, ...finding });
  }

  private buildReport(findings: AuditFinding[], threshold: number): AuditReport {
    const byCategory: Record<string, number> = {};
    findings.forEach(f => { byCategory[f.category] = (byCategory[f.category] ?? 0) + 1; });

    const weightedScore = findings.reduce((acc, f) => acc + SEVERITY_WEIGHT[f.severity], 0);

    return {
      timestamp: new Date().toISOString(),
      filesScanned: this.filesScanned,
      weightedScore,
      threshold,
      passed: weightedScore <= threshold,
      findings,
      summary: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high:     findings.filter(f => f.severity === 'high').length,
        medium:   findings.filter(f => f.severity === 'medium').length,
        low:      findings.filter(f => f.severity === 'low').length,
        total:    findings.length,
        byCategory,
      },
    };
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMarkdown(report: AuditReport): string {
  const { summary, findings } = report;
  const severities: Severity[] = ['critical', 'high', 'medium', 'low'];
  const scoreBar = report.passed
    ? `✅ **${report.weightedScore}** / ${report.threshold} — merge gate passed`
    : `❌ **${report.weightedScore}** / ${report.threshold} — merge gate failed`;

  const lines: string[] = [
    '# Quality Audit Report',
    '',
    `**Generated**: ${report.timestamp}  `,
    `**Files scanned**: ${report.filesScanned}  `,
    `**Weighted score**: ${scoreBar}`,
    `**Score formula**: (critical × 4) + (high × 2) + (medium × 1) + (low × 0.5)`,
    '',
    '## Summary',
    '',
    '| Severity | Count | Weight |',
    '|----------|-------|--------|',
    `| 🔴 Critical | ${summary.critical} | × 4 |`,
    `| 🟠 High     | ${summary.high}     | × 2 |`,
    `| 🟡 Medium   | ${summary.medium}   | × 1 |`,
    `| ⚪ Low      | ${summary.low}      | × 0.5 |`,
    '',
    '### By category',
    '',
    ...Object.entries(summary.byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, n]) => `- **${cat}**: ${n}`),
    '',
    '---',
    '',
  ];

  severities.forEach(sev => {
    const group = findings.filter(f => f.severity === sev);
    if (!group.length) return;
    lines.push(`## ${sev.toUpperCase()} (${group.length})`);
    lines.push('');
    group.forEach(f => {
      lines.push(`### ${f.id}: ${f.title}`);
      lines.push('');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');
      lines.push(`| Category | ${f.category} |`);
      lines.push(`| File | \`${f.file}:${f.line}\` |`);
      lines.push(`| Description | ${f.description} |`);
      lines.push(`| Recommendation | ${f.recommendation} |`);
      lines.push('');
      lines.push('```typescript');
      lines.push(f.code);
      lines.push('```');
      lines.push('');
    });
  });

  return lines.join('\n');
}

function formatConsole(report: AuditReport): void {
  const icons: Record<Severity, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' };
  const severities: Severity[] = ['critical', 'high', 'medium', 'low'];

  severities.forEach(sev => {
    const group = report.findings.filter(f => f.severity === sev);
    if (!group.length) return;
    console.log(colorize(`\n━━ ${icons[sev]} ${sev.toUpperCase()} (${group.length}) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, severityColor[sev]));
    group.forEach(f => {
      console.log(`\n  ${colorize(f.id, ANSI.bold)}  ${f.title}`);
      console.log(`  ${colorize(f.file + ':' + f.line, ANSI.cyan)}`);
      console.log(`  ${colorize(f.description, ANSI.grey)}`);
      console.log(`  ${ANSI.bold}Fix:${ANSI.reset} ${f.recommendation}`);
      console.log(`  ${colorize(f.code.substring(0, 100), ANSI.grey)}`);
    });
  });
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${colorize('audit-quality', ANSI.bold)} — PR/merge gate: AI code smell, test quality, architecture

${colorize('When it runs', ANSI.bold)}
  Pre-merge / PR review. Exit 1 blocks the merge if weighted score > threshold.

${colorize('Options', ANSI.bold)}
  --threshold=<n>       Weighted score limit before blocking (default: 10)
  --severity=<level>    Filter to one severity (critical|high|medium|low)
  --category=<text>     Filter by category substring (case-insensitive)
  --output=<format>     markdown (default) | json | console
  --paths=<glob>        Override default glob (comma-separated)
  --ignore=<substr>     Skip files containing this string (repeatable)
  --concurrency=<n>     Max parallel file reads (default: 20)
  --help                Show this help

${colorize('Scoring', ANSI.bold)}
  Weighted score = (critical × 4) + (high × 2) + (medium × 1) + (low × 0.5)
  Merge is blocked when score > threshold.

${colorize('Exit codes', ANSI.bold)}
  0   Score within threshold — merge allowed
  1   Score exceeds threshold — merge blocked

${colorize('Examples', ANSI.bold)}
  npx tsx audit-quality.ts
  npx tsx audit-quality.ts -- --threshold=20
  npx tsx audit-quality.ts -- --output=console
  npx tsx audit-quality.ts -- --category=test --output=json
`);
}

function parseArgs(argv: string[]): AuditOptions & { output: OutputFormat } {
  const opts: AuditOptions & { output: OutputFormat } = { output: 'markdown' };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
    const rawKey = arg.replace(/^--/, '');
    const eqIdx  = rawKey.indexOf('=');
    const key    = eqIdx >= 0 ? rawKey.substring(0, eqIdx) : rawKey;
    const val    = eqIdx >= 0 ? rawKey.substring(eqIdx + 1) : '';
    switch (key) {
      case 'threshold':   opts.threshold   = parseInt(val, 10); break;
      case 'severity':    opts.severity    = val as Severity;   break;
      case 'category':    opts.category    = val;               break;
      case 'output':      opts.output      = val as OutputFormat; break;
      case 'paths':       opts.paths       = val.split(',');    break;
      case 'ignore':      (opts.ignore ??= []).push(val);       break;
      case 'concurrency': opts.concurrency = parseInt(val, 10); break;
    }
  }
  return opts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts    = parseArgs(process.argv.slice(2));
  const auditor = new QualityAuditor();
  const report  = await auditor.audit(opts);
  const { summary } = report;

  console.log(colorize('\n🔎 Quality audit complete!\n', ANSI.bold));
  console.log(`  Files scanned  : ${report.filesScanned}`);
  console.log(`  Total issues   : ${summary.total}`);
  console.log(`  ${colorize('Critical', ANSI.red + ANSI.bold)} : ${summary.critical}  (× 4 = ${summary.critical * 4})`);
  console.log(`  ${colorize('High    ', ANSI.red)}     : ${summary.high}  (× 2 = ${summary.high * 2})`);
  console.log(`  ${colorize('Medium  ', ANSI.yellow)}   : ${summary.medium}  (× 1 = ${summary.medium})`);
  console.log(`  ${colorize('Low     ', ANSI.grey)}     : ${summary.low}  (× 0.5 = ${summary.low * 0.5})`);
  console.log(`  ${'─'.repeat(36)}`);
  console.log(`  Weighted score : ${colorize(String(report.weightedScore), report.passed ? ANSI.green : ANSI.red + ANSI.bold)} / ${report.threshold} threshold`);
  console.log('');

  if (opts.output === 'console') {
    formatConsole(report);
  } else if (opts.output === 'json') {
    const out = 'QUALITY_REPORT.json';
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 Report saved → ${colorize(out, ANSI.cyan)}`);
  } else {
    const out = 'QUALITY_REPORT.md';
    fs.writeFileSync(out, formatMarkdown(report), 'utf-8');
    console.log(`📄 Report saved → ${colorize(out, ANSI.cyan)}`);
  }

  if (!report.passed) {
    console.log(colorize(
      `\n❌  Quality score ${report.weightedScore} exceeds threshold ${report.threshold} — merge blocked.`,
      ANSI.red + ANSI.bold
    ));
    process.exit(1);
  }

  console.log(colorize(
    `\n✅  Quality score ${report.weightedScore} within threshold ${report.threshold} — merge gate passed.`,
    ANSI.green
  ));
  process.exit(0);
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(err => { console.error('Quality audit failed:', err); process.exit(1); });
}

export { QualityAuditor };
export type { AuditReport, AuditFinding, AuditOptions };
