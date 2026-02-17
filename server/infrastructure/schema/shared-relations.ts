/**
 * Shared Relations Types
 * 
 * This file contains type exports to break circular dependencies between schema files.
 * Import types from here instead of directly from other schema files.
 */

// Re-export types that are needed across schema files
export type { Bill, User, Sponsor } from './foundation';
export type { ParticipationQualityAudit } from './participation_oversight';
export type { PoliticalAppointment } from './political_economy';
export type { TrojanBillAnalysis } from './trojan_bill_detection';
