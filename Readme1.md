# Project Refactoring Summary (October 21, 2025)

## Overview 📜

This document summarizes a series of significant refactoring efforts applied to the backend codebase during our conversation. The primary goals were to address critical architectural flaws, improve adherence to Domain-Driven Design (DDD) principles (evident in the existing structure), enhance data persistence, increase modularity, and consolidate overlapping functionality, particularly around notifications.

---

## 1. Bill Tracking Feature Refactor 🎯

### Problem Identified

* **Data Loss Risk:** The original implementation (`server/features/bills/bill-tracking.ts`) incorrectly used the cache as the primary storage for user-specific bill tracking preferences (e.g., alert frequency, channels). This meant settings would be lost upon cache eviction or server restart.
* **Architectural Violation:** The same file mixed business logic (Service layer) with API endpoint definitions (Presentation layer), violating the Single Responsibility Principle (SRP) and the project's established DDD structure.
* **Preference Granularity:** Existing global preferences in `user.preferences` did not support setting notification rules on a *per-bill* basis.

### Changes Implemented ✨

* **Database Persistence:**
    * Introduced a new database table `user_bill_tracking_preference` via migration `drizzle/0019_add_tracking_preferences.sql` to store per-bill user preferences durably.
    * Updated `shared/schema/schema.ts` to define the `userBillTrackingPreference` table and its corresponding TypeScript types.
* **Code Separation & Logic Update:**
    * **DELETED:** Old `server/features/bills/bill-tracking.ts`.
    * **ADDED:** `server/features/bills/application/bill-tracking.service.ts` - Contains the refactored `BillTrackingService`. It now performs CRUD operations on the `userBillTrackingPreference` table, ensuring preferences are saved persistently. It also retains the logic for updating the `billEngagement` table upon tracking actions. Cache is used appropriately for reads. Notification triggering logic was removed (delegated to orchestrator).
    * **ADDED:** `server/features/bills/presentation/bill-tracking.routes.ts` - Defines the Express router and API endpoints (e.g., `/track/:billId`, `/preferences/:billId`, `/tracked`) related to bill tracking, cleanly separating it from the service logic.
* **Testing:**
    * **ADDED:** Unit tests (`bill-tracking.service.test.ts`) for the new service, mocking database and cache interactions.
    * **ADDED:** API integration tests (`bill-tracking.routes.test.ts`) using Jest and `supertest` for the new routes.

### Key Improvements ✅

* **Data Durability:** User's per-bill notification settings are now stored reliably in the database.
* **Architectural Alignment:** Follows DDD by separating Application and Presentation layers.
* **Maintainability:** Clearer responsibilities make the code easier to manage and test.
* **Functionality:** Enables users to set distinct notification preferences for each bill they track.

---

## 2. Real-Time Analysis Feature Refactor 🔬

### Problem Identified

* The `server/features/bills/real-time-analysis.ts` file was a "God Class", performing multiple distinct analysis types (constitutional, stakeholder, transparency, etc.) within a single large class. This violated SRP and made the code difficult to test and maintain.
* An existing router at `server/features/analytics/analysis.ts` provided analysis endpoints but relied on the old engine and basic storage functions.

### Changes Implemented ✨

* **New Feature Structure (`server/features/analysis/`):**
    * Created a dedicated feature directory following the established DDD structure (`application`, `domain`, `infrastructure`, `presentation`).
* **Code Modularity:**
    * **DELETED:** Old `server/features/bills/real-time-analysis.ts`.
    * **ADDED:** Individual analysis services in `server/features/analysis/application/`:
        * `constitutional-analysis.service.ts`
        * `stakeholder-analysis.service.ts`
        * `transparency-analysis.service.ts`
        * `public-interest-analysis.service.ts`
    * **ADDED:** `server/features/analysis/application/bill-comprehensive-analysis.service.ts` - Orchestrates calls to the individual services, aggregates results, calculates overall confidence, generates recommendations, and saves the final analysis.
* **Domain & Infrastructure:**
    * **ADDED:** `server/features/analysis/domain/entities/analysis-result.ts` - Defines the structured types for analysis outputs.
    * **ADDED:** `server/features/analysis/domain/repositories/analysis-repository.ts` - Interface for analysis data persistence.
    * **ADDED:** `server/features/analysis/infrastructure/repositories/analysis-repository-impl.ts` - Drizzle implementation for saving/retrieving analysis results to/from the existing `analysis` table.
    * **ADDED:** `server/features/analysis/infrastructure/adapters/ml-service-adapter.ts` - Example adapter structure for integrating external ML services.
* **API Routing:**
    * **DELETED:** Old analysis router `server/features/analytics/analysis.ts`.
    * **ADDED:** `server/features/analysis/presentation/analysis.routes.ts` - New router providing endpoints (e.g., `/bills/:billId/comprehensive`, `/bills/:billId/comprehensive/run`, `/bills/:billId/history`) that utilize the new `billComprehensiveAnalysisService`.
* **Testing:**
    * **ADDED:** Unit tests for each new analysis service and the repository implementation.
    * **ADDED:** API integration tests for the new analysis routes.

### Key Improvements ✅

* **Modularity & SRP:** Each analysis concern is handled by a dedicated service.
* **Testability:** Smaller units are easier to test in isolation.
* **Maintainability:** Code is significantly easier to navigate, understand, and modify.
* **Extensibility:** New analysis types can be added without modifying existing ones.
* **Architectural Alignment:** Conforms to the project's DDD structure.

---

## 3. Sponsors Feature Creation 🏛️

### Problem Identified

* Sponsor-related functionality (data access, conflict analysis, API routes) was scattered within the `server/features/bills/` directory, despite "Sponsor" being a distinct domain concept.

### Changes Implemented ✨

* **New Feature Structure (`server/features/sponsors/`):**
    * Created a dedicated feature directory following the DDD structure.
* **Code Relocation & Renaming:**
    * **DELETED:** `server/features/bills/sponsor-service.ts`.
    * **DELETED:** `server/features/bills/sponsor-conflict-analysis.ts`.
    * **DELETED:** `server/features/bills/sponsors.ts`.
    * **ADDED:** `server/features/sponsors/infrastructure/repositories/sponsor.repository.ts` - Contains the data access logic (CRUD, listing, searching sponsors, affiliations, transparency) previously in `sponsor-service.ts`. Renamed to reflect its infrastructure role.
    * **ADDED:** `server/features/sponsors/application/sponsor-conflict-analysis.service.ts` - Contains the conflict detection and risk analysis business logic previously in `sponsor-conflict-analysis.ts`. Now depends on `SponsorRepository` for data.
    * **ADDED:** `server/features/sponsors/presentation/sponsors.routes.ts` - Contains the Express router and API endpoints for `/api/sponsors/...`, previously in `sponsors.ts`. Uses the new repository and analysis service.
* **Code Kept in `bills` Feature:**
    * `server/features/bills/application/sponsorship-analysis.ts` (renamed `sponsorship-analysis.service.ts`) - Remains in `bills` as it analyzes sponsorships from a *bill's* perspective.
    * `server/features/bills/presentation/sponsorship.ts` (renamed `sponsorship.routes.ts`) - Remains in `bills` as it handles `/api/bills/:billId/sponsorship-analysis/...` routes.
* **Barrel Files:** Added `index.ts` files in the new `sponsors` feature directories for organized exports.
* **Testing:**
    * **ADDED:** Unit tests for the new `sponsor.repository.ts` and `sponsor-conflict-analysis.service.ts`.
    * **ADDED:** API integration tests for the new `sponsors.routes.ts`.

### Key Improvements ✅

* **Domain Separation:** Clearly separates Sponsor concerns from Bill concerns.
* **Organization:** Improves code navigability and modularity.
* **DDD Alignment:** Establishes Sponsor as a distinct feature/bounded context.

---

## 4. Notification Logic Consolidation 📢

### Problem Identified

* Logic for deciding *if*, *when*, and *how* to send notifications based on user preferences was duplicated and inconsistently handled across `bill-status-monitor.ts` and `notification-orchestrator.ts`.
* Preference checking only considered global settings (`user.preferences`), ignoring the need for per-bill overrides.

### Changes Implemented ✨

* **Refactored `server/features/bills/bill-status-monitor.ts`:**
    * **Removed:** Logic for fetching user preferences, checking quiet hours, determining channels, batching, and directly calling `notificationService`.
    * **Modified:** Now detects bill status/engagement events, fetches minimal bill context, finds potentially relevant users (based on the *event type* and *bill ID* using the new `userBillTrackingPreference` table), and **triggers** `notificationOrchestratorService.sendNotification` for each potential recipient.
* **Refactored `server/infrastructure/notifications/notification-orchestrator.ts`:**
    * **Enhanced:** The `getCombinedPreferences` method now fetches both global preferences (from `userPreferencesService`) and per-bill preferences (from `userBillTrackingPreference` table), prioritizing per-bill settings.
    * **Modified:** The `sendNotification` pipeline (filtering, batching, delivery) now uses these *combined* preferences to make decisions. It remains the central authority for applying rate limits, batching rules, quiet hours, channel selection, and retries.
* **Refactored `server/infrastructure/notifications/smart-notification-filter.ts`:**
    * **Modified:** The `shouldSendNotification` method now receives the `CombinedBillTrackingPreferences` object within its `FilterCriteria` from the orchestrator. Its internal checks (e.g., `checkNotificationTypeEnabled`, `checkCategoryRelevance`) utilize these combined preferences passed as input.
* **Refactored `server/features/users/domain/user-preferences.ts`:**
    * **Clarified Role:** Added comments and refined implementation to emphasize its role in managing only **global** default preferences stored in `user.preferences`. Removed redundant notification checking logic (`shouldNotifyUser`, `getUsersToNotify`) which is now handled comprehensively by the orchestrator.
    * **Robustness:** Improved default merging logic (`deepMerge`, `deepClone`) for better resilience.
* **Testing:**
    * **UPDATED:** Tests for `bill-status-monitor.ts` verify it calls the orchestrator correctly.
    * **UPDATED/ADDED:** Tests for `notification-orchestrator.ts` verify the fetching and merging of global/per-bill preferences.
    * **UPDATED:** Tests for `smart-notification-filter.ts` verify it uses the combined preferences passed in the criteria.

### Key Improvements ✅

* **Centralized Logic:** Notification decision-making (filtering, batching, channel selection) is consolidated in the orchestrator.
* **Correct Preference Handling:** Accurately respects both global defaults and specific per-bill overrides.
* **Reduced Redundancy:** Eliminates duplicate preference checks and batching logic.
* **Improved Separation:** `bill-status-monitor` focuses on event detection, orchestrator focuses on delivery coordination.

---

## 5. Voting Pattern Analysis Update 🗳️

### Problem Identified

* The `server/features/bills/voting-pattern-analysis.ts` service relied entirely on **generating synthetic (fake) voting data** as no real data source was integrated.

### Changes Implemented ✨

* **UPDATED:** `server/features/bills/voting-pattern-analysis.ts`
    * Kept synthetic data generation (`generateSyntheticVotingRecords`) but added clear warnings and documentation about its placeholder nature.
    * Added explicit comments at the `getVotingRecords` method, marking it as the **critical integration point** for real voting data.
    * Refined internal logic (e.g., consistency calculation, prediction factors) to be more robust, while acknowledging the input data might be synthetic.

### Key Improvements ✅ / Next Steps ➡️

* **Clarity:** Code explicitly states the use of synthetic data and the need for integration.
* **Functionality:** Service remains runnable for testing/demo purposes.
* **Action Item:** **Integrating a real data source** for `getVotingRecords` is the essential next step to make this feature provide meaningful analysis.

---

## 6. Supporting Changes 🛠️

* **Project Structure File:** Updated `docs/project-structure.md` to accurately reflect the new feature directories (`analysis`, `sponsors`) and moved files.
* **Barrel Files (`index.ts`):** Created barrel files in new feature directories (`analysis`, `sponsors`) and their subdirectories to simplify imports and adhere to project patterns.
* **Test Files:** Added comprehensive Jest unit and integration tests for all new and significantly refactored services, repositories, and routes as detailed in the sections above.

---

## Summary of File Changes  summarised:

* **Added:**
    * `drizzle/0019_add_tracking_preferences.sql`
    * `server/features/bills/application/bill-tracking.service.ts`
    * `server/features/bills/presentation/bill-tracking.routes.ts`
    * `server/features/analysis/**` (multiple files across layers)
    * `server/features/sponsors/**` (multiple files across layers)
    * All corresponding `__tests__` files for the above.
* **Modified:**
    * `shared/schema/schema.ts` (added `userBillTrackingPreference`)
    * `server/features/bills/bill-status-monitor.ts` (simplified, calls orchestrator)
    * `server/infrastructure/notifications/notification-orchestrator.ts` (handles combined prefs)
    * `server/infrastructure/notifications/smart-notification-filter.ts` (uses combined prefs)
    * `server/features/users/domain/user-preferences.ts` (clarified global role)
    * `server/features/bills/voting-pattern-analysis.ts` (added warnings re: synthetic data)
    * `docs/project-structure.md` (reflects new structure)
    * Server entry point (`server/index.ts` or similar - added new routers)
* **Deleted:**
    * `server/features/bills/bill-tracking.ts`
    * `server/features/bills/real-time-analysis.ts`
    * `server/features/analytics/analysis.ts` (old router)
    * `server/features/bills/sponsor-service.ts`
    * `server/features/bills/sponsor-conflict-analysis.ts`
    * `server/features/bills/sponsors.ts`

---

## Action Required ⚙️

1.  **Apply Code Changes:** Create the new directories and files, paste the provided code, replace the modified files, and delete the deprecated files.
2.  **Run Database Migration:** Apply the migration `drizzle/0019_add_tracking_preferences.sql`.
3.  **Update Server Entry Point:** Modify your main server file (e.g., `server/index.ts`) to:
    * Remove registration of the old `analysis` router (`server/features/analytics/analysis.ts`).
    * Remove registration of the old `sponsors` router (`server/features/bills/sponsors.ts`).
    * Add registration for the new `billTrackingRouter` (`server/features/bills/presentation/bill-tracking.routes.ts`).
    * Add registration for the new `analysisRouter` (`server/features/analysis/presentation/analysis.routes.ts`).
    * Add registration for the new `sponsorsRouter` (`server/features/sponsors/presentation/sponsors.routes.ts`).
4.  **Update Imports:** Perform a codebase search for imports pointing to the deleted file paths and update them to the new locations (e.g., imports of `sponsorService` should now point to `sponsorRepository` in its new path).
5.  **Install Test Dependencies:** Ensure `supertest` and `@types/supertest` are installed (`npm install --save-dev supertest @types/supertest`).
6.  **Run Tests:** Execute backend Jest tests (`npm run test:backend` or similar) and frontend Playwright E2E tests to confirm the refactoring did not introduce regressions.
7.  **(Future)** Prioritize integrating a real data source for `voting-pattern-analysis.ts`.