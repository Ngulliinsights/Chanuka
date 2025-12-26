#!/usr/bin/env tsx

import { logger   } from '@shared/core';
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

// ✅ FIXED INTERFACES - Added missing properties
interface APICall {
  readonly id: string;
  readonly type:
    | "fetch"
    | "axios"
    | "useQuery"
    | "useMutation"
    | "useSafeQuery"
    | "custom";
  readonly location: {
    readonly file: string;
    readonly line: number;
    readonly column: number;
    readonly function?: string;
    readonly component?: string;
    readonly context: string;
  };
  readonly endpoint?: string;
  readonly method?: string;
  readonly dependencies: readonly string[];
  readonly triggers: readonly string[];
  readonly caching: {
    readonly hasCache: boolean;
    readonly cacheKey?: string;
    readonly staleTime?: number;
    readonly gcTime?: number;
    readonly strategy?: "swr" | "cache-first" | "network-first";
  };
  readonly raceConditionRisk: RiskLevel;
  readonly infiniteLoopRisk: RiskLevel;
  readonly issues: readonly DetectedIssue[];
  readonly suggestions: readonly Suggestion[];
  readonly confidence: number;
  readonly lastModified: Date;
  readonly metadata?: {
    readonly patternMatched?: string;
    readonly contextualFactors?: Record<string, any>;
    readonly complexity?: "low" | "medium" | "high";
    readonly testability?: "low" | "medium" | "high";
    readonly maintainability?: "low" | "medium" | "high";
  };
}

interface DetectedIssue {
  readonly type:
    | "race-condition"
    | "infinite-loop"
    | "performance"
    | "security";
  readonly severity: RiskLevel;
  readonly description: string;
  readonly confidence: number;
  readonly pattern: string;
  readonly codeSnippet: string;
}

interface Suggestion {
  readonly priority: "immediate" | "high" | "medium" | "low";
  readonly action: string;
  readonly impact: string;
  readonly codeExample?: string;
  readonly estimatedEffort: "low" | "medium" | "high";
}

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface PatternRule {
  readonly pattern: RegExp;
  readonly description: string;
  readonly severity: RiskLevel;
  readonly fix: string;
  readonly confidence: number;
  readonly category:
    | "race-condition"
    | "infinite-loop"
    | "performance"
    | "security"
    | "caching";
  readonly contextRequirement?: RegExp;
}

interface AnalysisConfig {
  readonly includePatterns: readonly string[];
  readonly excludePatterns: readonly string[];
  readonly customRules: readonly PatternRule[];
  readonly confidenceThreshold: number;
  readonly enableIncrementalAnalysis: boolean;
  readonly maxFileSize: number;
}

interface FileAnalysisResult {
  readonly filePath: string;
  readonly apiCalls: readonly APICall[];
  readonly analysisTime: number;
  readonly fileHash: string;
  readonly error?: string;
}

interface AnalysisReport {
  readonly summary: {
    readonly totalAPICalls: number;
    readonly criticalRisk: number;
    readonly highRisk: number;
    readonly mediumRisk: number;
    readonly lowRisk: number;
    readonly risk_score: number;
    readonly averageConfidence: number;
    readonly analysisTime: number;
  };
  readonly criticalIssues: readonly (DetectedIssue & { location: string })[];
  readonly apiCallsByType: Record<string, number>;
  readonly raceConditionHotspots: readonly APICall[];
  readonly infiniteLoopRisks: readonly APICall[];
  readonly recommendations: readonly Suggestion[];
  readonly detailedAnalysis: readonly APICall[];
  readonly metadata: {
    readonly generatedAt: Date;
    readonly filesAnalyzed: number;
    readonly skippedFiles: number;
    readonly configUsed: AnalysisConfig;
  };
}

// ✅ FIXED CLASS - Removed duplicates and simplified
export class EnhancedAPIRaceConditionDetector {
  private readonly apiCalls: APICall[] = [];
  private readonly fileContents = new Map<string, string>();
  private readonly fileHashes = new Map<string, string>();
  private readonly analysisCache = new Map<string, FileAnalysisResult>();
  private readonly config: AnalysisConfig;

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = {
      includePatterns: [".ts", ".tsx", ".js", ".jsx"],
      excludePatterns: [
        "node_modules",
        "dist",
        ".git",
        "coverage",
        ".next",
        "build",
      ],
      customRules: this.getDefaultRules(),
      confidenceThreshold: 0.7,
      enableIncrementalAnalysis: true,
      maxFileSize: 1024 * 1024,
      ...config,
    };
  }

  private getDefaultRules(): PatternRule[] {
    return [
      // Security Issues
      {
        pattern: /fetch\s*\(\s*['"`][^'"`]*\/admin[^'"`]*['"`]/g,
        description: "Admin endpoint without explicit auth check",
        severity: "HIGH",
        fix: "Add Authorization header or use authenticated API wrapper",
        confidence: 0.9,
        category: "security",
      },
      {
        pattern: /fetch\s*\(\s*['"`][^'"`]*\/payments?[^'"`]*['"`]/g,
        description: "Payment endpoint without explicit auth check",
        severity: "CRITICAL",
        fix: "Ensure payment endpoints use authenticated requests with proper validation",
        confidence: 0.95,
        category: "security",
      },
      {
        pattern: /fetch\s*\(\s*['"`]http:\/\/localhost:\d+/g,
        description: "Hard-coded localhost URL in production code",
        severity: "MEDIUM",
        fix: "Use environment variables or configuration for API base URLs",
        confidence: 0.8,
        category: "performance",
      },

      // Caching Issues
      {
        pattern: /useQuery\s*\(\s*\{[^}]*\}/g,
        description: "useQuery without explicit caching configuration",
        severity: "MEDIUM",
        fix: "Add staleTime and gcTime for optimal caching",
        confidence: 0.7,
        category: "caching",
      },
      {
        pattern: /fetch\s*\([^)]*\)\s*(?!.*cache)/g,
        description: "Fetch call without caching strategy",
        severity: "LOW",
        fix: "Consider adding cache headers or using cached request wrapper",
        confidence: 0.6,
        category: "caching",
      },

      // Race Condition Risks
      {
        pattern: /useQuery.*useQuery/gs,
        description: "Multiple useQuery hooks that could cause race conditions",
        severity: "MEDIUM",
        fix: "Use query dependencies or combine into single query",
        confidence: 0.8,
        category: "race-condition",
      },
      {
        pattern: /fetch\s*\([^)]*\)\s*(?!.*AbortController|.*signal)/g,
        description: "Fetch without cancellation support",
        severity: "LOW",
        fix: "Add AbortController for request cancellation",
        confidence: 0.7,
        category: "race-condition",
      },

      // Performance Issues
      {
        pattern: /fetch\s*\([^)]*\)\s*(?!.*retry|.*catch)/g,
        description: "Fetch without retry or error handling strategy",
        severity: "MEDIUM",
        fix: "Add retry logic and proper error handling",
        confidence: 0.8,
        category: "performance",
      },
    ];
  }

  async analyzeCodebase(): Promise<AnalysisReport> {
    const startTime = performance.now();
    logger.info('🔍 Starting enhanced API race condition analysis...\n', { component: 'Chanuka' });

    try {
      const files = await this.findRelevantFiles(process.cwd());
      console.log(`📁 Found ${files.length} files to analyze\n`);

      if (this.config.enableIncrementalAnalysis) {
        await this.loadCache();
      }

      const results = await this.analyzeFiles(files);
      const report = await this.generateReport(
        results,
        performance.now() - startTime
      );

      if (this.config.enableIncrementalAnalysis) {
        await this.saveCache();
      }

      return report;
    } catch (error) {
      logger.error('❌ Analysis failed:', { component: 'Chanuka' }, error);
      throw error;
    }
  }

  private async findRelevantFiles(rootDir: string): Promise<string[]> {
    const files: string[] = [];

    const scanDirectory = async (currentDir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            if (
              !this.config.excludePatterns.some((p) => fullPath.includes(p))
            ) {
              await scanDirectory(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (this.config.includePatterns.includes(ext)) {
              const stats = await fs.stat(fullPath);
              if (stats.size <= this.config.maxFileSize) {
                files.push(fullPath);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not scan directory: ${currentDir}`);
      }
    };

    await scanDirectory(rootDir);
    return files;
  }

  private async analyzeFiles(files: string[]): Promise<FileAnalysisResult[]> {
    const results: FileAnalysisResult[] = [];

    for (const file of files) {
      const startTime = performance.now();

      try {
        const fileHash = await this.getFileHash(file);
        const cachedResult = this.analysisCache.get(file);

        if (
          this.config.enableIncrementalAnalysis &&
          cachedResult?.fileHash === fileHash
        ) {
          results.push(cachedResult);
          continue;
        }

        const content = await fs.readFile(file, "utf-8");
        this.fileContents.set(file, content);

        const apiCalls = await this.analyzeFile(file, content);

        const result: FileAnalysisResult = {
          filePath: file,
          apiCalls,
          analysisTime: performance.now() - startTime,
          fileHash,
        };

        results.push(result);
        this.analysisCache.set(file, result);
      } catch (error) {
        results.push({
          filePath: file,
          apiCalls: [],
          analysisTime: performance.now() - startTime,
          fileHash: "",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  private async analyzeFile(
    filePath: string,
    content: string
  ): Promise<APICall[]> {
    const apiCalls: APICall[] = [];

    // API call detection patterns
    const patterns = [
      { type: "fetch" as const, regex: /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g },
      {
        type: "axios" as const,
        regex: /axios\.(\w+)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      },
      { type: "useQuery" as const, regex: /useQuery\s*\(/g },
      { type: "useSafeQuery" as const, regex: /useSafeQuery\s*\(/g },
    ];

    for (const { type, regex } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split("\n").length;
        const context = content.substring(
          Math.max(0, match.index - 100),
          Math.min(content.length, match.index + 100)
        );

        // Analyze this specific API call against our rules
        const { issues, suggestions, riskLevel, caching } = this.analyzeApiCall(
          match[0],
          context,
          type
        );

        apiCalls.push({
          id: `${filePath}:${lineNumber}:${type}:${Date.now()}`,
          type,
          location: {
            file: filePath,
            line: lineNumber,
            column: 0,
            context,
          },
          endpoint: match[1] || undefined,
          dependencies: [],
          triggers: [],
          caching,
          raceConditionRisk: riskLevel,
          infiniteLoopRisk: "LOW",
          issues,
          suggestions,
          confidence: 0.8,
          lastModified: new Date(),
        });
      }
    }

    return apiCalls;
  }

  private analyzeApiCall(
    callText: string,
    context: string,
    type: APICall["type"]
  ): {
    issues: DetectedIssue[];
    suggestions: Suggestion[];
    riskLevel: RiskLevel;
    caching: APICall["caching"];
  } {
    const issues: DetectedIssue[] = [];
    const suggestions: Suggestion[] = [];
    let maxRiskLevel: RiskLevel = "LOW";

    // Check against all pattern rules
    for (const rule of this.config.customRules) {
      if (rule.pattern.test(callText) || rule.pattern.test(context)) {
        // Check context requirement if specified
        if (rule.contextRequirement && !rule.contextRequirement.test(context)) {
          continue;
        }

        issues.push({
          type: rule.category as DetectedIssue["type"],
          severity: rule.severity,
          description: rule.description,
          confidence: rule.confidence,
          pattern: rule.pattern.source,
          codeSnippet: callText,
        });

        suggestions.push({
          priority:
            rule.severity === "CRITICAL"
              ? "immediate"
              : rule.severity === "HIGH"
              ? "high"
              : rule.severity === "MEDIUM"
              ? "medium"
              : "low",
          action: rule.fix,
          impact: `Addresses ${rule.category} issue: ${rule.description}`,
          estimatedEffort: rule.severity === "CRITICAL" ? "high" : "medium",
        });

        // Update max risk level
        if (
          this.getRiskPriority(rule.severity) >
          this.getRiskPriority(maxRiskLevel)
        ) {
          maxRiskLevel = rule.severity;
        }
      }
    }

    // Analyze caching
    const caching = this.analyzeCaching(callText, context, type);

    return { issues, suggestions, riskLevel: maxRiskLevel, caching };
  }

  private getRiskPriority(risk: RiskLevel): number {
    switch (risk) {
      case "LOW":
        return 1;
      case "MEDIUM":
        return 2;
      case "HIGH":
        return 3;
      case "CRITICAL":
        return 4;
      default:
        return 0;
    }
  }

  private analyzeCaching(
    callText: string,
    context: string,
    type: APICall["type"]
  ): APICall["caching"] {
    // Check for caching indicators
    const hasStaleTime = /staleTime\s*:/.test(context);
    const hasGcTime = /gcTime\s*:/.test(context);
    const hasCacheTime = /cacheTime\s*:/.test(context);
    const hasCacheHeaders = /cache-control|etag|last-modified/i.test(context);

    if (type === "useQuery" || type === "useSafeQuery") {
      return {
        hasCache: hasStaleTime || hasGcTime || hasCacheTime,
        staleTime: hasStaleTime
          ? this.extractCacheValue(context, "staleTime")
          : undefined,
        gcTime: hasGcTime
          ? this.extractCacheValue(context, "gcTime")
          : undefined,
        strategy: hasStaleTime ? "swr" : undefined,
      };
    }

    return {
      hasCache: hasCacheHeaders,
      strategy: hasCacheHeaders ? "cache-first" : undefined,
    };
  }

  private extractCacheValue(context: string, key: string): number | undefined {
    const match = context.match(new RegExp(`${key}\\s*:\\s*(\\d+)`));
    return match ? parseInt(match[1], 10) : undefined;
  }

  private async generateReport(
    results: FileAnalysisResult[],
    analysisTime: number
  ): Promise<AnalysisReport> {
    const allApiCalls = results.flatMap((r) => r.apiCalls);

    // Calculate risk distribution based on actual analysis
    const riskCounts = {
      critical: allApiCalls.filter(
        (call) => call.raceConditionRisk === "CRITICAL"
      ).length,
      high: allApiCalls.filter((call) => call.raceConditionRisk === "HIGH")
        .length,
      medium: allApiCalls.filter((call) => call.raceConditionRisk === "MEDIUM")
        .length,
      low: allApiCalls.filter((call) => call.raceConditionRisk === "LOW")
        .length,
    };

    // Calculate risk score (weighted average)
    const risk_score =
      (riskCounts.critical * 4 +
        riskCounts.high * 3 +
        riskCounts.medium * 2 +
        riskCounts.low * 1) /
      Math.max(allApiCalls.length, 1);

    const summary = {
      totalAPICalls: allApiCalls.length,
      criticalRisk: riskCounts.critical,
      highRisk: riskCounts.high,
      mediumRisk: riskCounts.medium,
      lowRisk: riskCounts.low,
      risk_score: Math.round(risk_score * 100) / 100,
      averageConfidence:
        allApiCalls.reduce((sum, call) => sum + call.confidence, 0) /
          allApiCalls.length || 0,
      analysisTime,
    };

    // Collect critical issues with location info
    const criticalIssues: (DetectedIssue & { location: string })[] = [];
    allApiCalls.forEach((call) => {
      call.issues.forEach((issue) => {
        if (issue.severity === "CRITICAL" || issue.severity === "HIGH") {
          criticalIssues.push({
            ...issue,
            location: `${call.location.file}:${call.location.line}`,
          });
        }
      });
    });

    // Identify race condition hotspots (calls with race condition risks)
    const raceConditionHotspots = allApiCalls.filter(
      (call) =>
        call.raceConditionRisk === "HIGH" ||
        call.raceConditionRisk === "CRITICAL" ||
        call.issues.some((issue) => issue.type === "race-condition")
    );

    // Identify infinite loop risks
    const infiniteLoopRisks = allApiCalls.filter(
      (call) =>
        call.infiniteLoopRisk === "HIGH" ||
        call.infiniteLoopRisk === "CRITICAL" ||
        call.issues.some((issue) => issue.type === "infinite-loop")
    );

    // Generate consolidated recommendations
    const recommendations = this.generateRecommendations(allApiCalls);

    const apiCallsByType = allApiCalls.reduce((acc, call) => {
      acc[call.type] = (acc[call.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary,
      criticalIssues,
      apiCallsByType,
      raceConditionHotspots,
      infiniteLoopRisks,
      recommendations,
      detailedAnalysis: allApiCalls,
      metadata: {
        generatedAt: new Date(),
        filesAnalyzed: results.filter((r) => !r.error).length,
        skippedFiles: results.filter((r) => r.error).length,
        configUsed: this.config,
      },
    };
  }

  private generateRecommendations(apiCalls: APICall[]): Suggestion[] {
    const recommendations: Suggestion[] = [];
    const suggestionMap = new Map<string, Suggestion>();

    // Collect all suggestions and deduplicate
    apiCalls.forEach((call) => {
      call.suggestions.forEach((suggestion) => {
        const key = `${suggestion.priority}:${suggestion.action}`;
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, suggestion);
        }
      });
    });

    // Add general recommendations based on analysis
    const cachingIssues = apiCalls.filter(
      (call) => !call.caching.hasCache
    ).length;
    const totalCalls = apiCalls.length;

    if (cachingIssues > totalCalls * 0.8) {
      recommendations.push({
        priority: "high",
        action: "Implement comprehensive caching strategy",
        impact: `${cachingIssues} out of ${totalCalls} API calls lack caching configuration`,
        estimatedEffort: "medium",
      });
    }

    const securityIssues = apiCalls.filter((call) =>
      call.issues.some((issue) => issue.type === "security")
    ).length;

    if (securityIssues > 0) {
      recommendations.push({
        priority: "immediate",
        action: "Review and secure sensitive API endpoints",
        impact: `${securityIssues} potential security vulnerabilities detected`,
        estimatedEffort: "high",
      });
    }

    const raceConditionRisks = apiCalls.filter(
      (call) => call.raceConditionRisk !== "LOW"
    ).length;

    if (raceConditionRisks > 0) {
      recommendations.push({
        priority: "high",
        action: "Implement request coordination and cancellation",
        impact: `${raceConditionRisks} API calls have race condition risks`,
        estimatedEffort: "medium",
      });
    }

    // Add unique suggestions from individual calls
    Array.from(suggestionMap.values()).forEach((suggestion) => {
      recommendations.push(suggestion);
    });

    // Sort by priority
    const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
    return recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  private async getFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return createHash("sha256").update(content).digest("hex");
    } catch {
      return "";
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const cacheFile = path.join(process.cwd(), ".cache", "api-analysis.json");
      const cacheData = await fs.readFile(cacheFile, "utf-8");
      const cache = JSON.parse(cacheData);
      Object.entries(cache).forEach(([key, value]) => {
        this.analysisCache.set(key, value as FileAnalysisResult);
      });
    } catch {
      // Cache doesn't exist
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cacheDir = path.join(process.cwd(), ".cache");
      await fs.mkdir(cacheDir, { recursive: true });
      const cacheFile = path.join(cacheDir, "api-analysis.json");
      const cache = Object.fromEntries(this.analysisCache.entries());
      await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.warn("⚠️  Could not save cache:", error);
    }
  }

  async saveReport(report: AnalysisReport): Promise<void> {
    const reportPath = "./api-analysis-report.json";
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to ${reportPath}`);
  }
}

// ✅ WORKING ENTRY POINT
async function main() {
  const detector = new EnhancedAPIRaceConditionDetector();
  try {
    const report = await detector.analyzeCodebase();
    logger.info('\n✅ Analysis complete!', { component: 'Chanuka' });
    console.log(`📊 Total API calls found: ${report.summary.totalAPICalls}`);
    await detector.saveReport(report);
  } catch (error) {
    console.error(error);
  }
}

// Always run the main function
main();














































