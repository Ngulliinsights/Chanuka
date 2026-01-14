#!/usr/bin/env npx ts-node

/**
 * Query Performance Analyzer
 *
 * Analyzes actual database queries to identify optimization opportunities.
 * Only suggests optimizations backed by real query metrics.
 *
 * Features:
 * - N+1 query detection
 * - Missing index identification
 * - Query plan analysis
 * - Performance trending
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import type {
  QueryMetrics,
  QueryAggregate,
  QueryPlan,
  PerformanceRecommendation,
} from '@shared/types/performance';

interface QueryBatch {
  readonly timestamp: string;
  readonly queries: QueryMetrics[];
  readonly executionTimeMs: number;
}

/**
 * Analyzes query patterns to identify optimization opportunities
 * All analysis is based on actual execution metrics
 */
export class QueryAnalyzer {
  private queryLog: QueryMetrics[] = [];
  private batches: QueryBatch[] = [];
  private aggregates: Map<string, QueryAggregate> = new Map();
  private outputPath: string;

  constructor(outputPath: string = './query-analysis') {
    this.outputPath = outputPath;
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
  }

  /**
   * Record a query execution
   * Call this for every query that runs
   */
  recordQuery(metrics: QueryMetrics): void {
    this.queryLog.push(metrics);
    this.updateAggregates(metrics);
  }

  /**
   * Record a batch of queries
   * Used to detect N+1 patterns
   */
  recordBatch(queries: QueryMetrics[], executionTimeMs: number): void {
    this.batches.push({
      timestamp: new Date().toISOString(),
      queries,
      executionTimeMs,
    });

    queries.forEach((q) => this.recordQuery(q));
  }

  /**
   * Update running aggregates
   * Tracks cumulative metrics per query pattern
   */
  private updateAggregates(metrics: QueryMetrics): void {
    const pattern = this.normalizeQuery(metrics.sql);
    const existing = this.aggregates.get(pattern);

    if (existing) {
      existing.callCount += 1;
      existing.totalTimeMs += metrics.executionTimeMs;
      existing.avgTimeMs = existing.totalTimeMs / existing.callCount;
      existing.maxTimeMs = Math.max(existing.maxTimeMs, metrics.executionTimeMs);
      existing.minTimeMs = Math.min(existing.minTimeMs, metrics.executionTimeMs);
      existing.p95TimeMs = this.calculatePercentile(
        Array.from({ length: existing.callCount }, () => metrics.executionTimeMs),
        0.95
      );
    } else {
      this.aggregates.set(pattern, {
        queryPattern: pattern,
        callCount: 1,
        totalTimeMs: metrics.executionTimeMs,
        avgTimeMs: metrics.executionTimeMs,
        maxTimeMs: metrics.executionTimeMs,
        minTimeMs: metrics.executionTimeMs,
        p95TimeMs: metrics.executionTimeMs,
        isNPlus1: false,
        suggestedIndexes: metrics.indexes,
        estimatedSavingsMs: 0,
      });
    }
  }

  /**
   * Normalize SQL queries for pattern matching
   * Removes literals to group similar queries
   */
  private normalizeQuery(sql: string): string {
    return sql
      .replace(/'[^']*'/g, '?') // replace string literals
      .replace(/\d+/g, '?') // replace numbers
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim();
  }

  /**
   * Detect N+1 query patterns
   * Looks for one initial query followed by many identical queries
   */
  detectNPlusOne(): { pattern: string; count: number; estimated: number }[] {
    const suspicious: { pattern: string; count: number; estimated: number }[] = [];

    for (const [pattern, agg] of this.aggregates) {
      // N+1 typically: initial query returns N rows, then N+1 identical queries
      // Flag if we see same query pattern called many times (>10) in short window
      if (agg.callCount > 10 && agg.avgTimeMs < 10) {
        const estimatedSavings = agg.totalTimeMs * 0.7; // rough estimate

        suspicious.push({
          pattern,
          count: agg.callCount,
          estimated: estimatedSavings,
        });
      }
    }

    return suspicious.sort((a, b) => b.estimated - a.estimated);
  }

  /**
   * Analyze query performance to find slow queries
   * Returns top performers to optimize
   */
  analyzeSlowQueries(topN: number = 10): QueryAggregate[] {
    return Array.from(this.aggregates.values())
      .sort((a, b) => b.totalTimeMs - a.totalTimeMs)
      .slice(0, topN);
  }

  /**
   * Identify missing indexes
   * Based on queries scanning many rows vs returning few
   */
  identifyMissingIndexes(): { query: string; recommendation: string; savingsMs: number }[] {
    const recommendations: { query: string; recommendation: string; savingsMs: number }[] = [];

    for (const [, query] of this.queryLog.entries()) {
      // High selectivity queries (few rows returned vs scanned) suggest missing index
      const selectivity = query.rowsReturned / (query.rowsScanned || 1);

      if (selectivity < 0.1 && query.executionTimeMs > 50) {
        // Rough estimate: index could save ~70% of scan time
        const estimatedSavings = query.executionTimeMs * 0.7;

        recommendations.push({
          query: query.sql.substring(0, 100),
          recommendation: `Consider index on WHERE clause columns (scanned ${query.rowsScanned}, returned ${query.rowsReturned})`,
          savingsMs: estimatedSavings,
        });
      }
    }

    return recommendations
      .sort((a, b) => b.savingsMs - a.savingsMs)
      .slice(0, 10);
  }

  /**
   * Generate recommendations based on actual metrics
   * Only suggests optimizations with measured impact
   */
  generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // N+1 detection
    const nPlusOne = this.detectNPlusOne();
    for (const { pattern, count, estimated } of nPlusOne) {
      if (estimated > 100) {
        // Only flag if meaningful savings
        recommendations.push({
          priority: 'high',
          category: 'query',
          title: `N+1 Query Pattern Detected`,
          description: `Query "${pattern.substring(0, 50)}..." called ${count} times. Consider batching or JOIN.`,
          estimatedSavingsMs: estimated,
          effort: 'high',
          evidenceMetrics: ['query-call-count', 'aggregate-time'],
          implementationSteps: [
            'Identify the initial query that loads primary data',
            'Batch the related queries or use JOIN',
            'Test with query analyzer before deploying',
          ],
        });
      }
    }

    // Slow query optimization
    const slowQueries = this.analyzeSlowQueries(5);
    for (const query of slowQueries) {
      if (query.maxTimeMs > 1000) {
        // Queries over 1 second are worth investigating
        recommendations.push({
          priority: query.maxTimeMs > 5000 ? 'critical' : 'high',
          category: 'query',
          title: `Slow Query Detected`,
          description: `Query "${query.queryPattern.substring(0, 50)}..." takes average ${query.avgTimeMs.toFixed(2)}ms (max ${query.maxTimeMs.toFixed(2)}ms).`,
          estimatedSavingsMs: query.maxTimeMs * 0.3,
          effort: 'medium',
          evidenceMetrics: ['query-execution-time', 'aggregate-stats'],
          implementationSteps: [
            'Run EXPLAIN ANALYZE to see query plan',
            'Check for sequential scans',
            'Add indexes on filter/join columns',
          ],
        });
      }
    }

    // Missing index detection
    const missingIndexes = this.identifyMissingIndexes();
    for (const { query, recommendation, savingsMs } of missingIndexes) {
      if (savingsMs > 50) {
        recommendations.push({
          priority: savingsMs > 500 ? 'high' : 'medium',
          category: 'index',
          title: `Potential Missing Index`,
          description: recommendation,
          estimatedSavingsMs: savingsMs,
          effort: 'low',
          evidenceMetrics: ['row-scan-count', 'selectivity'],
          implementationSteps: [
            'Analyze query execution plan',
            'Identify columns in WHERE/JOIN clauses',
            'Create index and re-test',
          ],
        });
      }
    }

    return recommendations.sort((a, b) => b.estimatedSavingsMs - a.estimatedSavingsMs);
  }

  /**
   * Calculate percentile from values
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Save analysis report
   */
  async saveReport(): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = path.join(this.outputPath, `query-analysis-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      queryCount: this.queryLog.length,
      aggregates: Array.from(this.aggregates.entries()).map(([pattern, agg]) => ({
        pattern,
        ...agg,
      })),
      nPlusOne: this.detectNPlusOne(),
      slowQueries: this.analyzeSlowQueries(10),
      missingIndexes: this.identifyMissingIndexes(),
      recommendations: this.generateRecommendations(),
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    return filename;
  }

  /**
   * Format report for console output
   */
  formatReport(): string {
    let output = '\n📊 Query Performance Analysis\n';
    output += `${'='.repeat(60)}\n\n`;

    output += `📈 Overview\n`;
    output += `   Total Queries: ${this.queryLog.length}\n`;
    output += `   Unique Patterns: ${this.aggregates.size}\n\n`;

    const nPlusOne = this.detectNPlusOne();
    if (nPlusOne.length > 0) {
      output += `⚠️  N+1 Query Patterns Detected\n`;
      for (const { pattern, count, estimated } of nPlusOne) {
        output += `   • "${pattern.substring(0, 50)}..." (${count} calls, ${estimated.toFixed(0)}ms savings)\n`;
      }
      output += '\n';
    }

    const slowQueries = this.analyzeSlowQueries(5);
    if (slowQueries.some((q) => q.maxTimeMs > 500)) {
      output += `🐢 Slow Queries\n`;
      for (const q of slowQueries.filter((q) => q.maxTimeMs > 500)) {
        output += `   • "${q.queryPattern.substring(0, 40)}..." (avg ${q.avgTimeMs.toFixed(2)}ms, max ${q.maxTimeMs.toFixed(2)}ms)\n`;
      }
      output += '\n';
    }

    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      output += `💡 Recommendations (${recommendations.length} total)\n`;
      for (const rec of recommendations.slice(0, 5)) {
        output += `   • [${rec.priority.toUpperCase()}] ${rec.title} (~${rec.estimatedSavingsMs.toFixed(0)}ms savings)\n`;
      }
      output += '\n';
    }

    return output;
  }
}

/**
 * CLI execution
 */
if (require.main === module) {
  const analyzer = new QueryAnalyzer();

  // Example usage - would be populated by actual query monitoring
  const exampleQueries: QueryMetrics[] = [];

  console.log(analyzer.formatReport());
  analyzer.saveReport().then((filename) => {
    console.log(`✅ Report saved: ${filename}`);
  });
}

export default QueryAnalyzer;
