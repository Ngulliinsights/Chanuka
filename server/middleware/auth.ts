import { authService } from '@server/infrastructure/auth/auth-service';
import { logger } from '@server/infrastructure/observability';
import { NextFunction,Request, Response } from 'express';

// Extend Express User type to match our auth service
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: string;
      name: string;
      verification_status: string;
      first_name: string | null;
      last_name: string | null;
      is_active: boolean | null;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: Express.User;
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Use the auth service to verify the token
    const result = await authService.verifyToken(token);

    if (!result.success || !result.user) {
      return res.status(401).json({ error: result.error || 'Invalid token' });
    }

    req.user = result.user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', { component: 'Chanuka' }, error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};













































