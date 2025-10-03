// services/email.ts
import * as nodemailer from 'nodemailer';
import { config } from '../config/index.js';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface PasswordResetEmailData {
  to: string;
  username: string;
  resetUrl: string;
  expiryMinutes: number;
}

interface PasswordChangeConfirmationData {
  to: string;
  username: string;
}

class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment
   */
  private initializeTransporter(): void {
    if (config.nodeEnv === 'production') {
      // Production email service setup (e.g., SendGrid, Mailgun, etc.)
      this.transporter = nodemailer.createTransport({
        host: config.email.smtpHost,
        port: config.email.smtpPort,
        secure: config.email.smtpPort === 465, // Use secure for port 465
        auth: {
          user: config.email.smtpUser,
          pass: config.email.smtpPass,
        },
      });
    } else {
      // Development: Ethereal email (test service) or mail capture service
      this.setupDevEmailTransport();
    }
  }

  /**
   * Set up development email transport
   */
  private async setupDevEmailTransport(): Promise<void> {
    // Create test account with Ethereal for development
    try {
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Development email transport initialized');
      console.log('Test account:', testAccount.web);
    } catch (error) {
      console.error('Failed to create test email account:', error);
      // Fallback to a mock transport
      this.transporter = {
        sendMail: async (options: any) => {
          console.log('Email would be sent in production:');
          console.log('To:', options.to);
          console.log('Subject:', options.subject);
          console.log('Text:', options.text?.substring(0, 100) + '...');
          return { messageId: 'mock-id' };
        },
      } as any;
    }
  }

  /**
   * Send email
   * @param options - Email options
   * @returns Email send response
   */
  async sendEmail(options: EmailOptions): Promise<any> {
    const mailOptions = {
      from: config.email.smtpUser || 'noreply@example.com',
      ...options,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      if (config.nodeEnv !== 'production') {
        console.log('Email sent in development mode:');
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param data - Password reset email data
   * @returns Email send response
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<any> {
    const { to, username, resetUrl, expiryMinutes } = data;

    const subject = 'Password Reset Request';

    const text = `
      Hello ${username},

      You recently requested to reset your password. Please use the link below to reset it:

      ${resetUrl}

      This link will expire in ${expiryMinutes} minutes.

      If you did not request a password reset, please ignore this email or contact support if you have concerns.

      Thank you,
      The Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Hello ${username},</p>
        <p>You recently requested to reset your password. Please click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
        </div>
        <p><strong>This link will expire in ${expiryMinutes} minutes.</strong></p>
        <p>If the button doesn't work, you can copy and paste this URL into your browser:</p>
        <p>${resetUrl}</p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Thank you,<br>The Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send password change confirmation email
   * @param data - Password change confirmation data
   * @returns Email send response
   */
  async sendPasswordChangeConfirmation(data: PasswordChangeConfirmationData): Promise<any> {
    const { to, username } = data;

    const subject = 'Your Password Has Been Changed';

    const text = `
      Hello ${username},

      This is a confirmation that your password has been changed successfully.

      If you did not authorize this change, please contact our support team immediately.

      Thank you,
      The Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Changed</h2>
        <p>Hello ${username},</p>
        <p>This is a confirmation that your password has been changed successfully.</p>
        <p>If you did not authorize this change, please contact our support team immediately.</p>
        <p>Thank you,<br>The Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send welcome email after registration
   * @param to - Recipient email
   * @param username - User's name or username
   * @returns Email send response
   */
  async sendWelcomeEmail(to: string, username: string): Promise<any> {
    const subject = 'Welcome to Our Platform';

    const text = `
      Hello ${username},

      Welcome to our platform! We're excited to have you on board.

      If you have any questions or need assistance, please don't hesitate to contact our support team.

      Thank you,
      The Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome!</h2>
        <p>Hello ${username},</p>
        <p>Welcome to our platform! We're excited to have you on board.</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Thank you,<br>The Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }
}

// Export singleton instance
export const emailService = new EmailService();
