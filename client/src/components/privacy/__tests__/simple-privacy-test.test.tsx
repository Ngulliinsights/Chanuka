/**
 * Simple Privacy Components Test
 * Basic test to verify privacy components can be imported and instantiated
 */

import { describe, it, expect } from 'vitest';

describe('Privacy Components Import Test', () => {
  it('should be able to import privacy components', async () => {
    // Test that the components can be imported without errors
    const { CookieConsentBanner } = await import('../CookieConsentBanner');
    const { DataUsageReportDashboard } = await import('../DataUsageReportDashboard');
    const { GDPRComplianceManager } = await import('../GDPRComplianceManager');

    expect(CookieConsentBanner).toBeDefined();
    expect(DataUsageReportDashboard).toBeDefined();
    expect(GDPRComplianceManager).toBeDefined();
  });

  it('should export privacy components from index', async () => {
    const privacyIndex = await import('../index');
    
    expect(privacyIndex.CookieConsentBanner).toBeDefined();
    expect(privacyIndex.DataUsageReportDashboard).toBeDefined();
    expect(privacyIndex.GDPRComplianceManager).toBeDefined();
  });
});