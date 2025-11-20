/**
 * Privacy Compliance Utilities
 * GDPR, CCPA, and other privacy regulation compliance tools
 */

import { ConsentRecord, DataExportRequest, DataDeletionRequest, PrivacySettings } from '@client/types/auth';
import { logger } from './logger';

interface ConsentVersion {
  version: string;
  effective_date: string;
  changes: string[];
  requires_reconfirmation: boolean;
}

interface DataCategory {
  id: string;
  name: string;
  description: string;
  retention_period: string;
  legal_basis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  can_export: boolean;
  can_delete: boolean;
  third_party_sharing: boolean;
}

class PrivacyComplianceManager {
  private readonly CONSENT_VERSIONS: ConsentVersion[] = [
    {
      version: '1.0.0',
      effective_date: '2024-01-01',
      changes: ['Initial privacy policy'],
      requires_reconfirmation: false,
    },
    {
      version: '1.1.0',
      effective_date: '2024-06-01',
      changes: ['Added analytics tracking', 'Updated data retention policies'],
      requires_reconfirmation: true,
    },
  ];

  private readonly DATA_CATEGORIES: DataCategory[] = [
    {
      id: 'profile',
      name: 'Profile Information',
      description: 'Basic account information like name, email, username',
      retention_period: '2 years after account deletion',
      legal_basis: 'contract',
      can_export: true,
      can_delete: true,
      third_party_sharing: false,
    },
    {
      id: 'activity',
      name: 'Platform Activity',
      description: 'Comments, votes, bill interactions, and engagement data',
      retention_period: '5 years for civic transparency',
      legal_basis: 'legitimate_interests',
      can_export: true,
      can_delete: false, // Civic transparency requirement
      third_party_sharing: false,
    },
    {
      id: 'analytics',
      name: 'Analytics Data',
      description: 'Usage patterns, performance metrics, and behavioral data',
      retention_period: '2 years',
      legal_basis: 'consent',
      can_export: true,
      can_delete: true,
      third_party_sharing: true,
    },
    {
      id: 'security',
      name: 'Security Logs',
      description: 'Login attempts, security events, and audit trails',
      retention_period: '7 years for security purposes',
      legal_basis: 'legal_obligation',
      can_export: true,
      can_delete: false,
      third_party_sharing: false,
    },
    {
      id: 'communications',
      name: 'Communications',
      description: 'Email notifications, messages, and communication preferences',
      retention_period: '1 year after last interaction',
      legal_basis: 'consent',
      can_export: true,
      can_delete: true,
      third_party_sharing: false,
    },
  ];

  /**
   * Records user consent with full audit trail
   */
  recordConsent(
    userId: string,
    consentType: ConsentRecord['consent_type'],
    granted: boolean,
    version: string = this.getCurrentConsentVersion()
  ): ConsentRecord {
    const consent: ConsentRecord = {
      id: crypto.randomUUID(),
      consent_type: consentType,
      granted,
      granted_at: new Date().toISOString(),
      withdrawn_at: null,
      version,
      ip_address: this.getCurrentIP(),
      user_agent: navigator.userAgent,
    };

    logger.info('Consent recorded', {
      component: 'PrivacyCompliance',
      userId,
      consentType,
      granted,
      version,
    });

    return consent;
  }

  /**
   * Withdraws previously given consent
   */
  withdrawConsent(consentRecord: ConsentRecord): ConsentRecord {
    const updatedConsent = {
      ...consentRecord,
      granted: false,
      withdrawn_at: new Date().toISOString(),
    };

    logger.info('Consent withdrawn', {
      component: 'PrivacyCompliance',
      consentId: consentRecord.id,
      consentType: consentRecord.consent_type,
    });

    return updatedConsent;
  }

  /**
   * Checks if consent is required for a specific data processing activity
   */
  isConsentRequired(dataCategory: string, processingPurpose: string): boolean {
    const category = this.DATA_CATEGORIES.find(c => c.id === dataCategory);
    if (!category) return true; // Err on the side of caution

    // Consent required for consent-based legal basis
    if (category.legal_basis === 'consent') return true;

    // Special cases for analytics and marketing
    if (processingPurpose === 'analytics' || processingPurpose === 'marketing') {
      return true;
    }

    return false;
  }

  /**
   * Validates privacy settings against legal requirements
   */
  validatePrivacySettings(settings: PrivacySettings): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required consents
    if (settings.analytics_consent === undefined) {
      errors.push('Analytics consent must be explicitly granted or denied');
    }

    if (settings.marketing_consent === undefined) {
      errors.push('Marketing consent must be explicitly granted or denied');
    }

    // Validate data sharing settings
    if (settings.data_sharing_consent && !settings.analytics_consent) {
      warnings.push('Data sharing requires analytics consent to be meaningful');
    }

    // Check notification preferences
    if (settings.notification_preferences.security_alerts === false) {
      warnings.push('Disabling security alerts may compromise account security');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generates data export in requested format
   */
  async generateDataExport(
    userId: string,
    format: 'json' | 'csv' | 'xml',
    categories: string[]
  ): Promise<DataExportRequest> {
    const exportRequest: DataExportRequest = {
      id: crypto.randomUUID(),
      user_id: userId,
      requested_at: new Date().toISOString(),
      status: 'pending',
      completed_at: null,
      download_url: null,
      expires_at: null,
      format,
      includes: categories,
    };

    logger.info('Data export requested', {
      component: 'PrivacyCompliance',
      userId,
      format,
      categories,
      requestId: exportRequest.id,
    });

    // In production, this would trigger an async job
    this.processDataExport(exportRequest);

    return exportRequest;
  }

  /**
   * Processes data deletion request with proper safeguards
   */
  async requestDataDeletion(
    userId: string,
    categories: string[],
    retentionPeriod: string = '30days'
  ): Promise<DataDeletionRequest> {
    // Validate deletion request
    const nonDeletableCategories = categories.filter(cat => {
      const category = this.DATA_CATEGORIES.find(c => c.id === cat);
      return category && !category.can_delete;
    });

    if (nonDeletableCategories.length > 0) {
      throw new Error(
        `Cannot delete data categories: ${nonDeletableCategories.join(', ')} due to legal retention requirements`
      );
    }

    const deletionRequest: DataDeletionRequest = {
      id: crypto.randomUUID(),
      user_id: userId,
      requested_at: new Date().toISOString(),
      scheduled_for: this.calculateDeletionDate(retentionPeriod),
      status: 'pending',
      completed_at: null,
      retention_period: retentionPeriod,
      includes: categories,
      backup_created: false,
    };

    logger.info('Data deletion requested', {
      component: 'PrivacyCompliance',
      userId,
      categories,
      retentionPeriod,
      requestId: deletionRequest.id,
    });

    return deletionRequest;
  }

  /**
   * Checks if user needs to reconfirm consent due to policy changes
   */
  needsConsentReconfirmation(userConsents: ConsentRecord[]): boolean {
    const _currentVersion = this.getCurrentConsentVersion();
    const latestUserConsent = userConsents
      .sort((a, b) => new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime())[0];

    if (!latestUserConsent) return true;

    const userVersion = latestUserConsent.version;
    const versionsAfterUser = this.CONSENT_VERSIONS.filter(
      v => this.compareVersions(v.version, userVersion) > 0
    );

    return versionsAfterUser.some(v => v.requires_reconfirmation);
  }

  /**
   * Gets data retention information for transparency
   */
  getDataRetentionInfo(): DataCategory[] {
    return this.DATA_CATEGORIES.map(category => ({
      ...category,
    }));
  }

  /**
   * Generates privacy policy summary for user display
   */
  generatePrivacyPolicySummary(): {
    dataCollected: string[];
    purposes: string[];
    retention: string[];
    rights: string[];
    thirdParties: string[];
  } {
    return {
      dataCollected: this.DATA_CATEGORIES.map(c => c.name),
      purposes: [
        'Provide civic engagement platform services',
        'Improve user experience and platform functionality',
        'Ensure security and prevent fraud',
        'Comply with legal obligations',
        'Communicate important updates and notifications',
      ],
      retention: this.DATA_CATEGORIES.map(c => `${c.name}: ${c.retention_period}`),
      rights: [
        'Access your personal data',
        'Correct inaccurate information',
        'Delete your data (where legally permitted)',
        'Export your data in portable format',
        'Withdraw consent for optional processing',
        'Object to processing based on legitimate interests',
      ],
      thirdParties: this.DATA_CATEGORIES
        .filter(c => c.third_party_sharing)
        .map(c => c.name),
    };
  }

  /**
   * Cookie consent management
   */
  getCookieCategories(): {
    id: string;
    name: string;
    description: string;
    required: boolean;
    cookies: string[];
  }[] {
    return [
      {
        id: 'essential',
        name: 'Essential Cookies',
        description: 'Required for basic site functionality and security',
        required: true,
        cookies: ['session_id', 'csrf_token', 'auth_token'],
      },
      {
        id: 'functional',
        name: 'Functional Cookies',
        description: 'Remember your preferences and settings',
        required: false,
        cookies: ['theme_preference', 'language_setting', 'sidebar_state'],
      },
      {
        id: 'analytics',
        name: 'Analytics Cookies',
        description: 'Help us understand how you use the platform',
        required: false,
        cookies: ['analytics_id', 'session_tracking', 'performance_metrics'],
      },
      {
        id: 'marketing',
        name: 'Marketing Cookies',
        description: 'Used to show relevant content and measure campaign effectiveness',
        required: false,
        cookies: ['marketing_id', 'campaign_tracking'],
      },
    ];
  }

  private getCurrentConsentVersion(): string {
    return this.CONSENT_VERSIONS[this.CONSENT_VERSIONS.length - 1].version;
  }

  private getCurrentIP(): string {
    // In production, this would be provided by the server
    return '0.0.0.0';
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  private calculateDeletionDate(retentionPeriod: string): string {
    const now = new Date();
    let deletionDate: Date;

    switch (retentionPeriod) {
      case 'immediate':
        deletionDate = now;
        break;
      case '7days':
        deletionDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        deletionDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    return deletionDate.toISOString();
  }

  private async processDataExport(exportRequest: DataExportRequest): Promise<void> {
    try {
      // Simulate async processing
      setTimeout(async () => {
        // In production, this would:
        // 1. Collect data from all relevant sources
        // 2. Format according to requested format
        // 3. Create secure download link
        // 4. Send notification to user

        const updatedRequest = {
          ...exportRequest,
          status: 'completed' as const,
          completed_at: new Date().toISOString(),
          download_url: `/api/privacy/exports/${exportRequest.id}/download`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        };

        logger.info('Data export completed', {
          component: 'PrivacyCompliance',
          requestId: exportRequest.id,
          downloadUrl: updatedRequest.download_url,
        });
      }, 5000); // 5 second simulation
    } catch (error) {
      logger.error('Data export failed', {
        component: 'PrivacyCompliance',
        requestId: exportRequest.id,
        error,
      });
    }
  }
}

// Export singleton instance
export const privacyCompliance = new PrivacyComplianceManager();

/**
 * Utility functions for privacy compliance
 */
export const privacyUtils = {
  /**
   * Anonymizes personal data for analytics
   */
  anonymizeData(data: Record<string, any>): Record<string, any> {
    const anonymized = { ...data };
    
    // Remove or hash PII fields
    const piiFields = ['email', 'name', 'first_name', 'last_name', 'phone', 'address'];
    
    for (const field of piiFields) {
      if (anonymized[field]) {
        anonymized[field] = this.hashValue(anonymized[field]);
      }
    }

    // Remove IP addresses
    if (anonymized.ip_address) {
      anonymized.ip_address = this.anonymizeIP(anonymized.ip_address);
    }

    return anonymized;
  },

  /**
   * Hashes a value for anonymization
   */
  hashValue(value: string): string {
    // Simple hash for demo - use proper crypto in production
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash)}`;
  },

  /**
   * Anonymizes IP address by removing last octet
   */
  anonymizeIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return 'anonymized';
  },

  /**
   * Checks if data processing is lawful under GDPR
   */
  isProcessingLawful(
    legalBasis: DataCategory['legal_basis'],
    hasConsent: boolean,
    isNecessaryForContract: boolean,
    isLegalObligation: boolean
  ): boolean {
    switch (legalBasis) {
      case 'consent':
        return hasConsent;
      case 'contract':
        return isNecessaryForContract;
      case 'legal_obligation':
        return isLegalObligation;
      case 'vital_interests':
      case 'public_task':
      case 'legitimate_interests':
        return true; // These require case-by-case assessment
      default:
        return false;
    }
  },
};