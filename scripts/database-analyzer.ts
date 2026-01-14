/**
 * Database Analysis & Index Optimization
 *
 * Analyzes database performance and identifies index opportunities.
 * Only suggests indexes that metrics show will improve performance.
 *
 * Never adds an index without evidence it will help.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IndexMetrics, PerformanceRecommendation } from '@shared/types/performance';

/**
 * Tracks database query patterns for index analysis
 */
interface QueryPattern {
  readonly columns: string[];
  readonly operator: 'WHERE' | 'JOIN' | 'ORDER' | 'GROUP';
  readonly frequency: number;
  readonly selectivity: number; // 0-1, lower is more selective
  readonly avgQueryTimeMs: number;
}

/**
 * Analyzes database performance and index effectiveness
 */
export class DatabaseAnalyzer {
  private indexes: Map<string, IndexMetrics> = new Map();
  private queryPatterns: QueryPattern[] = [];
  private outputPath: string;

  constructor(outputPath: string = './database-analysis') {
    this.outputPath = outputPath;
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
  }

  /**
   * Record an index from database
   */
  recordIndex(metrics: IndexMetrics): void {
    this.indexes.set(metrics.indexName, metrics);
  }

  /**
   * Record a query pattern for analysis
   */
  recordQueryPattern(pattern: QueryPattern): void {
    // Merge with existing if same columns
    const existing = this.queryPatterns.find(
      (p) =>
        p.columns.sort().join(',') === pattern.columns.sort().join(',') &&
        p.operator === pattern.operator
    );

    if (existing) {
      existing.frequency += pattern.frequency;
    } else {
      this.queryPatterns.push(pattern);
    }
  }

  /**
   * Identify unused indexes
   * Removes candidates for cleanup
   */
  findUnusedIndexes(): IndexMetrics[] {
    return Array.from(this.indexes.values())
      .filter((idx) => idx.scanCount === 0 && idx.seekCount === 0 && idx.updateCount > 100)
      .sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  /**
   * Identify high-maintenance indexes
   * These have high update costs relative to benefit
   */
  findHighMaintenanceIndexes(): { index: IndexMetrics; maintenanceCost: number }[] {
    return Array.from(this.indexes.values())
      .map((idx) => ({
        index: idx,
        maintenanceCost: idx.updateCount / (idx.seekCount || 1),
      }))
      .filter(({ maintenanceCost }) => maintenanceCost > 1)
      .sort((a, b) => b.maintenanceCost - a.maintenanceCost)
      .slice(0, 10);
  }

  /**
   * Find index fragmentation issues
   */
  findFragmentedIndexes(fragmentationThreshold: number = 0.2): IndexMetrics[] {
    // In real implementation, would query sys.dm_db_index_physical_stats or equivalent
    // For now, estimate from usage patterns
    return Array.from(this.indexes.values()).filter((idx) => {
      const usageRatio = (idx.seekCount + idx.scanCount) / (idx.updateCount || 1);
      return usageRatio > 10 && idx.seekCount > 100; // High update/seek ratio
    });
  }

  /**
   * Identify missing indexes
   * Based on query patterns that would benefit from indexes
   */
  identifyMissingIndexes(): {
    columns: string[];
    table: string;
    benefit: number;
    frequency: number;
  }[] {
    const missing: { columns: string[]; table: string; benefit: number; frequency: number }[] =
      [];

    for (const pattern of this.queryPatterns) {
      // Check if this pattern would benefit from an index
      const hasIndex = Array.from(this.indexes.values()).some((idx) => {
        const indexCols = idx.columns.sort().join(',');
        const patternCols = pattern.columns.sort().join(',');
        return indexCols === patternCols;
      });

      if (!hasIndex && pattern.selectivity < 0.1) {
        // Highly selective queries without index are candidates
        const benefit = (1 - pattern.selectivity) * pattern.frequency * pattern.avgQueryTimeMs;

        missing.push({
          columns: pattern.columns,
          table: 'unknown', // Would be tracked in real implementation
          benefit,
          frequency: pattern.frequency,
        });
      }
    }

    return missing
      .sort((a, b) => b.benefit - a.benefit)
      .slice(0, 10);
  }

  /**
   * Analyze index effectiveness
   * Calculates efficiency score for each index
   */
  analyzeIndexEffectiveness(): { index: IndexMetrics; score: number }[] {
    return Array.from(this.indexes.values())
      .map((idx) => {
        const usefulness = (idx.seekCount + idx.scanCount) / (idx.updateCount || 1);
        const bytesPerUse = idx.sizeBytes / (idx.seekCount + idx.scanCount || 1);
        const score = Math.max(0, usefulness - bytesPerUse / 10000);

        return { index: idx, score: Math.min(100, score) };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Identify table statistics that need updating
   */
  findStaleStatistics(staleDays: number = 7): { table: string; lastUpdated: string | null }[] {
    const stale: { table: string; lastUpdated: string | null }[] = [];

    for (const idx of this.indexes.values()) {
      if (idx.lastUsedAt) {
        const daysSinceUsed = (Date.now() - new Date(idx.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUsed > staleDays) {
          stale.push({
            table: idx.tableName,
            lastUpdated: idx.lastUsedAt,
          });
        }
      }
    }

    return stale;
  }

  /**
   * Generate optimization recommendations
   * Based only on actual index usage metrics
   */
  generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Unused index removal
    const unused = this.findUnusedIndexes();
    for (const idx of unused.slice(0, 3)) {
      const sizeSavingsKB = idx.sizeBytes / 1024;

      recommendations.push({
        priority: sizeSavingsKB > 100 ? 'medium' : 'low',
        category: 'index',
        title: `Remove Unused Index: ${idx.indexName}`,
        description: `This index hasn't been used (0 seeks/scans) but uses ${sizeSavingsKB.toFixed(2)}KB and requires maintenance.`,
        estimatedSavingsMs: 50, // Rough estimate of maintenance cost
        effort: 'low',
        evidenceMetrics: ['zero-usage', 'storage-cost'],
        implementationSteps: [
          'Verify index is truly unused in production',
          `DROP INDEX ${idx.indexName}`,
          'Monitor query performance for regression',
        ],
      });
    }

    // High maintenance index review
    const highMaint = this.findHighMaintenanceIndexes();
    for (const { index: idx, maintenanceCost } of highMaint.slice(0, 3)) {
      if (maintenanceCost > 2) {
        recommendations.push({
          priority: 'medium',
          category: 'index',
          title: `Review High-Maintenance Index: ${idx.indexName}`,
          description: `This index has ${maintenanceCost.toFixed(1)}x more updates than seeks. Consider if benefit justifies cost.`,
          estimatedSavingsMs: 100,
          effort: 'medium',
          evidenceMetrics: ['maintenance-cost', 'usage-ratio'],
          implementationSteps: [
            'Analyze if this index is actually helping queries',
            'Check for better index strategies',
            'Consider consolidating with other indexes',
          ],
        });
      }
    }

    // Missing index opportunities
    const missing = this.identifyMissingIndexes();
    for (const { columns, benefit } of missing.slice(0, 3)) {
      if (benefit > 1000) {
        // Only suggest if meaningful benefit
        recommendations.push({
          priority: benefit > 5000 ? 'high' : 'medium',
          category: 'index',
          title: `Create Index on ${columns.join(', ')}`,
          description: `Queries filtering/joining on ${columns.join(', ')} could save ~${benefit.toFixed(0)}ms total execution time.`,
          estimatedSavingsMs: benefit,
          effort: 'low',
          evidenceMetrics: ['query-frequency', 'selectivity', 'execution-time'],
          implementationSteps: [
            `CREATE INDEX ON table(${columns.join(', ')})`,
            'Verify index is used by query optimizer',
            'Monitor for unexpected side effects',
          ],
        });
      }
    }

    return recommendations;
  }

  /**
   * Save analysis report
   */
  saveReport(sessionName: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = path.join(this.outputPath, `db-analysis-${sessionName}-${timestamp}.json`);

    const report = {
      timestamp: new Date().toISOString(),
      sessionName,
      indexes: Array.from(this.indexes.values()),
      unusedIndexes: this.findUnusedIndexes(),
      highMaintenanceIndexes: this.findHighMaintenanceIndexes(),
      fragmentedIndexes: this.findFragmentedIndexes(),
      missingIndexes: this.identifyMissingIndexes(),
      effectiveness: this.analyzeIndexEffectiveness(),
      staleStatistics: this.findStaleStatistics(),
      recommendations: this.generateRecommendations(),
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    return filename;
  }

  /**
   * Format report for display
   */
  formatReport(): string {
    let output = '\n🗄️  Database Analysis Report\n';
    output += `${'='.repeat(60)}\n\n`;

    output += `📊 Index Summary\n`;
    output += `   Total Indexes: ${this.indexes.size}\n`;

    const unused = this.findUnusedIndexes();
    if (unused.length > 0) {
      output += `   ⚠️  Unused: ${unused.length}\n`;
    }

    const effectiveness = this.analyzeIndexEffectiveness();
    if (effectiveness.length > 0) {
      const topIndex = effectiveness[0];
      output += `   ✅ Most Effective: ${topIndex.index.indexName} (score: ${topIndex.score.toFixed(0)}/100)\n`;
    }

    const missing = this.identifyMissingIndexes();
    if (missing.length > 0) {
      output += `\n💡 Missing Indexes (${missing.length} opportunities)\n`;
      for (const { columns, benefit } of missing.slice(0, 3)) {
        output += `   • ${columns.join(', ')} (${benefit.toFixed(0)}ms potential savings)\n`;
      }
    }

    const recs = this.generateRecommendations();
    if (recs.length > 0) {
      output += `\n📋 Recommendations (${recs.length} total)\n`;
      for (const rec of recs.slice(0, 3)) {
        output += `   • [${rec.priority.toUpperCase()}] ${rec.title}\n`;
      }
    }

    output += '\n';
    return output;
  }
}

export default DatabaseAnalyzer;
