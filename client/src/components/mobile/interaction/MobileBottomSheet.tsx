/**
 * MobileBottomSheet Component
 *
 * A draggable bottom sheet modal for mobile devices.
 * Supports multiple snap points and gesture-driven dismissal.
 *
 * @component
 * @example
 * ```tsx
 * import { MobileBottomSheet, useBottomSheet } from '@/components/mobile/interaction';
 *
 * export function MyPage() {
 *   const { isOpen, onClose, onOpen, snapPoints, currentSnap } = useBottomSheet({
 *     snapPoints: [0.3, 0.6, 1],
 *     initialSnap: 0,
 *   });
 *
 *   return (
 *     <>
 *       <button onClick={onOpen}>Open Sheet</button>
 *       <MobileBottomSheet
 *         isOpen={isOpen}
 *         onClose={onClose}
 *         snapPoints={snapPoints}
 *         initialSnap={currentSnap}
 *         dismissOnBackdropPress={true}
 *         dismissOnDrag={true}
 *       >
 *         <SheetContent />
 *       </MobileBottomSheet>
 *     </>
 *   );
 * }
 * ```
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { BottomSheetConfig } from '@/types/mobile';

interface MobileBottomSheetProps extends BottomSheetConfig {
  children: React.ReactNode;
  title?: string;
}

/**
 * MobileBottomSheet Component
 *
 * A bottom sheet modal with drag and snap points support.
 */
export const MobileBottomSheet = React.forwardRef<HTMLDivElement, MobileBottomSheetProps>(
  ({
    isOpen,
    onClose,
    snapPoints = [0.5, 1],
    initialSnap = 0,
    dismissOnBackdropPress = true,
    dismissOnDrag = true,
    title,
    children
  }, ref) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startPosition = useRef<number>(0);

    // Convert snap points to pixel values
    const getSnapPosition = useCallback((index: number) => {
      if (!sheetRef.current) return 0;
      const sheetHeight = sheetRef.current.offsetHeight;
      return sheetHeight * (1 - snapPoints[index]);
    }, [snapPoints]);

    // Snap to nearest point
    const snapToPoint = useCallback((targetPosition: number) => {
      if (!sheetRef.current) return;

      const sheetHeight = sheetRef.current.offsetHeight;
      let closestIndex = 0;
      let minDistance = Math.abs(targetPosition - getSnapPosition(0));

      snapPoints.forEach((_, index) => {
        const distance = Math.abs(targetPosition - getSnapPosition(index));
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      const snapPosition = getSnapPosition(closestIndex);
      setCurrentPosition(snapPosition);

      // If snapping to closed position (top), close the sheet
      if (closestIndex === 0 && snapPosition >= sheetHeight * 0.9) {
        onClose();
      }
    }, [snapPoints, getSnapPosition, onClose]);

    // Handle touch start
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      setIsDragging(true);
      startY.current = e.touches[0].clientY;
      startPosition.current = currentPosition;
    }, [currentPosition]);

    // Handle touch move
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!isDragging || !sheetRef.current) return;

      const deltaY = e.touches[0].clientY - startY.current;
      const newPosition = Math.max(0, startPosition.current + deltaY);
      setCurrentPosition(newPosition);
    }, [isDragging]);

    // Handle touch end
    const handleTouchEnd = useCallback(() => {
      if (!isDragging) return;

      setIsDragging(false);

      if (dismissOnDrag && currentPosition > getSnapPosition(snapPoints.length - 1) * 1.2) {
        // Dismiss if dragged too far down
        onClose();
      } else {
        snapToPoint(currentPosition);
      }
    }, [isDragging, currentPosition, dismissOnDrag, getSnapPosition, snapPoints.length, onClose, snapToPoint]);

    // Initialize position when opened
    useEffect(() => {
      if (isOpen && sheetRef.current) {
        const initialPosition = getSnapPosition(initialSnap);
        setCurrentPosition(initialPosition);
      }
    }, [isOpen, initialSnap, getSnapPosition]);

    // Reset position when closed
    useEffect(() => {
      if (!isOpen) {
        setCurrentPosition(0);
      }
    }, [isOpen]);

    return (
      <div ref={ref} className={`mobile-bottom-sheet ${isOpen ? 'open' : ''}`}>
        {isOpen && (
          <>
            <div
              className="backdrop"
              onClick={dismissOnBackdropPress ? onClose : undefined}
            />
            <div
              ref={sheetRef}
              className="sheet-content"
              style={{
                transform: `translateY(${currentPosition}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {title && <div className="sheet-header">{title}</div>}
              {children}
            </div>
          </>
        )}
      </div>
    );
  }
);

MobileBottomSheet.displayName = 'MobileBottomSheet';

export default MobileBottomSheet;
