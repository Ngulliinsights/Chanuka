/**
 * Data Infrastructure Services
 *
 * Cross-cutting data management services that are used across features
 */

export { dataRetentionService, retentionUtils } from '@client/core/analytics/data-retention-service';
export type {
  RetentionPolicy,
  DataCleanupJob,
  UserDataSummary
} from '@client/core/analytics/data-retention-service';
