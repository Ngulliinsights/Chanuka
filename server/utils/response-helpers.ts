import { Response } from 'express';

import { ErrorDomain } from '../observability/error-management';

interface ErrorResponse {
  statusCode: number;
  message: string;
  code?: string;
  domain?: ErrorDomain;
  details?: any;
}

export class ResponseHelper {
  static success(res: Response, data?: unknown, statusCode: number = 200) {
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
















































