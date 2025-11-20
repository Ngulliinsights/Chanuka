import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describe, it, expect } from '@jest/globals';
import { sponsorConflictAnalysisService } from '@server/features/bills/sponsor-conflict-analysis';

/**
 * Test Suite: Sponsor Conflict Analysis Service
 * 
 * This suite validates the conflict detection, severity calculation, 
 * and analysis capabilities of the sponsor conflict system.
 */
describe('SponsorConflictAnalysisService', () => {
  
  /**
   * Severity Calculation Tests
   * 
   * These tests verify that conflict severity is correctly calculated
   * based on conflict type, financial impact, and contextual factors.
   */
  describe('calculateConflictSeverity', () => {
    
    it('should calculate critical severity for high financial impact direct conflicts', () => {
      const FIFTEEN_MILLION = 15000000;
      const contextFactors = { 
        multipleAffiliations: true, 
        recentActivity: true 
      };
      
      const severity = sponsorConflictAnalysisService.calculateConflictSeverity(
        'financial_direct',
        FIFTEEN_MILLION,
        contextFactors
      );
      
      expect(severity).toBe('critical');
    });

    it('should calculate medium severity for moderate organizational conflicts', () => {
      const FIVE_HUNDRED_THOUSAND = 500000;
      const contextFactors = { publicScrutiny: true };
      
      const severity = sponsorConflictAnalysisService.calculateConflictSeverity(
        'organizational',
        FIVE_HUNDRED_THOUSAND,
        contextFactors
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
      const EIGHT_MILLION = 8000000;
      const contextFactors = { recentActivity: true };
      
      const severity = sponsorConflictAnalysisService.calculateConflictSeverity(
        'timing_suspicious',
        EIGHT_MILLION,
        contextFactors
      );
      
      expect(severity).toBe('high');
    });
  });

  /**
   * Conflict Detection Algorithm Tests
   * 
   * These tests validate the core conflict detection logic against
   * real database data, ensuring all required fields and valid values.
   */
  describe('conflict detection algorithms', () => {
    
    // Valid severity levels expected in the system
    const VALID_SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];
    
    // Valid conflict types the system can detect
    const VALID_CONFLICT_TYPES = [
      'financial_direct',
      'financial_indirect',
      'organizational',
      'family_business',
      'voting_pattern',
      'timing_suspicious',
      'disclosure_incomplete'
    ];
    
    it('should detect conflicts when called without parameters', async () => {
      const conflicts = await sponsorConflictAnalysisService.detectConflicts();
      
      // Verify we receive an array response
      expect(Array.isArray(conflicts)).toBe(true);
      
      // Validate each detected conflict has the complete required structure
      conflicts.forEach((conflict) => {
        // Required fields presence check
        expect(conflict).toHaveProperty('conflictId');
        expect(conflict).toHaveProperty('sponsor_id');
        expect(conflict).toHaveProperty('conflictType');
        expect(conflict).toHaveProperty('severity');
        expect(conflict).toHaveProperty('description');
        expect(conflict).toHaveProperty('affectedBills');
        expect(conflict).toHaveProperty('financialImpact');
        expect(conflict).toHaveProperty('detectedAt');
        expect(conflict).toHaveProperty('confidence');
        
        // Validate severity is one of the allowed values
        expect(VALID_SEVERITY_LEVELS).toContain(conflict.severity);
        
        // Validate conflict type is recognized by the system
        expect(VALID_CONFLICT_TYPES).toContain(conflict.conflictType);
        
        // Validate confidence score is within valid range [0, 1]
        expect(conflict.confidence).toBeGreaterThanOrEqual(0);
        expect(conflict.confidence).toBeLessThanOrEqual(1);
        
        // Additional type validations for data integrity
        expect(typeof conflict.conflictId).toBe('string');
        expect(typeof conflict.sponsor_id).toBe('string');
        expect(typeof conflict.description).toBe('string');
        expect(Array.isArray(conflict.affectedBills)).toBe(true);
        expect(typeof conflict.financialImpact).toBe('number');
        expect(conflict.financialImpact).toBeGreaterThanOrEqual(0);
      });
    });
  });

  /**
   * Conflict Network Mapping Tests
   * 
   * These tests verify the graph-based conflict mapping system,
   * which visualizes relationships between sponsors, organizations, and bills.
   */
  describe('conflict mapping', () => {
    
    // Valid node types in the conflict graph
    const VALID_NODE_TYPES = ['sponsor', 'organization', 'bill'];
    
    // Valid conflict levels for nodes
    const VALID_CONFLICT_LEVELS = ['low', 'medium', 'high', 'critical'];
    
    it('should create conflict mapping with nodes and edges', async () => {
      const mapping = await sponsorConflictAnalysisService.createConflictMapping();
      
      // Verify top-level structure of the mapping object
      expect(mapping).toHaveProperty('nodes');
      expect(mapping).toHaveProperty('edges');
      expect(mapping).toHaveProperty('clusters');
      expect(mapping).toHaveProperty('metrics');
      
      // Verify all collections are arrays
      expect(Array.isArray(mapping.nodes)).toBe(true);
      expect(Array.isArray(mapping.edges)).toBe(true);
      expect(Array.isArray(mapping.clusters)).toBe(true);
      
      // Validate each node in the conflict graph
      mapping.nodes.forEach((node) => {
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('name');
        expect(node).toHaveProperty('conflict_level');
        
        // Ensure node type is valid
        expect(VALID_NODE_TYPES).toContain(node.type);
        
        // Ensure conflict level is valid
        expect(VALID_CONFLICT_LEVELS).toContain(node.conflict_level);
        
        // Validate data types
        expect(typeof node.id).toBe('string');
        expect(typeof node.name).toBe('string');
      });
      
      // Validate each edge (relationship) in the conflict graph
      mapping.edges.forEach((edge) => {
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
        expect(edge).toHaveProperty('type');
        expect(edge).toHaveProperty('weight');
        expect(edge).toHaveProperty('severity');
        
        // Validate data types
        expect(typeof edge.source).toBe('string');
        expect(typeof edge.target).toBe('string');
        expect(typeof edge.type).toBe('string');
        expect(typeof edge.weight).toBe('number');
        
        // Ensure weight is non-negative
        expect(edge.weight).toBeGreaterThanOrEqual(0);
      });
      
      // Validate graph metrics for consistency
      expect(mapping.metrics).toHaveProperty('totalNodes');
      expect(mapping.metrics).toHaveProperty('totalEdges');
      expect(mapping.metrics).toHaveProperty('density');
      
      // Verify metrics match actual graph size
      expect(mapping.metrics.totalNodes).toBe(mapping.nodes.length);
      expect(mapping.metrics.totalEdges).toBe(mapping.edges.length);
      
      // Ensure density is a valid ratio
      expect(typeof mapping.metrics.density).toBe('number');
      expect(mapping.metrics.density).toBeGreaterThanOrEqual(0);
      expect(mapping.metrics.density).toBeLessThanOrEqual(1);
    });
  });

  /**
   * Temporal Trend Analysis Tests
   * 
   * These tests validate the system's ability to track conflict patterns
   * over time and generate risk predictions.
   */
  describe('trend analysis', () => {
    
    // Valid trend directions
    const VALID_SEVERITY_TRENDS = ['increasing', 'decreasing', 'stable'];
    
    // Risk score boundaries
    const MIN_RISK_SCORE = 0;
    const MAX_RISK_SCORE = 100;
    
    // Default lookback period in months
    const DEFAULT_LOOKBACK_MONTHS = 6;
    
    it('should analyze conflict trends over time', async () => {
      const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(
        undefined, 
        DEFAULT_LOOKBACK_MONTHS
      );
      
      // Verify we receive trend data
      expect(Array.isArray(trends)).toBe(true);
      
      // Validate each trend analysis result
      trends.forEach((trend) => {
        // Required fields for trend analysis
        expect(trend).toHaveProperty('sponsor_id');
        expect(trend).toHaveProperty('timeframe');
        expect(trend).toHaveProperty('conflictCount');
        expect(trend).toHaveProperty('severityTrend');
        expect(trend).toHaveProperty('risk_score');
        expect(trend).toHaveProperty('predictions');
        
        // Validate severity trend direction
        expect(VALID_SEVERITY_TRENDS).toContain(trend.severityTrend);
        
        // Validate risk score is within valid percentage range
        expect(trend.risk_score).toBeGreaterThanOrEqual(MIN_RISK_SCORE);
        expect(trend.risk_score).toBeLessThanOrEqual(MAX_RISK_SCORE);
        
        // Validate predictions structure
        expect(Array.isArray(trend.predictions)).toBe(true);
        
        // Validate data types
        expect(typeof trend.sponsor_id).toBe('string');
        expect(typeof trend.conflictCount).toBe('number');
        expect(trend.conflictCount).toBeGreaterThanOrEqual(0);
        
        // Validate timeframe structure if present
        if (trend.timeframe) {
          expect(trend.timeframe).toHaveProperty('start');
          expect(trend.timeframe).toHaveProperty('end');
        }
      });
    });
  });
});

/**
 * Integration Tests: API Endpoints
 * 
 * These tests validate the service layer integration points
 * that would be exposed through API endpoints.
 */
describe('Sponsor Conflict Analysis API Integration', () => {
  
  it('should handle conflict detection endpoint', async () => {
    // This validates the service layer that backs the API endpoint
    // Full API integration would require test server setup
    const conflicts = await sponsorConflictAnalysisService.detectConflicts();
    
    expect(Array.isArray(conflicts)).toBe(true);
    
    // Verify the response is suitable for API consumption
    if (conflicts.length > 0) {
      const sampleConflict = conflicts[0];
      
      // Ensure the response is JSON-serializable (no circular references)
      expect(() => JSON.stringify(sampleConflict)).not.toThrow();
      
      // Verify required fields for API responses
      expect(sampleConflict).toHaveProperty('conflictId');
      expect(sampleConflict).toHaveProperty('severity');
    }
  });
});






































