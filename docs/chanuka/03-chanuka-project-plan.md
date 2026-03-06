# CHANUKA PLATFORM — PROJECT MANAGEMENT PLAN
*Sequenced Roadmap to Production · March 2026*

---

## GUIDING PRINCIPLE

The product vision is not the risk. The platform has enough features — it does not need more rooms. The risk is operational failure under load, data credibility failure on key scorecards, and the compounding cost of a reactive-fix cycle that has already run through four stabilization phases.

The plan below breaks that cycle. It sequences work by what is blocking everything else, not by what is most exciting to build.

---

## SPRINT 0 — STOP THE CYCLE *(1 Week · Before Everything Else)*

Before any new work begins, clear the reactive backlog. The existence of `PHASE1_COMPLETION_SUMMARY.md` through `PHASE4_COMPLETION_SUMMARY.md`, `CLEANUP_PLAN.md`, `CONFLICT_ANALYSIS_FIXES_NEEDED.md`, and `ERROR-FIXING-EXECUTION-PLAN.md` indicates a pattern: ambitious feature sprints followed by emergency stabilization. That pattern must end before more features are added.

**Deliverables:**
- Resolve all open items in `CLEANUP_PLAN.md` and `CONFLICT_ANALYSIS_FIXES_NEEDED.md`
- Eliminate remaining ESLint suppressions (`fix-eslint-suppressions.ts`)
- Verify `reset-database-fixed.ts` is stable and remove the original broken version
- Document what each PHASE completion summary resolved — and what it left open
- Produce a single "current state" document that replaces the four phase summaries

**Success gate:** Zero reactive-named files remain in the repository.

---

## PHASE 1 — FOUNDATION HARDENING *(Weeks 2–5)*
*Goal: Make what exists deployable to a multi-instance production environment*

This phase closes the three load-bearing fractures identified in the audit. No new features. No new infrastructure. Only hardening what is already built.

### P1-1 · Distribute Rate Limiting *(2 days)*

| | |
|---|---|
| **Problem** | `SecurityMiddleware` uses an in-memory `Map` for rate limit tracking. Fails silently under horizontal scaling. |
| **Fix** | Wire the already-imported Redis client to rate limiting. Replace `Map` with Redis-backed counters. |
| **Risk if skipped** | A multi-instance deployment with in-memory rate limiting is exploitable on day one. Political actors probing a civic accountability platform will find it. |

### P1-2 · Resolve Denormalized Counter Drift *(3 days)*

| | |
|---|---|
| **Problem** | Aggregate counters in the schema (vote tallies, score summaries, exposure totals) have no database triggers or update queues. Under concurrent writes, they drift. |
| **Fix** | Audit every denormalized counter. For each: add a database trigger, implement an event-driven update queue, or remove denormalization and accept the query cost. |
| **Risk if skipped** | MP accountability scorecards display silently incorrect numbers. A platform built on civic credibility cannot survive visible data errors. |

### P1-3 · Add Distributed Tracing *(4 days)*

| | |
|---|---|
| **Problem** | No OpenTelemetry, no APM. When a complex multi-service query degrades, there is no way to identify which component failed or how long it took. |
| **Fix** | Instrument the five highest-risk paths with OpenTelemetry spans: constitutional violation detector, trojan bill ML pipeline, shadow ledger queries, gap calculation service, and WebSocket broadcast paths. Integrate with one APM provider (Datadog, Grafana Cloud, or equivalent). |
| **Risk if skipped** | The first production incident during a high-profile parliamentary session will be undiagnosable. |

### P1-4 · Backup, Recovery & Rollback *(3 days)*

| | |
|---|---|
| **Problem** | No backup strategy, no disaster recovery plan, no documented rollback procedures for migrations. |
| **Fix** | Implement automated PostgreSQL backups. Document and test migration rollback for every existing migration. Create a basic incident response runbook covering database recovery, service restart, and rollback procedures. |

### P1-5 · Load Testing Baseline *(3 days)*

| | |
|---|---|
| **Problem** | System behavior under the concurrent load of a high-visibility parliamentary session is unknown. |
| **Fix** | Write load tests simulating: 500 concurrent users on the bills dashboard, 200 concurrent comment submissions, 50 concurrent electoral accountability scorecard requests. Establish baseline metrics. Identify the first bottleneck. |

**Phase 1 Exit Gate:** Platform deployable to a two-instance environment with confidence. Rate limiting distributed. Counter drift resolved. APM active in staging.

---

## PHASE 2 — CRITICAL DEPENDENCY RESOLUTION *(Weeks 6–11)*
*Goal: Unblock the three clusters that are preventing flagship features from working*

### P2-1 · Government Data Integration *(3 weeks)*

This is the highest-leverage completion target in the codebase. Electoral accountability, voting record accuracy, financial disclosure analysis, and sponsorship conflict detection all depend on it.

**Week 1:** Audit current integration state. Map every government data source to a specific schema table. Identify which sources have working API clients, which require scraping, and which require manual data entry as a bridge.

**Week 2:** Complete API client for parliamentary voting records. Implement data validation pipeline and conflict resolution. Build reconciliation process to detect and alert on stale data.

**Week 3:** Complete bill metadata enrichment pipeline. Add data quality checks with alerting. Test end-to-end sync from government source to electoral accountability scorecard.

**Completion target:** Government Data Integration from 45% → 85%

### P2-2 · ML Model Foundations *(3 weeks, parallel with P2-1)*

The platform must not surface ML-powered features that present confident-looking results from unvalidated models. This phase establishes the minimum viable ML foundation.

**Week 1:** Audit the current state of each ML model. For each: document what training data exists, what data is needed, and what the minimum viable accuracy threshold is for production use. Make a go/no-go decision per model.

**Week 2:** Prioritize the pretext detection model (highest civic risk if wrong) and complete initial training pipeline with evaluation framework. Set explicit accuracy gates: a model that does not meet threshold stays behind a feature flag.

**Week 3:** Apply the same process to constitutional intelligence. For models that are not production-ready, implement clear UI states: "Analysis pending" or "Expert review required" — never silent confidence.

**Completion target:** ML/AI from 30% → 60%; all production-facing features behind accuracy-gated feature flags

### P2-3 · Neo4j Graph Sync Stabilization *(1 week)*

**Fix:** Complete the PostgreSQL → Neo4j sync service. Deploy Neo4j to a staging environment. Validate influence mapping and parliamentary network analysis against known relationships. Establish sync monitoring.

**Completion target:** Graph Database from 40% → 70%

**Phase 2 Exit Gate:** Electoral accountability scorecard displays verified data from government sources. Pretext detection model has passed accuracy gate and is live behind feature flag. Graph database is syncing reliably in staging.

---

## PHASE 3 — OPERATIONAL COMPLETENESS *(Weeks 12–17)*
*Goal: The platform can be operated, monitored, and scaled by someone who didn't build it*

### P3-1 · CI/CD Pipeline Completion *(1 week)*

Complete GitHub Actions workflows for: automated testing on pull request, staging deployment on merge to main, production deployment on tag. Add database migration safety checks as a required CI step. No deployment without passing migrations in a staging clone.

### P3-2 · Blue-Green Deployment *(1 week)*

Implement blue-green or canary release pattern with automated health check gates. A failed health check must block promotion automatically — not require manual intervention.

### P3-3 · Monitoring Dashboard *(1 week)*

Wire the existing metrics collection to a visualization layer. Minimum viable dashboard: request latency by feature, error rate by service, cache hit rates, WebSocket connection count, and government data sync lag. Add alerting rules for each.

### P3-4 · Log Aggregation *(3 days)*

Ship structured Pino logs to a centralized store. Minimum: logs are searchable, filterable by correlation ID, and retained for 30 days. This is the difference between "something went wrong" and "here is exactly what happened."

### P3-5 · Operational Documentation *(1 week)*

Produce three runbooks: database recovery, service degradation response, and government data sync failure. Produce one architecture decision record (ADR) per major non-obvious technical choice (dual-database topology, Result monad pattern, in-memory fallback caching). These documents exist so that a new engineer can operate the platform without the original author.

### P3-6 · WCAG Accessibility Audit *(1 week)*

Conduct a formal WCAG 2.1 AA audit. ARIA patterns and skip links exist but have not been validated end-to-end. For a civic platform that explicitly serves citizens across the digital divide, this is not optional.

**Phase 3 Exit Gate:** The platform can be deployed, monitored, and recovered by an engineer who was not on the original team.

---

## PHASE 4 — FEATURE COMPLETION *(Weeks 18–26)*
*Goal: Flagship intelligence features reach production-ready status*

Only after Phases 1–3 are complete should feature completion resume. Adding more rooms while the foundation is unstable has already produced four stabilization phases. Phase 4 breaks that pattern.

| Feature | Current | Target | Key Work |
|---|:---:|:---:|---|
| Electoral Accountability | 55% | 90% | Complete gap calculation, verified government data, scorecard validation |
| Advocacy Coordination | 50% | 85% | Complete campaign management, coalition tools, impact tracking |
| Constitutional Intelligence | 60% | 80% | ML model to accuracy gate, expert review workflow |
| Argument Intelligence | 65% | 80% | NLP training corpus, coalition finder, brief generator |
| USSD Gateway | 50% | 85% | External gateway integration, session reliability, end-to-end testing |
| Internationalization | Partial | 90% | Complete Swahili coverage, RTL handling, locale testing |

---

## PHASE 5 — SCALE & GROWTH *(Weeks 27–36)*
*Goal: The platform handles production traffic and can be extended*

| Item | Work Required |
|---|---|
| Auto-Scaling | Configure horizontal pod autoscaling or equivalent; load test to validate |
| CDN Integration | Configure asset delivery; implement cache headers strategy |
| API Versioning | Implement versioning scheme; document migration path for API consumers |
| API Documentation (OpenAPI) | Generate full OpenAPI spec from existing route definitions |
| Mobile-Specific API Layer | Define mobile API contract; implement response shaping for low-bandwidth contexts |
| Performance Optimization | Full query profiling pass; add FTS indexes on bill text; expression indexes on JSONB paths |
| SEO Strategy | Implement structured data for bills and MP profiles; meta tag management |

---

## RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| Government API unavailability / format changes | High | High | Build scraping fallback for each API; implement data staleness alerts |
| ML model accuracy below threshold at launch | High | High | Feature flags per model with explicit accuracy gates; "expert review" fallback UI |
| Data drift on MP scorecards during high-traffic session | Medium | Critical | Phase 1 counter drift resolution is non-negotiable before launch |
| Political actor probing / adversarial traffic | High | High | Distributed rate limiting (Phase 1), CIB detection (already implemented) |
| Loss of institutional knowledge (single contributor) | Medium | High | Phase 3 operational documentation; ADRs; runbooks |
| Reactive-fix cycle resuming after Phase 2 feature pressure | Medium | Medium | Sprint 0 process agreement; no feature work in Phase 1 |

---

## SUCCESS METRICS BY PHASE

| Phase | Key Metric |
|---|---|
| Sprint 0 | Zero reactive-named files in repository |
| Phase 1 | Two-instance deployment stable for 72 hours; rate limiting verified distributed; counter drift resolved |
| Phase 2 | Electoral accountability scorecard populated from verified government data; pretext detection live behind accuracy gate |
| Phase 3 | Mean time to detect (MTTD) production incident < 5 minutes; new engineer can deploy without original author |
| Phase 4 | Flagship intelligence features live with documented accuracy confidence levels |
| Phase 5 | Platform handles 1,000 concurrent users without degradation |

---

## WHAT NOT TO BUILD RIGHT NOW

The following are technically present or partially implemented but should not receive investment until Phases 1–3 are complete.

**Do not prioritize:** SEO optimization · Mobile app API · Plugin/extensibility system · Additional third-party integrations · New analytics dashboards · Additional social sharing features

**Reason:** Each of these amplifies inbound traffic and usage complexity. Building them before the platform is operationally stable accelerates the next stabilization crisis.

---
*Roadmap prepared: March 6, 2026 · Based on implementation evidence only*
