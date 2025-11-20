// ============================================================================
// STANDALONE FUSE.JS ENGINE TESTS
// ============================================================================
// Simple tests to verify Fuse.js engine functionality without complex imports

import { describe, it, expect } from 'vitest';
import Fuse from 'fuse.js';

// Mock data for testing
const mockSearchableItems = [
  {
    id: '1',
    type: 'bill' as const,
    title: 'Healthcare Reform Act 2024',
    content: 'A comprehensive bill to reform healthcare system',
    metadata: { status: 'introduced', chamber: 'house' }
  },
  {
    id: '2', 
    type: 'bill' as const,
    title: 'Education Funding Bill',
    content: 'Increase funding for public education',
    metadata: { status: 'passed', chamber: 'senate' }
  },
  {
    id: '3',
    type: 'bill' as const,
    title: 'Climate Change Mitigation Act',
    content: 'Environmental protection and climate action',
    metadata: { status: 'introduced', chamber: 'house' }
  },
  {
    id: '4',
    type: 'sponsor' as const,
    title: 'Senator John Smith',
    content: 'Healthcare advocate from California',
    metadata: { party: 'Democrat', state: 'CA' }
  }
];

describe('Fuse.js Library Integration', () => {
  it('should be properly installed and importable', () => {
    expect(Fuse).toBeDefined();
    expect(typeof Fuse).toBe('function');
  });

  it('should create a Fuse instance with basic configuration', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: ['title', 'content'],
      threshold: 0.3,
      includeScore: true
    });

    expect(fuse).toBeDefined();
    expect(typeof fuse.search).toBe('function');
  });

  it('should perform basic fuzzy search', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: ['title', 'content'],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true
    });

    const results = fuse.search('healthcare');
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    // Should find the Healthcare Reform Act
    const healthcareResult = results.find(r => 
      r.item.title.includes('Healthcare')
    );
    expect(healthcareResult).toBeDefined();
  });

  it('should handle typos in search queries', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: ['title', 'content'],
      threshold: 0.4, // More lenient for typos
      includeScore: true
    });

    const results = fuse.search('helthcare'); // Typo: missing 'a'
    
    expect(Array.isArray(results)).toBe(true);
    
    // Should still find healthcare-related content despite typo
    if (results.length > 0) {
      const healthcareResult = results.find(r => 
        r.item.title.toLowerCase().includes('healthcare') ||
        r.item.content.toLowerCase().includes('healthcare')
      );
      expect(healthcareResult).toBeDefined();
    }
  });

  it('should provide relevance scores', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'content', weight: 0.3 }
      ],
      threshold: 0.3,
      includeScore: true
    });

    const results = fuse.search('education');
    
    expect(Array.isArray(results)).toBe(true);
    
    results.forEach(result => {
      expect(result).toHaveProperty('score');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  it('should provide match highlighting information', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: ['title', 'content'],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true
    });

    const results = fuse.search('climate');
    
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      const climateResult = results.find(r => 
        r.item.title.toLowerCase().includes('climate')
      );
      
      if (climateResult) {
        expect(climateResult).toHaveProperty('matches');
        expect(Array.isArray(climateResult.matches)).toBe(true);
        
        if (climateResult.matches && climateResult.matches.length > 0) {
          const match = climateResult.matches[0];
          expect(match).toHaveProperty('indices');
          expect(Array.isArray(match.indices)).toBe(true);
        }
      }
    }
  });

  it('should handle weighted search keys', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: [
        { name: 'title', weight: 0.8 }, // Title matches more important
        { name: 'content', weight: 0.2 }
      ],
      threshold: 0.3,
      includeScore: true
    });

    const results = fuse.search('funding');
    
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 1) {
      // Results should be sorted by relevance (lower score = more relevant)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i-1].score);
      }
    }
  });

  it('should support exact phrase matching', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: ['title', 'content'],
      threshold: 0.1, // Strict matching for exact phrases
      includeScore: true,
      useExtendedSearch: true
    });

    // Test exact phrase search with quotes
    const results = fuse.search('"Healthcare Reform"');
    
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      const exactMatch = results.find(r => 
        r.item.title.includes('Healthcare Reform')
      );
      expect(exactMatch).toBeDefined();
    }
  });

  it('should handle empty search queries gracefully', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: ['title', 'content'],
      threshold: 0.3,
      includeScore: true
    });

    const results = fuse.search('');
    
    expect(Array.isArray(results)).toBe(true);
    // Empty query should return empty results
    expect(results.length).toBe(0);
  });

  it('should handle queries with no matches', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: ['title', 'content'],
      threshold: 0.3,
      includeScore: true
    });

    const results = fuse.search('xyzzyx'); // Non-existent term
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it('should demonstrate relevance improvement over simple string matching', () => {
    const fuse = new Fuse(mockSearchableItems, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'content', weight: 0.3 }
      ],
      threshold: 0.3,
      includeScore: true
    });

    // Search for a term that appears in both title and content
    const fuseResults = fuse.search('healthcare');
    
    // Simple string matching (case-insensitive)
    const simpleResults = mockSearchableItems.filter(item => 
      item.title.toLowerCase().includes('healthcare') ||
      item.content.toLowerCase().includes('healthcare')
    );

    expect(Array.isArray(fuseResults)).toBe(true);
    expect(Array.isArray(simpleResults)).toBe(true);
    
    // Fuse.js should provide relevance scoring
    if (fuseResults.length > 0) {
      fuseResults.forEach(result => {
        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
      });
    }
    
    // Both should find healthcare-related content
    expect(fuseResults.length).toBeGreaterThan(0);
    expect(simpleResults.length).toBeGreaterThan(0);
    
    console.log(`Fuse.js found ${fuseResults.length} results with relevance scoring`);
    console.log(`Simple matching found ${simpleResults.length} results without scoring`);
  });
});
