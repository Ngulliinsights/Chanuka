/**
 * Users Feature - Validation Middleware
 * 
 * Express middleware for validating user-related requests.
 * Uses Zod schemas from user-validation.schemas.ts
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '@shared/types/core/errors';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import {
  RegisterUserSchema,
  UpdateUserSchema,
  UpdateProfileSchema,
  UpdateInterestsSchema,
  SearchUsersSchema,
  SubmitVerificationSchema,
  EndorseVerificationSchema,
  DisputeVerificationSchema,
  ChangePasswordSchema,
  ResetPasswordSchema,
  ConfirmPasswordResetSchema,
} from '../../application/user-validation.schemas';

/**
 * Middleware to validate user registration requests
 */
export const validateRegisterUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(RegisterUserSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`User registration validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate user update requests
 */
export const validateUpdateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(UpdateUserSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`User update validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate profile update requests
 */
export const validateUpdateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(UpdateProfileSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Profile update validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate interests update requests
 */
export const validateUpdateInterests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(UpdateInterestsSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Interests update validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate user search requests
 */
export const validateSearchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const searchData = {
    query: req.query.query || req.query.q,
    role: req.query.role,
    verification_status: req.query.verification_status,
    page: req.query.page,
    limit: req.query.limit,
  };
  
  const validation = await validateData(SearchUsersSchema, searchData);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`User search validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.query = validation.data as any;
  next();
};

/**
 * Middleware to validate verification submission requests
 */
export const validateSubmitVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(SubmitVerificationSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Verification submission validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate verification endorsement requests
 */
export const validateEndorseVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(EndorseVerificationSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Verification endorsement validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate verification dispute requests
 */
export const validateDisputeVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(DisputeVerificationSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Verification dispute validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate password change requests
 */
export const validateChangePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(ChangePasswordSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Password change validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate password reset requests
 */
export const validateResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(ResetPasswordSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Password reset validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};

/**
 * Middleware to validate password reset confirmation requests
 */
export const validateConfirmPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const validation = await validateData(ConfirmPasswordResetSchema, req.body);
  
  if (!validation.success) {
    const errorMsg = validation.errors?.map(e => `${e.field}: ${e.message}`).join(', ');
    return next(new ValidationError(`Password reset confirmation validation failed: ${errorMsg}`, validation.errors || []));
  }
  
  req.body = validation.data;
  next();
};
