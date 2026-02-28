/**
 * Search Feature - Validation Middleware
 * 
 * Express middleware for validating search-related requests.
 */

import { Request, Response, NextFunction } from 'express';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
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

export async function validateGlobalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(GlobalSearchSchema, req.query);
    if (!validation.success) {
      return next(createValidationError('Invalid search parameters', validation.errors));
    }
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateBillSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(BillSearchSchema, req.query);
    if (!validation.success) {
      return next(createValidationError('Invalid bill search parameters', validation.errors));
    }
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateUserSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(UserSearchSchema, req.query);
    if (!validation.success) {
      return next(createValidationError('Invalid user search parameters', validation.errors));
    }
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateCommentSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(CommentSearchSchema, req.query);
    if (!validation.success) {
      return next(createValidationError('Invalid comment search parameters', validation.errors));
    }
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateAutocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(AutocompleteSchema, req.query);
    if (!validation.success) {
      return next(createValidationError('Invalid autocomplete parameters', validation.errors));
    }
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateSaveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(SaveSearchSchema, req.body);
    if (!validation.success) {
      return next(createValidationError('Invalid save search data', validation.errors));
    }
    req.body = validation.data;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateGetSearchHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(GetSearchHistorySchema, {
      ...req.query,
      user_id: req.params.userId || req.query.user_id,
    });
    if (!validation.success) {
      return next(createValidationError('Invalid search history parameters', validation.errors));
    }
    req.query = validation.data as any;
    next();
  } catch (error) {
    next(error);
  }
}

export async function validateGetPopularSearches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = await validateData(GetPopularSearchesSchema, req.query);
    if (!validation.success) {
      return next(createValidationError('Invalid popular searches parameters', validation.errors));
    }
    req.query = validation.data as any;
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
