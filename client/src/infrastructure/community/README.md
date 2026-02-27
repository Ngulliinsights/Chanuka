# Community Infrastructure Module

## Overview

**DEPRECATED**: This module is being migrated to `features/community`. Community is a business domain, not infrastructure. This module currently provides shared types and services during the migration period.

## Migration Notice

- **WebSocket functionality**: Use `@client/infrastructure/realtime`
- **Community business logic**: Use `@client/features/community`
- **Community hooks**: Moved to `@client/features/community`

## Current Exports (Temporary)

### Types
- `UnifiedComment` - Comment data structure
- `UnifiedThread` - Discussion thread structure
- `UnifiedModeration` - Moderation data
- `CommunityState` - Community state
- `DiscussionState` - Discussion state

### Services
- `ModerationService` - Moderation utilities (moving to features)
- `StateSyncService` - State synchronization (moving to features)

## Migration Path

```typescript
// OLD (deprecated)
import { useUnifiedCommunity } from '@/infrastructure/community';

// NEW (correct)
import { useUnifiedCommunity } from '@/features/community';
```

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md
- **Requirement 5.1**: All exports documented
- **Requirement 5.3**: 100% documented exports
