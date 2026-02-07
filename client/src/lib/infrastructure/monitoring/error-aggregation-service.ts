/**
 * Error Aggregation Service
 * Collects and aggregates errors from multiple sources
 */

export class ErrorAggregationService {
  private errors: Error[] = [];

  addError(error: Error) {
    this.errors.push(error);
  }

  getAggregatedErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }
}

export const errorAggregationService = new ErrorAggregationService();
