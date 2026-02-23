# Community Feature

## Overview

The Community feature enables citizen engagement through comments, voting, and social interactions on legislative bills. It implements a complete DDD architecture with domain-driven design principles.

## Architecture

```
community/
├── domain/                          # Pure business logic
│   ├── entities/                    # Core domain entities
│   │   ├── comment.entity.ts        # Comment aggregate root
│   │   └── comment-vote.entity.ts   # Vote entity
│   ├── value-objects/               # Immutable value objects
│   │   ├── engagement-score.ts      # Wilson score calculation
│   │   └── trending-score.ts        # Time-weighted engagement
│   └── services/                    # Domain services
│       ├── comment-moderation.service.ts  # Moderation rules
│       └── comment-ranking.service.ts     # Ranking algorithms
├── application/                     # Use cases & orchestration
│   └── use-cases/
│       ├── create-comment.use-case.ts
│       └── vote-on-comment.use-case.ts
├── infrastructure/                  # External concerns (to be added)
│   ├── repositories/                # Data persistence
│   └── services/                    # External integrations
└── index.ts                         # Public API

Legacy files (to be migrated):
├── comment.ts                       # Old service (migrate to use cases)
├── comment-voting.ts                # Old service (migrate to use cases)
├── community.ts                     # Router (keep)
└── social-integration.ts            # Social features (refactor)
```

## Domain Model

### Entities

#### Comment
- Aggregate root for comment functionality
- Manages content, moderation status, and engagement metrics
- Enforces business rules (e.g., soft delete, moderation workflow)

#### CommentVote
- Represents user votes (upvote/downvote/report)
- Enforces one vote per user per comment
- Supports vote toggling and changing

### Value Objects

#### EngagementScore
- Calculates Wilson score confidence interval
- Provides fair ranking that accounts for vote count and ratio
- Used by Reddit and other platforms for quality ranking

#### TrendingScore
- Time-weighted engagement score
- Recent activity weighted more heavily
- Supports multiple timeframes (1h, 24h, 7d)

### Domain Services

#### CommentModerationService
- Encapsulates moderation business rules
- Auto-approves trusted users
- Flags suspicious content for review
- Calculates review priority

#### CommentRankingService
- Implements multiple ranking algorithms:
  - **Best**: Wilson score (quality)
  - **Hot**: Time-weighted (trending)
  - **New**: Chronological
  - **Controversial**: Mixed votes
  - **Top**: Net votes

## Use Cases

### CreateCommentUseCase
Handles comment creation with automatic moderation:
1. Validates input
2. Creates domain entity
3. Applies moderation rules
4. Persists comment
5. Returns result with moderation status

### VoteOnCommentUseCase
Handles voting with toggle support:
1. Checks for existing vote
2. Adds, changes, or removes vote
3. Updates comment vote counts
4. Returns updated metrics

## Strategic Functionality

### 1. Quality Content Ranking
- Wilson score ensures quality comments rise to top
- Prevents manipulation by vote count alone
- Fair to comments with few votes

### 2. Trending Detection
- Time-weighted algorithm surfaces recent activity
- Configurable timeframes for different contexts
- Balances recency with engagement

### 3. Intelligent Moderation
- Auto-approves trusted users (reduces workload)
- Flags suspicious content (protects community)
- Prioritizes review queue (efficient moderation)

### 4. Flexible Ranking
- Multiple algorithms for different use cases
- Best: Default quality ranking
- Hot: Homepage trending
- Controversial: Debate discovery

## Integration with Schema

Maps to `citizen_participation` schema tables:
- `comments` - Comment storage
- `comment_votes` - Vote storage
- `users` - User references
- `bills` - Bill references

## Migration Path

### Phase 1: Domain Layer (✅ Complete)
- [x] Create entities
- [x] Create value objects
- [x] Create domain services

### Phase 2: Application Layer (✅ Complete)
- [x] Create use cases
- [x] Add application services

### Phase 3: Infrastructure Layer (🔄 Next)
- [ ] Create repositories
- [ ] Implement data mappers
- [ ] Add caching layer
- [ ] Integrate with existing services

### Phase 4: Migration (📋 Planned)
- [ ] Migrate `comment.ts` to use cases
- [ ] Migrate `comment-voting.ts` to use cases
- [ ] Update router to use new architecture
- [ ] Add integration tests
- [ ] Remove legacy code

## Usage Examples

### Creating a Comment

```typescript
import { CreateCommentUseCase } from '@server/features/community';
import { CommentModerationService } from '@server/features/community';

const moderationService = new CommentModerationService();
const useCase = new CreateCommentUseCase(moderationService);

const result = await useCase.execute({
  billId: 'bill-123',
  userId: 'user-456',
  content: 'This bill will impact small businesses...',
});

if (result.success) {
  console.log(`Comment created: ${result.commentId}`);
  console.log(`Status: ${result.moderationStatus}`);
}
```

### Voting on a Comment

```typescript
import { VoteOnCommentUseCase } from '@server/features/community';

const useCase = new VoteOnCommentUseCase();

const result = await useCase.execute({
  commentId: 'comment-789',
  userId: 'user-456',
  voteType: 'upvote',
});

console.log(`Action: ${result.action}`); // 'added', 'changed', or 'removed'
console.log(`Net votes: ${result.netVotes}`);
```

### Ranking Comments

```typescript
import { CommentRankingService } from '@server/features/community';

const rankingService = new CommentRankingService();

const comments = await fetchComments(); // Your data source

// Get best comments (quality ranking)
const best = rankingService.getTopComments(comments, 10, 'best');

// Get trending comments (hot)
const trending = rankingService.getTopComments(comments, 10, 'hot', '24h');

// Get controversial comments
const controversial = rankingService.getTopComments(comments, 10, 'controversial');
```

## Testing

### Unit Tests
- Domain entities: Business rule enforcement
- Value objects: Calculation accuracy
- Domain services: Algorithm correctness

### Integration Tests
- Use cases: End-to-end workflows
- Repository: Data persistence
- API: HTTP endpoints

## Performance Considerations

### Caching Strategy
- Cache engagement scores (expensive calculation)
- Cache trending lists (frequently accessed)
- Invalidate on vote changes

### Database Optimization
- Denormalize vote counts on comments table
- Index on (bill_id, created_at) for chronological
- Index on (bill_id, upvotes - downvotes) for top

### Scalability
- Async vote processing for high traffic
- Read replicas for ranking queries
- CDN for static ranking lists

## Security

### Input Validation
- Sanitize comment content (XSS prevention)
- Rate limiting on comment creation
- Rate limiting on voting

### Authorization
- Verify user owns comment for edits
- Verify user permissions for moderation
- Prevent vote manipulation

## Future Enhancements

1. **Reply Threading**: Nested comment support
2. **Mentions**: @username notifications
3. **Rich Text**: Markdown support
4. **Reactions**: Beyond upvote/downvote
5. **Badges**: Expert, verified, etc.
6. **Analytics**: Engagement metrics dashboard

## Related Features

- **Users**: User profiles and reputation
- **Bills**: Legislative content
- **Notifications**: Comment notifications
- **Moderation**: Content moderation queue

## Contributing

When adding functionality:
1. Start with domain layer (entities, value objects)
2. Add domain services for complex logic
3. Create use cases for workflows
4. Add infrastructure last
5. Update this README

## References

- [Wilson Score Interval](https://www.evanmiller.org/how-not-to-sort-by-average-rating.html)
- [Reddit Ranking Algorithm](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9)
- [DDD Architecture](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
