// Barrel exports for shared/schema
export * from "./schema";
export * from "./enum";
export * from "./validation";

// Export types explicitly to avoid conflicts
export type {
  UserDto, UserProfileDto, BillDto, SponsorDto, AnalysisDto, 
  StakeholderDto, NotificationDto, ComplianceCheckDto, 
  SocialShareDto, VerificationDto, UserRow, User, UserProfileRow, 
  UserProfile, BillRow, Bill
} from "./types";

// Note: `searchVector` column is represented as text in TypeScript schema
// and the true tsvector column + GIN index are created via SQL migrations.
export * from "./searchVectorMigration";





































