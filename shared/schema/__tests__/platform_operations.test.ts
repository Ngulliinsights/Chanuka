// ============================================================================
// PLATFORM OPERATIONS SCHEMA TESTS
// ============================================================================
// Tests for system monitoring, performance optimization, and operational management

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { testDb, testPool, testUtils, generateTestData } from './setup';
import {
  system_metrics,
  performance_benchmarks,
  resource_utilization,
  service_health_checks,
  operational_incidents,
  incident_response,
  maintenance_schedules,
  system_alerts,
  capacity_planning,
  operational_analytics
} from './platform_operations';
import { eq, and, or, sql, count, avg, max, min } from 'drizzle-orm';

describe('Platform Operations Schema Tests', () => {
  beforeAll(async () => {
    await testUtils.setupDatabase();
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    await testUtils.clearSchema('foundation');
    await testUtils.clearSchema('platform_operations');
  });

  describe('System Metrics', () => {
    it('should track comprehensive system performance metrics', async () => {
      const metricsData = {
        measurement_timestamp: new Date('2024-03-15T10:00:00Z'),
        reporting_interval: 'hourly',
        system_component: 'database',
        performance_metrics: {
          response_time_ms: {
            average: 45,
            p50: 38,
            p95: 120,
            p99: 250,
            max: 500
          },
          throughput_rps: {
            current: 150,
            peak: 280,
            average: 165
          },
          error_rate_percent: 0.02,
          availability_percent: 99.98
        },
        resource_metrics: {
          cpu_usage_percent: 35.5,
          memory_usage_percent: 68.2,
          disk_usage_percent: 45.8,
          network_io_mbps: 125.4
        },
        database_metrics: {
          active_connections: 45,
          idle_connections: 12,
          query_performance: {
            slow_queries: 3,
            long_running_queries: 1,
            index_usage_ratio: 0.95
          },
          cache_hit_ratio: 0.92,
          transaction_rate: 85
        },
        application_metrics: {
          concurrent_users: 1230,
          page_load_time_ms: 850,
          api_response_time_ms: 120,
          session_duration_minutes: 18.5
        },
        infrastructure_metrics: {
          server_count: 8,
          load_balancer_health: 'healthy',
          storage_performance: {
            read_iops: 2500,
            write_iops: 1200,
            read_latency_ms: 2.1,
            write_latency_ms: 3.5
          }
        },
        quality_metrics: {
          data_freshness_seconds: 30,
          data_accuracy_score: 99.7,
          user_satisfaction_score: 8.4
        },
        metadata: {
          data_center: 'nairobi_primary',
          environment: 'production',
          application_version: 'v3.2.1',
          database_version: 'PostgreSQL 15.4'
        }
      };

      const [metrics] = await testDb
        .insert(system_metrics)
        .values(metricsData)
        .returning();

      expect(metrics.measurement_timestamp).toEqual(new Date('2024-03-15T10:00:00Z'));
      expect(metrics.system_component).toBe('database');
      expect(metrics.performance_metrics.response_time_ms.average).toBe(45);
      expect(metrics.resource_metrics.cpu_usage_percent).toBe(35.5);
      expect(metrics.database_metrics.cache_hit_ratio).toBe(0.92);
      expect(metrics.application_metrics.concurrent_users).toBe(1230);
      expect(metrics.quality_metrics.user_satisfaction_score).toBe(8.4);
    });

    it('should track resource utilization trends', async () => {
      const utilizationData = {
        measurement_date: new Date('2024-03-15'),
        resource_type: 'database_server',
        resource_identifier: 'db-primary-01',
        cpu_utilization: {
          average_percent: 42.5,
          peak_percent: 85.2,
          off_peak_percent: 15.3,
          trend: 'stable'
        },
        memory_utilization: {
          average_percent: 72.8,
          peak_percent: 95.1,
          allocated_gb: 64,
          used_gb: 46.6,
          trend: 'increasing'
        },
        storage_utilization: {
          total_capacity_gb: 1000,
          used_capacity_gb: 458,
          free_capacity_gb: 542,
          growth_rate_gb_per_month: 25,
          projected_full_date: new Date('2025-09-01'),
          trend: 'gradual_increase'
        },
        network_utilization: {
          average_bandwidth_mbps: 85.4,
          peak_bandwidth_mbps: 250.8,
          data_transfer_gb_per_day: 1250,
          trend: 'seasonal_variation'
        },
        application_load: {
          requests_per_second: 165,
          concurrent_connections: 45,
          active_sessions: 1230,
          queue_depth: 12,
          trend: 'growth'
        },
        efficiency_metrics: {
          cpu_efficiency_score: 8.2,
          memory_efficiency_score: 7.8,
          storage_efficiency_score: 9.1,
          energy_efficiency_score: 8.5
        },
        capacity_planning: {
          current_utilization_percent: 68,
          recommended_threshold_percent: 80,
          months_to_threshold: 8,
          scaling_recommendation: 'plan_upgrade'
        },
        cost_metrics: {
          daily_cost_usd: 125.5,
          cost_per_user_usd: 0.10,
          cost_per_request_usd: 0.0008,
          efficiency_ratio: 0.85
        }
      };

      const [utilization] = await testDb
        .insert(resource_utilization)
        .values(utilizationData)
        .returning();

      expect(utilization.measurement_date).toEqual(new Date('2024-03-15'));
      expect(utilization.resource_type).toBe('database_server');
      expect(utilization.cpu_utilization.average_percent).toBe(42.5);
      expect(utilization.memory_utilization.used_gb).toBe(46.6);
      expect(utilization.storage_utilization.projected_full_date).toEqual(new Date('2025-09-01'));
      expect(utilization.capacity_planning.current_utilization_percent).toBe(68);
      expect(utilization.cost_metrics.daily_cost_usd).toBe(125.5);
    });
  });

  describe('Service Health Checks', () => {
    it('should monitor service health with detailed checks', async () => {
      const healthData = {
        service_name: 'bill_search_service',
        service_type: 'api_service',
        check_timestamp: new Date('2024-03-15T10:05:00Z'),
        health_status: 'healthy',
        response_time_ms: 85,
        status_code: 200,
        response_body_check: {
          expected_content: 'search_results',
          content_found: true,
          validation_passed: true
        },
        dependency_checks: {
          database: { status: 'healthy', response_time_ms: 25 },
          cache: { status: 'healthy', response_time_ms: 5 },
          external_api: { status: 'healthy', response_time_ms: 150 }
        },
        resource_usage: {
          cpu_percent: 25.5,
          memory_percent: 45.2,
          disk_percent: 30.1
        },
        error_indicators: {
          error_count: 0,
          warning_count: 2,
          critical_errors: 0,
          last_error_timestamp: null
        },
        performance_indicators: {
          request_count: 1250,
          success_rate: 99.8,
          average_response_time_ms: 82,
          throughput_rps: 45
        },
        configuration_check: {
          config_valid: true,
          required_services_running: true,
          port_accessibility: true,
          ssl_certificate_valid: true
        },
        location: 'nairobi_data_center',
        environment: 'production',
        next_check_scheduled: new Date('2024-03-15T10:10:00Z'),
        alert_thresholds: {
          response_time_warning_ms: 200,
          response_time_critical_ms: 500,
          error_rate_warning_percent: 1,
          error_rate_critical_percent: 5
        }
      };

      const [health] = await testDb
        .insert(service_health_checks)
        .values(healthData)
        .returning();

      expect(health.service_name).toBe('bill_search_service');
      expect(health.health_status).toBe('healthy');
      expect(health.response_time_ms).toBe(85);
      expect(health.dependency_checks.database.status).toBe('healthy');
      expect(health.performance_indicators.success_rate).toBe(99.8);
      expect(health.configuration_check.ssl_certificate_valid).toBe(true);
    });

    it('should handle service degradation scenarios', async () => {
      const degradedServiceData = {
        service_name: 'user_authentication_service',
        service_type: 'authentication_service',
        check_timestamp: new Date('2024-03-15T10:10:00Z'),
        health_status: 'degraded',
        response_time_ms: 450,
        status_code: 200,
        response_body_check: {
          expected_content: 'auth_token',
          content_found: true,
          validation_passed: true
        },
        dependency_checks: {
          database: { status: 'healthy', response_time_ms: 35 },
          cache: { status: 'degraded', response_time_ms: 200 },
          external_api: { status: 'healthy', response_time_ms: 180 }
        },
        resource_usage: {
          cpu_percent: 85.2,
          memory_percent: 78.5,
          disk_percent: 40.2
        },
        error_indicators: {
          error_count: 5,
          warning_count: 15,
          critical_errors: 1,
          last_error_timestamp: new Date('2024-03-15T10:08:00Z')
        },
        performance_indicators: {
          request_count: 850,
          success_rate: 97.5,
          average_response_time_ms: 420,
          throughput_rps: 28
        },
        issues_identified: [
          'Cache response time elevated',
          'CPU usage above normal threshold',
          'Memory utilization increasing'
        ],
        recommended_actions: [
          'Restart cache service',
          'Investigate memory leak',
          'Scale up if trend continues'
        ]
      };

      const [degradedService] = await testDb
        .insert(service_health_checks)
        .values(degradedServiceData)
        .returning();

      expect(degradedService.health_status).toBe('degraded');
      expect(degradedService.response_time_ms).toBe(450);
      expect(degradedService.dependency_checks.cache.status).toBe('degraded');
      expect(degradedService.error_indicators.critical_errors).toBe(1);
      expect(degradedService.performance_indicators.success_rate).toBe(97.5);
      expect(degradedService.issues_identified).toContain('Cache response time elevated');
    });
  });

  describe('Operational Incidents', () => {
    it('should track operational incidents with full lifecycle', async () => {
      const incidentData = {
        incident_id: 'INC-2024-03-15-001',
        title: 'Database Connection Pool Exhaustion',
        description: 'Application experiencing database connection timeouts due to pool exhaustion',
        severity: 'high',
        priority: 'p1',
        category: 'database_performance',
        affected_services: ['bill_search', 'user_authentication', 'comment_system'],
        affected_components: ['database_primary', 'connection_pool'],
        impact_assessment: {
          affected_users: 2500,
          functionality_impact: 'partial_outage',
          data_integrity_risk: 'low',
          financial_impact: 'medium'
        },
        symptoms: [
          'Database connection timeouts',
          'Slow response times',
          'Intermittent 500 errors'
        ],
        root_cause: 'Insufficient connection pool size during peak traffic',
        timeline: {
          detected_at: new Date('2024-03-15T14:30:00Z'),
          acknowledged_at: new Date('2024-03-15T14:35:00Z'),
          resolved_at: new Date('2024-03-15T15:15:00Z'),
          closed_at: new Date('2024-03-15T16:00:00Z')
        },
        status: 'closed',
        assigned_team: 'database_team',
        assigned_engineer: 'senior_dba_1',
        escalation_level: 'l2',
        communication_channels: ['slack', 'email', 'status_page'],
        external_communication: {
          status_page_updated: true,
          user_notification_sent: true,
          stakeholder_notification_sent: true
        },
        resolution_steps: [
          'Increased connection pool size from 50 to 100',
          'Optimized slow queries identified during incident',
          'Implemented connection pool monitoring alerts'
        ],
        lessons_learned: [
          'Connection pool sizing needs regular review',
          'Better monitoring could have prevented impact'
        ],
        preventive_measures: [
          'Implement dynamic pool sizing',
          'Add predictive capacity alerts',
          'Regular performance reviews'
        ],
        post_incident_review: {
          conducted: true,
          review_date: new Date('2024-03-18'),
          action_items: 5,
          completion_rate: 0.8
        }
      };

      const [incident] = await testDb
        .insert(operational_incidents)
        .values(incidentData)
        .returning();

      expect(incident.incident_id).toBe('INC-2024-03-15-001');
      expect(incident.severity).toBe('high');
      expect(incident.priority).toBe('p1');
      expect(incident.impact_assessment.affected_users).toBe(2500);
      expect(incident.status).toBe('closed');
      expect(incident.escalation_level).toBe('l2');
      expect(incident.post_incident_review.conducted).toBe(true);
    });

    it('should track incident response activities', async () => {
      const testIncident = {
        incident_id: 'INC-TEST-001',
        title: 'Test Incident',
        severity: 'medium',
        status: 'in_progress'
      };
      const [incident] = await testDb.insert(operational_incidents).values(testIncident).returning();

      const responseData = {
        incident_id: incident.id,
        responder_id: 'engineer_001',
        responder_role: 'senior_system_engineer',
        response_action: 'diagnosis_started',
        action_details: {
          tools_used: ['database_monitoring', 'log_analysis', 'performance_profiler'],
          findings: 'Connection pool at 95% capacity',
          hypothesis: 'Pool size insufficient for current load'
        },
        timestamp: new Date('2024-03-15T14:32:00Z'),
        communication_log: {
          channel: 'slack',
          message: 'Starting diagnosis of database connection issues',
          recipients: ['database_team', 'incident_commander']
        },
        escalation_triggered: false,
        time_to_response_minutes: 2,
        effectiveness_rating: 9,
        next_steps: [
          'Check current connection pool utilization',
          'Analyze query performance',
          'Review recent configuration changes'
        ]
      };

      const [response] = await testDb
        .insert(incident_response)
        .values(responseData)
        .returning();

      expect(response.incident_id).toBe(incident.id);
      expect(response.responder_id).toBe('engineer_001');
      expect(response.response_action).toBe('diagnosis_started');
      expect(response.time_to_response_minutes).toBe(2);
      expect(response.effectiveness_rating).toBe(9);
    });
  });

  describe('Maintenance and Capacity Planning', () => {
    it('should schedule and track maintenance activities', async () => {
      const maintenanceData = {
        maintenance_id: 'MAINT-2024-Q1-UPGRADE',
        title: 'Quarterly System Upgrade and Security Patches',
        maintenance_type: 'scheduled_upgrade',
        description: 'Regular quarterly maintenance including security patches, performance optimizations, and feature updates',
        scheduled_start: new Date('2024-03-20T02:00:00Z'),
        scheduled_end: new Date('2024-03-20T06:00:00Z'),
        actual_start: new Date('2024-03-20T02:05:00Z'),
        actual_end: new Date('2024-03-20T05:45:00Z'),
        duration_minutes: 220,
        affected_services: ['all_services'],
        expected_downtime_minutes: 30,
        actual_downtime_minutes: 25,
        maintenance_window: 'low_traffic_hours',
        maintenance_category: 'security_and_performance',
        tasks: [
          'Apply security patches',
          'Update database software',
          'Optimize query performance',
          'Clean up old log files',
          'Update SSL certificates'
        ],
        risk_assessment: {
          overall_risk: 'medium',
          data_loss_risk: 'low',
          service_disruption_risk: 'medium',
          rollback_complexity: 'low'
        },
        rollback_plan: {
          automatic_rollback_triggers: ['service_unavailable_for_15_minutes'],
          rollback_procedures: ['Restore from backup', 'Revert configuration changes'],
          rollback_time_estimate_minutes: 45
        },
        approval_status: 'approved',
        approved_by: 'operations_manager',
        approval_date: new Date('2024-03-18'),
        communication_plan: {
          advance_notice_hours: 72,
          notification_channels: ['email', 'status_page', 'social_media'],
          stakeholder_groups: ['all_users', 'administrators', 'partners']
        },
        status: 'completed',
        outcome: 'successful',
        post_maintenance_verification: {
          all_services_functional: true,
          performance_improved: true,
          security_scan_passed: true,
          user_acceptance_test_passed: true
        },
        lessons_learned: [
          'Maintenance completed 15 minutes ahead of schedule',
          'User notification was effective'
        ]
      };

      const [maintenance] = await testDb
        .insert(maintenance_schedules)
        .values(maintenanceData)
        .returning();

      expect(maintenance.maintenance_id).toBe('MAINT-2024-Q1-UPGRADE');
      expect(maintenance.maintenance_type).toBe('scheduled_upgrade');
      expect(maintenance.duration_minutes).toBe(220);
      expect(maintenance.actual_downtime_minutes).toBe(25);
      expect(maintenance.status).toBe('completed');
      expect(maintenance.outcome).toBe('successful');
      expect(maintenance.post_maintenance_verification.performance_improved).toBe(true);
    });

    it('should track capacity planning metrics', async () => {
      const capacityData = {
        analysis_date: new Date('2024-03-15'),
        planning_horizon_months: 12,
        current_capacity: {
          database_connections: 100,
          concurrent_users: 2000,
          storage_tb: 2.5,
          bandwidth_gbps: 1.0,
          compute_cores: 32
        },
        utilization_metrics: {
          database_connections_percent: 75,
          concurrent_users_percent: 68,
          storage_utilization_percent: 58,
          bandwidth_utilization_percent: 45,
          compute_utilization_percent: 52
        },
        growth_projections: {
          user_growth_annual_percent: 25,
          data_growth_annual_percent: 40,
          traffic_growth_annual_percent: 30,
          feature_usage_growth_percent: 35
        },
        capacity_forecast: {
          months_to_capacity_limit: 8,
          recommended_scaling_date: new Date('2024-11-15'),
          peak_load_projections: {
            users: 3500,
            storage_tb: 4.2,
            bandwidth_gbps: 1.8
          }
        },
        scaling_recommendations: [
          {
            component: 'database',
            action: 'vertical_scaling',
            timeline: '6_months',
            priority: 'high',
            estimated_cost_usd: 5000
          },
          {
            component: 'storage',
            action: 'capacity_expansion',
            timeline: '4_months',
            priority: 'medium',
            estimated_cost_usd: 3000
          }
        ],
        cost_projections: {
          current_monthly_cost_usd: 2500,
          projected_monthly_cost_usd: 4200,
          annual_investment_required_usd: 20000,
          roi_timeline_months: 18
        },
        risk_assessment: {
          capacity_exhaustion_risk: 'medium',
          performance_degradation_risk: 'low',
          cost_overrun_risk: 'low'
        },
        monitoring_recommendations: [
          'Implement predictive scaling alerts',
          'Monitor user growth patterns',
          'Track feature adoption rates'
        ]
      };

      const [capacity] = await testDb
        .insert(capacity_planning)
        .values(capacityData)
        .returning();

      expect(capacity.analysis_date).toEqual(new Date('2024-03-15'));
      expect(capacity.current_capacity.database_connections).toBe(100);
      expect(capacity.utilization_metrics.database_connections_percent).toBe(75);
      expect(capacity.capacity_forecast.months_to_capacity_limit).toBe(8);
      expect(capacity.scaling_recommendations).toHaveLength(2);
      expect(capacity.cost_projections.current_monthly_cost_usd).toBe(2500);
    });
  });

  describe('System Alerts and Analytics', () => {
    it('should generate and manage system alerts', async () => {
      const alertData = {
        alert_name: 'Database Connection Pool High Usage',
        alert_type: 'capacity_warning',
        severity: 'warning',
        source_system: 'database_monitoring',
        affected_component: 'database_connection_pool',
        alert_message: 'Database connection pool utilization at 85%, approaching critical threshold',
        threshold_config: {
          metric: 'connection_pool_usage_percent',
          threshold_value: 80,
          current_value: 85,
          comparison_operator: 'greater_than',
          duration_minutes: 5
        },
        context_data: {
          current_connections: 85,
          max_connections: 100,
          active_queries: 45,
          idle_connections: 40
        },
        recommended_actions: [
          'Monitor for continued increase',
          'Prepare to increase pool size',
          'Check for connection leaks'
        ],
        auto_response_triggered: false,
        notification_sent: true,
        notification_channels: ['slack', 'email', 'pagerduty'],
        recipients: ['database_team', 'operations_team'],
        created_at: new Date('2024-03-15T14:45:00Z'),
        acknowledged_at: new Date('2024-03-15T14:50:00Z'),
        acknowledged_by: 'senior_dba',
        resolved_at: new Date('2024-03-15T15:30:00Z'),
        resolution_notes: 'Pool utilization returned to normal after peak traffic subsided',
        status: 'resolved',
        false_positive: false,
        escalation_level: 'l1'
      };

      const [alert] = await testDb
        .insert(system_alerts)
        .values(alertData)
        .returning();

      expect(alert.alert_name).toBe('Database Connection Pool High Usage');
      expect(alert.severity).toBe('warning');
      expect(alert.threshold_config.current_value).toBe(85);
      expect(alert.status).toBe('resolved');
      expect(alert.acknowledged_by).toBe('senior_dba');
      expect(alert.false_positive).toBe(false);
    });

    it('should provide operational analytics and insights', async () => {
      const analyticsData = {
        analysis_date: new Date('2024-03-15'),
        reporting_period: 'monthly',
        operational_summary: {
          system_uptime_percent: 99.95,
          total_incidents: 8,
          resolved_incidents: 8,
          average_resolution_time_minutes: 45,
          maintenance_activities: 12,
          successful_maintenance: 12
        },
        performance_trends: {
          response_time_trend: 'improving',
          throughput_trend: 'stable',
          error_rate_trend: 'decreasing',
          user_satisfaction_trend: 'improving'
        },
        capacity_utilization: {
          database_capacity_percent: 75,
          storage_capacity_percent: 58,
          network_capacity_percent: 42,
          compute_capacity_percent: 65
        },
        cost_analysis: {
          operational_cost_usd: 15000,
          cost_per_user_usd: 0.15,
          cost_per_transaction_usd: 0.001,
          cost_efficiency_score: 8.2
        },
        team_performance: {
          incident_response_time_avg_minutes: 8.5,
          resolution_effectiveness_score: 9.1,
          preventive_maintenance_completion_rate: 0.95,
          team_satisfaction_score: 8.8
        },
        technology_metrics: {
          software_updates_applied: 25,
          security_patches_applied: 8,
          performance_improvements: 12,
          deprecated_components_retired: 3
        },
        user_impact_metrics: {
          affected_user_incidents: 1250,
          user_communication_sent: 8,
          user_satisfaction_during_incidents: 7.2,
          complaint_resolution_rate: 0.96
        },
        innovation_metrics: {
          automation_implementations: 5,
          process_improvements: 8,
          tool_adoptions: 3,
          efficiency_gains_percent: 15
        },
        risk_mitigation: {
          identified_risks: 12,
          mitigated_risks: 10,
          risk_reduction_score: 8.5,
          contingency_plans_updated: 4
        },
        strategic_initiatives: {
          completed_initiatives: 3,
          in_progress_initiatives: 5,
          planned_initiatives: 8,
          strategic_alignment_score: 9.2
        },
        recommendations: [
          'Implement predictive scaling for database capacity',
          'Enhance monitoring for early incident detection',
          'Automate routine maintenance tasks'
        ],
        next_period_goals: [
          'Achieve 99.99% uptime',
          'Reduce incident response time by 20%',
          'Implement automated capacity management'
        ]
      };

      const [analytics] = await testDb
        .insert(operational_analytics)
        .values(analyticsData)
        .returning();

      expect(analytics.analysis_date).toEqual(new Date('2024-03-15'));
      expect(analytics.operational_summary.system_uptime_percent).toBe(99.95);
      expect(analytics.performance_trends.response_time_trend).toBe('improving');
      expect(analytics.cost_analysis.operational_cost_usd).toBe(15000);
      expect(analytics.team_performance.incident_response_time_avg_minutes).toBe(8.5);
      expect(analytics.innovation_metrics.efficiency_gains_percent).toBe(15);
    });
  });

  describe('Complex Operational Analysis Queries', () => {
    it('should provide comprehensive operational insights', async () => {
      // Create system metrics data
      const metricsData = Array.from({ length: 24 }, (_, i) => ({
        measurement_timestamp: new Date(`2024-03-15T${i.toString().padStart(2, '0')}:00:00Z`),
        system_component: 'database',
        performance_metrics: {
          response_time_ms: { average: 40 + Math.random() * 20 },
          availability_percent: 99.5 + Math.random() * 0.5
        },
        resource_metrics: {
          cpu_usage_percent: 30 + Math.random() * 40,
          memory_usage_percent: 60 + Math.random() * 30
        }
      }));
      await testDb.insert(system_metrics).values(metricsData);

      // Create service health checks
      const healthData = [
        {
          service_name: 'bill_search_service',
          health_status: 'healthy',
          response_time_ms: 85,
          performance_indicators: { success_rate: 99.8, request_count: 1250 }
        },
        {
          service_name: 'user_service',
          health_status: 'healthy',
          response_time_ms: 45,
          performance_indicators: { success_rate: 99.9, request_count: 850 }
        },
        {
          service_name: 'comment_service',
          health_status: 'degraded',
          response_time_ms: 320,
          performance_indicators: { success_rate: 97.5, request_count: 450 }
        }
      ];
      await testDb.insert(service_health_checks).values(healthData);

      // Create operational incidents
      const incidentData = {
        incident_id: 'INC-2024-001',
        title: 'Performance Degradation',
        severity: 'medium',
        status: 'resolved',
        affected_services: ['comment_service']
      };
      await testDb.insert(operational_incidents).values(incidentData);

      // Complex query for operational analysis
      const operationalAnalysis = await testDb
        .select({
          avgResponseTime: avg(system_metrics.performance_metrics.response_time_ms.average),
          avgAvailability: avg(system_metrics.performance_metrics.availability_percent),
          avgCpuUsage: avg(system_metrics.resource_metrics.cpu_usage_percent),
          avgMemoryUsage: avg(system_metrics.resource_metrics.memory_usage_percent),
          totalServices: count(service_health_checks.id),
          healthyServices: count(sql`CASE WHEN ${service_health_checks.health_status} = 'healthy' THEN 1 END`),
          degradedServices: count(sql`CASE WHEN ${service_health_checks.health_status} = 'degraded' THEN 1 END`),
          totalIncidents: count(operational_incidents.id),
          resolvedIncidents: count(sql`CASE WHEN ${operational_incidents.status} = 'resolved' THEN 1 END`)
        })
        .from(system_metrics)
        .leftJoin(service_health_checks, eq(system_metrics.id, service_health_checks.id))
        .leftJoin(operational_incidents, eq(system_metrics.id, operational_incidents.id))
        .where(eq(system_metrics.system_component, 'database'));

      expect(operationalAnalysis).toHaveLength(1);
      expect(operationalAnalysis[0].totalServices).toBe('3');
      expect(operationalAnalysis[0].healthyServices).toBe('2');
      expect(operationalAnalysis[0].degradedServices).toBe('1');
      expect(operationalAnalysis[0].totalIncidents).toBe('1');
      expect(operationalAnalysis[0].resolvedIncidents).toBe('1');
    });
  });

  describe('Performance Tests', () => {
    it('should efficiently handle high-volume operational data', async () => {
      // Create multiple system metrics entries
      const metricsData = Array.from({ length: 1000 }, (_, i) => ({
        measurement_timestamp: new Date(`2024-03-15T${Math.floor(i/60)}:${i%60}:00Z`),
        system_component: i % 4 === 0 ? 'database' : 
                         i % 4 === 1 ? 'application' : 
                         i % 4 === 2 ? 'cache' : 'load_balancer',
        performance_metrics: {
          response_time_ms: { average: 40 + Math.random() * 30 },
          availability_percent: 99.0 + Math.random()
        },
        resource_metrics: {
          cpu_usage_percent: 20 + Math.random() * 60,
          memory_usage_percent: 50 + Math.random() * 40
        }
      }));

      const startTime = Date.now();
      await testDb.insert(system_metrics).values(metricsData);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(15000); // Should insert 1000 metrics reasonably quickly

      // Query performance test
      const queryStartTime = Date.now();
      const databaseMetrics = await testDb
        .select()
        .from(system_metrics)
        .where(and(
          eq(system_metrics.system_component, 'database'),
          sql`${system_metrics.performance_metrics.response_time_ms.average} > 50`
        ));
      const queryTime = Date.now() - queryStartTime;

      expect(databaseMetrics.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // Should query quickly with indexes
    });
  });
});


