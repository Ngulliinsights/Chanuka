#!/usr/bin/env node

import { GovernmentDataIntegrationService } from '../services/government-data-integration.js';
import { DataValidationService } from '../services/data-validation.js';
import { DataTransformationService } from '../services/data-transformation.js';
import { ExternalAPIErrorHandler, FallbackStrategy } from '../services/external-api-error-handler.js';

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
    console.log('\n📊 Testing Integration Status...');
    try {
      const status = await this.integrationService.getIntegrationStatus();
      console.log('✅ Integration Status:', JSON.stringify(status, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Integration Status Error:', errorMessage);
    }
  }

  async testBillIntegration(): Promise<void> {
    console.log('\n📋 Testing Bill Integration...');
    try {
      const result = await this.integrationService.integrateBills({
        sources: ['parliament-ca'],
        dryRun: true
      });
      console.log('✅ Bill Integration Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Bill Integration Error:', errorMessage);

      // Test error handling
      const errorToPass = error instanceof Error ? error : new Error(String(error));
      const errorResult = await this.errorHandler.handleError(
        'parliament-ca',
        errorToPass,
        { operation: 'integrateBills' }
      );
      console.log('🔄 Error Handler Result:', JSON.stringify(errorResult, null, 2));
    }
  }

  async testSponsorIntegration(): Promise<void> {
    console.log('\n👥 Testing Sponsor Integration...');
    try {
      const result = await this.integrationService.integrateSponsors({
        sources: ['parliament-ca'],
        dryRun: true
      });
      console.log('✅ Sponsor Integration Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Sponsor Integration Error:', errorMessage);

      // Test error handling
      const errorToPass = error instanceof Error ? error : new Error(String(error));
      const errorResult = await this.errorHandler.handleError(
        'parliament-ca',
        errorToPass,
        { operation: 'integrateSponsors' }
      );
      console.log('🔄 Error Handler Result:', JSON.stringify(errorResult, null, 2));
    }
  }

  async testDataTransformation(): Promise<void> {
    console.log('\n🔄 Testing Data Transformation...');

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
      const transformed = DataTransformationService.transformParliamentData(mockParliamentData);
      console.log('✅ Parliament Data Transformation:', JSON.stringify(transformed, null, 2));

      // Validate transformed data
      const validation = DataValidationService.validateBatch(transformed.bills || [], 'bills');
      console.log('📋 Validation Result:', JSON.stringify(validation, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Data Transformation Error:', errorMessage);
    }
  }

  async testDataValidation(): Promise<void> {
    console.log('\n✅ Testing Data Validation...');

    const testBills = [
      {
        id: 'C-1',
        title: 'Test Bill 1',
        billNumber: 'C-1',
        status: 'introduced',
        source: 'parliament-ca',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'C-2',
        title: '', // Missing title - should fail validation
        billNumber: 'C-2',
        status: 'invalid-status', // Invalid status
        source: 'parliament-ca',
        lastUpdated: new Date().toISOString()
      }
    ];

    try {
      const validation = DataValidationService.validateBatch(testBills, 'bills');
      console.log('✅ Batch Validation Result:', JSON.stringify(validation, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Data Validation Error:', errorMessage);
    }
  }

  async testCrossValidation(): Promise<void> {
    console.log('\n🔍 Testing Cross-Validation...');

    const testRecords = [
      {
        data: {
          id: 'C-1',
          title: 'Test Bill',
          billNumber: 'C-1',
          status: 'introduced',
          source: 'parliament-ca'
        },
        source: 'parliament-ca'
      },
      {
        data: {
          id: 'C-1',
          title: 'Test Bill (Different Title)', // Conflict
          billNumber: 'C-1',
          status: 'committee', // Conflict
          source: 'openparliament'
        },
        source: 'openparliament'
      }
    ];

    try {
      const crossValidation = DataValidationService.crossValidate(testRecords, 'bills');
      console.log('✅ Cross-Validation Result:', JSON.stringify(crossValidation, null, 2));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Cross-Validation Error:', errorMessage);
    }
  }

  async testErrorHandling(): Promise<void> {
    console.log('\n🚨 Testing Error Handling...');

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
    console.log('📊 Error Statistics:', JSON.stringify(stats, null, 2));
  }

  async testCaching(): Promise<void> {
    console.log('\n💾 Testing Caching...');
    
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
    
    console.log('✅ Cache Fallback Result:', JSON.stringify(result, null, 2));
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Government Data Integration Tests...\n');
    
    await this.testIntegrationStatus();
    await this.testDataTransformation();
    await this.testDataValidation();
    await this.testCrossValidation();
    await this.testErrorHandling();
    await this.testCaching();
    await this.testBillIntegration();
    await this.testSponsorIntegration();
    
    console.log('\n✅ All tests completed!');
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
    console.error('❌ CLI Error:', errorMessage);
    process.exit(1);
  });
}

export { GovernmentDataIntegrationCLI };