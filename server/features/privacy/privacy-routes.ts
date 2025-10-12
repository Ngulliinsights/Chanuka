import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { privacyService, PrivacyPreferences } from './privacy-service.js';
import { ApiSuccess, ApiError, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { auditLogger } from "../../infrastructure/monitoring/audit-log.js";
import { logger } from '../../utils/logger';

export const router = Router();

// Validation schemas with proper typing
const updatePrivacyPreferencesSchema = z.object({
  dataProcessing: z.object({
    analytics: z.boolean(),
    marketing: z.boolean(),
    research: z.boolean(),
    personalization: z.boolean()
  }).partial().optional(),
  dataSharing: z.object({
    publicProfile: z.boolean(),
    shareEngagement: z.boolean(),
    shareComments: z.boolean(),
    shareVotingHistory: z.boolean()
  }).partial().optional(),
  dataRetention: z.object({
    keepComments: z.boolean(),
    keepEngagementHistory: z.boolean(),
    keepNotifications: z.boolean(),
    retentionPeriodMonths: z.number().min(1).max(120)
  }).partial().optional(),
  communications: z.object({
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    smsNotifications: z.boolean(),
    marketingEmails: z.boolean()
  }).partial().optional(),
  cookies: z.object({
    analytics: z.boolean(),
    marketing: z.boolean(),
    preferences: z.boolean()
  }).partial().optional()
});

const dataExportRequestSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeAuditLogs: z.boolean().default(false)
});

const dataDeletionRequestSchema = z.object({
  confirmDeletion: z.boolean(),
  keepAuditTrail: z.boolean().default(true),
  reason: z.string().optional()
});

const retentionPolicyUpdateSchema = z.object({
  dataType: z.string(),
  retentionPeriodDays: z.number().min(1).max(3650)
});

// Helper function to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Helper function to create error details object for logging
const createErrorDetails = (error: unknown): Record<string, any> => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
  }
  return { message: String(error) };
};

// Middleware to extract IP address from request
const getClientIP = (req: AuthenticatedRequest): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
};

/**
 * Get user's privacy preferences
 * Returns the current privacy settings for the authenticated user
 */
router.get('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = await privacyService.getPrivacyPreferences(userId);
    
    return ApiSuccess(res, preferences, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching privacy preferences:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to fetch privacy preferences', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Update user's privacy preferences
 * Allows partial updates - only provided fields will be updated
 */
router.patch('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const parsedData = updatePrivacyPreferencesSchema.parse(req.body);
    
    // Cast to Partial<PrivacyPreferences> to handle the type mismatch
    // This is safe because we're only updating provided fields
    const preferences = parsedData as Partial<PrivacyPreferences>;
    
    const updatedPreferences = await privacyService.updatePrivacyPreferences(userId, preferences);
    
    // Log the preference update with low severity (routine operation)
    await auditLogger.log({
      userId,
      action: 'privacy.preferences.updated',
      resource: 'user_preferences',
      severity: 'low',
      details: { 
        updatedFields: Object.keys(preferences),
        timestamp: new Date()
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return ApiSuccess(res, updatedPreferences, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating privacy preferences:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to update privacy preferences', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Request user data export (GDPR Article 15 - Right of Access)
 * Generates a complete export of all user data in JSON or CSV format
 */
router.post('/data-export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { format, includeAuditLogs } = dataExportRequestSchema.parse(req.body);
    
    const exportData = await privacyService.exportUserData(userId, userId);
    
    // Log the data export request with low severity (user exercising their rights)
    await auditLogger.log({
      userId,
      action: 'data.export.requested',
      resource: 'user_data',
      severity: 'low',
      details: { 
        format,
        includeAuditLogs,
        recordCount: exportData.exportMetadata.totalRecords,
        timestamp: new Date()
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
      return res.json(exportData);
    } else {
      // CSV format - simplified summary version
      const csvData = [
        'Data Type,Count',
        `Comments,${exportData.comments.length}`,
        `Engagement Records,${exportData.engagement.length}`,
        `Interests,${exportData.interests.length}`,
        `Notifications,${exportData.notifications.length}`,
        `Social Profiles,${exportData.socialProfiles.length}`,
        `Progress Records,${exportData.progress.length}`,
        `Social Shares,${exportData.socialShares.length}`,
        `Comment Votes,${exportData.commentVotes.length}`,
        `Audit Logs,${exportData.auditLogs.length}`
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-summary-${userId}-${Date.now()}.csv"`);
      return res.send(csvData);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error exporting user data:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to export user data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Request user data deletion (GDPR Article 17 - Right to Erasure)
 * Permanently deletes user data with optional audit trail preservation
 */
router.post('/data-deletion', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { confirmDeletion, keepAuditTrail, reason } = dataDeletionRequestSchema.parse(req.body);
    
    if (!confirmDeletion) {
      return ApiError(res, 'Deletion confirmation required', 400, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // Log the deletion request before performing it - high severity for irreversible action
    await auditLogger.log({
      userId,
      action: 'data.deletion.requested',
      resource: 'user_data',
      severity: 'high',
      details: { 
        keepAuditTrail,
        reason: reason || 'User requested data deletion',
        timestamp: new Date()
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    const deletionResult = await privacyService.deleteUserData(userId, userId, keepAuditTrail);
    
    return ApiSuccess(res, {
      message: 'User data has been successfully deleted',
      deletionResult
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error deleting user data:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to delete user data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Generate GDPR compliance report for user
 * Provides detailed compliance status across all GDPR requirements
 */
router.get('/gdpr-report', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const complianceReport = await privacyService.generateGDPRComplianceReport(userId);
    
    // Log the report generation with low severity (informational request)
    await auditLogger.log({
      userId,
      action: 'gdpr.report.generated',
      resource: 'compliance_report',
      severity: 'low',
      details: { 
        overallScore: complianceReport.overallComplianceScore,
        timestamp: new Date()
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return ApiSuccess(res, complianceReport, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error generating GDPR report:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to generate GDPR compliance report', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Get data retention policies (public information)
 * No authentication required - returns system-wide retention policies
 */
router.get('/retention-policies', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const policies = privacyService.getDataRetentionPolicies();
    
    return ApiSuccess(res, { policies }, 
      ApiResponseWrapper.createMetadata(startTime, 'cache'));
  } catch (error) {
    logger.error('Error fetching retention policies:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to fetch retention policies', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'cache'));
  }
});

/**
 * Run data cleanup (admin only)
 * Executes retention policy cleanup across all data types
 */
router.post('/cleanup', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const cleanupResult = await privacyService.runDataCleanup();
    
    // Log the cleanup operation with high severity (system-wide operation)
    await auditLogger.log({
      userId,
      action: 'data.cleanup.executed',
      resource: 'system',
      severity: 'high',
      details: { 
        success: cleanupResult.success,
        results: cleanupResult.cleanupResults,
        timestamp: new Date()
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return ApiSuccess(res, cleanupResult, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error running data cleanup:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to run data cleanup', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Update data retention policy (admin only)
 * Modifies retention period for specific data types
 */
router.patch('/retention-policies', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return ApiError(res, 'Insufficient permissions', 403, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    const { dataType, retentionPeriodDays } = retentionPolicyUpdateSchema.parse(req.body);
    
    const success = privacyService.updateDataRetentionPolicy(dataType, retentionPeriodDays);
    
    if (!success) {
      return ApiError(res, 'Data type not found', 404, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // Log the policy update with medium severity (configuration change)
    await auditLogger.log({
      userId,
      action: 'retention.policy.updated',
      resource: 'system_policy',
      severity: 'medium',
      details: { 
        dataType,
        newRetentionPeriod: retentionPeriodDays,
        timestamp: new Date()
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return ApiSuccess(res, { 
      message: 'Retention policy updated successfully',
      dataType,
      retentionPeriodDays
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error updating retention policy:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to update retention policy', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Get privacy dashboard summary
 * Aggregates all privacy-related information for the user
 */
router.get('/dashboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    
    // Fetch all dashboard data in parallel for optimal performance
    const [preferences, complianceReport, retentionPolicies] = await Promise.all([
      privacyService.getPrivacyPreferences(userId),
      privacyService.generateGDPRComplianceReport(userId),
      Promise.resolve(privacyService.getDataRetentionPolicies())
    ]);
    
    const dashboard = {
      privacyPreferences: preferences,
      complianceScore: complianceReport.overallComplianceScore,
      dataRetentionPolicies: retentionPolicies,
      userRights: {
        dataExport: true,
        dataDeletion: true,
        dataPortability: true,
        consentWithdrawal: true
      },
      lastUpdated: new Date()
    };
    
    return ApiSuccess(res, dashboard, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching privacy dashboard:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to fetch privacy dashboard', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Consent management - withdraw consent for specific data processing
 * Allows users to opt out of specific data processing activities
 */
router.post('/withdraw-consent', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { processingType } = req.body;
    
    const validProcessingTypes = ['analytics', 'marketing', 'research', 'personalization'] as const;
    
    if (!validProcessingTypes.includes(processingType)) {
      return ApiError(res, 'Invalid processing type', 400, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // Update privacy preferences to withdraw consent
    const currentPrefs = await privacyService.getPrivacyPreferences(userId);
    const updatedPrefs = {
      dataProcessing: {
        ...currentPrefs.dataProcessing,
        [processingType]: false
      }
    };
    
    await privacyService.updatePrivacyPreferences(userId, updatedPrefs);
    
    // Log the consent withdrawal with medium severity (important user action)
    await auditLogger.log({
      userId,
      action: 'consent.withdrawn',
      resource: 'user_consent',
      severity: 'medium',
      details: { 
        processingType,
        timestamp: new Date()
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown'
    });
    
    return ApiSuccess(res, {
      message: `Consent withdrawn for ${processingType} data processing`,
      processingType,
      updatedPreferences: updatedPrefs
    }, ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error withdrawing consent:', { component: 'SimpleTool' }, createErrorDetails(error));
    return ApiError(res, 'Failed to withdraw consent', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});