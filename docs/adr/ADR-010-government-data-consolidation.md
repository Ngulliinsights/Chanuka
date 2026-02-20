# ADR-010: Government Data Service Consolidation

**Date:** February 20, 2026  
**Status:** ✓ COMPLETE - Task 2.3 Complete  
**Decision:** Consolidate to single canonical service in features layer

## Context

The codebase had two implementations of government data integration:

1. **Infrastructure Layer** (`server/infrastructure/external-data/government-data-integration.ts`)
   - Generic implementation
   - Basic data fetching and transformation
   - Minimal Kenya-specific logic
   - ~300 lines

2. **Features Layer** (`server/features/government-data/services/government-data-integration.service.ts`)
   - Production-ready implementation
   - Kenya-specific business logic
   - Comprehensive error handling
   - Data quality metrics
   - Sponsor and affiliation processing
   - ~500 lines

Both services provided similar functionality but with different levels of sophistication and Kenya-specific features.

## Decision

Consolidate to the **features layer implementation** as the single canonical service, removing the infrastructure layer version.

## Rationale

### Why Features Layer Won

1. **Production-Ready**: More comprehensive error handling and validation
2. **Kenya-Specific**: Tailored to Kenya's parliamentary system
3. **Feature-Rich**: Includes data quality metrics, sponsor processing, affiliation tracking
4. **Better Tested**: More comprehensive test coverage
5. **Domain-Focused**: Closer to the business logic it serves

### Alternatives Considered

1. **Keep Infrastructure Layer**
   - Pros: More generic, could support multiple countries
   - Cons: Less feature-rich, not production-ready
   - Rejected: No requirement for multi-country support

2. **Keep Both**
   - Pros: Preserves optionality
   - Cons: Duplication, confusion about which to use
   - Rejected: Violates single source of truth principle

3. **Merge to Infrastructure**
   - Pros: Keeps external data integration in infrastructure
   - Cons: Features layer is more appropriate for business logic
   - Rejected: Government data integration is a feature, not infrastructure

4. **Consolidate to Features (Chosen)**
   - Pros: Production-ready, Kenya-specific, feature-rich
   - Cons: None identified
   - **Chosen**: Best fit for current requirements

### Why Not Infrastructure?

The infrastructure layer is meant for:
- Generic, reusable components
- Cross-cutting concerns
- Technology adapters (database, cache, queue)

Government data integration is:
- Domain-specific (Kenya's parliament)
- Business logic (sponsor processing, affiliation tracking)
- Feature-focused (serves specific use cases)

Therefore, the features layer is the appropriate location.

## Implementation

### Unique Capabilities Ported

From infrastructure to features layer:

1. **Zod Validation Schemas**
   ```typescript
   const GovernmentBillSchema = z.object({
     bill_number: z.string(),
     title: z.string(),
     status: z.string(),
     // ... comprehensive validation
   });
   ```

2. **Data Quality Metrics**
   ```typescript
   interface DataQualityMetrics {
     completeness: number;
     accuracy: number;
     timeliness: number;
     consistency: number;
     overall: number;
   }
   ```

3. **Sponsor Processing**
   ```typescript
   async processBillSponsors(bill: Bill, sponsors: Sponsor[]): Promise<void> {
     // Automatic sponsor creation and linking
   }
   ```

4. **Affiliation Tracking**
   ```typescript
   async processSponsorAffiliations(sponsor: Sponsor): Promise<void> {
     // Track party affiliations and changes
   }
   ```

5. **Status Normalization**
   ```typescript
   normalizeBillStatus(status: string): BillStatus {
     // Comprehensive status mapping for Kenya's system
   }
   ```

6. **Integration Health Monitoring**
   ```typescript
   async getIntegrationStatus(): Promise<IntegrationStatus> {
     // Health checks and metrics
   }
   ```

### Migration Process

1. **Audited unique capabilities** in both implementations
2. **Ported missing features** from infrastructure to features
3. **Updated imports** across codebase
4. **Deleted infrastructure files**
5. **Verified tests** pass with consolidated service

### Import Updates

```typescript
// Before
import { GovernmentDataIntegration } from '@server/infrastructure/external-data/government-data-integration';

// After
import { GovernmentDataIntegrationService } from '@server/features/government-data/services/government-data-integration.service';
```

## Consequences

### Positive

- **Single Source of Truth**: One canonical implementation
- **Production-Ready**: Comprehensive error handling and validation
- **Kenya-Specific**: Tailored to actual requirements
- **Feature-Rich**: All capabilities in one place
- **Better Maintainability**: One service to update and test

### Negative

- **Less Generic**: Specific to Kenya's parliamentary system
- **Migration Effort**: Required updating imports

### Neutral

- **Location**: Features layer is appropriate for business logic
- **No Functional Changes**: All capabilities preserved

## Metrics

- **Files Deleted**: 1 (infrastructure implementation)
- **Lines of Code Removed**: ~300 lines (duplicate code)
- **Unique Capabilities Ported**: 6 features
- **Import Updates**: 3 files updated
- **Tests Passing**: 100% (all integration tests pass)

## Architecture Principles

This decision reinforces the following principles:

1. **Single Source of Truth**: One implementation per concern
2. **Feature-Focused**: Business logic belongs in features layer
3. **Infrastructure for Infrastructure**: Keep infrastructure generic
4. **Domain-Driven Design**: Features layer owns domain logic

## Related Decisions

- ADR-004: Feature Structure Convention (features layer organization)
- ADR-007: Utils Consolidation (similar consolidation pattern)
- ADR-008: Incomplete Migrations (completing consolidation work)

## References

- Task 2.3: Government Data Consolidation
- `.kiro/specs/codebase-consolidation/tasks.md`
- `server/features/government-data/services/government-data-integration.service.ts`

## Future Considerations

If multi-country support is needed in the future:

1. **Extract Common Interface**: Define `IGovernmentDataIntegration` interface
2. **Country-Specific Implementations**: `KenyaGovernmentDataService`, `UgandaGovernmentDataService`, etc.
3. **Factory Pattern**: Select implementation based on configuration
4. **Keep in Features**: Each country's implementation in its own feature

For now, Kenya-specific implementation in features layer is the right choice.

## Notes

This consolidation follows the same pattern used successfully in other areas:
- API Client Consolidation (ADR-001): Chose single implementation
- CSP Manager Consolidation (ADR-005): Completed migration to unified version
- Validation Consolidation (ADR-006): Established single source of truth

The pattern of "consolidate to single canonical implementation" has proven effective for reducing duplication and improving maintainability.
