import { describe, it, expect, beforeEach } from '@jest/globals';
import { sponsorConflictAnalysisService } from '../features/bills/sponsor-conflict-analysis.js';
import { logger } from '../utils/logger';

describe('SponsorConflictAnalysisService', () => {
  describe('calculateConflictSeverity', () => {
    it('should calculate critical severity for high financial impact direct conflicts', () => {
      const severity = sponsorConflictAnalysisService.calculateConflictSeverity(
        'financial_direct',
        15000000, // $15M
        { multipleAffiliations: true, recentActivity: true }
      );
      
      expect(severity).toBe('critical');
    });

    it('should calculate medium severity for moderate organizational conflicts', () => {
      const severity = sponsorConflictAnalysisService.calculateConflictSeverity(
        'organizational',
        500000, // $500K
        { publicScrutiny: true }
      );
      
      expect(severity).toBe('medium');
    });

    it('should calculate low severity for minor disclosure issues', () => {
      const severity = sponsorConflictAnalysisService.calculateConflictSeverity(
        'disclosure_incomplete',
        0,
        {}
      );
      
      expect(severity).toBe('low');
    });

    it('should calculate high severity for suspicious timing with significant financial impact', () => {
      const severity = sponsorConflictAnalysisService.calculateConflictSeverity(
        'timing_suspicious',
        8000000, // $8M
        { recentActivity: true }
      );
      
      expect(severity).toBe('high');
    });
  });

  describe('conflict detection algorithms', () => {
    it('should detect conflicts when called without parameters', async () => {
      // This test will work with actual database data
      const conflicts = await sponsorConflictAnalysisService.detectConflicts();
      
      expect(Array.isArray(conflicts)).toBe(true);
      // Each conflict should have required properties
      conflicts.forEach(conflict => {
        expect(conflict).toHaveProperty('conflictId');
        expect(conflict).toHaveProperty('sponsorId');
        expect(conflict).toHaveProperty('conflictType');
        expect(conflict).toHaveProperty('severity');
        expect(conflict).toHaveProperty('description');
        expect(conflict).toHaveProperty('affectedBills');
        expect(conflict).toHaveProperty('financialImpact');
        expect(conflict).toHaveProperty('detectedAt');
        expect(conflict).toHaveProperty('confidence');
        
        // Validate severity levels
        expect(['low', 'medium', 'high', 'critical']).toContain(conflict.severity);
        
        // Validate conflict types
        expect([
          'financial_direct', 'financial_indirect', 'organizational',
          'family_business', 'voting_pattern', 'timing_suspicious', 'disclosure_incomplete'
        ]).toContain(conflict.conflictType);
        
        // Validate confidence is between 0 and 1
        expect(conflict.confidence).toBeGreaterThanOrEqual(0);
        expect(conflict.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('conflict mapping', () => {
    it('should create conflict mapping with nodes and edges', async () => {
      const mapping = await sponsorConflictAnalysisService.createConflictMapping();
      
      expect(mapping).toHaveProperty('nodes');
      expect(mapping).toHaveProperty('edges');
      expect(mapping).toHaveProperty('clusters');
      expect(mapping).toHaveProperty('metrics');
      
      expect(Array.isArray(mapping.nodes)).toBe(true);
      expect(Array.isArray(mapping.edges)).toBe(true);
      expect(Array.isArray(mapping.clusters)).toBe(true);
      
      // Validate node structure
      mapping.nodes.forEach(node => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('conflictLevel');
        expect(['sponsor', 'organization', 'bill']).toContain(node.type);
        expect(['low', 'medium', 'high', 'critical']).toContain(node.conflictLevel);
      });
      
      // Validate edge structure
      mapping.edges.forEach(edge => {
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
        expect(edge).toHaveProperty('type');
        expect(edge).toHaveProperty('weight');
        expect(edge).toHaveProperty('severity');
      });
      
      // Validate metrics
      expect(mapping.metrics).toHaveProperty('totalNodes');
      expect(mapping.metrics).toHaveProperty('totalEdges');
      expect(mapping.metrics).toHaveProperty('density');
      expect(mapping.metrics.totalNodes).toBe(mapping.nodes.length);
      expect(mapping.metrics.totalEdges).toBe(mapping.edges.length);
    });
  });

  describe('trend analysis', () => {
    it('should analyze conflict trends over time', async () => {
      const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(undefined, 6);
      
      expect(Array.isArray(trends)).toBe(true);
      
      trends.forEach(trend => {
        expect(trend).toHaveProperty('sponsorId');
        expect(trend).toHaveProperty('timeframe');
        expect(trend).toHaveProperty('conflictCount');
        expect(trend).toHaveProperty('severityTrend');
        expect(trend).toHaveProperty('riskScore');
        expect(trend).toHaveProperty('predictions');
        
        expect(['increasing', 'decreasing', 'stable']).toContain(trend.severityTrend);
        expect(trend.riskScore).toBeGreaterThanOrEqual(0);
        expect(trend.riskScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(trend.predictions)).toBe(true);
      });
    });
  });
});

// Integration tests for API endpoints
describe('Sponsor Conflict Analysis API Integration', () => {
  it('should handle conflict detection endpoint', async () => {
    // This would require setting up a test server
    // For now, just testing the service layer
    const conflicts = await sponsorConflictAnalysisService.detectConflicts();
    expect(Array.isArray(conflicts)).toBe(true);
  });
});






