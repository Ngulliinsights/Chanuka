#!/usr/bin/env node

/**
 * Search Performance Benchmark Script
 * 
 * Run with: npm run benchmark:search
 * Or directly: node server/features/search/__tests__/search-benchmark.ts
 */

import { performance } from 'perf_hooks';
import { suggestionEngineService } from '../engines/suggestion-engine.service';
import { parallelQueryExecutor } from '../utils/parallel-query-executor';
import { historyCleanupService } from '../services/history-cleanup.service';
import { suggestionRankingService } from '../engines/suggestion-ranking.service';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number; // operations per second
  memoryUsage?: {
    before: number;
    after: number;
    peak: number;
  };
}

class SearchBenchmark {
  private results: BenchmarkResult[] = [];

  async runAllBenchmarks(): Promise<void> {
    console.log('🚀 Starting Search Performance Benchmarks\n');

    await this.benchmarkAutocomplete();
    await this.benchmarkParallelQueries();
    await this.benchmarkRanking();
    await this.benchmarkHistoryCleanup();
    await this.benchmarkConcurrentLoad();

    this.printResults();
  }

  private async benchmarkAutocomplete(): Promise<void> {
    console.log('📝 Benchmarking Autocomplete Suggestions...');
    
    const queries = [
      'health', 'healthcare', 'climate', 'education', 'technology',
      'infrastructure', 'tax', 'budget', 'security', 'environment'
    ];
    
    const iterations = 100;
    const times: number[] = [];
    const memoryBefore = this.getMemoryUsage();
    let memoryPeak = memoryBefore;

    for (let i = 0; i < iterations; i++) {
      const query = queries[i % queries.length];
      const startTime = performance.now();
      
      await suggestionEngineService.getAutocompleteSuggestions(query, 10);
      
      const endTime = performance.now();
      times.push(endTime - startTime);
      
      const currentMemory = this.getMemoryUsage();
      if (currentMemory > memoryPeak) {
        memoryPeak = currentMemory;
      }
    }

    const memoryAfter = this.getMemoryUsage();
    
    this.results.push({
      operation: 'Autocomplete Suggestions',
      iterations,
      totalTime: times.reduce((a, b) => a + b, 0),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryPeak
      }
    });
  }

  private async benchmarkParallelQueries(): Promise<void> {
    console.log('⚡ Benchmarking Parallel Query Execution...');
    
    const iterations = 50;
    const times: number[] = [];
    const memoryBefore = this.getMemoryUsage();

    for (let i = 0; i < iterations; i++) {
      const tasks = [
        {
          name: 'query1',
          query: () => this.simulateDbQuery(50),
          fallback: []
        },
        {
          name: 'query2',
          query: () => this.simulateDbQuery(75),
          fallback: []
        },
        {
          name: 'query3',
          query: () => this.simulateDbQuery(100),
          fallback: []
        },
        {
          name: 'query4',
          query: () => this.simulateDbQuery(25),
          fallback: []
        }
      ];

      const startTime = performance.now();
      await parallelQueryExecutor.executeParallel(tasks);
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    }

    const memoryAfter = this.getMemoryUsage();

    this.results.push({
      operation: 'Parallel Query Execution (4 queries)',
      iterations,
      totalTime: times.reduce((a, b) => a + b, 0),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryAfter
      }
    });
  }

  private async benchmarkRanking(): Promise<void> {
    console.log('🏆 Benchmarking Suggestion Ranking...');
    
    const suggestions = Array(500).fill(0).map((_, i) => ({
      term: `suggestion ${i}`,
      type: 'bill_title' as const,
      frequency: Math.floor(Math.random() * 100),
      metadata: { billId: i }
    }));

    const context = {
      query: 'suggestion',
      searchContext: { category: 'healthcare' },
      userHistory: ['suggestion 1', 'suggestion 5'],
      popularTerms: new Map([['suggestion', 50]])
    };

    const iterations = 200;
    const times: number[] = [];
    const memoryBefore = this.getMemoryUsage();

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      suggestionRankingService.rankSuggestions(suggestions, context);
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    }

    const memoryAfter = this.getMemoryUsage();

    this.results.push({
      operation: 'Suggestion Ranking (500 items)',
      iterations,
      totalTime: times.reduce((a, b) => a + b, 0),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryAfter
      }
    });
  }

  private async benchmarkHistoryCleanup(): Promise<void> {
    console.log('🧹 Benchmarking History Cleanup...');
    
    const iterations = 20;
    const times: number[] = [];
    const memoryBefore = this.getMemoryUsage();

    for (let i = 0; i < iterations; i++) {
      // Create large history for each iteration
      const history = new Map();
      for (let j = 0; j < 5000; j++) {
        history.set(`term${j}`, {
          term: `term${j}`,
          frequency: Math.floor(Math.random() * 100),
          lastAccessed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }

      const startTime = performance.now();
      historyCleanupService.cleanupHistory(history, {
        maxHistorySize: 2500,
        cleanupThreshold: 0.2
      });
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    }

    const memoryAfter = this.getMemoryUsage();

    this.results.push({
      operation: 'History Cleanup (5000 → 2500 items)',
      iterations,
      totalTime: times.reduce((a, b) => a + b, 0),
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      throughput: iterations / (times.reduce((a, b) => a + b, 0) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryAfter
      }
    });
  }

  private async benchmarkConcurrentLoad(): Promise<void> {
    console.log('🔄 Benchmarking Concurrent Load...');
    
    const concurrentUsers = 20;
    const requestsPerUser = 10;
    const queries = ['health', 'climate', 'tech', 'education', 'budget'];
    
    const memoryBefore = this.getMemoryUsage();
    const startTime = performance.now();

    const userPromises = Array(concurrentUsers).fill(0).map(async (_, userIndex) => {
      const userRequests = [];
      
      for (let i = 0; i < requestsPerUser; i++) {
        const query = queries[i % queries.length];
        userRequests.push(
          suggestionEngineService.getAutocompleteSuggestions(`${query}_user${userIndex}`, 5)
        );
      }
      
      return Promise.all(userRequests);
    });

    await Promise.all(userPromises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const totalRequests = concurrentUsers * requestsPerUser;
    const memoryAfter = this.getMemoryUsage();

    this.results.push({
      operation: `Concurrent Load (${concurrentUsers} users, ${requestsPerUser} req/user)`,
      iterations: totalRequests,
      totalTime,
      averageTime: totalTime / totalRequests,
      minTime: 0, // Not applicable for concurrent test
      maxTime: 0, // Not applicable for concurrent test
      throughput: totalRequests / (totalTime / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryAfter
      }
    });
  }

  private simulateDbQuery(delayMs: number): Promise<any[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(Array(10).fill(0).map((_, i) => ({ id: i, data: `result${i}` })));
      }, delayMs);
    });
  }

  private getMemoryUsage(): number {
    if (process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private printResults(): void {
    console.log('\n📊 Benchmark Results Summary');
    console.log('=' .repeat(80));
    
    this.results.forEach(result => {
      console.log(`\n🔍 ${result.operation}`);
      console.log(`   Iterations: ${result.iterations}`);
      console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`   Average Time: ${result.averageTime.toFixed(2)}ms`);
      console.log(`   Min Time: ${result.minTime.toFixed(2)}ms`);
      console.log(`   Max Time: ${result.maxTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      
      if (result.memoryUsage) {
        const memIncrease = result.memoryUsage.after - result.memoryUsage.before;
        console.log(`   Memory Before: ${this.formatBytes(result.memoryUsage.before)}`);
        console.log(`   Memory After: ${this.formatBytes(result.memoryUsage.after)}`);
        console.log(`   Memory Peak: ${this.formatBytes(result.memoryUsage.peak)}`);
        console.log(`   Memory Increase: ${this.formatBytes(memIncrease)}`);
      }
    });

    console.log('\n🎯 Performance Analysis');
    console.log('=' .repeat(80));
    
    // Performance recommendations
    const autoCompleteResult = this.results.find(r => r.operation.includes('Autocomplete'));
    if (autoCompleteResult && autoCompleteResult.averageTime > 200) {
      console.log('⚠️  Autocomplete average time exceeds 200ms - consider caching optimization');
    }
    
    const parallelResult = this.results.find(r => r.operation.includes('Parallel'));
    if (parallelResult && parallelResult.averageTime > 150) {
      console.log('⚠️  Parallel query time exceeds 150ms - check database connection pool');
    }
    
    const rankingResult = this.results.find(r => r.operation.includes('Ranking'));
    if (rankingResult && rankingResult.averageTime > 50) {
      console.log('⚠️  Ranking time exceeds 50ms - consider algorithm optimization');
    }

    const concurrentResult = this.results.find(r => r.operation.includes('Concurrent'));
    if (concurrentResult && concurrentResult.throughput < 50) {
      console.log('⚠️  Concurrent throughput below 50 ops/sec - check for bottlenecks');
    }

    console.log('\n✅ Benchmark completed successfully!');
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  const benchmark = new SearchBenchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}

export { SearchBenchmark };