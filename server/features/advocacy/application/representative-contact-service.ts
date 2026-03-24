// ============================================================================
// ADVOCACY COORDINATION - Representative Contact Service
// ============================================================================
// Manages communication between citizens and their elected representatives:
// contact discovery, message delivery, response tracking, and rate limiting.
// ============================================================================

import { logger } from '@server/infrastructure/observability';
import { RepresentativeContact } from '@server/types/index';

// ============================================================================
// Configuration
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
// Domain Types
// ============================================================================

export type ContactMethod   = 'email' | 'phone' | 'office_visit' | 'social_media';
export type ContactStatus   = 'pending' | 'sent' | 'delivered' | 'read' | 'responded' | 'failed';
export type ResponseType    = 'acknowledgment' | 'position_statement' | 'meeting_request' | 'form_response';
export type MessageType     = 'support_bill' | 'oppose_bill' | 'request_meeting' | 'ask_question' | 'share_concern';

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
  metadata: {
    retryCount: number;
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
// Internal Types
// ============================================================================

interface CachedRepresentative {
  data: RepresentativeContact;
  cachedAt: Date;
}

interface ContactRateTracker {
  attempts: number[];
}

type LocationCriteria = {
  county?: string;
  constituency?: string;
  committee?: string;
};

// ============================================================================
// Defaults
// ============================================================================

const EMPTY_STATS: ResponseStatistics = {
  totalContacts: 0,
  responseRate: 0,
  averageResponseTimeHours: 0,
  responsesByType: {
    acknowledgment:     0,
    position_statement: 0,
    meeting_request:    0,
    form_response:      0,
  },
};

// ============================================================================
// Service
// ============================================================================

export class RepresentativeContactService {
  private readonly representativeCache = new Map<string, CachedRepresentative>();
  private readonly contactRateLimits   = new Map<string, ContactRateTracker>();

  constructor(private readonly config: RepresentativeConfig) {
    this.validateConfig();
  }

  // --------------------------------------------------------------------------
  // Representative Discovery
  // --------------------------------------------------------------------------

  /**
   * Returns contact info for a representative, using an in-memory cache to
   * reduce redundant external API calls.
   */
  async getRepresentativeContact(representativeId: string): Promise<RepresentativeContact | null> {
    const cached = this.representativeCache.get(representativeId);

    if (cached && this.isCacheValid(cached.cachedAt)) {
      logger.debug({ representativeId, component: 'RepresentativeContactService' },
        'Representative retrieved from cache');
      return cached.data;
    }

    try {
      const representative = await this.fetchRepresentativeData(representativeId);
      if (representative) {
        this.cacheRepresentative(representativeId, representative);
      }
      return representative;
    } catch (error) {
      logger.error(
        { error, representativeId, component: 'RepresentativeContactService' },
        'Failed to get representative contact'
      );
      return null;
    }
  }

  /**
   * Finds representatives by county and/or constituency.
   */
  async findRepresentativesByLocation(
    county?: string,
    constituency?: string,
  ): Promise<RepresentativeContact[]> {
    if (!county && !constituency) {
      logger.warn({ component: 'RepresentativeContactService' },
        'Location search called without parameters');
      return [];
    }
    return this.searchRepresentatives({ county, constituency }, 'location', { county, constituency });
  }

  /**
   * Finds representatives who sit on a given committee. Committee members
   * carry more weight on legislation within that committee's jurisdiction.
   */
  async findRepresentativesByCommittee(committee: string): Promise<RepresentativeContact[]> {
    if (!committee?.trim()) {
      logger.warn({ component: 'RepresentativeContactService' },
        'Committee search called with empty name');
      return [];
    }
    return this.searchRepresentatives({ committee }, 'committee', { committee });
  }

  // --------------------------------------------------------------------------
  // Contact Management
  // --------------------------------------------------------------------------

  /**
   * Sends a message to a representative via the specified channel.
   * Validates input, enforces rate limits, records the attempt, and returns
   * the resulting ContactAttempt regardless of delivery outcome.
   */
  async contactRepresentative(
    actionId: string,
    representativeId: string,
    contactMethod: ContactMethod,
    message: string,
    senderInfo: SenderInfo,
  ): Promise<ContactAttempt> {
    this.validateContactRequest(actionId, representativeId, message, senderInfo);

    const representative = await this.getRepresentativeContact(representativeId);
    if (!representative) {
      throw new Error(`Representative not found: ${representativeId}`);
    }

    if (!this.isContactMethodAvailable(representative, contactMethod)) {
      throw new Error(
        `Contact method "${contactMethod}" is not available for ${representative.name}`,
      );
    }

    if (!this.checkRateLimit(senderInfo.user_id)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const attempt = this.createContactAttempt(actionId, representativeId, contactMethod, message);

    try {
      const delivered = await this.sendMessage(representative, contactMethod, message, senderInfo);
      attempt.status = delivered ? 'sent' : 'failed';
    } catch (error) {
      attempt.status = 'failed';
      logger.error(
        {
          error, actionId, representativeId, contactMethod,
          component: 'RepresentativeContactService',
        },
        'Message delivery failed'
      );
    }

    this.updateRateLimit(senderInfo.user_id);

    logger.info({
      attemptId: attempt.id, actionId, representativeId, contactMethod,
      status: attempt.status, component: 'RepresentativeContactService',
    }, 'Contact attempt completed');

    return attempt;
  }

  /**
   * Records an inbound response from a representative against a prior contact
   * attempt, enabling responsiveness metrics and user-facing history.
   */
  async recordResponse(
    contactAttemptId: string,
    responseContent: string,
    responseType: ResponseType,
  ): Promise<boolean> {
    if (!contactAttemptId || !responseContent?.trim()) {
      logger.warn({
        contactAttemptId, hasContent: Boolean(responseContent),
        component: 'RepresentativeContactService',
      }, 'Invalid response recording attempt');
      return false;
    }

    try {
      // Production: update the contact_attempts table row
      logger.info({
        contactAttemptId, responseType, responseLength: responseContent.length,
        component: 'RepresentativeContactService',
      }, 'Representative response recorded');
      return true;
    } catch (error) {
      logger.error(
        { error, contactAttemptId, component: 'RepresentativeContactService' },
        'Failed to record representative response'
      );
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Message Templates
  // --------------------------------------------------------------------------

  /**
   * Returns a pre-structured template for a given message intent.
   */
  getContactTemplate(messageType: MessageType): MessageTemplate {
    return TEMPLATES[messageType];
  }

  /**
   * Substitutes all placeholders in a template body with resolved values.
   * Logs any placeholders that could not be filled so callers can surface
   * validation errors before sending.
   */
  customizeMessage(
    template: string,
    customizations: Record<string, string>,
    representative: RepresentativeContact,
    senderInfo: SenderInfo,
  ): string {
    const replacements: Record<string, string> = {
      representativeTitle: representative.title,
      representativeName:  representative.name,
      senderName:          senderInfo.name,
      constituency:        senderInfo.constituency ?? 'our area',
      senderContact:       senderInfo.email
        ? `Email: ${senderInfo.email}`
        : senderInfo.phone
          ? `Phone: ${senderInfo.phone}`
          : 'Contact through platform',
      ...customizations,
    };

    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replaceAll(`{${key}}`, value ?? '');
    }

    const unfilled = result.match(/\{[^}]+\}/g);
    if (unfilled) {
      logger.warn({ placeholders: unfilled, component: 'RepresentativeContactService' },
        'Unfilled placeholders remain in message');
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // Analytics & History
  // --------------------------------------------------------------------------

  /**
   * Returns the history of contact attempts for a given representative,
   * optionally scoped to a single user.
   */
  async getContactHistory(
    representativeId: string,
    userId?: string,
  ): Promise<ContactAttempt[]> {
    try {
      // Production: SELECT … FROM contact_attempts WHERE representative_id = ?
      logger.debug({ representativeId, userId, component: 'RepresentativeContactService' },
        'Contact history requested');
      return [];
    } catch (error) {
      logger.error(
        { error, representativeId, userId, component: 'RepresentativeContactService' },
        'Failed to get contact history'
      );
      return [];
    }
  }

  /**
   * Aggregates response metrics for a representative (rate, average time,
   * breakdown by response type).
   */
  async getResponseStatistics(representativeId: string): Promise<ResponseStatistics> {
    try {
      // Production: aggregate from contact_attempts joined on responses
      logger.debug({ representativeId, component: 'RepresentativeContactService' },
        'Response statistics requested');
      return { ...EMPTY_STATS };
    } catch (error) {
      logger.error(
        { error, representativeId, component: 'RepresentativeContactService' },
        'Failed to get response statistics'
      );
      return { ...EMPTY_STATS };
    }
  }

  /**
   * Evicts one or all entries from the representative cache.
   * Useful for testing or forcing a fresh data pull after an import.
   */
  clearCache(representativeId?: string): void {
    if (representativeId) {
      this.representativeCache.delete(representativeId);
      logger.debug({ representativeId, component: 'RepresentativeContactService' },
        'Cache entry cleared');
    } else {
      this.representativeCache.clear();
      logger.debug({ component: 'RepresentativeContactService' }, 'Full cache cleared');
    }
  }

  // --------------------------------------------------------------------------
  // Private – Validation
  // --------------------------------------------------------------------------

  private validateConfig(): void {
    const { contactCacheHours, responseTimeoutSeconds, maxContactsPerAction } = this.config;
    if (contactCacheHours     <= 0) throw new Error('contactCacheHours must be positive');
    if (responseTimeoutSeconds <= 0) throw new Error('responseTimeoutSeconds must be positive');
    if (maxContactsPerAction   <= 0) throw new Error('maxContactsPerAction must be positive');
  }

  private validateContactRequest(
    actionId: string,
    representativeId: string,
    message: string,
    senderInfo: SenderInfo,
  ): void {
    if (!actionId?.trim())          throw new Error('actionId is required');
    if (!representativeId?.trim())  throw new Error('representativeId is required');
    if (!message?.trim())           throw new Error('message content is required');
    if (!senderInfo?.user_id)       throw new Error('senderInfo.user_id is required');
    if (!senderInfo?.name)          throw new Error('senderInfo.name is required');
  }

  // --------------------------------------------------------------------------
  // Private – Cache
  // --------------------------------------------------------------------------

  private isCacheValid(cachedAt: Date): boolean {
    const ageHours = (Date.now() - cachedAt.getTime()) / 3_600_000;
    return ageHours < this.config.contactCacheHours;
  }

  private cacheRepresentative(id: string, data: RepresentativeContact): void {
    this.representativeCache.set(id, { data, cachedAt: new Date() });
  }

  // --------------------------------------------------------------------------
  // Private – Rate Limiting (sliding window)
  // --------------------------------------------------------------------------

  private checkRateLimit(userId: string): boolean {
    const { rateLimit } = this.config;
    if (!rateLimit) return true;

    const tracker = this.contactRateLimits.get(userId);
    if (!tracker) return true;

    const now        = Date.now();
    const hourCutoff = now - 3_600_000;
    const dayCutoff  = now - 86_400_000;

    // Prune entries older than 24 h
    tracker.attempts = tracker.attempts.filter(t => t > dayCutoff);

    const hourly = tracker.attempts.filter(t => t > hourCutoff).length;
    const daily  = tracker.attempts.length;

    return hourly < rateLimit.maxContactsPerHour && daily < rateLimit.maxContactsPerDay;
  }

  private updateRateLimit(userId: string): void {
    if (!this.config.rateLimit) return;
    const tracker = this.contactRateLimits.get(userId) ?? { attempts: [] };
    tracker.attempts.push(Date.now());
    this.contactRateLimits.set(userId, tracker);
  }

  // --------------------------------------------------------------------------
  // Private – Data Fetching
  // --------------------------------------------------------------------------

  private async fetchRepresentativeData(
    representativeId: string,
  ): Promise<RepresentativeContact | null> {
    // Production: integrate with parliamentary / electoral commission APIs.
    const MOCK: Record<string, RepresentativeContact> = {
      'mp-001': {
        id:           'mp-001',
        name:         'Hon. Jane Doe',
        title:        'Member of Parliament',
        constituency: 'Nairobi Central',
        county:       'Nairobi',
        party:        'Democratic Party',
        committees:   ['Budget and Appropriations', 'Justice and Legal Affairs'],
        contactInfo: {
          email:  'jane.doe@parliament.go.ke',
          phone:  '+254-700-000-001',
          office: 'Parliament Buildings, Room 201',
          socialMedia: { twitter: '@JaneDoeMP', facebook: 'JaneDoeOfficial' },
        },
        responsiveness: {
          averageResponseTime:  48,
          responseRate:         0.75,
          preferredContactMethod: 'email',
        },
      },
    };

    return MOCK[representativeId] ?? null;
  }

  private async searchRepresentatives(
    criteria: LocationCriteria,
    context: string,
    logFields: Record<string, unknown>,
  ): Promise<RepresentativeContact[]> {
    try {
      // Production: query with geographic boundary matching / committee joins
      const results: RepresentativeContact[] = [];
      logger.info({ ...logFields, count: results.length, component: 'RepresentativeContactService' },
        `Representatives found by ${context}`);
      return results;
    } catch (error) {
      logger.error(
        { error, ...logFields, component: 'RepresentativeContactService' },
        `Failed to find representatives by ${context}`
      );
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // Private – Contact Attempt
  // --------------------------------------------------------------------------

  private createContactAttempt(
    actionId: string,
    representativeId: string,
    contactMethod: ContactMethod,
    message: string,
  ): ContactAttempt {
    return {
      id:               `contact-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      actionId,
      representativeId,
      contactMethod,
      message,
      attemptedAt:      new Date(),
      status:           'pending',
      metadata:         { retryCount: 0 },
    };
  }

  private isContactMethodAvailable(
    representative: RepresentativeContact,
    method: ContactMethod,
  ): boolean {
    const { contactInfo } = representative;
    switch (method) {
      case 'email':        return Boolean(contactInfo.email);
      case 'phone':        return Boolean(contactInfo.phone);
      case 'office_visit': return Boolean(contactInfo.office);
      case 'social_media': return Boolean(
        contactInfo.socialMedia && Object.keys(contactInfo.socialMedia).length > 0,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Private – Delivery
  // --------------------------------------------------------------------------

  private async sendMessage(
    representative: RepresentativeContact,
    method: ContactMethod,
    message: string,
    senderInfo: SenderInfo,
  ): Promise<boolean> {
    const handlers: Record<ContactMethod, () => Promise<boolean>> = {
      email:        () => this.sendEmail(representative, message, senderInfo),
      phone:        () => this.logPhoneContact(representative, senderInfo),
      office_visit: () => this.scheduleOfficeVisit(representative, senderInfo),
      social_media: () => this.sendSocialMediaMessage(representative, senderInfo),
    };

    return handlers[method]();
  }

  private async sendEmail(
    representative: RepresentativeContact,
    _message: string,
    senderInfo: SenderInfo,
  ): Promise<boolean> {
    // Production: integrate with SendGrid / AWS SES
    logger.info({
      representativeId: representative.id, email: representative.contactInfo.email,
      senderUserId: senderInfo.user_id, component: 'RepresentativeContactService',
    }, 'Email prepared for representative');
    return true;
  }

  private async logPhoneContact(
    representative: RepresentativeContact,
    senderInfo: SenderInfo,
  ): Promise<boolean> {
    // Phone calls are surfaced to the user for manual dialling; automated
    // outbound calling requires carrier-level permissions.
    logger.info({
      representativeId: representative.id, phone: representative.contactInfo.phone,
      senderUserId: senderInfo.user_id, component: 'RepresentativeContactService',
    }, 'Phone contact logged for user action');
    return true;
  }

  private async scheduleOfficeVisit(
    representative: RepresentativeContact,
    senderInfo: SenderInfo,
  ): Promise<boolean> {
    // Production: send appointment request to representative's calendar system
    logger.info({
      representativeId: representative.id, office: representative.contactInfo.office,
      senderUserId: senderInfo.user_id, component: 'RepresentativeContactService',
    }, 'Office visit request created');
    return true;
  }

  private async sendSocialMediaMessage(
    representative: RepresentativeContact,
    senderInfo: SenderInfo,
  ): Promise<boolean> {
    // Production: integrate with Twitter/X API, Facebook Graph API, etc.
    const platforms = Object.keys(representative.contactInfo.socialMedia ?? {});
    logger.info({
      representativeId: representative.id, platforms,
      senderUserId: senderInfo.user_id, component: 'RepresentativeContactService',
    }, 'Social media message prepared');
    return true;
  }
}

// ============================================================================
// Message Templates (module-level constant – avoids re-allocation per call)
// ============================================================================

const TEMPLATES: Record<MessageType, MessageTemplate> = {
  support_bill: {
    subject: 'Support for {billTitle} – Constituent Request',
    bodyTemplate: `Dear {representativeTitle} {representativeName},

I am writing as your constituent from {constituency} to express my strong support for {billTitle}.

{personalReason}

This legislation matters because:
{supportingPoints}

I urge you to support this bill when it comes to a vote, and I would welcome knowing your position on it.

Thank you for your service to our community.

Sincerely,
{senderName}
{senderContact}`,
    customizationFields: ['billTitle', 'personalReason', 'supportingPoints'],
  },

  oppose_bill: {
    subject: 'Concerns about {billTitle} – Constituent Input',
    bodyTemplate: `Dear {representativeTitle} {representativeName},

I am writing as your constituent from {constituency} to share concerns about {billTitle}.

{personalConcern}

My specific concerns include:
{concerningPoints}

I urge you to vote against this bill or pursue amendments that address these issues.

Thank you for considering my views.

Sincerely,
{senderName}
{senderContact}`,
    customizationFields: ['billTitle', 'personalConcern', 'concerningPoints'],
  },

  request_meeting: {
    subject: 'Meeting Request – {topic}',
    bodyTemplate: `Dear {representativeTitle} {representativeName},

I would like to request a meeting to discuss {topic}.

{meetingReason}

I am flexible on timing and available in person or virtually, whichever is more convenient.

Please let me know if you have availability in the coming weeks.

Thank you for your time.

Sincerely,
{senderName}
{senderContact}`,
    customizationFields: ['topic', 'meetingReason'],
  },

  ask_question: {
    subject: 'Constituent Question – {topic}',
    bodyTemplate: `Dear {representativeTitle} {representativeName},

As your constituent from {constituency}, I have a question regarding {topic}.

{question}

I would greatly appreciate your response or clarification on this matter.

Thank you for your service.

Sincerely,
{senderName}
{senderContact}`,
    customizationFields: ['topic', 'question'],
  },

  share_concern: {
    subject: 'Constituent Concern – {concernTopic}',
    bodyTemplate: `Dear {representativeTitle} {representativeName},

I am writing to raise a concern affecting residents of {constituency}.

{concernDescription}

{impactDescription}

I hope you will consider this issue and explore appropriate legislative or policy responses.

Thank you for your attention.

Sincerely,
{senderName}
{senderContact}`,
    customizationFields: ['concernTopic', 'concernDescription', 'impactDescription'],
  },
};
