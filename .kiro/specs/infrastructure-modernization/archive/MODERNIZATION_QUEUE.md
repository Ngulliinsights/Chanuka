# Feature Modernization Queue

## Strategy
Modernize standalone features first, then modernize absorbed sub-modules when their parent features are done.

## Remaining Features (16 standalone)

### Tier 1: Simple Features (5) - Direct DB, Basic Validation
1. ✅ feature-flags (81 KB, 11 files) - Simple CRUD, caching
2. ✅ privacy (69 KB, 4 files) - Simple service
3. ✅ market (16 KB, 3 files) - Prediction markets
4. ⏳ government-data (150 KB, 9 files) - External API, caching [HAS ABSORBED: institutional-api ✅]
5. ⏳ monitoring (124 KB, 8 files) - Metrics collection [HAS ABSORBED: regulatory-monitoring ⏳]

### Tier 2: Medium Features (7) - May Need Repository
6. ⏳ community (246 KB, 23 files) - User interactions
7. ⏳ advocacy (252 KB, 19 files) - Campaign management
8. ⏳ admin (196 KB, 14 files) - Administrative functions
9. ⏳ analysis (161 KB, 12 files) - Rename to bill-assessment
10. ⏳ constitutional-intelligence (138 KB, 17 files) - Constitutional analysis
11. ⏳ constitutional-analysis (224 KB, 18 files) - Legal analysis
12. ⏳ argument-intelligence (548 KB, 29 files) - Argument analysis

### Tier 3: Complex Features (4) - Need Repository + Caching
13. ⏳ safeguards (112 KB, 4 files) - Consolidation needed
14. ⏳ security (273 KB, 29 files) - Security consolidation
15. ✅ analytics (828 KB, 66 files) - Renamed to engagement-metrics, fully modernized
16. ⏳ ml (389 KB, 20 files) - ML infrastructure [HAS ABSORBED: ai-evaluation ✅]

## Absorbed Sub-Modules (Modernize with Parent)
- bills/domain/coverage/ - Modernize when bills is revisited
- sponsors/accountability/ - Modernize when sponsors is revisited  
- monitoring/regulatory/ - Modernize when monitoring is modernized

## Execution Order
1. Start with Tier 1 simple features (1-5)
2. Move to Tier 2 medium features (6-12)
3. Tackle Tier 3 complex features (13-16)
4. Revisit completed features to modernize absorbed sub-modules

## Current Focus
Starting with feature-flags (simplest)
