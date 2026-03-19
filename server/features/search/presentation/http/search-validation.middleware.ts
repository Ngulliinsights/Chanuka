/**
 * Search Feature - Validation Middleware
 * 
 * Express middleware for validating search-related requests.
 */

import { Request, Response, NextFunction } from 'express';
import { createValidationError } from '@server/infrastructure/error-handling';
import {
  GlobalSearchSchema,
  BillSearchSchema,
  UserSearchSchema,
  CommentSearchSchema,
  AutocompleteSchema,
  SaveSearchSchema,
  GetSearchHistorySchema,
  GetPopularSearchesSchema,
} from '../../application/search-validation.schemas';

export async function validateGlobalSearch(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await GlobalSearchSchema.safeParseAsync(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.query = validation.data as unknown as Request['query'];
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateBillSearch(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await BillSearchSchema.safeParseAsync(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.query = validation.data as unknown as Request['query'];
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateUserSearch(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await UserSearchSchema.safeParseAsync(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.query = validation.data as unknown as Request['query'];
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateCommentSearch(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await CommentSearchSchema.safeParseAsync(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.query = validation.data as unknown as Request['query'];
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateAutocomplete(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await AutocompleteSchema.safeParseAsync(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.query = validation.data as unknown as Request['query'];
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateSaveSearch(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await SaveSearchSchema.safeParseAsync(req.body);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateGetSearchHistory(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await GetSearchHistorySchema.safeParseAsync({
      ...req.query,
      user_id: req.params.userId || req.query.user_id,
    });
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.query = validation.data as unknown as Request['query'];
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateGetPopularSearches(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await GetPopularSearchesSchema.safeParseAsync(req.query);
    if (!validation.success) {
      const errors = validation.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }));
      return next(createValidationError(errors, { service: 'search-validation' }));
    }
    req.query = validation.data as unknown as Request['query'];
    next();
  } catch (error) {
    next(error);
  }
}

export const searchValidationMiddleware = {
  validateGlobalSearch,
  validateBillSearch,
  validateUserSearch,
  validateCommentSearch,
  validateAutocomplete,
  validateSaveSearch,
  validateGetSearchHistory,
  validateGetPopularSearches,
};
