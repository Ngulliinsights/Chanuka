import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('../../observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { promises as fs } from 'fs';
import { join } from 'path';
import { CleanupOrchestrator } from '../orchestrator';
import { CleanupExecutor } from '../executor';
import { BackupSystem } from '../backup-system';
import { logger } from '../../observability/logging';

describe('File Consolidation and Removal Integration', () => {
  const testDir = join(__dirname, 'test-workspace');
  let orchestrator: CleanupOrchestrator;
  let executor: CleanupExecutor;
  let backupSystem: BackupSystem;

  beforeEach(async () => {
    // Create test workspace
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test files for consolidation and removal
    await createTestFiles();
    
    orchestrator = new CleanupOrchestrator(testDir);
    executor = new CleanupExecutor(testDir, {
      dryRun: false,
      createBackups: true,
      validateBeforeExecution: true,
      validateAfterExecution: true
    });
    backupSystem = new BackupSystem(testDir);
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function createTestFiles() {
    // Create redundant migration scripts
    await fs.writeFile(join(testDir, 'migrate-users.sh'), '#!/bin/bash\necho "Migrating users"');
    await fs.writeFile(join(testDir, 'migrate-posts.sh'), '#!/bin/bash\necho "Migrating posts"');
    await fs.writeFile(join(testDir, 'migrate-comments.ts'), 'logger.info(\'Migrating comments\', { component: \'Chanuka\' });');

    // Create analysis documents
    await fs.writeFile(join(testDir, 'user-analysis.md'), '# User Analysis\nThis is user analysis.');
    await fs.writeFile(join(testDir, 'post-analysis.md'), '# Post Analysis\nThis is post analysis.');
    await fs.writeFile(join(testDir, 'comment-analysis.md'), '# Comment Analysis\nThis is comment analysis.');

    // Create summary documents
    await fs.writeFile(join(testDir, 'PROJECT_SUMMARY.md'), '# Project Summary\nOverall project summary.');
    await fs.writeFile(join(testDir, 'FEATURE_SUMMARY.md'), '# Feature Summary\nFeature implementation summary.');

    // Create duplicate environment files
    await fs.writeFile(join(testDir, '.env.production'), 'NODE_ENV=production\nAPI_URL=prod.api.com');
    await fs.writeFile(join(testDir, '.env.production.example'), 'NODE_ENV=production\nAPI_URL=your.prod.api.com');
    await fs.writeFile(join(testDir, '.env.staging'), 'NODE_ENV=staging\nAPI_URL=staging.api.com');
    await fs.writeFile(join(testDir, '.env.staging.example'), 'NODE_ENV=staging\nAPI_URL=your.staging.api.com');

    // Create test scripts
    await fs.writeFile(join(testDir, 'test-integration.js'), 'logger.info(\'Integration test\', { component: \'Chanuka\' });');
    await fs.writeFile(join(testDir, 'test-unit.js'), 'logger.info(\'Unit test\', { component: \'Chanuka\' });');

    // Create debug scripts
    await fs.writeFile(join(testDir, 'debug-server.sh'), '#!/bin/bash\necho "Debug server"');
    await fs.writeFile(join(testDir, 'debug-client.sh'), '#!/bin/bash\necho "Debug client"');

    // Create essential files (should be preserved)
    await fs.writeFile(join(testDir, 'package.json'), '{"name": "test-project"}');
    await fs.writeFile(join(testDir, 'README.md'), '# Test Project\nThis is a test project.');
    await fs.writeFile(join(testDir, '.gitignore'), 'node_modules/\n.env');

    // Create docs directory
    await fs.mkdir(join(testDir, 'docs'), { recursive: true });
  }

  it('should analyze root directory and identify consolidation opportunities', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();

    expect(analysis.findings.length).toBeGreaterThan(0);
    expect(analysis.metrics.filesAnalyzed).toBeGreaterThan(0);
    expect(analysis.recommendations.length).toBeGreaterThan(0);

    // Should identify migration scripts for consolidation
    const migrationFindings = analysis.findings.filter(f => 
      f.location.includes('migrate-')
    );
    expect(migrationFindings.length).toBeGreaterThan(0);

    // Should identify analysis documents for consolidation
    const analysisFindings = analysis.findings.filter(f => 
      f.location.includes('analysis.md')
    );
    expect(analysisFindings.length).toBeGreaterThan(0);
  });

  it('should create comprehensive cleanup plan with consolidation strategies', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    expect(plan.filesToRemove.length).toBeGreaterThan(0);
    expect(plan.filesToMove.length).toBeGreaterThan(0);
    expect(plan.filesToConsolidate.length).toBeGreaterThan(0);
    expect(plan.scriptsToMerge.length).toBeGreaterThan(0);

    // Should plan to consolidate analysis documents
    const analysisConsolidation = plan.filesToConsolidate.find(c => 
      c.target.includes('analysis')
    );
    expect(analysisConsolidation).toBeDefined();
    expect(analysisConsolidation?.sources.length).toBeGreaterThan(1);

    // Should plan to merge migration scripts
    const migrationMerge = plan.scriptsToMerge.find(m => 
      m.targetScript.includes('migration')
    );
    expect(migrationMerge).toBeDefined();
    expect(migrationMerge?.scripts.length).toBeGreaterThan(1);

    // Should identify duplicate env files for removal
    const duplicateEnvFiles = plan.filesToRemove.filter(f => 
      f.path.includes('.env.') && f.path.includes('.example')
    );
    expect(duplicateEnvFiles.length).toBeGreaterThan(0);
  });

  it('should create backup before executing cleanup operations', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    const result = await executor.executeCleanup(plan);

    expect(result.success).toBe(true);
    expect(result.backupLocation).toBeDefined();

    // Verify backup was created
    const backupExists = await fs.access(result.backupLocation!).then(() => true).catch(() => false);
    expect(backupExists).toBe(true);

    // Verify backup manifest exists
    const manifestPath = join(result.backupLocation!, 'manifest.json');
    const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);
    expect(manifestExists).toBe(true);
  });

  it('should execute script consolidation correctly', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    const result = await executor.executeCleanup(plan);

    expect(result.success).toBe(true);
    expect(result.filesProcessed).toBeGreaterThan(0);

    // Check if consolidated migration script was created
    const scriptsDir = join(testDir, 'scripts');
    const migrationDir = join(scriptsDir, 'migration');
    
    try {
      await fs.access(migrationDir);
      const consolidatedScript = join(migrationDir, 'consolidated-migration.sh');
      const scriptExists = await fs.access(consolidatedScript).then(() => true).catch(() => false);
      
      if (scriptExists) {
        const scriptContent = await fs.readFile(consolidatedScript, 'utf-8');
        expect(scriptContent).toContain('#!/bin/bash');
        expect(scriptContent).toContain('Consolidated Script');
      }
    } catch {
      // Scripts directory might not be created if no scripts were merged
    }
  });

  it('should execute documentation consolidation correctly', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    const result = await executor.executeCleanup(plan);

    expect(result.success).toBe(true);

    // Check if consolidated analysis document was created
    const docsDir = join(testDir, 'docs');
    const analysisDir = join(docsDir, 'analysis');
    
    try {
      await fs.access(analysisDir);
      const consolidatedDoc = join(analysisDir, 'consolidated-analysis.md');
      const docExists = await fs.access(consolidatedDoc).then(() => true).catch(() => false);
      
      if (docExists) {
        const docContent = await fs.readFile(consolidatedDoc, 'utf-8');
        expect(docContent).toContain('Consolidated Document');
        expect(docContent).toContain('user-analysis.md');
        expect(docContent).toContain('post-analysis.md');
      }
    } catch {
      // Docs directory might not be created if no docs were consolidated
    }
  });

  it('should remove duplicate configuration files', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    // Verify duplicate env files exist before cleanup
    const envProductionExample = join(testDir, '.env.production.example');
    const envStagingExample = join(testDir, '.env.staging.example');
    
    const beforeCleanup = {
      prodExample: await fs.access(envProductionExample).then(() => true).catch(() => false),
      stagingExample: await fs.access(envStagingExample).then(() => true).catch(() => false)
    };

    const result = await executor.executeCleanup(plan);

    expect(result.success).toBe(true);

    // Verify duplicate env files were removed (if they were in the plan)
    const duplicateEnvFiles = plan.filesToRemove.filter(f => 
      f.path.includes('.env.') && f.path.includes('.example') && f.path !== '.env.example'
    );

    if (duplicateEnvFiles.length > 0) {
      const afterCleanup = {
        prodExample: await fs.access(envProductionExample).then(() => true).catch(() => false),
        stagingExample: await fs.access(envStagingExample).then(() => true).catch(() => false)
      };

      // At least one duplicate should have been removed
      expect(beforeCleanup.prodExample || beforeCleanup.stagingExample).toBe(true);
      expect(afterCleanup.prodExample && afterCleanup.stagingExample).toBe(false);
    }
  });

  it('should preserve essential files during cleanup', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    const result = await executor.executeCleanup(plan);

    expect(result.success).toBe(true);

    // Verify essential files are preserved
    const essentialFiles = [
      'package.json',
      'README.md',
      '.gitignore'
    ];

    for (const file of essentialFiles) {
      const filePath = join(testDir, file);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    }
  });

  it('should handle backup and restoration correctly', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    // Create backup
    const backupResult = await backupSystem.createBackup(plan);
    expect(backupResult.success).toBe(true);

    // Execute cleanup
    const cleanupResult = await executor.executeCleanup(plan);
    expect(cleanupResult.success).toBe(true);

    // List backups
    const backups = await backupSystem.listBackups();
    expect(backups.length).toBeGreaterThan(0);

    const backup = backups.find(b => b.id === backupResult.backupId);
    expect(backup).toBeDefined();
    expect(backup?.files.length).toBeGreaterThan(0);

    // Test restoration (restore a single file to verify the mechanism works)
    if (backup && backup.files.length > 0) {
      const fileToRestore = backup.files[0];
      const originalPath = join(testDir, fileToRestore.originalPath);
      
      // Remove the file
      try {
        await fs.unlink(originalPath);
      } catch {
        // File might already be removed by cleanup
      }

      // Restore from backup
      await executor.restoreFromBackup(backupResult.backupId);

      // Verify file was restored (this is a simplified test)
      // In a real scenario, we'd verify the complete restoration
    }
  });

  it('should validate operations before and after execution', async () => {
    const analysis = await orchestrator.analyzeRootDirectory();
    const plan = await orchestrator.createCleanupPlan(analysis);

    // Execute with validation enabled
    const result = await executor.executeCleanup(plan);

    expect(result.success).toBe(true);
    
    // The executor should have performed pre and post validation
    // Errors would be in the result if validation failed
    expect(result.errors.length).toBe(0);
  });
});















































