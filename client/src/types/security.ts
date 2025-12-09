export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: ThreatLevel;
  resolved: boolean;
  resolvedAt?: Date;
  resolutionNotes?: string;
}

export interface VulnerabilityReport {
  id: string;
  title: string;
  description: string;
  severity: ThreatLevel;
  cvssScore?: number;
  affectedComponents: string[];
  discoveredAt: Date;
  reportedBy: string;
  status: 'open' | 'investigating' | 'mitigated' | 'closed';
  mitigationSteps?: string[];
  references?: string[];
  lastUpdated: Date;
}

export interface CSRFToken {
  token: string;
  expiresAt: Date;
  sessionId: string;
}

export interface SecurityAudit {
  id: string;
  auditType: string;
  scope: string[];
  initiatedBy: string;
  initiatedAt: Date;
  completedAt?: Date;
  findings: SecurityFinding[];
  recommendations: string[];
  status: 'in_progress' | 'completed' | 'failed';
  reportUrl?: string;
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: ThreatLevel;
  category: string;
  affectedResources: string[];
  evidence: string;
  remediation: string;
  references?: string[];
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcementLevel: 'strict' | 'moderate' | 'permissive';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'log' | 'alert';
  priority: number;
  enabled: boolean;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: ThreatLevel;
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed';
  detectedAt: Date;
  assignedTo?: string;
  affectedSystems: string[];
  timeline: IncidentTimelineEntry[];
  rootCause?: string;
  impact: string;
  resolution?: string;
  preventionMeasures?: string[];
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
}

export interface SecurityMetrics {
  totalIncidents: number;
  incidentsBySeverity: Record<ThreatLevel, number>;
  averageResolutionTime: number;
  complianceScore: number;
  lastAuditDate?: Date;
  vulnerabilitiesCount: number;
  activeThreats: number;
}