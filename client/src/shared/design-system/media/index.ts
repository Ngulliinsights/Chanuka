/**
 * Design System Media Components
 *
 * Visual media display components for images, avatars, and visual assets.
 * 
 * STRATEGIC PLACEMENT:
 * - User/Entity Representation: Avatar (with AvatarImage, AvatarFallback)
 * - Image Optimization: OptimizedImage (responsive, lazy-loaded)
 * - Brand & Assets: Logo
 */

// ════════════════════════════════════════════════════════════════════
// AVATARS (User/entity visual representation)
// ════════════════════════════════════════════════════════════════════

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  avatarVariants,
  type AvatarProps
} from './Avatar';

// ════════════════════════════════════════════════════════════════════
// IMAGE COMPONENTS (Optimized, responsive image display)
// ════════════════════════════════════════════════════════════════════

export { OptimizedImage } from './OptimizedImage';
export { Logo } from './Logo';