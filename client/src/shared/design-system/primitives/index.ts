/**
 * UI Component Registry - UNIFIED EXPORT
 * 
 * This is the canonical source for all UI component exports.
 * All components use design tokens and are type-safe.
 * 
 * ✅ Single import point: `import { Button, Card, Input } from '@client/shared/ui/ui`
 * ✅ No more duplicate implementations
 * ✅ All components use design tokens
 * ✅ Full TypeScript support
 */

// Core Design System (Always export these first)
export {
  designTokens,
  getToken,
  validateDesignTokens,
  type DesignTokens,
  type ColorKey,
  type SpacingKey,
  type BreakpointKey,
} from '@client/shared/design-system/tokens/unified-export';

export {
  type ButtonVariant,
  type ButtonSize,
  type ButtonState,
  type ButtonConfig,
  type CardVariant,
  type CardInteractivity,
  type CardConfig,
  type InputVariant,
  type InputState,
  type InputConfig,
  type ColorVariant,
  type SpacingValue,
  type BreakpointValue,
  isValidColorToken,
} from '@client/shared/design-system/types/component-types';

// Core Components (Token-Based)
export {
  Button,
  buttonVariants,
  type ButtonProps,
} from './button';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  type CardProps,
} from './card';

export {
  Input,
  inputVariants,
  type InputProps,
} from './input';

// Legacy compatibility - Types and utilities
export * from './types';
export * from './errors';
export * from './validation';
export * from './recovery';

// LEGACY COMPONENTS (Use token-based versions above)
// These are kept for backward compatibility during migration
export { Input as LegacyInput, EnhancedInput } from './input';
export { 
  Form, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage, 
  FormField, 
  EnhancedForm,
  useFormField 
} from './form';
export { 
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  EnhancedSelect
} from './select';
export { Textarea, EnhancedTextarea } from './textarea';
export { 
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  EnhancedDialog
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  EnhancedDropdownMenu,
  EnhancedDropdownMenuItem
} from './dropdown-menu';
export { 
  Popover, 
  PopoverTrigger, 
  PopoverContent,
  EnhancedPopover,
  EnhancedPopoverContent
} from './popover';
export { Calendar, EnhancedCalendar } from './calendar';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  EnhancedTable,
  EnhancedTableRow,
  EnhancedTableCell
} from './table';
export { Alert } from './alert';
export { Avatar } from './avatar';
export { Badge } from './badge';
export { Label } from './label';
export { Logo } from './logo';
export { OptimizedImage } from './OptimizedImage';
export { Progress } from './progress';
export { ScrollArea } from './scroll-area';
export { Separator } from './separator';
export { Sheet } from './sheet';
export { Sidebar } from './sidebar';
export { Skeleton } from './skeleton';
export { Spinner } from './spinner';
export { Switch } from './switch';
export { Tabs } from './tabs';
export { Toast } from './toast';
export { Toaster } from './toaster';
export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './tooltip';
export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle
} from './navigation-menu';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator
} from './command';
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup
} from './context-menu';

// Enhanced components
export {
  EnhancedTabs,
  EnhancedTooltip,
  EnhancedAvatar,
  EnhancedProgress,
  EnhancedBadge
} from './enhanced-components';

// Form utilities
export * from './form-layout';
export * from './form-field';
export * from './form-accessibility';
export { FormDemo } from './form-demo';

// Test utilities
export * from './__tests__/test-utils';

