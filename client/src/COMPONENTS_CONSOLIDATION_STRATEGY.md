# Components Directory Consolidation Strategy

## Executive Summary

This document provides a comprehensive analysis of duplicate implementations in the `client/src/components` directory and establishes a strategic consolidation plan. The analysis reveals **significant architectural debt** with multiple implementations of the same functionality across different locations, violating Feature-Sliced Design (FSD) principles.

**Key Findings:**

- **39 component subdirectories** with substantial duplication
- **7 different dashboard implementations** across the codebase
- **3 separate error boundary implementations** with varying capabilities
- **Major FSD violations** with features importing from components
- **Import path chaos** causing maintenance overhead

**Strategic Approach:** This consolidation prioritizes **implementation quality over location convenience**, ensuring the most robust, feature-complete, and maintainable implementations are preserved.

---

## 🔍 **Duplicate Implementation Analysis**

### **Category 1: Critical Duplications (Immediate Action Required)**

#### **1.1 Authentication Components**

| Implementation      | Location                  | Features                                                                                                                 | Quality Score | Recommendation           |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------ |
| **Components Auth** | `components/auth/`        | ✅ Complete RBAC<br/>✅ Advanced AuthGuard<br/>✅ Role-based routing<br/>✅ Permission system<br/>✅ Recovery mechanisms | **9/10**      | **🏆 KEEP - Superior**   |
| **Features Auth**   | `features/users/ui/auth/` | ❌ Basic components only<br/>❌ No RBAC<br/>❌ Limited functionality                                                     | **4/10**      | ❌ **REMOVE - Inferior** |

**Analysis:**

```typescript
// Components implementation (SUPERIOR)
export function AuthGuard({
  requireAuth = true,
  requireRole,
  requirePermission,
  fallbackPath = '/auth/login',
  showAccessDenied = true,
}: AuthGuardProps) {
  // Advanced permission checking with RBAC
  const { hasPermission } = usePermission(
    requirePermission?.resource || '',
    requirePermission?.action || '',
    requirePermission?.conditions
  );
  // Comprehensive error handling and recovery
}

// Features implementation (BASIC)
// Only has RegisterForm and OAuthLogin - missing core functionality
```

**Migration Plan:**

- **Target Location:** `features/users/ui/auth/` (FSD compliance)
- **Action:** Move superior `components/auth/` implementation to features
- **Remove:** Basic implementations in `features/users/ui/auth/`
- **Rationale:** Auth components are user-feature specific, not cross-cutting concerns

#### **1.2 Error Boundary Implementations**

| Implementation       | Location                     | Features                                                                                                           | Quality Score | Recommendation               |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------- |
| **Components Error** | `components/error-handling/` | ✅ Advanced recovery<br/>✅ User feedback<br/>✅ Metrics collection<br/>✅ Automatic retry<br/>✅ Comprehensive UI | **9/10**      | **🏆 KEEP - Superior**       |
| **Core Error**       | `core/error/components/`     | ✅ Unified error handling<br/>✅ Configurable display<br/>✅ Recovery strategies<br/>✅ HOC support                | **8/10**      | **🔄 MERGE - Complementary** |
| **Shared Error**     | `shared/ui/error/`           | ❌ Thin wrapper only<br/>❌ Limited functionality                                                                  | **3/10**      | ❌ **REMOVE - Redundant**    |

**Analysis:**

```typescript
// Components implementation has superior user experience
class ErrorBoundary extends Component {
  // ✅ Advanced recovery options with timeout
  private async attemptAutomaticRecovery(recoveryOptions: RecoveryOption[]) {
    // ✅ User feedback collection
    // ✅ Comprehensive metrics
    // ✅ Enhanced fallback UI with accessibility
  }
}

// Core implementation has better architecture
export class ErrorBoundary extends Component {
  // ✅ Configurable display modes
  // ✅ HOC and hook support
  // ✅ Better integration with error system
}
```

**Migration Plan:**

- **Target Location:** `core/error/components/` (Infrastructure)
- **Action:** Merge best features from both implementations
- **Remove:** Redundant shared wrapper

#### **1.3 UI Primitives (Major FSD Violation)**

| Implementation    | Location         | Features                                                                                                         | Quality Score | Recommendation               |
| ----------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------- |
| **Components UI** | `components/ui/` | ✅ Complete design system<br/>✅ 50+ components<br/>✅ Design tokens<br/>✅ Accessibility<br/>✅ Stories & tests | **9/10**      | **🏆 KEEP - Move to Shared** |

**Current Problem:**

```typescript
// ❌ FSD VIOLATION - Features importing from components
import { Button } from '../../../../components/ui/button';
import { Card } from '../../../components/ui/card';

// ✅ SHOULD BE - Proper FSD structure
import { Button } from '@client/shared/design-system/primitives/button';
import { Card } from '@client/shared/design-system/primitives/card';
```

**Migration Plan:**

- **Target Location:** `shared/design-system/primitives/`
- **Action:** Move entire `components/ui/` to shared design system
- **Update:** All import paths across codebase
- **Rationale:** UI primitives are foundational design system components, not feature-specific

---

### **Category 2: Dashboard Proliferation (Strategic Consolidation)**

#### **2.1 Dashboard Implementation Matrix**

| Implementation          | Location                 | Purpose                                                                 | Features                                           | Quality                 | Recommendation                  |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------- | ----------------------- | ------------------------------- |
| **Generic Dashboard**   | `components/dashboard/`  | ✅ Reusable framework<br/>✅ Hooks & utilities<br/>✅ Validation system | **8/10**                                           | **🏆 KEEP - Framework** |
| **Analytics Dashboard** | `features/analytics/ui/` | Analytics-specific                                                      | ✅ Rich visualizations<br/>✅ Export functionality | **8/10**                | **🔄 REFACTOR - Use framework** |
| **Bills Dashboard**     | `features/bills/ui/`     | Bills-specific                                                          | ✅ Bill-specific widgets                           | **7/10**                | **🔄 REFACTOR - Use framework** |
| **User Dashboard**      | `features/users/ui/`     | User-specific                                                           | ✅ Profile integration                             | **7/10**                | **🔄 REFACTOR - Use framework** |
| **Security Dashboard**  | `features/security/ui/`  | Security-specific                                                       | ✅ Security metrics                                | **6/10**                | **🔄 REFACTOR - Use framework** |
| **Mobile Dashboards**   | Various locations        | Mobile variants                                                         | ❌ Duplicated logic                                | **4/10**                | ❌ **REMOVE - Use responsive**  |

**Strategic Framework Approach:**

```typescript
// Shared dashboard framework (KEEP & ENHANCE)
export interface DashboardConfig {
  sections: DashboardSection[];
  layout: 'grid' | 'stack' | 'tabs';
  responsive: boolean;
  exportable: boolean;
}

// Feature-specific implementations (REFACTOR)
export function AnalyticsDashboard() {
  const config: DashboardConfig = {
    sections: [
      { type: 'metrics', component: AnalyticsMetrics },
      { type: 'charts', component: AnalyticsCharts },
    ],
    layout: 'grid',
    responsive: true,
    exportable: true,
  };

  return <SharedDashboard config={config} />;
}
```

---

### **Category 3: Components Correctly Placed (No Migration Needed)**

#### **3.1 Core Infrastructure Components**

| Implementation        | Location            | Purpose                                                              | Quality  | Recommendation                 |
| --------------------- | ------------------- | -------------------------------------------------------------------- | -------- | ------------------------------ |
| **App Shell**         | `components/shell/` | ✅ Application routing<br/>✅ Protected routes<br/>✅ Navigation bar | **8/10** | **✅ KEEP - Correctly placed** |
| **Core Error System** | `core/error/`       | ✅ Error handling infrastructure<br/>✅ Unified error management     | **8/10** | **✅ KEEP - Correctly placed** |
| **Core Auth System**  | `core/auth/`        | ✅ Authentication infrastructure<br/>✅ Token management             | **9/10** | **✅ KEEP - Correctly placed** |

**Rationale:** These components are correctly placed as they represent application-level infrastructure and core technical concerns.

---

### **Category 4: Cross-Cutting Concerns (Architectural Decisions)**

#### **4.1 Mobile Components**

| Implementation        | Location             | Purpose                                                                          | Quality  | Recommendation                              |
| --------------------- | -------------------- | -------------------------------------------------------------------------------- | -------- | ------------------------------------------- |
| **Mobile Components** | `components/mobile/` | ✅ Comprehensive mobile patterns<br/>✅ Touch gestures<br/>✅ Responsive layouts | **8/10** | **🔄 MOVE to `shared/ui/mobile/`**          |
| **Mobile Headers**    | Multiple locations   | ❌ Scattered implementations                                                     | **5/10** | ❌ **CONSOLIDATE into `shared/ui/mobile/`** |

**Migration Plan:**

- **Target Location:** `shared/ui/mobile/`
- **Rationale:** Cross-cutting mobile optimization patterns used across all features

#### **4.2 Navigation Components**

| Implementation       | Location                 | Purpose                                                                                    | Quality  | Recommendation                         |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------ | -------- | -------------------------------------- |
| **Navigation Utils** | `components/navigation/` | ✅ Advanced navigation patterns<br/>✅ Progressive disclosure<br/>✅ Analytics integration | **8/10** | **🔄 MOVE to `shared/ui/navigation/`** |

**Migration Plan:**

- **Target Location:** `shared/ui/navigation/`
- **Rationale:** Cross-cutting navigation patterns used across all features

---

### **Category 5: Feature-Specific Components (Move to Features)**

#### **5.1 Components Misplaced in Generic Directories**

| Component Category       | Current Location                              | Target Location                   | Rationale                                  |
| ------------------------ | --------------------------------------------- | --------------------------------- | ------------------------------------------ |
| **Bill Analysis**        | `components/analysis/`                        | `features/bills/ui/analysis/`     | Bill-specific business logic               |
| **Privacy/Security**     | `components/privacy/`, `components/security/` | `features/security/ui/privacy/`   | Security feature components                |
| **Verification**         | `components/verification/`                    | `features/users/ui/verification/` | User verification is user-feature specific |
| **Admin Tools**          | `components/admin/`                           | `features/admin/ui/`              | Admin-specific functionality               |
| **Analytics Components** | `components/analytics/`                       | `features/analytics/ui/`          | Analytics feature components               |

**Migration Strategy:**

- **Preserve Quality:** Move superior implementations to correct feature locations
- **Update Imports:** Ensure features can only import from their own UI or shared components
- **Maintain Functionality:** Zero breaking changes during migration

---

## 🏗️ **Architectural Decision Framework**

### **Component Placement Decision Tree**

```
Is this component used by multiple features?
├── YES → Is it a primitive UI element?
│   ├── YES → shared/design-system/primitives/
│   └── NO → Is it layout/infrastructure?
│       ├── YES → shared/ui/{category}/
│       └── NO → Evaluate if truly cross-cutting
├── NO → Is it feature-specific business logic?
│   ├── YES → features/{feature}/ui/{category}/
│   └── NO → Is it core infrastructure?
│       ├── YES → core/{domain}/
│       └── NO → app/ or pages/
```

### **FSD Layer Definitions**

| Layer                      | Purpose                      | Examples                                   | Import Rules                                  |
| -------------------------- | ---------------------------- | ------------------------------------------ | --------------------------------------------- |
| **shared/design-system/**  | Primitive UI building blocks | Button, Input, Card, Typography            | Can be imported by any layer                  |
| **shared/ui/**             | Cross-feature UI patterns    | Layout, Navigation, Dashboard framework    | Can be imported by features and pages         |
| **features/{feature}/ui/** | Feature-specific components  | BillCard, AuthGuard, SearchBar             | Only imported within same feature or by pages |
| **core/**                  | Technical infrastructure     | Error handling, API clients, Auth services | Can be imported by any layer                  |
| **app/**                   | Application-level setup      | Providers, routing configuration           | Only imported by main app                     |
| **pages/**                 | Route components             | Page layouts, route handlers               | Only imported by routing system               |

### **Quality vs Location Trade-offs**

When consolidating, we prioritize:

1. **Architectural Correctness** (FSD compliance) - 40%
2. **Implementation Quality** (features, robustness) - 35%
3. **Maintainability** (code quality, tests) - 15%
4. **Performance Impact** (bundle size, loading) - 10%

**Decision Matrix:**

- **High Quality + Wrong Location** → Move to correct location
- **Low Quality + Correct Location** → Replace with better implementation
- **High Quality + Correct Location** → Keep and enhance
- **Low Quality + Wrong Location** → Remove entirely

---

## 📋 **Consolidation Priority Matrix**

### **Phase 1: Critical FSD Violations (Week 1)**

| Priority  | Component        | Current Location   | Target Location                    | Impact     | Effort     |
| --------- | ---------------- | ------------------ | ---------------------------------- | ---------- | ---------- |
| **🔴 P0** | UI Primitives    | `components/ui/`   | `shared/design-system/primitives/` | **HIGH**   | **HIGH**   |
| **🔴 P0** | Auth System      | `components/auth/` | `features/users/ui/auth/`          | **HIGH**   | **MEDIUM** |
| **🟡 P1** | Error Boundaries | Multiple locations | `core/error/components/`           | **MEDIUM** | **MEDIUM** |

### **Phase 2: Infrastructure Consolidation (Week 2)**

| Priority  | Component           | Action                                  | Impact     | Effort     |
| --------- | ------------------- | --------------------------------------- | ---------- | ---------- |
| **🟡 P1** | Dashboard Framework | Create `shared/ui/dashboard/` framework | **HIGH**   | **HIGH**   |
| **🟡 P1** | Mobile Components   | Move to `shared/ui/mobile/`             | **MEDIUM** | **MEDIUM** |
| **🟢 P2** | Navigation Utils    | Move to `shared/ui/navigation/`         | **LOW**    | **LOW**    |

### **Phase 3: Feature Refactoring (Week 3-4)**

| Priority  | Component          | Action                    | Impact     | Effort   |
| --------- | ------------------ | ------------------------- | ---------- | -------- |
| **🟢 P2** | Feature Dashboards | Refactor to use framework | **MEDIUM** | **HIGH** |
| **🟢 P2** | Legacy Components  | Archive or remove         | **LOW**    | **LOW**  |

---

## 🎯 **Implementation Quality Assessment**

### **Quality Scoring Criteria**

1. **Functionality Completeness** (30%)
2. **Code Quality & Architecture** (25%)
3. **Type Safety & Testing** (20%)
4. **Performance & Accessibility** (15%)
5. **Documentation & Maintainability** (10%)

### **Superior Implementation Characteristics**

#### **Components Auth System (Score: 9/10)**

```typescript
✅ **Strengths:**
- Complete RBAC implementation with permissions
- Advanced AuthGuard with multiple protection levels
- Comprehensive error handling and recovery
- Accessibility-compliant UI components
- Extensive TypeScript coverage
- Role-based routing guards (Admin, Moderator, Expert)
- Session management integration

❌ **Weaknesses:**
- Located in wrong directory (FSD violation)
- Some legacy import patterns
```

#### **Components Error Boundary (Score: 9/10)**

```typescript
✅ **Strengths:**
- Advanced automatic recovery strategies
- User feedback collection system
- Comprehensive error metrics
- Accessibility-compliant fallback UI
- Performance monitoring integration
- Multiple recovery options with timeout handling

❌ **Weaknesses:**
- Some overlap with core error system
- Could benefit from better configuration options
```

#### **Components UI System (Score: 9/10)**

```typescript
✅ **Strengths:**
- Complete design system with 50+ components
- Design token integration
- Comprehensive accessibility support
- Storybook stories and tests
- TypeScript coverage
- Consistent API patterns

❌ **Weaknesses:**
- Major FSD violation (wrong location)
- Import path chaos across codebase
```

---

## 🚀 **Migration Execution Plan**

### **Week 1: Critical Path (FSD Compliance)**

#### **Day 1-2: Design System Migration**

```bash
# 1. Create FSD-compliant design system structure
mkdir -p client/src/shared/design-system/{primitives,typography,layout,feedback,interactive,media,tokens,utils}

# 2. Categorize and move UI components
# Primitives: Button, Input, Card, Select, etc.
git mv client/src/components/ui/{button,input,card,select,textarea,checkbox,switch}.tsx client/src/shared/design-system/primitives/

# Typography: Text components
git mv client/src/components/ui/{label,heading,text}.tsx client/src/shared/design-system/typography/

# Feedback: User feedback components
git mv client/src/components/ui/{alert,badge,tooltip,toast}.tsx client/src/shared/design-system/feedback/

# Interactive: Interactive components
git mv client/src/components/ui/{tabs,accordion,dialog,popover}.tsx client/src/shared/design-system/interactive/

# Media: Media components
git mv client/src/components/ui/{avatar,image,icon}.tsx client/src/shared/design-system/media/

# 3. Update all imports with proper categorization
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*components/ui/button|from @client/shared/design-system/primitives/button|g'
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*components/ui/alert|from @client/shared/design-system/feedback/alert|g'

# 4. Create comprehensive barrel exports
# Update client/src/shared/design-system/index.ts with categorized exports
```

#### **Day 3-4: Auth System Migration**

```bash
# 1. Remove inferior implementations
rm -rf client/src/features/users/ui/auth/RegisterForm.tsx
rm -rf client/src/features/users/ui/auth/OAuthLogin.tsx

# 2. Move superior implementation
git mv client/src/components/auth/* client/src/features/users/ui/auth/

# 3. Update imports and exports
# Update client/src/features/users/ui/index.ts
```

#### **Day 5: Error Boundary Consolidation**

```typescript
// Merge best features into core/error/components/ErrorBoundary.tsx
class ErrorBoundary extends Component {
  // Keep: Core's configurable architecture
  // Add: Components' user feedback system
  // Add: Components' advanced recovery options
  // Add: Components' accessibility features
}
```

### **Week 2: Infrastructure Consolidation**

#### **Dashboard Framework Creation**

```typescript
// Create shared/ui/dashboard/DashboardFramework.tsx
export interface DashboardConfig {
  sections: DashboardSection[];
  layout: DashboardLayout;
  theme: DashboardTheme;
  capabilities: DashboardCapabilities;
}

export function DashboardFramework({ config }: { config: DashboardConfig }) {
  // Unified dashboard implementation
}
```

**Rationale:** Dashboard framework is a cross-cutting UI pattern used by multiple features (analytics, bills, users, security)

#### **Shared UI Components Migration**

```bash
# Create FSD-compliant shared UI structure
mkdir -p client/src/shared/ui/{layout,navigation,loading,error,modal,form,data,notification,mobile,dashboard,accessibility}

# Move cross-cutting components to appropriate categories
git mv client/src/components/mobile/* client/src/shared/ui/mobile/
git mv client/src/components/navigation/* client/src/shared/ui/navigation/
git mv client/src/components/loading/* client/src/shared/ui/loading/

# Move dashboard framework (keep generic parts only)
mkdir -p client/src/shared/ui/dashboard/
# Move only the reusable framework, not feature-specific dashboards

# Update imports with proper categorization
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*components/mobile/|from @client/shared/ui/mobile/|g'
find client/src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from.*components/navigation/|from @client/shared/ui/navigation/|g'
```

### **Week 3-4: Feature-Specific Migration**

#### **Feature Components Migration**

```bash
# Move feature-specific components to correct locations
# Bills Feature
git mv client/src/components/analysis/* client/src/features/bills/ui/analysis/
git mv client/src/components/bills/* client/src/features/bills/ui/

# Security Feature
git mv client/src/components/privacy/* client/src/features/security/ui/privacy/
git mv client/src/components/security/* client/src/features/security/ui/

# Users Feature
git mv client/src/components/verification/* client/src/features/users/ui/verification/

# Analytics Feature
git mv client/src/components/analytics/* client/src/features/analytics/ui/

# Admin Feature
git mv client/src/components/admin/* client/src/features/admin/ui/

# Update feature barrel exports
# Update client/src/features/*/ui/index.ts files
```

#### **Dashboard Refactoring Strategy**

```typescript
// Before: Feature-specific dashboard with duplicated logic
export function AnalyticsDashboard() {
  return (
    <div className="dashboard">
      {/* Duplicated dashboard logic */}
    </div>
  );
}

// After: Framework-based dashboard using shared infrastructure
export function AnalyticsDashboard() {
  const config = useAnalyticsDashboardConfig();
  return <DashboardFramework config={config} />;
}

// Shared framework location: shared/ui/dashboard/DashboardFramework.tsx
// Feature-specific config: features/analytics/ui/dashboard/config.ts
```

---

## 🔍 **Risk Mitigation Strategies**

### **High-Risk Migrations**

#### **UI Primitives Migration**

**Risk:** Breaking all component imports across codebase
**Mitigation:**

1. **Automated import replacement** using AST transformation
2. **Gradual rollout** with temporary re-exports
3. **Comprehensive testing** before removing old paths

#### **Auth System Migration**

**Risk:** Breaking authentication flows
**Mitigation:**

1. **Feature flag** controlled rollout
2. **Parallel testing** of old and new implementations
3. **Rollback plan** with preserved old implementation

### **Quality Assurance Checklist**

#### **Pre-Migration Validation**

- [ ] **Functionality audit** of all implementations
- [ ] **Test coverage analysis** for critical paths
- [ ] **Performance benchmarking** of current implementations
- [ ] **Accessibility compliance** verification

#### **Post-Migration Validation**

- [ ] **Import path verification** across entire codebase
- [ ] **Functionality regression testing** for all affected features
- [ ] **Performance impact assessment**
- [ ] **Bundle size analysis** for optimization opportunities

---

## 📊 **Success Metrics**

### **Quantitative Targets**

| Metric                        | Current  | Target                 | Measurement                  |
| ----------------------------- | -------- | ---------------------- | ---------------------------- |
| **Component Directories**     | 39       | 15                     | Directory count reduction    |
| **Dashboard Implementations** | 7        | 1 framework + features | Implementation consolidation |
| **Import Path Violations**    | 50+      | 0                      | FSD compliance               |
| **Duplicate Components**      | 20+      | 0                      | Code deduplication           |
| **Bundle Size Impact**        | Baseline | -15%                   | Webpack analysis             |

### **Qualitative Improvements**

- **✅ FSD Compliance:** All imports follow proper architectural boundaries
- **✅ Maintainability:** Single source of truth for each component type
- **✅ Developer Experience:** Clear, unambiguous component locations
- **✅ Code Quality:** Superior implementations preserved and enhanced
- **✅ Performance:** Reduced bundle size through deduplication

---

## 🎯 **Long-term Architectural Vision**

### **Target Architecture (FSD-Compliant)**

```
client/src/
├── shared/
│   ├── design-system/
│   │   ├── primitives/          # UI primitives (Button, Input, Card)
│   │   ├── typography/          # Text, Heading, Link
│   │   ├── layout/              # Box, Flex, Grid
│   │   ├── feedback/            # Alert, Badge, Tooltip
│   │   ├── interactive/         # Accordion, Tabs
│   │   ├── media/               # Icon, Avatar, Image
│   │   ├── tokens/              # Design tokens
│   │   └── utils/               # Design utilities
│   └── ui/
│       ├── layout/              # Header, Footer, Sidebar (cross-feature)
│       ├── navigation/          # Breadcrumbs, TabNav (cross-feature)
│       ├── loading/             # Spinners, Progress (cross-feature)
│       ├── error/               # ErrorBoundary, NotFound (cross-feature)
│       ├── modal/               # Modal, Dialog (cross-feature)
│       ├── form/                # SearchInput, Filters (cross-feature)
│       ├── data/                # DataTable, Pagination (cross-feature)
│       ├── notification/        # Toast, Banner (cross-feature)
│       ├── mobile/              # Mobile patterns (cross-feature)
│       ├── dashboard/           # Dashboard framework (cross-feature)
│       └── accessibility/       # A11y components (cross-feature)
├── features/
│   ├── bills/ui/                # Bill-specific components
│   │   ├── detail/              # BillDetail, BillHeader
│   │   ├── list/                # BillList, BillCard
│   │   ├── tracking/            # BillTracking, RealTime
│   │   ├── analysis/            # BillAnalysis, Constitutional
│   │   └── sponsorship/         # Sponsors, Conflicts
│   ├── community/ui/            # Community-specific components
│   │   ├── discussion/          # Comments, Threads
│   │   ├── activity/            # ActivityFeed, Stats
│   │   ├── insights/            # ExpertInsights
│   │   └── moderation/          # Reporting, Validation
│   ├── search/ui/               # Search-specific components
│   │   ├── interface/           # SearchBar, Advanced
│   │   ├── results/             # Results, Cards
│   │   ├── filters/             # Filters, Facets
│   │   └── analytics/           # Search analytics
│   ├── users/ui/                # User-specific components
│   │   ├── auth/                # Login, Register, 2FA
│   │   ├── profile/             # Profile, Settings
│   │   ├── dashboard/           # User dashboard
│   │   └── preferences/         # User preferences
│   ├── analytics/ui/            # Analytics-specific components
│   │   ├── dashboard/           # Analytics dashboards
│   │   ├── metrics/             # Metrics components
│   │   └── charts/              # Chart components
│   ├── security/ui/             # Security-specific components
│   │   ├── dashboard/           # Security dashboards
│   │   ├── privacy/             # Privacy components
│   │   └── verification/        # Verification components
│   └── admin/ui/                # Admin-specific components
├── core/
│   ├── error/                   # Error handling infrastructure
│   ├── auth/                    # Authentication infrastructure
│   ├── api/                     # API infrastructure
│   ├── performance/             # Performance monitoring
│   └── browser/                 # Browser compatibility
├── app/                         # App-level components (providers, routing)
└── pages/                       # Route components
```

### **Import Patterns (Post-Migration)**

```typescript
// ✅ Design System Primitives
import { Button, Card, Input } from '@client/shared/design-system/primitives';
import { Heading, Text } from '@client/shared/design-system/typography';
import { Alert, Badge } from '@client/shared/design-system/feedback';

// ✅ Shared UI Components (Cross-Feature)
import { Header, Sidebar } from '@client/shared/ui/layout';
import { MobileLayout, BottomSheet } from '@client/shared/ui/mobile';
import { DashboardFramework } from '@client/shared/ui/dashboard';
import { DataTable, Pagination } from '@client/shared/ui/data';
import { Modal, Dialog } from '@client/shared/ui/modal';

// ✅ Feature-Specific Components
import { AuthGuard, LoginForm } from '@client/features/users/ui/auth';
import { BillCard, BillDetail } from '@client/features/bills/ui/detail';
import { SearchBar, SearchResults } from '@client/features/search/ui/interface';
import { AnalyticsDashboard } from '@client/features/analytics/ui/dashboard';

// ✅ Core Infrastructure
import { ErrorBoundary } from '@client/core/error/components';
import { LoadingProvider } from '@client/core/loading';

// ❌ No more violations - these patterns are eliminated
// import { Button } from '../../../../components/ui/button';
// import { AuthGuard } from '../../../components/auth/AuthGuard';
```

---

## 📝 **Implementation Checklist**

### **Phase 1: Critical Migrations (Week 1)**

- [ ] **UI Primitives Migration**
  - [ ] Create shared/design-system/primitives/ structure
  - [ ] Move components with git history preservation
  - [ ] Update all import statements (automated)
  - [ ] Update TypeScript path mappings
  - [ ] Verify all components still work
  - [ ] Update Storybook configuration
  - [ ] Run full test suite

- [ ] **Auth System Migration**
  - [ ] Audit both implementations for feature comparison
  - [ ] Remove inferior features/users/ui/auth/ components
  - [ ] Move superior components/auth/ to features/users/ui/auth/
  - [ ] Update all auth-related imports
  - [ ] Test authentication flows end-to-end
  - [ ] Verify RBAC functionality

- [ ] **Error Boundary Consolidation**
  - [ ] Merge best features from all implementations
  - [ ] Update core/error/components/ErrorBoundary.tsx
  - [ ] Remove redundant implementations
  - [ ] Update error handling across app
  - [ ] Test error scenarios

### **Phase 2: Infrastructure (Week 2)**

- [ ] **Dashboard Framework**
  - [ ] Design shared dashboard architecture
  - [ ] Implement DashboardFramework component
  - [ ] Create configuration interfaces
  - [ ] Add responsive and accessibility features
  - [ ] Document usage patterns

- [ ] **Mobile Components Migration**
  - [ ] Move components/mobile/ to shared/ui/mobile/
  - [ ] Update all mobile-related imports
  - [ ] Test mobile functionality
  - [ ] Verify responsive behavior

### **Phase 3: Feature Refactoring (Week 3-4)**

- [ ] **Dashboard Refactoring**
  - [ ] Refactor analytics dashboard to use framework
  - [ ] Refactor bills dashboard to use framework
  - [ ] Refactor user dashboard to use framework
  - [ ] Remove duplicate dashboard implementations
  - [ ] Test all dashboard functionality

- [ ] **Final Cleanup**
  - [ ] Remove empty directories
  - [ ] Update documentation
  - [ ] Archive legacy implementations
  - [ ] Run final validation suite

---

This consolidation strategy ensures that the **highest quality implementations are preserved** while achieving **proper FSD compliance** and **eliminating architectural debt**. The phased approach minimizes risk while delivering immediate benefits in maintainability and developer experience.
