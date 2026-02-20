/**
 * Operation Guard (REFACTORED)
 * IMPROVEMENTS: Rate limiting, circuit breaker pattern
 */
import { logger } from '@server/infrastructure/observability';

export class OperationGuard {
  private operations: Map<string, number> = new Map();
  private failures: Map<string, number> = new Map();
  private circuitOpen: Map<string, boolean> = new Map();

  constructor(
    private maxOperationsPerMinute: number = 100,
    private maxFailures: number = 5
  ) {}

  async guard<T>(
    operationId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitOpen.get(operationId)) {
      throw new Error(`Circuit breaker open for operation: ${operationId}`);
    }

    // Check rate limit
    const count = this.operations.get(operationId) || 0;
    if (count >= this.maxOperationsPerMinute) {
      throw new Error(`Rate limit exceeded for operation: ${operationId}`);
    }

    this.operations.set(operationId, count + 1);

    try {
      const result = await operation();
      
      // Reset failure count on success
      this.failures.set(operationId, 0);
      
      return result;
    } catch (error) {
      // Track failures
      const failures = (this.failures.get(operationId) || 0) + 1;
      this.failures.set(operationId, failures);

      // Open circuit if too many failures
      if (failures >= this.maxFailures) {
        this.circuitOpen.set(operationId, true);
        logger.warn('Circuit breaker opened', { operationId, failures });
        
        // Auto-reset after 60 seconds
        setTimeout(() => {
          this.circuitOpen.set(operationId, false);
          this.failures.set(operationId, 0);
          logger.info('Circuit breaker reset', { operationId });
        }, 60000);
      }

      throw error;
    }
  }

  resetOperationCount(): void {
    this.operations.clear();
  }
}

export default OperationGuard;
