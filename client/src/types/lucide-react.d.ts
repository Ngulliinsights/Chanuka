/**
 * Extended Lucide React type declarations
 * Provides fallback types for missing icons
 */

declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
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
  export const Mail: LucideIcon;
  export const MessageSquare: LucideIcon;

  // Fallback for any other missing icons
  const _default: Record<string, LucideIcon>;
  export default _default;
}
