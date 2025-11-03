#!/usr/bin/env node

/**
 * Simple test to verify search services are working
 */

import { queryBuilderService } from '../services/query-builder.service.js';
import { suggestionRankingService } from '../engines/suggestion/index.js';
import { historyCleanupService } from '../services/history-cleanup.service.js';
import { parallelQueryExecutor } from '../utils/parallel-query-executor.js';

async function runTests() {
  console.log('🔍 Testing Search Services...');

  try {
    // Test basic imports
    console.log('✅ Testing imports...');
    
    // Test types
    const testSuggestion = {
      term: 'test',
      type: 'popular' as const,
      frequency: 1
    };
    
    console.log('✅ Types working:', testSuggestion);
    
    // Test query builder
    console.log('✅ Testing query builder...');
    const sanitized = queryBuilderService.sanitizeQuery('Test Query!@#');
    console.log('✅ Query sanitized:', sanitized);
    
    // Test ranking service
    console.log('✅ Testing ranking service...');
    const suggestions = [testSuggestion];
    const context = { query: 'test', searchContext: {} };
    const ranked = suggestionRankingService.rankSuggestions(suggestions, context);
    console.log('✅ Ranking working:', ranked.length);
    
    // Test history cleanup
    console.log('✅ Testing history cleanup...');
    const history = new Map();
    history.set('test', { term: 'test', frequency: 1, lastAccessed: new Date() });
    const cleaned = historyCleanupService.cleanupHistory(history);
    console.log('✅ History cleanup working:', cleaned.size);
    
    // Test parallel executor
    console.log('✅ Testing parallel executor...');
    const tasks = [
      {
        name: 'test',
        query: () => Promise.resolve('result'),
        fallback: 'fallback'
      }
    ];
    
    const results = await parallelQueryExecutor.executeParallel(tasks);
    console.log('✅ Parallel executor working:', Object.keys(results).length);
    console.log('🎉 All search services are working!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();