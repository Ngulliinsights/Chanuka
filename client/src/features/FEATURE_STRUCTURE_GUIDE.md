# Feature Structure Guide

## Philosophy

**Features should grow organically based on actual needs, not forced structure.**

## Standard Structure (When Needed)

When a feature has multiple concerns, organize like this:

```
features/my-feature/
├── api/           # API integration (when needed)
├── hooks/         # React hooks (when needed)
├── pages/         # Page components (when needed)
├── services/      # Business logic (when needed)
├── ui/            # UI components (when needed)
├── types.ts       # TypeScript types
├── index.ts       # Public exports
└── README.md      # Feature documentation
```

## Current Feature States

### Fully Structured (Complex Features)
These features have grown to need full structure:
- `argument-intelligence/` - Complete structure with api, hooks, pages, ui
- `pretext-detection/` - Complete structure with api, hooks, pages, services, ui
- `monitoring/` - Complete structure with api, hooks, pages, ui
- `feature-flags/` - Complete structure with api, hooks, pages, ui

### Minimal (Simple Features)
These features are intentionally minimal - **don't add structure until needed**:
- `market/` - Single component (SokoHaki.tsx) - no need for structure yet
- `civic/` - Only pages/ - add structure when more components are added
- `accountability/` - Single file (ShadowLedgerDashboard.ts) - no need for structure yet

### Growing (Add Structure as Needed)
These features have some structure but may need more:
- `constitutional-intelligence/` - Has hooks and ui, missing services and pages
- `realtime/` - Only has model/ - add structure when expanding

## Guidelines

### ✅ DO:
- Start with a single file for simple features
- Add directories only when you have 3+ related files
- Create structure when complexity demands it
- Keep minimal features minimal

### ❌ DON'T:
- Create empty directories "for future use"
- Force structure on simple features
- Add boilerplate files with no content
- Create types.ts with placeholder types

## When to Add Structure

### Add `api/` when:
- You have 3+ API integration files
- API logic is complex enough to separate

### Add `hooks/` when:
- You have 3+ custom hooks
- Hooks are feature-specific (not shared)

### Add `pages/` when:
- You have 2+ page components
- Pages are feature-specific routes

### Add `services/` when:
- You have business logic separate from UI
- Logic is complex enough to test independently

### Add `ui/` when:
- You have 3+ UI components
- Components are feature-specific (not shared)

## Examples

### Good: Minimal Feature
```
features/market/
└── SokoHaki.tsx
```
**Why**: Single component, no need for structure yet.

### Good: Growing Feature
```
features/bills/
├── hooks.ts        # Barrel export for hooks
├── services.ts     # Barrel export for services
├── hooks/          # Individual hook files
├── services/       # Individual service files
├── pages/
├── ui/
└── types.ts
```
**Why**: Has both barrel exports and directories - structure added as needed.

### Bad: Over-structured
```
features/simple/
├── api/            # Empty
├── hooks/          # Empty
├── pages/          # Empty
├── services/       # Empty
├── ui/
│   └── Component.tsx
├── types.ts        # export interface Placeholder {}
└── README.md       # "TODO: Add documentation"
```
**Why**: Unnecessary structure for a single component.

## Resolution of Current Inconsistencies

The "inconsistency" in feature structure is **intentional and correct**:

1. **Complex features** (argument-intelligence, pretext-detection) have full structure because they need it
2. **Simple features** (market, civic) are minimal because they don't need structure yet
3. **Growing features** (constitutional-intelligence) have partial structure and will grow as needed

**This is not a problem to fix - it's a sign of pragmatic development.**

## Recommendation

**Leave feature structure as-is.** Add structure to individual features only when:
1. The feature is actively being developed
2. Complexity demands organization
3. You have actual files to organize (not placeholders)

**Don't standardize for the sake of standardization.**
