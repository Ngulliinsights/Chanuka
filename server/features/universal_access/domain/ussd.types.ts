/**
 * USSD Types - Re-export from Shared Layer
 * 
 * Types for USSD-based access to legislative information have been migrated to
 * @shared/types/domains/accessibility/ussd-types.ts
 * This file now simply re-exports them for backward compatibility.
 */

export type {
  USSDLanguage,
  USSDSession,
  USSDResponse,
  USSDMenu,
  USSDMenuOption,
  USSDRequest,
  BillSummary,
  SponsorInfo,
  USSDAnalytics
} from '@shared/types';
