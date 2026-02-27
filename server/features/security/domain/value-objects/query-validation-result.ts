/**
 * Query Validation Result Value Object
 * Represents the result of query parameter validation
 */
export class QueryValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
    public readonly sanitizedParams?: Record<string, unknown>
  ) {}

  static valid(sanitizedParams: Record<string, unknown>): QueryValidationResult {
    return new QueryValidationResult(true, [], sanitizedParams);
  }

  static invalid(errors: string[]): QueryValidationResult {
    return new QueryValidationResult(false, errors);
  }

  hasErrors(): boolean {
    return !this.isValid;
  }

  getErrorMessage(): string {
    return this.errors.join(', ');
  }
}
