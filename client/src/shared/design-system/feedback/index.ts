/**
 * Design System Feedback Components
 *
 * Visual feedback, status indication, messaging, and notification components.
 * 
 * STRATEGIC CATEGORIES:
 * - State Indication: Alert, Badge, Progress
 * - User Notifications: Toast, Toaster, Tooltip
 * - Content States: LoadingSpinner, Skeleton, ErrorMessage
 * - Structure & Separation: Separator, Table
 */

// ════════════════════════════════════════════════════════════════════
// STATUS & STATE INDICATION (Semantic color variants, state feedback)
// ════════════════════════════════════════════════════════════════════

export { Alert, AlertTitle, AlertDescription } from './Alert';
export { Badge, badgeVariants, type BadgeProps } from './Badge';
export { Progress, progressVariants, type ProgressProps } from './Progress';

// ════════════════════════════════════════════════════════════════════
// USER NOTIFICATIONS (Alerts to user, informational messages)
// ════════════════════════════════════════════════════════════════════

export { Toast } from './Toast';
export { Toaster } from './Toaster';
export { Tooltip } from './Tooltip';

// ════════════════════════════════════════════════════════════════════
// LOADING & ERROR STATES (Async operation feedback)
// ════════════════════════════════════════════════════════════════════

export { LoadingSpinner } from './LoadingSpinner';
export { Skeleton } from './skeleton';
export { ErrorMessage } from './ErrorMessage';

// ════════════════════════════════════════════════════════════════════
// STRUCTURE & LAYOUT (Visual separation, data presentation)
// ════════════════════════════════════════════════════════════════════

export { Separator } from './separator';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption
} from './table';