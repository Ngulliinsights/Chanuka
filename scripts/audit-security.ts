#!/usr/bin/env tsx

/**
 * audit-security.ts — Deploy Gate
 *
 * Scans production source files for security vulnerabilities, data integrity
 * risks, performance hazards, and resilience gaps. Runs pre-deploy in CI.
 *
 * Exit codes:
 *   0 — no critical or high findings (safe to deploy)
 *   1 — critical or high findings found (deploy blocked)
 *
 * Usage:
 *   npx tsx audit-security.ts
 *   npx tsx audit-security.ts -- --output=console
 *   npx tsx audit-security.ts -- --severity=critical
 *   npx tsx audit-security.ts -- --category=security
 *   npx tsx audit-security.ts -- --paths="src/**\/*.ts"
 *   npx tsx audit-security.ts -- --help
 *
 * npm script (package.json):
 *   "audit:security": "tsx scripts/audit-security.ts"
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

// ─── Security Auditor ─────────────────────────────────────────────────────────

class SecurityAuditor {
  private findings: AuditFinding[] = [];
  private filesScanned = 0;
  private idCounter = 0;
  private readonly seenKeys = new Set<string>();

  async audit(options: AuditOptions = {}): Promise<AuditReport> {
    // Default: production source only — test files excluded
    const patterns = options.paths ?? [
      'src/**/*.ts',
      'server/**/*.ts',
      '!**/*.test.ts',
      '!**/*.spec.ts',
      '!**/__tests__/**',
      '!node_modules/**',
      '!dist/**',
    ];

    const ignorePatterns = options.ignore ?? [];
    const allFiles = await glob(patterns);
    const files = allFiles.filter(f => !ignorePatterns.some(p => f.includes(p)));

    console.log(colorize('\n🔒 Security audit starting…\n', ANSI.bold));
    console.log(colorize(`📁 ${files.length} production files to scan\n`, ANSI.cyan));

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

    return this.buildReport(findings);
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

    // ── Security ──────────────────────────────────────────────────────────
    this.checkSqlInjection(ctx);
    this.checkHardcodedSecrets(ctx);
    this.checkPlaceholderConfig(ctx);
    this.checkAuthorizationIssues(ctx);
    this.checkInputValidation(ctx);
    this.checkXssVulnerabilities(ctx);
    this.checkCorsConfig(ctx);
    this.checkFileUploadValidation(ctx);
    this.checkErrorLeakage(ctx);

    // ── Data integrity ────────────────────────────────────────────────────
    this.checkRaceConditions(ctx);
    this.checkMissingTransactions(ctx);

    // ── Performance ───────────────────────────────────────────────────────
    this.checkN1Queries(ctx);
    this.checkUnboundedQueries(ctx);
    this.checkMemoryLeaks(ctx);

    // ── Resilience ────────────────────────────────────────────────────────
    this.checkMissingTimeouts(ctx);
    this.checkMissingRetry(ctx);

    // ── Observability ─────────────────────────────────────────────────────
    this.checkErrorHandling(ctx);
    this.checkMissingLogging(ctx);

    // ── Contamination (production files only) ─────────────────────────────
    if (!isTestFile) {
      this.checkMockImplementations(ctx);
      this.checkTestData(ctx);
    }
  }

  // ── Security checks ───────────────────────────────────────────────────────

  private checkSqlInjection({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;

      if (line.includes('sql.raw(')) {
        this.addFinding({
          severity: 'critical', category: 'Security - SQL Injection',
          title: 'Dangerous sql.raw() usage',
          description: 'sql.raw() bypasses parameterization and enables SQL injection.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use the sql template tag: sql`SELECT … WHERE id = ${id}`',
        });
      }

      const hasSqlKeyword = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/.test(line);
      const hasInterpolation = line.includes('${') || /`\s*\+/.test(line) || /\+\s*`/.test(line);
      if (hasSqlKeyword && hasInterpolation) {
        this.addFinding({
          severity: 'critical', category: 'Security - SQL Injection',
          title: 'SQL query with string interpolation',
          description: 'Interpolating values directly into SQL strings risks injection.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Use parameterized queries via the sql template tag.',
        });
      }

      if (/\.query\(`[^`]*\$\{/.test(line)) {
        this.addFinding({
          severity: 'high', category: 'Security - SQL Injection',
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
      { pattern: /\bpassword\s*=\s*['"][^'"]{4,}['"]/i,    name: 'password'    },
      { pattern: /\bapi[_-]?key\s*=\s*['"][^'"]{6,}['"]/i, name: 'API key'     },
      { pattern: /\bsecret\s*=\s*['"][^'"]{6,}['"]/i,      name: 'secret'      },
      { pattern: /\bprivate[_-]?key\s*=\s*['"][^'"]{6,}['"]/, name: 'private key' },
      { pattern: /\btoken\s*=\s*['"][^'"]{10,}['"]/i,      name: 'token'       },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (line.includes('process.env') || line.includes('env(')) return;

      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity: 'critical', category: 'Security - Hardcoded Secret',
            title: `Hardcoded ${name}`,
            description: `A ${name} appears hardcoded rather than sourced from the environment.`,
            file, line: i + 1,
            code: line.trim().replace(/(['"])[^'"]+\1/, "'***'"),
            recommendation: `Use process.env.${name.toUpperCase().replace(/\s/g, '_')} with startup validation.`,
          });
        }
      });
    });
  }

  private checkPlaceholderConfig({ file, lines, inBlock }: FileContext): void {
    const patterns: CheckPattern[] = [
      { pattern: /password.*['"](password|passwd|changeme|secret)['"]/i, name: 'default password'         },
      { pattern: /your[_-]?api[_-]?key/i,                               name: 'placeholder API key'      },
      { pattern: /example[_-]?key/i,                                     name: 'example key'              },
      { pattern: /\|\|\s*['"](password|changeme|secret)['"]/i,           name: 'insecure password fallback'},
    ];

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity: 'critical', category: 'Security - Configuration',
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
    const fnPattern =
      /export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\S+\s*)?\{([\s\S]{10,500}?)\}/g;

    let match: RegExpExecArray | null;
    while ((match = fnPattern.exec(content)) !== null) {
      const name = match[1] ?? '';
      const body = match[3] ?? '';
      if (!/\bdb\.(select|query|find|get)\b/.test(body)) continue;
      if (/\b(userId|requesterId|checkPermission|authorize|canAccess|requireAuth|session\.user)\b/.test(body)) continue;
      if (/^(_|internal|system)/i.test(name)) continue;

      this.addFinding({
        severity: 'high', category: 'Security - Authorization',
        title: `Missing authorization check in ${name}()`,
        description: 'Exported function performs DB read without a visible authorization guard.',
        file, line: matchLineNumber(content, match.index),
        code: match[0].substring(0, 120).trimEnd() + (match[0].length > 120 ? '…' : ''),
        recommendation: 'Add userId scope or permission check before returning data.',
      });
    }
  }

  private checkInputValidation({ file, lines, inBlock }: FileContext): void {
    const VALIDATION_LIBS =
      /\b(z\.|schema\.|joi\.|yup\.|body\(|param\(|query\(|validate\(|validateOrReject|ajv\.compile|plainToInstance)\b/;

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (!/\b(req\.body|req\.params|req\.query)\b/.test(line)) return;

      const ctx = lineWindow(lines, i, 10, 3);
      if (!VALIDATION_LIBS.test(ctx)) {
        this.addFinding({
          severity: 'high', category: 'Security - Input Validation',
          title: 'User input used without schema validation',
          description:
            'req.body / req.params / req.query consumed with no detectable schema library. ' +
            'AI routinely skips validation on the happy path — tests will not catch this.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Validate with zod.parse(), joi.validate(), express-validator, or similar. ' +
            'Reject with HTTP 400 on failure.',
        });
      }
    });
  }

  private checkXssVulnerabilities({ file, lines, inBlock }: FileContext): void {
    const sinks: Array<{ pattern: RegExp; name: string; severity: Severity }> = [
      { pattern: /\.innerHTML\s*=(?!=)/,        name: 'innerHTML assignment',    severity: 'critical' },
      { pattern: /\.outerHTML\s*=(?!=)/,        name: 'outerHTML assignment',    severity: 'critical' },
      { pattern: /dangerouslySetInnerHTML\s*=/, name: 'dangerouslySetInnerHTML', severity: 'high'     },
      { pattern: /document\.write\s*\(/,        name: 'document.write()',        severity: 'high'     },
      { pattern: /insertAdjacentHTML\s*\(/,     name: 'insertAdjacentHTML()',    severity: 'high'     },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      sinks.forEach(({ pattern, name, severity }) => {
        if (!pattern.test(line)) return;
        const assignment = line.split('=').slice(1).join('=');
        // Suppress plain string literals — only dynamic values are dangerous
        if (/^\s*['"`][^'"`${}]*['"`]/.test(assignment)) return;
        this.addFinding({
          severity, category: 'Security - XSS',
          title: `Unsafe ${name}`,
          description:
            `${name} with a dynamic value is a cross-site scripting vector. ` +
            'AI generates these without sanitization when building UI helpers.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Use textContent for plain text, or sanitize with DOMPurify / a server-side ' +
            'allowlist before setting HTML.',
        });
      });
    });
  }

  private checkCorsConfig({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;

      if (/\bcors\s*\(\s*\)/.test(line)) {
        this.addFinding({
          severity: 'high', category: 'Security - CORS',
          title: 'CORS middleware with no configuration',
          description:
            'cors() with no options defaults to Access-Control-Allow-Origin: * — ' +
            'any origin can make credentialed requests. AI leaves this unconfigured in demos.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Pass an explicit allowlist: cors({ origin: [process.env.CLIENT_ORIGIN] })',
        });
      }

      if (/origin\s*:\s*['"`]\*['"`]/.test(line)) {
        this.addFinding({
          severity: 'critical', category: 'Security - CORS',
          title: 'Explicit wildcard CORS origin',
          description:
            'origin: "*" allows any domain to make cross-origin requests, ' +
            'bypassing Same-Origin policy entirely.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Replace with an explicit array of allowed origins sourced from environment config.',
        });
      }
    });
  }

  private checkFileUploadValidation({ file, lines, inBlock }: FileContext): void {
    const uploadLibs  = /\b(multer|busboy|formidable|upload\.single|upload\.array|upload\.fields)\b/;
    const hasSizeLimit = /\b(fileSize|maxFileSize|limits\s*:)/;
    const hasMimeCheck = /\b(mimetype|fileFilter|allowedTypes|mimeTypes)\b/;

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (!uploadLibs.test(line)) return;

      const ctx = lineWindow(lines, i, 5, 10);
      if (!hasSizeLimit.test(ctx)) {
        this.addFinding({
          severity: 'high', category: 'Security - File Upload',
          title: 'File upload without size limit',
          description:
            'Upload handler has no detectable fileSize / limits constraint. ' +
            'An attacker can exhaust disk space or memory with an oversized file.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Set limits: { fileSize: MAX_BYTES } in your multer/busboy config.',
        });
      }
      if (!hasMimeCheck.test(ctx)) {
        this.addFinding({
          severity: 'high', category: 'Security - File Upload',
          title: 'File upload without MIME type validation',
          description:
            'Upload handler has no fileFilter or mimetype check. ' +
            'Arbitrary file types including executables can be uploaded.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Add a fileFilter callback that rejects types outside your allowlist. ' +
            'Verify the actual MIME type, not just the extension.',
        });
      }
    });
  }

  private checkErrorLeakage({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (
        /res\.(json|send)\s*\(/.test(line) &&
        /\b(err(or)?\.(stack|message))\b/.test(line)
      ) {
        this.addFinding({
          severity: 'high', category: 'Security - Error Leakage',
          title: 'Raw error detail sent to client',
          description:
            'Sending error.stack or error.message to the client exposes internal file paths, ' +
            'library versions, and logic. AI error handlers do this by default.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Return a sanitized user-facing message. Log the full error server-side with a ' +
            'correlation ID and return only that ID to the client.',
        });
      }
    });
  }

  // ── Data integrity ────────────────────────────────────────────────────────

  private checkRaceConditions({ file, content }: FileContext): void {
    const rmwPattern =
      /const\s+\w+\s*=\s*await\s+\S+\.(?:select|findOne|get)\([\s\S]{0,200}?\n(?:[^\n]*\n){0,5}[^\n]*(?:\+=|-=|\*=|\/=)[^\n]*\n(?:[^\n]*\n){0,5}[^\n]*await\s+\S+\.(?:update|save)\(/g;

    let match: RegExpExecArray | null;
    while ((match = rmwPattern.exec(content)) !== null) {
      const prelude = content.substring(Math.max(0, match.index - 300), match.index);
      if (/\b(transaction|tx)\b/.test(prelude)) continue;

      this.addFinding({
        severity: 'high', category: 'Data Integrity - Race Condition',
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
      if (/\b(transaction|tx)\b/.test(lineWindow(lines, i, 3, 8))) return;

      const lookahead = lines.slice(i + 1, i + 7).join('\n');
      if (writeKeywords.some(k => lookahead.includes(k))) {
        this.addFinding({
          severity: 'high', category: 'Data Integrity - Transaction',
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

      if (/\bfor\s*[\s(]/.test(line) || /\bwhile\s*\(/.test(line)) {
        const body = lines.slice(i, Math.min(lines.length, i + 15)).join('\n');
        if (/\bawait\b/.test(body) && /\b(db\.|\.query\b|\.select\b|\.findOne\b)/.test(body)) {
          this.addFinding({
            severity: 'high', category: 'Performance - N+1 Queries',
            title: 'DB query inside loop',
            description: 'A database call inside a loop issues one query per iteration (N+1 problem).',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Collect IDs first, then fetch all records with a single WHERE id = ANY(?) query.',
          });
        }
      }

      if (/\.map\(async\s/.test(line) && !lineWindow(lines, i, 2, 0).includes('Promise.all')) {
        if (/\b(db\.|\.query\b|\.select\b)/.test(lineWindow(lines, i, 0, 5))) {
          this.addFinding({
            severity: 'high', category: 'Performance - N+1 Queries',
            title: 'Unguarded async .map() with DB calls',
            description: 'async .map() fires all queries concurrently and without batching.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Use a single batch query or SQL JOIN; if concurrency is acceptable, wrap in Promise.all().',
          });
        }
      }
    });
  }

  private checkUnboundedQueries({ file, lines, inBlock }: FileContext): void {
    const SELECT = /\b(db\.(select|find|query|findMany|findAll)|\.select\s*\(|SELECT\s+\*)/i;
    const LIMIT  = /\b(limit|take|top|pagination|page|perPage|LIMIT)\b/i;

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (!SELECT.test(line)) return;
      if (!LIMIT.test(lineWindow(lines, i, 2, 6))) {
        this.addFinding({
          severity: 'high', category: 'Performance - Unbounded Query',
          title: 'DB read without LIMIT / pagination',
          description:
            'Query has no detectable LIMIT, take, or pagination. ' +
            'This returns the full table at scale, exhausting memory or the connection pool.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Add .limit(n) / .take(n) or enforce cursor-based pagination. ' +
            'Default to a safe maximum (e.g. 100) even for internal queries.',
        });
      }
    });
  }

  private checkMemoryLeaks({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      if (/\.(on|addEventListener)\s*\(/.test(line)) {
        const hasRemoval = /\.(off|removeEventListener|removeAllListeners)\s*\(/.test(lines.join('\n'));
        if (!hasRemoval) {
          this.addFinding({
            severity: 'medium', category: 'Performance - Memory Leak',
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

      if (/\bfetch\s*\(/.test(line) && !/\b(signal|AbortController|timeout)\b/.test(line)) {
        const ctx = lineWindow(lines, i, 3, 3);
        if (!/\b(signal|AbortController|timeout)\b/.test(ctx)) {
          this.addFinding({
            severity: 'medium', category: 'Resilience - Timeout',
            title: 'fetch() without timeout',
            description: 'A network request with no timeout can hang indefinitely and exhaust connections.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Use AbortSignal.timeout(ms) or an AbortController with setTimeout.',
          });
        }
      }

      if (/\bdb\.(query|execute)\s*\(/.test(line)) {
        if (!/\b(statement_timeout|query_timeout|timeout)\b/.test(lineWindow(lines, i, 5, 5))) {
          this.addFinding({
            severity: 'high', category: 'Resilience - Timeout',
            title: 'DB query without timeout',
            description: 'A long-running query with no timeout can block the connection pool.',
            file, line: i + 1, code: line.trim(),
            recommendation: 'Set statement_timeout in your DB client config or per-query options.',
          });
        }
      }
    });
  }

  private checkMissingRetry({ file, lines, inBlock }: FileContext): void {
    const EXTERNAL = /\b(fetch\s*\(|axios\.(get|post|put|patch|delete)|https?\.request)\b/;
    const RETRY    = /\b(retry|backoff|pRetry|p-retry|retryable|attempt|maxRetries)\b/i;

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      if (!EXTERNAL.test(line)) return;
      if (/localhost|127\.0\.0\.1|process\.env/.test(line)) return;
      if (!RETRY.test(lineWindow(lines, i, 10, 5))) {
        this.addFinding({
          severity: 'medium', category: 'Resilience - Retry',
          title: 'External HTTP call without retry logic',
          description:
            'No retry / back-off pattern detected near this external call. ' +
            'Transient failures (rate limits, network blips) surface as hard errors.',
          file, line: i + 1, code: line.trim(),
          recommendation:
            'Wrap with p-retry or a custom exponential back-off. ' +
            'At minimum document why retrying is intentionally skipped.',
        });
      }
    });
  }

  // ── Observability ─────────────────────────────────────────────────────────

  private checkErrorHandling({ file, lines }: FileContext): void {
    const content = lines.join('\n');
    const asyncFnPattern =
      /(?:async\s+function\s+\w+|async\s+\w+\s*(?:=>\s*)?)\s*\([^)]*\)\s*\{([^{}]{0,800})\}/g;

    let match: RegExpExecArray | null;
    while ((match = asyncFnPattern.exec(content)) !== null) {
      const body = match[1];
      if (!body) continue;
      if (/\bawait\b/.test(body) && !/\btry\b/.test(body)) {
        if (body.split('\n').length <= 2) continue;
        this.addFinding({
          severity: 'medium', category: 'Error Handling',
          title: 'async function with no try/catch',
          description: 'Async function uses await but has no error handling; unhandled rejections will surface as crashes.',
          file, line: matchLineNumber(content, match.index),
          code: match[0].substring(0, 120) + (match[0].length > 120 ? '…' : ''),
          recommendation: 'Wrap awaited calls in try/catch or attach a .catch() handler at the call site.',
        });
      }
    }
  }

  private checkMissingLogging({ file, lines, inBlock }: FileContext): void {
    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      if (!/\bcatch\s*\(\s*\w+/.test(line)) return;

      const catchBody = lineWindow(lines, i, 0, 10);
      const hasLogging = /\b(logger\.|console\.|log\(|captureException|report\()/.test(catchBody);
      const isRethrow  = /\bthrow\b/.test(catchBody);

      if (!hasLogging && !isRethrow) {
        this.addFinding({
          severity: 'medium', category: 'Observability - Logging',
          title: 'Silent catch block',
          description: 'Error is caught but neither logged nor re-thrown, making failures invisible.',
          file, line: i + 1, code: line.trim(),
          recommendation: 'Add logger.error(error) and include relevant context (userId, requestId, etc.).',
        });
      }
    });
  }

  // ── Contamination checks ──────────────────────────────────────────────────

  private checkMockImplementations({ file, lines, inBlock }: FileContext): void {
    const mockWordPattern = /\b(MockService|StubRepository|FakeClient|DummyHandler)\b/;
    lines.forEach((line, i) => {
      if (inBlock[i]) return;
      if (/\b(class|function)\b/.test(line) && mockWordPattern.test(line)) {
        this.addFinding({
          severity: 'critical', category: 'Contamination - Mock Code',
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
      { pattern: /\btest@\w+\.\w+/i,          name: 'test email'             },
      { pattern: /\blorem\s+ipsum\b/i,          name: 'lorem ipsum placeholder'},
      { pattern: /4111111111111111/,             name: 'test credit card number'},
      { pattern: /\bsecret_key_for_testing\b/i, name: 'test secret key'        },
    ];

    lines.forEach((line, i) => {
      if (inBlock[i] || line.trimStart().startsWith('//')) return;
      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(line)) {
          this.addFinding({
            severity: 'high', category: 'Contamination - Test Data',
            title: `Hardcoded ${name} in production code`,
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
    this.findings.push({ id: `SEC-${String(++this.idCounter).padStart(4, '0')}`, ...finding });
  }

  private buildReport(findings: AuditFinding[]): AuditReport {
    const byCategory: Record<string, number> = {};
    findings.forEach(f => { byCategory[f.category] = (byCategory[f.category] ?? 0) + 1; });

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

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMarkdown(report: AuditReport, title = 'Security Audit Report'): string {
  const { summary, findings } = report;
  const severities: Severity[] = ['critical', 'high', 'medium', 'low'];

  const lines: string[] = [
    `# ${title}`,
    '',
    `**Generated**: ${report.timestamp}  `,
    `**Files scanned**: ${report.filesScanned}  `,
    `**Total findings**: ${summary.total}`,
    '',
    '## Summary',
    '',
    '| Severity | Count |',
    '|----------|-------|',
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
${colorize('audit-security', ANSI.bold)} — Deploy gate: security, data integrity, resilience

${colorize('When it runs', ANSI.bold)}
  Pre-deploy / CI pipeline. Exit 1 blocks the deployment.

${colorize('Options', ANSI.bold)}
  --severity=<level>    Filter to one severity (critical|high|medium|low)
  --category=<text>     Filter by category substring (case-insensitive)
  --output=<format>     markdown (default) | json | console
  --paths=<glob>        Override default glob (comma-separated)
  --ignore=<substr>     Skip files containing this string (repeatable)
  --concurrency=<n>     Max parallel file reads (default: 20)
  --help                Show this help

${colorize('Exit codes', ANSI.bold)}
  0   No critical or high findings — safe to deploy
  1   Critical or high findings found — deploy blocked

${colorize('Examples', ANSI.bold)}
  npx tsx audit-security.ts
  npx tsx audit-security.ts -- --output=console
  npx tsx audit-security.ts -- --severity=critical --output=json
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
  const opts    = parseArgs(process.argv.slice(2));
  const auditor = new SecurityAuditor();
  const report  = await auditor.audit(opts);
  const { summary } = report;

  console.log(colorize('\n🔒 Security audit complete!\n', ANSI.bold));
  console.log(`  Files scanned : ${report.filesScanned}`);
  console.log(`  Total issues  : ${summary.total}`);
  console.log(`  ${colorize('Critical', ANSI.red + ANSI.bold)} : ${summary.critical}`);
  console.log(`  ${colorize('High    ', ANSI.red)}     : ${summary.high}`);
  console.log(`  ${colorize('Medium  ', ANSI.yellow)}   : ${summary.medium}`);
  console.log(`  ${colorize('Low     ', ANSI.grey)}     : ${summary.low}`);
  console.log('');

  if (opts.output === 'console') {
    formatConsole(report);
  } else if (opts.output === 'json') {
    const out = 'SECURITY_REPORT.json';
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 Report saved → ${colorize(out, ANSI.cyan)}`);
  } else {
    const out = 'SECURITY_REPORT.md';
    fs.writeFileSync(out, formatMarkdown(report), 'utf-8');
    console.log(`📄 Report saved → ${colorize(out, ANSI.cyan)}`);
  }

  if (summary.critical > 0 || summary.high > 0) {
    console.log(colorize('\n❌  Critical/high security issues found — deploy blocked.', ANSI.red + ANSI.bold));
    process.exit(1);
  }

  console.log(colorize('\n✅  No critical or high security issues — deploy gate passed.', ANSI.green));
  process.exit(0);
}

if (process.env.NODE_ENV !== 'test') {
  main().catch(err => { console.error('Security audit failed:', err); process.exit(1); });
}

export { SecurityAuditor };
export type { AuditReport, AuditFinding, AuditOptions };
