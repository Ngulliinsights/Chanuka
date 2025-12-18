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
  export const Heart: FC<IconProps>;

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
  export const AlertTriangle: FC<IconProps>;
  export const BarChart3: FC<IconProps>;
  export const Bell: FC<IconProps>;
  export const Calendar: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const ExternalLink: FC<IconProps>;
  export const FileText: FC<IconProps>;
  export const MessageCircle: FC<IconProps>;
  export const MessageSquare: FC<IconProps>;
  export const Megaphone: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const Send: FC<IconProps>;
  export const Shield: FC<IconProps>;
  export const Star: FC<IconProps>;
  export const Target: FC<IconProps>;
  export const ThumbsUp: FC<IconProps>;
  export const TrendingUp: FC<IconProps>;
  export const Users: FC<IconProps>;
}
