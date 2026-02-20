// ============================================================================
// DOMAIN EXPORTS - Foundation Schema
// ============================================================================
// Granular import path to avoid loading entire schema
// Usage: import { users, bills } from '@shared/schema/domains/foundation'
//
// Foundation schema exports include core entities:
// - users: User accounts with authentication and security
// - bills: Legislative bills with metadata and relationships
// - sponsors: Bill sponsors and co-sponsors
// - committees: Parliamentary committees
// - governors: County governors
//
// These are the core "foundation" entities that other domains reference

// Core user exports
export {
  users,
  userRelations,
  UserSchema,
  ValidatedUserType,
  isUser,
  isUserId,
  createUserId,
} from "../integration";

export type {
  User,
  NewUser,
  ValidatedUser,
  UserId,
} from "../integration";

// Extended foundation entities
export {
  bills,
  billRelations,
  sponsors,
  sponsorRelations,
  committees,
  committeeRelations,
  governors,
  governorRelations,
  BillSchema,
  SponsorSchema,
  ValidatedBillType,
  ValidatedSponsorType,
  isBill,
  isSponsor,
  isGovernor,
  isCommittee,
  createBillId,
  createSessionId,
} from "../integration-extended";

export type {
  Bill,
  NewBill,
  ValidatedBill,
  Sponsor,
  NewSponsor,
  ValidatedSponsor,
  Governor,
  NewGovernor,
  Committee,
  NewCommittee,
  BillId,
  SessionId,
  SponsorId,
  CommitteeId,
  LegislatorId,
} from "../integration-extended";
