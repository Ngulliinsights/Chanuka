/**
 * Unified Design System - Refined & Integrated
 *
 * 4 Strategic Personas:
 * - THE ARCHITECT: Token system consistency & structure
 * - THE AUDITOR: Standards compliance, quality assurance
 * - THE INTEGRATOR: Cross-module cohesion, integration testing
 * - THE STRATEGIST: Vision, sustainability & long-term goals
 *
 * COMPONENT ORGANIZATION (by functional category):
 * - INTERACTIVE: Form controls, navigation, selection (Button, Input, Select, etc.)
 * - FEEDBACK: Status, messaging, notifications (Alert, Badge, Progress, Toast, etc.)
 * - TYPOGRAPHY: Text display, content organization (Heading, Text, Label, Card, etc.)
 * - MEDIA: Images, avatars, visual assets (Avatar, OptimizedImage, Logo)
 *
 * Single source of truth for all UI components, tokens, and design patterns.
 *
 * Usage Examples:
 *   import { Button, Input, Dialog } from '@client/lib/design-system';
 *   import { Alert, Badge, Progress } from '@client/lib/design-system';
 *   import { Card, Text, Heading } from '@client/lib/design-system';
 *   import { Avatar, OptimizedImage } from '@client/lib/design-system';
 *    */

// ════════════════════════════════════════════════════════════════════════════
// INTERACTIVE COMPONENTS (Form controls, navigation, selection)
// ════════════════════════════════════════════════════════════════════════════
// Basic form controls: Button, Input, Select, Checkbox, Switch, Textarea
// Composite selection: Tabs, Dialog, Popover
// Advanced navigation: DropdownMenu, ContextMenu, NavigationMenu, Command
// Layout navigation: Sidebar, Sheet
// Utilities: ScrollArea, Form system, Calendar
// ════════════════════════════════════════════════════════════════════════════
export * from './interactive';

// ════════════════════════════════════════════════════════════════════════════
// FEEDBACK COMPONENTS (Status, messaging, notifications)
// ════════════════════════════════════════════════════════════════════════════
// Status indication: Alert, Badge, Progress
// Notifications: Toast, Toaster, Tooltip
// Loading/error states: LoadingSpinner, Skeleton, ErrorMessage
// Structure: Separator, Table
// ════════════════════════════════════════════════════════════════════════════
export * from './feedback';

// ════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY COMPONENTS (Text display, content organization)
// ════════════════════════════════════════════════════════════════════════════
// Text hierarchy: Heading, Text, Label
// Structural containers: Card (with subcomponents)
// ════════════════════════════════════════════════════════════════════════════
export * from './typography';

// ════════════════════════════════════════════════════════════════════════════
// MEDIA COMPONENTS (Images, avatars, visual assets)
// ════════════════════════════════════════════════════════════════════════════
// Avatars: Avatar (with AvatarImage, AvatarFallback)
// Images: OptimizedImage, Logo
// ════════════════════════════════════════════════════════════════════════════
export * from './media';

// ════════════════════════════════════════════════════════════════════════════
// Design Tokens - THE ARCHITECT (Consistency & Structure)
// ════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════
// Design Tokens - THE ARCHITECT (Consistency & Structure)
// ════════════════════════════════════════════════════════════════════════════
export * from './tokens';
export * from './tokens/validation';

// ════════════════════════════════════════════════════════════════════════════
// Themes - Multiple Theme Support
// ════════════════════════════════════════════════════════════════════════════
export * from './themes';
export { useTheme, type ThemeContextType } from '@client/lib/contexts/ThemeContext';

// ════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════
export { cn } from './utils/cn';
export * from './utils/validation';

// ════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY - THE AUDITOR (Standards, Quality Assurance)
// ════════════════════════════════════════════════════════════════════════════
export * from './accessibility';
export * from './quality';

// ════════════════════════════════════════════════════════════════════════════
// 4 STRATEGIC PERSONAS FRAMEWORK & DOCUMENTATION
// ════════════════════════════════════════════════════════════════════════════
// THE ARCHITECT:  Design patterns, structural integrity
// THE AUDITOR:    Standards compliance, quality assurance
// THE INTEGRATOR: Cross-module cohesion, integration testing
// THE STRATEGIST: Vision, sustainability, long-term goals
// ════════════════════════════════════════════════════════════════════════════
// export { PERSONAS_CHARTER, type PersonasCharterType } from './4-personas-charter';
export {
  IMPLEMENTATION_SCHEDULE,
  type ImplementationScheduleType,
} from './4-personas-implementation-guide';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT FLATTENING & MIGRATION DOCUMENTATION
// ════════════════════════════════════════════════════════════════════════════
// Note: COMPONENT_FLATTENING_STRATEGY, COMPONENT_FLATTENING_EXECUTION_REPORT,
// MIGRATION_SUMMARY, COMPLETION_REPORT, and REFINEMENT_STRATEGY are .md
// documentation files, not TypeScript modules. See the design-system docs/
// directory for these artifacts.

// ════════════════════════════════════════════════════════════════════════════
// DESIGN STANDARDS & GUIDELINES - THE STRATEGIST (Vision & Sustainability)
// ════════════════════════════════════════════════════════════════════════════
// Comprehensive standards for brand alignment, accessibility, and user inclusion:
// - Political Neutrality: Balanced perspective presentation for legislation
// - Multilingual Support: English, Swahili, and future language support
// - Brand Personality: "Knowledgeable Friend" voice, tone, and microcopy
// - Low-Bandwidth: Performance and offline-first design patterns
// ════════════════════════════════════════════════════════════════════════════
export * from './standards';

// ════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM CONTEXT PROVIDERS - Standards Integration
// ════════════════════════════════════════════════════════════════════════════
// React contexts for applying design standards throughout the application:
// - BrandVoiceProvider: Microcopy, tone, and voice consistency
// - LowBandwidthProvider: Network adaptation and offline support
// - MultilingualProvider: Localization and language support
// - ChanukaProviders: All-in-one wrapper for complete standards
// ════════════════════════════════════════════════════════════════════════════
export * from './contexts';
