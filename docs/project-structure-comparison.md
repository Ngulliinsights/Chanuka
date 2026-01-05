# Chanuka Project Structure: Gap Analysis & Migration Path

## Executive Summary

**Current State**: Monolithic TypeScript application with excellent feature coverage but limited scalability  
**Target State**: Microservices-ready monorepo with domain-driven architecture  
**Migration Priority**: HIGH - New development should follow optimal structure  
**Timeline**: 20-week phased migration recommended

---

## 1. STRUCTURAL COMPARISON MATRIX

| Aspect | Current Reality | Optimal Target | Gap Severity | Priority |
|--------|----------------|----------------|--------------|----------|
| **Application Count** | 1 (monolithic) | 4 (web/api/websocket/worker) | 🔴 Critical | P0 |
| **Domain Separation** | Mixed in features/ | Clear domain boundaries | 🔴 Critical | P0 |
| **Shared Code** | Inconsistent imports | Packages/ structure | 🟡 High | P1 |
| **Database Layer** | Single coupled DB | Multi-database ready | 🟡 High | P2 |
| **Service Independence** | All services coupled | Independent deployment | 🔴 Critical | P0 |
| **Type Safety** | Comprehensive ✅ | Maintained + shared | 🟢 Good | P3 |

---

## 2. DOMAIN MAPPING: CURRENT → OPTIMAL → ARCHITECTURAL VISION

### Domain 1: Constitutional Analysis Engine

#### Current Location
```
client/src/features/analysis/
├── model/
│   └── hooks/useConflictAnalysis.ts
└── ui/
    └── dashboard/AnalysisDashboard.tsx

server/features/constitutional-analysis/
└── application/constitutional-analysis-service-complete.ts
```

#### Optimal Structure Should Be
```
apps/
├── api/src/features/constitutional-analysis/
│   ├── application/
│   │   ├── constitutional-analyzer.ts
│   │   ├── grounding-service.ts          ❌ MISSING
│   │   ├── uncertainty-assessor.ts       ❌ MISSING
│   │   └── expert-flagging-service.ts
│   └── infrastructure/
│       └── external/legal-database-client.ts ❌ MISSING

packages/
└── database/src/schemas/constitutional_intelligence.ts ✅ EXISTS
```

**Gap**: Grounding and uncertainty quantification services not implemented  
**Impact**: Analysis lacks research-backed "precedent connection" feature  
**Priority**: P1 - Core differentiator

---

### Domain 2: Argument Intelligence Layer

#### Current Location
```
client/src/features/community/
└── hooks/useCommunity.ts

server/features/argument-intelligence/
├── application/argument-processor.ts     ❌ MISSING
└── infrastructure/nlp/                   ❌ MISSING
```

#### Optimal Structure Should Be
```
apps/
└── api/src/features/argument-intelligence/
    ├── application/
    │   ├── structure-extractor.ts        ❌ MISSING
    │   ├── clustering-service.ts         ❌ MISSING
    │   ├── evidence-validator.ts         ❌ MISSING
    │   ├── coalition-finder.ts           ❌ MISSING
    │   └── power-balancer.ts             ❌ MISSING
    └── infrastructure/nlp/
        ├── sentence-classifier.ts        ❌ MISSING
        └── similarity-calculator.ts      ❌ MISSING
```

**Gap**: Entire argument intelligence domain missing  
**Impact**: Comments remain unstructured; no legislative briefs generated  
**Priority**: P0 - Critical research contribution

---

### Domain 3: Universal Access Infrastructure

#### Current Location
```
client/src/core/mobile/
├── device-detector.ts                    ✅ EXISTS
└── touch-handler.ts                      ✅ EXISTS

server/features/universal_access/
├── ussd.service.ts                       ✅ EXISTS
└── ussd.controller.ts                    ✅ EXISTS
```

#### Optimal Structure Should Be
```
apps/
├── ussd-gateway/                         🟡 PARTIAL (in server)
│   ├── src/gateway/ussd-server.ts
│   ├── src/menus/
│   └── src/services/telco-integrator.ts ❌ MISSING
│
└── ambassador-tools/                     ❌ MISSING
    └── mobile-app/
        ├── src/screens/session-facilitator.tsx
        └── src/offline/sync-queue.ts

packages/
└── database/src/schemas/universal_access.ts ✅ EXISTS
```

**Gap**: USSD exists but not as separate service; ambassador tools missing  
**Impact**: Universal access incomplete; no offline facilitation capability  
**Priority**: P1 - Equity cornerstone

---

### Domain 4: Advocacy Coordination

#### Current Location
```
server/features/advocacy/
├── application/campaign-service.ts       ✅ EXISTS
└── domain/entities/campaign.ts           ✅ EXISTS

packages/database/src/schemas/advocacy_coordination.ts ✅ EXISTS
```

#### Optimal Structure
```
apps/api/src/features/advocacy/
├── application/
│   ├── campaign-manager.ts               ✅ EXISTS
│   ├── action-coordinator.ts             ✅ EXISTS
│   ├── alert-dispatcher.ts               🟡 PARTIAL
│   └── coalition-builder.ts              ❌ MISSING
└── infrastructure/
    └── notification/
        ├── sms-dispatcher.ts             🟡 PARTIAL
        └── push-dispatcher.ts            ✅ EXISTS
```

**Gap**: Coalition building (requires argument intelligence)  
**Impact**: Manual coalition formation; no automated recommendations  
**Priority**: P2 - Dependent on argument intelligence

---

### Domain 5: Institutional Integration

#### Current Location
```
server/features/analytics/
└── services/engagement.service.ts        ✅ EXISTS

client/src/features/admin/
└── ui/admin-dashboard.tsx                ✅ EXISTS
```

#### Optimal Structure Should Be
```
apps/
└── institutional-api/                    ❌ MISSING
    ├── src/gateway/api-gateway.ts
    ├── src/adapters/committee-adapters/
    │   ├── budget-committee.ts           ❌ MISSING
    │   └── constitutional-affairs.ts     ❌ MISSING
    └── src/subscription/
        ├── tier-manager.ts               ❌ MISSING
        └── billing-integration.ts        ❌ MISSING
```

**Gap**: No dedicated institutional API; basic analytics only  
**Impact**: Cannot serve institutional clients; no revenue model  
**Priority**: P2 - Revenue generation

---

### Domain 6: Political Resilience Infrastructure

#### Current Location
```
server/features/security/
├── intrusion-detection-service.ts        ✅ EXISTS
└── security-monitoring.ts                ✅ EXISTS
```

#### Optimal Structure Should Be
```
apps/
└── resilience-infrastructure/            ❌ MISSING
    ├── monitoring/threat-detection/
    │   ├── media-scanner.ts              ❌ MISSING
    │   └── legislative-tracker.ts        ❌ MISSING
    ├── backup-system/
    │   ├── distributed-backup.ts         ❌ MISSING
    │   └── jurisdiction-manager.ts       ❌ MISSING
    └── legal-defense/
        └── templates/                    ❌ MISSING
```

**Gap**: Basic security exists; political resilience strategy missing  
**Impact**: Platform vulnerable to political suppression  
**Priority**: P3 - Important but can phase in

---

### Domain 7: AI Infrastructure & Evaluation

#### Current Location
```
shared/ml/
├── models/
│   ├── constitutional-analyzer.ts        🟡 PARTIAL
│   └── sentiment-analyzer.ts             ✅ EXISTS
└── services/ml-orchestrator.ts           ✅ EXISTS

server/features/analytics/ml.service.ts   ✅ EXISTS
```

#### Optimal Structure Should Be
```
ai-models/                                🟡 PARTIAL (in shared/ml)
├── constitutional/
│   ├── provision-matcher/               🟡 BASIC ONLY
│   └── precedent-finder/                ❌ MISSING
└── evaluation/
    ├── benchmarks/legal-glue/           ❌ MISSING
    └── bias-detection/                  ❌ MISSING

evaluation-framework/                     ❌ MISSING
└── continuous-evaluation/
```

**Gap**: Basic ML exists; no evaluation framework or benchmarking  
**Impact**: Cannot verify AI quality or detect bias  
**Priority**: P1 - Research integrity requirement

---

### Domain 8: Impact Measurement

#### Current Location
```
client/src/features/analytics/
└── ui/dashboard/AnalyticsDashboard.tsx   ✅ EXISTS

server/features/analytics/
├── services/engagement.service.ts        ✅ EXISTS
└── dashboard.ts                          ✅ EXISTS
```

#### Optimal Structure Should Be
```
apps/
└── impact-measurement/                   ❌ MISSING
    ├── src/tracking/
    │   ├── participation-tracker.ts      🟡 BASIC ONLY
    │   ├── advocacy-tracker.ts           ❌ MISSING
    │   └── attribution-engine.ts         ❌ MISSING
    └── src/reporting/
        └── impact-report-generator.ts    ❌ MISSING
```

**Gap**: Basic analytics exist; no rigorous impact measurement  
**Impact**: Cannot prove democratic effectiveness claims  
**Priority**: P2 - Credibility and funding dependent

---

## 3. CRITICAL ARCHITECTURAL GAPS

### 🔴 Missing Entirely (Highest Risk)

1. **Argument Intelligence Layer** (Domain 2)
   - No structure extraction from comments
   - No clustering of similar arguments
   - No legislative brief generation
   - **Impact**: Platform cannot transform participation into influence

2. **Institutional API** (Domain 5)
   - No dedicated API for institutional clients
   - No committee-specific formatting
   - No subscription/billing system
   - **Impact**: No revenue model; cannot sustain operations

3. **AI Evaluation Framework** (Domain 7)
   - No benchmarking against Legal-GLUE
   - No bias detection
   - No continuous monitoring
   - **Impact**: Cannot verify research claims about AI quality

### 🟡 Partially Implemented (Needs Completion)

1. **Constitutional Analysis** (Domain 1)
   - ✅ Basic analysis exists
   - ❌ No grounding in precedent
   - ❌ No uncertainty quantification
   - ❌ No expert flagging workflow
   - **Impact**: Analysis not research-backed

2. **Universal Access** (Domain 3)
   - ✅ USSD service exists
   - ❌ Not separate deployable service
   - ❌ No ambassador mobile app
   - ❌ No offline sync capability
   - **Impact**: Access remains limited

3. **Impact Measurement** (Domain 8)
   - ✅ Basic analytics dashboard
   - ❌ No advocacy outcome tracking
   - ❌ No attribution engine
   - ❌ No rigorous evaluation
   - **Impact**: Cannot prove effectiveness

### 🟢 Well Implemented

1. **Basic Infrastructure**
   - ✅ Database schemas comprehensive
   - ✅ Type safety throughout
   - ✅ WebSocket real-time
   - ✅ Security basics
   - ✅ Error handling

---

## 4. MIGRATION ROADMAP: 20-WEEK PLAN

### Phase 1: Foundation (Weeks 1-4) - CRITICAL PATH
**Goal**: Establish monorepo structure and shared packages

```
Week 1-2: Setup
- Create monorepo structure with Turborepo/Nx
- Extract database schemas to packages/database
- Create packages/types for shared types
- Set up build/test infrastructure

Week 3-4: Initial Migration
- Move client to apps/web
- Create apps/api skeleton
- Establish shared package imports
- Update all import paths
```

**Deliverable**: Working monorepo with client and API separated

---

### Phase 2: Argument Intelligence (Weeks 5-8) - HIGHEST VALUE
**Goal**: Implement missing core differentiator

```
Week 5: Infrastructure
- NLP model research and selection
- Set up ML pipeline (training/inference)
- Create argument-intelligence feature folder

Week 6: Core Services
- Structure extractor (claims/evidence/reasoning)
- Basic clustering service (semantic similarity)

Week 7: Advanced Services
- Evidence validator
- Coalition finder

Week 8: Integration
- Connect to comment system
- Create basic legislative brief generator
- Test with historical comment data
```

**Deliverable**: Working argument intelligence transforming comments to briefs

---

### Phase 3: Constitutional Grounding (Weeks 9-12) - RESEARCH INTEGRITY
**Goal**: Complete constitutional analysis per research requirements

```
Week 9: Knowledge Base
- Import constitutional provisions database
- Structure legal precedent database
- Create citation parser

Week 10: Grounding Service
- Implement precedent matching
- Connect analysis to case law
- Add scholarly work references

Week 11: Uncertainty Assessment
- Implement interpretive complexity scoring
- Add confidence indicators
- Create uncertainty visualization

Week 12: Expert Workflow
- Build expert flagging system
- Create review interface
- Implement notification system
```

**Deliverable**: Research-backed constitutional analysis with grounding

---

### Phase 4: Universal Access Completion (Weeks 13-16) - EQUITY
**Goal**: Complete universal access infrastructure

```
Week 13: USSD Refactor
- Extract USSD to apps/ussd-gateway
- Implement all telco integrations
- Create comprehensive menu system

Week 14: Ambassador App
- Build React Native offline-capable app
- Implement local storage + sync
- Create facilitation guides

Week 15: Localization
- Complete translation pipeline
- Add audio generation (TTS)
- Implement complexity adjustment

Week 16: Testing & Integration
- Test offline scenarios
- Verify multi-language support
- Train first ambassador cohort
```

**Deliverable**: Complete zero-barrier access for all citizens

---

### Phase 5: Institutional Integration (Weeks 17-20) - SUSTAINABILITY
**Goal**: Create revenue-generating institutional API

```
Week 17: API Gateway
- Build apps/institutional-api
- Implement authentication/rate limiting
- Create API documentation

Week 18: Format Adapters
- Committee-specific formatting
- PDF/Word/Excel export
- Parliamentary format templates

Week 19: Subscription System
- Implement tier management
- Add billing integration
- Create usage analytics

Week 20: Launch Preparation
- Beta test with one institution
- Gather feedback and iterate
- Create marketing materials
```

**Deliverable**: Functioning institutional API with first paying customer

---

## 5. TECHNICAL DEBT & QUICK WINS

### Immediate Actions (This Week)

1. **Stop Creating New Features in Old Structure**
   ```bash
   # Create this file to document new structure
   .architecture-rules
   ```
   All new code MUST follow optimal structure in `/apps` or `/packages`

2. **Extract Database Schemas**
   ```bash
   # Already mostly done, consolidate remaining
   packages/database/src/schemas/
   ```

3. **Create Shared Types Package**
   ```bash
   packages/types/src/
   ├── constitutional.ts
   ├── argumentation.ts
   └── [domain types]
   ```

### Technical Debt to Address

| Issue | Current Impact | Effort | Priority |
|-------|---------------|--------|----------|
| Monolithic deployment | Cannot scale components independently | High | P0 |
| No argument intelligence | Comments don't influence legislation | High | P0 |
| Constitutional analysis incomplete | Not research-backed | Medium | P1 |
| No institutional API | No revenue model | Medium | P1 |
| USSD not separate service | Scaling issues | Low | P2 |
| No AI evaluation | Cannot verify quality | Medium | P2 |

---

## 6. DECISION FRAMEWORK: NEW FEATURE REQUESTS

When considering where to put new code, use this decision tree:

```
New Feature Request
        |
        ├─ Is it domain-specific? ─YES─> apps/api/src/features/{domain}/
        │                                 OR apps/web/src/features/{domain}/
        │
        ├─ Is it shared across apps? ─YES─> packages/{package-name}/
        │
        ├─ Is it infrastructure? ─YES─> apps/api/src/infrastructure/
        │                                OR shared/core/
        │
        └─ Is it a new service type? ─YES─> apps/{service-name}/
```

### Examples

**Request**: "Add vote prediction to bill analysis"
- **Decision**: `apps/api/src/features/analysis/application/vote-predictor.ts`
- **Rationale**: Domain-specific feature (analysis domain)

**Request**: "Create shared validation utility"
- **Decision**: `packages/utils/src/validation/`
- **Rationale**: Shared across client and server

**Request**: "Add SMS notifications"
- **Decision**: `apps/api/src/infrastructure/notifications/sms-dispatcher.ts`
- **Rationale**: Infrastructure concern

**Request**: "Build ML training pipeline"
- **Decision**: `apps/worker/src/jobs/ml-training.job.ts`
- **Rationale**: Background job, separate service

---

## 7. SUCCESS METRICS

### Structure Migration Success
- [ ] All apps can deploy independently
- [ ] Shared code in packages/ < 20% duplication
- [ ] Clear domain boundaries with < 5% cross-domain imports
- [ ] Build time < 5 min for single app
- [ ] Test execution parallelized across apps

### Feature Completeness Success
- [ ] Argument intelligence produces legislative briefs
- [ ] Constitutional analysis cites precedent
- [ ] USSD accessible on all 3 Kenyan carriers
- [ ] Ambassador app works offline > 24 hours
- [ ] Institutional API has ≥ 3 paying customers
- [ ] Impact measurement tracks outcomes with attribution

### Research Integrity Success
- [ ] AI evaluation framework running continuously
- [ ] Bias detection tested monthly
- [ ] Legal-GLUE benchmark scores published
- [ ] Uncertainty quantification validated by experts
- [ ] Power balancing algorithm peer-reviewed

---

## 8. RISK MITIGATION

### High-Risk Items

**Risk**: Breaking existing functionality during migration  
**Mitigation**: 
- Migrate one domain at a time
- Maintain backward compatibility layers
- Comprehensive integration tests
- Feature flags for new structure

**Risk**: Team confusion about new structure  
**Mitigation**:
- This document + architecture diagrams
- Code review guidelines
- Pair programming during transition
- Regular architecture sync meetings

**Risk**: Performance degradation from new structure  
**Mitigation**:
- Baseline performance metrics before migration
- Load testing after each phase
- Rollback plan for each phase
- Caching strategy review

---

## 9. CONCLUSION

### Current Reality
✅ **Strengths**: Comprehensive features, strong type safety, good basics  
❌ **Weaknesses**: Monolithic architecture, missing core domains, limited scalability

### Target State
🎯 **Architecture**: Microservices-ready monorepo with clear domain boundaries  
🎯 **Features**: All 8 research-backed domains fully implemented  
🎯 **Deployment**: Independent scaling, multi-region resilience  
🎯 **Sustainability**: Institutional API provides revenue

### Next Steps

**This Week**:
1. Review and approve this migration plan
2. Set up monorepo structure
3. Stop new development in old structure

**This Month** (Phase 1):
- Complete monorepo migration
- Extract shared packages
- Update all imports

**This Quarter** (Phases 2-3):
- Implement argument intelligence
- Complete constitutional grounding
- Launch to beta users

**This Year**:
- Complete all 8 domains
- Launch institutional API
- Achieve sustainability

---

**The optimal structure isn't just about organization—it's about enabling the research-backed democratic impact that Chanuka promises to deliver.**