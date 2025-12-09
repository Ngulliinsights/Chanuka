# Feature-Sliced Design (FSD) Reorganization Plan

## 🎯 **Objective**

Transform the current component sprawl into a clean Feature-Sliced Design architecture where components are organized by their actual usage scope and feature boundaries.

## 📊 **Current State Analysis**

### **Problems Identified:**

1. **Component Sprawl**: 40+ directories in `/components/` with unclear boundaries
2. **Feature Confusion**: Components that should be feature-specific are in shared locations
3. **Import Chaos**: Unclear where to find or place new components
4. **Maintenance Burden**: Duplicate functionality across different directories

### **Components by Usage Analysis:**

#### **🏠 Shared/UI (Cross-Feature Usage)**

- Layout components (Header, Footer, Sidebar)
- Navigation components (Breadcrumbs, TabNavigation)
- Loading states (Spinner, Overlay, Progress)
- Error boundaries and fallbacks
- Modal/Dialog components
- Form primitives (SearchInput, FilterDropdown)
- Data display (DataTable, Pagination)
- Mobile components (Drawer, BottomSheet)

#### **🎨 Design System (Primitive Components)**

- All `/components/ui/` components (Button, Input, Card, etc.)
- Typography components
- Layout primitives (Box, Flex, Grid)
- Feedback elements (Alert, Badge, Tooltip)

#### **📋 Bills Feature Components**

- All `/components/bill-detail/` → `features/bills/ui/`
- All `/components/bill-tracking/` → `features/bills/ui/`
- All `/components/bills/` → `features/bills/ui/`
- Bill analysis components
- Bill sponsorship components

#### **👥 Community Feature Components**

- All `/components/community/` → `features/community/ui/`
- All `/components/discussion/` → `features/community/ui/`
- Comment and thread components
- Community stats and activity feeds

#### **🔍 Search Feature Components**

- All `/components/search/` → `features/search/ui/`
- Advanced search interfaces
- Search analytics components

#### **👤 Users/Auth Feature Components**

- All `/components/auth/` → `features/users/ui/`
- All `/components/user/` → `features/users/ui/`
- Profile and account components
- Authentication flows

#### **📊 Analytics Feature Components**

- All `/components/analytics/` → `features/analytics/ui/`
- Dashboard and metrics components
- Performance monitoring components

#### **🛡️ Security Feature Components**

- All `/components/security/` → `features/security/ui/`
- Privacy and compliance components
- Verification components

#### **⚙️ Admin Feature Components**

- All `/components/admin/` → `features/admin/ui/`
- System monitoring components
- Configuration interfaces

## 🏗️ **Target FSD Structure**

```
client/src/
├── shared/
│   ├── ui/                     # Cross-feature UI components
│   │   ├── layout/            # Header, Footer, Sidebar
│   │   ├── navigation/        # Breadcrumbs, TabNav
│   │   ├── loading/           # Spinners, Progress
│   │   ├── error/             # ErrorBoundary, NotFound
│   │   ├── modal/             # Modal, Dialog
│   │   ├── form/              # SearchInput, Filters
│   │   ├── data/              # DataTable, Pagination
│   │   ├── notification/      # Toast, Banner
│   │   ├── mobile/            # Drawer, BottomSheet
│   │   └── accessibility/     # A11y components
│   │
│   ├── design-system/         # Primitive components
│   │   ├── primitives/        # Button, Input, Card
│   │   ├── typography/        # Heading, Text, Link
│   │   ├── layout/            # Box, Flex, Grid
│   │   ├── feedback/          # Alert, Badge, Tooltip
│   │   ├── interactive/       # Accordion, Tabs
│   │   ├── media/             # Icon, Avatar, Image
│   │   ├── tokens/            # Design tokens
│   │   └── utils/             # Design utilities
│   │
│   ├── lib/                   # Shared utilities
│   ├── api/                   # Shared API utilities
│   └── config/                # Shared configuration
│
├── features/
│   ├── bills/
│   │   ├── ui/                # Bill-specific components
│   │   │   ├── detail/        # BillDetail, BillHeader
│   │   │   ├── list/          # BillList, BillCard
│   │   │   ├── tracking/      # BillTracking, RealTime
│   │   │   ├── analysis/      # BillAnalysis, Constitutional
│   │   │   ├── sponsorship/   # Sponsors, Conflicts
│   │   │   └── mobile/        # Mobile bill components
│   │   ├── api/               # Bill API services
│   │   ├── model/             # Bill business logic
│   │   └── lib/               # Bill utilities
│   │
│   ├── community/
│   │   ├── ui/                # Community components
│   │   │   ├── discussion/    # Comments, Threads
│   │   │   ├── activity/      # ActivityFeed, Stats
│   │   │   ├── insights/      # ExpertInsights
│   │   │   └── moderation/    # Reporting, Validation
│   │   ├── api/               # Community API
│   │   ├── model/             # Community logic
│   │   └── lib/               # Community utilities
│   │
│   ├── search/
│   │   ├── ui/                # Search components
│   │   │   ├── interface/     # SearchBar, Advanced
│   │   │   ├── results/       # Results, Cards
│   │   │   ├── filters/       # Filters, Facets
│   │   │   └── analytics/     # Search analytics
│   │   ├── api/               # Search API
│   │   ├── model/             # Search logic
│   │   └── lib/               # Search utilities
│   │
│   ├── users/
│   │   ├── ui/                # User components
│   │   │   ├── auth/          # Login, Register, 2FA
│   │   │   ├── profile/       # Profile, Settings
│   │   │   ├── dashboard/     # User dashboard
│   │   │   └── preferences/   # User preferences
│   │   ├── api/               # User API (uses core/auth)
│   │   ├── model/             # User logic
│   │   └── lib/               # User utilities
│   │
│   ├── analytics/
│   │   ├── ui/                # Analytics components
│   │   ├── api/               # Analytics API
│   │   ├── model/             # Analytics logic
│   │   └── lib/               # Analytics utilities
│   │
│   ├── security/
│   │   ├── ui/                # Security components
│   │   ├── api/               # Security API
│   │   ├── model/             # Security logic
│   │   └── lib/               # Security utilities
│   │
│   └── admin/
│       ├── ui/                # Admin components
│       ├── api/               # Admin API
│       ├── model/             # Admin logic
│       └── lib/               # Admin utilities
│
├── pages/                     # Route components
├── app/                       # App-level components
└── core/                      # Cross-cutting concerns
```

## 🚀 **Implementation Strategy**

### **Phase 1: Design System Migration (Week 1)**

1. Move `/components/ui/` → `shared/design-system/primitives/`
2. Create design token system
3. Update all imports to use new design system

### **Phase 2: Shared UI Migration (Week 1-2)**

1. Identify truly shared components
2. Move to `shared/ui/` with proper categorization
3. Create comprehensive shared UI index

### **Phase 3: Feature-Specific Migration (Week 2-3)**

1. Move bill-related components to `features/bills/ui/`
2. Move community components to `features/community/ui/`
3. Move search components to `features/search/ui/`
4. Move auth/user components to `features/users/ui/`
5. Move analytics components to `features/analytics/ui/`

### **Phase 4: Cleanup and Optimization (Week 3-4)**

1. Remove empty directories
2. Update all import statements
3. Add ESLint rules to enforce FSD boundaries
4. Update documentation

### **Phase 5: Testing and Validation (Week 4)**

1. Comprehensive testing of all moved components
2. Performance validation
3. Bundle analysis
4. Developer experience validation

## 📋 **Migration Checklist**

### **Design System**

- [ ] Move UI primitives to `shared/design-system/`
- [ ] Create design token system
- [ ] Update component APIs for consistency
- [ ] Add comprehensive Storybook documentation

### **Shared UI**

- [ ] Identify cross-feature components
- [ ] Move to `shared/ui/` with categorization
- [ ] Create shared UI documentation
- [ ] Add usage guidelines

### **Bills Feature**

- [ ] Move bill detail components
- [ ] Move bill list components
- [ ] Move bill tracking components
- [ ] Move bill analysis components
- [ ] Move sponsorship components
- [ ] Update feature index exports

### **Community Feature**

- [ ] Move discussion components
- [ ] Move activity feed components
- [ ] Move expert insight components
- [ ] Move moderation components
- [ ] Update feature index exports

### **Search Feature**

- [ ] Move search interface components
- [ ] Move search result components
- [ ] Move search filter components
- [ ] Move search analytics components
- [ ] Update feature index exports

### **Users Feature**

- [ ] Move authentication components
- [ ] Move profile components
- [ ] Move dashboard components
- [ ] Move preference components
- [ ] Update feature index exports

### **Import Updates**

- [ ] Update all component imports
- [ ] Update page imports
- [ ] Update test imports
- [ ] Add import path aliases

### **ESLint Rules**

- [ ] Add FSD boundary enforcement rules
- [ ] Prevent cross-feature imports
- [ ] Enforce shared component usage
- [ ] Add import organization rules

## 🎯 **Success Metrics**

1. **Organization**: Clear component placement with zero ambiguity
2. **Imports**: All imports follow FSD patterns
3. **Boundaries**: No cross-feature dependencies (except shared)
4. **Performance**: No bundle size regression
5. **DX**: Improved developer experience with clear guidelines

## 🚨 **Risk Mitigation**

1. **Breaking Changes**: Gradual migration with backward compatibility
2. **Import Chaos**: Automated import updates where possible
3. **Performance**: Continuous bundle analysis during migration
4. **Team Coordination**: Clear communication and documentation

This reorganization will transform the component architecture from a maintenance burden into a competitive advantage, making it easy to find, create, and maintain components according to clear feature boundaries.
