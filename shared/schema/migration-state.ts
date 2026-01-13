// ============================================================================
// MIGRATION STATE TRACKING - Track Type Migration Progress
// ============================================================================
// Manages and tracks the state of type system migrations
// Provides rollback capabilities and migration history

import fs from 'fs/promises';
import path from 'path';

interface MigrationEntry {
  readonly id: string;
  readonly name: string;
  readonly timestamp: string;
  readonly status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  readonly filesAffected: string[];
  readonly changes: number;
  readonly error?: string;
  readonly rollbackData?: Record<string, string>;
}

interface MigrationState {
  readonly version: string;
  readonly migrations: MigrationEntry[];
  readonly lastUpdated: string;
  readonly currentVersion: string;
  readonly targetVersion: string;
}

const MIGRATIONS_DIR = path.join(process.cwd(), '.migrations');
const STATE_FILE = path.join(MIGRATIONS_DIR, 'state.json');

/**
 * Initialize migration state tracking
 */
export async function initMigrationTracking(): Promise<void> {
  try {
    await fs.mkdir(MIGRATIONS_DIR, { recursive: true });

    // Create initial state file if it doesn't exist
    try {
      await fs.access(STATE_FILE);
    } catch {
      const initialState: MigrationState = {
        version: '1.0.0',
        migrations: [],
        lastUpdated: new Date().toISOString(),
        currentVersion: '1.0.0',
        targetVersion: '2.0.0',
      };
      await fs.writeFile(STATE_FILE, JSON.stringify(initialState, null, 2));
    }
  } catch (error) {
    console.error('Failed to initialize migration tracking:', error);
    throw error;
  }
}

/**
 * Get current migration state
 */
export async function getMigrationState(): Promise<MigrationState> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data) as MigrationState;
  } catch (error) {
    console.error('Failed to read migration state:', error);
    throw error;
  }
}

/**
 * Record a migration entry
 */
export async function recordMigration(
  entry: Omit<MigrationEntry, 'id' | 'timestamp'>
): Promise<MigrationEntry> {
  const state = await getMigrationState();

  const newEntry: MigrationEntry = {
    ...entry,
    id: `migration-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  state.migrations.push(newEntry);
  state.lastUpdated = new Date().toISOString();

  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));

  return newEntry;
}

/**
 * Update migration status
 */
export async function updateMigrationStatus(
  migrationId: string,
  status: MigrationEntry['status'],
  options?: {
    readonly error?: string;
    readonly changes?: number;
  }
): Promise<MigrationEntry | undefined> {
  const state = await getMigrationState();
  const migration = state.migrations.find((m) => m.id === migrationId);

  if (!migration) {
    return undefined;
  }

  migration.status = status;
  if (options?.error) migration.error = options.error;
  if (options?.changes !== undefined) migration.changes = options.changes;

  state.lastUpdated = new Date().toISOString();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));

  return migration;
}

/**
 * Get migration history
 */
export async function getMigrationHistory(): Promise<MigrationEntry[]> {
  const state = await getMigrationState();
  return state.migrations.sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Get migration by ID
 */
export async function getMigrationById(migrationId: string): Promise<MigrationEntry | undefined> {
  const state = await getMigrationState();
  return state.migrations.find((m) => m.id === migrationId);
}

/**
 * Rollback a migration
 */
export async function rollbackMigration(migrationId: string): Promise<boolean> {
  const migration = await getMigrationById(migrationId);

  if (!migration) {
    console.error(`Migration ${migrationId} not found`);
    return false;
  }

  if (!migration.rollbackData) {
    console.error(`No rollback data available for migration ${migrationId}`);
    return false;
  }

  try {
    // Restore rollback data
    for (const [filePath, content] of Object.entries(migration.rollbackData)) {
      await fs.writeFile(filePath, content, 'utf-8');
    }

    // Update migration status
    await updateMigrationStatus(migrationId, 'rolled-back');

    console.log(`✅ Migration ${migrationId} rolled back successfully`);
    return true;
  } catch (error) {
    console.error(`Failed to rollback migration ${migrationId}:`, error);
    return false;
  }
}

/**
 * Get migration statistics
 */
export async function getMigrationStats(): Promise<{
  readonly total: number;
  readonly completed: number;
  readonly pending: number;
  readonly failed: number;
  readonly rolledBack: number;
  readonly totalChanges: number;
  readonly totalFilesAffected: number;
}> {
  const state = await getMigrationState();

  const stats = {
    total: state.migrations.length,
    completed: state.migrations.filter((m) => m.status === 'completed').length,
    pending: state.migrations.filter((m) => m.status === 'pending').length,
    failed: state.migrations.filter((m) => m.status === 'failed').length,
    rolledBack: state.migrations.filter((m) => m.status === 'rolled-back').length,
    totalChanges: state.migrations.reduce((sum, m) => sum + m.changes, 0),
    totalFilesAffected: new Set(
      state.migrations.flatMap((m) => m.filesAffected)
    ).size,
  };

  return stats;
}

/**
 * Generate migration report
 */
export async function generateMigrationReport(): Promise<string> {
  const history = await getMigrationHistory();
  const stats = await getMigrationStats();

  let report = '# Migration Tracking Report\n\n';

  report += '## Statistics\n\n';
  report += `- **Total Migrations**: ${stats.total}\n`;
  report += `- **Completed**: ✅ ${stats.completed}\n`;
  report += `- **Pending**: ⏳ ${stats.pending}\n`;
  report += `- **Failed**: ❌ ${stats.failed}\n`;
  report += `- **Rolled Back**: ↩️ ${stats.rolledBack}\n`;
  report += `- **Total Changes**: ${stats.totalChanges}\n`;
  report += `- **Total Files Affected**: ${stats.totalFilesAffected}\n\n`;

  report += '## Migration History\n\n';
  for (const migration of history) {
    const statusIcon = {
      completed: '✅',
      pending: '⏳',
      failed: '❌',
      'in-progress': '⚙️',
      'rolled-back': '↩️',
    }[migration.status];

    report += `### ${statusIcon} ${migration.name}\n\n`;
    report += `- **ID**: ${migration.id}\n`;
    report += `- **Timestamp**: ${migration.timestamp}\n`;
    report += `- **Status**: ${migration.status}\n`;
    report += `- **Files Affected**: ${migration.filesAffected.length}\n`;
    report += `- **Changes**: ${migration.changes}\n`;

    if (migration.error) {
      report += `- **Error**: ${migration.error}\n`;
    }

    report += '\n';
  }

  return report;
}

/**
 * Clear migration history
 */
export async function clearMigrationHistory(): Promise<void> {
  const state = await getMigrationState();
  state.migrations = [];
  state.lastUpdated = new Date().toISOString();
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Export migration state for backup
 */
export async function exportMigrationState(backupPath: string): Promise<void> {
  const state = await getMigrationState();
  await fs.writeFile(backupPath, JSON.stringify(state, null, 2));
  console.log(`✅ Migration state exported to: ${backupPath}`);
}

/**
 * Import migration state from backup
 */
export async function importMigrationState(backupPath: string): Promise<void> {
  const data = await fs.readFile(backupPath, 'utf-8');
  const state = JSON.parse(data) as MigrationState;
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`✅ Migration state imported from: ${backupPath}`);
}
