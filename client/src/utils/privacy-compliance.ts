/**
 * Privacy Compliance Utilities
 *
 * Implements GDPR/CCPA compliance helpers for data protection
 */

import { logger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: string;
  version: string;
}

interface DataProcessingRecord {
  userId: string;
  dataType: string;
  purpose: string;
  timestamp: string;
  lawfulBasis: string;
}

// ============================================================================
// PRIVACY UTILITIES
// ============================================================================

export const privacyUtils = {
  /**
   * Hashes a value for anonymization
   */
  hashValue(value: string): string {
    // Simple hash for demo - in production use crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`;
  },

  /**
   * Checks if data retention period has expired
   */
  isRetentionExpired(timestamp: string, retentionDays: number): boolean {
    const recordDate = new Date(timestamp);
    const expiryDate = new Date(recordDate.getTime() + retentionDays * 24 * 60 * 60 * 1000);
    return new Date() > expiryDate;
  },

  /**
   * Sanitizes personal data from objects
   */
  sanitizePersonalData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = ['email', 'name', 'phone', 'address', 'ip', 'ssn'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  },
};

// ============================================================================
// PRIVACY COMPLIANCE MANAGER
// ============================================================================

class PrivacyComplianceManager {
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private processingRecords: Map<string, DataProcessingRecord[]> = new Map();

  /**
   * Records user consent for a specific purpose
   */
  recordConsent(userId: string, consentType: string, granted: boolean): void {
    const record: ConsentRecord = {
      userId,
      consentType,
      granted,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };

    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(record);
    this.consentRecords.set(userId, userConsents);

    logger.info('Consent recorded', {
      component: 'PrivacyComplianceManager',
      userId,
      consentType,
      granted,
    });
  }

  /**
   * Checks if user has given consent for a specific purpose
   */
  hasConsent(userId: string, consentType: string): boolean {
    const userConsents = this.consentRecords.get(userId) || [];
    const latestConsent = userConsents
      .filter(c => c.consentType === consentType)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    return latestConsent?.granted || false;
  }

  /**
   * Records data processing activity
   */
  recordDataProcessing(
    userId: string,
    dataType: string,
    purpose: string,
    lawfulBasis: string
  ): void {
    const record: DataProcessingRecord = {
      userId,
      dataType,
      purpose,
      timestamp: new Date().toISOString(),
      lawfulBasis,
    };

    const userProcessing = this.processingRecords.get(userId) || [];
    userProcessing.push(record);
    this.processingRecords.set(userId, userProcessing);

    logger.debug('Data processing recorded', {
      component: 'PrivacyComplianceManager',
      userId,
      dataType,
      purpose,
    });
  }

  /**
   * Gets all consent records for a user
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }

  /**
   * Gets all processing records for a user
   */
  getUserProcessingRecords(userId: string): DataProcessingRecord[] {
    return this.processingRecords.get(userId) || [];
  }

  /**
   * Deletes all records for a user (right to erasure)
   */
  deleteUserData(userId: string): void {
    this.consentRecords.delete(userId);
    this.processingRecords.delete(userId);

    logger.info('User data deleted from privacy compliance records', {
      component: 'PrivacyComplianceManager',
      userId,
    });
  }

  /**
   * Exports all data for a user (right to data portability)
   */
  exportUserData(userId: string): {
    consents: ConsentRecord[];
    processing: DataProcessingRecord[];
  } {
    return {
      consents: this.getUserConsents(userId),
      processing: this.getUserProcessingRecords(userId),
    };
  }
}

// Export singleton instance
export const privacyCompliance = new PrivacyComplianceManager();
