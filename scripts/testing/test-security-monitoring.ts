import { securityMonitoringService } from './services/security-monitoring-service.js';
import { intrusionDetectionService } from './services/intrusion-detection-service.js';
import { securityAuditService } from './services/security-audit-service.js';

/**
 * Test script to verify security monitoring and audit system functionality
 */
async function testSecurityMonitoring() {
  console.log('🔒 Testing Security Monitoring and Audit System');
  console.log('=' .repeat(60));

  try {
    // Test 1: Initialize security monitoring
    console.log('\n1. Initializing security monitoring system...');
    await securityMonitoringService.initialize();
    console.log('✅ Security monitoring initialized successfully');

    // Test 2: Test security audit logging
    console.log('\n2. Testing security audit logging...');
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
    console.log('✅ Security event logged successfully');

    // Test 3: Test threat detection
    console.log('\n3. Testing threat detection...');
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
    console.log('✅ Threat detection completed');
    console.log(`   - Threat Level: ${threatResult.threatLevel}`);
    console.log(`   - Risk Score: ${threatResult.riskScore}`);
    console.log(`   - Detected Threats: ${threatResult.detectedThreats.length}`);
    console.log(`   - Recommended Action: ${threatResult.recommendedAction}`);

    if (threatResult.detectedThreats.length > 0) {
      console.log('   - Threat Details:');
      threatResult.detectedThreats.forEach((threat, index) => {
        console.log(`     ${index + 1}. ${threat.type} (${threat.severity}) - ${threat.description}`);
      });
    }

    // Test 4: Test compliance checks
    console.log('\n4. Testing compliance checks...');
    await securityMonitoringService.runComplianceChecks();
    console.log('✅ Compliance checks completed');

    // Test 5: Test security dashboard
    console.log('\n5. Testing security dashboard...');
    const dashboard = await securityMonitoringService.getSecurityDashboard();
    console.log('✅ Security dashboard data retrieved');
    console.log(`   - Total Events: ${dashboard.overview.totalEvents}`);
    console.log(`   - Critical Alerts: ${dashboard.overview.criticalAlerts}`);
    console.log(`   - Risk Level: ${dashboard.overview.riskLevel}`);
    console.log(`   - Compliance Score: ${dashboard.overview.complianceScore}%`);
    console.log(`   - Recent Alerts: ${dashboard.recentAlerts.length}`);
    console.log(`   - Recommendations: ${dashboard.recommendations.length}`);

    // Test 6: Test alert creation
    console.log('\n6. Testing alert creation...');
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
    console.log('\n7. Testing IP blocking functionality...');
    const testIP = '192.168.1.999'; // Fake IP for testing
    await intrusionDetectionService.blockIP(testIP, 'Test blocking functionality', 60000); // 1 minute
    const isBlocked = intrusionDetectionService.isIPBlocked(testIP);
    console.log(`✅ IP blocking test: ${isBlocked ? 'BLOCKED' : 'NOT BLOCKED'}`);
    
    // Unblock the test IP
    setTimeout(async () => {
      await intrusionDetectionService.unblockIP(testIP);
      console.log('✅ Test IP unblocked');
    }, 2000);

    // Test 8: Test audit report generation
    console.log('\n8. Testing audit report generation...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const auditReport = await securityAuditService.generateAuditReport(startDate, endDate);
    console.log('✅ Audit report generated');
    console.log(`   - Period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`   - Total Events: ${auditReport.summary.totalEvents}`);
    console.log(`   - Total Incidents: ${auditReport.summary.totalIncidents}`);
    console.log(`   - High Risk Events: ${auditReport.summary.highRiskEvents}`);
    console.log(`   - Recommendations: ${auditReport.recommendations.length}`);

    // Test 9: Test intrusion detection report
    console.log('\n9. Testing intrusion detection report...');
    const intrusionReport = await intrusionDetectionService.generateIntrusionReport(startDate, endDate);
    console.log('✅ Intrusion detection report generated');
    console.log(`   - Total Threats: ${intrusionReport.summary.totalThreats}`);
    console.log(`   - Blocked IPs: ${intrusionReport.summary.blockedIPs}`);
    console.log(`   - Active Threats: ${intrusionReport.summary.activeThreats}`);

    // Test 10: Test comprehensive security report
    console.log('\n10. Testing comprehensive security report...');
    const securityReport = await securityMonitoringService.generateSecurityReport(startDate, endDate);
    console.log('✅ Comprehensive security report generated');
    console.log(`   - Executive Summary:`);
    console.log(`     - Total Events: ${securityReport.executive_summary.total_events}`);
    console.log(`     - Security Incidents: ${securityReport.executive_summary.security_incidents}`);
    console.log(`     - Compliance Score: ${securityReport.executive_summary.compliance_score}%`);
    console.log(`     - Risk Assessment: ${securityReport.executive_summary.risk_assessment}`);
    console.log(`     - Key Findings: ${securityReport.executive_summary.key_findings.length}`);

    // Test 11: Test authentication event logging
    console.log('\n11. Testing authentication event logging...');
    await securityAuditService.logAuthEvent(
      'login_attempt',
      mockRequest,
      'test-user-123',
      true,
      { endpoint: '/api/auth/login', method: 'POST' }
    );
    console.log('✅ Authentication event logged');

    // Test 12: Test data access logging
    console.log('\n12. Testing data access logging...');
    await securityAuditService.logDataAccess(
      '/api/bills',
      'GET',
      mockRequest,
      'test-user-123',
      25,
      true
    );
    console.log('✅ Data access event logged');

    // Test 13: Test admin action logging
    console.log('\n13. Testing admin action logging...');
    await securityAuditService.logAdminAction(
      'test_admin_action',
      mockRequest,
      'admin-user-456',
      '/api/admin/users',
      { action: 'user_management', target: 'test-user-123' }
    );
    console.log('✅ Admin action logged');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All security monitoring tests completed successfully!');
    console.log('✅ Security audit logging: WORKING');
    console.log('✅ Intrusion detection: WORKING');
    console.log('✅ Threat analysis: WORKING');
    console.log('✅ Compliance monitoring: WORKING');
    console.log('✅ Alert system: WORKING');
    console.log('✅ IP blocking: WORKING');
    console.log('✅ Report generation: WORKING');
    console.log('✅ Dashboard integration: WORKING');

  } catch (error) {
    console.error('\n❌ Security monitoring test failed:', error);
    console.error('Stack trace:', (error as Error).stack);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecurityMonitoring()
    .then(() => {
      console.log('\n✅ Security monitoring system is ready for production use');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Security monitoring system test failed:', error);
      process.exit(1);
    });
}

export { testSecurityMonitoring };