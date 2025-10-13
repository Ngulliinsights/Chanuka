import type { SearchQuery, SearchFilters, SearchPagination, SearchOptions } from './search.dto';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SearchValidator {
  private static readonly MAX_QUERY_LENGTH = 500;
  private static readonly MAX_PAGE = 1000;
  private static readonly MAX_LIMIT = 100;
  private static readonly MIN_QUERY_LENGTH = 1;

  /**
   * Validate a complete search query
   */
  static validateSearchQuery(query: SearchQuery): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate text query
    if (!query.text || typeof query.text !== 'string') {
      errors.push('Search query text is required');
    } else {
      if (query.text.length < this.MIN_QUERY_LENGTH) {
        errors.push(`Search query must be at least ${this.MIN_QUERY_LENGTH} character(s) long`);
      }
      if (query.text.length > this.MAX_QUERY_LENGTH) {
        errors.push(`Search query cannot exceed ${this.MAX_QUERY_LENGTH} characters`);
      }

      // Check for potentially problematic queries
      if (this.containsOnlySpecialChars(query.text)) {
        warnings.push('Search query contains only special characters');
      }
    }

    // Validate filters
    if (query.filters) {
      const filterValidation = this.validateSearchFilters(query.filters);
      errors.push(...filterValidation.errors);
      warnings.push(...filterValidation.warnings);
    }

    // Validate pagination
    if (query.pagination) {
      const paginationValidation = this.validateSearchPagination(query.pagination);
      errors.push(...paginationValidation.errors);
      warnings.push(...paginationValidation.warnings);
    }

    // Validate options
    if (query.options) {
      const optionsValidation = this.validateSearchOptions(query.options);
      errors.push(...optionsValidation.errors);
      warnings.push(...optionsValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate search filters
   */
  static validateSearchFilters(filters: SearchFilters): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate status array
    if (filters.status && !Array.isArray(filters.status)) {
      errors.push('Status filter must be an array');
    } else if (filters.status && filters.status.length > 10) {
      warnings.push('Status filter has many values, this may impact performance');
    }

    // Validate category array
    if (filters.category && !Array.isArray(filters.category)) {
      errors.push('Category filter must be an array');
    } else if (filters.category && filters.category.length > 20) {
      warnings.push('Category filter has many values, this may impact performance');
    }

    // Validate sponsor IDs
    if (filters.sponsorId) {
      if (!Array.isArray(filters.sponsorId)) {
        errors.push('Sponsor ID filter must be an array');
      } else {
        const invalidIds = filters.sponsorId.filter(id => !Number.isInteger(id) || id <= 0);
        if (invalidIds.length > 0) {
          errors.push('All sponsor IDs must be positive integers');
        }
        if (filters.sponsorId.length > 50) {
          warnings.push('Sponsor ID filter has many values, this may impact performance');
        }
      }
    }

    // Validate date range
    if (filters.dateFrom && filters.dateTo) {
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);

      if (isNaN(fromDate.getTime())) {
        errors.push('Invalid dateFrom format');
      }
      if (isNaN(toDate.getTime())) {
        errors.push('Invalid dateTo format');
      }
      if (fromDate > toDate) {
        errors.push('dateFrom cannot be after dateTo');
      }

      // Check for unreasonable date ranges
      const daysDifference = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDifference > 365 * 10) { // 10 years
        warnings.push('Date range is very large, this may impact performance');
      }
    }

    // Validate complexity scores
    if (filters.complexityMin !== undefined) {
      if (typeof filters.complexityMin !== 'number' || filters.complexityMin < 0 || filters.complexityMin > 100) {
        errors.push('complexityMin must be a number between 0 and 100');
      }
    }
    if (filters.complexityMax !== undefined) {
      if (typeof filters.complexityMax !== 'number' || filters.complexityMax < 0 || filters.complexityMax > 100) {
        errors.push('complexityMax must be a number between 0 and 100');
      }
    }
    if (filters.complexityMin !== undefined && filters.complexityMax !== undefined) {
      if (filters.complexityMin > filters.complexityMax) {
        errors.push('complexityMin cannot be greater than complexityMax');
      }
    }

    // Validate tags
    if (filters.tags) {
      if (!Array.isArray(filters.tags)) {
        errors.push('Tags filter must be an array');
      } else {
        const invalidTags = filters.tags.filter(tag => typeof tag !== 'string' || tag.trim().length === 0);
        if (invalidTags.length > 0) {
          errors.push('All tags must be non-empty strings');
        }
        if (filters.tags.length > 20) {
          warnings.push('Tags filter has many values, this may impact performance');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate search pagination
   */
  static validateSearchPagination(pagination: SearchPagination): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate page
    if (typeof pagination.page !== 'number' || !Number.isInteger(pagination.page) || pagination.page < 1) {
      errors.push('Page must be a positive integer');
    } else if (pagination.page > this.MAX_PAGE) {
      errors.push(`Page cannot exceed ${this.MAX_PAGE}`);
    }

    // Validate limit
    if (typeof pagination.limit !== 'number' || !Number.isInteger(pagination.limit) || pagination.limit < 1) {
      errors.push('Limit must be a positive integer');
    } else if (pagination.limit > this.MAX_LIMIT) {
      errors.push(`Limit cannot exceed ${this.MAX_LIMIT}`);
    }

    // Validate sort options
    const validSortBy = ['relevance', 'date', 'title', 'engagement'];
    if (pagination.sortBy && !validSortBy.includes(pagination.sortBy)) {
      errors.push(`sortBy must be one of: ${validSortBy.join(', ')}`);
    }

    const validSortOrder = ['asc', 'desc'];
    if (pagination.sortOrder && !validSortOrder.includes(pagination.sortOrder)) {
      errors.push(`sortOrder must be one of: ${validSortOrder.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate search options
   */
  static validateSearchOptions(options: SearchOptions): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate includeSnippets
    if (options.includeSnippets !== undefined && typeof options.includeSnippets !== 'boolean') {
      errors.push('includeSnippets must be a boolean');
    }

    // Validate includeHighlights
    if (options.includeHighlights !== undefined && typeof options.includeHighlights !== 'boolean') {
      errors.push('includeHighlights must be a boolean');
    }

    // Validate minRelevanceScore
    if (options.minRelevanceScore !== undefined) {
      if (typeof options.minRelevanceScore !== 'number' || options.minRelevanceScore < 0 || options.minRelevanceScore > 1) {
        errors.push('minRelevanceScore must be a number between 0 and 1');
      }
    }

    // Validate searchType
    const validSearchTypes = ['simple', 'phrase', 'boolean'];
    if (options.searchType && !validSearchTypes.includes(options.searchType)) {
      errors.push(`searchType must be one of: ${validSearchTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize a search query to prevent injection and normalize input
   */
  static sanitizeSearchQuery(query: SearchQuery): SearchQuery {
    return {
      text: this.sanitizeText(query.text),
      filters: query.filters ? this.sanitizeSearchFilters(query.filters) : undefined,
      pagination: query.pagination ? this.sanitizeSearchPagination(query.pagination) : undefined,
      options: query.options,
    };
  }

  /**
   * Sanitize search text
   */
  static sanitizeText(text: string): string {
    if (typeof text !== 'string') return '';

    return text
      .trim()
      .substring(0, this.MAX_QUERY_LENGTH)
      // Remove potentially harmful characters but keep search operators
      .replace(/[<>\"'`;]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ');
  }

  /**
   * Sanitize search filters
   */
  static sanitizeSearchFilters(filters: SearchFilters): SearchFilters {
    const sanitized: SearchFilters = {};

    if (filters.status && Array.isArray(filters.status)) {
      sanitized.status = filters.status
        .filter(s => typeof s === 'string' && s.trim().length > 0)
        .map(s => s.trim().toLowerCase())
        .slice(0, 10); // Limit to prevent abuse
    }

    if (filters.category && Array.isArray(filters.category)) {
      sanitized.category = filters.category
        .filter(c => typeof c === 'string' && c.trim().length > 0)
        .map(c => c.trim().toLowerCase())
        .slice(0, 20);
    }

    if (filters.sponsorId && Array.isArray(filters.sponsorId)) {
      sanitized.sponsorId = filters.sponsorId
        .filter(id => Number.isInteger(id) && id > 0)
        .slice(0, 50);
    }

    if (filters.dateFrom) {
      const date = new Date(filters.dateFrom);
      if (!isNaN(date.getTime())) {
        sanitized.dateFrom = date;
      }
    }

    if (filters.dateTo) {
      const date = new Date(filters.dateTo);
      if (!isNaN(date.getTime())) {
        sanitized.dateTo = date;
      }
    }

    if (typeof filters.complexityMin === 'number' && filters.complexityMin >= 0 && filters.complexityMin <= 100) {
      sanitized.complexityMin = filters.complexityMin;
    }

    if (typeof filters.complexityMax === 'number' && filters.complexityMax >= 0 && filters.complexityMax <= 100) {
      sanitized.complexityMax = filters.complexityMax;
    }

    if (filters.tags && Array.isArray(filters.tags)) {
      sanitized.tags = filters.tags
        .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase())
        .slice(0, 20);
    }

    return sanitized;
  }

  /**
   * Sanitize search pagination
   */
  static sanitizeSearchPagination(pagination: SearchPagination): SearchPagination {
    return {
      page: Math.max(1, Math.min(this.MAX_PAGE, pagination.page || 1)),
      limit: Math.max(1, Math.min(this.MAX_LIMIT, pagination.limit || 10)),
      sortBy: pagination.sortBy || 'relevance',
      sortOrder: pagination.sortOrder || 'desc',
    };
  }

  // Private helper methods

  private static containsOnlySpecialChars(text: string): boolean {
    return /^[^a-zA-Z0-9]*$/.test(text);
  }
}