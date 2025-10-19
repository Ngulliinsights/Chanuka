/**
 * Auth Middleware Legacy Adapter
 * 
 * Provides backward compatibility for server/middleware/auth.ts imports
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// Temporary fallback logger until module resolution is fixed
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || '')
};

// Temporary error classes until module resolution is fixed
class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    isVerified: boolean;
  };
}

/**
 * JWT token authentication middleware
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  console.warn('[DEPRECATED] Using legacy authenticateToken. Please migrate to @shared/core/middleware/auth');
  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Access token required'));
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return next(new Error('Authentication configuration error'));
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'user',
      isVerified: decoded.isVerified || false
    };

    logger.debug('User authenticated', { 
      userId: req.user.id, 
      username: req.user.username,
      role: req.user.role 
    });

    next();
  } catch (error) {
    logger.warn('Token verification failed', { error: error instanceof Error ? error.message : String(error) });
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(role: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.warn('[DEPRECATED] Using legacy requireRole. Please migrate to @shared/core/middleware/auth');
    
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const requiredRoles = Array.isArray(role) ? role : [role];
    const userRole = req.user.role;

    if (!requiredRoles.includes(userRole)) {
      logger.warn('Insufficient permissions', { 
        userId: req.user.id, 
        userRole, 
        requiredRoles 
      });
      return next(new ForbiddenError(`Requires one of: ${requiredRoles.join(', ')}`));
    }

    logger.debug('Role authorization successful', { 
      userId: req.user.id, 
      userRole, 
      requiredRoles 
    });

    next();
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  console.warn('[DEPRECATED] Using legacy optionalAuth. Please migrate to @shared/core/middleware/auth');
  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(); // Continue without user if JWT not configured
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'user',
      isVerified: decoded.isVerified || false
    };

    logger.debug('Optional auth successful', { userId: req.user.id });
  } catch (error) {
    logger.debug('Optional auth failed, continuing without user', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }

  next();
}