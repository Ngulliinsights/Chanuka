#!/usr/bin/env node
/**
 * Import/Export Audit Tool — Optimized
 *
 * Two-pass analysis:
 *   Pass 1 — Index all files, resolve tsconfig path aliases, build export maps
 *   Pass 2 — Resolve every import/export reference, classify, trace chains, detect cycles
 *
 * Handles: static imports, dynamic import(), re-exports (*, named, namespace),
 *          barrel index files, tsconfig path aliases, workspace packages
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportStatus = 'valid' | 'stale' | 'missing' | 'adapter';
type ImportKind = 'static' | 'dynamic' | 're-export' | 'require';

interface RawImport {
  importPath: string;
  kind: ImportKind;
  line: number;
  col: number;
  names: string[];          // named bindings — empty means namespace/side-effect
}

interface ResolvedImport extends RawImport {
  resolvedAbsolute: string | null;   // where path actually lands on disk
  status: ImportStatus;
  replacement: string | null;        // relative path from source file to fix
  rationale: string;
  resolutionChain: string[];         // for adapters: full re-export hop list
  ultimateConcrete: string | null;   // final real implementation file
}

interface FileAudit {
  filePath: string;                  // relative to project root
  imports: ResolvedImport[];
  exports: string[];                 // names this file exports
  isBarrel: boolean;
}

interface AuditResult {
  summary: {
    files: number;
    totalImports: number;
    valid: number;
    stale: number;
    missing: number;
    adapters: number;
  };
  fileAudits: FileAudit[];
  reverseDependencies: Record<string, string[]>;  // target → files that import it
  circularRisks: Array<{ cycle: string[]; severity: 'warning' | 'error' }>;
  unmappedMissing: ResolvedImport[];              // missing with no suggested fix
}

// ─── Path Alias Resolution ───────────────────────────────────────────────────

interface PathAliases {
  [alias: string]: string[];  // mirrors tsconfig compilerOptions.paths
}

function loadPathAliases(projectRoot: string): PathAliases {
  const aliases: PathAliases = {};
  const tsconfigCandidates = [
    'tsconfig.json',
    'tsconfig.base.json',
    'tsconfig.app.json',
  ];

  for (const candidate of tsconfigCandidates) {
    const tsconfigPath = path.join(projectRoot, candidate);
    if (!fs.existsSync(tsconfigPath)) continue;

    try {
      // Strip comments before parsing (tsconfig uses JSON5-ish)
      const raw = fs.readFileSync(tsconfigPath, 'utf-8').replace(/\/\/.*/g, '');
      const config = JSON.parse(raw);
      const compilerOptions = config?.compilerOptions ?? {};
      const baseUrl = compilerOptions.baseUrl
        ? path.resolve(projectRoot, compilerOptions.baseUrl)
        : projectRoot;

      const paths: Record<string, string[]> = compilerOptions.paths ?? {};

      for (const [alias, targets] of Object.entries(paths)) {
        // Normalize wildcard aliases: @/* → @/
        const key = alias.replace(/\/\*$/, '/');
        aliases[key] = targets.map((t) => {
          const resolved = path.resolve(baseUrl, t.replace(/\/\*$/, ''));
          return resolved;
        });
      }

      // Default @/ and ~/ if not explicitly configured
      if (!aliases['@/']) aliases['@/'] = [path.join(projectRoot, 'src')];
      if (!aliases['~/']) aliases['~/'] = [path.join(projectRoot, 'src')];

      break; // Use the first valid tsconfig found
    } catch {
      // Malformed tsconfig — skip
    }
  }

  return aliases;
}

// ─── File System Helpers ─────────────────────────────────────────────────────

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const INDEX_NAMES = EXTENSIONS.flatMap((e) => [`index${e}`]);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.nx', '.cache', '.turbo', 'coverage']);

function walkSourceFiles(root: string): string[] {
  const results: string[] = [];

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (
        entry.isFile() &&
        EXTENSIONS.some((e) => entry.name.endsWith(e)) &&
        !entry.name.endsWith('.d.ts')
      ) {
        results.push(path.join(dir, entry.name));
      }
    }
  };

  walk(root);
  return results;
}

/**
 * Try to resolve a bare path to a real file, checking extensions and index files.
 * Returns the absolute path if found, null otherwise.
 */
function resolveToFile(bare: string): string | null {
  // Direct match
  if (fs.existsSync(bare) && fs.statSync(bare).isFile()) return bare;

  // With extension
  for (const ext of EXTENSIONS) {
    const candidate = bare + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  // As directory with index
  for (const index of INDEX_NAMES) {
    const candidate = path.join(bare, index);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

// ─── AST Extraction ──────────────────────────────────────────────────────────

/**
 * Extract all imports and exports from a TS/JS file using the compiler API.
 * Handles: import ... from, export ... from, export * from, export * as ns from,
 *          dynamic import(), require(), and re-export declarations.
 */
function extractImports(filePath: string, content: string): RawImport[] {
  const results: RawImport[] = [];

  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const getLine = (pos: number) =>
    sf.getLineAndCharacterOfPosition(pos);

  const record = (
    specifier: string,
    kind: ImportKind,
    pos: number,
    names: string[] = []
  ) => {
    const { line, character } = getLine(pos);
    results.push({ importPath: specifier, kind, line: line + 1, col: character + 1, names });
  };

  const visit = (node: ts.Node) => {
    // import x from '...'  /  import { x } from '...'
    if (ts.isImportDeclaration(node)) {
      const spec = (node.moduleSpecifier as ts.StringLiteral).text;
      const names: string[] = [];
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        bindings.elements.forEach((el) => names.push(el.name.text));
      }
      record(spec, 'static', node.getStart(), names);
    }

    // export { x } from '...'  /  export * from '...'  /  export * as ns from '...'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const spec = (node.moduleSpecifier as ts.StringLiteral).text;
      const names: string[] = [];
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((el) => names.push(el.name.text));
      }
      record(spec, 're-export', node.getStart(), names);
    }

    // dynamic import()
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      record(node.arguments[0].text, 'dynamic', node.getStart());
    }

    // require()
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      record(node.arguments[0].text, 'require', node.getStart());
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return results;
}

function extractExportedNames(content: string, filePath: string): string[] {
  const names: string[] = [];
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const visit = (node: ts.Node) => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isVariableStatement(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((d) => {
          if (ts.isIdentifier(d.name)) names.push(d.name.text);
        });
      } else if ('name' in node && node.name && ts.isIdentifier(node.name)) {
        names.push((node.name as ts.Identifier).text);
      }
    }

    if (
      ts.isExportDeclaration(node) &&
      !node.moduleSpecifier &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      node.exportClause.elements.forEach((el) => names.push(el.name.text));
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return names;
}

// ─── Core Auditor ────────────────────────────────────────────────────────────

class ImportAuditor {
  private projectRoot: string;
  private aliases: PathAliases;

  /** Absolute paths of all source files */
  private fileIndex = new Set<string>();

  /** Content cache: abs path → file content */
  private contentCache = new Map<string, string>();

  /** Export map: abs path → exported names */
  private exportMap = new Map<string, string[]>();

  /** Fuzzy index: basename (no ext) → abs paths */
  private fuzzyIndex = new Map<string, string[]>();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.aliases = loadPathAliases(projectRoot);
  }

  // ── Pass 1: Index ──────────────────────────────────────────────────────────

  private buildIndex(files: string[]) {
    for (const f of files) {
      this.fileIndex.add(f);
      const content = fs.readFileSync(f, 'utf-8');
      this.contentCache.set(f, content);
      this.exportMap.set(f, extractExportedNames(content, f));

      const base = path.basename(f).replace(/\.(ts|tsx|js|jsx)$/, '');
      const existing = this.fuzzyIndex.get(base) ?? [];
      existing.push(f);
      this.fuzzyIndex.set(base, existing);
    }
  }

  // ── Resolution ─────────────────────────────────────────────────────────────

  /**
   * Convert an import specifier to absolute path candidates,
   * honouring tsconfig path aliases.
   */
  private resolveSpecifier(fromFile: string, specifier: string): string[] {
    const candidates: string[] = [];

    // External package — skip
    if (!specifier.startsWith('.') && !this.isAliased(specifier)) return [];

    if (specifier.startsWith('.')) {
      candidates.push(path.resolve(path.dirname(fromFile), specifier));
      return candidates;
    }

    // Alias resolution
    for (const [prefix, roots] of Object.entries(this.aliases)) {
      if (specifier.startsWith(prefix)) {
        const remainder = specifier.slice(prefix.length);
        for (const root of roots) {
          candidates.push(path.join(root, remainder));
        }
      }
    }

    return candidates;
  }

  private isAliased(specifier: string): boolean {
    return Object.keys(this.aliases).some((prefix) => specifier.startsWith(prefix));
  }

  /**
   * Fuzzy search: find the most plausible file when the import is missing.
   * Scores candidates by basename match, path segment overlap, and layer proximity.
   */
  private findBestReplacement(
    specifier: string,
    fromFile: string
  ): string | null {
    const base = path.basename(specifier).replace(/\.(ts|tsx|js|jsx)$/, '');
    const specParts = specifier.split('/');

    const candidates = this.fuzzyIndex.get(base) ?? [];

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Score: higher = better match
    const scored = candidates.map((c) => {
      const cParts = c.split('/');
      let score = 0;

      // Prefer same domain/feature folder
      for (const part of specParts) {
        if (cParts.includes(part)) score += 2;
      }

      // Prefer closer files (fewer directory hops)
      const rel = path.relative(path.dirname(fromFile), c);
      const hops = rel.split('/').filter((p) => p === '..').length;
      score -= hops;

      return { path: c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].path;
  }

  /**
   * Determine if a file is a barrel/adapter (only re-exports, no real implementation).
   */
  private isBarrel(filePath: string): boolean {
    const content = this.contentCache.get(filePath) ?? '';
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//') && !l.startsWith('*'));

    return (
      lines.length > 0 &&
      lines.every(
        (l) =>
          l.startsWith('export *') ||
          l.startsWith('export {') ||
          l.startsWith('export type {') ||
          l.startsWith("import ") // allow import for side effects in barrel
      )
    );
  }

  /**
   * Trace re-export chain to its concrete implementation.
   * Returns the full hop list and the terminal file.
   */
  private traceChain(
    filePath: string,
    visited = new Set<string>()
  ): string[] {
    if (visited.has(filePath)) return [filePath + ' ⟲ (cycle)'];
    visited.add(filePath);

    const chain: string[] = [this.rel(filePath)];
    const content = this.contentCache.get(filePath) ?? '';
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const reExportTargets: string[] = [];
    sf.forEachChild((node) => {
      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        reExportTargets.push((node.moduleSpecifier as ts.StringLiteral).text);
      }
    });

    for (const target of reExportTargets) {
      const resolved = this.resolveSpecifier(filePath, target);
      for (const candidate of resolved) {
        const actual = resolveToFile(candidate);
        if (actual && actual !== filePath) {
          chain.push(...this.traceChain(actual, visited));
          break;
        }
      }
    }

    return chain;
  }

  // ── Circular Dependency Detection ──────────────────────────────────────────

  /**
   * Build a dependency graph and detect cycles using DFS with coloring.
   * Returns cycles with severity: 'error' if the cycle crosses layer boundaries.
   */
  private detectCycles(
    graph: Map<string, Set<string>>
  ): Array<{ cycle: string[]; severity: 'warning' | 'error' }> {
    const color = new Map<string, 'white' | 'gray' | 'black'>();
    const parent = new Map<string, string | null>();
    const cycles: Array<{ cycle: string[]; severity: 'warning' | 'error' }> = [];

    for (const node of graph.keys()) color.set(node, 'white');

    const dfs = (u: string) => {
      color.set(u, 'gray');
      for (const v of graph.get(u) ?? []) {
        if (color.get(v) === 'gray') {
          // Reconstruct cycle
          const cycle: string[] = [this.rel(v)];
          let cur: string | null | undefined = u;
          while (cur && cur !== v) {
            cycle.unshift(this.rel(cur));
            cur = parent.get(cur);
          }
          cycle.unshift(this.rel(v));

          // Cross-layer cycles are errors; same-layer are warnings
          const layers = cycle.map((f) => f.split('/')[0]);
          const severity = new Set(layers).size > 1 ? 'error' : 'warning';
          cycles.push({ cycle, severity });
        } else if (color.get(v) === 'white') {
          parent.set(v, u);
          dfs(v);
        }
      }
      color.set(u, 'black');
    };

    for (const node of graph.keys()) {
      if (color.get(node) === 'white') dfs(node);
    }

    return cycles;
  }

  // ── Pass 2: Resolve ────────────────────────────────────────────────────────

  private auditFile(filePath: string): FileAudit {
    const content = this.contentCache.get(filePath)!;
    const raw = extractImports(filePath, content);
    const resolved: ResolvedImport[] = [];

    for (const imp of raw) {
      const candidates = this.resolveSpecifier(filePath, imp.importPath);

      if (candidates.length === 0) {
        // External package — skip
        continue;
      }

      let actualFile: string | null = null;
      for (const candidate of candidates) {
        actualFile = resolveToFile(candidate);
        if (actualFile) break;
      }

      let status: ImportStatus;
      let replacement: string | null = null;
      let rationale: string;
      let resolutionChain: string[] = [];
      let ultimateConcrete: string | null = null;

      if (actualFile) {
        if (this.isBarrel(actualFile)) {
          status = 'adapter';
          resolutionChain = this.traceChain(actualFile);
          ultimateConcrete = resolutionChain[resolutionChain.length - 1].replace(' ⟲ (cycle)', '');
          rationale = `Barrel/re-export. Resolves to: ${ultimateConcrete}`;
        } else {
          // Check if path alias can be simplified to a direct relative import
          const expectedRelative = path.relative(path.dirname(filePath), actualFile);
          const importIsAlias = !imp.importPath.startsWith('.');
          status = 'valid';
          rationale = importIsAlias
            ? `Alias resolves correctly to ${this.rel(actualFile)}`
            : 'Direct import resolves correctly';
        }
      } else {
        // Missing — attempt fuzzy replacement
        const best = this.findBestReplacement(imp.importPath, filePath);
        if (best) {
          const relFromSource = path.relative(path.dirname(filePath), best);
          replacement = relFromSource.startsWith('.') ? relFromSource : `./${relFromSource}`;
        }
        status = 'missing';
        rationale = this.generateMissingRationale(imp.importPath, replacement, filePath);
      }

      resolved.push({
        ...imp,
        resolvedAbsolute: actualFile,
        status,
        replacement,
        rationale,
        resolutionChain,
        ultimateConcrete: ultimateConcrete ?? actualFile,
      });
    }

    return {
      filePath: this.rel(filePath),
      imports: resolved,
      exports: this.exportMap.get(filePath) ?? [],
      isBarrel: this.isBarrel(filePath),
    };
  }

  private generateMissingRationale(
    importPath: string,
    replacement: string | null,
    fromFile: string
  ): string {
    if (replacement) {
      return `Not found at declared path. Best match by basename + domain proximity: ${replacement}`;
    }

    const segments = importPath.split('/');
    const hints: Record<string, string> = {
      types: 'Type definitions may have been consolidated into shared/types or a co-located types.ts',
      utils: 'Utility may have moved to shared/utils or a domain-specific utils folder',
      services: 'Service likely restructured into a feature module; search for similar filename',
      hooks: 'Hook may have moved to a feature-specific hooks folder',
      store: 'State module may have been restructured; check for slices or context equivalents',
      api: 'API module may have moved to a dedicated api/ layer or feature module',
      components: 'Component may have been moved into a feature folder',
    };

    for (const [keyword, hint] of Object.entries(hints)) {
      if (segments.includes(keyword)) return hint;
    }

    return 'No match found. Manual investigation required — check git log for renames.';
  }

  // ── Reverse Dependency Map ─────────────────────────────────────────────────

  private buildReverseDeps(audits: FileAudit[]): Record<string, string[]> {
    const map: Record<string, string[]> = {};

    for (const audit of audits) {
      for (const imp of audit.imports) {
        if (imp.resolvedAbsolute) {
          const key = this.rel(imp.resolvedAbsolute);
          map[key] = map[key] ?? [];
          map[key].push(audit.filePath);
        }
      }
    }

    return map;
  }

  // ── Public Entry Point ─────────────────────────────────────────────────────

  async audit(): Promise<AuditResult> {
    console.log('🔍 Pass 1: Indexing files and building export map...');
    const files = walkSourceFiles(this.projectRoot);
    this.buildIndex(files);
    console.log(`   Indexed ${files.length} files, ${this.fuzzyIndex.size} unique basenames\n`);

    console.log('🔗 Pass 2: Resolving imports and classifying...');
    const fileAudits = files.map((f) => this.auditFile(f));

    // Build dependency graph for cycle detection
    const graph = new Map<string, Set<string>>();
    for (const audit of fileAudits) {
      const deps = new Set<string>();
      for (const imp of audit.imports) {
        if (imp.resolvedAbsolute) deps.add(imp.resolvedAbsolute);
      }
      graph.set(this.rel(audit.filePath), deps);
    }

    const circularRisks = this.detectCycles(graph);
    const reverseDependencies = this.buildReverseDeps(fileAudits);

    const allImports = fileAudits.flatMap((a) => a.imports);

    const summary = {
      files: files.length,
      totalImports: allImports.length,
      valid: allImports.filter((i) => i.status === 'valid').length,
      stale: allImports.filter((i) => i.status === 'stale').length,
      missing: allImports.filter((i) => i.status === 'missing').length,
      adapters: allImports.filter((i) => i.status === 'adapter').length,
    };

    const unmappedMissing = allImports.filter(
      (i) => i.status === 'missing' && !i.replacement
    );

    console.log(`   Done. ${circularRisks.length} cycle(s) detected.\n`);

    return { summary, fileAudits, reverseDependencies, circularRisks, unmappedMissing };
  }

  private rel(abs: string) {
    return path.relative(this.projectRoot, abs).replace(/\\/g, '/');
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMarkdown(result: AuditResult): string {
  const { summary, fileAudits, reverseDependencies, circularRisks, unmappedMissing } = result;
  const pct = (n: number) => `${((n / summary.totalImports) * 100).toFixed(1)}%`;

  let md = '# Import/Export Audit Report\n\n';

  // ── Summary ──
  md += '## Summary\n\n';
  md += `| Metric | Count | % of Total |\n|--------|-------|------------|\n`;
  md += `| Files analyzed | ${summary.files} | — |\n`;
  md += `| Total imports resolved | ${summary.totalImports} | 100% |\n`;
  md += `| ✅ Valid | ${summary.valid} | ${pct(summary.valid)} |\n`;
  md += `| ⚠️ Stale (moved) | ${summary.stale} | ${pct(summary.stale)} |\n`;
  md += `| ❌ Missing | ${summary.missing} | ${pct(summary.missing)} |\n`;
  md += `| 🔗 Adapter/Barrel | ${summary.adapters} | ${pct(summary.adapters)} |\n\n`;

  // ── Missing ──
  const missing = fileAudits.flatMap((a) =>
    a.imports.filter((i) => i.status === 'missing').map((i) => ({ ...i, file: a.filePath }))
  );

  md += '## ❌ Missing Imports\n\n';

  if (missing.length === 0) {
    md += '_No missing imports detected._\n\n';
  } else {
    md += '| File | Ln | Kind | Import Path | Suggested Fix | Rationale | Dependents |\n';
    md += '|------|----|------|-------------|---------------|-----------|------------|\n';
    for (const m of missing) {
      const deps = (reverseDependencies[(m as any).resolvedAbsolute ?? ''] ?? []).length;
      md += `| \`${(m as any).file}\` | ${m.line} | ${m.kind} | \`${m.importPath}\` | ${m.replacement ? `\`${m.replacement}\`` : '🔍 No match'} | ${m.rationale} | ${deps} files |\n`;
    }
    md += '\n';
  }

  // ── Adapters / Barrels ──
  const adapters = fileAudits.flatMap((a) =>
    a.imports.filter((i) => i.status === 'adapter').map((i) => ({ ...i, file: a.filePath }))
  );

  md += '## 🔗 Adapter / Barrel Resolution Chains\n\n';
  if (adapters.length === 0) {
    md += '_No adapter chains detected._\n\n';
  } else {
    md += '| File | Ln | Import | Chain | Concrete Implementation |\n';
    md += '|------|----|--------|-------|-------------------------|\n';
    for (const a of adapters) {
      const chain = a.resolutionChain.join(' → ');
      md += `| \`${(a as any).file}\` | ${a.line} | \`${a.importPath}\` | ${chain} | \`${a.ultimateConcrete ?? '?'}\` |\n`;
    }
    md += '\n';
  }

  // ── Circular Risks ──
  md += '## ⚠️ Circular Dependency Risks\n\n';
  if (circularRisks.length === 0) {
    md += '_No circular dependencies detected._\n\n';
  } else {
    md += '| Severity | Cycle |\n|----------|-------|\n';
    for (const risk of circularRisks) {
      const icon = risk.severity === 'error' ? '🔴 ERROR' : '🟡 WARNING';
      md += `| ${icon} | ${risk.cycle.join(' → ')} |\n`;
    }
    md += '\n> **ERROR**: Cross-layer cycle — will cause runtime or bundler failures.\n';
    md += '> **WARNING**: Same-layer cycle — likely acceptable but review for tight coupling.\n\n';
  }

  // ── Unmapped Missing ──
  md += '## 🔍 Unmapped Missing Imports (Manual Investigation Required)\n\n';
  if (unmappedMissing.length === 0) {
    md += '_All missing imports have suggested replacements._\n\n';
  } else {
    md += 'These imports have no fuzzy match — the module may have been deleted, renamed significantly, or moved outside the project root.\n\n';
    md += '| File | Import | Kind | Hint |\n|------|--------|------|------|\n';
    for (const m of unmappedMissing) {
      md += `| _see report_ | \`${m.importPath}\` | ${m.kind} | ${m.rationale} |\n`;
    }
    md += '\n';
  }

  // ── Reverse Dependency Map (top 20 most-imported) ──
  const sortedDeps = Object.entries(reverseDependencies)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  md += '## 📦 Most-Imported Files (Top 20)\n\n';
  md += '> These are highest-impact files — path changes here have the widest cascading effect.\n\n';
  md += '| File | Imported By (count) | Dependents |\n|------|--------------------|-----------|\n';
  for (const [file, deps] of sortedDeps) {
    md += `| \`${file}\` | ${deps.length} | ${deps.slice(0, 5).map((d) => `\`${d}\``).join(', ')}${deps.length > 5 ? ` +${deps.length - 5} more` : ''} |\n`;
  }

  return md;
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const projectRoot = process.argv[2] ?? process.cwd();
  const auditor = new ImportAuditor(projectRoot);
  const result = await auditor.audit();

  const md = formatMarkdown(result);
  const mdPath = path.join(projectRoot, 'IMPORT_EXPORT_AUDIT.md');
  fs.writeFileSync(mdPath, md);

  const jsonPath = path.join(projectRoot, 'IMPORT_EXPORT_AUDIT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const { summary, circularRisks } = result;
  console.log('✅ Audit complete!\n');
  console.log(`📄 Markdown report : ${mdPath}`);
  console.log(`📊 JSON (raw data) : ${jsonPath}\n`);
  console.log('Summary:');
  console.log(`  Files     : ${summary.files}`);
  console.log(`  Imports   : ${summary.totalImports}`);
  console.log(`  Valid     : ${summary.valid}`);
  console.log(`  Stale     : ${summary.stale}`);
  console.log(`  Missing   : ${summary.missing}`);
  console.log(`  Adapters  : ${summary.adapters}`);
  console.log(`  Cycles    : ${circularRisks.length} (${circularRisks.filter((c) => c.severity === 'error').length} errors)`);
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});