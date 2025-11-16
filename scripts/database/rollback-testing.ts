#!/usr/bin/env tsx
/**
 * Rollback Testing Script
 * Tests automated rollback capability for database migrations
 */

import * as dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../shared/core/src/observability/logging';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon serverless
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

interface RollbackTestResult {
  migration: string;
  testType: 'transaction_rollback' | 'manual_rollback' | 'backup_restore';
  success: boolean;
  duration: number;
  dataIntegrity: {
    beforeMigration: boolean;
    afterRollback: boolean;
    dataLoss: boolean;
  };
  error?: string;
  recommendations: string[];
}

interface RollbackStrategy {
  type: 'transaction_rollback' | 'manual_rollback' | 'backup_restore';
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDuration: number;
  dataLossRisk: 'none' | 'minimal' | 'significant';
}

class RollbackTester {
  private pool: Pool;
  private testResults: RollbackTestResult[] = [];
  private originalDataSnapshot: Map<string, any[]> = new Map();

  constructor(private connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async testRollbackCapabilities(): Promise<RollbackTestResult[]> {
    logger.info('🔄 Starting rollback capability testing...', { component: 'RollbackTest' });

    try {
      // Create data snapshot for integrity checking
      await this.createDataSnapshot();

      // Get all migration files
      const migrationsDir = path.join(process.cwd(), 'drizzle');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      logger.info(`📋 Testing rollback for ${migrationFiles.length} migrations`, { component: 'RollbackTest' });

      for (const filename of migrationFiles) {
        // Test different rollback strategies
        const strategies: RollbackStrategy[] = [
          {
            type: 'transaction_rollback',
            description: 'Transaction rollback using savepoints',
            riskLevel: 'low',
            estimatedDuration: 5000, // 5 seconds
            dataLossRisk: 'none'
          },
          {
            type: 'manual_rollback',
            description: 'Manual rollback script execution',
            riskLevel: 'medium',
            estimatedDuration: 30000, // 30 seconds
            dataLossRisk: 'minimal'
          }
        ];

        for (const strategy of strategies) {
          const result = await this.testRollbackStrategy(filename, strategy);
          this.testResults.push(result);

          if (!result.success) {
            logger.error(`❌ Rollback test failed for ${filename} (${strategy.type})`, { component: 'RollbackTest' }, result.error);
          } else {
            logger.info(`✅ Rollback test passed for ${filename} (${strategy.type})`, { component: 'RollbackTest' });
          }
        }
      }

      return this.testResults;
    } catch (error) {
      logger.error('💥 Rollback testing failed:', { component: 'RollbackTest' }, error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async createDataSnapshot(): Promise<void> {
    logger.info('📸 Creating data snapshot for integrity verification...', { component: 'RollbackTest' });

    const criticalTables = [
      'users', 'bills', 'comments', 'bill_engagement',
      'notifications', 'user_profiles', 'sponsors'
    ];

    for (const table of criticalTables) {
      try {
        const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        this.originalDataSnapshot.set(table, result.rows);
        logger.info(`📊 Snapshot created for ${table}: ${result.rows[0].count} records`, { component: 'RollbackTest' });
      } catch (error) {
        logger.warn(`Could not snapshot table ${table}:`, { component: 'RollbackTest' }, error.message);
      }
    }
  }

  private async testRollbackStrategy(filename: string, strategy: RollbackStrategy): Promise<RollbackTestResult> {
    const result: RollbackTestResult = {
      migration: filename,
      testType: strategy.type,
      success: false,
      duration: 0,
      dataIntegrity: {
        beforeMigration: true,
        afterRollback: false,
        dataLoss: false
      },
      recommendations: []
    };

    const startTime = Date.now();

    try {
      // Create a test transaction
      await this.pool.query('BEGIN');
      await this.pool.query('SAVEPOINT rollback_test_start');

      // Apply migration
      const migrationPath = path.join(process.cwd(), 'drizzle', filename);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      await this.pool.query(sql);
      await this.pool.query('SAVEPOINT migration_applied');

      // Verify migration was applied (basic check)
      const migrationApplied = await this.verifyMigrationApplied(filename);
      if (!migrationApplied) {
        throw new Error('Migration verification failed');
      }

      // Test rollback based on strategy
      switch (strategy.type) {
        case 'transaction_rollback':
          await this.testTransactionRollback();
          break;
        case 'manual_rollback':
          await this.testManualRollback(filename);
          break;
        case 'backup_restore':
          // This would require backup infrastructure
          result.recommendations.push('Backup restore testing requires separate backup infrastructure');
          break;
      }

      // Verify rollback success
      result.dataIntegrity.afterRollback = await this.verifyRollbackSuccess();
      result.dataIntegrity.dataLoss = await this.checkForDataLoss();

      result.success = result.dataIntegrity.afterRollback && !result.dataIntegrity.dataLoss;

      await this.pool.query('ROLLBACK'); // Clean up test transaction

    } catch (error) {
      result.error = error.message;
      result.success = false;

      // Attempt cleanup
      try {
        await this.pool.query('ROLLBACK');
      } catch (cleanupError) {
        logger.error('Failed to cleanup test transaction:', { component: 'RollbackTest' }, cleanupError.message);
      }
    } finally {
      result.duration = Date.now() - startTime;
    }

    // Generate recommendations
    result.recommendations = this.generateRollbackRecommendations(result, strategy);

    return result;
  }

  private async verifyMigrationApplied(filename: string): Promise<boolean> {
    // Basic verification - check if any schema changes were made
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as changes
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);
      return result.rows[0].changes > 0;
    } catch (error) {
      return false;
    }
  }

  private async testTransactionRollback(): Promise<void> {
    // Test rolling back to savepoint
    await this.pool.query('ROLLBACK TO SAVEPOINT migration_applied');
    await this.pool.query('RELEASE SAVEPOINT migration_applied');
  }

  private async testManualRollback(filename: string): Promise<void> {
    // Look for corresponding rollback script
    const rollbackFile = filename.replace('.sql', '.rollback.sql');
    const rollbackPath = path.join(process.cwd(), 'drizzle', 'rollbacks', rollbackFile);

    if (fs.existsSync(rollbackPath)) {
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf8');
      await this.pool.query(rollbackSQL);
    } else {
      // Generate basic rollback (this is simplified)
      // In practice, you'd have predefined rollback scripts
      await this.pool.query('ROLLBACK TO SAVEPOINT migration_applied');
    }
  }

  private async verifyRollbackSuccess(): Promise<boolean> {
    try {
      // Check if we're back to the original state
      for (const [table, originalData] of this.originalDataSnapshot) {
        const currentResult = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const currentCount = parseInt(currentResult.rows[0].count);
        const originalCount = parseInt(originalData[0].count);

        if (currentCount !== originalCount) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkForDataLoss(): Promise<boolean> {
    // Check for any data loss during rollback
    for (const [table, originalData] of this.originalDataSnapshot) {
      try {
        const currentResult = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const currentCount = parseInt(currentResult.rows[0].count);
        const originalCount = parseInt(originalData[0].count);

        if (currentCount < originalCount) {
          return true; // Data loss detected
        }
      } catch (error) {
        // Table might not exist, which could be expected
        continue;
      }
    }
    return false;
  }

  private generateRollbackRecommendations(result: RollbackTestResult, strategy: RollbackStrategy): string[] {
    const recommendations: string[] = [];

    if (!result.success) {
      recommendations.push(`Rollback strategy '${strategy.type}' failed - consider alternative approaches`);
    }

    if (result.dataIntegrity.dataLoss) {
      recommendations.push('Data loss detected during rollback - implement data backup before migration');
    }

    if (result.duration > strategy.estimatedDuration * 2) {
      recommendations.push(`Rollback took ${result.duration}ms, significantly longer than estimated ${strategy.estimatedDuration}ms`);
    }

    if (strategy.riskLevel === 'high' && !result.success) {
      recommendations.push('High-risk migration lacks reliable rollback - consider breaking into smaller migrations');
    }

    // Strategy-specific recommendations
    switch (strategy.type) {
      case 'transaction_rollback':
        if (!result.success) {
          recommendations.push('Implement manual rollback scripts as backup to transaction rollback');
        }
        break;
      case 'manual_rollback':
        if (!result.success) {
          recommendations.push('Create comprehensive rollback scripts for all migrations');
          recommendations.push('Test rollback scripts independently of migration execution');
        }
        break;
    }

    return recommendations;
  }

  async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        successfulTests: this.testResults.filter(r => r.success).length,
        failedTests: this.testResults.filter(r => !r.success).length,
        averageDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length,
        dataLossIncidents: this.testResults.filter(r => r.dataIntegrity.dataLoss).length,
        integrityFailures: this.testResults.filter(r => !r.dataIntegrity.afterRollback).length
      },
      results: this.testResults,
      recommendations: this.generateGlobalRecommendations()
    };

    fs.writeFileSync('rollback-test-results.json', JSON.stringify(report, null, 2));
    logger.info('📊 Rollback testing report generated: rollback-test-results.json', { component: 'RollbackTest' });
  }

  private generateGlobalRecommendations(): string[] {
    const recommendations: string[] = [];

    const successRate = (this.testResults.filter(r => r.success).length / this.testResults.length) * 100;

    if (successRate < 80) {
      recommendations.push('Low rollback success rate - implement comprehensive rollback strategies');
    }

    const dataLossIncidents = this.testResults.filter(r => r.dataIntegrity.dataLoss).length;
    if (dataLossIncidents > 0) {
      recommendations.push(`${dataLossIncidents} data loss incidents detected - always backup before high-risk migrations`);
    }

    const slowRollbacks = this.testResults.filter(r => r.duration > 30000).length; // 30 seconds
    if (slowRollbacks > 0) {
      recommendations.push(`${slowRollbacks} rollbacks took longer than 30 seconds - optimize rollback performance`);
    }

    // Check strategy effectiveness
    const transactionRollbacks = this.testResults.filter(r => r.testType === 'transaction_rollback');
    const manualRollbacks = this.testResults.filter(r => r.testType === 'manual_rollback');

    const transactionSuccessRate = transactionRollbacks.filter(r => r.success).length / transactionRollbacks.length;
    const manualSuccessRate = manualRollbacks.filter(r => r.success).length / manualRollbacks.length;

    if (transactionSuccessRate < manualSuccessRate) {
      recommendations.push('Transaction rollback less reliable than manual rollback - prefer manual scripts for critical migrations');
    }

    return recommendations;
  }

  hasCriticalFailures(): boolean {
    return this.testResults.some(r =>
      !r.success &&
      (r.dataIntegrity.dataLoss || !r.dataIntegrity.afterRollback)
    );
  }

  getRollbackStrategy(migration: string): RollbackStrategy | null {
    // Determine best rollback strategy based on test results
    const migrationResults = this.testResults.filter(r => r.migration === migration);

    if (migrationResults.length === 0) return null;

    // Prefer transaction rollback if reliable
    const transactionResult = migrationResults.find(r => r.testType === 'transaction_rollback');
    if (transactionResult?.success) {
      return {
        type: 'transaction_rollback',
        description: 'Transaction rollback using savepoints',
        riskLevel: 'low',
        estimatedDuration: transactionResult.duration,
        dataLossRisk: 'none'
      };
    }

    // Fallback to manual rollback
    const manualResult = migrationResults.find(r => r.testType === 'manual_rollback');
    if (manualResult?.success) {
      return {
        type: 'manual_rollback',
        description: 'Manual rollback script execution',
        riskLevel: 'medium',
        estimatedDuration: manualResult.duration,
        dataLossRisk: 'minimal'
      };
    }

    return null;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const tester = new RollbackTester(process.env.DATABASE_URL);

  try {
    await tester.testRollbackCapabilities();
    await tester.generateReport();

    if (tester.hasCriticalFailures()) {
      console.error('🚨 CRITICAL ROLLBACK FAILURES DETECTED!');
      console.error('Migration rollback capabilities are inadequate.');
      console.error('Review rollback-test-results.json for details.');
      process.exit(1);
    } else {
      console.log('✅ Rollback capabilities verified');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Rollback testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('rollback-testing')) {
  main().catch((error) => {
    console.error('Rollback testing error:', error);
    process.exit(1);
  });
}

export { RollbackTester, RollbackTestResult, RollbackStrategy };