import { logger } from '@shared/core/index';
import { readDatabase } from '@server/infrastructure/database';

export interface QueryTask<T = any> {
  name: string;
  query: () => Promise<T>;
  fallback?: T;
  timeout?: number;
}

export interface QueryResult<T = any> {
  name: string;
  data: T;
  success: boolean;
  duration: number;
  error?: Error;
}

/**
 * Service for executing multiple database queries in parallel with proper error handling
 */
export class ParallelQueryExecutor {
  private get db() {
    return readDatabase;
  }

  /**
   * Execute multiple queries in parallel with timeout and fallback support
   */
  async executeParallel<T extends Record<string, any>>(
    tasks: QueryTask[]
  ): Promise<Record<string, QueryResult>> {
    const startTime = Date.now();
    
    try {
      const results = await Promise.allSettled(
        tasks.map(task => this.executeWithTimeout(task))
      );

      const resultMap: Record<string, QueryResult> = {};
      
      results.forEach((result, index) => {
        const task = tasks[index];
        
        if (result.status === 'fulfilled') {
          resultMap[task.name] = result.value;
        } else {
          resultMap[task.name] = {
            name: task.name,
            data: task.fallback || null,
            success: false,
            duration: Date.now() - startTime,
            error: result.reason
          };
          
          logger.error(`Query task ${task.name} failed:`, { component: 'Search' }, result.reason);
        }
      });

      return resultMap;
    } catch (error) {
      logger.error('Parallel query execution failed:', { component: 'Search' }, error);
      throw error;
    }
  }

  /**
   * Execute a batch of similar queries with connection pooling optimization
   */
  async executeBatch<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
    const batchSize = 5; // Optimal batch size for connection pool
    const results: T[] = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(query => this.executeWithRetry(query))
      );
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.warn('Batch query failed:', { component: 'Search' }, result.reason);
          // Push null for failed queries to maintain array indices
          results.push(null as T);
        }
      });
    }
    
    return results.filter(Boolean); // Remove null results
  }

  /**
   * Execute query with timeout protection
   */
  private async executeWithTimeout<T>(task: QueryTask<T>): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const timeout = task.timeout || 5000; // 5 second default timeout
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout: ${task.name}`)), timeout);
      });
      
      const data = await Promise.race([
        task.query(),
        timeoutPromise
      ]);
      
      return {
        name: task.name,
        data,
        success: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: task.name,
        data: task.fallback as T,
        success: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  /**
   * Execute query with retry logic
   */
  private async executeWithRetry<T>(
    query: () => Promise<T>,
    maxRetries: number = 2,
    delay: number = 100
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await query();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Execute queries with circuit breaker pattern
   */
  async executeWithCircuitBreaker<T>(
    queries: QueryTask<T>[],
    failureThreshold: number = 0.5
  ): Promise<Record<string, QueryResult<T>>> {
    const results = await this.executeParallel(queries);
    
    const totalQueries = queries.length;
    const failedQueries = Object.values(results).filter(r => !r.success).length;
    const failureRate = failedQueries / totalQueries;
    
    if (failureRate > failureThreshold) {
      logger.warn(`High failure rate detected: ${failureRate * 100}%`, { component: 'Search' });
      
      // Return fallback data for all queries
      const fallbackResults: Record<string, QueryResult<T>> = {};
      queries.forEach(task => {
        fallbackResults[task.name] = {
          name: task.name,
          data: task.fallback as T,
          success: false,
          duration: 0,
          error: new Error('Circuit breaker activated')
        };
      });
      
      return fallbackResults;
    }
    
    return results;
  }
}

export const parallelQueryExecutor = new ParallelQueryExecutor();


