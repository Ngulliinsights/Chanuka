/**
 * Context exports for backward compatibility
 * Re-exports from the contexts directory
 */

export * from '../contexts/NavigationContext';
export * from '../contexts/ThemeContext';

// Default export for useNavigation hook (using unified navigation)
export { useUnifiedNavigation as useNavigation } from '../core/navigation/hooks/use-unified-navigation';