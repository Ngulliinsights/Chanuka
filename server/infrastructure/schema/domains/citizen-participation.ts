// ============================================================================
// DOMAIN EXPORTS - Citizen Participation Schema
// ============================================================================
// Granular import path to avoid loading entire schema
// Usage: import { comments, bills_votes } from '@/shared/schema/domains/citizen-participation'

export {
  user_interests,
  sessions,
  comments,
  comment_votes,
  bill_votes,
  bill_engagement,
  bill_tracking_preferences,
  notifications,
  alert_preferences,
  user_contact_methods,
  userInterestsRelations,
  sessionsRelations,
  commentsRelations,
  commentVotesRelations,
  billVotesRelations,
  billEngagementRelations,
  billTrackingPreferencesRelations,
  notificationsRelations,
  alertPreferencesRelations,
  userContactMethodsRelations
} from "./citizen_participation";

export type {
  UserInterest,
  NewUserInterest,
  Session,
  NewSession,
  Comment,
  NewComment,
  CommentVote,
  NewCommentVote,
  BillVote,
  NewBillVote,
  BillEngagement,
  NewBillEngagement,
  BillTrackingPreference,
  NewBillTrackingPreference,
  Notification,
  NewNotification,
  AlertPreference,
  NewAlertPreference,
  UserContactMethod,
  NewUserContactMethod
} from "./citizen_participation";
