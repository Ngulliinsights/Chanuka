import { eq, desc, and, sql, count } from 'drizzle-orm';
import { database as db, notifications, users, bills } from '../../../shared/database/connection.js';
import { webSocketService } from '../websocket.js';
import { userPreferencesService, type BillTrackingPreferences } from '../../features/users/user-preferences.js';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import * as cron from 'node-cron';
import { logger } from '@shared/utils/logger';

// Advanced notification interfaces
export interface NotificationChannel {
    type: 'in_app' | 'email' | 'push' | 'sms';
    enabled: boolean;
    config?: {
        email?: string;
        pushToken?: string;
        phoneNumber?: string;
    };
}

export interface NotificationPreference {
    userId: string;
    channels: NotificationChannel[];
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    categories: string[];
    quietHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        timezone: string;
    };
    filters: {
        billCategories: string[];
        statusChanges: string[];
        minimumEngagement: number;
    };
}

export interface NotificationRequest {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    channels?: ('in_app' | 'email' | 'push' | 'sms')[];
    templateId?: string;
    templateVariables?: Record<string, string>;
    scheduledFor?: Date;
    expiresAt?: Date;
}

export interface SmartNotificationFilter {
    userId: string;
    billCategories: string[];
    engagementThreshold: number;
    timePreferences: {
        quietHours: boolean;
        preferredTimes: string[];
    };
    frequencyLimits: {
        maxPerHour: number;
        maxPerDay: number;
    };
}

export interface NotificationBatch {
    userId: string;
    notifications: NotificationRequest[];
    scheduledFor: Date;
    frequency: 'hourly' | 'daily' | 'weekly';
}

export interface NotificationTemplate {
    id: string;
    name: string;
    type: string;
    channels: {
        in_app: { title: string; body: string };
        email: { subject: string; htmlBody: string; textBody: string };
        push: { title: string; body: string; icon?: string };
        sms: { message: string };
    };
    variables: string[];
}

// Validation schemas
const notificationRequestSchema = z.object({
    userId: z.string(),
    type: z.string(),
    title: z.string().max(200),
    message: z.string().max(1000),
    data: z.any().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    channels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional(),
    templateId: z.string().optional(),
    templateVariables: z.record(z.string()).optional(),
    scheduledFor: z.date().optional(),
    expiresAt: z.date().optional()
});

/**
 * Advanced Multi-Channel Notification Service
 * 
 * Provides advanced notification capabilities including:
 * - Multi-channel delivery (in-app, email, push, SMS)
 * - Smart filtering and batching
 * - Template system with variables
 * - Scheduling and digest notifications
 * - User preference management
 * - Performance optimization and resource cleanup
 */
export class AdvancedNotificationService {
    private emailTransporter: nodemailer.Transporter | null = null;
    private templates: Map<string, NotificationTemplate> = new Map();
    private processingQueue: NotificationRequest[] = [];
    private processingIntervals: NodeJS.Timeout[] = [];
    private batchedNotifications: Map<string, NotificationRequest[]> = new Map();
    private isInitialized = false;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize the advanced notification service
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.initializeEmailTransporter();
            this.loadNotificationTemplates();
            this.startNotificationProcessing();
            
            this.isInitialized = true;
            logger.info('✅ Advanced Notification Service initialized', { component: 'SimpleTool' });
        } catch (error) {
            logger.error('❌ Failed to initialize Advanced Notification Service:', { component: 'SimpleTool' }, error);
        }
    }

    /**
     * Initialize email transporter with connection pooling
     */
    private async initializeEmailTransporter(): Promise<void> {
        try {
            if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
                logger.info('⚠️ Email service not configured - missing SMTP settings', { component: 'SimpleTool' });
                return;
            }

            this.emailTransporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 100,
                rateDelta: 1000,
                rateLimit: 5
            });

            // Verify connection
            await this.emailTransporter.verify();
            logger.info('✅ Email transporter initialized and verified', { component: 'SimpleTool' });

        } catch (error) {
            logger.error('❌ Failed to initialize email transporter:', { component: 'SimpleTool' }, error);
            this.emailTransporter = null;
        }
    }

    /**
     * Load notification templates
     */
    private loadNotificationTemplates(): void {
        // Bill status change template
        this.templates.set('bill_status_change', {
            id: 'bill_status_change',
            name: 'Bill Status Change',
            type: 'bill_status_change',
            channels: {
                in_app: {
                    title: 'Bill Status Update: {{billTitle}}',
                    body: 'Status changed from "{{oldStatus}}" to "{{newStatus}}"'
                },
                email: {
                    subject: 'Bill Status Update: {{billTitle}}',
                    htmlBody: `
                        <h2>Bill Status Update</h2>
                        <p>Hello {{userName}},</p>
                        <p>The status of <strong>{{billTitle}}</strong> has been updated:</p>
                        <ul>
                            <li><strong>Previous Status:</strong> {{oldStatus}}</li>
                            <li><strong>New Status:</strong> {{newStatus}}</li>
                            <li><strong>Updated:</strong> {{timestamp}}</li>
                        </ul>
                        <p><a href="{{billUrl}}">View Bill Details</a></p>
                        <p>Best regards,<br>SimpleTool Legislative Tracking</p>
                    `,
                    textBody: `
                        Bill Status Update
                        
                        Hello {{userName}},
                        
                        The status of {{billTitle}} has been updated:
                        - Previous Status: {{oldStatus}}
                        - New Status: {{newStatus}}
                        - Updated: {{timestamp}}

                        View Bill Details: {{billUrl}}

                        Best regards,
                        SimpleTool Legislative Tracking
                    `
                },
                push: {
                    title: 'Bill Status Update',
                    body: '{{billTitle}} status: {{oldStatus}} → {{newStatus}}',
                    icon: 'bill-status-icon'
                },
                sms: {
                    message: 'Bill Update: {{billTitle}} status changed from {{oldStatus}} to {{newStatus}}. View: {{billUrl}}'
                }
            },
            variables: ['billTitle', 'oldStatus', 'newStatus', 'timestamp', 'userName', 'billUrl']
        });

        console.log(`✅ Loaded ${this.templates.size} notification templates`);
    }

    /**
     * Start notification processing with proper cleanup
     */
    private startNotificationProcessing(): void {
        // Clear existing intervals first
        this.stopNotificationProcessing();
        
        const interval = setInterval(async () => {
            try {
                await this.processNotificationQueue();
                await this.processBatchedNotifications();
            } catch (error) {
                logger.error('Error in notification processing:', { component: 'SimpleTool' }, error);
            }
        }, 30000); // Process every 30 seconds
        
        this.processingIntervals.push(interval);
        logger.info('✅ Advanced notification processing started', { component: 'SimpleTool' });
    }

    /**
     * Stop notification processing and clean up intervals
     */
    private stopNotificationProcessing(): void {
        this.processingIntervals.forEach(interval => clearInterval(interval));
        this.processingIntervals = [];
        logger.info('🛑 Advanced notification processing stopped', { component: 'SimpleTool' });
    }

    /**
     * Send advanced notification with smart filtering
     */
    async sendNotification(request: NotificationRequest): Promise<{
        success: boolean;
        channels: string[];
        filtered?: boolean;
        reason?: string;
    }> {
        try {
            // Validate request
            const validatedRequest = notificationRequestSchema.parse(request);

            // Get user preferences
            const preferences = await this.getUserNotificationPreferences(request.userId);

            // Apply smart filtering
            if (!this.shouldSendNotification(validatedRequest, preferences)) {
                return {
                    success: false,
                    channels: [],
                    filtered: true,
                    reason: 'Filtered by user preferences or smart filter'
                };
            }

            // Handle immediate vs batched delivery
            if (preferences.frequency === 'immediate') {
                const result = await this.processNotificationImmediate(validatedRequest, preferences);
                return {
                    success: true,
                    channels: result.channels,
                    filtered: false
                };
            } else {
                await this.batchNotification(validatedRequest, preferences);
                return {
                    success: true,
                    channels: ['batched'],
                    filtered: false
                };
            }

        } catch (error) {
            logger.error('Error sending advanced notification:', { component: 'SimpleTool' }, error);
            return {
                success: false,
                channels: [],
                filtered: false,
                reason: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Process notification immediately across all channels
     */
    private async processNotificationImmediate(
        request: NotificationRequest,
        preferences: NotificationPreference
    ): Promise<{ channels: string[]; results: Array<{ channel: string; success: boolean }> }> {
        const channels = request.channels || preferences.channels
            .filter(ch => ch.enabled)
            .map(ch => ch.type);

        const results: Array<{ channel: string; success: boolean }> = [];

        // Process each channel
        for (const channel of channels) {
            try {
                switch (channel) {
                    case 'in_app':
                        await this.sendInAppNotification(request);
                        results.push({ channel, success: true });
                        break;
                    case 'email':
                        await this.sendEmailNotification(request, preferences);
                        results.push({ channel, success: true });
                        break;
                    case 'push':
                        await this.sendPushNotification(request);
                        results.push({ channel, success: true });
                        break;
                    case 'sms':
                        await this.sendSMSNotification(request);
                        results.push({ channel, success: true });
                        break;
                }
            } catch (error) {
                console.error(`Error sending ${channel} notification:`, error);
                results.push({ channel, success: false });
            }
        }

        console.log(`📱 Processed advanced notification for user ${request.userId} across ${channels.length} channels`);
        return { channels, results };
    }

    /**
     * Send in-app notification
     */
    private async sendInAppNotification(request: NotificationRequest): Promise<void> {
        try {
            // Store in database
            await db.insert(notifications).values({
                userId: request.userId,
                type: request.type,
                title: request.title,
                message: request.message,
                relatedBillId: request.data?.billId,
                isRead: false,
                createdAt: new Date()
            });

            // Send via WebSocket if user is connected
            webSocketService.sendUserNotification(request.userId, {
                type: request.type,
                title: request.title,
                message: request.message,
                data: request.data
            });
        } catch (error) {
            logger.error('Error sending in-app notification:', { component: 'SimpleTool' }, error);
            throw error;
        }
    }

    /**
     * Send email notification with template support
     */
    private async sendEmailNotification(
        request: NotificationRequest,
        preferences: NotificationPreference
    ): Promise<void> {
        if (!this.emailTransporter) {
            throw new Error('Email transporter not configured');
        }

        // Get user profile for email
        const userProfile = await userPreferencesService.getUserPreferences(request.userId);
        if (!userProfile.email) {
            throw new Error('User email not found');
        }

        // Render template if specified
        let subject = request.title;
        let htmlBody = request.message;
        let textBody = request.message;

        if (request.templateId && this.templates.has(request.templateId)) {
            const template = this.templates.get(request.templateId)!;
            subject = this.renderTemplate(template.channels.email.subject, request.templateVariables || {});
            htmlBody = this.renderTemplate(template.channels.email.htmlBody, request.templateVariables || {});
            textBody = this.renderTemplate(template.channels.email.textBody, request.templateVariables || {});
        }

        // Send email
        await this.emailTransporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@simpletool.gov',
            to: userProfile.email,
            subject,
            html: htmlBody,
            text: textBody
        });
    }

    /**
     * Send push notification (placeholder)
     */
    private async sendPushNotification(request: NotificationRequest): Promise<void> {
        console.log(`📲 Push notification sent to user ${request.userId}: ${request.title}`);
        // TODO: Integrate with push notification service (FCM, APNs, etc.)
    }

    /**
     * Send SMS notification (placeholder)
     */
    private async sendSMSNotification(request: NotificationRequest): Promise<void> {
        console.log(`📱 SMS notification sent to user ${request.userId}: ${request.message}`);
        // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    }

    /**
     * Batch notification for later delivery
     */
    private async batchNotification(
        request: NotificationRequest,
        preferences: NotificationPreference
    ): Promise<void> {
        if (!this.batchedNotifications.has(request.userId)) {
            this.batchedNotifications.set(request.userId, []);
        }

        this.batchedNotifications.get(request.userId)!.push(request);
        console.log(`📦 Batched notification for user ${request.userId}`);
    }

    /**
     * Process batched notifications
     */
    private async processBatchedNotifications(): Promise<void> {
        for (const [userId, notifications] of this.batchedNotifications.entries()) {
            if (notifications.length === 0) continue;

            try {
                const preferences = await this.getUserNotificationPreferences(userId);
                
                if (!this.shouldSendBatchedNotifications(preferences)) {
                    continue;
                }

                // Create batched notification
                const batchedRequest: NotificationRequest = {
                    userId,
                    type: 'batched_notifications',
                    title: `You have ${notifications.length} new notifications`,
                    message: `Summary of your recent bill updates and activities`,
                    data: {
                        notifications: notifications.map(n => ({
                            type: n.type,
                            title: n.title,
                            message: n.message,
                            data: n.data
                        })),
                        count: notifications.length
                    },
                    priority: 'normal'
                };

                await this.processNotificationImmediate(batchedRequest, preferences);
                this.batchedNotifications.set(userId, []);

                console.log(`📬 Sent batched notification to user ${userId} with ${notifications.length} updates`);

            } catch (error) {
                console.error(`Error processing batched notifications for user ${userId}:`, error);
            }
        }
    }

    /**
     * Get user notification preferences
     */
    private async getUserNotificationPreferences(userId: string): Promise<NotificationPreference> {
        try {
            const userPreferences = await userPreferencesService.getUserPreferences(userId);
            
            return {
                userId,
                channels: [
                    { type: 'in_app', enabled: true, config: {} },
                    { type: 'email', enabled: userPreferences.emailNotifications ?? true, config: {} },
                    { type: 'push', enabled: userPreferences.pushNotifications ?? true, config: {} },
                    { type: 'sms', enabled: userPreferences.smsNotifications ?? false, config: {} }
                ],
                frequency: userPreferences.notificationFrequency || 'immediate',
                categories: userPreferences.billCategories || [],
                quietHours: {
                    enabled: false,
                    startTime: '22:00',
                    endTime: '08:00',
                    timezone: 'UTC'
                },
                filters: {
                    billCategories: userPreferences.billCategories || [],
                    statusChanges: [],
                    minimumEngagement: 0
                }
            };
        } catch (error) {
            console.error(`Error getting notification preferences for user ${userId}:`, error);
            
            // Return default preferences
            return {
                userId,
                channels: [
                    { type: 'in_app', enabled: true, config: {} },
                    { type: 'email', enabled: true, config: {} },
                    { type: 'push', enabled: true, config: {} },
                    { type: 'sms', enabled: false, config: {} }
                ],
                frequency: 'immediate',
                categories: [],
                quietHours: {
                    enabled: false,
                    startTime: '22:00',
                    endTime: '08:00',
                    timezone: 'UTC'
                },
                filters: {
                    billCategories: [],
                    statusChanges: [],
                    minimumEngagement: 0
                }
            };
        }
    }

    /**
     * Smart filtering logic
     */
    private shouldSendNotification(
        request: NotificationRequest,
        preferences: NotificationPreference
    ): boolean {
        // Check if user has enabled channels
        const hasEnabledChannels = preferences.channels.some(ch => ch.enabled);
        if (!hasEnabledChannels) return false;

        // Check category filters
        if (preferences.categories.length > 0 && request.data?.category) {
            if (!preferences.categories.includes(request.data.category)) {
                return false;
            }
        }

        // Check quiet hours
        if (preferences.quietHours.enabled) {
            const now = new Date();
            const currentTime = now.getHours() * 100 + now.getMinutes();
            const startTime = this.parseTime(preferences.quietHours.startTime);
            const endTime = this.parseTime(preferences.quietHours.endTime);

            if (startTime <= endTime) {
                if (currentTime >= startTime && currentTime <= endTime) {
                    return false;
                }
            } else {
                if (currentTime >= startTime || currentTime <= endTime) {
                    return false;
                }
            }
        }

        return true;
    }

    private shouldSendBatchedNotifications(preferences: NotificationPreference): boolean {
        const now = new Date();
        
        switch (preferences.frequency) {
            case 'hourly':
                return now.getMinutes() < 5;
            case 'daily':
                return now.getHours() === 9 && now.getMinutes() < 5;
            case 'weekly':
                return now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() < 5;
            default:
                return false;
        }
    }

    private parseTime(timeStr: string): number {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 100 + minutes;
    }

    private renderTemplate(template: string, variables: Record<string, string>): string {
        let rendered = template;
        for (const [key, value] of Object.entries(variables)) {
            rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return rendered;
    }

    /**
     * Process notification queue
     */
    private async processNotificationQueue(): Promise<void> {
        if (this.processingQueue.length === 0) return;

        const batch = this.processingQueue.splice(0, 10); // Process 10 at a time
        
        for (const request of batch) {
            try {
                await this.sendNotification(request);
            } catch (error) {
                logger.error('Error processing queued notification:', { component: 'SimpleTool' }, error);
            }
        }
    }

    /**
     * Add notification to processing queue
     */
    async queueNotification(request: NotificationRequest): Promise<void> {
        this.processingQueue.push(request);
        console.log(`📥 Queued notification for user ${request.userId}`);
    }

    /**
     * Get service status
     */
    getStatus(): {
        initialized: boolean;
        emailConfigured: boolean;
        templatesLoaded: number;
        queueSize: number;
        batchedUsers: number;
        name: string;
        description: string;
    } {
        return {
            initialized: this.isInitialized,
            emailConfigured: this.emailTransporter !== null,
            templatesLoaded: this.templates.size,
            queueSize: this.processingQueue.length,
            batchedUsers: this.batchedNotifications.size,
            name: 'Advanced Notification Service',
            description: 'Multi-channel notification service with smart filtering, batching, and templates'
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup(): Promise<void> {
        logger.info('🧹 Cleaning up Advanced Notification Service...', { component: 'SimpleTool' });
        
        // Stop processing intervals
        this.stopNotificationProcessing();
        
        // Close email transporter
        if (this.emailTransporter) {
            this.emailTransporter.close();
            this.emailTransporter = null;
        }
        
        // Clear queues and caches
        this.processingQueue = [];
        this.batchedNotifications.clear();
        this.templates.clear();
        
        this.isInitialized = false;
        logger.info('✅ Advanced Notification Service cleanup completed', { component: 'SimpleTool' });
    }
}

// Export singleton instance
export const advancedNotificationService = new AdvancedNotificationService();

// Export for backward compatibility
export { advancedNotificationService as notificationService };






