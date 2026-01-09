// ============================================================================
// DOMAIN EXPORTS - Foundation Schema
// ============================================================================
// Granular import path to avoid loading entire schema
// Usage: import { users, bills } from '@/shared/schema/domains/foundation'

export {
  users,
  user_profiles,
  sponsors,
  committees,
  committee_members,
  parliamentary_sessions,
  parliamentary_sittings,
  bills,
  oauth_providers,
  oauth_tokens,
  user_sessions,
  usersRelations,
  userProfilesRelations,
  sponsorsRelations,
  committeesRelations,
  committeeMembersRelations,
  parliamentarySessionsRelations,
  parliamentarySittingsRelations,
  billsRelations,
  oauthProvidersRelations,
  oauthTokensRelations,
  userSessionsRelations
} from "./foundation";

export type {
  User,
  NewUser,
  UserProfile,
  NewUserProfile,
  Sponsor,
  NewSponsor,
  Committee,
  NewCommittee,
  CommitteeMember,
  NewCommitteeMember,
  ParliamentarySession,
  NewParliamentarySession,
  ParliamentarySitting,
  NewParliamentarySitting,
  Bill,
  NewBill,
  OAuthProvider,
  NewOAuthProvider,
  OAuthToken,
  NewOAuthToken,
  UserSession,
  NewUserSession
} from "./foundation";
