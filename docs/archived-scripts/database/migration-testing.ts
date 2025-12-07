#!/usr/bin/env tsx
/**
 * Migration Testing Script
 * Tests database migrations against production-like datasets
 */

import * as dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { logger } from '@shared/core/src/observability/logging';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon serverless
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

interface MigrationTestResult {
  migration: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  error?: string;
  dataIntegrityChecks: DataIntegrityCheck[];
}

interface DataIntegrityCheck {
  table: string;
  check: string;
  status: 'pass' | 'fail';
  details?: any;
}

interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface Bill {
  id: string;
  title: string;
  summary: string;
  bill_number: string;
  category: string;
  status: string;
  introduced_date: Date;
  sponsor_id: string;
  created_at: Date;
  updated_at: Date;
}

interface Comment {
  id: string;
  bill_id: string;
  user_id: string;
  content: string;
  sentiment: string;
  is_expert: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

class MigrationTester {
  private pool: Pool;
  private testResults: MigrationTestResult[] = [];
  private startTime: number = 0;

  constructor(private connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async runMigrationTests(): Promise<MigrationTestResult[]> {
    logger.info('🧪 Starting migration testing against production-like datasets...', { component: 'MigrationTest' });

    try {
      // Setup production-like test data
      await this.setupTestData();

      // Get all migration files
      const migrationsDir = path.join(process.cwd(), 'drizzle');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      logger.info(`📋 Testing ${migrationFiles.length} migrations`, { component: 'MigrationTest' });

      for (const filename of migrationFiles) {
        const result = await this.testMigration(filename);
        this.testResults.push(result);

        if (result.status === 'fail') {
          logger.error(`❌ Migration test failed: ${filename}`, { component: 'MigrationTest' }, result.error);
        } else {
          logger.info(`✅ Migration test passed: ${filename}`, { component: 'MigrationTest' });
        }
      }

      // Run final data integrity checks
      await this.runFinalIntegrityChecks();

      return this.testResults;
    } catch (error) {
      logger.error('💥 Migration testing failed:', { component: 'MigrationTest' }, error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async setupTestData(): Promise<void> {
    logger.info('🏗️ Setting up production-like test data...', { component: 'MigrationTest' });

    const testDataScale = process.env.TEST_DATA_SCALE || 'medium';
    const dataSize = this.getDataScale(testDataScale);

    // Create test users
    await this.createTestUsers(dataSize.users);

    // Create test bills and sponsors
    await this.createTestBills(dataSize.bills);

    // Create test comments and engagement
    await this.createTestEngagement(dataSize.comments);

    // Create test notifications and preferences
    await this.createTestNotifications(dataSize.notifications);

    logger.info('✅ Test data setup complete', { component: 'MigrationTest' });
  }

  private getDataScale(scale: string): { users: number; bills: number; comments: number; notifications: number } {
    switch (scale) {
      case 'large':
        return { users: 10000, bills: 500, comments: 50000, notifications: 25000 };
      case 'medium':
        return { users: 1000, bills: 50, comments: 5000, notifications: 2500 };
      case 'small':
      default:
        return { users: 100, bills: 5, comments: 500, notifications: 250 };
    }
  }

  private async createTestUsers(count: number): Promise<void> {
    logger.info(`👥 Creating ${count} test users...`, { component: 'MigrationTest' });

    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push({
        id: crypto.randomUUID(),
        email: `test-user-${i}@chanuka.test`,
        password_hash: `hash_${i}`,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
        updated_at: new Date()
      });
    }

    // Batch insert users
    const values = users.map(u => `('${u.id}', '${u.email}', '${u.password_hash}', '${u.created_at.toISOString()}', '${u.updated_at.toISOString()}')`).join(', ');
    await this.pool.query(`
      INSERT INTO users (id, email, password_hash, created_at, updated_at)
      VALUES ${values}
    `);

    // Create corresponding user profiles
    const profiles = users.map(u => `('${u.id}', 'Test User ${u.id.slice(0, 8)}', null, null, '${u.created_at.toISOString()}', '${u.updated_at.toISOString()}')`);
    await this.pool.query(`
      INSERT INTO user_profiles (user_id, display_name, phone, location, created_at, updated_at)
      VALUES ${profiles.join(', ')}
    `);
  }

  private async createTestBills(count: number): Promise<void> {
    logger.info(`📄 Creating ${count} test bills...`, { component: 'MigrationTest' });

    const sponsors = await this.pool.query('SELECT id FROM users LIMIT 10');
    const sponsorIds = sponsors.rows.map(r => r.id);

    const bills: Bill[] = [];
    const categories = ['health', 'education', 'infrastructure', 'economy', 'security'];
    const statuses = ['introduced', 'committee', 'floor', 'passed', 'failed'];

    for (let i = 0; i < count; i++) {
      const introducedDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      bills.push({
        id: crypto.randomUUID(),
        title: `Test Bill ${i}: ${['Healthcare Reform', 'Education Funding', 'Infrastructure Development', 'Economic Policy', 'Security Enhancement'][i % 5]} Act`,
        summary: `A comprehensive bill addressing ${categories[i % categories.length]} issues in Kenya.`,
        bill_number: `B${String(i + 1).padStart(3, '0')}-2024`,
        category: categories[i % categories.length],
        status: statuses[i % statuses.length],
        introduced_date: introducedDate,
        sponsor_id: sponsorIds[i % sponsorIds.length],
        created_at: introducedDate,
        updated_at: new Date()
      });
    }

    const values = bills.map(b => `('${b.id}', '${b.title.replace(/'/g, "''")}', '${b.summary.replace(/'/g, "''")}', '${b.bill_number}', '${b.category}', '${b.status}', '${b.introduced_date.toISOString()}', '${b.sponsor_id}', '${b.created_at.toISOString()}', '${b.updated_at.toISOString()}')`).join(', ');
    await this.pool.query(`
      INSERT INTO bills (id, title, summary, bill_number, category, status, introduced_date, sponsor_id, created_at, updated_at)
      VALUES ${values}
    `);
  }

  private async createTestEngagement(count: number): Promise<void> {
    logger.info(`💬 Creating ${count} test comments and engagement...`, { component: 'MigrationTest' });

    const users = await this.pool.query('SELECT id FROM users');
    const bills = await this.pool.query('SELECT id FROM bills');
    const userIds = users.rows.map(r => r.id);
    const billIds = bills.rows.map(r => r.id);

    const comments: Comment[] = [];
    const sentiments = ['support', 'oppose', 'neutral'];
    const commentTexts = [
      'This bill is crucial for our community.',
      'I have concerns about the implementation.',
      'Great initiative that needs more discussion.',
      'This addresses important issues we face.',
      'More details needed before forming an opinion.'
    ];

    for (let i = 0; i < count; i++) {
      const createdDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      comments.push({
        id: crypto.randomUUID(),
        bill_id: billIds[i % billIds.length],
        user_id: userIds[i % userIds.length],
        content: commentTexts[i % commentTexts.length],
        sentiment: sentiments[i % sentiments.length],
        is_expert: Math.random() < 0.1, // 10% are expert comments
        created_at: createdDate,
        updated_at: createdDate
      });
    }

    const values = comments.map(c => `('${c.id}', '${c.bill_id}', '${c.user_id}', '${c.content.replace(/'/g, "''")}', '${c.sentiment}', ${c.is_expert}, '${c.created_at.toISOString()}', '${c.updated_at.toISOString()}')`).join(', ');
    await this.pool.query(`
      INSERT INTO comments (id, bill_id, user_id, content, sentiment, is_expert, created_at, updated_at)
      VALUES ${values}
    `);

    // Create bill engagement records
    const engagement = bills.rows.map(bill => ({
      bill_id: bill.id,
      total_views: Math.floor(Math.random() * 1000) + 100,
      total_comments: comments.filter(c => c.bill_id === bill.id).length,
      unique_viewers: Math.floor(Math.random() * 500) + 50,
      last_activity: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    }));

    const engagementValues = engagement.map(e => `('${e.bill_id}', ${e.total_views}, ${e.total_comments}, ${e.unique_viewers}, '${e.last_activity.toISOString()}')`).join(', ');
    await this.pool.query(`
      INSERT INTO bill_engagement (bill_id, total_views, total_comments, unique_viewers, last_activity)
      VALUES ${engagementValues}
    `);
  }

  private async createTestNotifications(count: number): Promise<void> {
    logger.info(`🔔 Creating ${count} test notifications...`, { component: 'MigrationTest' });

    const users = await this.pool.query('SELECT id FROM users');
    const userIds = users.rows.map(r => r.id);

    const notifications: Notification[] = [];
    const types = ['bill_update', 'comment_reply', 'expert_analysis', 'voting_reminder'];
    const messages = [
      'A bill you are following has been updated.',
      'Someone replied to your comment.',
      'New expert analysis available.',
      'Important voting deadline approaching.'
    ];

    for (let i = 0; i < count; i++) {
      const createdDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      notifications.push({
        id: crypto.randomUUID(),
        user_id: userIds[i % userIds.length],
        type: types[i % types.length],
        title: messages[i % messages.length].split('.')[0],
        message: messages[i % messages.length],
        is_read: Math.random() < 0.7, // 70% read
        created_at: createdDate
      });
    }

    const values = notifications.map(n => `('${n.id}', '${n.user_id}', '${n.type}', '${n.title.replace(/'/g, "''")}', '${n.message.replace(/'/g, "''")}', ${n.is_read}, '${n.created_at.toISOString()}')`).join(', ');
    await this.pool.query(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES ${values}
    `);

    // Create notification preferences
    const preferences = userIds.map(userId => `('${userId}', true, true, true, true, '${new Date().toISOString()}')`);
    await this.pool.query(`
      INSERT INTO alert_preferences (user_id, bill_updates, comment_replies, expert_analysis, voting_reminders, created_at)
      VALUES ${preferences.join(', ')}
    `);
  }

  private async testMigration(filename: string): Promise<MigrationTestResult> {
    const startTime = Date.now();
    const result: MigrationTestResult = {
      migration: filename,
      status: 'pass',
      duration: 0,
      dataIntegrityChecks: []
    };

    try {
      logger.info(`🧪 Testing migration: ${filename}`, { component: 'MigrationTest' });

      // Create a savepoint for rollback
      await this.pool.query('SAVEPOINT migration_test');

      // Read and execute the migration
      const migrationPath = path.join(process.cwd(), 'drizzle', filename);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Execute migration in a transaction
      await this.pool.query('BEGIN');
      await this.pool.query(sql);

      // Run data integrity checks during migration
      result.dataIntegrityChecks = await this.runIntegrityChecks();

      // Check for any integrity violations
      const failedChecks = result.dataIntegrityChecks.filter(check => check.status === 'fail');
      if (failedChecks.length > 0) {
        result.status = 'fail';
        result.error = `Data integrity violations: ${failedChecks.map(c => c.check).join(', ')}`;
      }

      await this.pool.query('COMMIT');

    } catch (error) {
      result.status = 'fail';
      result.error = error.message;

      // Rollback to savepoint
      try {
        await this.pool.query('ROLLBACK TO SAVEPOINT migration_test');
      } catch (rollbackError) {
        logger.error('Failed to rollback migration test', { component: 'MigrationTest' }, rollbackError.message);
      }
    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  private async runIntegrityChecks(): Promise<DataIntegrityCheck[]> {
    const checks: DataIntegrityCheck[] = [];

    // Check foreign key constraints
    try {
      const fkCheck = await this.pool.query(`
        SELECT
          tc.table_name,
          tc.constraint_name,
          COUNT(*) as violations
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        GROUP BY tc.table_name, tc.constraint_name
        HAVING COUNT(*) > 0
      `);

      checks.push({
        table: 'all',
        check: 'foreign_key_constraints',
        status: fkCheck.rows.length === 0 ? 'pass' : 'fail',
        details: fkCheck.rows
      });
    } catch (error) {
      checks.push({
        table: 'all',
        check: 'foreign_key_constraints',
        status: 'fail',
        details: error.message
      });
    }

    // Check for orphaned records
    const orphanChecks = [
      {
        table: 'comments',
        check: 'orphaned_comments',
        query: `
          SELECT COUNT(*) as count FROM comments c
          LEFT JOIN bills b ON c.bill_id = b.id
          WHERE b.id IS NULL
        `
      },
      {
        table: 'bill_engagement',
        check: 'orphaned_engagement',
        query: `
          SELECT COUNT(*) as count FROM bill_engagement be
          LEFT JOIN bills b ON be.bill_id = b.id
          WHERE b.id IS NULL
        `
      },
      {
        table: 'notifications',
        check: 'orphaned_notifications',
        query: `
          SELECT COUNT(*) as count FROM notifications n
          LEFT JOIN users u ON n.user_id = u.id
          WHERE u.id IS NULL
        `
      }
    ];

    for (const check of orphanChecks) {
      try {
        const result = await this.pool.query(check.query);
        const count = parseInt(result.rows[0].count);

        checks.push({
          table: check.table,
          check: check.check,
          status: count === 0 ? 'pass' : 'fail',
          details: { orphaned_count: count }
        });
      } catch (error) {
        checks.push({
          table: check.table,
          check: check.check,
          status: 'fail',
          details: error.message
        });
      }
    }

    return checks;
  }

  private async runFinalIntegrityChecks(): Promise<void> {
    logger.info('🔍 Running final data integrity checks...', { component: 'MigrationTest' });

    const finalChecks = await this.runIntegrityChecks();
    const failedChecks = finalChecks.filter(check => check.status === 'fail');

    if (failedChecks.length > 0) {
      logger.error('❌ Final integrity checks failed:', { component: 'MigrationTest' }, failedChecks);
      throw new Error(`Data integrity violations detected: ${failedChecks.length} checks failed`);
    }

    logger.info('✅ All final integrity checks passed', { component: 'MigrationTest' });
  }

  async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMigrations: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'pass').length,
        failed: this.testResults.filter(r => r.status === 'fail').length,
        warnings: this.testResults.filter(r => r.status === 'warn').length,
        totalDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.testResults,
      testDataScale: process.env.TEST_DATA_SCALE || 'medium'
    };

    fs.writeFileSync('migration-test-results.json', JSON.stringify(report, null, 2));
    logger.info('📊 Migration test report generated: migration-test-results.json', { component: 'MigrationTest' });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const tester = new MigrationTester(process.env.DATABASE_URL);

  try {
    await tester.runMigrationTests();
    await tester.generateReport();

    const results = JSON.parse(fs.readFileSync('migration-test-results.json', 'utf8'));
    const hasFailures = results.summary.failed > 0;

    if (hasFailures) {
      console.error('❌ Migration tests failed - check migration-test-results.json for details');
      process.exit(1);
    } else {
      console.log('✅ All migration tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Migration testing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('migration-testing')) {
  main().catch((error) => {
    console.error('Migration testing error:', error);
    process.exit(1);
  });
}

export { MigrationTester };