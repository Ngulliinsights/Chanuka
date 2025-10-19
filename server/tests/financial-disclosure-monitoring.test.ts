import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FinancialDisclosureMonitoringService } from '../features/analytics/financial-disclosure/monitoring.js';
import { cacheService } from '../infrastructure/cache/cache-service.js';
import { logger } from '../../shared/core/src/observability/logging';

// Mock financialDisclosureMonitoringService
const financialDisclosureMonitoringService = {
  stopAutomatedMonitoring: jest.fn(),
  collectFinancialDisclosures: jest.fn(),
  createDisclosureAlert: jest.fn(),
  monitorDisclosureUpdates: jest.fn(),
  getDisclosureAlerts: jest.fn(),
  buildFinancialRelationshipMap: jest.fn(),
  calculateDisclosureCompletenessScore: jest.fn(),
  getFinancialTransparencyDashboard: jest.fn(),
  startAutomatedMonitoring: jest.fn(),
  getHealthStatus: jest.fn()
};

describe('Financial Disclosure Monitoring Service', () => {
  beforeAll(async () => {
    // Initialize any test setup
  });

  afterAll(async () => {
    // Clean up after tests
    financialDisclosureMonitoringService.stopAutomatedMonitoring();
    cacheService.clear();
  });

  beforeEach(() => {
    // Clear cache before each test
    cacheService.clear();
  });

  describe('Automated Data Collection', () => {
    it('should collect financial disclosures for all sponsors', async () => {
      const disclosures = await financialDisclosureMonitoringService.collectFinancialDisclosures();
      
      expect(Array.isArray(disclosures)).toBe(true);
      // Each disclosure should have required properties
      if (disclosures.length > 0) {
        const disclosure = disclosures[0];
        expect(disclosure).toHaveProperty('id');
        expect(disclosure).toHaveProperty('sponsorId');
        expect(disclosure).toHaveProperty('disclosureType');
        expect(disclosure).toHaveProperty('completenessScore');
        expect(disclosure).toHaveProperty('riskLevel');
      }
    });

    it('should collect financial disclosures for specific sponsor', async () => {
      const sponsorId = 1;
      const disclosures = await financialDisclosureMonitoringService.collectFinancialDisclosures(sponsorId);
      
      expect(Array.isArray(disclosures)).toBe(true);
      // All disclosures should be for the specified sponsor
      disclosures.forEach(disclosure => {
        expect(disclosure.sponsorId).toBe(sponsorId);
      });
    });

    it('should cache disclosure data for performance', async () => {
      const sponsorId = 1;
      
      // First call - should fetch from database
      const start1 = Date.now();
      await financialDisclosureMonitoringService.collectFinancialDisclosures(sponsorId);
      const time1 = Date.now() - start1;
      
      // Second call - should use cache
      const start2 = Date.now();
      await financialDisclosureMonitoringService.collectFinancialDisclosures(sponsorId);
      const time2 = Date.now() - start2;
      
      // Cache should be significantly faster
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('Alert System', () => {
    it('should create disclosure alerts', async () => {
      const alert = await financialDisclosureMonitoringService.createDisclosureAlert(
        'new_disclosure',
        1,
        'Test alert description',
        'info'
      );
      
      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('type', 'new_disclosure');
      expect(alert).toHaveProperty('sponsorId', 1);
      expect(alert).toHaveProperty('description', 'Test alert description');
      expect(alert).toHaveProperty('severity', 'info');
      expect(alert).toHaveProperty('createdAt');
      expect(alert.isResolved).toBe(false);
    });

    it('should monitor disclosure updates and generate alerts', async () => {
      const alerts = await financialDisclosureMonitoringService.monitorDisclosureUpdates();
      
      expect(Array.isArray(alerts)).toBe(true);
      // Each alert should have required properties
      alerts.forEach(alert => {
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('sponsorId');
        expect(alert).toHaveProperty('severity');
        expect(['info', 'warning', 'critical']).toContain(alert.severity);
      });
    });

    it('should get alerts for specific sponsor', async () => {
      const sponsorId = 1;
      const alerts = await financialDisclosureMonitoringService.getDisclosureAlerts(sponsorId);
      
      expect(Array.isArray(alerts)).toBe(true);
      alerts.forEach(alert => {
        expect(alert.sponsorId).toBe(sponsorId);
      });
    });

    it('should filter alerts by type and severity', async () => {
      const sponsorId = 1;
      const filters = {
        type: 'missing_disclosure',
        severity: 'critical',
        limit: 5
      };
      
      const alerts = await financialDisclosureMonitoringService.getDisclosureAlerts(sponsorId, filters);
      
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeLessThanOrEqual(5);
      alerts.forEach(alert => {
        if (alert.type) expect(alert.type).toBe('missing_disclosure');
        if (alert.severity) expect(alert.severity).toBe('critical');
      });
    });
  });

  describe('Financial Relationship Mapping', () => {
    it('should build financial relationship map for sponsor', async () => {
      const sponsorId = 1;
      const relationships = await financialDisclosureMonitoringService.buildFinancialRelationshipMap(sponsorId);
      
      expect(Array.isArray(relationships)).toBe(true);
      relationships.forEach(relationship => {
        expect(relationship).toHaveProperty('sponsorId', sponsorId);
        expect(relationship).toHaveProperty('relatedEntity');
        expect(relationship).toHaveProperty('relationshipType');
        expect(relationship).toHaveProperty('strength');
        expect(relationship).toHaveProperty('isActive');
        expect(typeof relationship.strength).toBe('number');
        expect(relationship.strength).toBeGreaterThanOrEqual(0);
        expect(relationship.strength).toBeLessThanOrEqual(100);
      });
    });

    it('should cache relationship data', async () => {
      const sponsorId = 1;
      
      // First call
      const start1 = Date.now();
      await financialDisclosureMonitoringService.buildFinancialRelationshipMap(sponsorId);
      const time1 = Date.now() - start1;
      
      // Second call - should use cache
      const start2 = Date.now();
      await financialDisclosureMonitoringService.buildFinancialRelationshipMap(sponsorId);
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('Disclosure Completeness Scoring', () => {
    it('should calculate completeness score for sponsor', async () => {
      const sponsorId = 1;
      const report = await financialDisclosureMonitoringService.calculateDisclosureCompletenessScore(sponsorId);
      
      expect(report).toHaveProperty('sponsorId', sponsorId);
      expect(report).toHaveProperty('sponsorName');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('requiredDisclosures');
      expect(report).toHaveProperty('completedDisclosures');
      expect(report).toHaveProperty('missingDisclosures');
      expect(report).toHaveProperty('lastUpdateDate');
      expect(report).toHaveProperty('riskAssessment');
      
      expect(typeof report.overallScore).toBe('number');
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(report.missingDisclosures)).toBe(true);
      expect(['low', 'medium', 'high', 'critical']).toContain(report.riskAssessment);
    });

    it('should cache completeness scores', async () => {
      const sponsorId = 1;
      
      // First call
      const start1 = Date.now();
      await financialDisclosureMonitoringService.calculateDisclosureCompletenessScore(sponsorId);
      const time1 = Date.now() - start1;
      
      // Second call - should use cache
      const start2 = Date.now();
      await financialDisclosureMonitoringService.calculateDisclosureCompletenessScore(sponsorId);
      const time2 = Date.now() - start2;
      
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('Financial Transparency Dashboard', () => {
    it('should generate comprehensive dashboard data', async () => {
      const dashboard = await financialDisclosureMonitoringService.getFinancialTransparencyDashboard();
      
      expect(dashboard).toHaveProperty('totalSponsors');
      expect(dashboard).toHaveProperty('averageCompletenessScore');
      expect(dashboard).toHaveProperty('recentAlerts');
      expect(dashboard).toHaveProperty('topRiskSponsors');
      expect(dashboard).toHaveProperty('disclosureStats');
      
      expect(typeof dashboard.totalSponsors).toBe('number');
      expect(typeof dashboard.averageCompletenessScore).toBe('number');
      expect(Array.isArray(dashboard.recentAlerts)).toBe(true);
      expect(Array.isArray(dashboard.topRiskSponsors)).toBe(true);
      
      expect(dashboard.disclosureStats).toHaveProperty('total');
      expect(dashboard.disclosureStats).toHaveProperty('verified');
      expect(dashboard.disclosureStats).toHaveProperty('pending');
      expect(dashboard.disclosureStats).toHaveProperty('byType');
    });
  });

  describe('Automated Monitoring', () => {
    it('should start and stop automated monitoring', () => {
      // Start monitoring
      expect(() => {
        financialDisclosureMonitoringService.startAutomatedMonitoring();
      }).not.toThrow();
      
      // Stop monitoring
      expect(() => {
        financialDisclosureMonitoringService.stopAutomatedMonitoring();
      }).not.toThrow();
    });
  });

  describe('Health Status', () => {
    it('should provide health status information', async () => {
      const healthStatus = await financialDisclosureMonitoringService.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('uptime');
      expect(healthStatus).toHaveProperty('checks');
      expect(typeof healthStatus.uptime).toBe('number');
      expect(Array.isArray(healthStatus.checks)).toBe(true);
      
      healthStatus.checks.forEach(check => {
        expect(check).toHaveProperty('name');
        expect(check).toHaveProperty('status');
        expect(check).toHaveProperty('message');
        expect(check).toHaveProperty('lastCheck');
        expect(['healthy', 'warning', 'critical']).toContain(check.status);
      });
    });
  });
});











































