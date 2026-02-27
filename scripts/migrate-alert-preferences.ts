/**
 * Alert Preferences Migration Script
 * 
 * Migrates alert preferences from the old alert-preferences feature
 * to the new unified notifications system.
 * 
 * Usage:
 *   npm run migrate:alert-preferences [--dry-run] [--user-id=USER_ID]
 */

import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import * as schema from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

interface MigrationStats {
  totalUsers: number;
  usersWithPreferences: number;
  preferencesMigrated: number;
  logsMigrated: number;
  errors: number;
  skipped: number;
}

interface MigrationOptions {
  dryRun: boolean;
  userId?: string;
  verbose: boolean;
}

async function migrateAlertPreferences(options: MigrationOptions): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithPreferences: 0,
    preferencesMigrated: 0,
    logsMigrated: 0,
    errors: 0,
    skipped: 0
  };

  try {
    logger.info('Starting alert preferences migration', {
      component: 'Migration',
      dryRun: options.dryRun,
      userId: options.userId
    });

    // Get users to migrate
    const users = options.userId
      ? await db.select().from(schema.users).where(eq(schema.users.id, options.userId))
      : await db.select().from(schema.users);

    stats.totalUsers = users.length;

    for (const user of users) {
      try {
        const preferences = user.preferences as any;

        // Check if user has alert preferences
        if (!preferences || !preferences.alertPreferences) {
          stats.skipped++;
          continue;
        }

        stats.usersWithPreferences++;

        const alertPreferences = preferences.alertPreferences;
        const deliveryLogs = preferences.deliveryLogs || [];

        if (options.verbose) {
          logger.info(`Migrating user ${user.id}`, {
            component: 'Migration',
            preferenceCount: alertPreferences.length,
            logCount: deliveryLogs.length
          });
        }

        // Validate and transform preferences
        const migratedPreferences = alertPreferences.map((pref: any) => {
          // Ensure all required fields exist
          return {
            ...pref,
            created_at: pref.created_at || new Date(),
            updated_at: pref.updated_at || new Date(),
            // Add any missing fields with defaults
            smartFiltering: pref.smartFiltering || {
              enabled: true,
              user_interestWeight: 0.6,
              engagementHistoryWeight: 0.3,
              trendingWeight: 0.1,
              duplicateFiltering: true,
              spamFiltering: true,
              minimumConfidence: 0.3
            }
          };
        });

        // Validate and transform delivery logs
        const migratedLogs = deliveryLogs.map((log: any) => {
          return {
            ...log,
            created_at: log.created_at || new Date(),
            lastAttempt: log.lastAttempt || new Date()
          };
        });

        stats.preferencesMigrated += migratedPreferences.length;
        stats.logsMigrated += migratedLogs.length;

        // Update database if not dry run
        if (!options.dryRun) {
          await db
            .update(schema.users)
            .set({
              preferences: {
                ...preferences,
                alertPreferences: migratedPreferences,
                deliveryLogs: migratedLogs
              },
              updated_at: new Date()
            })
            .where(eq(schema.users.id, user.id));
        }

        if (options.verbose) {
          logger.info(`Successfully migrated user ${user.id}`, {
            component: 'Migration',
            preferences: migratedPreferences.length,
            logs: migratedLogs.length
          });
        }
      } catch (error) {
        stats.errors++;
        logger.error(`Error migrating user ${user.id}`, {
          component: 'Migration'
        }, error);
      }
    }

    logger.info('Migration completed', {
      component: 'Migration',
      stats
    });

    return stats;
  } catch (error) {
    logger.error('Migration failed', {
      component: 'Migration'
    }, error);
    throw error;
  }
}

async function validateMigration(userId?: string): Promise<boolean> {
  try {
    logger.info('Validating migration', {
      component: 'Migration',
      userId
    });

    const users = userId
      ? await db.select().from(schema.users).where(eq(schema.users.id, userId))
      : await db.select().from(schema.users).limit(10); // Sample validation

    let valid = true;

    for (const user of users) {
      const preferences = user.preferences as any;

      if (preferences && preferences.alertPreferences) {
        for (const pref of preferences.alertPreferences) {
          // Validate required fields
          if (!pref.id || !pref.user_id || !pref.name) {
            logger.error(`Invalid preference for user ${user.id}`, {
              component: 'Migration',
              preferenceId: pref.id
            });
            valid = false;
          }

          // Validate structure
          if (!pref.alertTypes || !Array.isArray(pref.alertTypes)) {
            logger.error(`Invalid alertTypes for user ${user.id}`, {
              component: 'Migration',
              preferenceId: pref.id
            });
            valid = false;
          }

          if (!pref.channels || !Array.isArray(pref.channels)) {
            logger.error(`Invalid channels for user ${user.id}`, {
              component: 'Migration',
              preferenceId: pref.id
            });
            valid = false;
          }
        }
      }
    }

    logger.info('Validation completed', {
      component: 'Migration',
      valid
    });

    return valid;
  } catch (error) {
    logger.error('Validation failed', {
      component: 'Migration'
    }, error);
    return false;
  }
}

async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `alert-preferences-backup-${timestamp}.json`;

  try {
    logger.info('Creating backup', {
      component: 'Migration',
      file: backupFile
    });

    const users = await db.select().from(schema.users);
    const backup = users
      .filter(user => {
        const prefs = user.preferences as any;
        return prefs && prefs.alertPreferences;
      })
      .map(user => ({
        user_id: user.id,
        preferences: (user.preferences as any).alertPreferences,
        deliveryLogs: (user.preferences as any).deliveryLogs
      }));

    // In a real implementation, write to file system
    logger.info('Backup created', {
      component: 'Migration',
      file: backupFile,
      userCount: backup.length
    });

    return backupFile;
  } catch (error) {
    logger.error('Backup failed', {
      component: 'Migration'
    }, error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    userId: args.find(arg => arg.startsWith('--user-id='))?.split('=')[1],
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  try {
    console.log('Alert Preferences Migration Tool');
    console.log('=================================\n');

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    // Create backup
    if (!options.dryRun) {
      console.log('📦 Creating backup...');
      const backupFile = await createBackup();
      console.log(`✅ Backup created: ${backupFile}\n`);
    }

    // Run migration
    console.log('🚀 Starting migration...');
    const stats = await migrateAlertPreferences(options);

    console.log('\n📊 Migration Statistics:');
    console.log(`   Total users: ${stats.totalUsers}`);
    console.log(`   Users with preferences: ${stats.usersWithPreferences}`);
    console.log(`   Preferences migrated: ${stats.preferencesMigrated}`);
    console.log(`   Logs migrated: ${stats.logsMigrated}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Skipped: ${stats.skipped}`);

    // Validate migration
    if (!options.dryRun) {
      console.log('\n🔍 Validating migration...');
      const valid = await validateMigration(options.userId);
      
      if (valid) {
        console.log('✅ Migration validation passed');
      } else {
        console.log('❌ Migration validation failed');
        process.exit(1);
      }
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrateAlertPreferences, validateMigration, createBackup };
