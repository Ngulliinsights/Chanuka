/**
 * Focused bug detection for issues not covered by tsc/ESLint
 * 
 * This script complements standard tooling by focusing on:
 * 1. Security vulnerabilities (hardcoded secrets, dangerous patterns)
 * 2. Duplicate exports that cause build issues
 * 3. Test vs production code separation
 * 4. Project-level structural issues
 * 
 * What this does NOT do (handled by other tools):
 * - Type checking (use: tsc --noEmit)
 * - Import resolution (use: tsc --noEmit)
 * - Code quality/style (use: ESLint)
 * - Accessibility (use: eslint-plugin-jsx-a11y)
 * - Performance hints (use: eslint-plugin-react)
 * - Unused code (use: ts-prune or knip)
 */

import { readFileSync, existsSync } from "fs";
import { relative } from "path";
import { glob } from "glob";

export interface BugReport {
  id: string;
  type: "security-vulnerability" | "duplicate-export" | "structural-issue";
  severity: "critical" | "high" | "medium" | "low";
  location: {
    file: string;
    line?: number;
    context?: string;
  };
  description: string;
  impact: string;
  fixSuggestion: string;
  isTestFile: boolean;
}

export interface BugDetectionResult {
  totalBugs: number;
  productionBugs: BugReport[];
  testBugs: BugReport[];
  criticalCount: number;
  highCount: number;
  summary: {
    production: { critical: number; high: number; medium: number; low: number };
    test: { critical: number; high: number; medium: number; low: number };
  };
}

export class FocusedBugDetector {
  private projectRoot: string;
  private bugs: BugReport[] = [];
  private bugIdCounter = 1;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run focused bug detection on non-redundant issues
   */
  async detectBugs(): Promise<BugDetectionResult> {
    console.log("🔍 Running focused bug detection...\n");
    
    this.bugs = [];
    this.bugIdCounter = 1;

    // Focus on high-value, non-redundant checks
    await this.detectSecurityVulnerabilities();
    await this.detectDuplicateExports();
    await this.detectStructuralIssues();

    return this.generateReport();
  }

  /**
   * Sophisticated security scanning for real vulnerabilities
   * This goes beyond basic ESLint rules to catch context-specific issues
   */
  private async detectSecurityVulnerabilities(): Promise<void> {
    console.log("🔒 Scanning for security vulnerabilities...");
    
    const files = await this.getSourceFiles();

    for (const file of files) {
      const isTestFile = this.isTestFile(file);
      
      try {
        const content = readFileSync(file, "utf-8");
        
        // Check for dangerouslySetInnerHTML without sanitization
        if (content.includes("dangerouslySetInnerHTML")) {
          // Check if DOMPurify or similar sanitization is present
          const hasSanitization = 
            content.includes("DOMPurify") ||
            content.includes("sanitize") ||
            content.includes("xss");
          
          if (!hasSanitization) {
            this.addBug({
              type: "security-vulnerability",
              severity: "high",
              location: {
                file: relative(this.projectRoot, file),
                context: "dangerouslySetInnerHTML usage",
              },
              description: "Unsanitized HTML injection risk",
              impact: "Potential XSS vulnerability allowing script injection",
              fixSuggestion: "Use DOMPurify.sanitize() or avoid dangerouslySetInnerHTML",
              isTestFile,
            });
          }
        }

        // Detect hardcoded credentials with sophisticated filtering
        this.detectHardcodedSecrets(file, content, isTestFile);

        // Check for eval() usage (major security risk)
        if (content.includes("eval(") && !content.includes("// safe-eval")) {
          this.addBug({
            type: "security-vulnerability",
            severity: "critical",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Use of eval() detected",
            impact: "Code injection vulnerability, arbitrary code execution",
            fixSuggestion: "Remove eval() and use safer alternatives like JSON.parse() or Function constructor with validation",
            isTestFile,
          });
        }

        // Check for SQL injection risks (concatenated queries)
        const sqlInjectionPattern = /(?:query|execute|sql)\s*[=:]\s*[`"'].*?\$\{[^}]+\}.*?[`"']/gi;
        if (sqlInjectionPattern.test(content)) {
          this.addBug({
            type: "security-vulnerability",
            severity: "critical",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Potential SQL injection via string interpolation",
            impact: "Database compromise, data breach",
            fixSuggestion: "Use parameterized queries or prepared statements",
            isTestFile,
          });
        }

        // Check for insecure random number generation for security purposes
        if (content.includes("Math.random()") && 
            (content.includes("token") || content.includes("session") || content.includes("password"))) {
          this.addBug({
            type: "security-vulnerability",
            severity: "high",
            location: {
              file: relative(this.projectRoot, file),
            },
            description: "Math.random() used for security-sensitive random generation",
            impact: "Predictable tokens/sessions, potential account takeover",
            fixSuggestion: "Use crypto.randomBytes() or crypto.getRandomValues() for cryptographic randomness",
            isTestFile,
          });
        }

      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect hardcoded secrets with smart filtering
   * This uses sophisticated heuristics to avoid false positives
   */
  private detectHardcodedSecrets(file: string, content: string, isTestFile: boolean): void {
    // Skip certain file types that commonly have false positives
    if (file.includes("error-messages") || 
        file.includes("constants.ts") ||
        file.includes("i18n") ||
        file.includes("locales")) {
      return;
    }

    const lines = content.split("\n");
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip comments and import statements
      if (trimmedLine.startsWith("//") || 
          trimmedLine.startsWith("*") ||
          trimmedLine.startsWith("import ") ||
          trimmedLine.startsWith("export ")) {
        return;
      }

      // Pattern for actual hardcoded secrets (high confidence)
      const highConfidencePatterns = [
        // AWS keys
        /(?:AKIA|ASIA)[0-9A-Z]{16}/,
        // Private keys
        /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
        // GitHub tokens
        /gh[pousr]_[A-Za-z0-9_]{36,}/,
        // Slack tokens
        /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}/,
        // JWT tokens (actual encoded ones, not variables)
        /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
      ];

      // Check high-confidence patterns
      for (const pattern of highConfidencePatterns) {
        if (pattern.test(trimmedLine)) {
          // Double-check it's not in a test file with obvious test data
          if (isTestFile && /(?:test|mock|fake|example)/i.test(trimmedLine)) {
            continue;
          }

          this.addBug({
            type: "security-vulnerability",
            severity: "critical",
            location: {
              file: relative(this.projectRoot, file),
              line: index + 1,
              context: trimmedLine.substring(0, 50) + "...",
            },
            description: "Hardcoded credential or secret token detected",
            impact: "Credential exposure, potential security breach",
            fixSuggestion: "Move to environment variables (process.env) or secure vault",
            isTestFile,
          });
          break;
        }
      }

      // Medium-confidence pattern: long random strings assigned to sensitive variables
      const sensitiveVarPattern = /(?:secret|password|api_?key|token|auth|credential)\s*[=:]\s*['"]([a-zA-Z0-9_\-!@#$%^&*]{20,})['"](?!\s*(?:\|\||&&|\?))/i;
      const match = trimmedLine.match(sensitiveVarPattern);
      
      if (match) {
        const value = match[1].toLowerCase();
        
        // Skip obvious non-secrets
        const nonSecretIndicators = [
          "example", "test", "demo", "mock", "placeholder", "your-",
          "insert", "replace", "change", "update", "default",
          "xxxxxxxx", "--------", "********",
        ];
        
        const isLikelyNonSecret = nonSecretIndicators.some(indicator => 
          value.includes(indicator)
        );

        // Skip if it looks like an environment variable reference
        const hasEnvReference = 
          trimmedLine.includes("process.env") ||
          trimmedLine.includes("import.meta.env") ||
          trimmedLine.includes("||") ||
          trimmedLine.includes("??");

        if (!isLikelyNonSecret && !hasEnvReference) {
          this.addBug({
            type: "security-vulnerability",
            severity: isTestFile ? "low" : "high",
            location: {
              file: relative(this.projectRoot, file),
              line: index + 1,
              context: trimmedLine.substring(0, 50) + "...",
            },
            description: "Possible hardcoded secret in sensitive variable",
            impact: "Potential credential exposure if this is a real secret",
            fixSuggestion: "If this is a real secret, move to environment variables. If it's a default/placeholder, add a comment to clarify.",
            isTestFile,
          });
        }
      }
    });
  }

  /**
   * Detect duplicate exports that cause build failures
   * TypeScript sometimes doesn't catch these in all scenarios
   */
  private async detectDuplicateExports(): Promise<void> {
    console.log("📦 Checking for duplicate exports...");
    
    const files = await this.getSourceFiles();

    for (const file of files) {
      const isTestFile = this.isTestFile(file);
      
      try {
        const content = readFileSync(file, "utf-8");
        const exportMap = new Map<string, number[]>();

        // Match various export patterns
        const exportPatterns = [
          /export\s+(?:async\s+)?function\s+(\w+)/g,
          /export\s+(?:const|let|var)\s+(\w+)/g,
          /export\s+class\s+(\w+)/g,
          /export\s+interface\s+(\w+)/g,
          /export\s+type\s+(\w+)/g,
          /export\s+enum\s+(\w+)/g,
        ];

        const lines = content.split("\n");
        
        exportPatterns.forEach(pattern => {
          let match: RegExpExecArray | null;
          const patternCopy = new RegExp(pattern.source, pattern.flags);
          
          while ((match = patternCopy.exec(content)) !== null) {
            const name = match[1];
            const lineNum = content.substring(0, match.index).split("\n").length;
            
            if (!exportMap.has(name)) {
              exportMap.set(name, []);
            }
            exportMap.get(name)!.push(lineNum);
          }
        });

        // Find actual duplicates
        exportMap.forEach((lines, name) => {
          if (lines.length > 1) {
            this.addBug({
              type: "duplicate-export",
              severity: "critical",
              location: {
                file: relative(this.projectRoot, file),
                line: lines[1], // Report the second occurrence
                context: `export ${name}`,
              },
              description: `Duplicate export: "${name}" (exported ${lines.length} times at lines: ${lines.join(", ")})`,
              impact: "Build failure, module resolution errors, runtime crashes",
              fixSuggestion: `Remove or rename duplicate export "${name}". Keep only one export with this name.`,
              isTestFile,
            });
          }
        });

      } catch (error) {
        console.warn(`⚠️  Failed to analyze ${file}:`, error);
      }
    }
  }

  /**
   * Detect structural issues in project organization
   */
  private async detectStructuralIssues(): Promise<void> {
    console.log("🏗️  Checking project structure...");
    
    // Check for test files in production directories
    const srcFiles = await glob("src/**/*.{ts,tsx}", {
      cwd: this.projectRoot,
      ignore: ["**/node_modules/**", "**/dist/**"],
      absolute: true,
    });

    for (const file of srcFiles) {
      // Skip actual test directories
      if (file.includes("/__tests__/") || 
          file.includes("/test/") || 
          file.includes("/tests/")) {
        continue;
      }

      // Check if it's a test file by name in a non-test directory
      if (file.match(/\.(test|spec)\.(ts|tsx)$/)) {
        this.addBug({
          type: "structural-issue",
          severity: "medium",
          location: {
            file: relative(this.projectRoot, file),
          },
          description: "Test file in production source directory",
          impact: "Test code included in production bundle, increased bundle size",
          fixSuggestion: "Move test files to __tests__ directory or colocate in a dedicated test folder",
          isTestFile: true,
        });
      }
    }

    // Check for misplaced configuration files
    const configFiles = await glob("**/*.config.{ts,js}", {
      cwd: this.projectRoot,
      ignore: ["**/node_modules/**", "**/dist/**"],
      absolute: true,
    });

    for (const file of configFiles) {
      if (file.includes("/src/") && !file.includes("/config/")) {
        this.addBug({
          type: "structural-issue",
          severity: "low",
          location: {
            file: relative(this.projectRoot, file),
          },
          description: "Configuration file in source directory",
          impact: "Poor project organization, config files should be at project root",
          fixSuggestion: "Move configuration files to project root or dedicated config directory",
          isTestFile: false,
        });
      }
    }
  }

  /**
   * Get source files for analysis
   */
  private async getSourceFiles(): Promise<string[]> {
    const patterns = ["**/*.{ts,tsx,js,jsx}"];
    const files = await glob(patterns, {
      cwd: this.projectRoot,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/coverage/**",
        "**/*.d.ts",
      ],
      absolute: true,
    });

    return files;
  }

  /**
   * Determine if a file is a test file
   */
  private isTestFile(filePath: string): boolean {
    const testIndicators = [
      "/__tests__/",
      "/test/",
      "/tests/",
      ".test.",
      ".spec.",
      "/e2e/",
      "/cypress/",
      "/playwright/",
      "vitest.config",
      "jest.config",
      "test-setup",
      "test-utils",
      "/mocks/",
      "/fixtures/",
      "__mocks__",
    ];
    
    const normalized = filePath.toLowerCase().replace(/\\/g, "/");
    return testIndicators.some(indicator => normalized.includes(indicator));
  }

  /**
   * Add a bug to the collection
   */
  private addBug(bug: Omit<BugReport, "id">): void {
    this.bugs.push({
      id: `BUG-${String(this.bugIdCounter++).padStart(3, "0")}`,
      ...bug,
    });
  }

  /**
   * Generate structured report
   */
  private generateReport(): BugDetectionResult {
    const productionBugs = this.bugs.filter(b => !b.isTestFile);
    const testBugs = this.bugs.filter(b => b.isTestFile);

    const countBySeverity = (bugs: BugReport[]) => ({
      critical: bugs.filter(b => b.severity === "critical").length,
      high: bugs.filter(b => b.severity === "high").length,
      medium: bugs.filter(b => b.severity === "medium").length,
      low: bugs.filter(b => b.severity === "low").length,
    });

    return {
      totalBugs: this.bugs.length,
      productionBugs,
      testBugs,
      criticalCount: this.bugs.filter(b => b.severity === "critical").length,
      highCount: this.bugs.filter(b => b.severity === "high").length,
      summary: {
        production: countBySeverity(productionBugs),
        test: countBySeverity(testBugs),
      },
    };
  }

  /**
   * Generate actionable markdown report
   */
  generateMarkdownReport(result: BugDetectionResult): string {
    const now = new Date().toISOString();
    let report = `# Bug Detection Report\n\n`;
    report += `**Generated:** ${now}\n`;
    report += `**Focus:** Security, Duplicates, Structure (complementing tsc/ESLint)\n\n`;

    // Executive summary
    report += `## Executive Summary\n\n`;
    report += `This report focuses on issues NOT covered by TypeScript or ESLint:\n\n`;
    report += `- 🔒 **Security vulnerabilities** (hardcoded secrets, injection risks)\n`;
    report += `- 📦 **Duplicate exports** (build-breaking issues)\n`;
    report += `- 🏗️ **Structural problems** (misplaced files)\n\n`;

    // Production vs Test breakdown
    report += `### Production Code\n\n`;
    report += `- Critical: ${result.summary.production.critical}\n`;
    report += `- High: ${result.summary.production.high}\n`;
    report += `- Medium: ${result.summary.production.medium}\n`;
    report += `- Low: ${result.summary.production.low}\n\n`;

    report += `### Test Code\n\n`;
    report += `- Critical: ${result.summary.test.critical}\n`;
    report += `- High: ${result.summary.test.high}\n`;
    report += `- Medium: ${result.summary.test.medium}\n`;
    report += `- Low: ${result.summary.test.low}\n\n`;

    // Priority: Critical production bugs first
    const criticalProduction = result.productionBugs.filter(b => b.severity === "critical");
    if (criticalProduction.length > 0) {
      report += `## ⚠️ CRITICAL Production Issues\n\n`;
      report += `These must be fixed immediately:\n\n`;
      
      criticalProduction.forEach(bug => {
        report += `### ${bug.id}: ${bug.description}\n\n`;
        report += `- **File:** \`${bug.location.file}\`\n`;
        if (bug.location.line) report += `- **Line:** ${bug.location.line}\n`;
        report += `- **Impact:** ${bug.impact}\n`;
        report += `- **Fix:** ${bug.fixSuggestion}\n\n`;
      });
    }

    // High priority production bugs
    const highProduction = result.productionBugs.filter(b => b.severity === "high");
    if (highProduction.length > 0) {
      report += `## 🔴 High Priority Production Issues\n\n`;
      
      highProduction.forEach(bug => {
        report += `### ${bug.id}: ${bug.description}\n\n`;
        report += `- **File:** \`${bug.location.file}\`\n`;
        if (bug.location.line) report += `- **Line:** ${bug.location.line}\n`;
        report += `- **Impact:** ${bug.impact}\n`;
        report += `- **Fix:** ${bug.fixSuggestion}\n\n`;
      });
    }

    // All other bugs
    const otherBugs = this.bugs.filter(b => 
      b.severity !== "critical" && b.severity !== "high"
    );
    
    if (otherBugs.length > 0) {
      report += `## 📋 Other Issues\n\n`;
      
      otherBugs.forEach(bug => {
        const icon = bug.isTestFile ? "🧪" : "📄";
        report += `### ${icon} ${bug.id}: ${bug.description}\n\n`;
        report += `- **Severity:** ${bug.severity}\n`;
        report += `- **File:** \`${bug.location.file}\`\n`;
        if (bug.location.line) report += `- **Line:** ${bug.location.line}\n`;
        report += `- **Fix:** ${bug.fixSuggestion}\n\n`;
      });
    }

    // Recommendations
    report += `## 💡 Recommendations\n\n`;
    report += `Run these complementary tools for complete coverage:\n\n`;
    report += `- \`npx tsc --noEmit\` - Type checking and import resolution\n`;
    report += `- \`npx eslint .\` - Code quality and style\n`;
    report += `- \`npx knip\` - Unused code detection\n`;
    report += `- This script - Security, duplicates, structure\n\n`;

    if (result.totalBugs === 0) {
      report += `✅ No issues found in areas covered by this tool!\n`;
    }

    return report;
  }
}

// Export convenience functions
export async function runBugDetection(projectRoot?: string): Promise<BugDetectionResult> {
  const detector = new FocusedBugDetector(projectRoot);
  const result = await detector.detectBugs();
  
  console.log("\n" + detector.generateMarkdownReport(result));
  
  return result;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  runBugDetection().then(result => {
    process.exit(result.criticalCount > 0 ? 1 : 0);
  });
}
