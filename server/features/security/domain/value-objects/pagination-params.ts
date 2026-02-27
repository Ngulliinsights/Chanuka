/**
 * Pagination Parameters Value Object
 * Represents validated pagination parameters
 */
export class PaginationParams {
  constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly offset: number
  ) {}

  static create(page?: string, limit?: string): PaginationParams {
    const pageNum = Math.max(1, parseInt(page || '1') || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20') || 20));
    const offset = (pageNum - 1) * limitNum;

    return new PaginationParams(pageNum, limitNum, offset);
  }

  static fromNumbers(page: number, limit: number): PaginationParams {
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    return new PaginationParams(pageNum, limitNum, offset);
  }
}
