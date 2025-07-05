
import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { expertVerifications, users } from "../../shared/schema";

const router = Router();

export function setupVerificationRoutes(routerInstance: Router) {
  // Get all verifications for a bill
  router.get("/verification/bills/:billId", async (req, res) => {
    try {
      const billId = parseInt(req.params.billId);

      if (isNaN(billId)) {
        return res.status(400).json({ error: "Invalid bill ID" });
      }

      const verifications = await db
        .select({
          id: expertVerifications.id,
          expertId: expertVerifications.expertId,
          verificationStatus: expertVerifications.verificationStatus,
          confidence: expertVerifications.confidence,
          feedback: expertVerifications.feedback,
          createdAt: expertVerifications.createdAt,
          expert: {
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
          },
        })
        .from(expertVerifications)
        .innerJoin(users, eq(expertVerifications.expertId, users.id))
        .where(eq(expertVerifications.billId, billId))
        .orderBy(desc(expertVerifications.createdAt));

      res.json(verifications);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Submit a verification
  router.post("/verification", async (req, res) => {
    try {
      const {
        billId,
        expertId,
        verificationStatus,
        confidence,
        feedback,
        metadata,
      } = req.body;

      if (!billId || !expertId || !verificationStatus) {
        return res.status(400).json({
          error: "billId, expertId, and verificationStatus are required",
        });
      }

      const verification = await db
        .insert(expertVerifications)
        .values({
          billId: parseInt(billId),
          expertId: parseInt(expertId),
          verificationStatus,
          confidence: confidence || 0,
          feedback: feedback || "",
          metadata: metadata || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json(verification[0]);
    } catch (error) {
      console.error("Error creating verification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update a verification
  router.put("/verification/:id", async (req, res) => {
    try {
      const verificationId = parseInt(req.params.id);
      const { verificationStatus, confidence, feedback, metadata } = req.body;

      if (isNaN(verificationId)) {
        return res.status(400).json({ error: "Invalid verification ID" });
      }

      const updatedVerification = await db
        .update(expertVerifications)
        .set({
          verificationStatus,
          confidence,
          feedback,
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(expertVerifications.id, verificationId))
        .returning();

      if (updatedVerification.length === 0) {
        return res.status(404).json({ error: "Verification not found" });
      }

      res.json(updatedVerification[0]);
    } catch (error) {
      console.error("Error updating verification:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get verification statistics
  router.get("/verification/stats", async (req, res) => {
    try {
      const stats = await db
        .select({
          verificationStatus: expertVerifications.verificationStatus,
          count: db.count(),
        })
        .from(expertVerifications)
        .groupBy(expertVerifications.verificationStatus);

      const totalVerifications = stats.reduce((sum, stat) => sum + stat.count, 0);

      res.json({
        total: totalVerifications,
        breakdown: stats.reduce((acc, stat) => {
          acc[stat.verificationStatus] = stat.count;
          return acc;
        }, {} as Record<string, number>),
      });
    } catch (error) {
      console.error("Error fetching verification stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// Set up the routes on the router
setupVerificationRoutes(router);

// Export both the router and setup function for flexibility
export { router };
