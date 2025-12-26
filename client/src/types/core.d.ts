export type UserRole = 'citizen' | 'expert' | 'official' | 'admin' | 'moderator';
export type CommentStatus = 'active' | 'hidden' | 'removed' | 'under_review';
export interface Sponsor {
    id: string;
    name: string;
    party: string;
    district?: string;
    position: string;
    isPrimary?: boolean;
    state?: string;
}
export interface BillAnalysis {
    billId: string;
    summary: string;
    impactAssessment: string;
    controversyAnalysis: string;
    plainLanguageSummary: string;
    keyPoints: string[];
}
export interface EngagementMetrics {
    billId: string;
    views: number;
    comments: number;
    shares: number;
    saves: number;
    timestamp: string;
}
export interface UserPreferences {
    notifications: boolean;
    emailAlerts: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
}
export interface PrivacySettings {
    profileVisibility: 'public' | 'registered' | 'private';
    emailVisibility: 'public' | 'registered' | 'private';
    activityTracking: boolean;
    analyticsConsent: boolean;
    marketingConsent: boolean;
    dataSharingConsent: boolean;
    locationTracking: boolean;
    personalizedContent: boolean;
    thirdPartyIntegrations: boolean;
    notificationPreferences: NotificationPreferences;
}
export interface NotificationPreferences {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    billUpdates: boolean;
    commentReplies: boolean;
    expertInsights: boolean;
    securityAlerts: boolean;
    privacyUpdates: boolean;
}
export interface ConsentRecord {
    id: string;
    consentType: 'analytics' | 'marketing' | 'data_sharing' | 'cookies' | 'location';
    granted: boolean;
    grantedAt: string;
    withdrawnAt: string | null;
    version: string;
    ipAddress: string;
    userAgent: string;
}
export interface Bill {
    id: string;
    title: string;
    summary: string;
    status: string;
    category: string;
    introducedDate: string;
    lastActionDate: string;
    sponsors: Sponsor[];
    comments: Comment[];
    analysis?: BillAnalysis;
    trackingCount?: number;
    engagementMetrics?: EngagementMetrics;
}
export interface Comment {
    id: string;
    billId: string;
    parentId?: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    editedAt?: string;
    upvotes: number;
    downvotes: number;
    status: CommentStatus;
    qualityScore: number;
    isExpertComment: boolean;
}
export interface User {
    id: string;
    email: string;
    name: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    verified: boolean;
    twoFactorEnabled: boolean;
    avatarUrl?: string;
    preferences: UserPreferences;
    permissions: string[];
    lastLogin: string;
    createdAt: string;
    privacySettings?: PrivacySettings;
    consentGiven?: ConsentRecord[];
}
export declare const logger: Console;
//# sourceMappingURL=core.d.ts.map