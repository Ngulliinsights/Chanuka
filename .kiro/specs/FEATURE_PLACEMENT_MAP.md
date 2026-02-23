# Chanuka Platform - Feature Placement Map
**Visual Guide to Where Features Live and Where New Features Should Go**

---

## 🗺️ Current Architecture Map

```
chanuka-platform/
│
├── 📊 DATABASE LAYER (PostgreSQL + Drizzle ORM)
│   └── server/infrastructure/schema/
│       ├── ✅ foundation.ts                    # Users, bills, sponsors (CORE)
│       ├── ✅ citizen_participation.ts         # Comments, votes, tracking (COMPLETE)
│       ├── ✅ argument_intelligence.ts         # Arguments, claims, evidence (COMPLETE)
│       ├── ✅ advocacy_coordination.ts         # Campaigns, actions, coalitions (COMPLETE)
│       ├── ✅ transparency_analysis.ts         # Corporate entities, conflicts (COMPLETE)
│       ├── ✅ political_economy.ts             # Appointments, patronage (COMPLETE)
│       ├── ✅ trojan_bill_detection.ts         # Hidden agendas (COMPLETE)
│       ├── ✅ parliamentary_process.ts         # Committees, hearings (COMPLETE)
│       ├── ✅ real_time_engagement.ts          # WebSockets, live updates (COMPLETE)
│       ├── ✅ search_system.ts                 # Full-text search (COMPLETE)
│       ├── ✅ universal_access.ts              # Accessibility features (COMPLETE)
│       └── ✅ safeguards.ts                    # Security, privacy (COMPLETE)
│
├── 🔧 BACKEND SERVICES (Node.js + Express)
│   └── server/features/
│       │
│       ├── ✅ bills/                           # Bill management (PRODUCTION)
│       │   ├── ✅ real-time-tracking.ts        # Status monitoring
│       │   ├── ✅ bill-status-monitor.ts       # Change detection
│       │   ├── ✅ voting-pattern-analysis.ts   # Voting patterns
│       │   ├── ⚠️ services/                    # NEEDS: translation, impact
│       │   │   ├── ❌ translation-service.ts   # NEW - Plain-language
│       │   │   ├── ❌ impact-calculator.ts     # NEW - Personal impact
│       │   │   └── ❌ action-prompt-generator.ts # NEW - Action prompts
│       │   └── application/
│       │       └── ✅ bill-service.ts          # Core bill logic
│       │
│       ├── ✅ argument-intelligence/           # Argument extraction (PRODUCTION)
│       │   ├── ✅ argument-processor.ts        # Main orchestration
│       │   ├── ✅ structure-extractor.ts       # Extract structure
│       │   ├── ✅ clustering-service.ts        # Cluster arguments
│       │   ├── ✅ coalition-finder.ts          # Find coalitions
│       │   ├── ✅ evidence-validator.ts        # Validate evidence
│       │   ├── ✅ brief-generator.ts           # Generate briefs
│       │   ├── ✅ power-balancer.ts            # Balance voices
│       │   └── ✅ routes.ts                    # 25 API endpoints
│       │
│       ├── ✅ advocacy/                        # Campaign coordination (BACKEND READY)
│       │   ├── ✅ campaign-service.ts          # Campaign management
│       │   ├── ✅ action-coordinator.ts        # Action items
│       │   ├── ✅ coalition-builder.ts         # Build coalitions
│       │   ├── ✅ impact-tracker.ts            # Track impact
│       │   └── ⚠️ electoral-pressure/          # NEEDS: Electoral pressure
│       │       ├── ❌ pressure-tracker.ts      # NEW - MP accountability
│       │       └── ❌ representation-gap.ts    # NEW - Calculate gap
│       │
│       ├── ⚠️ accountability/                  # Transparency (PARTIAL)
│       │   ├── ✅ ledger.service.ts            # Accountability ledger
│       │   └── ⚠️ conflict-of-interest/        # NEEDS: COI tracking
│       │       ├── ❌ coi-detector.ts          # NEW - Detect conflicts
│       │       └── ❌ financial-tracker.ts     # NEW - Track finances
│       │
│       ├── ✅ notifications/                   # Multi-channel (PRODUCTION)
│       │   ├── ✅ notification-service.ts      # Core notifications
│       │   ├── ✅ email-service.ts             # Email delivery
│       │   ├── ✅ sms-service.ts               # SMS delivery
│       │   └── ✅ push-service.ts              # Push notifications
│       │
│       ├── ❌ representation/                  # NEW FEATURE - Weighted voices
│       │   ├── ❌ weighted-voice-service.ts    # Calculate weights
│       │   ├── ❌ underrepresented-tracker.ts  # Track engagement
│       │   └── ❌ geographic-balancer.ts       # Balance regions
│       │
│       ├── ❌ media/                           # NEW FEATURE - Media integration
│       │   ├── ❌ press-release-generator.ts   # Auto-generate releases
│       │   ├── ❌ media-integration-api.ts     # Partner APIs
│       │   └── ❌ amplification-tracker.ts     # Track coverage
│       │
│       ├── ❌ data-ingestion/                  # NEW FEATURE - Data population
│       │   ├── ❌ corporate-scraper.ts         # Scrape companies
│       │   ├── ❌ eacc-importer.ts             # Import EACC data
│       │   ├── ❌ parliamentary-register.ts    # Import parliament data
│       │   └── ❌ journalism-integration.ts    # Partner feeds
│       │
│       ├── ✅ community/                       # Community features (PRODUCTION)
│       ├── ✅ search/                          # Search (PRODUCTION)
│       ├── ✅ users/                           # User management (PRODUCTION)
│       ├── ✅ analytics/                       # Analytics (PRODUCTION)
│       ├── ✅ security/                        # Security (PRODUCTION)
│       └── ✅ monitoring/                      # Monitoring (PRODUCTION)
│
└── 🎨 FRONTEND (React + TypeScript)
    └── client/src/features/
        │
        ├── ✅ bills/                           # Bill UI (MOSTLY COMPLETE)
        │   ├── ✅ pages/
        │   │   ├── ✅ bill-detail.tsx          # Bill details
        │   │   ├── ✅ bill-analysis.tsx        # Analysis view
        │   │   └── ✅ bills-dashboard-page.tsx # Dashboard
        │   ├── ✅ ui/
        │   │   ├── ✅ bill-list.tsx            # List view
        │   │   ├── ✅ bill-tracking.tsx        # Tracking UI
        │   │   ├── ✅ ArgumentsTab.tsx         # Arguments display
        │   │   └── ✅ LegislativeBriefDisplay.tsx # Brief display
        │   └── ⚠️ ui/                          # NEEDS: More UI components
        │       ├── ❌ legislative-brief/       # NEW - Full brief viewer
        │       │   ├── BriefViewer.tsx         # View briefs
        │       │   ├── ArgumentMap.tsx         # Visualize arguments
        │       │   └── CitizenInputSummary.tsx # Summarize input
        │       ├── ❌ impact/                  # NEW - Impact visualization
        │       │   ├── ImpactCalculator.tsx    # Calculate impact
        │       │   └── ImpactVisualization.tsx # Visualize impact
        │       └── ❌ translation/             # NEW - Plain-language view
        │           ├── PlainLanguageView.tsx   # Show translation
        │           └── ClauseExplainer.tsx     # Explain clauses
        │
        ├── ⚠️ accountability/                  # Transparency UI (MINIMAL)
        │   ├── ✅ ShadowLedgerDashboard.ts     # Ledger dashboard
        │   └── ❌ conflict-of-interest/        # NEW - COI visualization
        │       ├── ConflictDashboard.tsx       # Show conflicts
        │       ├── CorporateConnectionsGraph.tsx # Network graph
        │       ├── FollowTheMoneyView.tsx      # Financial tracking
        │       └── TrojanBillAlert.tsx         # Hidden agenda alerts
        │
        ├── ❌ advocacy/                        # NEW FEATURE - Advocacy UI
        │   ├── CoalitionBuilder.tsx            # Build coalitions
        │   ├── CampaignDashboard.tsx           # Manage campaigns
        │   ├── ActionItemList.tsx              # List actions
        │   ├── ElectoralPressure.tsx           # Show MP accountability
        │   └── ImpactTracker.tsx               # Track campaign impact
        │
        ├── ❌ representation/                  # NEW FEATURE - Representation UI
        │   ├── GeographicBalance.tsx           # Show regional balance
        │   ├── UnderrepresentedVoices.tsx      # Highlight underrepresented
        │   └── RepresentationMetrics.tsx       # Show metrics
        │
        ├── ✅ community/                       # Community (PRODUCTION)
        ├── ✅ auth/                            # Authentication (PRODUCTION)
        ├── ✅ dashboard/                       # Dashboard (PRODUCTION)
        ├── ✅ notifications/                   # Notifications UI (PRODUCTION)
        ├── ✅ search/                          # Search UI (PRODUCTION)
        └── ✅ users/                           # User profile (PRODUCTION)
```

---

## 🎯 Feature Placement Decision Tree

### **"Where should I put this new feature?"**

```
START: I need to add a new feature
│
├─ Is it about DATABASE SCHEMA?
│  └─ YES → server/infrastructure/schema/
│     ├─ Core entities (users, bills)? → foundation.ts
│     ├─ Citizen engagement? → citizen_participation.ts
│     ├─ Transparency/conflicts? → transparency_analysis.ts
│     ├─ Advocacy/campaigns? → advocacy_coordination.ts
│     ├─ Arguments/evidence? → argument_intelligence.ts
│     └─ New domain? → Create new schema file
│
├─ Is it about BACKEND LOGIC?
│  └─ YES → server/features/{domain}/
│     ├─ Bill-related? → server/features/bills/
│     ├─ User comments/votes? → server/features/community/
│     ├─ Transparency/accountability? → server/features/accountability/
│     ├─ Campaigns/advocacy? → server/features/advocacy/
│     ├─ Notifications? → server/features/notifications/
│     ├─ Search? → server/features/search/
│     └─ New domain? → Create new feature directory
│
├─ Is it about FRONTEND UI?
│  └─ YES → client/src/features/{domain}/
│     ├─ Bill viewing/tracking? → client/src/features/bills/
│     ├─ User profile/settings? → client/src/features/users/
│     ├─ Transparency dashboards? → client/src/features/accountability/
│     ├─ Campaign management? → client/src/features/advocacy/
│     ├─ Notifications? → client/src/features/notifications/
│     └─ New domain? → Create new feature directory
│
└─ Is it SHARED between client/server?
   └─ YES → shared/
      ├─ Type definitions? → shared/types/
      ├─ Validation schemas? → shared/validation/
      ├─ Utilities? → shared/utils/
      └─ Constants/enums? → shared/types/core/
```

---

## 📋 Feature Implementation Checklist

### **When adding a new feature, follow this order:**

1. **Schema First** (if new data model needed)
   ```
   ✅ Create schema in server/infrastructure/schema/
   ✅ Define tables with proper indexes
   ✅ Add relations
   ✅ Export types
   ✅ Run migration: npm run db:generate
   ```

2. **Backend Service** (business logic)
   ```
   ✅ Create feature directory in server/features/
   ✅ Implement service layer (application/)
   ✅ Implement repository layer (infrastructure/)
   ✅ Create API routes
   ✅ Add validation
   ✅ Add error handling
   ✅ Write tests
   ```

3. **Frontend UI** (user interface)
   ```
   ✅ Create feature directory in client/src/features/
   ✅ Create page components (pages/)
   ✅ Create UI components (ui/)
   ✅ Add API client calls
   ✅ Add state management
   ✅ Add routing
   ✅ Write tests
   ```

4. **Integration** (connect the pieces)
   ```
   ✅ Register routes in server/index.ts
   ✅ Add navigation in client
   ✅ Add permissions/authorization
   ✅ Add monitoring/logging
   ✅ Update documentation
   ```

---

## 🚀 Quick Reference: Where to Add Specific Features

### **Plain-Language Translation**
```
Schema:     N/A (uses existing bills table)
Backend:    server/features/bills/services/translation-service.ts
Frontend:   client/src/features/bills/ui/translation/PlainLanguageView.tsx
API:        POST /api/bills/:billId/translate
```

### **Impact Calculator**
```
Schema:     N/A (uses existing bills + user_profiles)
Backend:    server/features/bills/services/impact-calculator.ts
Frontend:   client/src/features/bills/ui/impact/ImpactCalculator.tsx
API:        POST /api/bills/:billId/calculate-impact
```

### **Weighted Representation**
```
Schema:     N/A (enhance existing comments table)
Backend:    server/features/representation/weighted-voice-service.ts
Frontend:   client/src/features/representation/GeographicBalance.tsx
API:        GET /api/representation/weights
Integration: server/features/argument-intelligence/application/power-balancer.ts
```

### **Electoral Pressure Dashboard**
```
Schema:     N/A (uses existing bill_votes + sponsors)
Backend:    server/features/advocacy/electoral-pressure/pressure-tracker.ts
Frontend:   client/src/features/advocacy/ElectoralPressure.tsx
API:        GET /api/advocacy/electoral-pressure/:sponsorId
```

### **Media Integration**
```
Schema:     N/A (or add media_coverage table if needed)
Backend:    server/features/media/press-release-generator.ts
Frontend:   client/src/features/accountability/MediaCoverage.tsx
API:        POST /api/media/generate-press-release
```

### **Conflict of Interest Visualization**
```
Schema:     ✅ EXISTS (transparency_analysis.ts)
Backend:    server/features/accountability/conflict-of-interest/coi-detector.ts
Frontend:   client/src/features/accountability/conflict-of-interest/ConflictDashboard.tsx
API:        GET /api/accountability/conflicts/:sponsorId
```

### **Coalition Builder UI**
```
Schema:     ✅ EXISTS (advocacy_coordination.ts)
Backend:    ✅ EXISTS (server/features/advocacy/coalition-builder.ts)
Frontend:   ❌ MISSING (client/src/features/advocacy/CoalitionBuilder.tsx)
API:        ✅ EXISTS (POST /api/advocacy/find-coalitions)
```

### **Legislative Brief Viewer**
```
Schema:     ✅ EXISTS (argument_intelligence.ts)
Backend:    ✅ EXISTS (server/features/argument-intelligence/brief-generator.ts)
Frontend:   ❌ MISSING (client/src/features/bills/ui/legislative-brief/BriefViewer.tsx)
API:        ✅ EXISTS (POST /api/argument-intelligence/generate-brief)
```

---

## 🏗️ Architecture Patterns by Layer

### **Schema Layer Patterns**
```typescript
// Location: server/infrastructure/schema/{domain}.ts

// Pattern 1: Core entity table
export const entity_name = pgTable("entity_name", {
  id: primaryKeyUuid(),
  // ... fields
  ...auditFields(),
}, (table) => ({
  // Indexes for performance
  primaryIdx: index("idx_entity_primary").on(table.field),
}));

// Pattern 2: Relations
export const entityRelations = relations(entity_name, ({ one, many }) => ({
  relatedEntity: one(other_entity, {
    fields: [entity_name.foreign_key],
    references: [other_entity.id],
  }),
}));

// Pattern 3: Type exports
export type Entity = typeof entity_name.$inferSelect;
export type NewEntity = typeof entity_name.$inferInsert;
```

### **Backend Service Patterns**
```typescript
// Location: server/features/{domain}/application/{service}.ts

// Pattern 1: Service class
export class FeatureService {
  constructor(
    private repository: FeatureRepository,
    private logger: Logger
  ) {}

  async performAction(params: ActionParams): Promise<Result<ActionResult>> {
    // Business logic here
  }
}

// Pattern 2: Repository
// Location: server/features/{domain}/infrastructure/{repository}.ts
export class FeatureRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Entity | null> {
    // Database queries here
  }
}

// Pattern 3: Routes
// Location: server/features/{domain}/{domain}-routes.ts
export const featureRouter = Router();
featureRouter.post('/action', validateRequest, async (req, res) => {
  // Route handler
});
```

### **Frontend Component Patterns**
```typescript
// Location: client/src/features/{domain}/pages/{Page}.tsx

// Pattern 1: Page component
export function FeaturePage() {
  const { data, isLoading } = useFeatureData();
  
  return (
    <div>
      {/* Page content */}
    </div>
  );
}

// Pattern 2: UI component
// Location: client/src/features/{domain}/ui/{Component}.tsx
export function FeatureComponent({ prop }: Props) {
  return <div>{/* Component content */}</div>;
}

// Pattern 3: API hook
// Location: client/src/features/{domain}/hooks.ts
export function useFeatureData() {
  return useQuery({
    queryKey: ['feature'],
    queryFn: () => api.get('/api/feature'),
  });
}
```

---

## 📊 Cross-Cutting Concerns

### **Where to put features that span multiple domains:**

**Authentication/Authorization**
- Schema: `server/infrastructure/schema/foundation.ts` (users table)
- Backend: `server/infrastructure/auth/`
- Middleware: `server/middleware/auth/`
- Frontend: `client/src/features/auth/`

**Notifications**
- Schema: `server/infrastructure/schema/citizen_participation.ts` (notifications table)
- Backend: `server/features/notifications/`
- Frontend: `client/src/features/notifications/`

**Search**
- Schema: `server/infrastructure/schema/search_system.ts`
- Backend: `server/features/search/`
- Frontend: `client/src/features/search/`

**Analytics**
- Schema: Multiple tables with engagement metrics
- Backend: `server/features/analytics/`
- Frontend: `client/src/features/analytics/`

**Error Handling**
- Backend: `server/infrastructure/error-handling/`
- Frontend: `client/src/infrastructure/error/`
- Shared: `shared/types/errors/`

**Caching**
- Backend: `server/infrastructure/cache/`
- Frontend: React Query (built-in)

**Logging/Monitoring**
- Backend: `server/infrastructure/observability/`
- Frontend: `client/src/infrastructure/analytics/`

---

## 🎯 Summary

**Key Principles:**
1. **Schema First** - Always define data model before implementation
2. **Feature-Driven** - Organize by domain, not by technical layer
3. **Separation of Concerns** - Keep schema, backend, frontend separate
4. **Shared Code** - Only truly shared code goes in `shared/`
5. **Consistency** - Follow existing patterns in similar features

**When in doubt:**
- Look at similar existing features
- Follow the decision tree above
- Check this map for reference
- Ask: "Is this truly shared or domain-specific?"

**The platform is well-organized.** New features should follow the established patterns for consistency and maintainability.
