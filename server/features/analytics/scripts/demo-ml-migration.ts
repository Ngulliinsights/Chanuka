/**
 * ML Migration Demo Script
 * 
 * Demonstrates the ML service migration functionality
 */

import { RealMLAnalysisService } from '@server/services/real-ml.service.ts';
import { featureFlagsService } from '@/infrastructure/migration/feature-flags.service.js';
import MLMigrationConfigurator from './configure-ml-migration.js';

async function demonstrateMLMigration() {
    console.log('=== ML Service Migration Demo ===\n');

    try {
        // Initialize real ML service
        console.log('1. Initializing Real ML Service...');
        const realMLService = RealMLAnalysisService.getInstance();
        await realMLService.initialize();
        console.log('✓ Real ML Service initialized successfully\n');

        // Sample bill content for testing
        const sampleBillContent = `
            This bill aims to regulate the technology industry by implementing new privacy standards
            for consumer data protection. Small businesses and startups will benefit from simplified
            compliance procedures, while large corporations may face increased regulatory burden.
            The legislation includes provisions for financial penalties and enforcement mechanisms.
            Consumer advocacy groups support this measure, while industry associations have expressed concerns.
        `;

        // Test real ML analysis
        console.log('2. Testing Real ML Analysis...');
        const startTime = Date.now();
        const result = await realMLService.analyzeStakeholderInfluence(sampleBillContent);
        const responseTime = Date.now() - startTime;

        console.log(`✓ Analysis completed in ${responseTime}ms`);
        console.log(`  Confidence: ${result.confidence}`);
        console.log(`  Analysis Type: ${result.analysis_type}`);
        console.log(`  ML Techniques: ${result.metadata?.mlTechniques?.join(', ')}`);
        console.log(`  Model Version: ${result.metadata?.model_version}\n`);

        // Test feature flag configuration
        console.log('3. Testing Feature Flag Configuration...');
        
        // Start with 0% rollout
        await MLMigrationConfigurator.configureGradualRollout({
            enabled: false,
            rolloutPercentage: 0
        });
        console.log('✓ Feature flag set to 0% rollout');

        // Test routing with flag disabled
        const shouldUseMock = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', 'test-user');
        console.log(`  Should use migration: ${shouldUseMock} (expected: false)`);

        // Enable gradual rollout
        await MLMigrationConfigurator.enableGradualRollout(25);
        console.log('✓ Feature flag set to 25% rollout');

        // Test routing with flag enabled
        const shouldUseReal = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', 'test-user');
        console.log(`  Should use migration: ${shouldUseReal} (depends on user hash)\n`);

        // Show migration status
        console.log('4. Current Migration Status:');
        const status = MLMigrationConfigurator.getMigrationStatus();
        console.log(JSON.stringify(status, null, 2));

        console.log('\n=== Demo completed successfully! ===');

    } catch (error) {
        console.error('Demo failed:', error);
        process.exit(1);
    }
}

// Run demo if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateMLMigration();
}
