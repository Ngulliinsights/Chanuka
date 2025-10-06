import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../../middleware/auth.js';
import { privacyService, PrivacyPreferences } from './privacy-service.js';
import { ApiSuccess, ApiErrorResponse, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { auditLogger } from "../../infrastructure/monitoring/audit-log.js";

export const router = Router();

// Validation schemas
const updatePrivacyPreferencesSchema = z.object({
  dataProcessing: z.object({
    analytics: z.boolean().optional(),
    marketing: z.boolean().optional(),
    research: z.boolean().optional(),
    personalization: z.boolean().optional()
  }).optional(),
  dataSharing: z.object({
    publicProfile: z.boolean().optional(),
    shareEngagement: z.boolean().optional(),
    shareComments: z.boolean().optional(),
    shareVotingHistory: z.boolean().optional()
  }).optional(),
  dataRetention: z.object({
    keepComments: z.boolean().optional(),
    keepEngagementHistory: z.boolean().optional(),
    keepNotifications: z.boolean().optional(),
    retentionPeriodMonths: z.number().min(1).max(120).optional()
  }).optional(),
  communications: z.object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    marketingEmails: z.boolean().optional()
  }).optional(),
  cookies: z.object({
    analytics: z.boolean().optional(),
    marketing: z.boolean().optional(),
    preferences: z.boolean().optional()
    // essential is always true and cannot be changed
  }).optional()
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

// Middleware to extract IP address
const getClientIP = (req: AuthenticatedRequest): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
};

/**
 * Get user's privacy preferences
 */
router.get('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = await privacyService.getPrivacyPreferences(userId);
    
    return ApiSuccess(res, preferences, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    console.error('Error fetching privacy preferences:', error);
    return ApiError(res, 'Failed to fetch privacy preferences', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Update user's privacy preferences
 */
router.patch('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const preferences = updatePrivacyPreferencesSchema.parse(req.body);
    
    const updatedPreferences = await privacyService.updatePrivacyPreferences(userId, preferences);
    
    // Log the preference update
    await auditLogger.log({
      userId,
      action: 'privacy.preferences.updated',
      resource: 'user_preferences',
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
    console.error('Error updating privacy preferences:', error);
    return ApiError(res, 'Failed to update privacy preferences', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Request user data export (GDPR Article 15 - Right of Access)
 */
router.post('/data-export', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { format, includeAuditLogs } = dataExportRequestSchema.parse(req.body);
    
    const exportData = await privacyService.exportUserData(userId, userId);
    
    // Log the data export request
    await auditLogger.log({
      userId,
      action: 'data.export.requested',
      resource: 'user_data',
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
      // CSV format - simplified version
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
    console.error('Error exporting user data:', error);
    return ApiError(res, 'Failed to export user data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Request user data deletion (GDPR Article 17 - Right to Erasure)
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
    
    // Log the deletion request before performing it
    await auditLogger.log({
      userId,
      action: 'data.deletion.requested',
      resource: 'user_data',
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
    console.error('Error deleting user data:', error);
    return ApiError(res, 'Failed to delete user data', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Generate GDPR compliance report for user
 */
router.get('/gdpr-report', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const complianceReport = await privacyService.generateGDPRComplianceReport(userId);
    
    // Log the report generation
    await auditLogger.log({
      userId,
      action: 'gdpr.report.generated',
      resource: 'compliance_report',
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
    console.error('Error generating GDPR report:', error);
    return ApiError(res, 'Failed to generate GDPR compliance report', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Get data retention policies (public information)
 */
router.get('/retention-policies', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const policies = privacyService.getDataRetentionPolicies();
    
    return ApiSuccess(res, { policies }, 
      ApiResponseWrapper.createMetadata(startTime, 'cache'));
  } catch (error) {
    console.error('Error fetching retention policies:', error);
    return ApiError(res, 'Failed to fetch retention policies', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'cache'));
  }
});

/**
 * Run data cleanup (admin only)
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
    
    // Log the cleanup operation
    await auditLogger.log({
      userId,
      action: 'data.cleanup.executed',
      resource: 'system',
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
    console.error('Error running data cleanup:', error);
    return ApiError(res, 'Failed to run data cleanup', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Update data retention policy (admin only)
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
    
    // Log the policy update
    await auditLogger.log({
      userId,
      action: 'retention.policy.updated',
      resource: 'system_policy',
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
    console.error('Error updating retention policy:', error);
    return ApiError(res, 'Failed to update retention policy', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Get privacy dashboard summary
 */
router.get('/dashboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    
    // Get privacy preferences
    const preferences = await privacyService.getPrivacyPreferences(userId);
    
    // Get GDPR compliance report
    const complianceReport = await privacyService.generateGDPRComplianceReport(userId);
    
    // Get retention policies
    const retentionPolicies = privacyService.getDataRetentionPolicies();
    
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
    console.error('Error fetching privacy dashboard:', error);
    return ApiError(res, 'Failed to fetch privacy dashboard', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

/**
 * Consent management - withdraw consent for specific data processing
 */
router.post('/withdraw-consent', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user!.id;
    const { processingType } = req.body;
    
    if (!['analytics', 'marketing', 'research', 'personalization'].includes(processingType)) {
      return ApiError(res, 'Invalid processing type', 400, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    
    // Update privacy preferences to withdraw consent
    const currentPrefs = await privacyService.getPrivacyPreferences(userId);
    const updatedPrefs = {
      ...currentPrefs,
      dataProcessing: {
        ...currentPrefs.dataProcessing,
        [processingType]: false
      }
    };
    
    await privacyService.updatePrivacyPreferences(userId, updatedPrefs);
    
    // Log the consent withdrawal
    await auditLogger.log({
      userId,
      action: 'consent.withdrawn',
      resource: 'user_consent',
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
    console.error('Error withdrawing consent:', error);
    return ApiError(res, 'Failed to withdraw consent', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});