/**
 * Shared Testing Infrastructure
 * 
 * Testing utilities and mock services that can be used across features.
 */

// Mock data service for testing
export {
  mockDataService,
  initializeMockDataService,
} from './mock-data';

// Export types
export type {
  MockDataServiceConfig,
  RealTimeEvent,
} from './mock-data';