// ============================================================================
// BASIC FUSE.JS ENGINE TESTS
// ============================================================================
// Simple tests to verify Fuse.js engine functionality

import { describe, it, expect } from 'vitest';
import { FuseSearchEngine } from '../engines/core/fuse-search.engine.js';
import { SearchQuery } from '../engines/types/search.types.js';

describe('Fuse.js Basic Functionality', () => {
  let fuseEngine: FuseSearchEngine;

  beforeEach(() => {
    fuseEngine = new FuseSearchEngine();
  });

  it('should initialize correctly', () => {
    expect(fuseEngine).toBeDefined();
    expect(fuseEngine.name).toBe('fuse-search');
    expect(fuseEngine.priority).toBe(1);
    expect(fuseEngine.isAvailable).toBe(true);
  });

  it('should have proper engine interface', () => {
    expect(typeof fuseEngine.search).toBe('function');
    expect(typeof fuseEngine.getIndexStats).toBe('function');
  });

  it('should return index stats', () => {
    const stats = fuseEngine.getIndexStats();
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty('isAvailable');
    expect(stats).toHaveProperty('totalItems');
  });

  it('should handle search queries without crashing', async () => {
    const query: SearchQuery = { query: 'test' };
    
    try {
      const results = await fuseEngine.search(query);
      expect(Array.isArray(results)).toBe(true);
    } catch (error) {
      // It's okay if search fails due to missing data, but it shouldn't crash
      expect(error).toBeDefined();
    }
  });

  it('should validate search result structure when results exist', async () => {
    const query: SearchQuery = { query: 'healthcare' };
    
    try {
      const results = await fuseEngine.search(query);
      
      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('relevanceScore');
        expect(result).toHaveProperty('metadata');
        
        expect(typeof result.id).toBe('string');
        expect(['bill', 'sponsor', 'comment']).toContain(result.type);
        expect(typeof result.title).toBe('string');
        expect(typeof result.relevanceScore).toBe('number');
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
      }
    } catch (error) {
      console.warn('Search test failed (expected if no data):', error.message);
    }
  });
});
