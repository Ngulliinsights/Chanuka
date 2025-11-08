/**
 * UI components barrel exports
 * Following navigation component patterns for consistency
 */

// Types and interfaces
export * from './types';
export * from './errors';
export * from './validation';
export * from './recovery';

// Enhanced components with validation
export { Input, EnhancedInput } from './input';
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
export { Button, buttonVariants, EnhancedButton } from './button';

// Enhanced interactive components with validation and error handling
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

// Other UI components (to be enhanced in future tasks)
export { Alert } from './alert';
export { Avatar } from './avatar';
export { Badge } from './badge';
export { Card } from './card';
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

// New shadcn/ui components
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

// Enhanced components with business logic
export {
  EnhancedTabs,
  EnhancedTooltip,
  EnhancedAvatar,
  EnhancedProgress,
  EnhancedBadge
} from './enhanced-components';

// Initialize recovery strategies
export { initializeUIRecoveryStrategies } from './recovery';

// Enhanced form components with UX improvements
export * from './form-layout';
export * from './form-field';
export * from './form-accessibility';
export { FormDemo } from './form-demo';

// Test utilities (for development and testing)
export * from './__tests__/test-utils';

