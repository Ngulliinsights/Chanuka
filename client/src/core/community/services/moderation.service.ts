/**
 * Moderation Service
 *
 * Complete moderation workflow implementation, resolving the incomplete
 * moderation implementations identified in the analysis (lines 217-240).
 */

import { globalApiClient } from '../../api/client';
import type { ModerationRequest, UnifiedModeration, ViolationType } from '../types';

export class ModerationService {
  private static instance: ModerationService;

  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  /**
   * Report content for moderation
   */
  async reportContent(request: ModerationRequest): Promise<UnifiedModeration> {
    try {
      const response = await globalApiClient.post('/api/moderation/report', request);
      return response.data as UnifiedModeration;
    } catch (error) {
      console.error('Failed to report content:', error);
      throw new Error('Failed to submit report. Please try again.');
    }
  }

  /**
   * Get moderation reports for content
   */
  async getModerationReports(contentId: string): Promise<UnifiedModeration[]> {
    try {
      const response = await globalApiClient.get(`/api/moderation/reports/${contentId}`);
      return response.data as UnifiedModeration[];
    } catch (error) {
      console.error('Failed to fetch moderation reports:', error);
      return [];
    }
  }

  /**
   * Get pending moderation items (admin only)
   */
  async getPendingModerations(): Promise<UnifiedModeration[]> {
    try {
      const response = await globalApiClient.get('/api/moderation/pending');
      return response.data as UnifiedModeration[];
    } catch (error) {
      console.error('Failed to fetch pending moderations:', error);
      return [];
    }
  }

  /**
   * Moderate content (admin/moderator only)
   */
  async moderateContent(
    moderationId: string,
    action: 'approve' | 'hide' | 'delete' | 'warn_user' | 'ban_user',
    notes?: string
  ): Promise<UnifiedModeration> {
    try {
      const response = await globalApiClient.post(`/api/moderation/${moderationId}/moderate`, {
        action,
        notes,
      });
      return response.data as UnifiedModeration;
    } catch (error) {
      console.error('Failed to moderate content:', error);
      throw new Error('Failed to moderate content. Please try again.');
    }
  }

  /**
   * Check if content should be auto-moderated based on rules
   */
  async checkAutoModeration(content: string): Promise<{
    shouldModerate: boolean;
    violations: ViolationType[];
    confidence: number;
  }> {
    try {
      const response = await globalApiClient.post('/api/moderation/auto-check', {
        content,
      });
      return response.data as {
        shouldModerate: boolean;
        violations: ViolationType[];
        confidence: number;
      };
    } catch (error) {
      console.error('Auto-moderation check failed:', error);
      return {
        shouldModerate: false,
        violations: [],
        confidence: 0,
      };
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(): Promise<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    reportsByType: Record<ViolationType, number>;
    reportsByStatus: Record<string, number>;
  }> {
    try {
      const response = await globalApiClient.get('/api/moderation/stats');
      return response.data as {
        totalReports: number;
        pendingReports: number;
        resolvedReports: number;
        reportsByType: Record<ViolationType, number>;
        reportsByStatus: Record<string, number>;
      };
    } catch (error) {
      console.error('Failed to fetch moderation stats:', error);
      return {
        totalReports: 0,
        pendingReports: 0,
        resolvedReports: 0,
        reportsByType: {} as Record<ViolationType, number>,
        reportsByStatus: {},
      };
    }
  }

  /**
   * Validate moderation request
   */
  validateModerationRequest(request: ModerationRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.contentId?.trim()) {
      errors.push('Content ID is required');
    }

    if (!request.contentType || !['comment', 'thread'].includes(request.contentType)) {
      errors.push('Valid content type is required (comment or thread)');
    }

    if (!request.violationType) {
      errors.push('Violation type is required');
    }

    if (!request.description?.trim()) {
      errors.push('Description is required');
    } else if (request.description.length < 10) {
      errors.push('Description must be at least 10 characters');
    } else if (request.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get violation type descriptions for UI
   */
  getViolationTypeDescriptions(): Record<ViolationType, string> {
    return {
      spam: 'Unwanted or repetitive content',
      harassment: 'Bullying, intimidation, or personal attacks',
      inappropriate_language: 'Offensive, vulgar, or inappropriate language',
      misinformation: 'False or misleading information',
      off_topic: 'Content not related to the discussion',
      personal_attack: 'Direct attacks on individuals',
      copyright_violation: 'Unauthorized use of copyrighted material',
      hate_speech: 'Content promoting hatred or discrimination',
      duplicate_content: 'Repeated or duplicate posts',
      offensive: 'Offensive or inappropriate content',
      other: 'Other violations not covered by specific categories',
    };
  }

  /**
   * Get severity levels for violation types
   */
  getViolationSeverity(violationType: ViolationType): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<ViolationType, 'low' | 'medium' | 'high' | 'critical'> = {
      spam: 'low',
      off_topic: 'low',
      duplicate_content: 'low',
      inappropriate_language: 'medium',
      misinformation: 'medium',
      personal_attack: 'high',
      harassment: 'high',
      hate_speech: 'critical',
      copyright_violation: 'high',
      offensive: 'medium',
      other: 'low',
    };

    return severityMap[violationType] || 'medium';
  }

  /**
   * Check if user can report content (rate limiting)
   */
  async canUserReport(userId: string): Promise<{
    canReport: boolean;
    reason?: string;
    nextAllowedTime?: Date;
  }> {
    try {
      const response = await globalApiClient.get(`/api/moderation/can-report/${userId}`);
      return response.data as { canReport: boolean; reason?: string; nextAllowedTime?: Date };
    } catch (error) {
      console.error('Failed to check report permissions:', error);
      return { canReport: true };
    }
  }

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(userId: string): Promise<{
    reports: UnifiedModeration[];
    warnings: number;
    suspensions: number;
    lastAction?: Date;
  }> {
    try {
      const response = await globalApiClient.get(`/api/moderation/user-history/${userId}`);
      return response.data as {
        reports: UnifiedModeration[];
        warnings: number;
        suspensions: number;
        lastAction?: Date;
      };
    } catch (error) {
      console.error('Failed to fetch user moderation history:', error);
      return {
        reports: [],
        warnings: 0,
        suspensions: 0,
      };
    }
  }
}
