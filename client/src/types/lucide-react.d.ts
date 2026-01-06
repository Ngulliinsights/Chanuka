/**
 * Extended Lucide React type declarations
 * Consolidated from global and client type definitions
 * Provides fallback types for missing icons and ensures type safety
 */

declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
    className?: string;
    color?: string;
    strokeWidth?: number | string;
    onClick?: (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => void;
    style?: React.CSSProperties;
  }

  export type LucideIcon = ComponentType<LucideProps>;

  // Core icons that should exist
  export const Search: LucideIcon;
  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const Home: LucideIcon;
  export const User: LucideIcon;
  export const Settings: LucideIcon;
  export const Bell: LucideIcon;
  export const Heart: LucideIcon;
  export const Share2: LucideIcon;
  export const Bookmark: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const Clock: LucideIcon;
  export const Users: LucideIcon;
  export const FileText: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Shield: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Loader2: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Lock: LucideIcon;
  export const Unlock: LucideIcon;
  export const Mail: LucideIcon;
  export const Phone: LucideIcon;
  export const Calendar: LucideIcon;
  export const MapPin: LucideIcon;
  export const Star: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const Edit: LucideIcon;
  export const Trash2: LucideIcon;
  export const Download: LucideIcon;
  export const Upload: LucideIcon;
  export const Copy: LucideIcon;
  export const Check: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const ArrowDown: LucideIcon;

  // Missing icons - provide fallback types
  export const Info: LucideIcon;
  export const Globe: LucideIcon;
  export const Scale: LucideIcon;
  export const HelpCircle: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Smartphone: LucideIcon;
  export const Filter: LucideIcon;
  export const TestTube: LucideIcon;
  export const Save: LucideIcon;
  export const Database: LucideIcon;
  export const Trash: LucideIcon;
  export const Image: LucideIcon;
  export const PanelLeft: LucideIcon;
  export const Building: LucideIcon;
  export const Circle: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Target: LucideIcon;
  export const MessageSquare: LucideIcon;

  // Additional icons from global declarations
  export const Earth: LucideIcon;
  export const Activity: LucideIcon;
  export const Award: LucideIcon;
  export const Flame: LucideIcon;
  export const Grid3X3: LucideIcon;
  export const LayoutGrid: LucideIcon;
  export const List: LucideIcon;
  export const Maximize2: LucideIcon;
  export const Megaphone: LucideIcon;
  export const Network: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Send: LucideIcon;
  export const ThumbsUp: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Trophy: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const Zap: LucideIcon;

  // Aliases for compatibility
  export const Grid: LucideIcon; // Alias for Grid3X3

  // Fallback for any other missing icons
  const _default: Record<string, LucideIcon>;
  export default _default;
}

// Specific module declarations for commonly used icons
declare module 'lucide-react/Sparkles' {
  import type { LucideIcon } from 'lucide-react';
  const Sparkles: LucideIcon;
  export default Sparkles;
}

declare module 'lucide-react/BookOpen' {
  import type { LucideIcon } from 'lucide-react';
  const BookOpen: LucideIcon;
  export default BookOpen;
}
