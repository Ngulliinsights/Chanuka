import { Router } from "express";
import { eq } from "drizzle-orm";
import { database as db } from "../../../../shared/database/connection";
import { user, userInterest } from "../../../../shared/schema";
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError, ApiResponseWrapper } from '@shared/core/utils/api'";
import { logger } from '../../../../shared/core/index.js';
import { securityAuditService } from '../../../features/security/security-audit-service.js';

const router = Router();

// Helper function to validate user ID format (can be extended with actual validation logic)
function validateUserId(userId: string): boolean {
  // Ensure the function always returns a boolean (previously could return the string when falsy)
  return Boolean(userId && userId.trim().length > 0);
}

// Helper function to fetch user interests - eliminates duplication
async function getUserInterests(userId: string) {
  const interests = await db
    .select({ interest: userInterest.interest })
    .from(userInterest)
    .where(eq(userInterest.userId, userId));

  return interests.map(i => i.interest);
}

// Helper function to update user interests - centralizes the logic
async function updateUserInterests(userId: string, interests: string[]) {
  // Delete existing interests first
  await db.delete(userInterest).where(eq(userInterest.userId, userId));

  // Insert new interests if any provided
  if (interests.length > 0) {
    await db.insert(userInterest).values(
      interests.map((interest: string) => ({
        userId,
        interest,
        createdAt: new Date(),
      }))
    );
  }
}

// Helper function to create metadata - keeps code DRY
function createMetadata(startTime: number) {
  return ApiResponseWrapper.createMetadata(startTime, 'database');
}

export function setupUserRoutes(routerInstance: Router) {
  // Get user profile
  router.get("/users/:id", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;

      // Validate user ID
      if (!validateUserId(userId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' },
          createMetadata(startTime));
      }

      // Fetch user data
      const userData = await db
        .select({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          preferences: user.preferences,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (userData.length === 0) {
        return ApiNotFound(res, 'User', createMetadata(startTime));
      }

      // Fetch user interests using helper function
      const interests = await getUserInterests(userId);

      // Log data access for security audit
      await securityAuditService.logDataAccess(
        `user:${userId}`,
        'read',
        req,
        (req as any).user?.id,
        1,
        true
      );

      return ApiSuccess(res, {
        ...userData[0],
        interests,
      }, createMetadata(startTime));
    } catch (error) {
      logger.error('Error fetching user:', { component: 'Chanuka' }, error);
      return ApiError(res, 'Internal server error', 500, createMetadata(startTime));
    }
  });

  // Update user profile
  router.put("/users/:id", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;
      const { firstName, lastName, preferences, interests } = req.body;

      // Validate user ID
      if (!validateUserId(userId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' },
          createMetadata(startTime));
      }

      // Prepare update object only with provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only update name if firstName or lastName provided
      if (firstName || lastName) {
        updateData.name = `${firstName || ''} ${lastName || ''}`.trim();
      }

      // Only update preferences if provided
      if (preferences !== undefined) {
        updateData.preferences = preferences;
      }

      // Update user basic info
      const updatedUser = await db
        .update(user)
        .set(updateData)
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          preferences: user.preferences,
        });

      if (updatedUser.length === 0) {
        return ApiNotFound(res, 'User', createMetadata(startTime));
      }

      // Update interests if provided using helper function
      let finalInterests = interests || [];
      if (interests && Array.isArray(interests)) {
        await updateUserInterests(userId, interests);
      } else if (interests !== undefined) {
        // If interests is provided but not an array, fetch existing
        finalInterests = await getUserInterests(userId);
      } else {
        // If interests not provided at all, fetch existing
        finalInterests = await getUserInterests(userId);
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
        interests: finalInterests,
      }, createMetadata(startTime));
    } catch (error) {
      logger.error('Error updating user:', { component: 'Chanuka' }, error);
      return ApiError(res, 'Internal server error', 500, createMetadata(startTime));
    }
  });

  // Get user interests
  router.get("/users/:id/interests", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;

      // Validate user ID
      if (!validateUserId(userId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' },
          createMetadata(startTime));
      }

      // Fetch interests using helper function
      const interests = await getUserInterests(userId);

      return ApiSuccess(res, interests, createMetadata(startTime));
    } catch (error) {
      logger.error('Error fetching user interests:', { component: 'Chanuka' }, error);
      return ApiError(res, 'Internal server error', 500, createMetadata(startTime));
    }
  });

  // Update user interests
  router.put("/users/:id/interests", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;
      const { interests } = req.body;

      // Validate user ID
      if (!validateUserId(userId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' },
          createMetadata(startTime));
      }

      // Validate interests array
      if (!Array.isArray(interests)) {
        return ApiValidationError(res, { field: 'interests', message: 'Interests must be an array' },
          createMetadata(startTime));
      }

      // Update interests using helper function
      await updateUserInterests(userId, interests);

      return ApiSuccess(res, { interests }, createMetadata(startTime));
    } catch (error) {
      logger.error('Error updating user interests:', { component: 'Chanuka' }, error);
      return ApiError(res, 'Internal server error', 500, createMetadata(startTime));
    }
  });
}

// Set up the routes on the router
setupUserRoutes(router);

// Export both the router and setup function for flexibility
export { router };






































