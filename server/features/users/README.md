# Users Feature Module

**Status:**
- Code Health: 95% ✅ — Excellent DDD structure, comprehensive validation
- Feature Completeness: 90% ✅ — Full auth, profiles, preferences, verification
- Launch Priority: Critical — Must-have for launch

## Overview

The Users module handles all user-related functionality including authentication, profiles, preferences, verification, and engagement tracking. It follows full Domain-Driven Design (DDD) architecture with robust security and validation.

## Purpose

- User authentication (email/password, OAuth)
- User profile management
- User preferences and settings
- Citizen and expert verification
- Engagement tracking (comments, votes, bill interactions)
- User search and discovery

## Architecture

### DDD Structure

```
users/
├── domain/              # Business logic
│   ├── entities/       # User, Profile, Verification entities
│   ├── services/       # Domain services
│   └── repositories/   # Repository interfaces
├── application/         # Use cases
│   ├── services/       # Application services
│   ├── use-cases/      # Specific use cases
│   └── middleware/     # Auth middleware
├── infrastructure/      # External services
│   ├── repositories/   # Data access
│   ├── email-service.ts
│   └── notification-service.ts
└── presentation/        # HTTP layer
    └── http/           # Route handlers
```

## API Endpoints

### Profile Management

**GET /api/users/me/complete**
- Get complete user profile with all details
- Returns: User profile, preferences, verification status, engagement stats
- Auth: Required

**GET /api/users/me/preferences**
- Get user preferences
- Returns: Notification settings, language, theme, etc.
- Auth: Required

**PATCH /api/users/me/preferences**
- Update user preferences
- Body: Preference updates
- Returns: Updated preferences
- Auth: Required

**PATCH /api/users/me/interests**
- Update user interests (bill tags, topics)
- Body: Array of interest tags
- Returns: Updated interests
- Auth: Required

### Verification

**GET /api/users/me/verification**
- Get current user's verification status
- Returns: Verification level, documents, status
- Auth: Required

**PATCH /api/users/me/verification**
- Submit verification request
- Body: Verification type, documents
- Returns: Verification request status
- Auth: Required

**POST /api/users/verification**
- Create new verification request (admin)
- Body: User ID, verification type, documents
- Returns: Created verification request
- Auth: Required (admin)

**PUT /api/users/verification/:id**
- Update verification request status (admin)
- Body: Status, notes
- Returns: Updated verification
- Auth: Required (admin)

**DELETE /api/users/verification/:id**
- Delete verification request (admin)
- Returns: Success confirmation
- Auth: Required (admin)

**GET /api/users/verification/bills/:bill_id**
- Get verified users for a bill
- Returns: Array of verified users who engaged with bill
- Auth: Not required

**GET /api/users/verification/stats**
- Get verification statistics
- Returns: Total verified, pending, rejected counts
- Auth: Required (admin)

**GET /api/users/verification/user/:citizen_id**
- Get verification status by citizen ID
- Returns: Verification details
- Auth: Required (admin)

### Engagement Tracking

**GET /api/users/me/engagement**
- Get user's engagement history
- Returns: Comments, votes, bills followed, activity timeline
- Auth: Required

**POST /api/users/me/engagement/:bill_id**
- Track engagement with a bill
- Body: Engagement type (view, comment, vote, share)
- Returns: Updated engagement record
- Auth: Required

### User Discovery

**GET /api/users/search/:query**
- Search for users by name or username
- Returns: Array of matching user profiles
- Auth: Not required

**GET /api/users/:user_id**
- Get public profile of any user
- Returns: Public user profile
- Auth: Not required

**GET /api/users/:user_id/profile**
- Get detailed profile of any user
- Returns: Detailed public profile
- Auth: Not required

### Legacy Compatibility

**GET /api/users/profile**
- Alias for /me (backward compatibility)
- Returns: Current user profile
- Auth: Required

**GET /api/users/preferences**
- Alias for /me/preferences
- Returns: Current user preferences
- Auth: Required

**PUT /api/users/preferences**
- Alias for PATCH /me/preferences
- Body: Preference updates
- Returns: Updated preferences
- Auth: Required

## Database Tables

### Primary Tables (Owned by Users Module)

**users**
- `id` (PK) — User identifier
- `email` — Email address (unique)
- `username` — Username (unique)
- `password_hash` — Hashed password
- `first_name`, `last_name` — User name
- `avatar_url` — Profile picture URL
- `bio` — User biography
- `role` — User role (citizen, expert, moderator, admin)
- `is_verified` — Email verification status
- `verification_level` — Verification level (none, citizen, expert)
- `created_at`, `updated_at` — Timestamps

**user_preferences**
- `id` (PK) — Preference identifier
- `user_id` (FK) — References users.id
- `language` — Preferred language (en, sw)
- `theme` — UI theme (light, dark, auto)
- `email_notifications` — Email notification settings (JSON)
- `push_notifications` — Push notification settings (JSON)
- `privacy_settings` — Privacy settings (JSON)
- `created_at`, `updated_at` — Timestamps

**user_interests**
- `id` (PK) — Interest identifier
- `user_id` (FK) — References users.id
- `tag` — Interest tag (healthcare, education, etc.)
- `created_at` — Timestamp

**user_verifications**
- `id` (PK) — Verification identifier
- `user_id` (FK) — References users.id
- `verification_type` — Type (citizen, expert)
- `status` — Status (pending, approved, rejected)
- `documents` — Verification documents (JSON)
- `verified_by` (FK) — References users.id (admin who verified)
- `notes` — Admin notes
- `created_at`, `updated_at` — Timestamps

**user_engagement**
- `id` (PK) — Engagement identifier
- `user_id` (FK) — References users.id
- `bill_id` (FK) — References bills.id
- `engagement_type` — Type (view, comment, vote, share, follow)
- `metadata` — Additional data (JSON)
- `created_at` — Timestamp

### Shared Tables (Read Access)

- **bills** — Bill information for engagement tracking
- **bill_comments** — User comments on bills
- **constituencies** — Constituency data for citizen verification

## Dependencies

### Internal Dependencies

- **@shared/types** — Shared TypeScript types
- **@shared/db** — Database client
- **@shared/core** — Validation, observability
- **bills feature** — Bill engagement tracking
- **notifications feature** — User notifications

### External Dependencies

- **PostgreSQL** — Primary data store
- **Redis** — Session storage
- **bcrypt** — Password hashing
- **jsonwebtoken** — JWT authentication
- **nodemailer** — Email service

## Configuration

### Environment Variables

```env
# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=7d
SESSION_SECRET=your_session_secret_here

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
FROM_EMAIL=noreply@chanuka.ke

# Verification
ENABLE_CITIZEN_VERIFICATION=true
ENABLE_EXPERT_VERIFICATION=true
VERIFICATION_DOCUMENT_UPLOAD_PATH=/uploads/verification
```

### Feature Flags

- `citizen-verification` — Enable citizen verification
- `expert-verification` — Enable expert verification
- `oauth-google` — Enable Google OAuth
- `oauth-github` — Enable GitHub OAuth

## Key Services

### UserService (`application/UserService.ts`)

Primary user management service:
- `createUser(data)` — Create new user
- `getUserById(id)` — Get user by ID
- `getUserByEmail(email)` — Get user by email
- `updateUser(id, data)` — Update user
- `deleteUser(id)` — Soft delete user
- `authenticateUser(email, password)` — Authenticate user

### UserProfileService (`application/UserProfileService.ts`)

Profile management:
- `getCompleteProfile(userId)` — Get full profile
- `updateProfile(userId, data)` — Update profile
- `updatePreferences(userId, prefs)` — Update preferences
- `updateInterests(userId, interests)` — Update interests

### VerificationService (`application/VerificationService.ts`)

Verification management:
- `submitVerification(userId, type, docs)` — Submit verification
- `approveVerification(verificationId, adminId)` — Approve verification
- `rejectVerification(verificationId, adminId, reason)` — Reject verification
- `getVerificationStatus(userId)` — Get verification status

### ExpertVerificationService (`domain/ExpertVerificationService.ts`)

Expert verification logic:
- `verifyExpertCredentials(userId, credentials)` — Verify expert credentials
- `validateExpertise(userId, domain)` — Validate expertise in domain
- `getExpertProfile(userId)` — Get expert profile

## Domain Events

- `UserCreated` — New user registered
- `UserVerified` — User verification approved
- `UserPreferencesUpdated` — User preferences changed
- `UserEngaged` — User engaged with content

## Testing

### Test Coverage

- Unit tests: Domain services, validation
- Integration tests: `__tests__/UserService.integration.test.ts`
- E2E tests: `tests/e2e/auth.spec.ts`, `tests/e2e/profile.spec.ts`

### Running Tests

```bash
# Unit tests
pnpm --filter @chanuka/server test users

# Integration tests
pnpm --filter @chanuka/server test:integration users
```

## Security

### Password Security

- Passwords hashed with bcrypt (10 rounds)
- Minimum password length: 8 characters
- Password complexity requirements enforced

### Authentication

- JWT tokens with 7-day expiration
- Refresh token rotation
- Session management with Redis
- Rate limiting on auth endpoints

### Authorization

- Role-based access control (RBAC)
- Middleware: `authenticateToken`, `requireRole`
- Admin-only endpoints protected

### Data Privacy

- PII encrypted at rest
- GDPR compliance (data export, deletion)
- Privacy settings respected

## Common Use Cases

### 1. User Registration

```typescript
import { userService } from '@server/features/users';

const user = await userService.createUser({
  email: 'user@example.com',
  password: 'securePassword123',
  username: 'johndoe',
  firstName: 'John',
  lastName: 'Doe'
});
```

### 2. User Authentication

```typescript
const { user, token } = await userService.authenticateUser(
  'user@example.com',
  'securePassword123'
);
```

### 3. Update Preferences

```typescript
import { userProfileService } from '@server/features/users';

await userProfileService.updatePreferences(userId, {
  language: 'sw',
  emailNotifications: {
    billUpdates: true,
    comments: false
  }
});
```

### 4. Submit Verification

```typescript
import { verificationService } from '@server/features/users';

await verificationService.submitVerification(userId, 'citizen', {
  idNumber: '12345678',
  idDocument: 'path/to/id.pdf'
});
```

## Troubleshooting

### "Invalid credentials" errors

Check password hash matches and user exists.

### "Token expired" errors

Refresh token or re-authenticate user.

### Verification not processing

Check `ENABLE_CITIZEN_VERIFICATION` feature flag.

### Email not sending

Verify SMTP configuration in environment variables.

## Future Enhancements

- [ ] Two-factor authentication (2FA)
- [ ] Social login (Twitter/X, Facebook)
- [ ] Biometric authentication
- [ ] Advanced privacy controls
- [ ] User reputation system
- [ ] Expert badge system

## Related Documentation

- [Authentication Guide](../../docs/guides/authentication.md)
- [Security Documentation](../../docs/security/)
- [API Documentation](../../docs/api-client-guide.md)

---

**Maintainer:** Users team  
**Last Updated:** March 6, 2026
