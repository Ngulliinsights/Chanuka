import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { promises as fs } from 'fs';
import { join } from 'path';
import { CleanupOrchestrator, FileCategory } from '../orchestrator';
import { AnalysisType, FindingType } from '@shared/types';
import { logger } from '@shared/core/src/observability/logging';

describe('CleanupOrchestrator', () => {
  let tempDir: string;
  let orchestrator: CleanupOrchestrator;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = join(process.cwd(), 'test-cleanup-temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create test files
    await fs.writeFile(join(tempDir, 'package.json'), '{}');
    await fs.writeFile(join(tempDir, 'README.md'), '# Test');
    await fs.writeFile(join(tempDir, 'migrate-test.sh'), '#!/bin/bash\necho "test"');
    await fs.writeFile(join(tempDir, 'test-analysis.md'), '# Analysis');
    await fs.writeFile(join(tempDir, 'debug-script.sh'), '#!/bin/bash\necho "debug"');
    await fs.writeFile(join(tempDir, 'test-file.js'), 'logger.info('test', { component: 'Chanuka' });');
    await fs.writeFile(join(tempDir, '.env.staging'), 'NODE_ENV=staging');
    
    orchestrator = new CleanupOrchestrator(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('analyzeRootDirectory', () => {
    it('should analyze root directory and categorize files correctly', async () => {
      const result = await orchestrator.analyzeRootDirectory();
      
      expect(result.type).toBe(AnalysisType.ROOT_DIRECTORY_CLEANUP);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.metrics.filesAnalyzed).toBeGreaterThan(0);
      
      // Check that redundant files are identified
      const redundantFindings = result.findings.filter(f => 
        f.type === FindingType.REDUNDANT_FILE
      );
      expect(redundantFindings.length).toBeGreaterThan(0);
      
      // Check that essential files are not marked for removal
      const packageJsonFinding = result.findings.find(f => 
        f.location === 'package.json'
      );
      expect(packageJsonFinding).toBeUndefined();
      
      const readmeFinding = result.findings.find(f => 
        f.location === 'README.md'
      );
      expect(readmeFinding).toBeUndefined();
    });

    it('should identify migration scripts for removal', async () => {
      const result = await orchestrator.analyzeRootDirectory();
      
      const migrationScriptFinding = result.findings.find(f => 
        f.location === 'migrate-test.sh'
      );
      expect(migrationScriptFinding).toBeDefined();
      expect(migrationScriptFinding?.type).toBe(FindingType.REDUNDANT_FILE);
    });

    it('should identify analysis files for consolidation', async () => {
      const result = await orchestrator.analyzeRootDirectory();
      
      const analysisFinding = result.findings.find(f => 
        f.location === 'test-analysis.md'
      );
      expect(analysisFinding).toBeDefined();
      expect(analysisFinding?.type).toBe(FindingType.OBSOLETE_CODE);
    });

    it('should identify temporary test files', async () => {
      const result = await orchestrator.analyzeRootDirectory();
      
      const testFileFinding = result.findings.find(f => 
        f.location === 'test-file.js'
      );
      expect(testFileFinding).toBeDefined();
      expect(testFileFinding?.type).toBe(FindingType.REDUNDANT_FILE);
    });

    it('should calculate meaningful metrics', async () => {
      const result = await orchestrator.analyzeRootDirectory();
      
      expect(result.metrics.filesAnalyzed).toBeGreaterThan(0);
      expect(result.metrics.issuesFound).toBeGreaterThan(0);
      expect(result.metrics.estimatedSavings.diskSpace).toBeGreaterThan(0);
      expect(result.metrics.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('createCleanupPlan', () => {
    it('should create a comprehensive cleanup plan', async () => {
      const analysis = await orchestrator.analyzeRootDirectory();
      const plan = await orchestrator.createCleanupPlan(analysis);
      
      expect(plan.id).toBeDefined();
      expect(plan.timestamp).toBeInstanceOf(Date);
      expect(plan.filesToRemove.length).toBeGreaterThan(0);
      expect(plan.safetyChecks.length).toBeGreaterThan(0);
      
      // Check that essential files are not in removal list
      const packageJsonRemoval = plan.filesToRemove.find(op => 
        op.path === 'package.json'
      );
      expect(packageJsonRemoval).toBeUndefined();
      
      // Check that redundant files are in removal list
      const migrationScriptRemoval = plan.filesToRemove.find(op => 
        op.path === 'migrate-test.sh'
      );
      expect(migrationScriptRemoval).toBeDefined();
    });

    it('should include safety checks in the plan', async () => {
      const analysis = await orchestrator.analyzeRootDirectory();
      const plan = await orchestrator.createCleanupPlan(analysis);
      
      expect(plan.safetyChecks.length).toBeGreaterThan(0);
      
      const backupCheck = plan.safetyChecks.find(check => 
        check.type === 'backup_verification'
      );
      expect(backupCheck).toBeDefined();
      expect(backupCheck?.critical).toBe(true);
      
      const importCheck = plan.safetyChecks.find(check => 
        check.type === 'import_validation'
      );
      expect(importCheck).toBeDefined();
    });

    it('should categorize file operations correctly', async () => {
      const analysis = await orchestrator.analyzeRootDirectory();
      const plan = await orchestrator.createCleanupPlan(analysis);
      
      // Check file operation categories
      const migrationScript = plan.filesToRemove.find(op => 
        op.path === 'migrate-test.sh'
      );
      expect(migrationScript?.category).toBe(FileCategory.MIGRATION_SCRIPT);
      
      const testFile = plan.filesToRemove.find(op => 
        op.path === 'test-file.js'
      );
      expect(testFile?.category).toBe(FileCategory.TEST_FILE);
    });
  });
});











































