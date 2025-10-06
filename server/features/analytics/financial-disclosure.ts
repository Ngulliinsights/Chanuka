import { Router, Request, Response } from "express";
import { financialDisclosureIntegrationService } from "./financial-disclosure-integration.js";
import { ApiSuccess, ApiErrorResponse, ApiNotFound } from "../../utils/api-response.js";
import { ApiResponseWrapper } from "../../utils/api-response.js";
import { z } from "zod";

export const router = Router();

// Enhanced validation schemas with better error messages
const sponsorIdSchema = z.object({
  sponsorId: z
    .string()
    .min(1, "Sponsor ID cannot be empty")
    .transform((val) => {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Sponsor ID must be a valid number",
            path: ["sponsorId"],
          },
        ]);
      }
      return parsed;
    }),
});

const alertSchema = z.object({
  type: z.enum(
    [
      "new_disclosure",
      "updated_disclosure",
      "missing_disclosure",
      "threshold_exceeded",
    ],
    {
      errorMap: () => ({
        message:
          "Alert type must be one of: new_disclosure, updated_disclosure, missing_disclosure, threshold_exceeded",
      }),
    }
  ),
  sponsorId: z.number().int().positive("Sponsor ID must be a positive integer"),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(500, "Description cannot exceed 500 characters"),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
});

// Query parameter validation schema
const disclosureQuerySchema = z.object({
  sponsorId: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parsed = parseInt(val, 10);
      if (isNaN(parsed)) return undefined;
      return parsed;
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 50; // Default limit
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 || parsed > 1000 ? 50 : parsed;
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 0;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }),
});

// Utility function to handle common error patterns
const handleServiceError = (
  error: unknown,
  res: Response,
  startTime: number,
  defaultMessage: string
) => {
  console.error(`Service error: ${defaultMessage}`, error);

  if (error instanceof Error) {
    // Check for specific error types that should return 404
    if (
      error.message.includes("not found") ||
      error.message.includes("does not exist")
    ) {
      return ApiNotFound(
        res,
        "Sponsor",
        ApiResponseWrapper.createMetadata(startTime, "database")
      );
    }

    // Check for validation errors that should return 400
    if (
      error.message.includes("invalid") ||
      error.message.includes("validation")
    ) {
      return ApiError(
        res,
        error.message,
        400,
        ApiResponseWrapper.createMetadata(startTime, "database")
      );
    }
  }

  return ApiError(
    res,
    defaultMessage,
    500,
    ApiResponseWrapper.createMetadata(startTime, "database")
  );
};

// Get financial disclosures with enhanced query parameter support
router.get("/disclosures", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate query parameters with enhanced schema
    const queryValidation = disclosureQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      return ApiError(
        res,
        "Invalid query parameters",
        400,
        ApiResponseWrapper.createMetadata(startTime, "database")
      );
    }

    const { sponsorId, limit, offset } = queryValidation.data;

    // Call service method (it only accepts sponsorId parameter)
    const disclosures =
      await financialDisclosureIntegrationService.processFinancialDisclosureData(
        sponsorId
      );

    // Apply pagination manually
    const totalCount = disclosures.length;
    const paginatedDisclosures = disclosures.slice(offset, offset + limit);

    return ApiSuccess(
      res,
      {
        disclosures: paginatedDisclosures,
        totalCount,
        count: paginatedDisclosures.length,
        sponsorId: sponsorId || null,
        pagination: {
          limit,
          offset,
          hasMore: offset + paginatedDisclosures.length < totalCount,
        },
      },
      ApiResponseWrapper.createMetadata(startTime, "database")
    );
  } catch (error) {
    return handleServiceError(
      error,
      res,
      startTime,
      "Failed to fetch financial disclosures"
    );
  }
});

// Get financial relationship map with caching support
router.get("/relationships/:sponsorId", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validation = sponsorIdSchema.safeParse({
      sponsorId: req.params.sponsorId,
    });

    if (!validation.success) {
      return ApiError(
        res,
        validation.error.errors[0]?.message || "Invalid sponsor ID",
        400,
        ApiResponseWrapper.createMetadata(startTime, "database")
      );
    }

    const { sponsorId } = validation.data;

    // Check for cache control headers
    const useCache = req.headers["cache-control"] !== "no-cache";

    const relationshipMapping =
      await financialDisclosureIntegrationService.createFinancialRelationshipMapping(
        sponsorId
      );

    const relationships = relationshipMapping.relationships;

    // Set appropriate cache headers for successful responses
    if (useCache && relationships.length > 0) {
      res.set("Cache-Control", "public, max-age=3600"); // 1 hour cache
    }

    return ApiSuccess(
      res,
      {
        sponsorId,
        relationships,
        count: relationships.length,
        lastUpdated: new Date().toISOString(),
      },
      ApiResponseWrapper.createMetadata(startTime, "database")
    );
  } catch (error) {
    return handleServiceError(
      error,
      res,
      startTime,
      "Failed to fetch financial relationships"
    );
  }
});

// Get disclosure completeness with detailed breakdown
router.get("/completeness/:sponsorId", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validation = sponsorIdSchema.safeParse({
      sponsorId: req.params.sponsorId,
    });

    if (!validation.success) {
      return ApiError(
        res,
        validation.error.errors[0]?.message || "Invalid sponsor ID",
        400,
        ApiResponseWrapper.createMetadata(startTime, "database")
      );
    }

    const { sponsorId } = validation.data;

    // Check if detailed breakdown is requested
    const includeDetails = req.query.details === "true";

    const completenessReport =
      await financialDisclosureIntegrationService.calculateDisclosureCompletenessScore(
        sponsorId
      );

    return ApiSuccess(
      res,
      {
        ...completenessReport,
        sponsorId,
        calculatedAt: new Date().toISOString(),
      },
      ApiResponseWrapper.createMetadata(startTime, "database")
    );
  } catch (error) {
    return handleServiceError(
      error,
      res,
      startTime,
      "Failed to calculate disclosure completeness"
    );
  }
});

// Create a financial disclosure alert with enhanced validation
router.post("/alerts", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Enhanced validation that includes sponsorId in the main schema
    const validation = alertSchema.safeParse({
      ...req.body,
      sponsorId: parseInt(req.body.sponsorId, 10) || undefined,
    });

    if (!validation.success) {
      const errorMessages = validation.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; ");

      return ApiError(
        res,
        `Validation failed: ${errorMessages}`,
        400,
        ApiResponseWrapper.createMetadata(startTime, "database")
      );
    }

    const { type, sponsorId, description, severity } = validation.data;

    // Note: Sponsor existence check is handled within the service method

    // Create alert using integration service
    const alert = await financialDisclosureIntegrationService.createManualAlert(
      type,
      sponsorId,
      description,
      severity
    );

    return ApiSuccess(
      res,
      {
        ...alert,
        createdAt: new Date().toISOString(),
      },
      ApiResponseWrapper.createMetadata(startTime, "database"),
      201
    );
  } catch (error) {
    return handleServiceError(
      error,
      res,
      startTime,
      "Failed to create disclosure alert"
    );
  }
});

// Get all alerts for a sponsor with filtering options
router.get("/alerts/:sponsorId", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const validation = sponsorIdSchema.safeParse({
      sponsorId: req.params.sponsorId,
    });

    if (!validation.success) {
      return ApiError(
        res,
        validation.error.errors[0]?.message || "Invalid sponsor ID",
        400,
        ApiResponseWrapper.createMetadata(startTime, "database")
      );
    }

    const { sponsorId } = validation.data;

    // Parse query parameters for filtering
    const severity = req.query.severity as string;
    const type = req.query.type as string;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 200);

    // Get alerts for the sponsor using the service method
    const allAlerts = await financialDisclosureIntegrationService.monitorDisclosureUpdates();
    
    // Filter alerts for the specific sponsor and apply filters
    let alerts = allAlerts.filter(alert => alert.sponsorId === sponsorId);
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }
    
    // Apply limit
    alerts = alerts.slice(0, limit);

    return ApiSuccess(
      res,
      {
        sponsorId,
        alerts,
        count: alerts.length,
        filters: { severity, type, limit },
      },
      ApiResponseWrapper.createMetadata(startTime, "database")
    );
  } catch (error) {
    return handleServiceError(
      error,
      res,
      startTime,
      "Failed to fetch disclosure alerts"
    );
  }
});

// Trigger manual monitoring check
router.post("/monitoring/check", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const alerts =
      await financialDisclosureIntegrationService.monitorDisclosureUpdates();

    return ApiSuccess(
      res,
      {
        message: "Manual monitoring check completed",
        alertsGenerated: alerts.length,
        alerts: alerts.slice(0, 10), // Return first 10 alerts
        checkedAt: new Date().toISOString(),
      },
      ApiResponseWrapper.createMetadata(startTime, "database")
    );
  } catch (error) {
    return handleServiceError(
      error,
      res,
      startTime,
      "Failed to perform monitoring check"
    );
  }
});

// Health check endpoint for monitoring
router.get("/health", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Simple health check for the integration service
    const testDisclosures = await financialDisclosureIntegrationService.processFinancialDisclosureData();
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: [
        {
          name: "database_connection",
          status: "healthy",
          message: "Database connection successful"
        },
        {
          name: "disclosure_processing",
          status: "healthy", 
          message: `Processed ${testDisclosures.length} disclosures successfully`
        }
      ]
    };

    return ApiSuccess(
      res,
      healthStatus,
      ApiResponseWrapper.createMetadata(startTime, "static")
    );
  } catch (error) {
    return ApiError(
      res,
      "Service unhealthy",
      503,
      ApiResponseWrapper.createMetadata(startTime, "static")
    );
  }
});
