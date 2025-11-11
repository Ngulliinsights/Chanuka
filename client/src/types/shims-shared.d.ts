/*
  More concrete (but still lightweight) ambient declarations for
  commonly used shared exports and third-party modules used by the
  client. These are intentionally conservative: they model the shapes
  the client expects without pulling in the full shared/third-party
  typegraphs. Replace with official types (or direct imports from
  `shared/*`) when available.
*/

declare module '@shared/core' {
  // Logger shape used across client code
  export interface Logger {
    debug(...args: any[]): void;
    info(message: string, ...meta: any[]): void;
    warn(message: string | Error, ...meta: any[]): void;
    error(message: string | Error, ...meta: any[]): void;
  }

  export const logger: Logger;

  // Performance monitoring
  export const performanceMonitor: any;
  export const Performance: any;

  // Minimal PerformanceBudget shape
  export interface PerformanceBudget {
    id?: string;
    name: string;
    thresholdMs: number;
    category?: string;
  }

  export function getPerformanceBudgets(): PerformanceBudget[];
  export function validateBudgetConfig(cfg: any): boolean;

  // Widget types used by dashboard code
  export type WidgetSize = { width: number; height: number };
  export interface WidgetConfig {
    id: string;
    type: string;
    title: string;
    size: WidgetSize;
    position: { x: number; y: number };
    props?: Record<string, any>;
    permissions?: string[];
    refreshInterval?: number;
    dataSource?: string;
  }

  // Lightweight error hierarchy used by the client
  export class BaseError extends Error {
    code?: string;
    metadata?: Record<string, any>;
    constructor(message?: string, code?: string, metadata?: Record<string, any>);
  }

  export class ValidationError extends BaseError {
    fields?: Record<string, string[]>;
    constructor(message?: string, fields?: Record<string, string[]>);
  }

  export const DEFAULT_CONFIG: any;

  export default {} as {
    logger: Logger;
    getPerformanceBudgets: typeof getPerformanceBudgets;
  };
}

declare module '@shared/core/*' {
  const anyExport: any;
  export default anyExport;
}

// Provide a lightweight declaration for the validation sub-module so client
// code can import validation helpers without pulling full shared types.
declare module '@shared/core/validation' {
  import { ZodSchema } from 'zod';

  export interface ValidationService {
    validate<T>(schema: ZodSchema<T>, data: unknown): Promise<T>;
    validateSafe<T>(schema: ZodSchema<T>, data: unknown): Promise<{ success: boolean; data?: T; error?: any }>;
    validateBatch(...args: any[]): Promise<any>;
    registerSchema(name: string, schema: ZodSchema<any>): void;
    getSchema(name: string): ZodSchema<any> | undefined;
  }

  export const validationService: ValidationService;
  export const validate: typeof validationService.validate;
  export const validateSafe: typeof validationService.validateSafe;
  export const validateBatch: typeof validationService.validateBatch;
  export const registerSchema: typeof validationService.registerSchema;
  export const getSchema: typeof validationService.getSchema;

  export default validationService;
}

declare module '@shared/schema' {
  export interface ArchitectureComponent {
    id: string | number;
    name: string;
    description?: string;
    status?: 'stable' | 'active_dev' | 'refactoring' | 'planned' | string;
  }

  export type FeatureFlag = { 
    key: string; 
    enabled: boolean;
    expiryDate?: string;
  };
  export type AnalyticsMetric = { name: string; value: number; unit?: string };
  export type Checkpoint = { 
    id: string; 
    label: string;
    targetDate?: string;
    phase?: string;
  };

  export default {} as any;
}

declare module '@shared/schema/*' {
  const anyExport: any;
  export default anyExport;
}

// Minimal Radix primitives used by the UI components
declare module '@radix-ui/react-collapsible' {
  import * as React from 'react';
  export const Collapsible: React.FC<any>;
  export const CollapsibleContent: React.FC<any>;
  export const CollapsibleTrigger: React.FC<any>;
  export default { Collapsible, CollapsibleContent, CollapsibleTrigger };
}

declare module '@radix-ui/react-tooltip' {
  import * as React from 'react';
  export const Root: React.FC<any>;
  export const Trigger: React.FC<any>;
  export const Content: React.FC<any>;
  export const Provider: React.FC<any>;
  export const Arrow: React.FC<any>;
  export default { Root, Trigger, Content, Provider, Arrow };
}

// react-day-picker (light) - define props the client commonly uses
declare module 'react-day-picker' {
  import * as React from 'react';

  export interface DayPickerProps {
    footer?: React.ReactNode;
    disabled?: (date: Date) => boolean;
    required?: boolean;
    onSelect?: (date: Date | Date[] | undefined) => void;
    mode?: 'single' | 'multiple' | 'range';
    selected?: Date | Date[] | { from: Date; to: Date } | undefined;
    className?: string;
    classNames?: Record<string, string>;
    showOutsideDays?: boolean;
    initialFocus?: boolean;
    components?: Record<string, React.ComponentType<any>>;
  }

  export type DateRange = { from: Date; to: Date };
  export const DayPicker: React.FC<DayPickerProps>;
  export default DayPicker;
}

// lucide-react: icons are React components rendering SVG. Provide a
// typed component shape and common named exports used in the client.
declare module 'lucide-react' {
  import * as React from 'react';
  export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string };

  export const Calendar: React.FC<IconProps>;
  export const Users: React.FC<IconProps>;
  export const AlertCircle: React.FC<IconProps>;
  export const TrendingUp: React.FC<IconProps>;
  export const Loader2: React.FC<IconProps>;
  export const Filter: React.FC<IconProps>;
  export const ThumbsUp: React.FC<IconProps>;
  export const ThumbsDown: React.FC<IconProps>;
  export const Reply: React.FC<IconProps>;
  export const MoreVertical: React.FC<IconProps>;
  export const Edit: React.FC<IconProps>;
  export const Trash: React.FC<IconProps>;
  export const Search: React.FC<IconProps>;
  export const X: React.FC<IconProps>;
  export const Clock: React.FC<IconProps>;
  export const Star: React.FC<IconProps>;
  export const ArrowLeft: React.FC<IconProps>;
  export const ChevronRight: React.FC<IconProps>;
  export const ChevronLeft: React.FC<IconProps>;
  export const Building: React.FC<IconProps>;
  export const BarChart3: React.FC<IconProps>;
  export const Vote: React.FC<IconProps>;
  export const Eye: React.FC<IconProps>;
  export const EyeOff: React.FC<IconProps>;
  export const MapPin: React.FC<IconProps>;
  export const Save: React.FC<IconProps>;
  export const DollarSign: React.FC<IconProps>;
  export const Share2: React.FC<IconProps>;
  export const Target: React.FC<IconProps>;
  export const CheckCircle: React.FC<IconProps>;
  export const Shield: React.FC<IconProps>;
  export const Database: React.FC<IconProps>;
  export const FileText: React.FC<IconProps>;
  export const BarChart: React.FC<IconProps>;
  export const Scale: React.FC<IconProps>;
  export const Cpu: React.FC<IconProps>;
  export const AlertTriangle: React.FC<IconProps>;
  export const Loader: React.FC<IconProps>;
  
  // Additional icons found in the codebase
  export const Bell: React.FC<IconProps>;
  export const Mail: React.FC<IconProps>;
  export const Smartphone: React.FC<IconProps>;
  export const Volume2: React.FC<IconProps>;
  export const VolumeX: React.FC<IconProps>;
  export const Info: React.FC<IconProps>;
  export const Tag: React.FC<IconProps>;
  export const User: React.FC<IconProps>;
  export const Gauge: React.FC<IconProps>;
  export const Milestone: React.FC<IconProps>;
  export const ToggleLeft: React.FC<IconProps>;
  export const GitBranch: React.FC<IconProps>;
  export const Layers: React.FC<IconProps>;
  export const LayoutGrid: React.FC<IconProps>;
  export const LayoutList: React.FC<IconProps>;
  export const Flag: React.FC<IconProps>;
  export const Split: React.FC<IconProps>;
  export const RefreshCw: React.FC<IconProps>;
  export const Download: React.FC<IconProps>;
  export const Activity: React.FC<IconProps>;
  export const Server: React.FC<IconProps>;
  export const HardDrive: React.FC<IconProps>;
  export const Settings: React.FC<IconProps>;
  export const TrendingDown: React.FC<IconProps>;
  export const Minus: React.FC<IconProps>;
  export const Network: React.FC<IconProps>;
  export const ZoomIn: React.FC<IconProps>;
  export const ZoomOut: React.FC<IconProps>;
  export const RotateCcw: React.FC<IconProps>;
  export const Check: React.FC<IconProps>;
  export const Circle: React.FC<IconProps>;
  export const HelpCircle: React.FC<IconProps>;
  export const Image: React.FC<IconProps>;
  export const Lock: React.FC<IconProps>;
  export const ChevronDown: React.FC<IconProps>;
  export const ChevronUp: React.FC<IconProps>;
  export const PanelLeft: React.FC<IconProps>;
  export const Moon: React.FC<IconProps>;
  export const Sun: React.FC<IconProps>;
  export const Monitor: React.FC<IconProps>;
  export const Award: React.FC<IconProps>;
  export const MessageSquare: React.FC<IconProps>;
  export const TestTube: React.FC<IconProps>;
  export const Link: React.FC<IconProps>;

  const _default: Record<string, React.FC<IconProps>>;
  export default _default;
}
