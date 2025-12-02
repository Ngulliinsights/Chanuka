// ============================================================================
// ADVOCACY COORDINATION - Representative Contact Service
// ============================================================================
// This service manages communication between citizens and their elected
// representatives, providing a structured way to contact officials, track
// responses, and maintain contact history.
// ============================================================================

import { RepresentativeContact } from '@server/types/index.ts';
import { logger  } from '@shared/core';

// ============================================================================
// Configuration Types
// ============================================================================

export interface RepresentativeConfig {
  contactCacheHours: number;
  responseTimeoutSeconds: number;
  maxContactsPerAction: number;
  maxRetryAttempts?: number;
  rateLimit?: {
    maxContactsPerHour: number;
    maxContactsPerDay: number;
  };
}

// ============================================================================
// Core Types
// ============================================================================

export type ContactMethod = 'email' | 'phone' | 'office_visit' | 'social_media';
export type ContactStatus = 'sent' | 'delivered' | 'read' | 'responded' | 'failed' | 'pending';
export type ResponseType = 'acknowledgment' | 'position_statement' | 'meeting_request' | 'form_response';
export type MessageType = 'support_bill' | 'oppose_bill' | 'request_meeting' | 'ask_question' | 'share_concern';

export interface ContactAttempt {
  id: string;
  actionId: string;
  representativeId: string;
  contactMethod: ContactMethod;
  message: string;
  attemptedAt: Date;
  status: ContactStatus;
  response?: {
    receivedAt: Date;
    content: string;
    responseType: ResponseType;
  };
  metadata?: {
    retryCount?: number;
    lastRetryAt?: Date;
    deliveryConfirmation?: string;
  };
}

export interface SenderInfo {
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  constituency?: string;
  county?: string;
}

export interface MessageTemplate {
  subject: string;
  bodyTemplate: string;
  customizationFields: string[];
}

export interface ResponseStatistics {
  totalContacts: number;
  responseRate: number;
  averageResponseTimeHours: number;
  responsesByType: Record<ResponseType, number>;
  lastContactDate?: Date;
  lastResponseDate?: Date;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class RepresentativeContactService {
  private representativeCache = new Map<string, CachedRepresentative>();
  private contactRateLimits = new Map<string, ContactRateTracker>();

  constructor(private config: RepresentativeConfig) {
    this.validateConfig();
  }

  // ==========================================================================
  // Public API - Representative Discovery
  // ==========================================================================

  /**
   * Retrieves contact information for a specific representative.
   * This method implements a caching strategy to reduce external API calls
   * and improve response time for frequently accessed representatives.
   */
  async getRepresentativeContact(representativeId: string): Promise<RepresentativeContact | null> {
    try {
      const cached = this.representativeCache.get(representativeId);
      
      if (cached && this.isCacheValid(cached.cachedAt)) {
        logger.debug('Representative retrieved from cache', { 
          representativeId,
          component: 'RepresentativeContactService' 
        });
        return cached.data;
      }

      const representative = await this.fetchRepresentativeData(representativeId);
      
      if (representative) {
        this.cacheRepresentative(representativeId, representative);
      }

      return representative;
    } catch (error) {
      logger.error('Failed to get representative contact', error, { 
        representativeId,
        component: 'RepresentativeContactService' 
      });
      return null;
    }
  }

  /**
   * Finds representatives based on geographic location.
   * This is essential for helping users identify their elected officials
   * based on where they live.
   */
  async findRepresentativesByLocation(
    county?: string,
    constituency?: string
  ): Promise<RepresentativeContact[]> {
    if (!county && !constituency) {
      logger.warn('Location search called without parameters', {
        component: 'RepresentativeContactService'
      });
      return [];
    }

    try {
      const representatives = await this.searchRepresentatives({ county, constituency });
      
      logger.info('Representatives found by location', { 
        county,
        constituency,
        count: representatives.length,
        component: 'RepresentativeContactService' 
      });

      return representatives;
    } catch (error) {
      logger.error('Failed to find representatives by location', error, { 
        county,
        constituency,
        component: 'RepresentativeContactService' 
      });
      return [];
    }
  }

  /**
   * Finds representatives serving on a specific committee.
   * This is useful for targeted advocacy on issues under that committee's
   * jurisdiction, as committee members have more influence on related bills.
   */
  async findRepresentativesByCommittee(committee: string): Promise<RepresentativeContact[]> {
    if (!committee?.trim()) {
      logger.warn('Committee search called with empty committee name', {
        component: 'RepresentativeContactService'
      });
      return [];
    }

    try {
      const representatives = await this.searchRepresentatives({ committee });
      
      logger.info('Representatives found by committee', { 
        committee,
        count: representatives.length,
        component: 'RepresentativeContactService' 
      });

      return representatives;
    } catch (error) {
      logger.error('Failed to find representatives by committee', error, { 
        committee,
        component: 'RepresentativeContactService' 
      });
      return [];
    }
  }

  // ==========================================================================
  // Public API - Contact Management
  // ==========================================================================

  /**
   * Initiates contact with a representative through the specified channel.
   * This method handles validation, rate limiting, and delivery tracking
   * to ensure messages are sent appropriately and their status is recorded.
   */
  async contactRepresentative(
    actionId: string,
    representativeId: string,
    contactMethod: ContactMethod,
    message: string,
    senderInfo: SenderInfo
  ): Promise<ContactAttempt> {
    this.validateContactRequest(actionId, representativeId, message, senderInfo);

    try {
      const representative = await this.getRepresentativeContact(representativeId);
      if (!representative) {
        throw new Error(`Representative ${representativeId} not found`);
      }

      if (!this.isContactMethodAvailable(representative, contactMethod)) {
        throw new Error(`Contact method ${contactMethod} not available for representative ${representative.name}`);
      }

      // Check rate limits to prevent spam
      if (!this.checkRateLimit(senderInfo.user_id)) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      const attempt = this.createContactAttempt(
        actionId,
        representativeId,
        contactMethod,
        message
      );

      const success = await this.sendMessage(representative, contactMethod, message, senderInfo);
      
      attempt.status = success ? 'sent' : 'failed';

      this.updateRateLimit(senderInfo.user_id);

      logger.info('Representative contact attempted', { 
        attemptId: attempt.id,
        actionId,
        representativeId,
        contactMethod,
        status: attempt.status,
        component: 'RepresentativeContactService' 
      });

      return attempt;
    } catch (error) {
      logger.error('Failed to contact representative', error, { 
        actionId,
        representativeId,
        contactMethod,
        component: 'RepresentativeContactService' 
      });
      throw error;
    }
  }

  /**
   * Records a response received from a representative.
   * Tracking responses helps users see which representatives are engaged
   * and provides data for responsiveness metrics.
   */
  async recordResponse(
    contactAttemptId: string,
    responseContent: string,
    responseType: ResponseType
  ): Promise<boolean> {
    if (!contactAttemptId || !responseContent?.trim()) {
      logger.warn('Invalid response recording attempt', {
        contactAttemptId,
        hasContent: !!responseContent,
        component: 'RepresentativeContactService'
      });
      return false;
    }

    try {
      // In production, this would update the database record
      logger.info('Representative response recorded', { 
        contactAttemptId,
        responseType,
        responseLength: responseContent.length,
        component: 'RepresentativeContactService' 
      });

      return true;
    } catch (error) {
      logger.error('Failed to record representative response', error, { 
        contactAttemptId,
        component: 'RepresentativeContactService' 
      });
      return false;
    }
  }

  // ==========================================================================
  // Public API - Message Templates
  // ==========================================================================

  /**
   * Retrieves a pre-structured message template for common communication types.
   * Templates help users craft effective messages by providing appropriate
   * structure and ensuring key information is included.
   */
  getContactTemplates(messageType: MessageType): MessageTemplate {
    const templates: Record<MessageType, MessageTemplate> = {
      support_bill: {
        subject: 'Support for {billTitle} - Constituent Request',
        bodyTemplate: `Dear {representativeTitle} {representativeName},

I am writing as your constituent from {constituency} to express my strong support for {billTitle}.

{personalReason}

This legislation is important because:
{supportingPoints}

I urge you to support this bill when it comes to a vote. Please let me know your position on this important issue.

Thank you for your service to our community.

Sincerely,
{senderName}
{senderContact}`,
        customizationFields: ['billTitle', 'personalReason', 'supportingPoints']
      },
      oppose_bill: {
        subject: 'Concerns about {billTitle} - Constituent Input',
        bodyTemplate: `Dear {representativeTitle} {representativeName},

I am writing as your constituent from {constituency} to express my concerns about {billTitle}.

{personalConcern}

My specific concerns include:
{concerningPoints}

I urge you to vote against this bill or work to address these concerns through amendments.

Thank you for considering my views.

Sincerely,
{senderName}
{senderContact}`,
        customizationFields: ['billTitle', 'personalConcern', 'concerningPoints']
      },
      request_meeting: {
        subject: 'Meeting Request - {topic}',
        bodyTemplate: `Dear {representativeTitle} {representativeName},

I am writing to request a meeting to discuss {topic}.

{meetingReason}

I would appreciate the opportunity to share my perspective and hear your views on this important issue. I am flexible with timing and can meet at your office or virtually.

Please let me know if you have availability in the coming weeks.

Thank you for your time and consideration.

Sincerely,
{senderName}
{senderContact}`,
        customizationFields: ['topic', 'meetingReason']
      },
      ask_question: {
        subject: 'Question from Constituent - {topic}',
        bodyTemplate: `Dear {representativeTitle} {representativeName},

I hope this message finds you well. As your constituent from {constituency}, I have a question about {topic}.

{question}

I would greatly appreciate your response or clarification on this matter.

Thank you for your service and for taking the time to address constituent concerns.

Sincerely,
{senderName}
{senderContact}`,
        customizationFields: ['topic', 'question']
      },
      share_concern: {
        subject: 'Constituent Concern - {concernTopic}',
        bodyTemplate: `Dear {representativeTitle} {representativeName},

I am writing to share a concern that affects me and others in {constituency}.

{concernDescription}

{impactDescription}

I hope you will consider this issue and work to address it through appropriate legislative or policy measures.

Thank you for your attention to this matter.

Sincerely,
{senderName}
{senderContact}`,
        customizationFields: ['concernTopic', 'concernDescription', 'impactDescription']
      }
    };

    return templates[messageType];
  }

  /**
   * Fills in a message template with user-specific content.
   * This method handles placeholder replacement and ensures all required
   * fields are populated before the message is sent.
   */
  customizeMessage(
    template: string,
    customizations: Record<string, string>,
    representative: RepresentativeContact,
    senderInfo: SenderInfo
  ): string {
    let customized = template;

    // Replace representative information
    customized = customized.replace(/{representativeTitle}/g, representative.title);
    customized = customized.replace(/{representativeName}/g, representative.name);

    // Replace sender information
    customized = customized.replace(/{senderName}/g, senderInfo.name);
    customized = customized.replace(/{constituency}/g, senderInfo.constituency || 'our area');
    
    const contactInfo = senderInfo.email 
      ? `Email: ${senderInfo.email}` 
      : (senderInfo.phone ? `Phone: ${senderInfo.phone}` : 'Contact through platform');
    customized = customized.replace(/{senderContact}/g, contactInfo);

    // Replace custom fields provided by the user
    for (const [key, value] of Object.entries(customizations)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      customized = customized.replace(placeholder, value || '');
    }

    // Warn about any remaining unfilled placeholders
    const remainingPlaceholders = customized.match(/\{[^}]+\}/g);
    if (remainingPlaceholders) {
      logger.warn('Unfilled placeholders in message', {
        placeholders: remainingPlaceholders,
        component: 'RepresentativeContactService'
      });
    }

    return customized;
  }

  // ==========================================================================
  // Public API - Analytics and History
  // ==========================================================================

  /**
   * Retrieves the history of contact attempts with a representative.
   * This helps users track their engagement and avoid duplicate messages.
   */
  async getContactHistory(
    representativeId: string,
    user_id?: string
  ): Promise<ContactAttempt[]> {
    try {
      // In production, this would query the database with appropriate filters
      logger.debug('Contact history requested', {
        representativeId,
        user_id,
        component: 'RepresentativeContactService'
      });
      
      return [];
    } catch (error) {
      logger.error('Failed to get contact history', error, { 
        representativeId,
        user_id,
        component: 'RepresentativeContactService' 
      });
      return [];
    }
  }

  /**
   * Calculates response statistics for a representative.
   * These metrics help users understand how responsive a representative is
   * and which contact methods are most effective.
   */
  async getResponseStatistics(representativeId: string): Promise<ResponseStatistics> {
    try {
      // In production, this would aggregate data from contact attempts
      const stats: ResponseStatistics = {
        totalContacts: 0,
        responseRate: 0,
        averageResponseTimeHours: 0,
        responsesByType: {
          acknowledgment: 0,
          position_statement: 0,
          meeting_request: 0,
          form_response: 0
        }
      };

      logger.debug('Response statistics calculated', {
        representativeId,
        stats,
        component: 'RepresentativeContactService'
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get response statistics', error, { 
        representativeId,
        component: 'RepresentativeContactService' 
      });
      
      return {
        totalContacts: 0,
        responseRate: 0,
        averageResponseTimeHours: 0,
        responsesByType: {
          acknowledgment: 0,
          position_statement: 0,
          meeting_request: 0,
          form_response: 0
        }
      };
    }
  }

  /**
   * Clears cached representative data.
   * This is useful for testing or when you need to force refresh of data.
   */
  clearCache(representativeId?: string): void {
    if (representativeId) {
      this.representativeCache.delete(representativeId);
      logger.debug('Cache cleared for representative', { representativeId });
    } else {
      this.representativeCache.clear();
      logger.debug('All representative cache cleared');
    }
  }

  // ==========================================================================
  // Private Helper Methods - Validation
  // ==========================================================================

  private validateConfig(): void {
    if (this.config.contactCacheHours <= 0) {
      throw new Error('contactCacheHours must be positive');
    }
    if (this.config.responseTimeoutSeconds <= 0) {
      throw new Error('responseTimeoutSeconds must be positive');
    }
    if (this.config.maxContactsPerAction <= 0) {
      throw new Error('maxContactsPerAction must be positive');
    }
  }

  private validateContactRequest(
    actionId: string,
    representativeId: string,
    message: string,
    senderInfo: SenderInfo
  ): void {
    if (!actionId?.trim()) {
      throw new Error('Action ID is required');
    }
    if (!representativeId?.trim()) {
      throw new Error('Representative ID is required');
    }
    if (!message?.trim()) {
      throw new Error('Message content is required');
    }
    if (!senderInfo?.user_id || !senderInfo?.name) {
      throw new Error('Sender information (user_id and name) is required');
    }
  }

  // ==========================================================================
  // Private Helper Methods - Caching
  // ==========================================================================

  private isCacheValid(cachedAt: Date): boolean {
    const cacheAgeHours = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60);
    return cacheAgeHours < this.config.contactCacheHours;
  }

  private cacheRepresentative(id: string, data: RepresentativeContact): void {
    this.representativeCache.set(id, {
      data,
      cachedAt: new Date()
    });
  }

  // ==========================================================================
  // Private Helper Methods - Rate Limiting
  // ==========================================================================

  private checkRateLimit(user_id: string): boolean {
    if (!this.config.rateLimit) {
      return true;
    }

    const tracker = this.contactRateLimits.get(user_id);
    if (!tracker) {
      return true;
    }

    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    tracker.attempts = tracker.attempts.filter(time => time > oneDayAgo);

    const hourlyAttempts = tracker.attempts.filter(time => time > oneHourAgo).length;
    const dailyAttempts = tracker.attempts.length;

    return hourlyAttempts < this.config.rateLimit.maxContactsPerHour &&
           dailyAttempts < this.config.rateLimit.maxContactsPerDay;
  }

  private updateRateLimit(user_id: string): void {
    if (!this.config.rateLimit) {
      return;
    }

    const tracker = this.contactRateLimits.get(user_id) || { attempts: [] };
    tracker.attempts.push(Date.now());
    this.contactRateLimits.set(user_id, tracker);
  }

  // ==========================================================================
  // Private Helper Methods - Data Fetching
  // ==========================================================================

  private async fetchRepresentativeData(representativeId: string): Promise<RepresentativeContact | null> {
    // In production, this would integrate with government APIs, parliamentary
    // databases, or electoral commission data sources. For demonstration,
    // we provide mock data that shows the expected structure.

    const mockRepresentatives: Record<string, RepresentativeContact> = {
      'mp-001': {
        id: 'mp-001',
        name: 'Hon. Jane Doe',
        title: 'Member of Parliament',
        constituency: 'Nairobi Central',
        county: 'Nairobi',
        party: 'Democratic Party',
        committees: ['Budget and Appropriations', 'Justice and Legal Affairs'],
        contactInfo: {
          email: 'jane.doe@parliament.go.ke',
          phone: '+254-700-000-001',
          office: 'Parliament Buildings, Room 201',
          socialMedia: {
            twitter: '@JaneDoeMP',
            facebook: 'JaneDoeOfficial'
          }
        },
        responsiveness: {
          averageResponseTime: 48,
          responseRate: 0.75,
          preferredContactMethod: 'email'
        }
      }
    };

    return mockRepresentatives[representativeId] || null;
  }

  private async searchRepresentatives(criteria: {
    county?: string;
    constituency?: string;
    committee?: string;
  }): Promise<RepresentativeContact[]> {
    // In production, this would perform database queries with geographic
    // boundary matching and committee membership filtering
    return [];
  }

  // ==========================================================================
  // Private Helper Methods - Contact Attempt Management
  // ==========================================================================

  private createContactAttempt(
    actionId: string,
    representativeId: string,
    contactMethod: ContactMethod,
    message: string
  ): ContactAttempt {
    return {
      id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      actionId,
      representativeId,
      contactMethod,
      message,
      attemptedAt: new Date(),
      status: 'pending',
      metadata: {
        retryCount: 0
      }
    };
  }

  private isContactMethodAvailable(
    representative: RepresentativeContact,
    method: ContactMethod
  ): boolean {
    switch (method) {
      case 'email':
        return !!representative.contactInfo.email;
      case 'phone':
        return !!representative.contactInfo.phone;
      case 'office_visit':
        return !!representative.contactInfo.office;
      case 'social_media':
        return !!representative.contactInfo.socialMedia && 
               Object.keys(representative.contactInfo.socialMedia).length > 0;
      default:
        return false;
    }
  }

  // ==========================================================================
  // Private Helper Methods - Message Delivery
  // ==========================================================================

  private async sendMessage(
    representative: RepresentativeContact,
    method: ContactMethod,
    message: string,
    senderInfo: SenderInfo
  ): Promise<boolean> {
    try {
      switch (method) {
        case 'email':
          return await this.sendEmail(representative, message, senderInfo);
        case 'phone':
          return await this.logPhoneContact(representative, message, senderInfo);
        case 'office_visit':
          return await this.scheduleOfficeVisit(representative, message, senderInfo);
        case 'social_media':
          return await this.sendSocialMediaMessage(representative, message, senderInfo);
        default:
          logger.warn('Unknown contact method', { method });
          return false;
      }
    } catch (error) {
      logger.error('Failed to send message', error, { 
        representativeId: representative.id,
        method,
        component: 'RepresentativeContactService' 
      });
      return false;
    }
  }

  private async sendEmail(
    representative: RepresentativeContact,
    message: string,
    senderInfo: SenderInfo
  ): Promise<boolean> {
    // In production, this would integrate with email service providers
    // like SendGrid, AWS SES, or similar services
    logger.info('Email prepared for representative', { 
      representativeId: representative.id,
      email: representative.contactInfo.email,
      senderUserId: senderInfo.user_id,
      component: 'RepresentativeContactService' 
    });
    return true;
  }

  private async logPhoneContact(
    representative: RepresentativeContact,
    message: string,
    senderInfo: SenderInfo
  ): Promise<boolean> {
    // Phone contacts are logged for users to make the call themselves,
    // as automated phone calls would require additional permissions
    logger.info('Phone contact logged for user action', { 
      representativeId: representative.id,
      phone: representative.contactInfo.phone,
      senderUserId: senderInfo.user_id,
      component: 'RepresentativeContactService' 
    });
    return true;
  }

  private async scheduleOfficeVisit(
    representative: RepresentativeContact,
    message: string,
    senderInfo: SenderInfo
  ): Promise<boolean> {
    // Office visits require appointment scheduling, which would typically
    // integrate with calendar systems or send requests to staff
    logger.info('Office visit request created', { 
      representativeId: representative.id,
      office: representative.contactInfo.office,
      senderUserId: senderInfo.user_id,
      component: 'RepresentativeContactService' 
    });
    return true;
  }

  private async sendSocialMediaMessage(
    representative: RepresentativeContact,
    message: string,
    senderInfo: SenderInfo
  ): Promise<boolean> {
    // Social media contacts would integrate with platform APIs
    // (Twitter API, Facebook Graph API, etc.)
    const platforms = Object.keys(representative.contactInfo.socialMedia || {});
    logger.info('Social media message prepared', { 
      representativeId: representative.id,
      platforms,
      senderUserId: senderInfo.user_id,
      component: 'RepresentativeContactService' 
    });
    return true;
  }
}

// ============================================================================
// Supporting Types
// ============================================================================

interface CachedRepresentative {
  data: RepresentativeContact;
  cachedAt: Date;
}

interface ContactRateTracker {
  attempts: number[];
}
