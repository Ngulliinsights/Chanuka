/**
 * Bill Types
 *
 * Type definitions for bill-related API operations
 *
 * MIGRATION NOTE: Bill types have been consolidated into
 * @client/shared/types/bill module. This file now re-exports
 * from that unified location for backward compatibility.
 */

export type {
  Bill,
  BillStatusType,
  UrgencyLevelType,
  ComplexityLevelType,
  Sponsor,
  BillAnalysis,
  BillsQueryParams,
  BillsSearchParams,
} from '@client/shared/types/bill';

export {
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
} from '@client/shared/types/bill';
