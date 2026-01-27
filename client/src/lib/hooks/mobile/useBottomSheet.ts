/**
 * useBottomSheet Hook
 *
 * Manages bottom sheet modal state and interactions.
 * Extracted from MobileBottomSheet component.
 *
 * @hook
 * @example
 * ```tsx
 * import { useBottomSheet } from '@client/lib/hooks/mobile';
 * import { MobileBottomSheet } from '@client/lib/ui/mobile/interaction';
 *
 * export function MyComponent() {
 *   const { isOpen, onOpen, onClose, currentSnap, snapTo } = useBottomSheet({
 *     snapPoints: [0.3, 0.6, 1],
 *     initialSnap: 0,
 *   });
 *
 *   return (
 *     <>
 *       <button onClick={onOpen}>Open</button>
 *       <MobileBottomSheet
 *         isOpen={isOpen}
 *         onClose={onClose}
 *         snapPoints={snapPoints}
 *         initialSnap={currentSnap}
 *       >
 *         <Content />
 *       </MobileBottomSheet>
 *     </>
 *   );
 * }
 * ```
 */

import { useCallback, useState } from 'react';

interface UseBottomSheetOptions {
  snapPoints?: number[];
  initialSnap?: number;
}

interface UseBottomSheetReturn {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  toggle: () => void;
  currentSnap: number;
  snapTo: (index: number) => void;
  snapPoints: number[];
}

/**
 * Hook for managing bottom sheet state.
 *
 * @param options - Configuration options for snap points
 * @returns Object with sheet state and handlers
 */
export function useBottomSheet(options: UseBottomSheetOptions = {}): UseBottomSheetReturn {
  const { snapPoints = [0.5, 1], initialSnap = 0 } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);

  const onOpen = useCallback(() => {
    setIsOpen(true);
    setCurrentSnap(initialSnap);
  }, [initialSnap]);

  const onClose = useCallback(() => {
    setIsOpen(false);
    setCurrentSnap(initialSnap);
  }, [initialSnap]);

  const toggle = useCallback(() => {
    if (isOpen) {
      onClose();
    } else {
      onOpen();
    }
  }, [isOpen, onClose, onOpen]);

  const snapTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < snapPoints.length) {
        setCurrentSnap(index);
      }
    },
    [snapPoints.length]
  );

  return {
    isOpen,
    onOpen,
    onClose,
    toggle,
    currentSnap,
    snapTo,
    snapPoints,
  };
}
