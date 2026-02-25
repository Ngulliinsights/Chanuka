/**
 * USSD Types for Universal Access
 * 
 * Provides type definitions for USSD-based access to legislative information
 * Designed for feature phones and low-bandwidth scenarios
 */

export type USSDLanguage = 'en' | 'sw' | 'ki'; // English, Swahili, Kikuyu

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

export interface USSDResponse {
  message: string;
  continueSession: boolean;
  sessionId?: string;
}

export interface USSDMenu {
  id: string;
  title: string;
  options: USSDMenuOption[];
  parent?: string;
  handler?: string;
}

export interface USSDMenuOption {
  key: string;
  label: string;
  action: 'navigate' | 'execute' | 'input';
  target?: string;
  handler?: string;
}

export interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
  networkCode?: string;
}

export interface BillSummary {
  id: number;
  title: string;
  status: string;
  stage: string;
}

export interface SponsorInfo {
  id: number;
  name: string;
  party: string;
  constituency: string;
}

export interface USSDAnalytics {
  sessionId: string;
  phoneNumber: string;
  menuPath: string[];
  duration: number;
  completed: boolean;
  language: USSDLanguage;
  timestamp: Date;
}
