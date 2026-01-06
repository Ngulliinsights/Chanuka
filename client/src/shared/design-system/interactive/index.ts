/**
 * Design System Interactive Components
 *
 * Interactive UI components for user interactions, form controls, selection,
 * navigation interaction, and state management.
 *
 * STRATEGIC PLACEMENT:
 * - Basic Form Controls: Button, Input, Textarea, Select, Checkbox, Switch
 * - Composite Selectors: Tabs, Dialog, Popover
 * - Advanced Navigation: NavigationMenu, DropdownMenu, ContextMenu
 * - Layout Navigation: Sidebar, Sheet
 * - Specialized: Calendar, Collapsible, Command
 * - Utilities: ScrollArea, Form System, Theme Toggle
 */

// ════════════════════════════════════════════════════════════════════
// BASIC FORM CONTROLS (Simple, atomic interactive elements)
// ════════════════════════════════════════════════════════════════════

export { Button, buttonVariants, type ButtonProps } from './Button';
export { Input, inputVariants, type InputProps } from './Input';
export { Textarea } from './Textarea';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
export { Checkbox, type CheckboxProps } from './Checkbox';
export { Switch, type SwitchProps } from './Switch';

// ════════════════════════════════════════════════════════════════════
// COMPOSITE SELECTION COMPONENTS (Multi-element, modal-like)
// ════════════════════════════════════════════════════════════════════

export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './Dialog';

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  EnhancedPopover,
  EnhancedPopoverContent,
} from './Popover';

// ════════════════════════════════════════════════════════════════════
// ADVANCED NAVIGATION (Menu systems, complex interaction patterns)
// ════════════════════════════════════════════════════════════════════

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
  ContextMenuRadioGroup,
} from './ContextMenu';

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
  EnhancedDropdownMenuItem,
} from './DropdownMenu';

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} from './NavigationMenu';

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './Command';

// ════════════════════════════════════════════════════════════════════
// LAYOUT NAVIGATION (Full-page navigation patterns)
// ════════════════════════════════════════════════════════════════════

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './Sidebar';

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './Sheet';

// ════════════════════════════════════════════════════════════════════
// SPECIALIZED INTERACTION (Domain-specific, complex components)
// ════════════════════════════════════════════════════════════════════

export { Calendar, EnhancedCalendar } from './Calendar';

export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './Collapsible';

// ════════════════════════════════════════════════════════════════════
// UTILITIES & SYSTEM (Layout, scrolling, form management)
// ════════════════════════════════════════════════════════════════════

export { ScrollArea, ScrollBar } from './scroll-area';

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './form';

export { ThemeToggle, ThemeToggleButton } from './ThemeToggle';

// ════════════════════════════════════════════════════════════════════
// TOOLTIP COMPONENTS (Contextual help and information)
// ════════════════════════════════════════════════════════════════════

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
