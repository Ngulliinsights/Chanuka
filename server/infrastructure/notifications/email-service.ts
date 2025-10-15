// email-service.optimized.ts
// Production-grade email service with enhanced security, type safety, and performance

// ---------- Enhanced Types ----------
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger';

// ---------- Security Utilities ----------
const escapeHtml = (unsafe: string): string => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const validateEmailAddress = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

const toArray = (x: string | string[]): string[] => (Array.isArray(x) ? x : [x]);

// ---------- Core Types ----------
export type EmailProvider = 'mock' | 'smtp' | 'sendgrid' | 'gmail' | 'outlook';

export interface EmailServiceConfig {
  provider: EmailProvider;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail?: string;
  fromName?: string;
  settings?: {
    maxRetries?: number;
    retryDelay?: number;
    batchSize?: number;
    maxQueueSize?: number;
  };
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  fallbackUsed?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------- SMTP Transport Types ----------
interface SMTPTransporter {
  sendMail(options: SMTPMailOptions): Promise<SMTPSendResult>;
  verify(): Promise<boolean>;
}

interface SMTPMailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface SMTPSendResult {
  messageId: string;
  response?: string;
  accepted?: string[];
  rejected?: string[];
}

// ---------- Legislative Types ----------
export interface LegislativeInquiry {
  id: string;
  billId: string;
  billTitle: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  message: string;
  timestamp: Date;
  status: 'new' | 'responded';
  priority: 'low' | 'medium' | 'high';
}

export interface EmailInboxMessage {
  id: string;
  threadId?: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  timestamp: Date;
  isRead?: boolean;
  isImportant?: boolean;
  labels?: string[];
}

export interface InquiryClassificationResult {
  inquiryType: 'bill_inquiry' | 'amendment_request' | 'complaint' | 'general_inquiry';
  priority: 'low' | 'medium' | 'high';
  extractedData: {
    senderPhone?: string;
    billNumber?: string;
  };
  confidence: number;
}

// ---------- Inquiry Classification Service ----------
export class InquiryClassificationService {
  static classify(message: EmailInboxMessage): InquiryClassificationResult {
    const subject = message.subject.toLowerCase();
    const body = message.body.toLowerCase();
    const content = `${subject} ${body}`;

    let inquiryType: InquiryClassificationResult['inquiryType'] = 'general_inquiry';
    let priority: InquiryClassificationResult['priority'] = 'medium';
    let confidence = 0.5;

    // Classify inquiry type based on keywords
    if (/\b(bill|legislation|track|follow)\b/.test(content)) {
      inquiryType = 'bill_inquiry';
      confidence = 0.8;
    } else if (/\b(amendment|change|modify|propose)\b/.test(content)) {
      inquiryType = 'amendment_request';
      confidence = 0.9;
    } else if (/\b(complaint|problem|issue|discrepanc)/.test(content)) {
      inquiryType = 'complaint';
      confidence = 0.7;
    }

    // Determine priority
    if (/\b(urgent|asap|immediately|critical)\b/.test(content)) {
      priority = 'high';
    } else if (/\b(when convenient|no rush|whenever)\b/.test(content)) {
      priority = 'low';
    }

    // Extract structured data
    const extractedData: InquiryClassificationResult['extractedData'] = {};
    
    const phoneRegex = /\+254\s?\d{9}|\b\d{10}\b/;
    const phoneMatch = phoneRegex.exec(message.body);
    if (phoneMatch) {
      extractedData.senderPhone = phoneMatch[0].replace(/\s/g, '');
    }

    const billRegex = /Bill\s?(\d+|[A-Z]\d+)/i;
    const billMatch = billRegex.exec(message.body);
    if (billMatch?.[1]) {
      extractedData.billNumber = billMatch[1];
    }

    return { inquiryType, priority, extractedData, confidence };
  }
}

// ---------- Email Service Interface ----------
export interface EmailService {
  initialize(): Promise<void>;
  getInboxMessages(limit?: number): Promise<EmailInboxMessage[]>;
  sendEmail(message: EmailMessage): Promise<EmailResult>;
  markAsRead(messageId: string): Promise<void>;
  archiveMessage(messageId: string): Promise<void>;
  extractLegislativeInquiries?(messages: EmailInboxMessage[]): LegislativeInquiry[];
  sendQueuedEmails?(): Promise<void>;
  getFallbackEmailCount?(): number;
  isInFallbackMode?(): boolean;
  retryInitialization?(): Promise<boolean>;
  getStatus?(): Promise<{ connected: boolean; lastSync?: Date; error?: string }>;
}

// ---------- Base Email Service with Validation ----------
abstract class BaseEmailService implements EmailService {
  protected readonly MAX_QUEUE_SIZE = 1000;
  
  abstract initialize(): Promise<void>;
  abstract getInboxMessages(limit?: number): Promise<EmailInboxMessage[]>;
  abstract sendEmail(message: EmailMessage): Promise<EmailResult>;
  abstract markAsRead(messageId: string): Promise<void>;
  abstract archiveMessage(messageId: string): Promise<void>;

  protected validateEmailMessage(message: EmailMessage): ValidationResult {
    const errors: string[] = [];
    
    const recipients = toArray(message.to);
    if (recipients.length === 0) {
      errors.push('At least one recipient is required');
    }
    
    recipients.forEach(email => {
      if (!validateEmailAddress(email)) {
        errors.push(`Invalid email address: ${email}`);
      }
    });
    
    if (!message.subject?.trim()) {
      errors.push('Subject is required');
    }
    
    if (!message.html?.trim() && !message.text?.trim()) {
      errors.push('Email body (html or text) is required');
    }
    
    return { valid: errors.length === 0, errors };
  }

  protected extractNameFromEmail(email: string): string {
    const [local] = email.split('@');
    if (!local) return 'Unknown User';
    return local
      .split(/[._-]/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  protected extractBillTitle(subject: string): string {
    const match = /(?:bill|legislative|inquiry).*?-\s*(.+)/i.exec(subject);
    return match?.[1]?.trim() ?? 'Unknown Bill';
  }
}

// ---------- Mock Email Service ----------
export class MockEmailService extends BaseEmailService {
  private mockMessages: EmailInboxMessage[] = [];
  private fallbackEmails: EmailMessage[] = [];
  private readonly SUPPORT_EMAIL = 'support@Chanuka.gov';

  async initialize(): Promise<void> {
    const now = Date.now();
    this.mockMessages = [
      {
        id: '1',
        threadId: 'thread_1',
        from: 'john.kamau@email.com',
        to: [this.SUPPORT_EMAIL],
        subject: 'Bill Inquiry - Education Reform Bill',
        body: "Hi, I'm very interested in tracking this bill. Could you provide updates on its progress? I'm particularly concerned about the education sector.",
        timestamp: new Date(now - 2 * 60 * 60 * 1000),
        isRead: false,
        isImportant: false,
        labels: ['inquiry', 'bill_inquiry'],
      },
      {
        id: '2',
        threadId: 'thread_2',
        from: 'sarah.w@email.com',
        to: [this.SUPPORT_EMAIL],
        subject: 'Amendment Request - Healthcare Bill',
        body: 'I would like to propose an amendment to this bill regarding mental health services. Please advise on the process.',
        timestamp: new Date(now - 5 * 60 * 60 * 1000),
        isRead: true,
        isImportant: false,
        labels: ['inquiry', 'amendment_request'],
      },
      {
        id: '3',
        threadId: 'thread_3',
        from: 'm.ochieng@email.com',
        to: [this.SUPPORT_EMAIL],
        subject: 'Legislative Inquiry - Infrastructure Development Act',
        body: "I'm interested in following this infrastructure bill. When is the next committee hearing?",
        timestamp: new Date(now - 24 * 60 * 60 * 1000),
        isRead: true,
        isImportant: false,
        labels: ['inquiry', 'legislative', 'replied'],
      },
      {
        id: '4',
        threadId: 'thread_4',
        from: 'grace.muthoni@email.com',
        to: [this.SUPPORT_EMAIL],
        subject: 'Complaint - Data Accuracy Issues',
        body: "I noticed discrepancies in the bill tracking data. Could you verify the current status?",
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
        isRead: true,
        isImportant: false,
        labels: ['inquiry', 'complaint'],
      },
    ];
    logger.info('MockEmailService initialized with seeded inbox');
  }

  async getInboxMessages(limit = 50): Promise<EmailInboxMessage[]> {
    return this.mockMessages.slice(0, limit);
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    // Validate before sending
    const validation = this.validateEmailMessage(message);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // Simulate network latency
    await new Promise(r => setTimeout(r, 200));

    // Prevent queue overflow
    if (this.fallbackEmails.length >= this.MAX_QUEUE_SIZE) {
      logger.warn(`Mock fallback queue full, dropping oldest email`);
      this.fallbackEmails.shift();
    }

    this.fallbackEmails.push(message);
    
    logger.info('📧 MOCK EMAIL SENT', {
      to: message.to,
      subject: message.subject,
      preview: (message.text ?? stripHtml(message.html)).slice(0, 160),
    });

    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fallbackUsed: true,
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    const msg = this.mockMessages.find(m => m.id === messageId);
    if (msg) {
      msg.isRead = true;
      logger.debug(`Marked message ${messageId} as read`);
    }
  }

  async archiveMessage(messageId: string): Promise<void> {
    const msg = this.mockMessages.find(m => m.id === messageId);
    if (msg) {
      msg.labels = [...(msg.labels ?? []), 'archived'];
      logger.debug(`Archived message ${messageId}`);
    }
  }

  extractLegislativeInquiries(messages: EmailInboxMessage[]): LegislativeInquiry[] {
    return messages.map(msg => {
      const classification = InquiryClassificationService.classify(msg);
      const userName = this.extractNameFromEmail(msg.from);
      
      return {
        id: `inquiry_${msg.id}`,
        billId: classification.extractedData.billNumber ?? 'unknown',
        billTitle: this.extractBillTitle(msg.subject),
        userName,
        userEmail: msg.from,
        userPhone: classification.extractedData.senderPhone ?? '',
        message: msg.body,
        timestamp: msg.timestamp,
        status: msg.labels?.includes('replied') ? 'responded' : 'new',
        priority: classification.priority,
      };
    });
  }

  getFallbackEmailCount(): number {
    return this.fallbackEmails.length;
  }

  isInFallbackMode(): boolean {
    return true;
  }

  async getStatus(): Promise<{ connected: boolean; lastSync?: Date; error?: string }> {
    return {
      connected: true,
      lastSync: new Date(),
      error: undefined,
    };
  }
}

// ---------- SMTP Service with Enhanced Error Handling ----------
export class SMTPService extends BaseEmailService {
  private config: Required<Pick<EmailServiceConfig,
    'smtpHost' | 'smtpPort' | 'smtpSecure' | 'smtpUser' | 'smtpPassword' | 'fromEmail' | 'fromName'>> & {
      settings: Required<NonNullable<EmailServiceConfig['settings']>>;
    };

  private transporter: SMTPTransporter | null = null;
  private fallbackMode = false;
  private fallbackEmails: EmailMessage[] = [];

  constructor() {
    super();
    this.config = {
      smtpHost: config.email.smtpHost || 'smtp.gmail.com',
      smtpPort: config.email.smtpPort,
      smtpSecure: config.email.smtpPort === 465,
      smtpUser: config.email.smtpUser || '',
      smtpPassword: config.email.smtpPass || '',
      fromEmail: config.email.fromEmail,
      fromName: config.email.fromName,
      settings: {
        maxRetries: 3, // Use default, can be made configurable later
        retryDelay: 1000,
        batchSize: 10,
        maxQueueSize: 1000,
      },
    };
  }

  async initialize(): Promise<void> {
    try {
      // Check for required credentials
      const missingVars: string[] = [];
      if (!this.config.smtpHost) missingVars.push('SMTP_HOST');
      if (!this.config.smtpUser) missingVars.push('SMTP_USER');
      if (!this.config.smtpPassword) missingVars.push('SMTP_PASSWORD');

      if (missingVars.length > 0) {
        logger.warn('SMTP service running in fallback mode - missing configuration', {
          missingVariables: missingVars,
        });
        this.fallbackMode = true;
        return;
      }

      // Try to load nodemailer
      let nodemailer: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        nodemailer = require('nodemailer');
      } catch (err) {
        logger.warn('Nodemailer package not available; falling back to mock mode', { error: err });
        this.fallbackMode = true;
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpSecure,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword,
        },
        tls: {
          rejectUnauthorized: config.server.nodeEnv === 'production',
        },
      }) as SMTPTransporter;

      // Verify connection
      await this.transporter.verify();
      logger.info('✅ SMTP service initialized successfully', {
        host: this.config.smtpHost,
        port: this.config.smtpPort,
      });
      this.fallbackMode = false;
    } catch (error) {
      logger.error('SMTP service initialization failed, using fallback mode', {
        error,
        host: this.config.smtpHost,
        port: this.config.smtpPort,
      });
      this.fallbackMode = true;
    }
  }

  async getInboxMessages(): Promise<EmailInboxMessage[]> {
    // SMTP is send-only
    return [];
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    // Validate message first
    const validation = this.validateEmailMessage(message);
    if (!validation.valid) {
      logger.error('Email validation failed', { errors: validation.errors });
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    if (this.fallbackMode || !this.transporter) {
      return this.handleFallback(message, 'Service in fallback mode');
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text ?? stripHtml(message.html),
        attachments: message.attachments,
      });

      logger.info('✅ Email sent successfully', {
        messageId: info.messageId,
        to: message.to,
        subject: message.subject,
        accepted: info.accepted,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error('❌ Failed to send email, using fallback', {
        error: error?.message,
        code: error?.code,
        to: message.to,
      });
      return this.handleFallback(message, error?.message);
    }
  }

  private handleFallback(message: EmailMessage, errMsg?: string): EmailResult {
    // Prevent unbounded queue growth
    if (this.fallbackEmails.length >= this.config.settings.maxQueueSize) {
      logger.warn(`Fallback queue full (${this.config.settings.maxQueueSize}), dropping oldest email`);
      this.fallbackEmails.shift();
    }

    this.fallbackEmails.push(message);

    logger.info('📩 EMAIL FALLBACK - Queued for retry', {
      to: message.to,
      subject: message.subject,
      queueSize: this.fallbackEmails.length,
      preview: (message.text ?? stripHtml(message.html)).slice(0, 200),
    });

    return {
      success: true,
      messageId: `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fallbackUsed: true,
      error: errMsg,
    };
  }

  async markAsRead(): Promise<void> {
    // Not supported for SMTP
  }

  async archiveMessage(): Promise<void> {
    // Not supported for SMTP
  }

  async sendQueuedEmails(): Promise<void> {
    if (this.fallbackMode || this.fallbackEmails.length === 0) {
      return;
    }

    const queueSize = this.fallbackEmails.length;
    const batchSize = this.config.settings.batchSize;
    
    logger.info(`📤 Processing ${queueSize} queued emails in batches of ${batchSize}`);

    const queue = [...this.fallbackEmails];
    this.fallbackEmails = [];

    // Process in batches
    for (let i = 0; i < queue.length; i += batchSize) {
      const batch = queue.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(email => this.sendEmailWithRetry(email))
      );

      // Log batch results
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      logger.info(`Batch ${Math.floor(i / batchSize) + 1}: ${succeeded} sent, ${failed} failed`);

      // Small delay between batches to respect rate limits
      if (i + batchSize < queue.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
  }

  private async sendEmailWithRetry(email: EmailMessage): Promise<void> {
    const maxRetries = this.config.settings.maxRetries;
    const baseDelay = this.config.settings.retryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendEmail(email);
        
        if (result.success && !result.fallbackUsed) {
          return; // Successfully sent!
        }
        
        throw new Error(result.error || 'Email still in fallback mode');
      } catch (error) {
        if (attempt === maxRetries) {
          logger.error('Failed to send email after all retries', {
            email: { to: email.to, subject: email.subject },
            attempts: maxRetries,
            error,
          });
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.debug(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, {
          email: email.subject,
        });
        
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  getFallbackEmailCount(): number {
    return this.fallbackEmails.length;
  }

  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  async retryInitialization(): Promise<boolean> {
    logger.info('Attempting to retry SMTP initialization...');
    await this.initialize();
    return !this.fallbackMode;
  }

  async getStatus(): Promise<{ connected: boolean; lastSync?: Date; error?: string }> {
    if (this.fallbackMode) {
      return {
        connected: false,
        error: 'Running in fallback mode - configure SMTP credentials',
      };
    }

    if (!this.transporter) {
      return {
        connected: false,
        error: 'Transporter not initialized',
      };
    }

    try {
      await this.transporter.verify();
      return {
        connected: true,
        lastSync: new Date(),
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error?.message ?? 'Connection verification failed',
      };
    }
  }
}

// ---------- Email Templates with XSS Protection ----------
export class EmailTemplates {
  static welcomeEmail(userName: string, loginUrl: string): string {
    const safeName = escapeHtml(userName);
    const safeUrl = escapeHtml(loginUrl);
    
    return `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  .header{background:#14B8A6;color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{padding:30px;background:#f9f9f9;border:1px solid #e5e5e5}
  .button{display:inline-block;background:#14B8A6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;margin:15px 0;font-weight:bold}
  .footer{text-align:center;padding:20px;color:#666;font-size:12px;background:#f0f0f0;border-radius:0 0 8px 8px}
  ul{text-align:left;display:inline-block}
</style></head><body>
  <div class="header"><h1>Welcome to Chanuka! 🇺🇸</h1></div>
  <div class="content">
    <h2>Hello ${safeName},</h2>
    <p>Welcome to your legislative tracking platform. We're excited to have you on board!</p>
    <ul>
      <li>Track bills and legislation in real-time</li>
      <li>Monitor legislative progress</li>
      <li>Receive timely bill updates</li>
      <li>Analyze government data</li>
    </ul>
    <a class="button" href="${safeUrl}">Access Your Account</a>
    <p style="margin-top:20px;font-size:14px;color:#666">If you didn't create this account, please ignore this email.</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Chanuka. All rights reserved.</div>
</body></html>`;
  }

  static passwordResetEmail(userName: string, resetUrl: string): string {
    const safeName = escapeHtml(userName);
    const safeUrl = escapeHtml(resetUrl);
    
    return `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Password Reset</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  .header{background:#14B8A6;color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{padding:30px;background:#f9f9f9;border:1px solid #e5e5e5}
  .button{display:inline-block;background:#14B8A6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;margin:15px 0;font-weight:bold}
  .warning{background:#FEF3C7;border:1px solid #F59E0B;padding:15px;border-radius:5px;margin:15px 0}
  .footer{text-align:center;padding:20px;color:#666;font-size:12px;background:#f0f0f0;border-radius:0 0 8px 8px}
</style></head><body>
  <div class="header"><h1>🔐 Password Reset Request</h1></div>
  <div class="content">
    <h2>Hello ${safeName},</h2>
    <p>We received a request to reset your password for your Chanuka account.</p>
    <a class="button" href="${safeUrl}">Reset Your Password</a>
    <div class="warning">
      <strong>⚠️ Security Notice:</strong><br>
      This link expires in 1 hour for your security.<br>
      If you didn't request this reset, please ignore this email and your password will remain unchanged.
    </div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Chanuka. All rights reserved.</div>
</body></html>`;
  }

  static legislativeInquiryNotification(
    billTitle: string,
    userName: string,
    message: string,
    contactInfo: string
  ): string {
    const safeTitle = escapeHtml(billTitle);
    const safeName = escapeHtml(userName);
    const safeMessage = escapeHtml(message);
    const safeContact = escapeHtml(contactInfo);
    
    return `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Legislative Inquiry</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  .header{background:#14B8A6;color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{padding:30px;background:#f9f9f9;border:1px solid #e5e5e5}
  .inquiry{background:#fff;border:1px solid #ddd;padding:20px;border-radius:5px;margin:15px 0}
  .field{margin:10px 0}
  .label{font-weight:bold;color:#555}
  .message-box{background:#f8f8f8;padding:15px;border-radius:5px;margin-top:10px;white-space:pre-wrap}
  .footer{text-align:center;padding:20px;color:#666;font-size:12px;background:#f0f0f0;border-radius:0 0 8px 8px}
</style></head><body>
  <div class="header"><h1>📧 New Legislative Inquiry</h1></div>
  <div class="content">
    <h2>Bill: ${safeTitle}</h2>
    <div class="inquiry">
      <div class="field"><span class="label">From:</span> ${safeName}</div>
      <div class="field"><span class="label">Contact:</span> ${safeContact}</div>
      <div class="field">
        <span class="label">Message:</span>
        <div class="message-box">${safeMessage}</div>
      </div>
    </div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Chanuka. All rights reserved.</div>
</body></html>`;
  }

  static billStatusUpdate(
    userName: string,
    billTitle: string,
    status: string,
    details: string
  ): string {
    const safeName = escapeHtml(userName);
    const safeTitle = escapeHtml(billTitle);
    const safeStatus = escapeHtml(status);
    const safeDetails = escapeHtml(details);
    
    const statusColors: Record<string, string> = {
      passed: '#10B981',
      failed: '#EF4444',
      pending: '#F59E0B',
      introduced: '#3B82F6',
    };
    const statusColor = statusColors[status.toLowerCase()] ?? '#F59E0B';
    const frontendUrl = config.server.frontendUrl || 'https://Chanuka.gov';
    
    return `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bill Update</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  .header{background:#14B8A6;color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{padding:30px;background:#f9f9f9;border:1px solid #e5e5e5}
  .status{background:#fff;border-left:4px solid ${statusColor};padding:20px;margin:15px 0;border-radius:0 5px 5px 0}
  .button{display:inline-block;background:#14B8A6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;margin:15px 0;font-weight:bold}
  .footer{text-align:center;padding:20px;color:#666;font-size:12px;background:#f0f0f0;border-radius:0 0 8px 8px}
</style></head><body>
  <div class="header"><h1>📜 Bill Status Update</h1></div>
  <div class="content">
    <h2>Hello ${safeName},</h2>
    <p>We have an important update on the bill you're tracking:</p>
    <h3>${safeTitle}</h3>
    <div class="status">
      <h4 style="margin:0 0 10px 0;color:${statusColor}">Status: ${safeStatus.toUpperCase()}</h4>
      <p style="margin:0">${safeDetails}</p>
    </div>
    <a class="button" href="${frontendUrl}/dashboard/bills">View Full Bill Details</a>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Chanuka. All rights reserved.</div>
</body></html>`;
  }
}

// ---------- Service Factory with Race Condition Protection ----------
export class EmailServiceFactory {
  static create(provider: EmailProvider): EmailService {
    switch (provider) {
      case 'mock':
        return new MockEmailService();
      case 'smtp':
        return new SMTPService();
      case 'sendgrid':
      case 'gmail':
      case 'outlook':
        logger.warn(`Provider "${provider}" not fully implemented yet, using mock`);
        return new MockEmailService();
      default:
        logger.warn(`Unsupported provider "${provider}", using mock`);
        return new MockEmailService();
    }
  }

  static async createBestAvailable(): Promise<EmailService> {
    const providers: EmailProvider[] = ['smtp', 'mock'];
    
    for (const provider of providers) {
      try {
        const service = this.create(provider);
        await service.initialize();
        
        // Check if service is actually connected (not in fallback)
        if ('getStatus' in service) {
          const status = await (service as any).getStatus();
          if (status?.connected) {
            logger.info(`✅ Email service initialized with provider: ${provider}`);
            return service;
          }
        } else if (!('isInFallbackMode' in service) || !(service as any).isInFallbackMode?.()) {
          logger.info(`✅ Email service initialized with provider: ${provider}`);
          return service;
        }
      } catch (error) {
        logger.warn(`❌ Failed to initialize provider: ${provider}`, { error });
      }
    }
    
    // Last resort: mock service
    logger.warn('⚠️ All providers failed, using mock service');
    const mockService = new MockEmailService();
    await mockService.initialize();
    return mockService;
  }
}

// ---------- Global Singleton with Race Condition Protection ----------
let emailServiceInstance: EmailService | null = null;
let initializationPromise: Promise<EmailService> | null = null;

export async function getEmailService(): Promise<EmailService> {
  // Fast path: already initialized
  if (emailServiceInstance) {
    return emailServiceInstance;
  }
  
  // Wait for ongoing initialization
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Start new initialization
  initializationPromise = EmailServiceFactory.createBestAvailable()
    .then(service => {
      emailServiceInstance = service;
      initializationPromise = null;
      return service;
    })
    .catch(error => {
      initializationPromise = null;
      logger.error('Failed to initialize email service', { error });
      throw error;
    });
  
  return initializationPromise;
}

// ---------- Templated Email Helper ----------
export async function sendTemplatedEmail(
  template: 'welcome' | 'password-reset' | 'legislative-inquiry' | 'bill-update',
  to: string | string[],
  data: Record<string, string>
): Promise<EmailResult> {
  const service = await getEmailService();

  let subject: string;
  let html: string;

  switch (template) {
    case 'welcome':
      subject = 'Welcome to Chanuka!';
      html = EmailTemplates.welcomeEmail(
        data.userName ?? 'User',
        data.loginUrl ?? 'https://Chanuka.gov/login'
      );
      break;

    case 'password-reset':
      subject = 'Reset Your Password - Chanuka';
      html = EmailTemplates.passwordResetEmail(
        data.userName ?? 'User',
        data.resetUrl ?? '#'
      );
      break;

    case 'legislative-inquiry':
      subject = `New Legislative Inquiry - ${data.billTitle ?? 'Bill'}`;
      html = EmailTemplates.legislativeInquiryNotification(
        data.billTitle ?? 'Bill',
        data.userName ?? 'Unknown',
        data.message ?? 'No message provided',
        data.contactInfo ?? 'No contact info'
      );
      break;

    case 'bill-update':
      subject = `Bill Update - ${data.billTitle ?? 'Bill'}`;
      html = EmailTemplates.billStatusUpdate(
        data.userName ?? 'User',
        data.billTitle ?? 'Bill',
        data.status ?? 'pending',
        data.details ?? 'No details available'
      );
      break;

    default:
      throw new Error(`Unknown template: ${template as string}`);
  }

  return service.sendEmail({
    to,
    subject,
    html,
    text: stripHtml(html),
  });
}

// Export validation utilities for external use
export { validateEmailAddress, escapeHtml };






