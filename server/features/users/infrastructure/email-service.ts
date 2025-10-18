import { getEmailService, sendTemplatedEmail, EmailResult } from '../../../infrastructure/notifications/email-service.js';
import { logger } from '../../../utils/logger.js';
import { config } from '../../../config/index.js';

export interface UserEmailData {
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

export interface WelcomeEmailData extends UserEmailData {
  loginUrl: string;
}

export interface PasswordResetEmailData extends UserEmailData {
  resetToken: string;
  resetUrl: string;
}

export interface VerificationEmailData extends UserEmailData {
  verificationToken: string;
  verificationUrl: string;
}

export interface AccountChangeEmailData extends UserEmailData {
  changeType: 'email' | 'password' | 'profile';
  details: string;
}

/**
 * User Email Service
 *
 * Handles user-specific email communications including:
 * - Welcome emails for new users
 * - Password reset emails
 * - Email verification
 * - Account change notifications
 * - User-specific notifications
 */
export class UserEmailService {
  private emailService: any;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.emailService = await getEmailService();
      logger.info('✅ User Email Service initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize User Email Service', { error });
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
    try {
      const result = await sendTemplatedEmail('welcome', data.email, {
        userName: data.name,
        loginUrl: data.loginUrl
      });

      logger.info(`📧 Welcome email sent to ${data.email} for user ${data.userId}`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to send welcome email to ${data.email}`, { error });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
    try {
      const result = await sendTemplatedEmail('password-reset', data.email, {
        userName: data.name,
        resetUrl: data.resetUrl
      });

      logger.info(`🔐 Password reset email sent to ${data.email} for user ${data.userId}`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to send password reset email to ${data.email}`, { error });
      throw error;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(data: VerificationEmailData): Promise<EmailResult> {
    try {
      const result = await this.emailService.sendEmail({
        to: data.email,
        subject: 'Verify Your Email - Chanuka',
        html: this.generateVerificationEmailHtml(data),
        text: this.generateVerificationEmailText(data)
      });

      logger.info(`✅ Verification email sent to ${data.email} for user ${data.userId}`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to send verification email to ${data.email}`, { error });
      throw error;
    }
  }

  /**
   * Send account change notification
   */
  async sendAccountChangeNotification(data: AccountChangeEmailData): Promise<EmailResult> {
    try {
      const result = await this.emailService.sendEmail({
        to: data.email,
        subject: `Account ${data.changeType.charAt(0).toUpperCase() + data.changeType.slice(1)} Changed - Chanuka`,
        html: this.generateAccountChangeEmailHtml(data),
        text: this.generateAccountChangeEmailText(data)
      });

      logger.info(`🔄 Account change notification sent to ${data.email} for user ${data.userId}`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to send account change notification to ${data.email}`, { error });
      throw error;
    }
  }

  /**
   * Send custom user notification email
   */
  async sendUserNotification(
    email: string,
    subject: string,
    message: string,
    userName?: string
  ): Promise<EmailResult> {
    try {
      const result = await this.emailService.sendEmail({
        to: email,
        subject: `Chanuka - ${subject}`,
        html: this.generateUserNotificationHtml(subject, message, userName),
        text: this.generateUserNotificationText(subject, message, userName)
      });

      logger.info(`📬 User notification email sent to ${email}`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to send user notification email to ${email}`, { error });
      throw error;
    }
  }

  /**
   * Generate verification email HTML
   */
  private generateVerificationEmailHtml(data: VerificationEmailData): string {
    const displayName = data.firstName || data.name;
    const frontendUrl = config.server.frontendUrl || 'https://chanuka.gov';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #14B8A6; color: #fff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background: #f9f9f9; border: 1px solid #e5e5e5; }
    .button { display: inline-block; background: #14B8A6; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Verify Your Email Address</h1>
  </div>
  <div class="content">
    <h2>Hello ${displayName},</h2>
    <p>Welcome to Chanuka! To complete your registration and start tracking legislation, please verify your email address.</p>
    <a class="button" href="${data.verificationUrl}">Verify Email Address</a>
    <p style="margin-top: 20px; font-size: 14px; color: #666;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${data.verificationUrl}">${data.verificationUrl}</a>
    </p>
    <p>This link will expire in 24 hours for your security.</p>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} Chanuka. All rights reserved.
  </div>
</body>
</html>`;
  }

  /**
   * Generate verification email text
   */
  private generateVerificationEmailText(data: VerificationEmailData): string {
    const displayName = data.firstName || data.name;

    return `Hello ${displayName},

Welcome to Chanuka! To complete your registration and start tracking legislation, please verify your email address by clicking the link below:

${data.verificationUrl}

This link will expire in 24 hours for your security.

If you didn't create this account, please ignore this email.

© ${new Date().getFullYear()} Chanuka. All rights reserved.`;
  }

  /**
   * Generate account change email HTML
   */
  private generateAccountChangeEmailHtml(data: AccountChangeEmailData): string {
    const displayName = data.firstName || data.name;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Change Notification</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F59E0B; color: #fff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background: #f9f9f9; border: 1px solid #e5e5e5; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Account Change Notification</h1>
  </div>
  <div class="content">
    <h2>Hello ${displayName},</h2>
    <p>This is a notification that your account ${data.changeType} has been changed.</p>
    <div style="background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <strong>Change Details:</strong><br>
      ${data.details}
    </div>
    <p>If you did not make this change, please contact support immediately.</p>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} Chanuka. All rights reserved.
  </div>
</body>
</html>`;
  }

  /**
   * Generate account change email text
   */
  private generateAccountChangeEmailText(data: AccountChangeEmailData): string {
    const displayName = data.firstName || data.name;

    return `Hello ${displayName},

This is a notification that your account ${data.changeType} has been changed.

Change Details:
${data.details}

If you did not make this change, please contact support immediately.

© ${new Date().getFullYear()} Chanuka. All rights reserved.`;
  }

  /**
   * Generate user notification email HTML
   */
  private generateUserNotificationHtml(subject: string, message: string, userName?: string): string {
    const greeting = userName ? `Hello ${userName},` : 'Hello,';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #14B8A6; color: #fff; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; background: #f9f9f9; border: 1px solid #e5e5e5; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${subject}</h1>
  </div>
  <div class="content">
    <p>${greeting}</p>
    <div style="background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 15px 0;">
      ${message.replace(/\n/g, '<br>')}
    </div>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} Chanuka. All rights reserved.
  </div>
</body>
</html>`;
  }

  /**
   * Generate user notification email text
   */
  private generateUserNotificationText(subject: string, message: string, userName?: string): string {
    const greeting = userName ? `Hello ${userName},` : 'Hello,';

    return `${greeting}

${subject}

${message}

© ${new Date().getFullYear()} Chanuka. All rights reserved.`;
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{ initialized: boolean; emailServiceAvailable: boolean }> {
    return {
      initialized: !!this.emailService,
      emailServiceAvailable: !!(await this.emailService?.getStatus?.())?.connected
    };
  }
}

// Export singleton instance
export const userEmailService = new UserEmailService();
