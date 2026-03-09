#!/usr/bin/env node

// FIXME: Use @server/infrastructure/validation/data-validation
// import { GovernmentDataValidationService } from '@server/infrastructure/core/validation/data-validation';
// FIXME: Use @server/infrastructure/error-handling/external-api-error-handler
// import { ExternalAPIErrorHandler, FallbackStrategy } from '@server/services/external-api-error-handler';
import { ManagedGovernmentDataIntegrationService } from '@server/features/government-data/application/managed-integration.service';
import { logger } from '@server/infrastructure/observability';
import { GovernmentDataIntegrationService } from '@server/features/government-data/services/government-data-integration.service';

// CLI tool for testing government data integration
class GovernmentDataIntegrationCLI {
  private integrationService: GovernmentDataIntegrationService;
  private errorHandler: ExternalAPIErrorHandler;

  constructor() {
    this.integrationService = new GovernmentDataIntegrationService();
    this.errorHandler = new ExternalAPIErrorHandler();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // Listen for retry events from error handler
    this.errorHandler.on('retry', async (event) => {
      console.log(`Retrying operation for ${event.source}...`);
      // In a real implementation, this would retry the actual API call
      // For testing, we'll simulate success/failure
      const success = Math.random() > 0.5;
      event.resolve({ success, data: success ? { test: 'data' } : null });
    });

    // Listen for alternative source events
    this.errorHandler.on('useAlternativeSource', async (event) => {
      console.log(`Trying alternative source ${event.alternativeSource} for ${event.originalSource}...`);
      // Simulate alternative source attempt
      const success = Math.random() > 0.3;
      event.resolve({ success, data: success ? { alternative: 'data' } : null });
    });

    // Listen for circuit breaker events
    this.errorHandler.on('circuitBreakerOpen', (event) => {
      console.log(`🚨 Circuit breaker opened for ${event.source}`);
    });
  }

  async testIntegrationStatus(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n📊 Testing Integration Status...');
    try {
      const status = await this.integrationService.getIntegrationStatus();
      logger.info('✅ Integration Status:', { component: 'Chanuka' }, JSON.stringify(status, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Integration Status Error:', { component: 'Chanuka' }, errorMessage);
    }
  }

  async testBillIntegration(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n📋 Testing Bill Integration...');
    try {
      const result = await this.integrationService.integrateBills({
        sources: ['parliament-ca'],
        dryRun: true
      });
      logger.info('✅ Bill Integration Result:', { component: 'Chanuka' }, JSON.stringify(result, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Bill Integration Error:', { component: 'Chanuka' }, errorMessage);

      // Test error handling
      const errorToPass = error instanceof Error ? error : new Error(String(error));
      const errorResult = await this.errorHandler.handleError(
        'parliament-ca',
        errorToPass,
        { operation: 'integrateBills' }
      );
      logger.info('🔄 Error Handler Result:', { component: 'Chanuka' }, JSON.stringify(errorResult, null, 2));
    }
  }

  async testSponsorIntegration(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n👥 Testing Sponsor Integration...');
    try {
      const result = await this.integrationService.integrateSponsors({
        sources: ['parliament-ca'],
        dryRun: true
      });
      logger.info('✅ Sponsor Integration Result:', { component: 'Chanuka' }, JSON.stringify(result, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Sponsor Integration Error:', { component: 'Chanuka' }, errorMessage);

      // Test error handling
      const errorToPass = error instanceof Error ? error : new Error(String(error));
      const errorResult = await this.errorHandler.handleError(
        'parliament-ca',
        errorToPass,
        { operation: 'integrateSponsors' }
      );
      logger.info('🔄 Error Handler Result:', { component: 'Chanuka' }, JSON.stringify(errorResult, null, 2));
    }
  }

  async testDataTransformation(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n🔄 Testing Data Transformation...');

    // Test Parliament data transformation
    const mockParliamentData = {
      Bills: {
        Bill: [
          {
            BillId: 'C-1',
            Title: 'Test Bill',
            Summary: 'A test bill for demonstration',
            Status: 'First Reading',
            Number: 'C-1',
            IntroducedDate: '2024-01-15',
            SponsorMember: {
              PersonId: '123',
              FirstName: 'John',
              LastName: 'Doe',
              Party: 'Liberal'
            }
          }
        ]
      }
    };

    try {
      const transformed = ManagedGovernmentDataIntegrationService.transformParliamentData(mockParliamentData);
      logger.info('✅ Parliament Data Transformation:', { component: 'Chanuka' }, JSON.stringify(transformed, null, 2));

      // Validate transformed data
      const validation = GovernmentDataValidationService.validateBatch(transformed.bills || [], 'bills');
      logger.info('📋 Validation Result:', { component: 'Chanuka' }, JSON.stringify(validation, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Data Transformation Error:', { component: 'Chanuka' }, errorMessage);
    }
  }

  async testDataValidation(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n✅ Testing Data Validation...');

    const testBills = [
      {
        id: 'C-1',
        title: 'Test Bill 1',
        bill_number: 'C-1',
        status: 'introduced',
        source: 'parliament-ca',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'C-2',
        title: '', // Missing title - should fail validation
        bill_number: 'C-2',
        status: 'invalid-status', // Invalid status
        source: 'parliament-ca',
        lastUpdated: new Date().toISOString()
      }
    ];

    try {
      const validation = GovernmentDataValidationService.validateBatch(testBills, 'bills');
      logger.info('✅ Batch Validation Result:', { component: 'Chanuka' }, JSON.stringify(validation, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Data Validation Error:', { component: 'Chanuka' }, errorMessage);
    }
  }

  async testCrossValidation(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n🔍 Testing Cross-Validation...');

    const testRecords = [
      {
        data: {
          id: 'C-1',
          title: 'Test Bill',
          bill_number: 'C-1',
          status: 'introduced',
          source: 'parliament-ca'
        },
        source: 'parliament-ca'
      },
      {
        data: {
          id: 'C-1',
          title: 'Test Bill (Different Title)', // Conflict
          bill_number: 'C-1',
          status: 'committee', // Conflict
          source: 'county-assemblies'
        },
        source: 'county-assemblies'
      }
    ];

    try {
      const crossValidation = GovernmentDataValidationService.crossValidate(testRecords, 'bills');
      logger.info('✅ Cross-Validation Result:', { component: 'Chanuka' }, JSON.stringify(crossValidation, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Cross-Validation Error:', { component: 'Chanuka' }, errorMessage);
    }
  }

  async testErrorHandling(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n🚨 Testing Error Handling...');

    // Simulate different types of errors
    const errors = [
      new Error('Network timeout'),
      new Error('Rate limit exceeded'),
      new Error('401 Unauthorized'),
      new Error('Service unavailable')
    ];

    for (const error of errors) {
      try {
        const result = await this.errorHandler.handleError(
          'test-source',
          error,
          { testError: true }
        );
        console.log(`🔄 Error "${error.message}" handled:`, JSON.stringify(result, null, 2));
      } catch (handlingError) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const handlingErrorMessage = handlingError instanceof Error ? handlingError.message : String(handlingError);
        console.error(`❌ Error handling failed for "${errorMessage}":`, handlingErrorMessage);
      }
    }

    // Test error statistics
    const stats = this.errorHandler.getErrorStatistics();
    logger.info('📊 Error Statistics:', { component: 'Chanuka' }, JSON.stringify(stats, null, 2));
  }

  async testCaching(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '\n💾 Testing Caching...');
    
    // Cache some test data
    this.errorHandler.cacheData('test-source', { cached: 'data', timestamp: new Date() });
    
    // Simulate error to test fallback to cached data
    const error = new Error('Service unavailable');
    const result = await this.errorHandler.handleError(
      'test-source',
      error,
      { operation: 'testCaching' },
      undefined,
      { strategy: FallbackStrategy.CACHED_DATA }
    );
    
    logger.info('✅ Cache Fallback Result:', { component: 'Chanuka' }, JSON.stringify(result, null, 2));
  }

  async runAllTests(): Promise<void> {
    logger.info({ component: 'Chanuka' }, '🚀 Starting Government Data Integration Tests...\n');
    
    await this.testIntegrationStatus();
    await this.testDataTransformation();
    await this.testDataValidation();
    await this.testCrossValidation();
    await this.testErrorHandling();
    await this.testCaching();
    await this.testBillIntegration();
    await this.testSponsorIntegration();
    
    logger.info({ component: 'Chanuka' }, '\n✅ All tests completed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const cli = new GovernmentDataIntegrationCLI();

  if (args.length === 0) {
    await cli.runAllTests();
    return;
  }

  const command = args[0];
  
  switch (command) {
    case 'status':
      await cli.testIntegrationStatus();
      break;
    case 'bills':
      await cli.testBillIntegration();
      break;
    case 'sponsors':
      await cli.testSponsorIntegration();
      break;
    case 'transform':
      await cli.testDataTransformation();
      break;
    case 'validate':
      await cli.testDataValidation();
      break;
    case 'cross-validate':
      await cli.testCrossValidation();
      break;
    case 'errors':
      await cli.testErrorHandling();
      break;
    case 'cache':
      await cli.testCaching();
      break;
    case 'all':
      await cli.runAllTests();
      break;
    default:
      console.log(`
Usage: node test-government-integration.js [command]

Commands:
  status        - Test integration status
  bills         - Test bill integration
  sponsors      - Test sponsor integration
  transform     - Test data transformation
  validate      - Test data validation
  cross-validate - Test cross-validation
  errors        - Test error handling
  cache         - Test caching
  all           - Run all tests (default)

Examples:
  node test-government-integration.js
  node test-government-integration.js bills
  node test-government-integration.js errors
      `);
      break;
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ CLI Error:', { component: 'Chanuka' }, errorMessage);
    process.exit(1);
  });
}

export { GovernmentDataIntegrationCLI };













































