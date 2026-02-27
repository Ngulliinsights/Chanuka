// email-service.ts
// Production-grade email service with enhanced security, type safety, and performance

import { logger } from '@server/infrastructure/observability';
// Adjust this alias/path to wherever your compiled config is exported from.
// Common alternatives: '@server/config', '../../../config', 'config'
import { config } from '@server/config';

// ---------------------------------------------------------------------------
// Logger helper — pino only accepts a single string argument.
// ---------------------------------------------------------------------------
function log(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, unknown>,
): void {
  const suffix = context ? ` | ${JSON.stringify(context)}` : '';
  logger[level](`${message}${suffix}`);
}

// ---------------------------------------------------------------------------
// Error narrowing utility
// ---------------------------------------------------------------------------
function toError(value: unknown): Error & { code?: string } {
  if (value instanceof Error) return value as Error & { code?: string };
  return new Error(String(value));
}

// ---------------------------------------------------------------------------
// Security utilities
// ---------------------------------------------------------------------------
const escapeHtml = (unsafe: string): string => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const validateEmailAddress = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------
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
    content_type?: string;
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

// ---------------------------------------------------------------------------
// SMTP transport types
// ---------------------------------------------------------------------------
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
    content_type?: string;
  }>;
}

interface SMTPSendResult {
  messageId: string;
  response?: string;
  accepted?: string[];
  rejected?: string[];
}

// ---------------------------------------------------------------------------
// Legislative types
// ---------------------------------------------------------------------------
export interface LegislativeInquiry {
  id: string;
  bill_id: string;
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
  is_read?: boolean;
  isImportant?: boolean;
  labels?: string[];
}

export interface InquiryClassificationResult {
  inquiryType: 'bill_inquiry' | 'amendment_request' | 'complaint' | 'general_inquiry';
  priority: 'low' | 'medium' | 'high';
  extractedData: {
    senderPhone?: string;
    bill_number?: string;
  };
  confidence: number;
}

// ---------------------------------------------------------------------------
// Inquiry classification service
// ---------------------------------------------------------------------------
export class InquiryClassificationService {
  static classify(message: EmailInboxMessage): InquiryClassificationResult {
    const content = `${message.subject} ${message.body}`.toLowerCase();

    let inquiryType: InquiryClassificationResult['inquiryType'] = 'general_inquiry';
    let priority: InquiryClassificationResult['priority'] = 'medium';
    let confidence = 0.5;

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

    if (/\b(urgent|asap|immediately|critical)\b/.test(content)) {
      priority = 'high';
    } else if (/\b(when convenient|no rush|whenever)\b/.test(content)) {
      priority = 'low';
    }

    const extractedData: InquiryClassificationResult['extractedData'] = {};

    const phoneMatch = /\+254\s?\d{9}|\b\d{10}\b/.exec(message.body);
    if (phoneMatch) extractedData.senderPhone = phoneMatch[0].replace(/\s/g, '');

    const billMatch = /Bill\s?(\d+|[A-Z]\d+)/i.exec(message.body);
    if (billMatch?.[1]) extractedData.bill_number = billMatch[1];

    return { inquiryType, priority, extractedData, confidence };
  }
}

// ---------------------------------------------------------------------------
// Email service interface
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Abstract base with shared validation
// ---------------------------------------------------------------------------
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

    if (recipients.length === 0) errors.push('At least one recipient is required');
    for (const email of recipients) {
      if (!validateEmailAddress(email)) errors.push(`Invalid email address: ${email}`);
    }
    if (!message.subject?.trim()) errors.push('Subject is required');
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
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  protected extractBillTitle(subject: string): string {
    const match = /(?:bill|legislative|inquiry).*?-\s*(.+)/i.exec(subject);
    return match?.[1]?.trim() ?? 'Unknown Bill';
  }
}

// ---------------------------------------------------------------------------
// Mock email service
// ---------------------------------------------------------------------------
export class MockEmailService extends BaseEmailService {
  private mockMessages: EmailInboxMessage[] = [];
  private fallbackEmails: EmailMessage[] = [];
  private readonly SUPPORT_EMAIL = 'support@chanuka.gov';

  async initialize(): Promise<void> {
    const now = Date.now();
    this.mockMessages = [
      {
        id: '1', threadId: 'thread_1',
        from: 'john.kamau@email.com', to: [this.SUPPORT_EMAIL],
        subject: 'Bill Inquiry - Education Reform Bill',
        body: "Hi, I'm interested in tracking this bill. Could you provide updates on its progress?",
        timestamp: new Date(now - 2 * 3_600_000), is_read: false, isImportant: false,
        labels: ['inquiry', 'bill_inquiry'],
      },
      {
        id: '2', threadId: 'thread_2',
        from: 'sarah.w@email.com', to: [this.SUPPORT_EMAIL],
        subject: 'Amendment Request - Healthcare Bill',
        body: 'I would like to propose an amendment to this bill regarding mental health services.',
        timestamp: new Date(now - 5 * 3_600_000), is_read: true, isImportant: false,
        labels: ['inquiry', 'amendment_request'],
      },
      {
        id: '3', threadId: 'thread_3',
        from: 'm.ochieng@email.com', to: [this.SUPPORT_EMAIL],
        subject: 'Legislative Inquiry - Infrastructure Development Act',
        body: "I'm interested in following this infrastructure bill. When is the next committee hearing?",
        timestamp: new Date(now - 24 * 3_600_000), is_read: true, isImportant: false,
        labels: ['inquiry', 'legislative', 'replied'],
      },
      {
        id: '4', threadId: 'thread_4',
        from: 'grace.muthoni@email.com', to: [this.SUPPORT_EMAIL],
        subject: 'Complaint - Data Accuracy Issues',
        body: 'I noticed discrepancies in the bill tracking data. Could you verify the current status?',
        timestamp: new Date(now - 48 * 3_600_000), is_read: true, isImportant: false,
        labels: ['inquiry', 'complaint'],
      },
    ];
    logger.info('MockEmailService initialized with seeded inbox');
  }

  async getInboxMessages(limit = 50): Promise<EmailInboxMessage[]> {
    return this.mockMessages.slice(0, limit);
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const validation = this.validateEmailMessage(message);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    await new Promise((r) => setTimeout(r, 200));

    if (this.fallbackEmails.length >= this.MAX_QUEUE_SIZE) {
      logger.warn('Mock fallback queue full — dropping oldest email');
      this.fallbackEmails.shift();
    }

    this.fallbackEmails.push(message);

    log('info', '📧 MOCK EMAIL SENT', {
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
    const msg = this.mockMessages.find((m) => m.id === messageId);
    if (msg) {
      msg.is_read = true;
      logger.debug(`Marked message ${messageId} as read`);
    }
  }

  async archiveMessage(messageId: string): Promise<void> {
    const msg = this.mockMessages.find((m) => m.id === messageId);
    if (msg) {
      msg.labels = [...(msg.labels ?? []), 'archived'];
      logger.debug(`Archived message ${messageId}`);
    }
  }

  extractLegislativeInquiries(messages: EmailInboxMessage[]): LegislativeInquiry[] {
    return messages.map((msg) => {
      const classification = InquiryClassificationService.classify(msg);
      return {
        id: `inquiry_${msg.id}`,
        bill_id: classification.extractedData.bill_number ?? 'unknown',
        billTitle: this.extractBillTitle(msg.subject),
        userName: this.extractNameFromEmail(msg.from),
        userEmail: msg.from,
        userPhone: classification.extractedData.senderPhone ?? '',
        message: msg.body,
        timestamp: msg.timestamp,
        status: msg.labels?.includes('replied') ? 'responded' : 'new',
        priority: classification.priority,
      };
    });
  }

  getFallbackEmailCount(): number { return this.fallbackEmails.length; }
  isInFallbackMode(): boolean { return true; }

  async getStatus(): Promise<{ connected: boolean; lastSync?: Date; error?: string }> {
    return { connected: true, lastSync: new Date() };
  }
}

// ---------------------------------------------------------------------------
// SMTP service with enhanced error handling
// ---------------------------------------------------------------------------
export class SMTPService extends BaseEmailService {
  private smtpConfig: Required<Pick<
    EmailServiceConfig,
    'smtpHost' | 'smtpPort' | 'smtpSecure' | 'smtpUser' | 'smtpPassword' | 'fromEmail' | 'fromName'
  >> & { settings: Required<NonNullable<EmailServiceConfig['settings']>> };

  private transporter: SMTPTransporter | null = null;
  private fallbackMode = false;
  private fallbackEmails: EmailMessage[] = [];

  constructor() {
    super();
    this.smtpConfig = {
      smtpHost:     config.email.smtpHost     || 'smtp.gmail.com',
      smtpPort:     config.email.smtpPort,
      smtpSecure:   config.email.smtpPort === 465,
      smtpUser:     config.email.smtpUser     || '',
      smtpPassword: config.email.smtpPass     || '',
      fromEmail:    config.email.fromEmail,
      fromName:     config.email.fromName,
      settings: { maxRetries: 3, retryDelay: 1000, batchSize: 10, maxQueueSize: 1000 },
    };
  }

  async initialize(): Promise<void> {
    try {
      const missingVars: string[] = [];
      if (!this.smtpConfig.smtpHost)     missingVars.push('SMTP_HOST');
      if (!this.smtpConfig.smtpUser)     missingVars.push('SMTP_USER');
      if (!this.smtpConfig.smtpPassword) missingVars.push('SMTP_PASSWORD');

      if (missingVars.length > 0) {
        log('warn', `SMTP service running in fallback mode — missing: ${missingVars.join(', ')}`);
        this.fallbackMode = true;
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      let nodemailer: typeof import('nodemailer');
      try {
        nodemailer = require('nodemailer');
      } catch (err) {
        log('warn', `Nodemailer not available — falling back to mock mode: ${toError(err).message}`);
        this.fallbackMode = true;
        return;
      }

      this.transporter = nodemailer.createTransport({
        host:   this.smtpConfig.smtpHost,
        port:   this.smtpConfig.smtpPort,
        secure: this.smtpConfig.smtpSecure,
        auth: { user: this.smtpConfig.smtpUser, pass: this.smtpConfig.smtpPassword },
        tls: { rejectUnauthorized: config.server.nodeEnv === 'production' },
      }) as unknown as SMTPTransporter;

      await this.transporter.verify();
      log('info', `✅ SMTP initialized — host=${this.smtpConfig.smtpHost} port=${this.smtpConfig.smtpPort}`);
      this.fallbackMode = false;
    } catch (err) {
      const e = toError(err);
      log('error', `SMTP initialization failed — using fallback | host=${this.smtpConfig.smtpHost} port=${this.smtpConfig.smtpPort}: ${e.message}`);
      this.fallbackMode = true;
    }
  }

  async getInboxMessages(): Promise<EmailInboxMessage[]> {
    return []; // SMTP is send-only
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    const validation = this.validateEmailMessage(message);
    if (!validation.valid) {
      log('error', `Email validation failed: ${validation.errors.join(', ')}`);
      return { success: false, error: validation.errors.join(', ') };
    }

    if (this.fallbackMode || !this.transporter) {
      return this.handleFallback(message, 'Service in fallback mode');
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.smtpConfig.fromName}" <${this.smtpConfig.fromEmail}>`,
        to:      message.to,
        subject: message.subject,
        html:    message.html,
        text:    message.text ?? stripHtml(message.html),
        attachments: message.attachments,
      });

      log('info', `✅ Email sent | id=${info.messageId} to=${JSON.stringify(message.to)} subject="${message.subject}" accepted=${JSON.stringify(info.accepted)}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      const e = toError(err);
      log('error', `❌ Failed to send email — using fallback | to=${JSON.stringify(message.to)} code=${e.code ?? '-'}: ${e.message}`);
      return this.handleFallback(message, e.message);
    }
  }

  private handleFallback(message: EmailMessage, errMsg?: string): EmailResult {
    const maxQ = this.smtpConfig.settings.maxQueueSize;
    if (this.fallbackEmails.length >= maxQ) {
      log('warn', `Fallback queue full (${maxQ}) — dropping oldest email`);
      this.fallbackEmails.shift();
    }

    this.fallbackEmails.push(message);
    log('info', `📩 EMAIL QUEUED for retry | to=${JSON.stringify(message.to)} subject="${message.subject}" queueSize=${this.fallbackEmails.length} preview="${(message.text ?? stripHtml(message.html)).slice(0, 200)}"`);

    return {
      success: true,
      messageId: `fallback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      fallbackUsed: true,
      error: errMsg,
    };
  }

  async markAsRead(): Promise<void>    { /* SMTP is send-only */ }
  async archiveMessage(): Promise<void> { /* SMTP is send-only */ }

  async sendQueuedEmails(): Promise<void> {
    if (this.fallbackMode || this.fallbackEmails.length === 0) return;

    const { batchSize } = this.smtpConfig.settings;
    const queue = [...this.fallbackEmails];
    this.fallbackEmails = [];

    log('info', `📤 Processing ${queue.length} queued emails in batches of ${batchSize}`);

    for (let i = 0; i < queue.length; i += batchSize) {
      const batch = queue.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((e) => this.sendEmailWithRetry(e)));

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed    = results.filter((r) => r.status === 'rejected').length;
      log('info', `Batch ${Math.floor(i / batchSize) + 1}: ${succeeded} sent, ${failed} failed`);

      if (i + batchSize < queue.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  private async sendEmailWithRetry(email: EmailMessage): Promise<void> {
    const { maxRetries, retryDelay } = this.smtpConfig.settings;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendEmail(email);
        if (result.success && !result.fallbackUsed) return;
        throw new Error(result.error ?? 'Email still in fallback mode');
      } catch (err) {
        const e = toError(err);
        if (attempt === maxRetries) {
          log('error', `Failed to send email after ${maxRetries} retries | to=${JSON.stringify(email.to)} subject="${email.subject}": ${e.message}`);
          throw e;
        }
        const delay = retryDelay * Math.pow(2, attempt - 1);
        log('debug', `Retry ${attempt}/${maxRetries} after ${delay}ms | subject="${email.subject}"`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  getFallbackEmailCount(): number  { return this.fallbackEmails.length; }
  isInFallbackMode(): boolean       { return this.fallbackMode; }

  async retryInitialization(): Promise<boolean> {
    logger.info('Attempting to retry SMTP initialization…');
    await this.initialize();
    return !this.fallbackMode;
  }

  async getStatus(): Promise<{ connected: boolean; lastSync?: Date; error?: string }> {
    if (this.fallbackMode)   return { connected: false, error: 'Running in fallback mode — configure SMTP credentials' };
    if (!this.transporter)   return { connected: false, error: 'Transporter not initialized' };

    try {
      await this.transporter.verify();
      return { connected: true, lastSync: new Date() };
    } catch (err) {
      return { connected: false, error: toError(err).message };
    }
  }
}

// ---------------------------------------------------------------------------
// Email templates with XSS protection
// ---------------------------------------------------------------------------
export class EmailTemplates {
  static welcomeEmail(userName: string, loginUrl: string): string {
    const safeName = escapeHtml(userName);
    const safeUrl  = escapeHtml(loginUrl);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  .header{background:#14B8A6;color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{padding:30px;background:#f9f9f9;border:1px solid #e5e5e5}
  .button{display:inline-block;background:#14B8A6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;margin:15px 0;font-weight:bold}
  .footer{text-align:center;padding:20px;color:#666;font-size:12px;background:#f0f0f0;border-radius:0 0 8px 8px}
  ul{text-align:left;display:inline-block}
</style></head><body>
  <div class="header"><h1>Welcome to Chanuka! 🇰🇪</h1></div>
  <div class="content">
    <h2>Hello ${safeName},</h2>
    <p>Welcome to your legislative tracking platform. We're excited to have you on board!</p>
    <ul>
      <li>Track bills and legislation in real-time</li>
      <li>Monitor legislative progress</li>
      <li>Receive timely bill updates</li>
      <li>Analyse government data</li>
    </ul>
    <a class="button" href="${safeUrl}">Access Your Account</a>
    <p style="margin-top:20px;font-size:14px;color:#666">If you didn't create this account, please ignore this email.</p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Chanuka. All rights reserved.</div>
</body></html>`;
  }

  static passwordResetEmail(userName: string, resetUrl: string): string {
    const safeName = escapeHtml(userName);
    const safeUrl  = escapeHtml(resetUrl);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Password Reset</title>
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
    contactInfo: string,
  ): string {
    const safeTitle   = escapeHtml(billTitle);
    const safeName    = escapeHtml(userName);
    const safeMessage = escapeHtml(message);
    const safeContact = escapeHtml(contactInfo);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Legislative Inquiry</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  .header{background:#14B8A6;color:#fff;padding:30px 20px;text-align:center;border-radius:8px 8px 0 0}
  .content{padding:30px;background:#f9f9f9;border:1px solid #e5e5e5}
  .inquiry{background:#fff;border:1px solid #ddd;padding:20px;border-radius:5px;margin:15px 0}
  .label{font-weight:bold;color:#555}
  .message-box{background:#f8f8f8;padding:15px;border-radius:5px;margin-top:10px;white-space:pre-wrap}
  .footer{text-align:center;padding:20px;color:#666;font-size:12px;background:#f0f0f0;border-radius:0 0 8px 8px}
</style></head><body>
  <div class="header"><h1>📧 New Legislative Inquiry</h1></div>
  <div class="content">
    <h2>Bill: ${safeTitle}</h2>
    <div class="inquiry">
      <div><span class="label">From:</span> ${safeName}</div>
      <div><span class="label">Contact:</span> ${safeContact}</div>
      <div><span class="label">Message:</span><div class="message-box">${safeMessage}</div></div>
    </div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Chanuka. All rights reserved.</div>
</body></html>`;
  }

  static billStatusUpdate(
    userName: string,
    billTitle: string,
    status: string,
    details: string,
  ): string {
    const safeName    = escapeHtml(userName);
    const safeTitle   = escapeHtml(billTitle);
    const safeStatus  = escapeHtml(status);
    const safeDetails = escapeHtml(details);

    const statusColors: Record<string, string> = {
      passed: '#10B981', failed: '#EF4444', pending: '#F59E0B', introduced: '#3B82F6',
    };
    const statusColor = statusColors[status.toLowerCase()] ?? '#F59E0B';
    const frontendUrl = config.server.frontendUrl || 'https://chanuka.gov';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bill Update</title>
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
      <h4 style="margin:0 0 10px;color:${statusColor}">Status: ${safeStatus.toUpperCase()}</h4>
      <p style="margin:0">${safeDetails}</p>
    </div>
    <a class="button" href="${frontendUrl}/dashboard/bills">View Full Bill Details</a>
  </div>
  <div class="footer">© ${new Date().getFullYear()} Chanuka. All rights reserved.</div>
</body></html>`;
  }
}

// ---------------------------------------------------------------------------
// Service factory
// ---------------------------------------------------------------------------
export class EmailServiceFactory {
  static create(provider: EmailProvider): EmailService {
    switch (provider) {
      case 'mock': return new MockEmailService();
      case 'smtp': return new SMTPService();
      default:
        log('warn', `Provider "${provider}" not fully implemented — using mock`);
        return new MockEmailService();
    }
  }

  static async createBestAvailable(): Promise<EmailService> {
    for (const provider of ['smtp', 'mock'] as EmailProvider[]) {
      try {
        const service = this.create(provider);
        await service.initialize();

        const connected = 'getStatus' in service
          ? (await (service as Required<Pick<EmailService, 'getStatus'>>).getStatus()).connected
          : !((service as Pick<EmailService, 'isInFallbackMode'>).isInFallbackMode?.() ?? false);

        if (connected) {
          log('info', `✅ Email service ready — provider: ${provider}`);
          return service;
        }
      } catch (err) {
        log('warn', `❌ Failed to initialize provider "${provider}": ${toError(err).message}`);
      }
    }

    log('warn', '⚠️ All providers failed — using mock service');
    const mock = new MockEmailService();
    await mock.initialize();
    return mock;
  }
}

// ---------------------------------------------------------------------------
// Global singleton with race-condition protection
// ---------------------------------------------------------------------------
let emailServiceInstance: EmailService | null = null;
let initializationPromise: Promise<EmailService> | null = null;
let isInitialized = false;

export async function getEmailService(): Promise<EmailService> {
  if (isInitialized && emailServiceInstance) return emailServiceInstance;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      const service = await EmailServiceFactory.createBestAvailable();
      emailServiceInstance = service;
      isInitialized = true;
      return service;
    } catch (err) {
      isInitialized = false;
      emailServiceInstance = null;
      log('error', `Failed to initialize email service: ${toError(err).message}`);
      throw err;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

// ---------------------------------------------------------------------------
// Templated email helper
// ---------------------------------------------------------------------------
export async function sendTemplatedEmail(
  template: 'welcome' | 'password-reset' | 'legislative-inquiry' | 'bill-update',
  to: string | string[],
  data: Record<string, string>,
): Promise<EmailResult> {
  const service = await getEmailService();
  let subject: string;
  let html: string;

  switch (template) {
    case 'welcome':
      subject = 'Welcome to Chanuka!';
      html    = EmailTemplates.welcomeEmail(data.userName ?? 'User', data.loginUrl ?? 'https://chanuka.gov/login');
      break;
    case 'password-reset':
      subject = 'Reset Your Password — Chanuka';
      html    = EmailTemplates.passwordResetEmail(data.userName ?? 'User', data.resetUrl ?? '#');
      break;
    case 'legislative-inquiry':
      subject = `New Legislative Inquiry — ${data.billTitle ?? 'Bill'}`;
      html    = EmailTemplates.legislativeInquiryNotification(
        data.billTitle ?? 'Bill', data.userName ?? 'Unknown',
        data.message ?? 'No message provided', data.contactInfo ?? 'No contact info',
      );
      break;
    case 'bill-update':
      subject = `Bill Update — ${data.billTitle ?? 'Bill'}`;
      html    = EmailTemplates.billStatusUpdate(
        data.userName ?? 'User', data.billTitle ?? 'Bill',
        data.status ?? 'pending', data.details ?? 'No details available',
      );
      break;
    default:
      throw new Error(`Unknown template: ${template as string}`);
  }

  return service.sendEmail({ to, subject, html, text: stripHtml(html) });
}

// Export validation utilities for external use
export { validateEmailAddress, escapeHtml };