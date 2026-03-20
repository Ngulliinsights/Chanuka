# Data Flow Pipelines

## Overview

This document provides comprehensive visual and textual documentation of how data flows through the Chanuka Platform's full-stack architecture. It maps the complete journey of data from database through server transformations to client presentation, highlighting all transformation and validation points.

**Purpose**: Enable developers to understand data flow patterns, identify integration points, and maintain consistency across the stack.

**Scope**: Covers major features including user authentication, bill management, comments, and argument intelligence.

**Related Documentation**:
- [Integration Pattern Examples](../guides/integration-pattern-examples.md)
- [Code Organization Standards](../guides/code-organization-standards.md)
- [Architecture Overview](../technical/architecture.md)

---

## Table of Contents

1. [Data Flow Architecture](#data-flow-architecture)
2. [User Authentication Flow](#user-authentication-flow)
3. [Bill Management Flow](#bill-management-flow)
4. [Comment System Flow](#comment-system-flow)
5. [Argument Intelligence Flow](#argument-intelligence-flow)
6. [Transformation Points Reference](#transformation-points-reference)
7. [Validation Points Reference](#validation-points-reference)

---

## Data Flow Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  React Components → Redux State → API Client                    │
│  [Validation: Client-side forms, Zod schemas]                   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/JSON
                    [Transformation: JSON ↔ Domain Types]
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER LAYER                             │
│  Routes → Services → Repositories                                │
│  [Validation: Request validation, Business rules]               │
└─────────────────────────────────────────────────────────────────┘
                              ↕ Drizzle ORM
                    [Transformation: Domain ↔ Database Types]
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                            │
│  PostgreSQL Tables with Constraints                              │
│  [Validation: NOT NULL, CHECK, UNIQUE, FK constraints]          │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │    SHARED LAYER      │
                    │  Types, Validation,  │
                    │  Transformers        │
                    └──────────────────────┘
```

### Data Flow Principles

1. **Single Direction**: Data flows unidirectionally through well-defined boundaries
2. **Type Safety**: TypeScript types enforce contracts at compile time
3. **Runtime Validation**: Zod schemas validate data at layer boundaries
4. **Transformation Consistency**: Shared transformers ensure predictable conversions
5. **Error Propagation**: Errors are transformed to standard format at each layer


---

## User Authentication Flow

### Overview

User authentication demonstrates the complete data flow from user registration/login through token generation and session management.

### Registration Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: User Registration Form                                        │
│ Component: RegisterForm.tsx                                           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. User Input
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 1: Client-Side Form Validation                      │
│ Location: client/src/features/auth/RegisterForm.tsx                  │
│ Schema: CreateUserRequestSchema (Zod)                                │
│ Validates:                                                            │
│   - Email format (RFC 5322)                                           │
│   - Username length (3-100 chars)                                     │
│   - Password strength (min 8 chars)                                   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 2. Valid Input
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: API Call                                                      │
│ Location: client/src/api/auth.api.ts                                 │
│ Method: authApi.register(request)                                    │
│ Type: CreateUserRequest                                              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 3. HTTP POST /api/auth/register
                              │    Content-Type: application/json
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 1: JSON → Request Object                        │
│ Location: Express body parser                                        │
│ Input: JSON string                                                    │
│ Output: JavaScript object                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 4. Request Object
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 2: Server-Side Request Validation                   │
│ Location: server/routes/auth.ts                                      │
│ Schema: CreateUserRequestSchema.parse(req.body)                      │
│ Validates: Same rules as client + server-only checks                 │
│ On Failure: Returns 400 with ValidationError                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 5. Validated Request
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Service Layer                                                │
│ Location: server/services/auth.service.ts                            │
│ Method: authService.register(email, username, password)              │
│ Business Logic:                                                       │
│   - Check email uniqueness                                            │
│   - Check username uniqueness                                         │
│   - Hash password (bcrypt)                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 6. Hashed Credentials
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Repository Layer                                             │
│ Location: server/infrastructure/repositories/user.repository.ts      │
│ Method: userRepository.create(data)                                  │
│ Type: NewUser (Drizzle inferred)                                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 7. INSERT SQL
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 3: Database Constraints                             │
│ Location: PostgreSQL users table                                     │
│ Constraints:                                                          │
│   - id: PRIMARY KEY                                                   │
│   - email: UNIQUE, NOT NULL                                           │
│   - username: UNIQUE, NOT NULL                                        │
│   - role: NOT NULL                                                    │
│   - created_at: NOT NULL, DEFAULT NOW()                               │
│ On Failure: Throws PostgresError (constraint violation)              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 8. Database Row (UserTable)
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 2: Database → Domain Type                       │
│ Location: shared/utils/transformers/user.transformer.ts              │
│ Function: UserDbToDomain.transform(dbUser)                           │
│ Transforms:                                                           │
│   - id: string → UserId (branded)                                     │
│   - role: string → UserRole (enum)                                    │
│   - created_at: timestamp → Date                                      │
│   - updated_at: timestamp → Date                                      │
│ Output: User (domain type)                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 9. Domain User Object
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Token Generation                                             │
│ Location: server/services/auth.service.ts                            │
│ Method: generateToken(user)                                          │
│ Creates: JWT with userId, role, expiration                           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 10. User + Token
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 3: Domain → API Response                        │
│ Location: server/routes/auth.ts                                      │
│ Type: CreateUserResponse                                             │
│ Structure: { user: User, token: string }                             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 11. HTTP 201 Response
                              │     Content-Type: application/json
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 4: JSON → Response Object                       │
│ Location: client/src/api/auth.api.ts                                 │
│ Axios automatically parses JSON                                       │
│ Type: CreateUserResponse                                             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 12. Response Object
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: State Update                                                 │
│ Location: client/src/features/auth/authSlice.ts                      │
│ Action: register.fulfilled                                           │
│ Updates:                                                              │
│   - Store user in Redux state                                         │
│   - Store token in localStorage                                       │
│   - Set authentication status                                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ 13. UI Update
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Component Re-render                                          │
│ Component: RegisterForm.tsx                                           │
│ Result: Redirect to dashboard or show success message                │
└──────────────────────────────────────────────────────────────────────┘
```

### Login Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Login Form                                                    │
│ Component: LoginForm.tsx                                              │
│ Input: email/username + password                                      │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 1: Client-Side Validation                           │
│ Schema: LoginRequestSchema                                            │
│ Validates: Email format, password presence                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP POST /api/auth/login                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 2: Server-Side Validation                           │
│ Location: server/routes/auth.ts                                      │
│ Schema: LoginRequestSchema.parse(req.body)                           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Authentication Service                                       │
│ Location: server/services/auth.service.ts                            │
│ Steps:                                                                │
│   1. Find user by email/username                                      │
│   2. Verify password (bcrypt.compare)                                 │
│   3. Generate JWT token                                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION: Database → Domain → API Response                     │
│ UserTable → User → LoginResponse                                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Store Token & User                                           │
│ Redux: authSlice.login.fulfilled                                     │
│ LocalStorage: Save token                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Transformation Points

1. **Client Form → API Request**
   - Location: `client/src/api/auth.api.ts`
   - Input: Form data (plain object)
   - Output: `CreateUserRequest` (typed)
   - Validation: Zod schema

2. **Database Row → Domain Object**
   - Location: `shared/utils/transformers/user.transformer.ts`
   - Input: `UserTable` (snake_case, database types)
   - Output: `User` (camelCase, domain types)
   - Transformations:
     - `id` → `UserId` (branded type)
     - `created_at` → `createdAt` (Date object)
     - `role` → `UserRole` (enum)

3. **Domain Object → API Response**
   - Location: `server/routes/auth.ts`
   - Input: `User` (domain type)
   - Output: `CreateUserResponse` (API contract)
   - Additional: JWT token generation

### Key Validation Points

1. **Client-Side Validation**
   - Purpose: Immediate user feedback
   - Schema: `CreateUserRequestSchema`
   - Timing: On form blur and submit

2. **Server-Side Validation**
   - Purpose: Security enforcement
   - Schema: Same `CreateUserRequestSchema`
   - Timing: On request receipt

3. **Database Constraints**
   - Purpose: Data integrity
   - Constraints: UNIQUE, NOT NULL, CHECK
   - Timing: On INSERT/UPDATE


---

## Bill Management Flow

### Overview

Bill management demonstrates CRUD operations with complex relationships, status transitions, and authorization checks.

### Create Bill Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Create Bill Form                                              │
│ Component: CreateBillForm.tsx                                         │
│ Input: title, description, committeeId (optional)                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 1: Client-Side Form Validation                      │
│ Schema: CreateBillRequestSchema                                       │
│ Validates:                                                            │
│   - title: 10-500 chars, not all uppercase, meaningful content        │
│   - description: 50-10000 chars, min 3 sentences, meaningful          │
│   - committeeId: valid UUID (if provided)                             │
│ Custom Rules:                                                         │
│   - notAllUppercase() - prevents shouting                             │
│   - minSentences(3) - ensures comprehensive description               │
│   - meaningfulContent() - prevents spam/gibberish                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: API Call with Authentication                                  │
│ Location: client/src/api/bills.api.ts                                │
│ Method: billsApi.createBill(request)                                 │
│ Headers: Authorization: Bearer <token>                                │
│ Type: CreateBillRequest                                              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP POST /api/bills                                                  │
│ Headers: Authorization, Content-Type                                  │
│ Body: JSON { title, description, committeeId }                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 2: Authentication Middleware                        │
│ Location: server/middleware/auth.ts                                  │
│ Validates:                                                            │
│   - Token presence                                                    │
│   - Token validity (JWT verification)                                 │
│   - Token expiration                                                  │
│ On Success: Attaches user to req.user                                │
│ On Failure: Returns 401 Unauthorized                                  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 3: Server-Side Request Validation                   │
│ Location: server/routes/bills.ts                                     │
│ Schema: CreateBillRequestSchema.parse(req.body)                      │
│ Validates: Same rules as client (defense in depth)                   │
│ On Failure: Returns 400 with detailed validation errors              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Service Layer - Business Logic                               │
│ Location: server/services/bill.service.ts                            │
│ Method: billService.createBill(userId, title, description, ...)      │
│ Business Rules:                                                       │
│   - Verify user has permission to create bills                        │
│   - Verify committee exists (if committeeId provided)                 │
│   - Set initial status to 'draft'                                     │
│   - Set sponsor to current user                                       │
│   - Set introducedAt to current timestamp                             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Repository Layer                                             │
│ Location: server/infrastructure/repositories/bill.repository.ts      │
│ Method: billRepository.create(data)                                  │
│ Type: NewBill (Drizzle inferred from schema)                         │
│ SQL: INSERT INTO bills (...) VALUES (...) RETURNING *                │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 4: Database Constraints                             │
│ Location: PostgreSQL bills table                                     │
│ Constraints:                                                          │
│   - id: PRIMARY KEY, UUID                                             │
│   - title: NOT NULL, VARCHAR(500)                                     │
│   - description: NOT NULL, TEXT                                       │
│   - status: NOT NULL, CHECK (status IN (...))                         │
│   - sponsor_id: NOT NULL, FOREIGN KEY → users(id)                     │
│   - committee_id: FOREIGN KEY → committees(id)                        │
│   - introduced_at: NOT NULL                                           │
│   - created_at: NOT NULL, DEFAULT NOW()                               │
│ On Failure: Throws constraint violation error                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 1: Database → Domain Type                       │
│ Location: shared/utils/transformers/bill.transformer.ts              │
│ Function: BillDbToDomain.transform(dbBill)                           │
│ Transforms:                                                           │
│   - id: string → BillId (branded)                                     │
│   - sponsor_id: string → UserId (branded)                             │
│   - committee_id: string | null → CommitteeId | null (branded)       │
│   - status: string → BillStatus (enum)                                │
│   - introduced_at: timestamp → Date                                   │
│   - created_at: timestamp → Date                                      │
│   - updated_at: timestamp → Date                                      │
│ Output: Bill (domain type)                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 2: Domain → API Response                        │
│ Location: server/routes/bills.ts                                     │
│ Type: CreateBillResponse                                             │
│ Structure: { bill: Bill }                                             │
│ Additional Processing:                                                │
│   - Dates serialized to ISO 8601 strings                              │
│   - Enums remain as string literals                                   │
│   - Branded types become plain strings in JSON                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP 201 Created                                                      │
│ Body: { bill: { id, title, description, status, ... } }              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: API Response Handling                                        │
│ Location: client/src/api/bills.api.ts                                │
│ Axios parses JSON automatically                                       │
│ Type: CreateBillResponse                                             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: State Update                                                 │
│ Location: client/src/features/bills/billsSlice.ts                    │
│ Action: createBill.fulfilled                                         │
│ Updates:                                                              │
│   - Add bill to bills array in Redux state                            │
│   - Update loading state                                              │
│   - Clear any errors                                                  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Component Re-render                                          │
│ Component: CreateBillForm.tsx                                         │
│ Result:                                                               │
│   - Show success message                                              │
│   - Clear form                                                        │
│   - Redirect to bill detail page                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Update Bill Flow (Status Transition)

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Update Bill Status                                           │
│ Component: BillStatusButton.tsx                                       │
│ Action: Change status from 'draft' to 'introduced'                    │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 1: Client-Side Business Rules                       │
│ Location: client/src/features/bills/hooks/useBillStatus.ts           │
│ Validates:                                                            │
│   - User is bill sponsor or admin                                     │
│   - Status transition is valid (draft → introduced)                   │
│   - Required fields are complete                                      │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP PATCH /api/bills/:id                                            │
│ Body: { status: 'introduced' }                                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 2: Authentication & Authorization                   │
│ Middleware: authenticate                                              │
│ Service: billService.updateBill()                                    │
│ Checks:                                                               │
│   - User is authenticated                                             │
│   - User owns the bill OR has admin role                              │
│   - Status transition is allowed                                      │
│ On Failure: Returns 403 Forbidden                                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Business Logic                                               │
│ Location: server/services/bill.service.ts                            │
│ Validates:                                                            │
│   - Status transition rules (state machine)                           │
│   - Required fields for new status                                    │
│ Updates:                                                              │
│   - status field                                                      │
│   - updated_at timestamp                                              │
│   - introducedAt if transitioning to 'introduced'                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ DATABASE: UPDATE with Optimistic Locking                             │
│ SQL: UPDATE bills SET status = $1, updated_at = NOW()                │
│      WHERE id = $2 AND updated_at = $3                                │
│ Prevents: Race conditions on concurrent updates                       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION: Database → Domain → API Response                     │
│ BillTable → Bill → UpdateBillResponse                                │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Optimistic Update                                            │
│ Redux: billsSlice.updateBill.pending                                 │
│ Immediately updates UI (optimistic)                                   │
│ Reverts on error                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Transformation Points

1. **Form Data → API Request**
   - Custom validation rules applied
   - Field-level validation on blur
   - Form-level validation on submit

2. **Database → Domain**
   - Snake_case → camelCase
   - String IDs → Branded types
   - String status → Enum
   - Timestamps → Date objects

3. **Domain → API Response**
   - Dates → ISO 8601 strings
   - Branded types → Plain strings
   - Enums → String literals

### Key Validation Points

1. **Client Form Validation**
   - Custom rules: notAllUppercase, minSentences, meaningfulContent
   - Character limits with counters
   - Real-time feedback

2. **Server Request Validation**
   - Same Zod schemas as client
   - Defense in depth
   - Detailed error messages

3. **Business Logic Validation**
   - Authorization checks
   - Status transition rules
   - Relationship validation (committee exists)

4. **Database Constraints**
   - Foreign key integrity
   - NOT NULL enforcement
   - CHECK constraints on enums
   - Unique constraints


---

## Comment System Flow

### Overview

The comment system demonstrates nested data structures, real-time updates, and moderation workflows.

### Create Comment Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Comment Form                                                  │
│ Component: CommentForm.tsx                                            │
│ Context: Viewing a bill detail page                                   │
│ Input: comment text, parentCommentId (optional for replies)           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 1: Client-Side Validation                           │
│ Schema: CreateCommentRequestSchema                                    │
│ Validates:                                                            │
│   - content: 1-5000 chars, not empty, meaningful                      │
│   - billId: valid UUID                                                │
│   - parentCommentId: valid UUID (if reply)                            │
│ Custom Rules:                                                         │
│   - No profanity (client-side filter)                                 │
│   - No excessive caps                                                 │
│   - No spam patterns                                                  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: API Call                                                      │
│ Location: client/src/api/comments.api.ts                             │
│ Method: commentsApi.createComment(request)                           │
│ Type: CreateCommentRequest                                           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP POST /api/comments                                               │
│ Headers: Authorization: Bearer <token>                                │
│ Body: { billId, content, parentCommentId }                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 2: Authentication                                   │
│ Middleware: authenticate                                              │
│ Validates: User is logged in                                          │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 3: Server-Side Request Validation                   │
│ Location: server/routes/comments.ts                                  │
│ Schema: CreateCommentRequestSchema.parse(req.body)                   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Service Layer - Business Logic                               │
│ Location: server/services/comment.service.ts                         │
│ Method: commentService.createComment(userId, billId, content, ...)   │
│ Business Rules:                                                       │
│   - Verify bill exists                                                │
│   - Verify parent comment exists (if reply)                           │
│   - Check user rate limits (prevent spam)                             │
│   - Run content moderation (ML/AI service)                            │
│   - Set initial status based on moderation result                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 4: Content Moderation                               │
│ Location: server/services/moderation.service.ts                      │
│ Checks:                                                               │
│   - Profanity detection                                               │
│   - Hate speech detection                                             │
│   - Spam detection                                                    │
│   - Personal information detection                                    │
│ Result:                                                               │
│   - approved: Comment published immediately                           │
│   - flagged: Comment queued for manual review                         │
│   - rejected: Comment blocked                                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Repository Layer                                             │
│ Location: server/infrastructure/repositories/comment.repository.ts   │
│ Method: commentRepository.create(data)                               │
│ SQL: INSERT INTO comments (...) VALUES (...) RETURNING *             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 5: Database Constraints                             │
│ Constraints:                                                          │
│   - id: PRIMARY KEY                                                   │
│   - bill_id: NOT NULL, FOREIGN KEY → bills(id)                        │
│   - user_id: NOT NULL, FOREIGN KEY → users(id)                        │
│   - parent_comment_id: FOREIGN KEY → comments(id)                     │
│   - content: NOT NULL, TEXT                                           │
│   - status: NOT NULL, CHECK (status IN (...))                         │
│   - created_at: NOT NULL                                              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 1: Database → Domain                            │
│ Location: shared/utils/transformers/comment.transformer.ts           │
│ Function: CommentDbToDomain.transform(dbComment)                     │
│ Transforms:                                                           │
│   - id: string → CommentId (branded)                                  │
│   - bill_id: string → BillId (branded)                                │
│   - user_id: string → UserId (branded)                                │
│   - parent_comment_id: string | null → CommentId | null (branded)    │
│   - status: string → CommentStatus (enum)                             │
│   - created_at: timestamp → Date                                      │
│ Output: Comment (domain type)                                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Enrich Comment with User Data                                │
│ Location: server/services/comment.service.ts                         │
│ Joins:                                                                │
│   - Fetch user data for comment author                                │
│   - Fetch reply count                                                 │
│   - Fetch vote counts                                                 │
│ Output: EnrichedComment                                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 2: Domain → API Response                        │
│ Type: CreateCommentResponse                                          │
│ Structure: { comment: EnrichedComment }                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ REAL-TIME UPDATE: WebSocket Broadcast                                │
│ Location: server/services/websocket.service.ts                       │
│ Event: 'comment:created'                                              │
│ Payload: { billId, comment }                                          │
│ Recipients: All users viewing the bill                                │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP 201 Created                                                      │
│ Body: { comment: { id, content, author, ... } }                       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: State Update                                                 │
│ Location: client/src/features/comments/commentsSlice.ts              │
│ Actions:                                                              │
│   1. createComment.fulfilled - Add to Redux state                     │
│   2. WebSocket listener - Update for other users                      │
│ Updates:                                                              │
│   - Add comment to comments array                                     │
│   - Update comment count                                              │
│   - Sort comments by timestamp                                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Component Re-render                                          │
│ Component: CommentList.tsx                                            │
│ Result:                                                               │
│   - New comment appears in list                                       │
│   - Form is cleared                                                   │
│   - Success notification shown                                        │
│   - Scroll to new comment                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### Nested Comments (Reply) Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Fetch Comments for Bill                                      │
│ API: GET /api/bills/:billId/comments                                  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Repository - Fetch with Relationships                        │
│ SQL: SELECT comments.*, users.username, users.avatar_url             │
│      FROM comments                                                    │
│      JOIN users ON comments.user_id = users.id                        │
│      WHERE comments.bill_id = $1                                      │
│      ORDER BY comments.created_at ASC                                 │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION: Flat List → Nested Tree                              │
│ Location: server/services/comment.service.ts                         │
│ Function: buildCommentTree(comments)                                 │
│ Algorithm:                                                            │
│   1. Create map of commentId → comment                                │
│   2. For each comment with parentCommentId:                           │
│      - Find parent in map                                             │
│      - Add to parent.replies array                                    │
│   3. Return top-level comments (no parent)                            │
│ Output: Nested comment tree structure                                 │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Recursive Rendering                                          │
│ Component: CommentThread.tsx                                          │
│ Renders:                                                              │
│   - Comment component                                                 │
│   - Recursively renders comment.replies                               │
│   - Indentation based on nesting level                                │
│   - Collapse/expand controls                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Transformation Points

1. **Flat Database Rows → Nested Tree**
   - Location: `server/services/comment.service.ts`
   - Algorithm: Parent-child relationship mapping
   - Output: Hierarchical comment structure

2. **Database → Domain with Enrichment**
   - Base comment data
   - Join with user data
   - Calculate reply counts
   - Calculate vote totals

3. **Real-Time Updates**
   - WebSocket event broadcasting
   - Optimistic UI updates
   - Conflict resolution

### Key Validation Points

1. **Content Moderation**
   - ML-based profanity detection
   - Hate speech detection
   - Spam pattern recognition
   - PII detection

2. **Rate Limiting**
   - Per-user comment limits
   - Time-based throttling
   - Prevents spam attacks

3. **Relationship Validation**
   - Bill exists
   - Parent comment exists (for replies)
   - Parent comment belongs to same bill
   - No circular references


---

## Argument Intelligence Flow

### Overview

The argument intelligence system demonstrates AI/ML integration, complex data processing, and evidence validation.

### Analyze Bill Arguments Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Request Argument Analysis                                    │
│ Component: BillArgumentsPanel.tsx                                     │
│ Trigger: User clicks "Analyze Arguments" button                       │
│ Input: billId                                                         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: API Call                                                      │
│ Location: client/src/api/arguments.api.ts                            │
│ Method: argumentsApi.analyzeBill(billId)                             │
│ Type: AnalyzeBillRequest                                             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP POST /api/arguments/analyze                                     │
│ Headers: Authorization: Bearer <token>                                │
│ Body: { billId }                                                      │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 1: Authentication & Authorization                   │
│ Middleware: authenticate                                              │
│ Checks:                                                               │
│   - User is authenticated                                             │
│   - User has access to bill (public or member)                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 2: Request Validation                               │
│ Schema: AnalyzeBillRequestSchema                                     │
│ Validates: billId is valid UUID                                       │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Service Layer - Orchestration                                │
│ Location: server/services/argument-intelligence.service.ts           │
│ Method: argumentService.analyzeBill(billId)                          │
│ Steps:                                                                │
│   1. Fetch bill content                                               │
│   2. Fetch related comments                                           │
│   3. Check cache for existing analysis                                │
│   4. If not cached, trigger ML analysis                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ DATA AGGREGATION: Collect Input Data                                 │
│ Sources:                                                              │
│   - Bill text (title + description)                                   │
│   - Bill metadata (status, sponsor, committee)                        │
│   - Comments (approved only)                                          │
│   - Historical voting patterns                                        │
│   - Related bills                                                     │
│ Output: Aggregated context for ML model                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 1: Domain → ML Input Format                     │
│ Location: server/services/ml/argument-extractor.service.ts           │
│ Function: prepareMLInput(bill, comments, context)                    │
│ Transforms:                                                           │
│   - Combine text sources                                              │
│   - Tokenize content                                                  │
│   - Extract entities (people, organizations, laws)                    │
│   - Structure as ML model input                                       │
│ Output: MLInputPayload                                                │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ EXTERNAL SERVICE: ML Model Inference                                 │
│ Location: server/services/ml/inference.service.ts                    │
│ Model: Argument extraction transformer model                          │
│ Processing:                                                           │
│   1. Identify argument claims                                         │
│   2. Classify argument positions (for/against/neutral)                │
│   3. Extract supporting evidence                                      │
│   4. Calculate confidence scores                                      │
│   5. Identify logical fallacies                                       │
│   6. Detect bias indicators                                           │
│ Output: Raw ML predictions                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 2: ML Output → Domain Types                     │
│ Location: server/services/ml/argument-extractor.service.ts           │
│ Function: parseMLOutput(predictions)                                 │
│ Transforms:                                                           │
│   - Raw predictions → Argument objects                                │
│   - Confidence scores → normalized 0-1 range                          │
│   - Position labels → ArgumentPosition enum                           │
│   - Evidence spans → ArgumentEvidence objects                         │
│ Output: Argument[] (domain types)                                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 3: Evidence Validation                              │
│ Location: server/services/evidence-validator.service.ts              │
│ Validates:                                                            │
│   - Evidence sources are credible                                     │
│   - Citations are properly formatted                                  │
│   - Links are accessible                                              │
│   - No broken references                                              │
│ Enriches:                                                             │
│   - Add source metadata                                               │
│   - Add credibility scores                                            │
│   - Add fact-check results                                            │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Repository Layer - Persist Results                           │
│ Location: server/infrastructure/repositories/argument.repository.ts  │
│ Operations:                                                           │
│   1. Begin transaction                                                │
│   2. Insert arguments                                                 │
│   3. Insert evidence records                                          │
│   4. Link arguments to bill                                           │
│   5. Update bill analysis metadata                                    │
│   6. Commit transaction                                               │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ VALIDATION POINT 4: Database Constraints                             │
│ Tables: arguments, argument_evidence                                  │
│ Constraints:                                                          │
│   - argument_id: PRIMARY KEY                                          │
│   - bill_id: NOT NULL, FOREIGN KEY → bills(id)                        │
│   - position: NOT NULL, CHECK (position IN (...))                     │
│   - confidence_score: CHECK (0 <= score <= 1)                         │
│   - evidence_id: PRIMARY KEY                                          │
│   - argument_id: FOREIGN KEY → arguments(id)                          │
│   - source_url: Valid URL format                                      │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 3: Database → Domain                            │
│ Location: shared/utils/transformers/argument.transformer.ts          │
│ Function: ArgumentDbToDomain.transform(dbArgument)                   │
│ Transforms:                                                           │
│   - argument_id: string → ArgumentId (branded)                        │
│   - bill_id: string → BillId (branded)                                │
│   - position: string → ArgumentPosition (enum)                        │
│   - confidence_score: number → validated 0-1 range                    │
│   - created_at: timestamp → Date                                      │
│ Output: Argument (domain type)                                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SERVER: Post-Processing                                              │
│ Location: server/services/argument-intelligence.service.ts           │
│ Operations:                                                           │
│   - Group arguments by position                                       │
│   - Calculate position strength scores                                │
│   - Identify strongest arguments                                      │
│   - Detect argument clusters                                          │
│   - Generate summary statistics                                       │
│ Output: ArgumentAnalysisResult                                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CACHING: Store Analysis Results                                      │
│ Location: server/infrastructure/cache/redis.service.ts               │
│ Key: `bill:${billId}:arguments`                                       │
│ TTL: 1 hour (configurable)                                            │
│ Purpose: Avoid re-analyzing unchanged bills                           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ TRANSFORMATION POINT 4: Domain → API Response                        │
│ Type: AnalyzeBillResponse                                            │
│ Structure:                                                            │
│   - arguments: Argument[]                                             │
│   - summary: ArgumentSummary                                          │
│   - metadata: AnalysisMetadata                                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ HTTP 200 OK                                                           │
│ Body: {                                                               │
│   arguments: [...],                                                   │
│   summary: { forCount, againstCount, neutralCount, ... },            │
│   metadata: { analyzedAt, modelVersion, confidence }                  │
│ }                                                                     │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: State Update                                                 │
│ Location: client/src/features/arguments/argumentsSlice.ts            │
│ Action: analyzeBill.fulfilled                                        │
│ Updates:                                                              │
│   - Store arguments in Redux state                                    │
│   - Store summary statistics                                          │
│   - Update loading state                                              │
│   - Cache results locally                                             │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENT: Visualization                                                │
│ Component: ArgumentVisualization.tsx                                  │
│ Renders:                                                              │
│   - Argument cards grouped by position                                │
│   - Confidence indicators                                             │
│   - Evidence links                                                    │
│   - Interactive filters                                               │
│   - Summary charts                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Transformation Points

1. **Domain → ML Input Format**
   - Text aggregation from multiple sources
   - Entity extraction
   - Tokenization
   - Feature engineering

2. **ML Output → Domain Types**
   - Raw predictions → structured Argument objects
   - Confidence normalization
   - Position classification
   - Evidence extraction

3. **Database → Domain with Enrichment**
   - Base argument data
   - Evidence relationships
   - Source metadata
   - Credibility scores

4. **Domain → Visualization Data**
   - Grouping by position
   - Statistical summaries
   - Chart data preparation

### Key Validation Points

1. **Input Validation**
   - Bill exists and is accessible
   - User has permission
   - Bill has sufficient content for analysis

2. **ML Output Validation**
   - Confidence scores in valid range
   - Position labels are valid enums
   - Evidence references are complete

3. **Evidence Validation**
   - Source URLs are accessible
   - Citations are properly formatted
   - Credibility checks pass
   - No broken links

4. **Database Constraints**
   - Foreign key integrity
   - Confidence score range checks
   - Position enum validation
   - Unique constraints on argument-bill pairs


---

## Transformation Points Reference

### Complete Transformation Catalog

This section provides a comprehensive reference of all transformation points in the system.

#### 1. Database → Domain Transformations

**Purpose**: Convert database representations to domain models

**Location**: `shared/utils/transformers/`

**Common Patterns**:

| Database Type | Domain Type | Transformation |
|--------------|-------------|----------------|
| `string` (UUID) | `UserId`, `BillId`, etc. | Cast to branded type |
| `timestamp` | `Date` | `new Date(timestamp)` |
| `snake_case` | `camelCase` | Field name mapping |
| `varchar` (enum) | TypeScript enum | String to enum conversion |
| `null` | `null` or default | Null handling |
| `jsonb` | Typed object | JSON parse + validation |

**Example**:
```typescript
// UserDbToDomain transformer
transform(dbUser: UserTable): User {
  return {
    id: dbUser.id as UserId,                    // Branded type
    email: dbUser.email,                        // Direct mapping
    username: dbUser.username,                  // Direct mapping
    role: dbUser.role as UserRole,              // Enum conversion
    createdAt: dbUser.created_at,               // camelCase + Date
    updatedAt: dbUser.updated_at,               // camelCase + Date
  };
}
```

#### 2. Domain → API Response Transformations

**Purpose**: Prepare domain models for HTTP transmission

**Location**: `server/routes/` (inline) or `shared/utils/transformers/`

**Common Patterns**:

| Domain Type | API Type | Transformation |
|------------|----------|----------------|
| `Date` | `string` (ISO 8601) | `date.toISOString()` |
| Branded type | `string` | Implicit cast in JSON |
| Enum | `string` literal | Direct serialization |
| `null` | `null` or omit | Based on API contract |
| Nested objects | Flattened or nested | Based on API design |

**Example**:
```typescript
// Domain to API response
const response: CreateUserResponse = {
  user: {
    id: user.id,                    // Branded type → string in JSON
    email: user.email,
    username: user.username,
    role: user.role,                // Enum → string literal
    createdAt: user.createdAt.toISOString(),  // Date → ISO string
    updatedAt: user.updatedAt.toISOString(),
  },
  token: jwtToken,
};
```

#### 3. API Request → Domain Transformations

**Purpose**: Convert HTTP requests to domain models

**Location**: `server/routes/` and `server/services/`

**Common Patterns**:

| API Type | Domain Type | Transformation |
|----------|-------------|----------------|
| `string` (UUID) | Branded type | Cast after validation |
| `string` (ISO date) | `Date` | `new Date(string)` |
| `string` literal | Enum | Validation + cast |
| Optional field | `null` or default | `value ?? null` |
| Nested object | Domain object | Recursive transformation |

**Example**:
```typescript
// API request to domain
const validatedData = CreateBillRequestSchema.parse(req.body);
const bill = await billService.createBill(
  req.user!.id as UserId,                    // Branded type
  validatedData.title,                       // Direct
  validatedData.description,                 // Direct
  validatedData.committeeId as CommitteeId | undefined,  // Optional branded
);
```

#### 4. Client Form → API Request Transformations

**Purpose**: Prepare form data for API submission

**Location**: `client/src/features/` components

**Common Patterns**:

| Form Type | API Type | Transformation |
|-----------|----------|----------------|
| Input value | `string` | Trim whitespace |
| Checkbox | `boolean` | Direct mapping |
| Select | Enum string | Validation |
| Date picker | ISO string | `date.toISOString()` |
| File upload | Base64 or FormData | Encoding |

**Example**:
```typescript
// Form to API request
const handleSubmit = async (formData: FormState) => {
  const request: CreateBillRequest = {
    title: formData.title.trim(),
    description: formData.description.trim(),
    committeeId: formData.committeeId || undefined,
  };
  
  await billsApi.createBill(request);
};
```

#### 5. Flat List → Nested Tree Transformations

**Purpose**: Build hierarchical structures from flat data

**Location**: `server/services/` or `client/src/utils/`

**Common Patterns**:

| Input | Output | Algorithm |
|-------|--------|-----------|
| Flat comment list | Comment tree | Parent-child mapping |
| Flat category list | Category hierarchy | Recursive grouping |
| Flat org chart | Org tree | Manager-employee links |

**Example**:
```typescript
// Build comment tree
function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<CommentId, Comment & { replies: Comment[] }>();
  
  // Initialize map with replies array
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });
  
  // Build tree structure
  const rootComments: Comment[] = [];
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)!;
    
    if (comment.parentCommentId) {
      const parent = commentMap.get(comment.parentCommentId);
      if (parent) {
        parent.replies.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });
  
  return rootComments;
}
```

#### 6. ML Model Input/Output Transformations

**Purpose**: Convert between domain data and ML model formats

**Location**: `server/services/ml/`

**Common Patterns**:

| Domain Type | ML Type | Transformation |
|------------|---------|----------------|
| Text content | Tokens | Tokenization |
| Domain object | Feature vector | Feature extraction |
| ML predictions | Domain object | Parsing + validation |
| Confidence scores | Normalized 0-1 | Scaling |

**Example**:
```typescript
// Domain to ML input
function prepareMLInput(bill: Bill, comments: Comment[]): MLInputPayload {
  return {
    text: `${bill.title}\n\n${bill.description}`,
    context: comments.map(c => c.content).join('\n'),
    metadata: {
      billId: bill.id,
      status: bill.status,
      commentCount: comments.length,
    },
  };
}

// ML output to domain
function parseMLOutput(predictions: MLPredictions): Argument[] {
  return predictions.arguments.map(pred => ({
    id: generateId() as ArgumentId,
    billId: predictions.billId as BillId,
    position: pred.position as ArgumentPosition,
    claim: pred.claim,
    evidence: pred.evidence.map(e => ({
      text: e.text,
      source: e.source,
      credibility: e.credibility,
    })),
    confidence: Math.max(0, Math.min(1, pred.confidence)),  // Clamp 0-1
    createdAt: new Date(),
  }));
}
```

---

## Validation Points Reference

### Complete Validation Catalog

This section provides a comprehensive reference of all validation points in the system.

#### 1. Client-Side Form Validation

**Purpose**: Immediate user feedback, reduce server load

**Location**: `client/src/features/` components

**Timing**: On blur, on change, on submit

**Technology**: Zod schemas from `shared/validation/schemas/`

**Example Validations**:

```typescript
// User registration
CreateUserRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(100, 'Username must not exceed 100 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
});

// Bill creation
CreateBillRequestSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(500, 'Title must not exceed 500 characters')
    .pipe(notAllUppercase('Title cannot be all uppercase'))
    .pipe(meaningfulContent('Title must contain meaningful content')),
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(10000, 'Description must not exceed 10,000 characters')
    .pipe(minSentences(3, 'Description must contain at least 3 sentences'))
    .pipe(meaningfulContent('Description must contain meaningful content')),
});
```

**Benefits**:
- Instant feedback to users
- Reduces invalid API requests
- Improves user experience
- Reduces server load

#### 2. Server-Side Request Validation

**Purpose**: Security enforcement, data integrity

**Location**: `server/routes/` (route handlers)

**Timing**: On request receipt, before business logic

**Technology**: Same Zod schemas as client

**Example**:

```typescript
router.post('/bills', authenticate, async (req, res, next) => {
  try {
    // Validation happens here
    const validatedData = CreateBillRequestSchema.parse(req.body);
    
    // Only validated data reaches business logic
    const bill = await billService.createBill(
      req.user!.id,
      validatedData.title,
      validatedData.description,
      validatedData.committeeId
    );
    
    res.status(201).json({ bill });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return 400 with validation errors
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        errors: error.errors,
      });
    }
    next(error);
  }
});
```

**Benefits**:
- Defense in depth (never trust client)
- Prevents malicious requests
- Ensures data integrity
- Consistent error responses

#### 3. Business Logic Validation

**Purpose**: Enforce business rules and constraints

**Location**: `server/services/` (service layer)

**Timing**: During business logic execution

**Technology**: Custom validation logic

**Example Validations**:

```typescript
// User registration
async register(email: string, username: string, password: string) {
  // Check email uniqueness
  const existingEmail = await this.userRepository.findByEmail(email);
  if (existingEmail) {
    throw new AppError('Email already in use', 'EMAIL_EXISTS', 400);
  }
  
  // Check username uniqueness
  const existingUsername = await this.userRepository.findByUsername(username);
  if (existingUsername) {
    throw new AppError('Username already taken', 'USERNAME_EXISTS', 400);
  }
  
  // Proceed with registration
  // ...
}

// Bill status transition
async updateBillStatus(billId: BillId, newStatus: BillStatus, userId: UserId) {
  const bill = await this.billRepository.findById(billId);
  
  // Validate status transition
  const validTransitions: Record<BillStatus, BillStatus[]> = {
    [BillStatus.Draft]: [BillStatus.Introduced],
    [BillStatus.Introduced]: [BillStatus.InCommittee, BillStatus.Rejected],
    [BillStatus.InCommittee]: [BillStatus.Passed, BillStatus.Rejected],
    [BillStatus.Passed]: [],
    [BillStatus.Rejected]: [],
  };
  
  if (!validTransitions[bill.status].includes(newStatus)) {
    throw new AppError(
      `Cannot transition from ${bill.status} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }
  
  // Proceed with update
  // ...
}
```

**Benefits**:
- Enforces complex business rules
- Maintains data consistency
- Prevents invalid state transitions
- Provides meaningful error messages

#### 4. Database Constraint Validation

**Purpose**: Final data integrity enforcement

**Location**: PostgreSQL database

**Timing**: On INSERT, UPDATE, DELETE

**Technology**: SQL constraints

**Example Constraints**:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'admin', 'moderator')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Bills table
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'introduced', 'in_committee', 'passed', 'rejected')),
  sponsor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  committee_id UUID REFERENCES committees(id) ON DELETE SET NULL,
  introduced_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Comments table with self-referential FK
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Benefits**:
- Absolute data integrity
- Prevents orphaned records
- Enforces referential integrity
- Last line of defense

#### 5. Authentication & Authorization Validation

**Purpose**: Verify user identity and permissions

**Location**: `server/middleware/auth.ts` and service layer

**Timing**: Before protected operations

**Technology**: JWT verification, role-based access control

**Example**:

```typescript
// Authentication middleware
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        code: 'NO_TOKEN',
        message: 'Authentication required',
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Attach user to request
    req.user = {
      id: decoded.userId as UserId,
      role: decoded.role as UserRole,
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    });
  }
}

// Authorization check in service
async updateBill(billId: BillId, userId: UserId, updates: Partial<Bill>) {
  const bill = await this.billRepository.findById(billId);
  
  // Check ownership or admin role
  if (bill.sponsorId !== userId && !this.isAdmin(userId)) {
    throw new AppError(
      'You do not have permission to update this bill',
      'UNAUTHORIZED',
      403
    );
  }
  
  // Proceed with update
  // ...
}
```

**Benefits**:
- Protects sensitive operations
- Enforces access control
- Prevents unauthorized modifications
- Audit trail for security

#### 6. Content Moderation Validation

**Purpose**: Filter inappropriate or harmful content

**Location**: `server/services/moderation.service.ts`

**Timing**: Before content publication

**Technology**: ML models, rule-based filters

**Example**:

```typescript
async moderateContent(content: string, contentType: ContentType): Promise<ModerationResult> {
  const checks = await Promise.all([
    this.checkProfanity(content),
    this.checkHateSpeech(content),
    this.checkSpam(content),
    this.checkPII(content),
  ]);
  
  const violations = checks.filter(check => !check.passed);
  
  if (violations.length === 0) {
    return { status: 'approved', violations: [] };
  }
  
  const severity = Math.max(...violations.map(v => v.severity));
  
  if (severity >= 0.8) {
    return { status: 'rejected', violations };
  } else {
    return { status: 'flagged', violations };
  }
}
```

**Benefits**:
- Maintains community standards
- Protects users from harmful content
- Reduces manual moderation load
- Provides audit trail

---

## Summary

### Data Flow Best Practices

1. **Validate Early, Validate Often**
   - Client-side for UX
   - Server-side for security
   - Database for integrity

2. **Transform Consistently**
   - Use shared transformers
   - Document transformation logic
   - Test round-trip conversions

3. **Type Safety Throughout**
   - Branded types for IDs
   - Enums for fixed values
   - Strict TypeScript configuration

4. **Error Handling**
   - Transform errors at boundaries
   - Provide meaningful messages
   - Include correlation IDs

5. **Performance Optimization**
   - Cache expensive transformations
   - Batch database operations
   - Use pagination for large datasets

### Integration Checklist

When implementing a new feature, ensure:

- [ ] Client-side validation with Zod schemas
- [ ] Server-side validation with same schemas
- [ ] Database constraints aligned with validation
- [ ] Transformers for all layer boundaries
- [ ] Authentication/authorization checks
- [ ] Error handling at all points
- [ ] Tests for transformation round-trips
- [ ] Tests for validation edge cases
- [ ] Documentation of data flow
- [ ] Performance considerations

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Chanuka Platform Team  
**Related Spec**: `.kiro/specs/full-stack-integration/`  
**Validates**: Requirement 10.4 - Document data flow pipelines

