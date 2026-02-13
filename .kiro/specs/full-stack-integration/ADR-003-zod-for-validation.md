# ADR-003: Zod for Runtime Validation

**Status**: Accepted

**Date**: 2024

**Context**: The Chanuka Platform needs runtime validation at multiple points:
- **Client-side**: Validate user input before submission to provide immediate feedback
- **Server-side**: Validate incoming API requests to prevent invalid data from entering the system
- **Database boundary**: Validate data before database operations to ensure data integrity
- **API responses**: Validate outgoing data to ensure contract compliance

TypeScript provides compile-time type checking, but this doesn't help with runtime data validation. Data coming from external sources (user input, API calls, database queries) is inherently untyped at runtime and must be validated.

The platform has historically used a mix of validation approaches:
- Manual validation with if/else checks
- Different validation libraries in client vs. server (Yup on client, custom validators on server)
- Inconsistent error messages and validation rules
- Validation logic duplicated across layers

This inconsistency has caused problems:
- Client accepts data that server rejects (or vice versa)
- Validation errors have different formats in different contexts
- Maintaining validation rules requires updating multiple locations
- No type safety connection between validators and TypeScript types

**Decision**: We will use Zod as the single validation library across all layers (client, server, shared).

**Why Zod**:

1. **TypeScript-first design**: Zod is built specifically for TypeScript and provides excellent type inference
2. **Type inference**: Can infer TypeScript types from Zod schemas, ensuring validation and types stay in sync
   ```typescript
   const UserSchema = z.object({
     id: z.string().uuid(),
     email: z.string().email(),
     username: z.string().min(3).max(100),
   });
   
   type User = z.infer<typeof UserSchema>; // TypeScript type derived from schema
   ```
3. **Composability**: Schemas can be composed, extended, and reused
4. **Consistent error format**: Zod provides structured error objects that can be transformed consistently
5. **Small bundle size**: ~8kb minified, suitable for client-side use
6. **No dependencies**: Zod has zero dependencies, reducing supply chain risk
7. **Excellent DX**: Clear API, good error messages, strong TypeScript support

**Implementation**:

All validation schemas will be defined in `shared/validation/schemas/` and used across all layers:

```typescript
// shared/validation/schemas/user.schema.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(100),
  role: z.enum(['user', 'admin', 'moderator']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(100),
  password: z.string().min(8),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
```

**Usage patterns**:

Client-side validation:
```typescript
// Validate before API call
const result = CreateUserRequestSchema.safeParse(formData);
if (!result.success) {
  showValidationErrors(result.error);
  return;
}
await createUser(result.data);
```

Server-side validation:
```typescript
// Validate incoming request
app.post('/api/users', async (req, res) => {
  const result = CreateUserRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json(transformValidationError(result.error));
  }
  const user = await userService.create(result.data);
  res.json(user);
});
```

**Consequences**:

**Positive**:
- **Single validation library**: Same library and patterns across all layers
- **Type safety**: Validation schemas and TypeScript types are guaranteed to match
- **Consistent errors**: Validation errors have the same structure everywhere
- **Reusable schemas**: Define once in shared layer, use everywhere
- **Composability**: Build complex schemas from simple ones
- **Runtime safety**: Invalid data is caught before it causes problems
- **Better DX**: Type inference reduces boilerplate and prevents type/schema drift
- **Client and server parity**: Identical validation rules on both sides

**Negative**:
- **Learning curve**: Developers must learn Zod API and patterns
- **Bundle size**: Adds ~8kb to client bundle (minimal but non-zero)
- **Runtime overhead**: Validation has performance cost (mitigated by validating only at boundaries)
- **Schema complexity**: Complex validation rules can make schemas hard to read
- **Migration effort**: Existing validation code must be migrated to Zod

**Mitigation**:
- Provide documentation and examples of common Zod patterns
- Create reusable validation rules in `shared/validation/rules/` for common cases
- Only validate at layer boundaries, not internal function calls
- Use Zod's `.transform()` for complex validation logic to keep schemas readable
- Migrate validation incrementally, starting with new features

**Alternatives Considered**:

1. **Yup**: Popular validation library, but less TypeScript-focused and larger bundle size
2. **Joi**: Server-side only, not suitable for client use
3. **io-ts**: More functional programming oriented, steeper learning curve
4. **AJV (JSON Schema)**: Requires separate type definitions, no type inference
5. **Custom validation**: Rejected because it requires maintaining our own validation framework
6. **TypeScript decorators (class-validator)**: Rejected because it requires class-based models

**Related Requirements**: Requirements 3.4, 5.1, 5.2, 5.3, 5.4 (validation at boundaries and consistency)

**Related ADRs**: ADR-002 (Single Source of Truth), ADR-004 (Transformation Layer Pattern)
