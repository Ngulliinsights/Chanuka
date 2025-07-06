
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, userInterests } from "../../shared/schema";

const router = Router();

export function setupUserRoutes(routerInstance: Router) {
  // Get user profile
  router.get("/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          preferences: users.preferences,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user interests
      const interests = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

      res.json({
        ...user[0],
        interests: interests.map(i => i.interest),
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user profile
  router.put("/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { firstName, lastName, preferences, interests } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Update user basic info
      const updatedUser = await db
        .update(users)
        .set({
          firstName,
          lastName,
          preferences,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          preferences: users.preferences,
        });

      if (updatedUser.length === 0) {
        return res.status(404).json({ error: "User not found" });
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

      res.json({
        ...updatedUser[0],
        interests: interests || [],
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user interests
  router.get("/users/:id/interests", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const interests = await db
        .select({ interest: userInterests.interest })
        .from(userInterests)
        .where(eq(userInterests.userId, userId));

      res.json(interests.map(i => i.interest));
    } catch (error) {
      console.error("Error fetching user interests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user interests
  router.put("/users/:id/interests", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { interests } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      if (!Array.isArray(interests)) {
        return res.status(400).json({ error: "Interests must be an array" });
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

      res.json({ interests });
    } catch (error) {
      console.error("Error updating user interests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// Set up the routes on the router
setupUserRoutes(router);

// Export both the router and setup function for flexibility
export { router };
