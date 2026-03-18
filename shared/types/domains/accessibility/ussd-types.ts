/**
 * Accessibility Domain - USSD Types
 * 
 * Types for USSD-based access to legislative information.
 * Designed for feature phones and low-bandwidth scenarios.
 * Migrated from server/features/universal_access/domain/ussd.types.ts
 * 
 * @module shared/types/domains/accessibility/ussd-types
 */

// ============================================================================
// USSD Configuration
// ============================================================================

/**
 * Supported USSD languages
 */
export type USSDLanguage = 'en' | 'sw' | 'ki'; // English, Swahili, Kikuyu

/**
 * USSD session tracking
 */
export interface USSDSession {
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  text: string;
  language: USSDLanguage;
  currentMenu: string;
  menuHistory: string[];
  userData?: Record<string, unknown>;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * USSD response message
 */
export interface USSDResponse {
  message: string;
  continueSession: boolean;
  sessionId?: string;
}

// ============================================================================
// Menu Structure
// ============================================================================

/**
 * USSD menu definition
 */
export interface USSDMenu {
  id: string;
  title: string;
  options: USSDMenuOption[];
  parent?: string;
  handler?: string;
}

/**
 * Individual menu option
 */
export interface USSDMenuOption {
  key: string;
  label: string;
  action: 'navigate' | 'execute' | 'input';
  target?: string;
  handler?: string;
}

// ============================================================================
// Request and Response
// ============================================================================

/**
 * USSD request from client
 */
export interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
  networkCode?: string;
}

// ============================================================================
// Content Types
// ============================================================================

/**
 * Bill summary for USSD display
 */
export interface BillSummary {
  id: number;
  title: string;
  status: string;
  stage: string;
}

/**
 * Sponsor info for USSD display
 */
export interface SponsorInfo {
  id: number;
  name: string;
  party: string;
  constituency: string;
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * USSD session analytics
 */
export interface USSDAnalytics {
  sessionId: string;
  phoneNumber: string;
  menuPath: string[];
  duration: number;
  completed: boolean;
  language: USSDLanguage;
  timestamp: Date;
}
