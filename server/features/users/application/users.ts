import { Router } from "express";
import { eq } from "drizzle-orm";
import { database as db } from "../../../../shared/database/connection";
import { user, userInterest } from "../../../../shared/schema";
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError, ApiResponseWrapper  } from '../../../../shared/core/src/utils/api';
import { logger } from '../../../../shared/core/index.js';
import { securityAuditService } from '../../../features/security/security-audit-service.js';

const router = Router();

// ============================================================================
// Validation and Helper Functions
// ============================================================================

/**
 * Validates that a user ID is properly formatted and non-empty
 * Returns a boolean to ensure type safety (prevents accidental truthy string returns)
 */
function validateUserId(userId: string): boolean {
  return Boolean(userId && userId.trim().length > 0);
}

/**
 * Fetches all interests associated with a specific user
 * Centralizes the database query logic to maintain consistency
 */
async function getUserInterests(userId: string): Promise<string[]> {
  const interests = await db
    .select({ interest: userInterest.interest })
    .from(userInterest)
    .where(eq(userInterest.userId, userId));

  return interests.map(i => i.interest);
}

/**
 * Updates user interests by replacing the entire interest collection
 * Uses a delete-then-insert pattern to ensure data consistency
 */
async function updateUserInterests(userId: string, interests: string[]): Promise<void> {
  // Clear existing interests to avoid duplicates
  await db.delete(userInterest).where(eq(userInterest.userId, userId));

  // Insert new interests only if the array isn't empty
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

/**
 * Creates standardized metadata for API responses
 * Keeps response timing and source information consistent
 */
function createMetadata(startTime: number) {
  return ApiResponseWrapper.createMetadata(startTime, 'database');
}

// ============================================================================
// Route Setup Function
// ============================================================================

export function setupUserRoutes(routerInstance: Router) {
  /**
   * GET /users/:id - Retrieve a user's complete profile
   * Returns user data along with their interests
   */
  router.get("/users/:id", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;

      // Validate the user ID format before querying the database
      if (!validateUserId(userId)) {
        // ApiValidationError accepts (res, errors) where errors can be a single object or array
        // No metadata parameter exists for this function
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' });
      }

      // Query the database for user information
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

      // Check if the user exists in the database
      if (userData.length === 0) {
        // ApiNotFound expects (res, resourceType, statusCode?, metadata?)
        // The second parameter should be the resource type string, not metadata
        return ApiNotFound(res, 'User', 404, createMetadata(startTime));
      }

      // Fetch the user's interests from the related table
      const interests = await getUserInterests(userId);

      // Log this data access event for security auditing purposes
      // This helps track who accessed what data and when
      await securityAuditService.logDataAccess(
        `user:${userId}`,
        'read',
        req,
        (req as any).user?.id,
        1,
        true
      );

      // Return the combined user data with interests
      return ApiSuccess(res, {
        ...userData[0],
        interests,
      }, createMetadata(startTime));
    } catch (error) {
      logger.error('Error fetching user:', { component: 'Chanuka' }, error);
      
      // ApiError now requires a structured error object with code and message
      // The pattern is: ApiError(res, errorObject, statusCode?)
      return ApiError(res, {
        code: 'USER_FETCH_ERROR',
        message: 'Internal server error'
      }, 500);
    }
  });

  /**
   * PUT /users/:id - Update a user's profile information
   * Handles updates to name, preferences, and interests
   */
  router.put("/users/:id", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;
      const { firstName, lastName, preferences, interests } = req.body;

      // Ensure the user ID is valid before proceeding
      if (!validateUserId(userId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' });
      }

      // Build the update object dynamically based on what was provided
      // This prevents overwriting fields with undefined values
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Construct the full name only if at least one name component is provided
      if (firstName || lastName) {
        updateData.name = `${firstName || ''} ${lastName || ''}`.trim();
      }

      // Include preferences in the update only if explicitly provided
      if (preferences !== undefined) {
        updateData.preferences = preferences;
      }

      // Execute the database update and return the new values
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

      // Verify the user was found and updated
      if (updatedUser.length === 0) {
        return ApiNotFound(res, 'User', 404, createMetadata(startTime));
      }

      // Handle interests update based on what was provided in the request
      let finalInterests = interests || [];
      if (interests && Array.isArray(interests)) {
        // If interests array was provided, update them in the database
        await updateUserInterests(userId, interests);
      } else if (interests !== undefined) {
        // If interests was provided but isn't an array, fetch existing interests
        // This handles edge cases where the client sends invalid data
        finalInterests = await getUserInterests(userId);
      } else {
        // If interests weren't included in the request, retrieve current interests
        finalInterests = await getUserInterests(userId);
      }

      // Log the profile update for security auditing
      await securityAuditService.logDataAccess(
        `user:${userId}`,
        'update',
        req,
        (req as any).user?.id,
        1,
        true
      );

      // Return the complete updated profile including interests
      return ApiSuccess(res, {
        ...updatedUser[0],
        interests: finalInterests,
      }, createMetadata(startTime));
    } catch (error) {
      logger.error('Error updating user:', { component: 'Chanuka' }, error);
      
      return ApiError(res, {
        code: 'USER_UPDATE_ERROR',
        message: 'Internal server error'
      }, 500);
    }
  });

  /**
   * GET /users/:id/interests - Retrieve only a user's interests
   * Provides a lightweight endpoint for interest data without full profile
   */
  router.get("/users/:id/interests", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;

      // Validate user ID before querying
      if (!validateUserId(userId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' });
      }

      // Fetch only the interests data
      const interests = await getUserInterests(userId);

      return ApiSuccess(res, interests, createMetadata(startTime));
    } catch (error) {
      logger.error('Error fetching user interests:', { component: 'Chanuka' }, error);
      
      return ApiError(res, {
        code: 'INTERESTS_FETCH_ERROR',
        message: 'Internal server error'
      }, 500);
    }
  });

  /**
   * PUT /users/:id/interests - Replace a user's entire interest collection
   * Deletes existing interests and sets new ones
   */
  router.put("/users/:id/interests", async (req, res) => {
    const startTime = Date.now();

    try {
      const userId = req.params.id;
      const { interests } = req.body;

      // Validate user ID format
      if (!validateUserId(userId)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid user ID' });
      }

      // Ensure interests is provided as an array to prevent type errors
      if (!Array.isArray(interests)) {
        return ApiValidationError(res, { field: 'interests', message: 'Interests must be an array' });
      }

      // Replace all existing interests with the new array
      await updateUserInterests(userId, interests);

      return ApiSuccess(res, { interests }, createMetadata(startTime));
    } catch (error) {
      logger.error('Error updating user interests:', { component: 'Chanuka' }, error);
      
      return ApiError(res, {
        code: 'INTERESTS_UPDATE_ERROR',
        message: 'Internal server error'
      }, 500);
    }
  });
}

// Initialize the routes on the router instance
setupUserRoutes(router);

// Export both the router and setup function for maximum flexibility
// This allows the router to be used directly or routes to be added to an existing router
export { router };