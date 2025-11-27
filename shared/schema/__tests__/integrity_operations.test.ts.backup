// ============================================================================
// INTEGRITY OPERATIONS SCHEMA TESTS
// ============================================================================
// Tests for data integrity, security monitoring, and compliance tracking

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import {
  data_integrity_checks,
  integrity_violations,
  security_events,
  compliance_audits,
  data_validation_rules,
  validation_failures,
  backup_operations,
  recovery_procedures,
  audit_trails,
  integrity_metrics
} from './integrity_operations';
import { bills, users } from './foundation';
import { eq, and, or, sql, count, avg } from 'drizzle-orm';

describe('Integrity Operations Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('integrity_operations');
  });

  describe('Data Integrity Checks', () => {
    it('should create data integrity checks with comprehensive monitoring', async () => {
      const checkData = {
        check_name: 'Bill Number Uniqueness Check',
        check_type: 'uniqueness_constraint',
        entity_type: 'bill',
        check_frequency: 'real_time',
        check_query: 'SELECT bill_number, COUNT(*) FROM bills GROUP BY bill_number HAVING COUNT(*) > 1',
        expected_result: 'zero_rows',
        severity_level: 'critical',
        auto_remediation: false,
        notification_settings: {
          email_alerts: true,
          sms_alerts: false,
          dashboard_alerts: true,
          webhook_url: 'https://alerts.legislative.go.ke/webhook'
        },
        metadata: {
          table_name: 'bills',
          column_name: 'bill_number',
          constraint_type: 'unique'
        },
        is_active: true,
        created_by: 'system_admin',
        created_at: new Date('2024-01-15'),
        last_run: new Date('2024-03-15'),
        next_scheduled_run: new Date('2024-03-16')
      };

      const [check] = await testDb
        .insert(data_integrity_checks)
        .values(checkData)
        .returning();

      expect(check).toBeDefined();
      expect(check.check_name).toBe('Bill Number Uniqueness Check');
      expect(check.check_type).toBe('uniqueness_constraint');
      expect(check.entity_type).toBe('bill');
      expect(check.check_frequency).toBe('real_time');
      expect(check.severity_level).toBe('critical');
      expect(check.notification_settings.email_alerts).toBe(true);
      expect(check.is_active).toBe(true);
    });

    it('should track integrity violations when checks fail', async () => {
      const testCheck = {
        check_name: 'Sponsor Reference Integrity',
        check_type: 'foreign_key_constraint',
        entity_type: 'bill',
        check_frequency: 'hourly',
        severity_level: 'high',
        is_active: true
      };
      const [check] = await testDb.insert(data_integrity_checks).values(testCheck).returning();

      const violationData = {
        check_id: check.id,
        violation_type: 'foreign_key_violation',
        entity_type: 'bill',
        entity_id: 'bill-123',
        violation_details: {
          table: 'bills',
          column: 'sponsor_id',
          invalid_value: 'sponsor-999',
          referenced_table: 'sponsors',
          referenced_column: 'id'
        },
        severity_level: 'high',
        impact_assessment: {
          affected_records: 1,
          data_corruption_risk: 'medium',
          user_impact: 'high',
          system_stability: 'low'
        },
        detection_timestamp: new Date('2024-03-15T10:30:00Z'),
        auto_remediation_attempted: false,
        remediation_status: 'pending',
        remediation_actions: [
          'Quarantine affected record',
          'Notify database administrator',
          'Log for manual review'
        ],
        root_cause_analysis: {
          suspected_cause: 'Orphaned record after sponsor deletion',
          contributing_factors: ['Missing cascade delete', 'Inadequate validation'],
          prevention_measures: ['Add referential integrity checks', 'Implement soft deletes']
        },
        resolved_at: null,
        resolved_by: null,
        verification_status: 'unverified'
      };

      const [violation] = await testDb
        .insert(integrity_violations)
        .values(violationData)
        .returning();

      expect(violation.check_id).toBe(check.id);
      expect(violation.violation_type).toBe('foreign_key_violation');
      expect(violation.entity_type).toBe('bill');
      expect(violation.entity_id).toBe('bill-123');
      expect(violation.violation_details.invalid_value).toBe('sponsor-999');
      expect(violation.severity_level).toBe('high');
      expect(violation.remediation_status).toBe('pending');
    });
  });

  describe('Security Events', () => {
    it('should log security events with detailed analysis', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const securityEventData = {
        event_type: 'suspicious_login_attempt',
        severity: 'high',
        source_ip: '203.0.113.45',
        user_id: user.id,
        event_data: {
          login_attempts: 15,
          time_window: '5_minutes',
          successful_logins: 0,
          failed_logins: 15,
          username_variations: ['admin', 'administrator', 'root'],
          password_patterns: ['common_passwords', 'dictionary_words'],
          geographic_location: {
            country: 'Unknown',
            region: 'Unknown',
            city: 'Unknown',
            coordinates: [0, 0]
          },
          user_agent: 'Mozilla/5.0 (automated_bot)',
          referrer: 'direct_access'
        },
        threat_analysis: {
          threat_type: 'brute_force_attack',
          confidence_level: 0.95,
          attack_pattern: 'credential_stuffing',
          automation_detected: true,
          bot_detection_score: 0.89
        },
        response_actions: {
          ip_blocked: true,
          account_locked: false,
          rate_limit_applied: true,
          captcha_triggered: true,
          alert_sent: true
        },
        mitigation_effectiveness: {
          attacks_stopped: true,
          legitimate_users_affected: false,
          false_positive_rate: 0.02
        },
        created_at: new Date('2024-03-15T14:30:00Z'),
        resolved_at: new Date('2024-03-15T14:35:00Z'),
        resolution_status: 'mitigated',
        related_events: ['event-001', 'event-002']
      };

      const [securityEvent] = await testDb
        .insert(security_events)
        .values(securityEventData)
        .returning();

      expect(securityEvent.event_type).toBe('suspicious_login_attempt');
      expect(securityEvent.severity).toBe('high');
      expect(securityEvent.source_ip).toBe('203.0.113.45');
      expect(securityEvent.user_id).toBe(user.id);
      expect(securityEvent.event_data.login_attempts).toBe(15);
      expect(securityEvent.threat_analysis.threat_type).toBe('brute_force_attack');
      expect(securityEvent.response_actions.ip_blocked).toBe(true);
      expect(securityEvent.resolution_status).toBe('mitigated');
    });

    it('should query security events by type and severity', async () => {
      const eventsData = [
        {
          event_type: 'sql_injection_attempt',
          severity: 'critical',
          source_ip: '203.0.113.10',
          resolution_status: 'blocked'
        },
        {
          event_type: 'xss_attempt',
          severity: 'high',
          source_ip: '203.0.113.20',
          resolution_status: 'mitigated'
        },
        {
          event_type: 'suspicious_login_attempt',
          severity: 'medium',
          source_ip: '203.0.113.30',
          resolution_status: 'monitored'
        },
        {
          event_type: 'data_exfiltration_attempt',
          severity: 'critical',
          source_ip: '203.0.113.40',
          resolution_status: 'investigating'
        }
      ];

      await testDb.insert(security_events).values(eventsData);

      const criticalEvents = await testDb
        .select()
        .from(security_events)
        .where(and(
          eq(security_events.severity, 'critical'),
          eq(security_events.resolution_status, 'blocked')
        ));

      expect(criticalEvents).toHaveLength(1);
      expect(criticalEvents[0].event_type).toBe('sql_injection_attempt');
      expect(criticalEvents[0].severity).toBe('critical');
    });
  });

  describe('Compliance Audits', () => {
    it('should track compliance audits and requirements', async () => {
      const complianceData = {
        audit_name: 'Data Protection Act Compliance Review',
        compliance_framework: 'kenya_data_protection_act',
        audit_scope: 'full_platform',
        auditor_organization: 'Kenya Data Protection Office',
        auditor_credentials: 'Certified Data Protection Officer',
        audit_date: new Date('2024-02-15'),
        requirements_assessed: {
          data_minimization: { status: 'compliant', score: 95 },
          purpose_limitation: { status: 'compliant', score: 92 },
          consent_mechanisms: { status: 'partially_compliant', score: 78 },
          data_security: { status: 'compliant', score: 88 },
          user_rights: { status: 'compliant', score: 90 },
          data_retention: { status: 'non_compliant', score: 45 },
          cross_border_transfer: { status: 'compliant', score: 85 }
        },
        overall_compliance_score: 82,
        compliance_status: 'partially_compliant',
        critical_findings: [
          'Data retention policy exceeds legal limits',
          'Consent withdrawal mechanism needs improvement'
        ],
        recommendations: [
          'Implement automated data retention policy',
          'Enhance consent withdrawal process',
          'Regular compliance training for staff'
        ],
        remediation_plan: {
          phase_1: { timeline: '30_days', priority_issues: ['data_retention'] },
          phase_2: { timeline: '60_days', priority_issues: ['consent_mechanisms'] },
          phase_3: { timeline: '90_days', priority_issues: ['staff_training'] }
        },
        next_audit_date: new Date('2024-08-15'),
        audit_report_url: '/compliance/dpa_audit_2024.pdf',
        certification_status: 'in_progress',
        risk_assessment: {
          overall_risk: 'medium',
          legal_risk: 'high',
          reputational_risk: 'medium',
          financial_risk: 'low'
        }
      };

      const [audit] = await testDb
        .insert(compliance_audits)
        .values(complianceData)
        .returning();

      expect(audit.audit_name).toBe('Data Protection Act Compliance Review');
      expect(audit.compliance_framework).toBe('kenya_data_protection_act');
      expect(audit.requirements_assessed.data_minimization.status).toBe('compliant');
      expect(audit.requirements_assessed.data_retention.score).toBe(45);
      expect(audit.overall_compliance_score).toBe(82);
      expect(audit.compliance_status).toBe('partially_compliant');
      expect(audit.risk_assessment.legal_risk).toBe('high');
    });
  });

  describe('Data Validation Rules', () => {
    it('should define comprehensive data validation rules', async () => {
      const validationData = {
        rule_name: 'Bill Number Format Validation',
        entity_type: 'bill',
        field_name: 'bill_number',
        validation_type: 'regex_pattern',
        rule_definition: {
          pattern: '^Bill\\s+\\d+\\s+of\\s+\\d{4}$',
          examples: ['Bill 15 of 2024', 'Bill 3 of 2023'],
          description: 'Kenyan bill numbering format'
        },
        error_message: 'Bill number must follow format "Bill [number] of [year]"',
        severity_level: 'error',
        blocking_validation: true,
        metadata: {
          created_by: 'data_architect',
          business_rule_id: 'BR-001',
          regulatory_requirement: true
        },
        test_cases: [
          { input: 'Bill 15 of 2024', expected: 'valid' },
          { input: 'Bill 3 of 2023', expected: 'valid' },
          { input: 'Bill15of2024', expected: 'invalid' },
          { input: 'Bill 15/2024', expected: 'invalid' }
        ],
        is_active: true,
        created_at: new Date('2024-01-15'),
        last_tested: new Date('2024-03-01'),
        test_results: { passed: 15, failed: 0, total: 15 }
      };

      const [rule] = await testDb
        .insert(data_validation_rules)
        .values(validationData)
        .returning();

      expect(rule.rule_name).toBe('Bill Number Format Validation');
      expect(rule.entity_type).toBe('bill');
      expect(rule.field_name).toBe('bill_number');
      expect(rule.validation_type).toBe('regex_pattern');
      expect(rule.rule_definition.pattern).toBe('^Bill\\s+\\d+\\s+of\\s+\\d{4}$');
      expect(rule.severity_level).toBe('error');
      expect(rule.blocking_validation).toBe(true);
      expect(rule.test_results.passed).toBe(15);
    });

    it('should track validation failures', async () => {
      const testRule = {
        rule_name: 'Email Format Validation',
        entity_type: 'user',
        field_name: 'email',
        validation_type: 'email_format',
        severity_level: 'error',
        is_active: true
      };
      const [rule] = await testDb.insert(data_validation_rules).values(testRule).returning();

      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const failureData = {
        rule_id: rule.id,
        entity_type: 'user',
        entity_id: user.id,
        field_name: 'email',
        invalid_value: 'invalid-email-format',
        validation_error: 'Email format is invalid - missing @ symbol',
        severity_level: 'error',
        source_context: {
          operation: 'user_registration',
          api_endpoint: '/api/users/register',
          user_agent: 'Mozilla/5.0',
          ip_address: '203.0.113.100'
        },
        occurrence_timestamp: new Date('2024-03-15T11:30:00Z'),
        user_friendly_message: 'Please enter a valid email address (e.g., user@example.com)',
        suggested_corrections: [
          'Add @ symbol',
          'Include domain name',
          'Check for typos'
        ],
        auto_correction_attempted: false,
        resolution_status: 'pending_user_action',
        resolved_at: null,
        resolved_by: null
      };

      const [failure] = await testDb
        .insert(validation_failures)
        .values(failureData)
        .returning();

      expect(failure.rule_id).toBe(rule.id);
      expect(failure.entity_type).toBe('user');
      expect(failure.entity_id).toBe(user.id);
      expect(failure.invalid_value).toBe('invalid-email-format');
      expect(failure.validation_error).toContain('missing @ symbol');
      expect(failure.severity_level).toBe('error');
      expect(failure.resolution_status).toBe('pending_user_action');
    });
  });

  describe('Backup and Recovery', () => {
    it('should track backup operations', async () => {
      const backupData = {
        backup_name: 'Full Database Backup - Weekly',
        backup_type: 'full_database',
        backup_scope: 'all_tables',
        storage_location: 's3://legislative-backups/database/full/',
        backup_size_gb: 15.7,
        compression_ratio: 0.65,
        encryption_method: 'AES-256',
        retention_policy: '12_weeks',
        backup_duration_minutes: 45,
        verification_status: 'verified',
        verification_details: {
          checksum_verified: true,
          restore_test_completed: true,
          data_integrity_check: true,
          point_in_time_recovery_test: true
        },
        backup_metadata: {
          database_version: 'PostgreSQL 15.4',
          application_version: 'v3.2.1',
          backup_software: 'pg_dump',
          compression_tool: 'gzip'
        },
        initiated_by: 'automated_system',
        scheduled_backup: true,
        backup_schedule: 'weekly_sunday_0200',
        created_at: new Date('2024-03-10T02:00:00Z'),
        completed_at: new Date('2024-03-10T02:45:00Z'),
        retention_until: new Date('2024-06-09'),
        is_active: true
      };

      const [backup] = await testDb
        .insert(backup_operations)
        .values(backupData)
        .returning();

      expect(backup.backup_name).toBe('Full Database Backup - Weekly');
      expect(backup.backup_type).toBe('full_database');
      expect(backup.backup_size_gb).toBe(15.7);
      expect(backup.compression_ratio).toBe(0.65);
      expect(backup.verification_status).toBe('verified');
      expect(backup.backup_duration_minutes).toBe(45);
      expect(backup.scheduled_backup).toBe(true);
    });

    it('should track recovery procedures', async () => {
      const testBackup = {
        backup_name: 'Test Backup',
        backup_type: 'incremental',
        storage_location: '/backups/test/',
        backup_size_gb: 5.2,
        verification_status: 'verified',
        created_at: new Date('2024-03-10T02:00:00Z')
      };
      const [backup] = await testDb.insert(backup_operations).values(testBackup).returning();

      const recoveryData = {
        recovery_name: 'Emergency Data Recovery - Bill Data Corruption',
        recovery_type: 'point_in_time',
        backup_id: backup.id,
        recovery_scope: {
          tables: ['bills', 'sponsors', 'committees'],
          time_range: {
            start: new Date('2024-03-14T10:00:00Z'),
            end: new Date('2024-03-14T11:00:00Z')
          }
        },
        failure_cause: 'Data corruption due to storage hardware failure',
        affected_data_volume_gb: 2.3,
        recovery_method: 'restore_from_backup',
        recovery_steps: [
          'Identify corruption extent',
          'Locate clean backup from before corruption',
          'Prepare recovery environment',
          'Restore affected tables',
          'Verify data integrity',
          'Resume normal operations'
        ],
        recovery_duration_minutes: 120,
        data_loss_minutes: 15,
        recovery_verification: {
          checksum_verified: true,
          record_count_matched: true,
          referential_integrity_check: true,
          application_functionality_test: true
        },
        lessons_learned: [
          'Need more frequent incremental backups',
          'Improve monitoring for early corruption detection'
        ],
        preventive_measures: [
          'Implement real-time replication',
          'Add storage redundancy',
          'Enhance monitoring alerts'
        ],
        initiated_by: 'database_admin',
        approved_by: 'system_manager',
        recovery_date: new Date('2024-03-14T12:00:00Z'),
        completion_date: new Date('2024-03-14T14:00:00Z'),
        success_status: 'successful',
        rto_compliance: true,
        rpo_compliance: false
      };

      const [recovery] = await testDb
        .insert(recovery_procedures)
        .values(recoveryData)
        .returning();

      expect(recovery.recovery_name).toBe('Emergency Data Recovery - Bill Data Corruption');
      expect(recovery.recovery_type).toBe('point_in_time');
      expect(recovery.backup_id).toBe(backup.id);
      expect(recovery.recovery_duration_minutes).toBe(120);
      expect(recovery.data_loss_minutes).toBe(15);
      expect(recovery.success_status).toBe('successful');
    });
  });

  describe('Audit Trails', () => {
    it('should maintain comprehensive audit trails', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const testBill = generateTestData.bill();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      const auditData = {
        audit_event: 'bill_status_change',
        entity_type: 'bill',
        entity_id: bill.id,
        user_id: user.id,
        session_id: 'session-123',
        ip_address: '203.0.113.50',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        action_details: {
          operation: 'update',
          field_changed: 'status',
          old_value: 'introduced',
          new_value: 'committee_review',
          change_reason: 'Bill moved to committee stage'
        },
        before_state: {
          status: 'introduced',
          last_action_date: '2024-03-01',
          committee: null
        },
        after_state: {
          status: 'committee_review',
          last_action_date: '2024-03-15',
          committee: 'Health Committee'
        },
        metadata: {
          api_endpoint: '/api/bills/bill-123/status',
          http_method: 'PUT',
          response_code: 200,
          processing_time_ms: 150
        },
        compliance_flags: {
          data_retention_eligible: true,
          audit_trail_required: true,
          user_notification_required: false
        },
        risk_assessment: {
          data_sensitivity: 'medium',
          operational_impact: 'low',
          compliance_risk: 'low'
        },
        timestamp: new Date('2024-03-15T16:45:00Z'),
        transaction_id: 'txn-2024-03-15-001',
        is_anomaly: false,
        anomaly_score: 0.1
      };

      const [auditTrail] = await testDb
        .insert(audit_trails)
        .values(auditData)
        .returning();

      expect(auditTrail.audit_event).toBe('bill_status_change');
      expect(auditTrail.entity_type).toBe('bill');
      expect(auditTrail.entity_id).toBe(bill.id);
      expect(auditTrail.user_id).toBe(user.id);
      expect(auditTrail.action_details.field_changed).toBe('status');
      expect(auditTrail.action_details.old_value).toBe('introduced');
      expect(auditTrail.action_details.new_value).toBe('committee_review');
      expect(auditTrail.before_state.status).toBe('introduced');
      expect(auditTrail.after_state.status).toBe('committee_review');
      expect(auditTrail.is_anomaly).toBe(false);
    });

    it('should detect anomalous activities', async () => {
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const anomalousActivityData = {
        audit_event: 'bulk_data_export',
        entity_type: 'user',
        entity_id: user.id,
        user_id: user.id,
        ip_address: '203.0.113.200',
        action_details: {
          operation: 'export',
          records_exported: 15000,
          export_format: 'csv',
          filter_applied: 'all_bills_all_time'
        },
        metadata: {
          api_endpoint: '/api/bills/export',
          http_method: 'GET',
          response_code: 200,
          processing_time_ms: 30000
        },
        timestamp: new Date('2024-03-15T03:00:00Z'),
        is_anomaly: true,
        anomaly_score: 0.95,
        anomaly_indicators: [
          'unusual_time_of_day',
          'high_volume_export',
          'comprehensive_data_access',
          'automated_pattern_detected'
        ],
        risk_assessment: {
          data_sensitivity: 'high',
          operational_impact: 'medium',
          compliance_risk: 'high'
        }
      };

      const [anomaly] = await testDb
        .insert(audit_trails)
        .values(anomalousActivityData)
        .returning();

      expect(anomaly.is_anomaly).toBe(true);
      expect(anomaly.anomaly_score).toBe(0.95);
      expect(anomaly.anomaly_indicators).toContain('high_volume_export');
      expect(anomaly.risk_assessment.compliance_risk).toBe('high');
    });
  });

  describe('Integrity Metrics', () => {
    it('should track comprehensive integrity metrics', async () => {
      const metricsData = {
        measurement_date: new Date('2024-03-15'),
        reporting_period: 'Q1_2024',
        data_integrity_metrics: {
          total_integrity_checks: 1250,
          successful_checks: 1235,
          failed_checks: 15,
          success_rate: 0.988,
          critical_violations: 2,
          high_priority_violations: 5,
          medium_priority_violations: 8,
          average_resolution_time_hours: 4.2
        },
        security_metrics: {
          total_security_events: 45,
          critical_events: 3,
          high_risk_events: 12,
          blocked_attacks: 38,
          successful_attacks: 0,
          mean_time_to_detection_minutes: 2.5,
          mean_time_to_response_minutes: 8.3
        },
        compliance_metrics: {
          total_audits_conducted: 8,
          compliant_areas: 6,
          partially_compliant_areas: 1,
          non_compliant_areas: 1,
          overall_compliance_score: 87.5,
          certification_status: 'maintained'
        },
        backup_metrics: {
          total_backups: 180,
          successful_backups: 178,
          failed_backups: 2,
          success_rate: 0.989,
          average_backup_duration_minutes: 42,
          total_storage_used_tb: 2.8,
          recovery_point_objective_hours: 1,
          recovery_time_objective_hours: 4
        },
        audit_trail_metrics: {
          total_audit_events: 125000,
          anomalous_events: 125,
          anomaly_detection_rate: 0.001,
          false_positive_rate: 0.02,
          data_retention_compliance: 100,
          audit_trail_integrity: 'verified'
        },
        performance_metrics: {
          system_uptime_percentage: 99.8,
          average_response_time_ms: 150,
          database_performance_score: 9.1,
          application_performance_score: 8.7
        },
        risk_metrics: {
          overall_risk_score: 2.1,
          data_integrity_risk: 'low',
          security_risk: 'low',
          compliance_risk: 'medium',
          operational_risk: 'low'
        },
        trend_analysis: {
          integrity_improvement: 'positive',
          security_posture: 'strengthening',
          compliance_maturity: 'improving',
          overall_trend: 'positive'
        },
        benchmarking: {
          industry_average_compliance: 75,
          our_compliance_score: 87.5,
          industry_average_security: 85,
          our_security_score: 92,
          ranking_percentile: 85
        }
      };

      const [metrics] = await testDb
        .insert(integrity_metrics)
        .values(metricsData)
        .returning();

      expect(metrics.measurement_date).toEqual(new Date('2024-03-15'));
      expect(metrics.data_integrity_metrics.success_rate).toBe(0.988);
      expect(metrics.security_metrics.blocked_attacks).toBe(38);
      expect(metrics.compliance_metrics.overall_compliance_score).toBe(87.5);
      expect(metrics.backup_metrics.success_rate).toBe(0.989);
      expect(metrics.audit_trail_metrics.anomaly_detection_rate).toBe(0.001);
      expect(metrics.performance_metrics.system_uptime_percentage).toBe(99.8);
      expect(metrics.risk_metrics.overall_risk_score).toBe(2.1);
      expect(metrics.benchmarking.our_compliance_score).toBe(87.5);
    });
  });

  describe('Complex Integrity Analysis Queries', () => {
    it('should perform comprehensive integrity analysis', async () => {
      // Create test data
      const testUser = generateTestData.user();
      const [user] = await testDb.insert(users).values(testUser).returning();

      const testBill = generateTestData.bill();
      const [bill] = await testDb.insert(bills).values(testBill).returning();

      // Create integrity checks
      const checksData = [
        {
          check_name: 'Uniqueness Check',
          check_type: 'uniqueness_constraint',
          entity_type: 'bill',
          severity_level: 'critical',
          is_active: true
        },
        {
          check_name: 'Format Validation',
          check_type: 'format_validation',
          entity_type: 'user',
          severity_level: 'medium',
          is_active: true
        }
      ];
      const insertedChecks = await testDb.insert(data_integrity_checks).values(checksData).returning();

      // Create violations
      const violationData = {
        check_id: insertedChecks[0].id,
        violation_type: 'uniqueness_violation',
        entity_type: 'bill',
        entity_id: bill.id,
        severity_level: 'critical',
        remediation_status: 'resolved'
      };
      await testDb.insert(integrity_violations).values(violationData);

      // Create security events
      const securityData = {
        event_type: 'suspicious_access',
        severity: 'high',
        user_id: user.id,
        resolution_status: 'mitigated'
      };
      await testDb.insert(security_events).values(securityData);

      // Create audit trails
      const auditData = {
        audit_event: 'data_modification',
        entity_type: 'bill',
        entity_id: bill.id,
        user_id: user.id,
        is_anomaly: false
      };
      await testDb.insert(audit_trails).values(auditData);

      // Complex query for comprehensive analysis
      const integrityAnalysis = await testDb
        .select({
          totalChecks: count(data_integrity_checks.id),
          activeChecks: count(sql`CASE WHEN ${data_integrity_checks.is_active} = true THEN 1 END`),
          totalViolations: count(integrity_violations.id),
          resolvedViolations: count(sql`CASE WHEN ${integrity_violations.remediation_status} = 'resolved' THEN 1 END`),
          totalSecurityEvents: count(security_events.id),
          mitigatedSecurityEvents: count(sql`CASE WHEN ${security_events.resolution_status} = 'mitigated' THEN 1 END`),
          totalAuditEvents: count(audit_trails.id),
          anomalousEvents: count(sql`CASE WHEN ${audit_trails.is_anomaly} = true THEN 1 END`)
        })
        .from(data_integrity_checks)
        .leftJoin(integrity_violations, eq(data_integrity_checks.id, integrity_violations.check_id))
        .leftJoin(security_events, eq(data_integrity_checks.id, security_events.id))
        .leftJoin(audit_trails, eq(data_integrity_checks.id, audit_trails.id))
        .where(eq(data_integrity_checks.is_active, true));

      expect(integrityAnalysis).toHaveLength(1);
      expect(parseInt(integrityAnalysis[0].totalChecks.count as string)).toBe(2);
      expect(parseInt(integrityAnalysis[0].activeChecks.count as string)).toBe(2);
      expect(parseInt(integrityAnalysis[0].totalViolations.count as string)).toBe(1);
      expect(parseInt(integrityAnalysis[0].resolvedViolations.count as string)).toBe(1);
      expect(parseInt(integrityAnalysis[0].totalSecurityEvents.count as string)).toBe(1);
      expect(parseInt(integrityAnalysis[0].mitigatedSecurityEvents.count as string)).toBe(1);
    });
  });

  describe('Performance Tests', () => {
    it('should efficiently handle high-volume integrity monitoring', async () => {
      // Create multiple integrity checks
      const checksData = Array.from({ length: 1000 }, (_, i) => ({
        check_name: `Check ${i}`,
        check_type: i % 5 === 0 ? 'uniqueness_constraint' :
                   i % 5 === 1 ? 'foreign_key_constraint' :
                   i % 5 === 2 ? 'format_validation' :
                   i % 5 === 3 ? 'range_validation' : 'custom_validation',
        entity_type: i % 2 === 0 ? 'bill' : 'user',
        severity_level: i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'high' : 'medium',
        is_active: true
      }));

      const startTime = Date.now();
      await testDb.insert(data_integrity_checks).values(checksData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(10000); // Should insert 1000 checks reasonably quickly

      // Query performance test
      const queryStartTime = Date.now();
      const criticalChecks = await testDb
        .select()
        .from(data_integrity_checks)
        .where(and(
          eq(data_integrity_checks.severity_level, 'critical'),
          eq(data_integrity_checks.is_active, true)
        ));
      const queryTime = Date.now() - queryStartTime;

      expect(criticalChecks.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500); // Should query quickly with indexes
    });
  });
});


