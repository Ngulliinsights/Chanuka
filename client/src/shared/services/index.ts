/**
 * Shared Services Module
 *
 * Common services and utilities used across the application
 */

// Data retention service (consolidated from core/analytics)
export {
  DataRetentionService,
  dataRetentionService,
  retentionUtils,
} from '@client/core/analytics/data-retention-service';

// Navigation service
export * from './navigation';
