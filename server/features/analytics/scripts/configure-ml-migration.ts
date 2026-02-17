/**
 * ML Migration Configuration Script
 * 
 * Configures feature flags for gradual ML service migration rollout
 */

import { logger } from '@server/infrastructure/observability';

import { featureFlagsService } from '@/infrastructure/migration/feature-flags.service';

export interface MLMigrationConfig {
    enabled: boolean;
    rolloutPercentage: number;
    environment?: string;
    userIds?: string[];
    userGroups?: string[];
}

export class MLMigrationConfigurator {
    /**
     * Configure ML service migration with gradual rollout
     */
    static async configureGradualRollout(config: MLMigrationConfig): Promise<void> {
        try {
            logger.info('Configuring ML service migration', {
                component: 'analytics',
                operation: 'configureGradualRollout',
                config
            });

            // Update the ML service migration feature flag
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                name: 'utilities-ml-service-migration',
                enabled: config.enabled,
                rolloutPercentage: config.rolloutPercentage,
                conditions: {
                    environment: config.environment,
                    userIds: config.userIds,
                    userGroups: config.userGroups
                },
                fallbackEnabled: true
            });

            logger.info('ML service migration configured successfully', {
                component: 'analytics',
                operation: 'configureGradualRollout',
                enabled: config.enabled,
                rolloutPercentage: config.rolloutPercentage
            });
        } catch (error) {
            logger.error('Failed to configure ML service migration:', {
                component: 'analytics',
                operation: 'configureGradualRollout'
            }, error instanceof Error ? error : { message: String(error) });
            throw error;
        }
    }

    /**
     * Start gradual rollout with predefined phases
     */
    static async startGradualRollout(): Promise<void> {
        const phases = [
            { percentage: 1, description: 'Initial testing phase' },
            { percentage: 5, description: 'Early adopters phase' },
            { percentage: 10, description: 'Expanded testing phase' },
            { percentage: 25, description: 'Broader rollout phase' },
            { percentage: 50, description: 'Half rollout phase' },
            { percentage: 100, description: 'Full rollout phase' }
        ];

        logger.info('Starting gradual ML service rollout', {
            component: 'analytics',
            operation: 'startGradualRollout',
            phases: phases.length
        });

        // Start with 1% rollout
        await this.configureGradualRollout({
            enabled: true,
            rolloutPercentage: 1,
            environment: process.env.NODE_ENV
        });

        logger.info('ML service migration started at 1% rollout', {
            component: 'analytics',
            operation: 'startGradualRollout'
        });
    }

    /**
     * Increase rollout percentage
     */
    static async increaseRollout(newPercentage: number): Promise<void> {
        if (newPercentage < 0 || newPercentage > 100) {
            throw new Error('Rollout percentage must be between 0 and 100');
        }

        const currentFlag = featureFlagsService.getFlag('utilities-ml-service-migration');
        if (!currentFlag) {
            throw new Error('ML service migration flag not found');
        }

        logger.info('Increasing ML service rollout percentage', {
            component: 'analytics',
            operation: 'increaseRollout',
            currentPercentage: currentFlag.rolloutPercentage,
            newPercentage
        });

        await this.configureGradualRollout({
            enabled: true,
            rolloutPercentage: newPercentage,
            environment: currentFlag.conditions?.environment,
            userIds: currentFlag.conditions?.userIds,
            userGroups: currentFlag.conditions?.userGroups
        });
    }

    /**
     * Rollback to mock implementation
     */
    static async rollbackToMock(): Promise<void> {
        logger.info('Rolling back ML service to mock implementation', {
            component: 'analytics',
            operation: 'rollbackToMock'
        });

        await this.configureGradualRollout({
            enabled: false,
            rolloutPercentage: 0
        });

        logger.info('ML service rolled back to mock implementation', {
            component: 'analytics',
            operation: 'rollbackToMock'
        });
    }

    /**
     * Get current migration status
     */
    static getMigrationStatus(): {
        enabled: boolean;
        rolloutPercentage: number;
        conditions?: any;
        fallbackEnabled: boolean;
    } | null {
        const flag = featureFlagsService.getFlag('utilities-ml-service-migration');
        if (!flag) {
            return null;
        }

        return {
            enabled: flag.enabled,
            rolloutPercentage: flag.rolloutPercentage,
            conditions: flag.conditions,
            fallbackEnabled: flag.fallbackEnabled
        };
    }

    /**
     * Enable for specific test users
     */
    static async enableForTestUsers(userIds: string[]): Promise<void> {
        logger.info('Enabling ML service for specific test users', {
            component: 'analytics',
            operation: 'enableForTestUsers',
            userCount: userIds.length
        });

        const currentFlag = featureFlagsService.getFlag('utilities-ml-service-migration');
        
        await this.configureGradualRollout({
            enabled: true,
            rolloutPercentage: currentFlag?.rolloutPercentage || 0,
            environment: currentFlag?.conditions?.environment,
            userIds: [...(currentFlag?.conditions?.userIds || []), ...userIds],
            userGroups: currentFlag?.conditions?.userGroups
        });
    }
}

// CLI interface for manual configuration
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const value = process.argv[3];

    switch (command) {
        case 'start':
            await MLMigrationConfigurator.startGradualRollout();
            break;
        case 'increase':
            if (!value || isNaN(Number(value))) {
                console.error('Please provide a valid percentage (0-100)');
                process.exit(1);
            }
            await MLMigrationConfigurator.increaseRollout(Number(value));
            break;
        case 'rollback':
            await MLMigrationConfigurator.rollbackToMock();
            break;
        case 'status':
            const status = MLMigrationConfigurator.getMigrationStatus();
            console.log('ML Migration Status:', JSON.stringify(status, null, 2));
            break;
        case 'test-users':
            if (!value) {
                console.error('Please provide comma-separated user IDs');
                process.exit(1);
            }
            const userIds = value.split(',').map(id => id.trim());
            await MLMigrationConfigurator.enableForTestUsers(userIds);
            break;
        default:
            console.log('Usage:');
            console.log('  tsx configure-ml-migration.ts start');
            console.log('  tsx configure-ml-migration.ts increase <percentage>');
            console.log('  tsx configure-ml-migration.ts rollback');
            console.log('  tsx configure-ml-migration.ts status');
            console.log('  tsx configure-ml-migration.ts test-users <user1,user2,user3>');
            break;
    }
}

export default MLMigrationConfigurator;


