import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { glob } from 'glob';

// ── Mock fs and glob so the auditor scans in-memory fixtures ──────────────
vi.mock('fs');
vi.mock('glob', () => ({
  glob: vi.fn(),
}));

// Import AFTER mocks are registered
import { QualityAuditor } from './audit-quality';
import type { AuditReport } from './audit-quality';

// ── Helpers ───────────────────────────────────────────────────────────────
const mockedGlob = vi.mocked(glob);
const mockedReadFileSync = vi.mocked(fs.readFileSync);

/** Register a single virtual file that the auditor will "scan". */
function stubFile(path: string, content: string) {
  mockedGlob.mockResolvedValue([path] as any);
  mockedReadFileSync.mockReturnValue(content);
}

/** Register multiple virtual files. */
function stubFiles(files: Record<string, string>) {
  const paths = Object.keys(files);
  mockedGlob.mockResolvedValue(paths as any);
  mockedReadFileSync.mockImplementation((p: any) => {
    const content = files[String(p)];
    if (content === undefined) throw new Error(`ENOENT: ${p}`);
    return content;
  });
}

/** Convenience: run the auditor on a single fixture and return the report. */
async function auditFixture(
  path: string,
  content: string,
  opts: Record<string, unknown> = {},
): Promise<AuditReport> {
  stubFile(path, content);
  const auditor = new QualityAuditor();
  // Suppress console noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const report = await auditor.audit({ paths: [path], threshold: 100, ...opts });
  vi.restoreAllMocks();
  // Re-apply mocks after restoreAllMocks
  mockedGlob.mockResolvedValue([path] as any);
  mockedReadFileSync.mockReturnValue(content);
  return report;
}

// ══════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mock('fs');
  vi.mock('glob');
});

// ── 1. AI Code Smell — Function Length ────────────────────────────────────

describe('checkFunctionLength', () => {
  it('flags functions exceeding 40 lines', async () => {
    const body = new Array(50).fill('  const x = 1;').join('\n');
    const fixture = `const foo = (a: number) => {\n${body}\n};\n`;
    const report = await auditFixture('src/service.ts', fixture);

    const hit = report.findings.find(f => f.category.includes('Function Length'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('medium');
  });

  it('ignores short functions', async () => {
    const fixture = `const foo = (a: number) => {\n  return a;\n};\n`;
    const report = await auditFixture('src/service.ts', fixture);

    expect(report.findings.filter(f => f.category.includes('Function Length'))).toHaveLength(0);
  });
});

// ── 2. AI Code Smell — Excessive Comments ─────────────────────────────────

describe('checkExcessiveComments', () => {
  it('flags regions where >50% of lines are comments', async () => {
    // 45 lines total so i can exceed 19 (lastFlagged + WINDOW)
    const lines: string[] = [];
    for (let i = 0; i < 45; i++) {
      lines.push(i % 3 === 0 ? 'const x = 1;' : '// This is a comment');
    }
    const report = await auditFixture('src/verbose.ts', lines.join('\n'));

    const hit = report.findings.find(f => f.category.includes('Excessive Comments'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('low');
  });

  it('ignores regions with normal comment density', async () => {
    const lines = new Array(30).fill('const x = 1;');
    lines[0] = '// a comment';
    const report = await auditFixture('src/clean.ts', lines.join('\n'));

    expect(report.findings.filter(f => f.category.includes('Excessive Comments'))).toHaveLength(0);
  });
});

// ── 3. AI Code Smell — Magic Numbers ──────────────────────────────────────

describe('checkMagicNumbers', () => {
  it('flags numeric literals in expressions', async () => {
    const fixture = `if (retries > 100) { throw new Error("too many"); }\n`;
    const report = await auditFixture('src/retry.ts', fixture);

    const hit = report.findings.find(f => f.category.includes('Magic Number'));
    expect(hit).toBeDefined();
  });

  it('ignores numbers in test files', async () => {
    const fixture = `it('works', () => { expect(100 + 200).toBe(300); });\n`;
    const report = await auditFixture('src/util.test.ts', fixture);

    expect(report.findings.filter(f => f.category.includes('Magic Number'))).toHaveLength(0);
  });

  it('ignores lines with safe keywords like length, size', async () => {
    const fixture = `if (arr.length > 100) { truncate(); }\n`;
    const report = await auditFixture('src/arr.ts', fixture);

    expect(report.findings.filter(f => f.category.includes('Magic Number'))).toHaveLength(0);
  });
});

// ── 4. Code Hygiene — TODO / FIXME / HACK Comments ────────────────────────

describe('checkTodoComments', () => {
  it('flags TODO comments as medium', async () => {
    const report = await auditFixture('src/api.ts', '// TODO: finish this\n');
    const hit = report.findings.find(f => f.title.includes('TODO'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('medium');
  });

  it('flags FIXME comments as high', async () => {
    const report = await auditFixture('src/api.ts', '// FIXME: broken\n');
    const hit = report.findings.find(f => f.title.includes('FIXME'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('high');
  });

  it('flags HACK comments as high', async () => {
    const report = await auditFixture('src/api.ts', '// HACK: workaround\n');
    const hit = report.findings.find(f => f.title.includes('HACK'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('high');
  });

  it('flags "not implemented yet" as critical', async () => {
    const report = await auditFixture('src/api.ts', 'throw new Error("not implemented yet");\n');
    const hit = report.findings.find(f => f.title.includes('Not Implemented'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('critical');
  });

  it('reports no TODO findings for clean files', async () => {
    const report = await auditFixture('src/clean.ts', 'export const x = 1;\n');
    expect(report.findings.filter(f => f.category.includes('Incomplete Work'))).toHaveLength(0);
  });
});

// ── 5. Code Hygiene — Console / Debugger ──────────────────────────────────

describe('checkConsoleStatements', () => {
  it('flags console.log in production code as medium', async () => {
    const report = await auditFixture('src/service.ts', 'console.log("debug");\n');
    const hit = report.findings.find(f => f.title.includes('console statement'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('medium');
  });

  it('flags console.log in test files as low', async () => {
    const report = await auditFixture('src/service.test.ts', 'console.log("debug");\n');
    const hit = report.findings.find(f => f.title.includes('console statement'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('low');
  });

  it('flags debugger statements as high', async () => {
    const report = await auditFixture('src/service.ts', 'debugger;\n');
    const hit = report.findings.find(f => f.title.includes('debugger'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('high');
  });
});

// ── 6. Code Hygiene — Commented-Out Code ──────────────────────────────────

describe('checkCommentedCode', () => {
  it('flags ≥2 consecutive commented-out code lines', async () => {
    const fixture = [
      '// const a = 1;',
      '// const b = 2;',
      '// const c = 3;',
      'export const d = 4;',
    ].join('\n');
    const report = await auditFixture('src/old.ts', fixture);

    const hit = report.findings.find(f => f.category.includes('Dead Code'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('low');
  });

  it('ignores single commented-out lines', async () => {
    const fixture = '// const a = 1;\nexport const b = 2;\n';
    const report = await auditFixture('src/ok.ts', fixture);

    expect(report.findings.filter(f => f.category.includes('Dead Code'))).toHaveLength(0);
  });
});

// ── 7. Code Hygiene — Incomplete Types ────────────────────────────────────

describe('checkIncompleteTypes', () => {
  it('flags explicit any type', async () => {
    const report = await auditFixture('src/types.ts', 'function foo(x: any) {}\n');
    const hit = report.findings.find(f => f.title.includes('any type'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('low');
  });

  it('flags empty interfaces (single-line syntax)', async () => {
    const report = await auditFixture('src/types.ts', 'interface Empty {}\n');
    const hit = report.findings.find(f => f.title.includes('Empty interface'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('medium');
  });

  it('flags generic type names like Data, Entity', async () => {
    const report = await auditFixture('src/types.ts', 'interface Data { id: string; }\n');
    const hit = report.findings.find(f => f.title.includes('Generic type name'));
    expect(hit).toBeDefined();
  });

  it('no findings for well-typed code', async () => {
    const report = await auditFixture(
      'src/models.ts',
      'interface UserProfile { id: string; name: string; }\n',
    );
    expect(
      report.findings.filter(f => f.category.includes('Types')),
    ).toHaveLength(0);
  });
});

// ── 8. Architecture — Singleton Pattern ───────────────────────────────────

describe('checkSingletonPattern', () => {
  it('flags classes using private static instance + getInstance()', async () => {
    const fixture = [
      'class Registry {',
      '  private static instance: Registry;',
      '  static getInstance() { return this.instance; }',
      '}',
    ].join('\n');
    const report = await auditFixture('src/registry.ts', fixture);

    const hit = report.findings.find(f => f.category.includes('Singleton'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('low');
  });

  it('no finding when no singleton pattern exists', async () => {
    const fixture = 'class Service { constructor(private dep: Dep) {} }\n';
    const report = await auditFixture('src/service.ts', fixture);

    expect(report.findings.filter(f => f.category.includes('Singleton'))).toHaveLength(0);
  });
});

// ── 9. Test Quality — Behavioral Assertions ───────────────────────────────

describe('checkBehavioralAssertions', () => {
  it('flags test files that only use spy assertions', async () => {
    const fixture = [
      "describe('Srv', () => {",
      "  it('calls dep', () => {",
      '    expect(mock).toHaveBeenCalled();',
      '    expect(mock).toHaveBeenCalledWith("x");',
      '  });',
      '});',
    ].join('\n');
    const report = await auditFixture('src/srv.test.ts', fixture);

    const hit = report.findings.find(f => f.category.includes('Behavioral Assertions'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('high');
    expect(hit!.description).toContain('0 behavioral assertions');
  });

  it('flags high spy-to-outcome ratio (>70%)', async () => {
    const fixture = [
      "describe('Srv', () => {",
      "  it('calls dep', () => {",
      '    expect(mock).toHaveBeenCalled();',
      '    expect(mock).toHaveBeenCalledWith("x");',
      '    expect(mock).toHaveBeenCalledTimes(1);',
      '    expect(mock).toHaveBeenCalledTimes(2);',
      '    expect(result).toBe(true);',
      '  });',
      '});',
    ].join('\n');
    const report = await auditFixture('src/srv.test.ts', fixture);

    const hit = report.findings.find(f => f.title.includes('spy-to-outcome ratio'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('medium');
  });

  it('no finding when outcome assertions dominate', async () => {
    const fixture = [
      "describe('util', () => {",
      "  it('adds', () => { expect(add(1,2)).toBe(3); });",
      "  it('subs', () => { expect(sub(3,1)).toEqual(2); });",
      '});',
    ].join('\n');
    const report = await auditFixture('src/util.test.ts', fixture);

    expect(
      report.findings.filter(f => f.category.includes('Behavioral Assertions')),
    ).toHaveLength(0);
  });
});

// ── 10. Test Quality — Missing Failure Cases ──────────────────────────────

describe('checkMissingFailureCases', () => {
  it('flags test files with ≥3 tests and zero failure-path coverage', async () => {
    const fixture = [
      "describe('API', () => {",
      "  it('creates user', () => {});",
      "  it('lists users', () => {});",
      "  it('gets user', () => {});",
      '});',
    ].join('\n');
    const report = await auditFixture('src/api.test.ts', fixture);

    const hit = report.findings.find(f => f.category.includes('Missing Failure Cases'));
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe('high');
  });

  it('no finding when failure keywords are present', async () => {
    const fixture = [
      "describe('API', () => {",
      "  it('creates user', () => {});",
      "  it('returns 404 for missing user', () => {});",
      "  it('rejects invalid input', () => {});",
      '});',
    ].join('\n');
    const report = await auditFixture('src/api.test.ts', fixture);

    expect(
      report.findings.filter(f => f.category.includes('Missing Failure Cases')),
    ).toHaveLength(0);
  });
});

// ── Report Structure & Scoring ────────────────────────────────────────────

describe('AuditReport structure', () => {
  it('produces a well-formed report with correct summary', async () => {
    const report = await auditFixture('src/clean.ts', 'export const x = 1;\n');
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('filesScanned');
    expect(report).toHaveProperty('weightedScore');
    expect(report).toHaveProperty('threshold');
    expect(report).toHaveProperty('passed');
    expect(report).toHaveProperty('findings');
    expect(report.summary).toHaveProperty('critical');
    expect(report.summary).toHaveProperty('high');
    expect(report.summary).toHaveProperty('medium');
    expect(report.summary).toHaveProperty('low');
    expect(report.summary).toHaveProperty('total');
    expect(report.summary).toHaveProperty('byCategory');
  });

  it('calculates weighted score correctly (critical×4 + high×2 + medium×1 + low×0.5)', async () => {
    // This fixture triggers: console.log (medium), debugger (high)
    const fixture = 'console.log("x");\ndebugger;\n';
    const report = await auditFixture('src/mixed.ts', fixture);

    const expectedScore =
      report.summary.critical * 4 +
      report.summary.high * 2 +
      report.summary.medium * 1 +
      report.summary.low * 0.5;
    expect(report.weightedScore).toBe(expectedScore);
  });

  it('passes when weighted score ≤ threshold', async () => {
    const report = await auditFixture('src/clean.ts', 'export const x = 1;\n', {
      threshold: 100,
    });
    expect(report.passed).toBe(true);
  });

  it('fails when weighted score > threshold', async () => {
    // Trigger enough findings to exceed threshold 0
    const fixture = 'console.log("x");\ndebugger;\n// TODO: fix\n';
    const report = await auditFixture('src/bad.ts', fixture, { threshold: 0 });
    expect(report.passed).toBe(false);
  });
});

// ── Filtering ─────────────────────────────────────────────────────────────

describe('Filtering', () => {
  it('filters findings by severity', async () => {
    // debugger = high, console.log = medium
    const fixture = 'console.log("x");\ndebugger;\n';
    stubFile('src/mix.ts', fixture);
    const auditor = new QualityAuditor();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const report = await auditor.audit({
      paths: ['src/mix.ts'],
      threshold: 100,
      severity: 'high',
    });
    vi.restoreAllMocks();

    expect(report.findings.every(f => f.severity === 'high')).toBe(true);
  });

  it('filters findings by category substring', async () => {
    const fixture = 'console.log("x");\n// TODO: do it\n';
    stubFile('src/mix.ts', fixture);
    const auditor = new QualityAuditor();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const report = await auditor.audit({
      paths: ['src/mix.ts'],
      threshold: 100,
      category: 'Incomplete',
    });
    vi.restoreAllMocks();

    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.every(f => f.category.toLowerCase().includes('incomplete'))).toBe(true);
  });
});

// ── Deduplication ─────────────────────────────────────────────────────────

describe('Deduplication', () => {
  it('does not produce duplicate findings for identical file:line:title', async () => {
    const report = await auditFixture('src/dup.ts', '// TODO: same\n');
    const todoFindings = report.findings.filter(f => f.title.includes('TODO'));
    expect(todoFindings).toHaveLength(1);
  });
});
