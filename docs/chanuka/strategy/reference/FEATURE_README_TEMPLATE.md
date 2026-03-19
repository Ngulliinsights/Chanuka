# [Feature Name] Feature Module

**Status:**
- Code Health: [%] [✅/🟡/❌] — [Brief assessment]
- Feature Completeness: [%] [✅/🟡/❌] — [Brief assessment]
- Launch Priority: [Critical/High/Medium/Low] — [Must-have/Nice-to-have] for launch

## Overview

[2-3 sentence description of what this feature does and why it exists]

## Purpose

- [Primary purpose 1]
- [Primary purpose 2]
- [Primary purpose 3]

## Architecture

### Structure

```
[feature-name]/
├── domain/              # [If DDD] Business logic
├── application/         # [If DDD] Use cases
├── infrastructure/      # [If DDD] External services
├── presentation/        # [If DDD] HTTP layer
└── [feature-name].ts    # [If flat] Main implementation
```

## API Endpoints

### [Endpoint Group 1]

**[METHOD] /api/[feature]/[path]**
- [Description]
- Query params: [params if any]
- Body: [body structure if any]
- Returns: [return structure]
- Auth: [Required/Not required]

[Repeat for each endpoint]

## Database Tables

### Primary Tables (Owned by This Module)

**[table_name]**
- `id` (PK) — [Description]
- `[column]` — [Description]
- `created_at`, `updated_at` — Timestamps

[Repeat for each table]

### Shared Tables (Read Access)

- **[table]** — [What data is read]

## Dependencies

### Internal Dependencies

- **@shared/types** — [What types are used]
- **@shared/db** — [Database access]
- **[other feature]** — [Why dependency exists]

### External Dependencies

- **[library]** — [Purpose]

## Configuration

### Environment Variables

```env
# [Group name]
[VAR_NAME]=[description]
```

### Feature Flags

- `[flag-name]` — [Description]

## Key Services

### [ServiceName] (`path/to/service.ts`)

[Description of service]:
- `method1(params)` — [Description]
- `method2(params)` — [Description]

## Domain Events

- `[EventName]` — [When emitted]

## Testing

### Test Coverage

- Unit tests: [Location]
- Integration tests: [Location]
- E2E tests: [Location]

### Running Tests

```bash
pnpm --filter @chanuka/server test [feature-name]
```

## Common Use Cases

### 1. [Use Case Name]

```typescript
import { service } from '@server/features/[feature-name]';

// Example code
```

## Troubleshooting

### "[Common Error]"

[Solution]

## Future Enhancements

- [ ] [Planned feature 1]
- [ ] [Planned feature 2]

## Related Documentation

- [Link to related docs]

---

**Maintainer:** [Team name]  
**Last Updated:** [Date]
