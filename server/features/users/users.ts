
import { Router } from "express";
import { eq } from "drizzle-orm";
import { database as db, users, userInterests } from "../../../shared/database/connection.js";
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { logger } from '../../utils/logger';
import { securityAuditService } from '../../features/security/security-audit-service.js';

const router = Router();

export function setupUserRoutes(routerInstance: Router) {
  // Get user profile
  router.get("/users/:id", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.params.id;
      
      if (!userId) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const user = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          preferences: users.preferences,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return ApiNotFound(res, 'User', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Get user interests
      const interests = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

      // Log data access
      await securityAuditService.logDataAccess(
        `user:${userId}`,
        'read',
        req,
        (req as any).user?.id,
        1,
        true
      );

      return ApiSuccess(res, {
        ...user[0],
        interests: interests.map(i => i.interest),
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching user:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Internal server error', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Update user profile
  router.put("/users/:id", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.params.id;
      const { firstName, lastName, preferences, interests } = req.body;

      if (!userId) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Update user basic info
      const updatedUser = await db
        .update(users)
        .set({
          name: firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : undefined,
          preferences,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          preferences: users.preferences,
        });

      if (updatedUser.length === 0) {
        return ApiNotFound(res, 'User', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Update interests if provided
      if (interests && Array.isArray(interests)) {
        // Delete existing interests
        await db.delete(userInterests).where(eq(userInterests.userId, userId));

        // Insert new interests
        if (interests.length > 0) {
          await db.insert(userInterests).values(
            interests.map((interest: string) => ({
              userId,
              interest,
              createdAt: new Date(),
            }))
          );
        }
      }

      // Log data access for user profile update
      await securityAuditService.logDataAccess(
        `user:${userId}`,
        'update',
        req,
        (req as any).user?.id,
        1,
        true
      );

      return ApiSuccess(res, {
        ...updatedUser[0],
        interests: interests || [],
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating user:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Internal server error', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get user interests
  router.get("/users/:id/interests", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.params.id;

      if (!userId) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const interests = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

      return ApiSuccess(res, interests.map(i => i.interest), 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching user interests:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Internal server error', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Update user interests
  router.put("/users/:id/interests", async (req, res) => {
    const startTime = Date.now();
    
    try {
      const userId = req.params.id;
      const { interests } = req.body;

      if (!userId) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      if (!Array.isArray(interests)) {
        return ApiValidationError(res, { field: 'interests', message: 'Interests must be an array' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Delete existing interests
      await db.delete(userInterests).where(eq(userInterests.userId, userId));

      // Insert new interests
      if (interests.length > 0) {
        await db.insert(userInterests).values(
          interests.map((interest: string) => ({
            userId,
            interest,
            createdAt: new Date(),
          }))
        );
      }

      return ApiSuccess(res, { interests }, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating user interests:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Internal server error', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });
}

// Set up the routes on the router
setupUserRoutes(router);

// Export both the router and setup function for flexibility
export { router };









