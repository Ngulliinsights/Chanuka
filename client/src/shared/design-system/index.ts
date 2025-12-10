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
 *   import { Button, Input, Dialog } from '@client/shared/design-system';
 *   import { Alert, Badge, Progress } from '@client/shared/design-system';
 *   import { Card, Text, Heading } from '@client/shared/design-system';
 *   import { Avatar, OptimizedImage } from '@client/shared/design-system';
 *   import { designTokens, themeProvider } from '@client/shared/design-system';
 */

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
export { useTheme, type ThemeContextType } from '@client/contexts/ThemeContext';

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
export { IMPLEMENTATION_SCHEDULE, type ImplementationScheduleType } from './4-personas-implementation-guide';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT FLATTENING ANALYSIS & VALIDATION
// ════════════════════════════════════════════════════════════════════════════
export {
  COMPONENT_VALIDATION,
  COMPONENT_CHECKLIST
} from './COMPONENT_FLATTENING_STRATEGY';

export {
  FLATTENING_EXECUTION,
  type FlatteningExecutionType
} from './COMPONENT_FLATTENING_EXECUTION_REPORT';

export {
  MIGRATION_SUMMARY,
  EXPORT_VERIFICATION,
  ORGANIZATION_RATIONALE,
  SAFE_DELETION_CHECKLIST,
  QUALITY_METRICS,
  RECOMMENDED_NEXT_STEPS,
  type MigrationSummaryType,
  type ExportVerificationType
} from './MIGRATION_SUMMARY';

export {
  COMPLETION_REPORT,
  MIGRATION_DETAILS,
  STRUCTURAL_CHANGES,
  VERIFICATION_RESULTS,
  IMPACT_ANALYSIS,
  RECOMMENDATIONS,
  METRICS,
  LESSONS_LEARNED,
  SUCCESS_CRITERIA_VERIFICATION,
  FINAL_STATUS,
  type CompletionReportType,
  type MigrationDetailsType,
  type VerificationResultsType
} from './COMPLETION_REPORT';

// ════════════════════════════════════════════════════════════════════════════
// REFINEMENT STRATEGY DOCUMENTATION
// ════════════════════════════════════════════════════════════════════════════
export * from './REFINEMENT_STRATEGY';

