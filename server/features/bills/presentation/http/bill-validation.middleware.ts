/**
 * Bills Feature - Validation Middleware
 * 
 * Express middleware for validating bill-related requests.
 * Uses Zod schemas from bill-validation.schemas.ts
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/types/core/errors';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import {
  CreateBillSchema,
  UpdateBillSchema,
  SearchBillsSchema,
  GetAllBillsSchema,
  RecordEngagementSchema,
  BillIdSchema,
} from '../../application/bill-validation.schemas';

/**
 * Middleware to validate bill creation requests
 */
export const validateCreateBill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(CreateBillSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Bill creation validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate bill update requests
 */
export const validateUpdateBill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(UpdateBillSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Bill update validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate bill search requests
 */
export const validateSearchBills = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const searchData = {
    query: req.query.query || req.query.q,
    filters: {
      status: req.query.status,
      category: req.query.category,
      sponsor_id: req.query.sponsor_id,
      search: req.query.search,
    },
  };
  
  const validation = await validateData(SearchBillsSchema, searchData);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Bill search validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.query = validation.data as any;
  next();
};

/**
 * Middleware to validate get all bills requests
 */
export const validateGetAllBills = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requestData = {
    filters: {
      status: req.query.status,
      category: req.query.category,
      sponsor_id: req.query.sponsor_id,
      search: req.query.search,
    },
    pagination: {
      page: req.query.page || '1',
      limit: req.query.limit || '10',
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    },
  };
  
  const validation = await validateData(GetAllBillsSchema, requestData);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Get all bills validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.query = validation.data as any;
  next();
};

/**
 * Middleware to validate bill ID parameter
 */
export const validateBillId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(BillIdSchema, req.params.id);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Bill ID validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.params.id = validation.data;
  next();
};

/**
 * Middleware to validate engagement recording requests
 */
export const validateRecordEngagement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const engagementData = {
    bill_id: req.params.id,
    user_id: req.body.user_id,
    engagement_type: req.body.engagement_type,
  };
  
  const validation = await validateData(RecordEngagementSchema, engagementData);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Engagement validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};
