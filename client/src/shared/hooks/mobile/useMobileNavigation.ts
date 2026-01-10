/**
 * Mobile Navigation Hook
 *
 * Manages navigation drawer state (open/closed)
 * Provides methods to control drawer visibility
 *
 * @module hooks/mobile/useMobileNavigation
 */

import { useCallback, useState } from 'react';

/**
 * Options for useMobileNavigation hook
 */
export interface UseMobileNavigationOptions {
  /** Initial drawer open state */
  initialOpen?: boolean;
  /** Callback when drawer opens */
  onDrawerOpen?: () => void;
  /** Callback when drawer closes */
  onDrawerClose?: () => void;
}

/**
 * Return type for useMobileNavigation hook
 */
export interface UseMobileNavigationReturn {
  /** Whether the drawer is currently open */
  isDrawerOpen: boolean;
  /** Opens the navigation drawer */
  openDrawer: () => void;
  /** Closes the navigation drawer */
  closeDrawer: () => void;
  /** Toggles the navigation drawer */
  toggleDrawer: () => void;
}

/**
 * Hook for managing mobile navigation drawer state
 *
 * @param options - Configuration options
 * @returns Navigation drawer control methods and state
 *
 * @example
 * ```tsx
 * const { isDrawerOpen, openDrawer, closeDrawer } = useMobileNavigation();
 *
 * return (
 *   <>
 *     <button onClick={openDrawer}>Menu</button>
 *     {isDrawerOpen && <NavigationDrawer onClose={closeDrawer} />}
 *   </>
 * );
 * ```
 */
export function useMobileNavigation(
  options: UseMobileNavigationOptions = {}
): UseMobileNavigationReturn {
  const { initialOpen = false, onDrawerOpen, onDrawerClose } = options;

  const [isDrawerOpen, setIsDrawerOpen] = useState(initialOpen);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
    onDrawerOpen?.();
  }, [onDrawerOpen]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    onDrawerClose?.();
  }, [onDrawerClose]);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prev => {
      const newState = !prev;
      if (newState) {
        onDrawerOpen?.();
      } else {
        onDrawerClose?.();
      }
      return newState;
    });
  }, [onDrawerOpen, onDrawerClose]);

  return {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };
}
