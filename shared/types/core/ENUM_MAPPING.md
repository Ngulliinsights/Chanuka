# Enum Mapping Guide

## Overview

This document provides a comprehensive mapping between TypeScript enums (shared layer) and PostgreSQL enums (database layer). All enums follow a consistent naming convention:

- **TypeScript**: PascalCase enum names, PascalCase values (e.g., `UserRole.Admin`)
- **PostgreSQL**: snake_case enum names, snake_case values (e.g., `user_role` type with `'admin'` value)

## Single Source of Truth

**IMPORTANT**: All enums are defined in two canonical locations:

1. **TypeScript Enums**: `shared/types/core/enums.ts`
2. **Database Enums**: `server/infrastructure/schema/enum.ts`

Do NOT redefine enums elsewhere in the codebase. Import from these locations.

## Enum Mappings

### User & Authentication

#### UserRole
| TypeScript | Database | Description |
|------------|----------|-------------|
| `UserRole.Public` | `'public'` | Public user - read-only access |
| `UserRole.Citizen` | `'citizen'` | Registered citizen - can comment and vote |
| `UserRole.VerifiedCitizen` | `'verified_citizen'` | Verified citizen with enhanced privileges |
| `UserRole.Ambassador` | `'ambassador'` | Community representative |
| `UserRole.Expert` | `'expert'` | Expert user - can provide expert analysis |
| `UserRole.ExpertVerifier` | `'expert_verifier'` | Can verify expert credentials |
| `UserRole.MpStaff` | `'mp_staff'` | MP staff member |
| `UserRole.Clerk` | `'clerk'` | Parliamentary clerk |
| `UserRole.Moderator` | `'moderator'` | Can moderate content |
| `UserRole.Admin` | `'admin'` | Full system access |
| `UserRole.Auditor` | `'auditor'` | Can audit system activities |
| `UserRole.Journalist` | `'journalist'` | Media access |

#### AnonymityLevel
| TypeScript | Database | Description |
|------------|----------|-------------|
| `AnonymityLevel.Public` | `'public'` | Full identity visible |
| `AnonymityLevel.VerifiedPseudonym` | `'verified_pseudonym'` | Verified pseudonym |
| `AnonymityLevel.Anonymous` | `'anonymous'` | Full anonymity |

#### VerificationStatus
| TypeScript | Database | Description |
|------------|----------|-------------|
| `VerificationStatus.Unverified` | `'unverified'` | Not verified |
| `VerificationStatus.Pending` | `'pending'` | Verification pending |
| `VerificationStatus.InProgress` | `'in_progress'` | Verification in progress |
| `VerificationStatus.NeedsReview` | `'needs_review'` | Needs review |
| `VerificationStatus.Verified` | `'verified'` | Successfully verified |
| `VerificationStatus.Approved` | `'approved'` | Approved (alias for Verified) |
| `VerificationStatus.Failed` | `'failed'` | Verification failed |
| `VerificationStatus.Rejected` | `'rejected'` | Verification rejected |
| `VerificationStatus.Disputed` | `'disputed'` | Verification disputed |

### Legislative Process

#### BillStatus
| TypeScript | Database | Description |
|------------|----------|-------------|
| `BillStatus.Draft` | `'draft'` | Bill is in draft state |
| `BillStatus.Introduced` | `'introduced'` | Bill has been introduced |
| `BillStatus.FirstReading` | `'first_reading'` | Introduction and title reading |
| `BillStatus.SecondReading` | `'second_reading'` | Debate on general principles |
| `BillStatus.InCommittee` | `'in_committee'` | Bill is in committee review |
| `BillStatus.CommitteeStage` | `'committee_stage'` | Detailed examination clause by clause |
| `BillStatus.ThirdReading` | `'third_reading'` | Final debate and vote |
| `BillStatus.ScheduledForVote` | `'scheduled_for_vote'` | Scheduled for floor vote |
| `BillStatus.Passed` | `'passed'` | Bill passed in one chamber |
| `BillStatus.PresidentialAssent` | `'presidential_assent'` | Approval by the President |
| `BillStatus.Enacted` | `'enacted'` | Bill became law |
| `BillStatus.Gazetted` | `'gazetted'` | Published in the Kenya Gazette |
| `BillStatus.Rejected` | `'rejected'` | Bill was rejected |
| `BillStatus.Lost` | `'lost'` | Bill was lost |
| `BillStatus.Vetoed` | `'vetoed'` | Bill was vetoed |
| `BillStatus.Withdrawn` | `'withdrawn'` | Bill is withdrawn |

#### Chamber
| TypeScript | Database | Description |
|------------|----------|-------------|
| `Chamber.NationalAssembly` | `'national_assembly'` | National Assembly |
| `Chamber.Senate` | `'senate'` | Senate |
| `Chamber.CountyAssembly` | `'county_assembly'` | County Assembly |
| `Chamber.Both` | `'both'` | Both chambers (bicameral) |

#### VoteType
| TypeScript | Database | Description |
|------------|----------|-------------|
| `VoteType.Aye` | `'aye'` | Vote in favor |
| `VoteType.Nay` | `'nay'` | Vote against |
| `VoteType.Abstain` | `'abstain'` | Abstain from voting |
| `VoteType.Absent` | `'absent'` | Absent from vote |

### Engagement & Interaction

#### ArgumentPosition
| TypeScript | Database | Description |
|------------|----------|-------------|
| `ArgumentPosition.Support` | `'support'` | Support the bill |
| `ArgumentPosition.Oppose` | `'oppose'` | Oppose the bill |
| `ArgumentPosition.Neutral` | `'neutral'` | Neutral stance |
| `ArgumentPosition.Conditional` | `'conditional'` | Conditional support/opposition |

#### BillVoteType
| TypeScript | Database | Description |
|------------|----------|-------------|
| `BillVoteType.Support` | `'support'` | Support the bill |
| `BillVoteType.Oppose` | `'oppose'` | Oppose the bill |
| `BillVoteType.Amend` | `'amend'` | Suggest amendments |

#### CommentStatus
| TypeScript | Database | Description |
|------------|----------|-------------|
| `CommentStatus.Active` | `'active'` | Comment is active |
| `CommentStatus.Flagged` | `'flagged'` | Flagged for review |
| `CommentStatus.Hidden` | `'hidden'` | Comment is hidden |
| `CommentStatus.Deleted` | `'deleted'` | Comment is deleted |

#### ModerationStatus
| TypeScript | Database | Description |
|------------|----------|-------------|
| `ModerationStatus.Pending` | `'pending'` | Pending moderation |
| `ModerationStatus.Approved` | `'approved'` | Approved by moderator |
| `ModerationStatus.Rejected` | `'rejected'` | Rejected by moderator |
| `ModerationStatus.FlaggedForReview` | `'flagged_for_review'` | Flagged for review |
| `ModerationStatus.AutoModerated` | `'auto_moderated'` | Auto-moderated by system |

### Argument Intelligence

#### JobStatus
| TypeScript | Database | Description |
|------------|----------|-------------|
| `JobStatus.Pending` | `'pending'` | Job is pending execution |
| `JobStatus.Processing` | `'processing'` | Job is currently processing |
| `JobStatus.Completed` | `'completed'` | Job completed successfully |
| `JobStatus.Failed` | `'failed'` | Job failed |

#### RelationshipType
| TypeScript | Database | Description |
|------------|----------|-------------|
| `RelationshipType.Supports` | `'supports'` | Argument supports another |
| `RelationshipType.Contradicts` | `'contradicts'` | Argument contradicts another |
| `RelationshipType.Clarifies` | `'clarifies'` | Argument clarifies another |
| `RelationshipType.Expands` | `'expands'` | Argument expands on another |

### System & Audit

#### PayloadType
| TypeScript | Database | Description |
|------------|----------|-------------|
| `PayloadType.ActionDetails` | `'action_details'` | Action details payload |
| `PayloadType.ResourceUsage` | `'resource_usage'` | Resource usage payload |

#### Priority
| TypeScript | Database | Description |
|------------|----------|-------------|
| `Priority.Low` | `'low'` | Low priority |
| `Priority.Normal` | `'normal'` | Normal priority |
| `Priority.High` | `'high'` | High priority |
| `Priority.Urgent` | `'urgent'` | Urgent priority |

#### Severity
| TypeScript | Database | Description |
|------------|----------|-------------|
| `Severity.Info` | `'info'` | Informational |
| `Severity.Low` | `'low'` | Low severity |
| `Severity.Medium` | `'medium'` | Medium severity |
| `Severity.High` | `'high'` | High severity |
| `Severity.Critical` | `'critical'` | Critical severity |

### Error Handling

#### ErrorClassification
| TypeScript | Database | Description |
|------------|----------|-------------|
| `ErrorClassification.Validation` | N/A | Validation error (400) |
| `ErrorClassification.Authorization` | N/A | Authorization error (401, 403) |
| `ErrorClassification.Server` | N/A | Server error (500) |
| `ErrorClassification.Network` | N/A | Network error (503, timeout) |

**Note**: Error enums are TypeScript-only and not stored in the database.

## Usage Examples

### TypeScript (Application Code)

```typescript
import { UserRole, BillStatus, ArgumentPosition } from '@/shared/types/core/enums';

// Using enum values
const role: UserRole = UserRole.Citizen;
const status: BillStatus = BillStatus.FirstReading;
const position: ArgumentPosition = ArgumentPosition.Support;

// Type-safe comparisons
if (user.role === UserRole.Admin) {
  // Admin-only logic
}

// Validation
import { isValidUserRole } from '@/shared/types/core/enums';
if (isValidUserRole(inputValue)) {
  // Value is valid
}
```

### Database Schema (Drizzle)

```typescript
import { userRoleEnum, billStatusEnum, argumentPositionEnum } from '@/server/infrastructure/schema/enum';
import { pgTable, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  role: userRoleEnum('role').notNull().default('citizen'),
});

export const bills = pgTable('bills', {
  id: uuid('id').primaryKey(),
  status: billStatusEnum('status').notNull().default('draft'),
});

export const arguments = pgTable('arguments', {
  id: uuid('id').primaryKey(),
  position: argumentPositionEnum('position').notNull(),
});
```

### Database Queries

```typescript
import { eq } from 'drizzle-orm';
import { users } from '@/server/infrastructure/schema/foundation';
import { UserRole } from '@/shared/types/core/enums';

// Query using enum value
const admins = await db
  .select()
  .from(users)
  .where(eq(users.role, 'admin')); // Use string literal in queries

// Transform to TypeScript enum
const userRole: UserRole = UserRole.Admin; // Use enum in application logic
```

## Migration Strategy

When adding new enum values:

1. **Add to TypeScript enum** in `shared/types/core/enums.ts`
2. **Add to Database enum** in `server/infrastructure/schema/enum.ts`
3. **Create migration** to add value to PostgreSQL enum:
   ```sql
   ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'new_value';
   ```
4. **Update validation schemas** if using Zod or similar
5. **Update documentation** in this file

## Validation

Use the provided validation functions:

```typescript
import { 
  isValidUserRole, 
  isValidBillStatus, 
  isValidChamber,
  isEnumValue 
} from '@/shared/types/core/enums';

// Specific validators
if (isValidUserRole(value)) {
  // value is UserRoleValue
}

// Generic validator
if (isEnumValue(UserRole, value)) {
  // value is valid UserRole
}
```

## Best Practices

1. **Always import from canonical locations** - Never redefine enums
2. **Use TypeScript enums in application code** - For type safety
3. **Use string literals in database queries** - Drizzle requires this
4. **Validate user input** - Use validation functions
5. **Document new values** - Update this mapping guide
6. **Test migrations** - Always test enum changes in staging first
7. **Consider backwards compatibility** - Enum values cannot be removed in PostgreSQL

## Common Pitfalls

❌ **Don't**: Redefine enums in other files
```typescript
// BAD
export enum UserRole {
  Admin = 'admin',
  User = 'user'
}
```

✅ **Do**: Import from shared location
```typescript
// GOOD
import { UserRole } from '@/shared/types/core/enums';
```

❌ **Don't**: Use enum values directly in database queries
```typescript
// BAD (TypeScript error)
.where(eq(users.role, UserRole.Admin))
```

✅ **Do**: Use string literals in queries
```typescript
// GOOD
.where(eq(users.role, 'admin'))
```

❌ **Don't**: Mix naming conventions
```typescript
// BAD
export enum BillStatus {
  first_reading = 'first_reading', // Should be PascalCase
}
```

✅ **Do**: Follow conventions
```typescript
// GOOD
export enum BillStatus {
  FirstReading = 'first_reading', // PascalCase key, snake_case value
}
```

## Troubleshooting

### Enum value not found in database

**Problem**: `ERROR: invalid input value for enum`

**Solution**: Run the enum alignment migration:
```bash
npm run db:migrate
```

### Type mismatch between TypeScript and database

**Problem**: TypeScript shows enum value but database rejects it

**Solution**: 
1. Check if value exists in both `shared/types/core/enums.ts` and `server/infrastructure/schema/enum.ts`
2. Verify migration has been applied
3. Check for typos in enum values

### Cannot remove enum value

**Problem**: Need to remove an enum value from PostgreSQL

**Solution**: PostgreSQL doesn't support removing enum values. Options:
1. Mark as deprecated in documentation
2. Create new enum type and migrate data (requires downtime)
3. Leave value but don't use it in new code

## References

- TypeScript Enums: `shared/types/core/enums.ts`
- Database Enums: `server/infrastructure/schema/enum.ts`
- Enum Alignment Migration: `drizzle/20260211_enum_alignment.sql`
- Enum Audit Report: `scripts/enum-alignment-audit.md`
