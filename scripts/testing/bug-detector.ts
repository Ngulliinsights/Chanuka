/**
 * Comprehensive bug detection and analysis system
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { glob } from "glob";

export interface BugReport {
  id: string;
  type: BugType;
  severity: "critical" | "high" | "medium" | "low";
  category: BugCategory;
  location: CodeLocation;
  description: string;
  impact: string;
  reproducible: boolean;
  fixSuggestion?: string;
  relatedFiles?: string[];
}

export interface CodeLocation {
  file: string;
  line?: number;
  column?: number;
  function?: string;
  context?: string;
}

export type BugType =
  | "import-error"
  | "missing-file"
  | "type-error"
  | "runtime-error"
  | "test-configuration"
  | "database-error"
  | "api-error"
  | "performance-issue"
  | "security-vulnerability"
  | "accessibility-issue"
  | "duplicate-code"
  | "unused-code"
  | "deprecated-api";

export type BugCategory =
  | "infrastructure"
  | "frontend"
  | "backend"
  | "database"
  | "testing"
  | "build"
  | "security"
  | "performance"
  | "accessibility";

export interface BugDetectionResult {
  totalBugs: number;
  criticalBugs: number;
  highPriorityBugs: number;
  bugs: BugReport[];
  summary: BugSummary;
  // Separate test vs production bugs
  productionBugs: BugReport[];
  testBugs: BugReport[];
  productionSummary: BugSummary;
  testSummary: BugSummary;
}

export interface BugSummary {
  byType: Record<BugType, number>;
  byCategory: Record<BugCategory, number>;
  bySeverity: Record<string, number>;
  topIssues: BugReport[];
}

export class BugDetector {
  private projectRoot: string;
  private bugs: BugReport[] = [];
  private bugIdCounter = 1;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run comprehensive bug detection
   */
  async detectBugs(): Promise<BugDetectionResult> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Starting comprehensive bug detection...', { component: 'Chanuka' });

    this.bugs = [];
    this.bugIdCounter = 1;

    // Run different types of bug detection
    await this.detectImportIssues();
    await this.detectMissingFiles();
    await this.detectTypeScriptIssues();
    await this.detectTestConfigurationIssues();
    await this.detectDatabaseIssues();
    await this.detectDuplicateExports();
    await this.detectUnusedCode();
    await this.detectSecurityIssues();
    await this.detectPerformanceIssues();
    await this.detectAccessibilityIssues();

    return this.generateReport();
  }

  /**
   * Detect import and module resolution issues
   */
  private async detectImportIssues(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting import issues...', { component: 'Chanuka' });

    const files = await this.getSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");
        const lines = content.split("\n");

        lines.forEach((line, index) => {
          const importMatch = line.match(
            /import\s+.*\s+from\s+['"]([^'"]+)['"]/
          );
          if (importMatch) {
            const importPath = importMatch[1];
            const resolvedPath = this.resolveImportPath(file, importPath);

            // Skip built-in modules and only report actual import errors
            if (
              !resolvedPath ||
              (resolvedPath !== "builtin" && !existsSync(resolvedPath))
            ) {
              this.addBug({
                type: "import-error",
                severity: "high",
                category: "build",
                location: {
                  file: relative(this.projectRoot, file),
                  line: index + 1,
                  context: line.trim(),
                },
                description: `Failed to resolve import: ${importPath}`,
                impact: "Build failure, runtime errors",
                reproducible: true,
                fixSuggestion: `Check if the file exists at ${importPath} or update the import path`,
              });
            }
          }
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect missing files referenced in code
   */
  private async detectMissingFiles(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting missing files...', { component: 'Chanuka' });

    const files = await this.getSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");

        // Check for file references in strings
        const fileReferences = content.match(
          /['"]([^'"]*\.(ts|tsx|js|jsx|json|md))['"]/g
        );

        if (fileReferences) {
          fileReferences.forEach((ref) => {
            const filePath = ref.slice(1, -1); // Remove quotes
            const resolvedPath = this.resolveImportPath(file, filePath);

            if (resolvedPath && !existsSync(resolvedPath)) {
              this.addBug({
                type: "missing-file",
                severity: "medium",
                category: "infrastructure",
                location: {
                  file: relative(this.projectRoot, file),
                  context: ref,
                },
                description: `Referenced file does not exist: ${filePath}`,
                impact: "Potential runtime errors, broken functionality",
                reproducible: true,
                fixSuggestion: `Create the missing file or update the reference`,
              });
            }
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect TypeScript compilation issues
   */
  private async detectTypeScriptIssues(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting TypeScript issues...', { component: 'Chanuka' });

    const files = await this.getSourceFiles(["**/*.ts", "**/*.tsx"]);

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");
        const lines = content.split("\n");

        lines.forEach((line, index) => {
          // Check for common TypeScript issues
          if (line.includes("any") && !line.includes("// @ts-ignore")) {
            this.addBug({
              type: "type-error",
              severity: "low",
              category: "frontend",
              location: {
                file: relative(this.projectRoot, file),
                line: index + 1,
                context: line.trim(),
              },
              description: 'Usage of "any" type reduces type safety',
              impact: "Reduced type safety, potential runtime errors",
              reproducible: true,
              fixSuggestion: 'Replace "any" with specific types',
            });
          }

          // Check for @ts-ignore usage
          if (line.includes("@ts-ignore")) {
            this.addBug({
              type: "type-error",
              severity: "medium",
              category: "frontend",
              location: {
                file: relative(this.projectRoot, file),
                line: index + 1,
                context: line.trim(),
              },
              description: "TypeScript error suppressed with @ts-ignore",
              impact: "Hidden type errors, potential runtime issues",
              reproducible: true,
              fixSuggestion:
                "Fix the underlying TypeScript error instead of suppressing it",
            });
          }
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect test configuration issues
   */
  private async detectTestConfigurationIssues(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting test configuration issues...', { component: 'Chanuka' });

    const testFiles = await this.getSourceFiles([
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
    ]);

    for (const file of testFiles) {
      try {
        const content = readFileSync(file, "utf-8");

        // Check for Playwright tests in unit test files
        if (content.includes("test.describe") && !file.includes("e2e")) {
          this.addBug({
            type: "test-configuration",
            severity: "high",
            category: "testing",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Playwright test syntax in unit test file",
            impact: "Test execution failures, incorrect test environment",
            reproducible: true,
            fixSuggestion:
              "Move Playwright tests to e2e directory or use Vitest syntax",
          });
        }

        // Check for missing test setup
        if (
          content.includes("describe") &&
          !content.includes("beforeEach") &&
          !content.includes("afterEach")
        ) {
          this.addBug({
            type: "test-configuration",
            severity: "low",
            category: "testing",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Test file missing setup/teardown hooks",
            impact: "Potential test isolation issues",
            reproducible: true,
            fixSuggestion:
              "Add beforeEach/afterEach hooks for proper test isolation",
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect database-related issues
   */
  private async detectDatabaseIssues(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting database issues...', { component: 'Chanuka' });

    const files = await this.getSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");

        // Check for duplicate exports
        const exportMatches = content.match(
          /export\s+(function|const|let|var)\s+(\w+)/g
        );
        if (exportMatches) {
          const exportNames = exportMatches
            .map((match) => {
              const nameMatch = match.match(
                /export\s+(?:function|const|let|var)\s+(\w+)/
              );
              return nameMatch ? nameMatch[1] : null;
            })
            .filter(Boolean);

          const duplicates = exportNames.filter(
            (name, index) => exportNames.indexOf(name) !== index
          );

          duplicates.forEach((duplicate) => {
            this.addBug({
              type: "database-error",
              severity: "critical",
              category: "backend",
              location: {
                file: relative(this.projectRoot, file),
              },
              description: `Duplicate export: ${duplicate}`,
              impact: "Build failure, module resolution errors",
              reproducible: true,
              fixSuggestion: `Remove duplicate export or rename one of the ${duplicate} exports`,
            });
          });
        }

        // Check for database connection issues
        if (
          content.includes("getDatabase") &&
          content.includes("initializeDatabase")
        ) {
          const lines = content.split("\n");
          let hasInitCheck = false;

          lines.forEach((line) => {
            if (line.includes("getDatabase") && line.includes("if (!db)")) {
              hasInitCheck = true;
            }
          });

          if (!hasInitCheck) {
            this.addBug({
              type: "database-error",
              severity: "high",
              category: "backend",
              location: {
                file: relative(this.projectRoot, file),
              },
              description: "Database access without initialization check",
              impact: "Runtime errors, database connection failures",
              reproducible: true,
              fixSuggestion:
                "Add database initialization check before accessing database",
            });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect duplicate exports
   */
  private async detectDuplicateExports(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting duplicate exports...', { component: 'Chanuka' });

    const files = await this.getSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");
        const exportRegex =
          /export\s+(?:function|const|let|var|class|interface|type)\s+(\w+)/g;
        const exports: { name: string; line: number }[] = [];

        let match: RegExpExecArray | null;

        while ((match = exportRegex.exec(content)) !== null) {
          const name = match[1];
          const lineIndex =
            content.substring(0, match.index).split("\n").length - 1;
          exports.push({ name, line: lineIndex + 1 });
        }

        // Find duplicates
        const duplicates = exports.filter(
          (exp, index) =>
            exports.findIndex((e) => e.name === exp.name) !== index
        );

        duplicates.forEach((duplicate) => {
          this.addBug({
            type: "duplicate-code",
            severity: "critical",
            category: "build",
            location: {
              file: relative(this.projectRoot, file),
              line: duplicate.line,
            },
            description: `Duplicate export: ${duplicate.name}`,
            impact: "Build failure, module resolution errors",
            reproducible: true,
            fixSuggestion: `Remove or rename duplicate export: ${duplicate.name}`,
          });
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect unused code
   */
  private async detectUnusedCode(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting unused code...', { component: 'Chanuka' });

    // This is a simplified unused code detection
    // In a real implementation, you'd use AST parsing for more accuracy
    const files = await this.getSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");

        // Check for unused imports
        const importRegex = /import\s+\{([^}]+)\}\s+from/g;
        let match: RegExpExecArray | null;

        while ((match = importRegex.exec(content)) !== null) {
          const imports = match[1].split(",").map((imp) => imp.trim());
          const matchContext = match[0]; // Capture the match context before forEach

          imports.forEach((importName) => {
            const cleanName = importName.replace(/\s+as\s+\w+/, "").trim();
            const usageRegex = new RegExp(`\\b${cleanName}\\b`, "g");
            const usages = (content.match(usageRegex) || []).length;

            // If only used once (in the import), it's unused
            if (usages <= 1) {
              this.addBug({
                type: "unused-code",
                severity: "low",
                category: "frontend",
                location: {
                  file: relative(this.projectRoot, file),
                  context: matchContext,
                },
                description: `Unused import: ${cleanName}`,
                impact: "Increased bundle size, code clutter",
                reproducible: true,
                fixSuggestion: `Remove unused import: ${cleanName}`,
              });
            }
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect security issues
   */
  private async detectSecurityIssues(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting security issues...', { component: 'Chanuka' });

    const files = await this.getSourceFiles();

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");

        // Check for potential XSS vulnerabilities
        if (content.includes("dangerouslySetInnerHTML")) {
          this.addBug({
            type: "security-vulnerability",
            severity: "high",
            category: "security",
            location: {
              file: relative(this.projectRoot, file),
            },
            description:
              "Potential XSS vulnerability with dangerouslySetInnerHTML",
            impact: "Cross-site scripting attacks",
            reproducible: true,
            fixSuggestion: "Sanitize HTML content or use safer alternatives",
          });
        }

        // Check for hardcoded secrets (but be smarter about test files and constants)
        const isTestFile =
          file.includes("test") ||
          file.includes("spec") ||
          file.includes("__tests__");
        
        const isErrorMessagesFile = file.includes("error-messages");
        const isConstantsFile = file.includes("constants") || file.includes("config");

        // Very precise patterns that only catch actual secrets
        const secretPatterns = [
          // Only catch actual hardcoded passwords with suspicious patterns
          /(?:password|secret)\s*[:=]\s*['"](?!.*(?:required|invalid|expired|missing|failed|reset|weak|short|long|must|contain|least|characters|letter|number|uppercase|lowercase|violation|not found|error|message|description|title|search|location|type|query|overview|process|risks|legal|technical|logout|profile|refresh|update|health|check|test|lockout|history|notifications|show|hide|confirm|strength|feedback|animate|pulse|datakey|verifications|storage|config|default))[a-zA-Z0-9_!@#$%^&*]{16,}['"]/i,
          // Only catch actual API keys with very suspicious patterns
          /api[_-]?key\s*[:=]\s*['"](?!test|demo|mock|example)[a-zA-Z0-9_-]{32,}['"]/i,
          // Only catch actual JWT secrets
          /jwt[_-]?secret\s*[:=]\s*['"](?!test|demo|mock|example)[a-zA-Z0-9_-]{40,}['"]/i,
          // Only catch actual database credentials
          /(?:db|database)[_-]?password\s*[:=]\s*['"](?!test|mock|demo|example|generated|default)[a-zA-Z0-9_!@#$%^&*]{12,}['"]/i,
          // Actual hardcoded credentials with very specific patterns
          /(?:client_secret|private_key|access_token|bearer_token)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/i,
        ];

        secretPatterns.forEach((pattern) => {
          const matches = content.match(pattern);
          if (matches) {
            const secretValue = matches[0].toLowerCase();
            
            // Skip error message files and constants files
            if (isErrorMessagesFile || isConstantsFile) {
              return;
            }

            // Skip if it's a test file and the secret looks like a test value
            if (isTestFile) {
              const testIndicators = [
                "test",
                "mock",
                "fake",
                "dummy",
                "example",
                "demo",
                "sample",
                "placeholder",
                "default",
              ];
              const isTestSecret = testIndicators.some((indicator) =>
                secretValue.includes(indicator)
              );

              // Also skip common test passwords
              const commonTestPasswords = [
                "password123",
                "testpassword",
                "newpassword123",
                "differentpassword123",
                "securepassword123",
              ];
              const isCommonTestPassword = commonTestPasswords.some((pwd) =>
                secretValue.includes(pwd)
              );

              if (isTestSecret || isCommonTestPassword) {
                return; // Skip this match
              }
            }

            // Skip environment variable fallbacks
            if (secretValue.includes("process.env") || secretValue.includes("||")) {
              return;
            }

            this.addBug({
              type: "security-vulnerability",
              severity: "critical",
              category: "security",
              location: {
                file: relative(this.projectRoot, file),
              },
              description: "Hardcoded secret or credential detected",
              impact: "Security breach, credential exposure",
              reproducible: true,
              fixSuggestion: "Move secrets to environment variables",
            });
          }
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect performance issues
   */
  private async detectPerformanceIssues(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting performance issues...', { component: 'Chanuka' });

    const files = await this.getSourceFiles(["**/*.tsx", "**/*.jsx"]);

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");

        // Check for missing React.memo on components
        if (
          content.includes("export default function") &&
          !content.includes("React.memo")
        ) {
          this.addBug({
            type: "performance-issue",
            severity: "low",
            category: "frontend",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Component not wrapped with React.memo",
            impact: "Unnecessary re-renders, performance degradation",
            reproducible: true,
            fixSuggestion:
              "Consider wrapping component with React.memo if it receives props",
          });
        }

        // Check for inline object/array creation in JSX
        const inlineObjectRegex = /\{\s*\{[^}]+\}\s*\}/g;
        if (inlineObjectRegex.test(content)) {
          this.addBug({
            type: "performance-issue",
            severity: "medium",
            category: "frontend",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Inline object creation in JSX",
            impact: "Unnecessary re-renders, performance issues",
            reproducible: true,
            fixSuggestion: "Move object creation outside render or use useMemo",
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect accessibility issues
   */
  private async detectAccessibilityIssues(): Promise<void> {
    // eslint-disable-next-line no-console
    logger.info('🔍 Detecting accessibility issues...', { component: 'Chanuka' });

    const files = await this.getSourceFiles(["**/*.tsx", "**/*.jsx"]);

    for (const file of files) {
      try {
        const content = readFileSync(file, "utf-8");

        // Check for missing alt attributes on images
        if (content.includes("<img") && !content.includes("alt=")) {
          this.addBug({
            type: "accessibility-issue",
            severity: "medium",
            category: "frontend",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Image missing alt attribute",
            impact: "Poor accessibility for screen readers",
            reproducible: true,
            fixSuggestion: "Add alt attribute to all img elements",
          });
        }

        // Check for missing labels on form inputs
        if (
          content.includes("<input") &&
          !content.includes("aria-label") &&
          !content.includes("<label")
        ) {
          this.addBug({
            type: "accessibility-issue",
            severity: "medium",
            category: "frontend",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Form input missing label or aria-label",
            impact: "Poor accessibility for screen readers",
            reproducible: true,
            fixSuggestion: "Add label or aria-label to form inputs",
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Get source files matching patterns
   */
  private async getSourceFiles(
    patterns: string[] = ["**/*.{ts,tsx,js,jsx}"]
  ): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: this.projectRoot,
          ignore: [
            "**/node_modules/**",
            "**/dist/**",
            "**/coverage/**",
            "**/*.d.ts",
          ],
          absolute: true,
        });
        allFiles.push(...files);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to glob pattern ${pattern}:`, error);
      }
    }

    return Array.from(new Set(allFiles));
  }

  /**
   * Resolve import path to absolute path
   */
  private resolveImportPath(
    fromFile: string,
    importPath: string
  ): string | null {
    try {
      // Check if it's a Node.js built-in module
      if (this.isNodeBuiltinModule(importPath)) {
        return "builtin"; // Return a special marker for built-in modules
      }

      if (importPath.startsWith(".")) {
        // Relative import
        const resolved = join(dirname(fromFile), importPath);

        // Try different extensions
        const extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
        for (const ext of extensions) {
          if (existsSync(resolved + ext)) {
            return resolved + ext;
          }
        }

        // Try index files
        for (const ext of extensions) {
          const indexPath = join(resolved, "index" + ext);
          if (existsSync(indexPath)) {
            return indexPath;
          }
        }

        return existsSync(resolved) ? resolved : null;
      } else if (importPath.startsWith("@/")) {
        // Alias import
        const aliasPath = importPath.replace("@/", "src/");
        return this.resolveImportPath(
          fromFile,
          "./" + relative(dirname(fromFile), join(this.projectRoot, aliasPath))
        );
      } else {
        // Node modules import
        const nodeModulesPath = join(
          this.projectRoot,
          "node_modules",
          importPath
import { logger } from '../../shared/core/src/observability/logging';
        );
        return existsSync(nodeModulesPath) ? nodeModulesPath : null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if import path is a Node.js built-in module
   */
  private isNodeBuiltinModule(importPath: string): boolean {
    const builtinModules = [
      "assert",
      "async_hooks",
      "buffer",
      "child_process",
      "cluster",
      "console",
      "constants",
      "crypto",
      "dgram",
      "dns",
      "domain",
      "events",
      "fs",
      "http",
      "http2",
      "https",
      "inspector",
      "module",
      "net",
      "os",
      "path",
      "perf_hooks",
      "process",
      "punycode",
      "querystring",
      "readline",
      "repl",
      "stream",
      "string_decoder",
      "sys",
      "timers",
      "tls",
      "trace_events",
      "tty",
      "url",
      "util",
      "v8",
      "vm",
      "wasi",
      "worker_threads",
      "zlib",
      // Node.js built-in modules with subpaths
      "fs/promises",
      "stream/promises",
      "timers/promises",
      "util/types",
      "worker_threads",
    ];

    // Check exact match or if it starts with a built-in module followed by /
    return (
      builtinModules.includes(importPath) ||
      builtinModules.some((module) => importPath.startsWith(module + "/"))
    );
  }

  /**
   * Check if a file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const testIndicators = [
      '/test/',
      '/tests/',
      '/__tests__/',
      '.test.',
      '.spec.',
      '/spec/',
      '/e2e/',
      '/cypress/',
      '/playwright/',
      'vitest.config',
      'jest.config',
      'test-setup',
      'test-utils',
      'mock',
      '/fixtures/',
      '/stubs/',
    ];
    
    const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
    return testIndicators.some(indicator => normalizedPath.includes(indicator));
  }

  /**
   * Add a bug to the collection
   */
  private addBug(bug: Omit<BugReport, "id">): void {
    this.bugs.push({
      id: `BUG-${this.bugIdCounter++}`,
      ...bug,
    });
  }

  /**
   * Generate summary for a set of bugs
   */
  private generateSummary(bugs: BugReport[]): BugSummary {
    const summary: BugSummary = {
      byType: {} as Record<BugType, number>,
      byCategory: {} as Record<BugCategory, number>,
      bySeverity: {},
      topIssues: [],
    };

    // Count by type
    bugs.forEach((bug) => {
      summary.byType[bug.type] = (summary.byType[bug.type] || 0) + 1;
      summary.byCategory[bug.category] =
        (summary.byCategory[bug.category] || 0) + 1;
      summary.bySeverity[bug.severity] =
        (summary.bySeverity[bug.severity] || 0) + 1;
    });

    // Get top issues (critical and high severity)
    summary.topIssues = bugs
      .filter((bug) => bug.severity === "critical" || bug.severity === "high")
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 10);

    return summary;
  }

  /**
   * Generate comprehensive bug report with test/production separation
   */
  private generateReport(): BugDetectionResult {
    // Separate bugs into test and production
    const productionBugs = this.bugs.filter(bug => !this.isTestFile(bug.location.file));
    const testBugs = this.bugs.filter(bug => this.isTestFile(bug.location.file));

    // Generate summaries
    const summary = this.generateSummary(this.bugs);
    const productionSummary = this.generateSummary(productionBugs);
    const testSummary = this.generateSummary(testBugs);

    return {
      totalBugs: this.bugs.length,
      criticalBugs: this.bugs.filter((b) => b.severity === "critical").length,
      highPriorityBugs: this.bugs.filter((b) => b.severity === "high").length,
      bugs: this.bugs,
      summary,
      productionBugs,
      testBugs,
      productionSummary,
      testSummary,
    };
  }

  /**
   * Generate bug report as markdown
   */
  generateMarkdownReport(result: BugDetectionResult): string {
    let report = `# Bug Detection Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Bugs:** ${result.totalBugs}\n`;
    report += `- **Critical:** ${result.criticalBugs}\n`;
    report += `- **High Priority:** ${result.highPriorityBugs}\n`;
    report += `- **Medium Priority:** ${result.summary.bySeverity.medium || 0}\n`;
    report += `- **Low Priority:** ${result.summary.bySeverity.low || 0}\n\n`;

    report += `## Top Issues\n\n`;
    result.summary.topIssues.forEach((bug, index) => {
      report += `### ${index + 1}. ${bug.description}\n\n`;
      report += `- **ID:** ${bug.id}\n`;
      report += `- **Severity:** ${bug.severity}\n`;
      report += `- **Category:** ${bug.category}\n`;
      report += `- **File:** ${bug.location.file}\n`;
      if (bug.location.line) {
        report += `- **Line:** ${bug.location.line}\n`;
      }
      report += `- **Impact:** ${bug.impact}\n`;
      if (bug.fixSuggestion) {
        report += `- **Fix:** ${bug.fixSuggestion}\n`;
      }
      report += `\n`;
    });

    report += `## Bugs by Category\n\n`;
    Object.entries(result.summary.byCategory).forEach(([category, count]) => {
      report += `- **${category}:** ${count}\n`;
    });

    report += `\n## Bugs by Type\n\n`;
    Object.entries(result.summary.byType).forEach(([type, count]) => {
      report += `- **${type}:** ${count}\n`;
    });

    return report;
  }
}

// Export default instance
export const bugDetector = new BugDetector();












































