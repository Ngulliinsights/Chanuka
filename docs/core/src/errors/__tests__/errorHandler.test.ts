import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { BaseError, ErrorDomain, ErrorSeverity } from '../base-error';
import { unifiedErrorHandler } from '../error-handler';

describe('unifiedErrorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockLogger: { error: ReturnType<typeof vi.fn> };
  let mockNext: ReturnType<typeof vi.fn>;
  let errorHandler: ReturnType<typeof unifiedErrorHandler>;

  beforeEach(() => {
    mockRequest = {
      headers: {
        'x-request-id': 'test-request-id',
        'user-agent': 'test-user-agent',
      },
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      user: { id: 'test-user' },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockLogger = {
      error: vi.fn(),
    };

    mockNext = vi.fn();

    vi.mock('@core/logging', () => ({
      Logger: class {
        error = mockLogger.error;
      },
    }));

    errorHandler = unifiedErrorHandler();
  });

  it('should handle BaseError instances correctly', async () => {
    const appError = new BaseError('Test error', {
      statusCode: 400,
      code: 'TEST_ERROR',
      domain: ErrorDomain.VALIDATION,
      severity: ErrorSeverity.LOW,
      context: { field: 'test' },
    });

    await errorHandler(appError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: 'Test error',
        code: 'TEST_ERROR',
      }),
    }));

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Request error',
      expect.objectContaining({
        error: expect.objectContaining({
          domain: ErrorDomain.VALIDATION,
          severity: ErrorSeverity.LOW,
          context: { field: 'test' },
        }),
      }),
    );
  });

  it('should handle validation errors correctly', async () => {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    (validationError as any).errors = [{ field: 'email', message: 'Invalid email' }];

    await errorHandler(validationError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: [{ field: 'email', message: 'Invalid email' }],
      }),
    }));
  });

  it('should handle JWT errors correctly', async () => {
    const jwtError = new Error('Invalid token');
    jwtError.name = 'JsonWebTokenError';

    await errorHandler(jwtError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'INVALID_TOKEN',
      }),
    }));
  });

  it('should handle unknown errors as internal server errors', async () => {
    const unknownError = new Error('Something went wrong');

    await errorHandler(unknownError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
      }),
    }));
  });

  it('should include stack trace in development mode', async () => {
    process.env.NODE_ENV = 'development';
    const errorHandler = unifiedErrorHandler();
    const error = new Error('Test error');
    error.stack = 'Test stack trace';

    await errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        stack: 'Test stack trace',
      }),
    }));
  });

  it('should handle errors with correlationId and parentErrorId', async () => {
    const parentError = new BaseError('Parent error', {
      domain: ErrorDomain.DATABASE,
      severity: ErrorSeverity.HIGH,
    });

    const childError = parentError.createChildError('Child error', {
      domain: ErrorDomain.CACHE,
      severity: ErrorSeverity.MEDIUM,
    });

    await errorHandler(childError, mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Request error',
      expect.objectContaining({
        error: expect.objectContaining({
          correlationId: childError.metadata.correlationId,
          parentErrorId: parentError.errorId,
        }),
      }),
    );
  });
});
