/**
 * Security System Types
 */

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  resolved: boolean;
}

export type SecurityEventType = 
  | 'csp_violation'
  | 'csrf_attack'
  | 'xss_attempt'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'vulnerability_detected'
  | 'unauthorized_access'
  | 'input_validation_failed'
  | 'session_hijack_attempt'
  | 'brute_force_attack';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface VulnerabilityReport {
  id: string;
  timestamp: Date;
  type: VulnerabilityType;
  severity: SecuritySeverity;
  description: string;
  affectedComponents: string[];
  recommendations: string[];
  cveId?: string;
  fixed: boolean;
}

export type VulnerabilityType =
  | 'dependency_vulnerability'
  | 'configuration_issue'
  | 'code_vulnerability'
  | 'security_misconfiguration'
  | 'outdated_dependency'
  | 'insecure_protocol'
  | 'weak_encryption';

export interface CSPViolation {
  documentUri: string;
  referrer: string;
  violatedDirective: string;
  effectiveDirective: string;
  originalPolicy: string;
  disposition: 'enforce' | 'report';
  blockedUri: string;
  lineNumber?: number;
  columnNumber?: number;
  sourceFile?: string;
  statusCode: number;
}

export interface RateLimitInfo {
  windowMs: number;
  maxRequests: number;
  currentRequests: number;
  resetTime: Date;
  blocked: boolean;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  vulnerabilitiesFound: number;
  vulnerabilitiesFixed: number;
  rateLimitViolations: number;
  cspViolations: number;
  lastScanTime: Date;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface SecurityConfig {
  enableCSP: boolean;
  enableCSRF: boolean;
  enableRateLimit: boolean;
  enableVulnerabilityScanning: boolean;
  enableInputSanitization: boolean;
  scanInterval: number;
}

export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy': string;
  'Permissions-Policy'?: string;
}