import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
// Simple validation middleware without external dependencies
// This provides basic validation functionality

// Validation schemas for user operations
export const registerUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
    password_hash: z.string().min(60, 'Invalid password hash'),
    role: z.enum(['citizen', 'expert', 'admin']).optional().default('citizen')
  })
});

export const updateProfileSchema = z.object({ params: z.object({
    user_id: z.string().uuid('Invalid user ID')
   }),
  body: z.object({
    bio: z.string().max(1000, 'Bio must be 1000 characters or less').optional(),
    expertise: z.array(z.string().max(50, 'Each expertise must be 50 characters or less')).max(10, 'Maximum 10 expertise areas').optional(),
    location: z.string().max(100, 'Location must be 100 characters or less').optional(),
    organization: z.string().max(200, 'Organization must be 200 characters or less').optional(),
    is_public: z.boolean().optional()
  })
});

export const updateInterestsSchema = z.object({ params: z.object({
    user_id: z.string().uuid('Invalid user ID')
   }),
  body: z.object({
    interests: z.array(z.string().min(1, 'Interest cannot be empty')).max(20, 'Maximum 20 interests')
  })
});

export const submitVerificationSchema = z.object({ body: z.object({
    bill_id: z.number().int().positive('Bill ID must be a positive integer'),
    verification_type: z.enum(['fact_check', 'impact_assessment', 'source_validation', 'claim_verification']),
    claim: z.string().min(1, 'Claim is required').max(1000, 'Claim must be 1000 characters or less'),
    evidence: z.array(z.object({
      source: z.string().min(1, 'Evidence source is required'),
      description: z.string().min(10, 'Evidence description must be at least 10 characters'),
      credibility: z.number().min(0).max(1, 'Credibility must be between 0 and 1'),
      relevance: z.number().min(0).max(1, 'Relevance must be between 0 and 1'),
      url: z.string().url().optional(),
      datePublished: z.string().datetime().optional()
     })).min(1, 'At least one piece of evidence is required').max(10, 'Maximum 10 pieces of evidence'),
    expertise: z.object({
      domain: z.string().min(1, 'Expertise domain is required'),
      level: z.enum(['beginner', 'intermediate', 'advanced']),
      credentials: z.string().optional(),
      verifiedCredentials: z.boolean().optional(),
      reputation_score: z.number().min(0).max(100).optional()
    }),
    reasoning: z.string().min(20, 'Reasoning must be at least 20 characters').max(2000, 'Reasoning must be 2000 characters or less')
  })
});

export const endorseVerificationSchema = z.object({
  params: z.object({
    verification_id: z.string().min(1, 'Verification ID is required')
  })
});

export const disputeVerificationSchema = z.object({
  params: z.object({
    verification_id: z.string().min(1, 'Verification ID is required')
  }),
  body: z.object({
    reason: z.string().min(1, 'Dispute reason is required').max(500, 'Reason must be 500 characters or less')
  })
});

// Middleware functions
export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req);
      // Replace request properties with validated data
      Object.assign(req, validatedData);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const startTime = Date.now();
        // Simple error response without external dependencies
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors
          },
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'validation',
            version: '1.0.0',
            executionTime: Date.now() - startTime
          }
        });
      }
      next(error);
    }
  };
}

// Rate limiting validation for sensitive operations
export function validateRateLimit(operation: string, maxRequests: number = 10, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => { const user_id = (req as any).user?.id || req.ip;
    const now = Date.now();
    const userRequests = requests.get(user_id);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(user_id, { count: 1, resetTime: now + windowMs  });
    } else if (userRequests.count >= maxRequests) {
      const startTime = Date.now();
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many ${operation} requests. Try again later.`
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'rate_limit',
          version: '1.0.0',
          executionTime: Date.now() - startTime
        }
      });
    } else {
      userRequests.count++;
    }

    next();
  };
}

// Authentication validation
export function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    const startTime = Date.now();
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'auth',
        version: '1.0.0',
        executionTime: Date.now() - startTime
      }
    });
  }
  next();
}

// Authorization validation
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user_role = (req as any).user?.role;
    if (!user_role || !allowedRoles.includes(user_role)) {
      const startTime = Date.now();
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'auth',
          version: '1.0.0',
          executionTime: Date.now() - startTime
        }
      });
    }
    next();
  };
}

// Ownership validation
export function requireOwnership(resourceIdParam: string) { return (req: Request, res: Response, next: NextFunction) => {
    const user_id = (req as any).user?.id;
    const resourceUserId = req.params[resourceIdParam];

    if (user_id !== resourceUserId && (req as any).user?.role !== 'admin') {
      const startTime = Date.now();
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: resource ownership required'
         },
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'auth',
          version: '1.0.0',
          executionTime: Date.now() - startTime
        }
      });
    }
    next();
  };
}






































