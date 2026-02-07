/**
 * Error Aggregation Service
 * Collects and aggregates errors from multiple sources
 */

export class ErrorAggregationService {
  private static instance: ErrorAggregationService;
  private errors: Error[] = [];
  private systemErrors: Map<string, Array<{ error: any; context: any; timestamp: number }>> = new Map();

  static getInstance(): ErrorAggregationService {
    if (!ErrorAggregationService.instance) {
      ErrorAggregationService.instance = new ErrorAggregationService();
    }
    return ErrorAggregationService.instance;
  }

  addError(system: string, error: any, context?: any): void;
  addError(error: Error): void;
  addError(errorOrSystem: Error | string, errorArg?: any, context?: any) {
    if (typeof errorOrSystem === 'string') {
      const system = errorOrSystem;
      const errors = this.systemErrors.get(system) || [];
      errors.push({ error: errorArg, context, timestamp: Date.now() });
      this.systemErrors.set(system, errors);
    } else {
      this.errors.push(errorOrSystem);
    }
  }

  getAggregatedErrors() {
    return this.errors;
  }

  getSystemErrors(system: string, timeRange?: { start: number; end: number }): Array<{ error: any; context: any; timestamp: number }> {
    const errors = this.systemErrors.get(system) || [];
    if (timeRange) {
      return errors.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end);
    }
    return errors;
  }

  clearErrors() {
    this.errors = [];
    this.systemErrors.clear();
  }
}

export const errorAggregationService = new ErrorAggregationService();
