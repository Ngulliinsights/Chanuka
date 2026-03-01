#!/usr/bin/env tsx

/**
 * Automated Codebase Audit Script
 *
 * Scans the codebase for common operational blindspots and security issues.
 * Generates a report with findings categorized by severity.
 *
 * Usage:
 *   npm run audit:codebase
 *   npm run audit:codebase -- --severity=critical
 *   npm run audit:codebase -- --category=security
 *   npm run audit:codebase -- --output=json
 *   npm run audit:codebase -- --paths="src/**\/*.ts"
 *   npm run audit:codebase -- --help
 */

import * as fs from 'fs';
import { glob } from 'glob';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low';
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
}

interface CheckPattern {
  pattern: RegExp;
  name: string;
}

// ─── ANSI helpers (no external dep) ──────────────────────────────────────────

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

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Return the 1-based line number of a regex match within the full file content. */
function matchLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

/** Determine whether a line is inside a block comment. */
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

/** Slice a window of lines safely. */
function lineWindow(lines: string[], center: number, before: number, after: number): string {
  return lines.slice(Math.max(0, center - before), Math.min(lines.length, center + after + 1)).join('\n');
}

// ─── Core Auditor ─────────────────────────────────────────────────────────────

class CodebaseAuditor {
  private findings: AuditFinding[] = [];
  private filesScanned = 0;
  private idCounter = 0;

  // Dedup key → already reported, prevents duplicate findings for the same location
  private readonly seenKeys = new Set<string>();

  async audit(options: AuditOptions = {}): Promise<AuditReport> {
    const patterns = options.paths ?? [
      'server/**/*.ts',
      '!server/**/*.test.ts',
      '!server/**/*.spec.ts',
      '!server/**/__tests__/**',
      '!node_modules/**',
      '!dist/**',
    ];

    const ignorePatterns = options.ignore ?? [];

    const allFiles = await glob(patterns);
    const files = allFiles.filter(f =>
      !ignorePatterns.some(p => f.includes(p))
    );

    console.log(colorize(`\n🔍 Starting codebase audit…\n`, ANSI.bold));
    console.log(colorize(`📁 ${files.length} files to scan\n`, ANSI.cyan));

    // Parallel with bounded concurrency
    const concurrency = options.concurrency ?? 20;
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      await Promise.all(batch.map(f => this.auditFile(f)));
      this.filesScanned += batch.length;
    }

    let { findings } = this;

    if (options.severity) {
      findings = findings.filter(f => f.severity === options.severity);
    }
    if (options.category) {
      const lc = options.category.toLowerCase();
      findings = findings.filter(f => f.category.toLowerCase().includes(lc));
    }

    return this.buildReport(findings);
  }

  // ── File-level dispatch ───────────────────────────────────────────────────

  private async auditFile(filePath: string): Promise<void> {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return; // Skip unreadable files silently
    }

    const lines = content.split('\n');
    const inBlock = buildBlockCommentMap(lines);
    const isTestFile =
      filePath.includes('.test.') ||
      filePath.includes('.spec.') ||
      filePath.includes('__tests__');

    const ctx = { file: filePath, lines, content, inBlock, isTestFile };

    // Security
    this.checkSqlInjection(ctx);
    this.checkHardcodedSecrets(ctx);
    this.checkPlaceholderConfig(ctx);
    this.checkAuthorizationIssues(ctx);

    // Data integrity
    this.checkRaceConditions(ctx);
    this.checkMissingTransactions(ctx);

    // Performance
    this.checkN1Queries(ctx);
    this.checkMemoryLeaks(ctx);

    // Resilience
    this.checkMissingTimeouts(ctx);

    // Error handling & observability
    this.checkErrorHandling(ctx);
    this.checkMissingLogging(ctx);

    // Code quality
    this.checkTodoComments(ctx);
    this.checkConsoleStatements(ctx);
    this.checkCommentedCode(ctx);
    this.checkIncompleteTypes(ctx);
    this.checkSingletonPattern(ctx);

    if (!isTestFile) {
      this.checkMockImplementations(ctx);
      this.checkTestData(ctx);
    }
  }

  // ── Security checks ───────────────────────────────────────────────────────

  private checkSqlInjection({
    file, lines, inBlock,
  }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;

      if (line.includes('sql.raw(')) {
        this.addFinding({
          severity: 'critical',
          category: 'Security - SQL Injection',
          title: 'Dangerous sql.raw() usage',
          description: 'sql.raw() bypasses parameterization and enables SQL injection.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use the sql template tag: sql`SELECT … WHERE id = ${id}`',
        });
      }

      // String concatenation inside SQL keywords
      const hasSqlKeyword = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/.test(line);
      const hasInterpolation = line.includes('${') || /`\s*\+/.test(line) || /\+\s*`/.test(line);
      if (hasSqlKeyword && hasInterpolation) {
        this.addFinding({
          severity: 'critical',
          category: 'Security - SQL Injection',
          title: 'SQL query with string interpolation',
          description: 'Interpolating values directly into SQL strings risks injection.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use parameterized queries via the sql template tag.',
        });
      }

      // .query() with template literal containing variables
      if (/\.query\(`[^`]*\$\{/.test(line)) {
        this.addFinding({
          severity: 'high',
          category: 'Security - SQL Injection',
          title: 'Unparameterized query() call',
          description: 'Template literal passed to .query() may not be parameterized.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Verify parameterization or switch to ORM helper methods.',
        });
      }
    });
  }

  private checkHardcodedSecrets({ file, lines, inBlock }: FileContext): void {
    const patterns: CheckPattern[] = [
      { pattern: /\bpassword\s*=\s*['"][^'"]{4,}['"]/i,   name: 'password' },
      { pattern: /\bapi[_-]?key\s*=\s*['"][^'"]{6,}['"]/i, name: 'API key' },
      { pattern: /\bsecret\s*=\s*['"][^'"]{6,}['"]/i,      name: 'secret' },
      { pattern: /\bprivate[_-]?key\s*=\s*['"][^'"]{6,}['"]/, name: 'private key' },
      // Token assignment but NOT in type annotations or test expectations
      { pattern: /\btoken\s*=\s*['"][^'"]{10,}['"]/i,      name: 'token' },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (line.includes('process.env') || line.includes('env(')) return;

      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity: 'critical',
            category: 'Security - Hardcoded Secret',
            title: `Hardcoded ${name}`,
            description: `A ${name} appears to be hardcoded rather than sourced from the environment.`,
            file, line: i + 1,
            code: line.trim().replace(/(['"])[^'"]+\1/, "'***'"),
            recommendation: `Use process.env.${name.toUpperCase().replace(/\s/g, '_')} with validation on startup.`,
          });
        }
      });
    });
  }

  private checkPlaceholderConfig({ file, lines, inBlock }: FileContext): void {
    const patterns: CheckPattern[] = [
      { pattern: /password.*['"](password|passwd|changeme|secret)['"]/i, name: 'default password' },
      { pattern: /your[_-]?api[_-]?key/i,  name: 'placeholder API key' },
      { pattern: /example[_-]?key/i,        name: 'example key' },
      { pattern: /\|\|\s*['"](password|changeme|secret)['"]/i, name: 'insecure password fallback' },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;

      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity: 'critical',
            category: 'Security - Configuration',
            title: `Placeholder config: ${name}`,
            description: `Configuration contains ${name}, which is not production-safe.`,
            file, line: i + 1, code: line.trim(),
            recommendation: 'Require proper values via environment variables and fail fast on startup.',
          });
        }
      });
    });
  }

  private checkAuthorizationIssues({ file, content }: FileContext): void {
    // Look for exported async functions that perform DB reads but lack userId / permission guards.
    const fnPattern =
      /export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\S+\s*)?\{([\s\S]{10,500}?)\}/g;

    let match: RegExpExecArray | null;
    while ((match = fnPattern.exec(content)) !== null) {
      const full = match[0];
      const name = match[1] ?? '';
      const body = match[3] ?? '';
      const hasDbRead = /\bdb\.(select|query|find|get)\b/.test(body);
      if (!hasDbRead) continue;

      const hasAuthGuard =
        /\b(userId|requesterId|checkPermission|authorize|canAccess|requireAuth|session\.user)\b/.test(body);
      if (hasAuthGuard) continue;

      // Skip clearly internal helpers (prefixed with _ or named with 'internal' / 'system')
      if (/^(_|internal|system)/i.test(name)) continue;

      const lineNumber = matchLineNumber(content, match.index);
      this.addFinding({
        severity: 'high',
        category: 'Security - Authorization',
        title: `Missing authorization check in ${name}()`,
        description: 'Exported function performs DB read without a visible authorization guard.',
        file, line: lineNumber,
        code: full.substring(0, 120).trimEnd() + (full.length > 120 ? '…' : ''),
        recommendation: 'Add userId scope or permission check before returning data.',
      });
    }
  }

  // ── Data integrity ────────────────────────────────────────────────────────

  private checkRaceConditions({ file, content }: FileContext): void {
    // Read-modify-write: select → arithmetic → update without a transaction wrapper
    const rmwPattern =
      /const\s+\w+\s*=\s*await\s+\S+\.(?:select|findOne|get)\([\s\S]{0,200}?\n(?:[^\n]*\n){0,5}[^\n]*(?:\+=|-=|\*=|\/=)[^\n]*\n(?:[^\n]*\n){0,5}[^\n]*await\s+\S+\.(?:update|save)\(/g;

    let match: RegExpExecArray | null;
    while ((match = rmwPattern.exec(content)) !== null) {
      // Skip if already inside a transaction block
      const prelude = content.substring(Math.max(0, match.index - 300), match.index);
      if (/\b(transaction|tx)\b/.test(prelude)) continue;

      this.addFinding({
        severity: 'high',
        category: 'Data Integrity - Race Condition',
        title: 'Read-modify-write without transaction/locking',
        description: 'Concurrent requests can produce inconsistent state via a TOCTOU race.',
        file, line: matchLineNumber(content, match.index),
        code: match[0].substring(0, 140) + '…',
        recommendation: 'Wrap in db.transaction() or use an atomic UPDATE … WHERE clause.',
      });
    }
  }

  private checkMissingTransactions({ file, lines, inBlock }: FileContext): void {
    const writeKeywords = ['await db.insert', 'await db.update', 'await db.delete'];

    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      if (!writeKeywords.some(k => line.includes(k))) return;

      const window = lineWindow(lines, i, 3, 8);
      if (/\b(transaction|tx)\b/.test(window)) return;

      // Look ahead for another write within the next 6 lines
      const lookahead = lines.slice(i + 1, i + 7).join('\n');
      if (writeKeywords.some(k => lookahead.includes(k))) {
        this.addFinding({
          severity: 'high',
          category: 'Data Integrity - Transaction',
          title: 'Multiple writes without a transaction',
          description: 'Consecutive DB writes outside a transaction can leave data partially updated on failure.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Wrap related writes in db.transaction(async (tx) => { … }).',
        });
      }
    });
  }

  // ── Performance ───────────────────────────────────────────────────────────

  private checkN1Queries({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;

      // await inside a for/while loop
      if (/\bfor\s*[\s(]/.test(line) || /\bwhile\s*\(/.test(line)) {
        const body = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');
        if (/\bawait\b/.test(body) && /\b(db\.|\.query\b|\.select\b|\.findOne\b)/.test(body)) {
          this.addFinding({
            severity: 'high',
            category: 'Performance - N+1 Queries',
            title: 'DB query inside loop',
            description: 'A database call inside a loop issues one query per iteration (N+1 problem).',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Collect IDs first, then fetch all records with a single WHERE id = ANY(?) query.',
          });
        }
      }

      // Promise.all-safe: flag only raw .map(async …) without Promise.all wrapping
      if (/\.map\(async\s/.test(line) && !lineWindow(lines, i, 2, 0).includes('Promise.all')) {
        if (/\b(db\.|\.query\b|\.select\b)/.test(lineWindow(lines, i, 0, 5))) {
          this.addFinding({
            severity: 'high',
            category: 'Performance - N+1 Queries',
            title: 'Unguarded async .map() with DB calls',
            description: 'async .map() fires all queries concurrently and without batching.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Use a single batch query or SQL JOIN; if concurrency is acceptable, wrap in Promise.all().',
          });
        }
      }
    });
  }

  private checkMemoryLeaks({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;

      // Event listeners: warn only if no corresponding removal found in the same file
      if (/\.(on|addEventListener)\s*\(/.test(line)) {
        const fileContent = lines.join('\n');
        const hasRemoval = /\.(off|removeEventListener|removeAllListeners)\s*\(/.test(fileContent);
        if (!hasRemoval) {
          this.addFinding({
            severity: 'medium',
            category: 'Performance - Memory Leak',
            title: 'Event listener without cleanup',
            description: 'No corresponding .off()/.removeEventListener() found in this file.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Store the listener reference and remove it in a cleanup/destructor function.',
          });
        }
      }
    });
  }

  // ── Resilience ────────────────────────────────────────────────────────────

  private checkMissingTimeouts({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;

      // fetch() without AbortSignal or timeout option
      if (/\bfetch\s*\(/.test(line) && !/\b(signal|AbortController|timeout)\b/.test(line)) {
        const ctx = lineWindow(lines, i, 3, 3);
        if (!/\b(signal|AbortController|timeout)\b/.test(ctx)) {
          this.addFinding({
            severity: 'medium',
            category: 'Resilience - Timeout',
            title: 'fetch() without timeout',
            description: 'A network request with no timeout can hang indefinitely and exhaust connections.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Use AbortSignal.timeout(ms) or an AbortController with setTimeout.',
          });
        }
      }

      // db.query/execute without statement_timeout
      if (/\bdb\.(query|execute)\s*\(/.test(line)) {
        const ctx = lineWindow(lines, i, 5, 5);
        if (!/\b(statement_timeout|query_timeout|timeout)\b/.test(ctx)) {
          this.addFinding({
            severity: 'high',
            category: 'Resilience - Timeout',
            title: 'DB query without timeout',
            description: 'A long-running query with no timeout can block the connection pool.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Set statement_timeout in your DB client config or per-query options.',
          });
        }
      }
    });
  }

  // ── Error handling & observability ───────────────────────────────────────

  private checkErrorHandling({ file, lines }: FileContext): void {
    // Only flag top-level awaits (not inside .then/.catch/.finally chains)
    // Strategy: find function bodies and check if awaits within them lack try/catch.
    const content = lines.join('\n');

    // Simple heuristic: look for async arrow functions or async methods without any try
    const asyncFnPattern =
      /(?:async\s+function\s+\w+|async\s+\w+\s*(?:=>\s*)?)\s*\([^)]*\)\s*\{([^{}]{0,800})\}/g;

    let match: RegExpExecArray | null;
    while ((match = asyncFnPattern.exec(content)) !== null) {
      const body = match[1];
      if (!body) continue;
      if (/\bawait\b/.test(body) && !/\btry\b/.test(body)) {
        // Ignore if it's a one-liner that returns a value (unlikely to need try)
        if (body.split('\n').length <= 2) continue;

        const lineNumber = matchLineNumber(content, match.index);
        this.addFinding({
          severity: 'medium',
          category: 'Error Handling',
          title: 'async function with no try/catch',
          description: 'Async function uses await but has no error handling; unhandled rejections will surface as crashes.',
          file, line: lineNumber,
          code: match[0].substring(0, 120) + (match[0].length > 120 ? '…' : ''),
          recommendation: 'Wrap awaited calls in try/catch or attach a .catch() handler at the call site.',
        });
      }
    }
  }

  private checkMissingLogging({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;

      if (/\bcatch\s*\(\s*\w+/.test(line)) {
        const catchBody = lineWindow(lines, i, 0, 10);
        const hasLogging = /\b(logger\.|console\.|log\(|captureException|report\()/.test(catchBody);
        const isRethrow = /\bthrow\b/.test(catchBody);

        if (!hasLogging && !isRethrow) {
          this.addFinding({
            severity: 'medium',
            category: 'Observability - Logging',
            title: 'Silent catch block',
            description: 'Error is caught but neither logged nor re-thrown, making failures invisible.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Add logger.error(error) and include relevant context (userId, requestId, etc.).',
          });
        }
      }
    });
  }

  // ── Code quality ──────────────────────────────────────────────────────────

  private checkTodoComments({ file, lines, inBlock }: FileContext): void {
    const markers: Array<{ pattern: RegExp; severity: Severity; label: string }> = [
      { pattern: /\/\/\s*TODO\b/i,           severity: 'medium',   label: 'TODO' },
      { pattern: /\/\/\s*FIXME\b/i,          severity: 'high',     label: 'FIXME' },
      { pattern: /\/\/\s*HACK\b/i,           severity: 'high',     label: 'HACK' },
      { pattern: /\/\/\s*XXX\b/,             severity: 'high',     label: 'XXX' },
      { pattern: /\/\/\s*TEMP\b/i,           severity: 'medium',   label: 'TEMP' },
      { pattern: /not\s+implemented\s+yet/i, severity: 'critical', label: 'Not Implemented' },
      { pattern: /\/\/\s*placeholder/i,      severity: 'medium',   label: 'Placeholder' },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      markers.forEach(({ pattern, severity, label }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity,
            category: 'Code Quality - Incomplete',
            title: `${label} in production code`,
            description: `${label} comments signal unfinished work shipping to production.`,
            file, line: i + 1, code: line.trim(),
            recommendation: 'Resolve the issue or create a tracked ticket and remove the comment.',
          });
        }
      });
    });
  }

  private checkConsoleStatements({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//')) return;

      if (/\bconsole\.(log|warn|debug|info|error)\s*\(/.test(line)) {
        this.addFinding({
          severity: 'medium',
          category: 'Code Quality - Debug Code',
          title: 'console statement in production code',
          description: 'Raw console calls bypass log levels and structured logging.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Replace with logger.debug() / logger.info() / logger.error().',
        });
      }

      if (/\bdebugger\b/.test(line)) {
        this.addFinding({
          severity: 'high',
          category: 'Code Quality - Debug Code',
          title: 'debugger statement left in code',
          description: 'A debugger statement will pause execution in any environment with DevTools open.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Remove the debugger statement.',
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
          severity: 'low',
          category: 'Code Quality - Dead Code',
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
      const isCommentedCode = codeIndicators.some(p => p.test(line.trimStart()));
      if (isCommentedCode) {
        if (blockStart < 0) blockStart = i;
      } else {
        flush(i);
      }
    });
    flush(lines.length);
  }

  private checkIncompleteTypes({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      const trimmed = line.trimStart();
      if (trimmed.startsWith('//')) return;

      // Explicit `any` type annotation (ignoring eslint-disable lines)
      if (/:\s*any[\s,;>)]/.test(line) && !line.includes('eslint-disable')) {
        this.addFinding({
          severity: 'low',
          category: 'Code Quality - Types',
          title: 'Explicit any type',
          description: 'any disables type checking for this value and can mask bugs.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use unknown with a type guard, or define a concrete interface.',
        });
      }

      // Empty interface: `interface Foo {` followed by `}`
      if (/\binterface\s+\w+/.test(line) && i + 1 < lines.length) {
        const next = (lines[i + 1] ?? '').trim();
        if (next === '{' && i + 2 < lines.length && (lines[i + 2] ?? '').trim() === '}') {
          this.addFinding({
            severity: 'medium',
            category: 'Code Quality - Types',
            title: 'Empty interface',
            description: 'Interface has no members; it provides no type safety.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Add members or remove the interface if unused.',
          });
        }
        // Inline empty: `interface Foo {}`
        if (/\binterface\s+\w+\s*\{\s*\}/.test(line)) {
          this.addFinding({
            severity: 'medium',
            category: 'Code Quality - Types',
            title: 'Empty interface',
            description: 'Interface has no members; it provides no type safety.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Add members or remove the interface if unused.',
          });
        }
      }

      // Vague type names
      if (/\b(type|interface)\s+(Data|Entity|Item|Thing|Stuff)\b/.test(line)) {
        this.addFinding({
          severity: 'low',
          category: 'Code Quality - Types',
          title: 'Generic type name',
          description: 'The type name is too generic to convey meaning.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use a descriptive name that reflects the domain concept.',
        });
      }
    });
  }

  private checkSingletonPattern({ file, lines, content }: FileContext): void {
    if (
      /\bprivate\s+static\s+instance\b/.test(content) &&
      /\bgetInstance\s*\(\s*\)/.test(content)
    ) {
      const lineIdx = lines.findIndex(l => /\bprivate\s+static\s+instance\b/.test(l));
      const lineCode = lineIdx >= 0 ? (lines[lineIdx] ?? '').trim() : 'private static instance';
      this.addFinding({
        severity: 'low',
        category: 'Architecture - Singleton',
        title: 'Singleton pattern',
        description: 'Singletons introduce hidden global state and make unit testing hard.',
        file, line: lineIdx + 1, code: lineCode,
        recommendation: 'Prefer dependency injection; pass the instance through constructors or a DI container.',
      });
    }
  }

  private checkMockImplementations({ file, lines, inBlock }: FileContext): void {
    // Match class/function declarations whose identifier contains a mock-like word
    const mockWordPattern = /\b(MockService|StubRepository|FakeClient|DummyHandler)\b/;

    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      if (/\b(class|function)\b/.test(line) && mockWordPattern.test(line)) {
        this.addFinding({
          severity: 'critical',
          category: 'Code Quality - Mock Code',
          title: 'Mock/stub class in production file',
          description: 'Test doubles should live exclusively in test files.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Move to a *.test.ts file or replace with the real implementation.',
        });
      }
    });
  }

  private checkTestData({ file, lines, inBlock }: FileContext): void {
    const patterns: CheckPattern[] = [
      { pattern: /\btest@\w+\.\w+/i,          name: 'test email' },
      { pattern: /\blorem\s+ipsum\b/i,          name: 'lorem ipsum placeholder' },
      { pattern: /4111111111111111/,             name: 'test credit card number' },
      { pattern: /\bsecret_key_for_testing\b/i, name: 'test secret key' },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;

      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity: 'high',
            category: 'Code Quality - Test Data',
            title: `Hardcoded ${name}`,
            description: `Test data (${name}) must not appear in production code.`,
            file, line: i + 1, code: line.trim(),
            recommendation: 'Remove or replace with environment-sourced values.',
          });
        }
      });
    });
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private addFinding(finding: Omit<AuditFinding, 'id'>): void {
    const dedupKey = `${finding.file}:${finding.line}:${finding.title}`;
    if (this.seenKeys.has(dedupKey)) return;
    this.seenKeys.add(dedupKey);

    this.findings.push({
      id: `AUDIT-${String(++this.idCounter).padStart(4, '0')}`,
      ...finding,
    });
  }

  private buildReport(findings: AuditFinding[]): AuditReport {
    const byCategory: Record<string, number> = {};
    findings.forEach(f => {
      byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    });

    return {
      timestamp: new Date().toISOString(),
      filesScanned: this.filesScanned,
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

// ─── Context type (internal) ─────────────────────────────────────────────────

interface FileContext {
  file: string;
  lines: string[];
  content: string;
  inBlock: boolean[];
  isTestFile: boolean;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMarkdown(report: AuditReport): string {
  const { summary, findings } = report;
  const severities: Severity[] = ['critical', 'high', 'medium', 'low'];

  const lines: string[] = [
    '# Codebase Audit Report',
    '',
    `**Generated**: ${report.timestamp}  `,
    `**Files scanned**: ${report.filesScanned}  `,
    `**Total findings**: ${summary.total}`,
    '',
    '## Summary',
    '',
    `| Severity | Count |`,
    `|----------|-------|`,
    `| 🔴 Critical | ${summary.critical} |`,
    `| 🟠 High     | ${summary.high}     |`,
    `| 🟡 Medium   | ${summary.medium}   |`,
    `| ⚪ Low      | ${summary.low}      |`,
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
      lines.push(`| Field | Value |`);
      lines.push(`|-------|-------|`);
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
  const { findings } = report;
  const icons: Record<Severity, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '⚪',
  };

  const severities: Severity[] = ['critical', 'high', 'medium', 'low'];
  severities.forEach(sev => {
    const group = findings.filter(f => f.severity === sev);
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
${colorize('audit-codebase', ANSI.bold)} – Static analysis for production blindspots

${colorize('Options', ANSI.bold)}
  --severity=<level>    Filter output to a single severity (critical|high|medium|low)
  --category=<text>     Filter by category substring (case-insensitive)
  --output=<format>     Output format: markdown (default) | json | console
  --paths=<glob>        Override default glob pattern(s)
  --ignore=<substr>     Skip files matching this substring (repeatable)
  --concurrency=<n>     Max parallel file reads (default: 20)
  --help                Show this help

${colorize('Examples', ANSI.bold)}
  npm run audit:codebase -- --severity=critical
  npm run audit:codebase -- --output=console
  npm run audit:codebase -- --category=security --output=json
`);
}

function parseArgs(argv: string[]): AuditOptions & { output: OutputFormat } {
  const opts: AuditOptions & { output: OutputFormat } = { output: 'markdown' };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }

    const eqIdx = arg.replace(/^--/, '').indexOf('=');
    const rawKey = arg.replace(/^--/, '');
    const key = eqIdx >= 0 ? rawKey.substring(0, eqIdx) : rawKey;
    const val = eqIdx >= 0 ? rawKey.substring(eqIdx + 1) : '';
    switch (key) {
      case 'severity':    opts.severity    = val as Severity;      break;
      case 'category':    opts.category    = val;                  break;
      case 'output':      opts.output      = val as OutputFormat;  break;
      case 'paths':       opts.paths       = val.split(',');       break;
      case 'ignore':      (opts.ignore ??= []).push(val);          break;
      case 'concurrency': opts.concurrency = parseInt(val, 10);    break;
    }
  }

  return opts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const auditor = new CodebaseAuditor();
  const report  = await auditor.audit(opts);
  const { summary } = report;

  // Summary header
  console.log(colorize('\n📊 Audit complete!\n', ANSI.bold));
  console.log(`  Files scanned : ${report.filesScanned}`);
  console.log(`  Total issues  : ${summary.total}`);
  console.log(`  ${colorize('Critical', ANSI.red + ANSI.bold)} : ${summary.critical}`);
  console.log(`  ${colorize('High    ', ANSI.red)}   : ${summary.high}`);
  console.log(`  ${colorize('Medium  ', ANSI.yellow)}  : ${summary.medium}`);
  console.log(`  ${colorize('Low     ', ANSI.grey)}    : ${summary.low}`);
  console.log('');

  if (opts.output === 'console') {
    formatConsole(report);
  } else if (opts.output === 'json') {
    const out = 'audit-report.json';
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 Report saved → ${colorize(out, ANSI.cyan)}`);
  } else {
    const out = 'AUDIT_REPORT.md';
    fs.writeFileSync(out, formatMarkdown(report), 'utf-8');
    console.log(`📄 Report saved → ${colorize(out, ANSI.cyan)}`);
  }

  // Exit codes for CI integration
  if (summary.critical > 0) {
    console.log(colorize('\n❌  Critical issues found — please address immediately.', ANSI.red + ANSI.bold));
    process.exit(1);
  }
  if (summary.high > 0) {
    console.log(colorize('\n⚠️   High-priority issues found — review before next release.', ANSI.yellow));
    process.exit(0);
  }
  console.log(colorize('\n✅  No critical or high-priority issues found.', ANSI.green));
  process.exit(0);
}

// Run main function
main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

export { CodebaseAuditor };
export type { AuditReport, AuditFinding, AuditOptions };