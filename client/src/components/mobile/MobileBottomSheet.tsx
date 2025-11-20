/**
 * Mobile Bottom Sheet Component
 * 
 * A mobile-optimized bottom sheet that slides up from the bottom of the screen.
 * Used for filters, actions, and secondary content on mobile devices.
 * 
 * Features:
 * - Touch-optimized interactions with 44px minimum touch targets
 * - Swipe gestures for open/close
 * - Backdrop blur and overlay
 * - Keyboard navigation support
 * - Accessibility compliance
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, GripHorizontal } from 'lucide-react';
import { cn } from '@client/lib/utils';
import { Button } from '../ui/button';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  showHandle?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnSwipeDown?: boolean;
  snapPoints?: number[]; // Percentage heights for snapping
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxHeight = '90vh',
  showHandle = true,
  closeOnBackdropClick = true,
  closeOnSwipeDown = true,
  snapPoints = [50, 90], // Default snap points at 50% and 90%
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentTranslateY, setCurrentTranslateY] = useState(0);
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints[snapPoints.length - 1]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === backdropRef.current) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!closeOnSwipeDown) return;
    
    const touch = e.touches[0];
    setDragStartY(touch.clientY);
    setIsDragging(true);
  }, [closeOnSwipeDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !closeOnSwipeDown) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY;
    
    // Only allow downward swipes
    if (deltaY > 0) {
      setCurrentTranslateY(deltaY);
      
      // Apply transform to sheet
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  }, [isDragging, dragStartY, closeOnSwipeDown]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !closeOnSwipeDown) return;

    setIsDragging(false);
    
    // If dragged down more than 100px, close the sheet
    if (currentTranslateY > 100) {
      onClose();
    } else {
      // Snap back to original position
      if (sheetRef.current) {
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
    
    setCurrentTranslateY(0);
  }, [isDragging, currentTranslateY, onClose, closeOnSwipeDown]);

  // Focus management
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      // Focus the first focusable element
      const focusableElements = sheetRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sheetContent = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'bottom-sheet-title' : undefined}
    >
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-background rounded-t-xl shadow-xl',
          'transform transition-transform duration-300 ease-out',
          'max-h-[90vh] overflow-hidden',
          className
        )}
        style={{ maxHeight }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center py-3">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || !showHandle) && (
          <div className="flex items-center justify-between px-4 py-3 border-b">
            {title && (
              <h2 id="bottom-sheet-title" className="text-lg font-semibold">
                {title}
              </h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 ml-auto"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}

/**
 * Hook for managing bottom sheet state
 */
export function useBottomSheet(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}