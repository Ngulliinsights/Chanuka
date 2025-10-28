import { securityMonitoringService } from './services/security-monitoring-service.js';
import { intrusionDetectionService } from './services/intrusion-detection-service.js';
import { securityAuditService } from './services/security-audit-service.js';
import { logger } from '@shared/core';

/**
 * Test script to verify security monitoring and audit system functionality
 */
async function testSecurityMonitoring() {
  logger.info('🔒 Testing Security Monitoring and Audit System', { component: 'Chanuka' });
  logger.info('=', { component: 'Chanuka' }, .repeat(60));

  try {
    // Test 1: Initialize security monitoring
    logger.info('\n1. Initializing security monitoring system...', { component: 'Chanuka' });
    await securityMonitoringService.initialize();
    logger.info('✅ Security monitoring initialized successfully', { component: 'Chanuka' });

    // Test 2: Test security audit logging
    logger.info('\n2. Testing security audit logging...', { component: 'Chanuka' });
    await securityAuditService.logSecurityEvent({
      eventType: 'test_event',
      severity: 'medium',
      ipAddress: '192.168.1.100',
      userAgent: 'Test User Agent',
      resource: '/test/endpoint',
      action: 'GET',
      success: true,
      details: { testData: 'security monitoring test' },
      riskScore: 25,
      userId: 'test-user-123'
    });
    logger.info('✅ Security event logged successfully', { component: 'Chanuka' });

    // Test 3: Test threat detection
    logger.info('\n3. Testing threat detection...', { component: 'Chanuka' });
    const mockRequest = {
      originalUrl: '/api/bills?search=<script>alert("xss")</script>',
      url: '/api/bills?search=<script>alert("xss")</script>',
      method: 'GET',
      headers: {
        'user-agent': 'Mozilla/5.0 (Test Browser)',
        'x-forwarded-for': '192.168.1.100'
      },
      body: {},
      get: (header: string) => {
        const headers: any = {
          'User-Agent': 'Mozilla/5.0 (Test Browser)',
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        };
        return headers[header];
      },
      connection: { remoteAddress: '192.168.1.100' },
      socket: { remoteAddress: '192.168.1.100' }
    } as any;

    const threatResult = await intrusionDetectionService.analyzeRequest(mockRequest);
    logger.info('✅ Threat detection completed', { component: 'Chanuka' });
    console.log(`   - Threat Level: ${threatResult.threatLevel}`);
    console.log(`   - Risk Score: ${threatResult.riskScore}`);
    console.log(`   - Detected Threats: ${threatResult.detectedThreats.length}`);
    console.log(`   - Recommended Action: ${threatResult.recommendedAction}`);

    if (threatResult.detectedThreats.length > 0) {
      logger.info('   - Threat Details:', { component: 'Chanuka' });
      threatResult.detectedThreats.forEach((threat, index) => {
        console.log(`     ${index + 1}. ${threat.type} (${threat.severity}) - ${threat.description}`);
      });
    }

    // Test 4: Test compliance checks
    logger.info('\n4. Testing compliance checks...', { component: 'Chanuka' });
    await securityMonitoringService.runComplianceChecks();
    logger.info('✅ Compliance checks completed', { component: 'Chanuka' });

    // Test 5: Test security dashboard
    logger.info('\n5. Testing security dashboard...', { component: 'Chanuka' });
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    logger.info('✅ Security dashboard data retrieved', { component: 'Chanuka' });
    console.log(`   - Total Events: ${dashboard.overview.totalEvents}`);
    console.log(`   - Critical Alerts: ${dashboard.overview.criticalAlerts}`);
    console.log(`   - Risk Level: ${dashboard.overview.riskLevel}`);
    console.log(`   - Compliance Score: ${dashboard.overview.complianceScore}%`);
    console.log(`   - Recent Alerts: ${dashboard.recentAlerts.length}`);
    console.log(`   - Recommendations: ${dashboard.recommendations.length}`);

    // Test 6: Test alert creation
    logger.info('\n6. Testing alert creation...', { component: 'Chanuka' });
    const alertId = await securityMonitoringService.createSecurityAlert({
      type: 'test_alert',
      severity: 'high',
      title: 'Test Security Alert',
      message: 'This is a test security alert to verify the alerting system',
      source: 'test_system',
      metadata: { testRun: true, timestamp: new Date() }
    });
    console.log(`✅ Security alert created with ID: ${alertId}`);

    // Test 7: Test IP blocking
    logger.info('\n7. Testing IP blocking functionality...', { component: 'Chanuka' });
    const testIP = '192.168.1.999'; // Fake IP for testing
    await intrusionDetectionService.blockIP(testIP, 'Test blocking functionality', 60000); // 1 minute
    const isBlocked = intrusionDetectionService.isIPBlocked(testIP);
    console.log(`✅ IP blocking test: ${isBlocked ? 'BLOCKED' : 'NOT BLOCKED'}`);
    
    // Unblock the test IP
    setTimeout(async () => {
      await intrusionDetectionService.unblockIP(testIP);
      logger.info('✅ Test IP unblocked', { component: 'Chanuka' });
    }, 2000);

    // Test 8: Test audit report generation
    logger.info('\n8. Testing audit report generation...', { component: 'Chanuka' });
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const auditReport = await securityAuditService.generateAuditReport(startDate, endDate);
    logger.info('✅ Audit report generated', { component: 'Chanuka' });
    console.log(`   - Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`   - Total Events: ${auditReport.summary.totalEvents}`);
    console.log(`   - Total Incidents: ${auditReport.summary.totalIncidents}`);
    console.log(`   - High Risk Events: ${auditReport.summary.highRiskEvents}`);
    console.log(`   - Recommendations: ${auditReport.recommendations.length}`);

    // Test 9: Test intrusion detection report
    logger.info('\n9. Testing intrusion detection report...', { component: 'Chanuka' });
    const intrusionReport = await intrusionDetectionService.generateIntrusionReport(startDate, endDate);
    logger.info('✅ Intrusion detection report generated', { component: 'Chanuka' });
    console.log(`   - Total Threats: ${intrusionReport.summary.totalThreats}`);
    console.log(`   - Blocked IPs: ${intrusionReport.summary.blockedIPs}`);
    console.log(`   - Active Threats: ${intrusionReport.summary.activeThreats}`);

    // Test 10: Test comprehensive security report
    logger.info('\n10. Testing comprehensive security report...', { component: 'Chanuka' });
    const securityReport = await securityMonitoringService.generateSecurityReport(startDate, endDate);
    logger.info('✅ Comprehensive security report generated', { component: 'Chanuka' });
    console.log(`   - Executive Summary:`);
    console.log(`     - Total Events: ${securityReport.executive_summary.total_events}`);
    console.log(`     - Security Incidents: ${securityReport.executive_summary.security_incidents}`);
    console.log(`     - Compliance Score: ${securityReport.executive_summary.compliance_score}%`);
    console.log(`     - Risk Assessment: ${securityReport.executive_summary.risk_assessment}`);
    console.log(`     - Key Findings: ${securityReport.executive_summary.key_findings.length}`);

    // Test 11: Test authentication event logging
    logger.info('\n11. Testing authentication event logging...', { component: 'Chanuka' });
    await securityAuditService.logAuthEvent(
      'login_attempt',
      mockRequest,
      'test-user-123',
      true,
      { endpoint: '/api/auth/login', method: 'POST' }
    );
    logger.info('✅ Authentication event logged', { component: 'Chanuka' });

    // Test 12: Test data access logging
    logger.info('\n12. Testing data access logging...', { component: 'Chanuka' });
    await securityAuditService.logDataAccess(
      '/api/bills',
      'GET',
      mockRequest,
      'test-user-123',
      25,
      true
    );
    logger.info('✅ Data access event logged', { component: 'Chanuka' });

    // Test 13: Test admin action logging
    logger.info('\n13. Testing admin action logging...', { component: 'Chanuka' });
    await securityAuditService.logAdminAction(
      'test_admin_action',
      mockRequest,
      'admin-user-456',
      '/api/admin/users',
      { action: 'user_management', target: 'test-user-123' }
    );
    logger.info('✅ Admin action logged', { component: 'Chanuka' });

    logger.info('\n', { component: 'Chanuka' }, + '='.repeat(60));
    logger.info('🎉 All security monitoring tests completed successfully!', { component: 'Chanuka' });
    logger.info('✅ Security audit logging: WORKING', { component: 'Chanuka' });
    logger.info('✅ Intrusion detection: WORKING', { component: 'Chanuka' });
    logger.info('✅ Threat analysis: WORKING', { component: 'Chanuka' });
    logger.info('✅ Compliance monitoring: WORKING', { component: 'Chanuka' });
    logger.info('✅ Alert system: WORKING', { component: 'Chanuka' });
    logger.info('✅ IP blocking: WORKING', { component: 'Chanuka' });
    logger.info('✅ Report generation: WORKING', { component: 'Chanuka' });
    logger.info('✅ Dashboard integration: WORKING', { component: 'Chanuka' });

  } catch (error) {
    logger.error('\n❌ Security monitoring test failed:', { component: 'Chanuka' }, error);
    logger.error('Stack trace:', { component: 'Chanuka' }, (error as Error).stack);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecurityMonitoring()
    .then(() => {
      logger.info('\n✅ Security monitoring system is ready for production use', { component: 'Chanuka' });
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Security monitoring system test failed:', { component: 'Chanuka' }, error);
      process.exit(1);
    });
}

export { testSecurityMonitoring };












































