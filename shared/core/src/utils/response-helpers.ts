import { Response } from 'express';
import { ErrorDomain } from '../error-handling/base-error';
import { logger } from '../utils/logger';

interface ErrorResponse {
  statusCode: number;
  message: string;
  code?: string;
  domain?: ErrorDomain;
  details?: any;
}

export class ResponseHelper {
  static success(res: Response, data?: any, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      data
    });
  }

  static error(res: Response, error: ErrorResponse) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        domain: error.domain || ErrorDomain.SYSTEM,
        details: error.details
      }
    });
  }
}







