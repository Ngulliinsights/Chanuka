/**
 * Design System Typography
 *
 * Typography components and structural containers for consistent text styling,
 * content hierarchy, and content organization.
 * 
 * STRATEGIC PLACEMENT:
 * - Text Display: Heading, Text, Label
 * - Structural Containers: Card (with CardHeader, CardContent, CardFooter)
 */

// ════════════════════════════════════════════════════════════════════
// TEXT HIERARCHY (Heading levels, body text, labels)
// ════════════════════════════════════════════════════════════════════

export { Heading, headingVariants, type HeadingProps } from './heading';
export { Text, textVariants, type TextProps } from './text';
export { Label, labelVariants, type LabelProps } from './Label';

// ════════════════════════════════════════════════════════════════════
// STRUCTURAL CONTAINERS (Layout wrappers, card-like components)
// ════════════════════════════════════════════════════════════════════

export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
  cardVariants,
  type CardProps
} from './Card';