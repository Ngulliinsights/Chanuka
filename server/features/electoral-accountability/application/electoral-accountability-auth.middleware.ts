/**
 * Electoral Accountability Authentication Middleware
 * 
 * Protects electoral accountability endpoints with authentication
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@server/infrastructure/observability';

// Extended Request type with user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to require authentication
 * TODO: Integrate with actual JWT authentication system
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void | Response => {
  // TODO: Replace with actual JWT verification
  // For now, check for Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ path: req.path }, 'Unauthorized access attempt');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide a valid authentication token',
    });
  }

  // TODO: Verify JWT token and extract user info
  // For now, mock user data
  (req as AuthenticatedRequest).user = {
    id: 'mock-user-id',
    email: 'user@example.com',
    role: 'citizen',
  };

  next();
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      logger.warn({
        userId: user.id,
        userRole: user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      }, 'Insufficient permissions');

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * Middleware for optional authentication
 * Adds user info if authenticated, but doesn't require it
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // TODO: Verify JWT token and extract user info
    (req as AuthenticatedRequest).user = {
      id: 'mock-user-id',
      email: 'user@example.com',
      role: 'citizen',
    };
  }

  next();
};
