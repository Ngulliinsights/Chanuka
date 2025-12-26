/**
 * Type declarations for lucide-react icons that may not be exported by default
 * or have compatibility issues with the current version
 */

declare module 'lucide-react' {
  import type { FC } from 'react';

  export interface IconProps {
    className?: string;
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    onClick?: React.MouseEventHandler<SVGSVGElement>;
    style?: React.CSSProperties;
    [key: string]: any;
  }

  /**
   * Earth icon - globe representation
   */
  export const Earth: FC<IconProps>;

  /**
   * Heart icon - love/favorite representation
   */
  export const Home: FC<IconProps>;
  export const Menu: FC<IconProps>;

  /**
   * Lightning icon - power/energy representation
   */
  export const Lightning: FC<IconProps>;

  /**
   * Re-export arrow-related icons that may have variations
   */
  export const ArrowRight: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;

  /**
   * Re-export other standard icons for completeness
   */
  export const Activity: FC<IconProps>;
  export const AlertCircle: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const Award: FC<IconProps>;
  export const BarChart3: FC<IconProps>;
  export const Bell: FC<IconProps>;
  export const Book: FC<IconProps>;
  export const BookOpen: FC<IconProps>;
  export const Calendar: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const ExternalLink: FC<IconProps>;
  export const FileText: FC<IconProps>;
  export const Flame: FC<IconProps>;
  export const Grid3X3: FC<IconProps>; // Modern replacement for Grid
  export const LayoutGrid: FC<IconProps>;
  export const List: FC<IconProps>;
  export const Loader2: FC<IconProps>;
  export const Maximize2: FC<IconProps>;
  export const Megaphone: FC<IconProps>;
  export const MessageCircle: FC<IconProps>;
  export const MessageSquare: FC<IconProps>;
  export const Network: FC<IconProps>;
  export const RefreshCw: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const Send: FC<IconProps>;
  export const Settings: FC<IconProps>;
  export const Shield: FC<IconProps>;
  export const Sparkles: FC<IconProps>;
  export const Star: FC<IconProps>;
  export const Target: FC<IconProps>;
  export const ThumbsUp: FC<IconProps>;
  export const TrendingUp: FC<IconProps>;
  export const Trophy: FC<IconProps>;
  export const Users: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Zap: FC<IconProps>;

  // Aliases for compatibility
  export const Grid: FC<IconProps>; // Alias for Grid3X3
}

declare module 'lucide-react/Sparkles' {
 import type { FC } from 'react';
 const Sparkles: FC<IconProps>;
 export default Sparkles;
}

declare module 'lucide-react/BookOpen' {
 import type { FC } from 'react';
 const BookOpen: FC<IconProps>;
 export default BookOpen;
}
