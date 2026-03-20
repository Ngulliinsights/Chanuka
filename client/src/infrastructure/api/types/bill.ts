/**
 * Bill Types
 *
 * Type definitions for bill-related API operations
 *
 * MIGRATION NOTE: Bill types have been consolidated into
 * @client/lib/types/bill module. This file now re-exports
 * from that unified location for backward compatibility.
 */

export type {
  Bill,
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
  Sponsor,
  BillAnalysis,
  BillsQueryParams,
  BillsSearchParams,
} from '@client/lib/types/bill';


