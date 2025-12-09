/**
 * Unified Design System
 * 
 * Single source of truth for all UI components.
 * 
 * Usage:
 * import { Button, Input, Card, Alert } from '@client/shared/design-system';
 */

// Core UI Components
export { Button, buttonVariants, type ButtonProps } from './components/Button';
export { Input, inputVariants, type InputProps } from './components/Input';
export { Card, CardHeader, CardContent, CardFooter, type CardProps } from './components/Card';
export { Alert, type AlertProps } from './components/Alert';
export { Badge, type BadgeProps } from './components/Badge';
export { Progress, type ProgressProps } from './components/Progress';
export { Avatar, type AvatarProps } from './components/Avatar';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/Select';
export { Textarea, type TextareaProps } from './components/Textarea';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
export { Switch, type SwitchProps } from './components/Switch';
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/Dialog';
export { Popover, PopoverContent, PopoverTrigger } from './components/Popover';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';

// Design Tokens
export * from './tokens';

// Themes
export * from './themes';

// Utilities
export { cn } from './utils/cn';
export * from './utils/validation';

// Accessibility
export * from './accessibility';
