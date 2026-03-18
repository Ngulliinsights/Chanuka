import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { FocusTrap } from '@client/lib/a11y/focus-trap';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[];
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [currentSnap, setCurrentSnap] = React.useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const height = snapPoints[currentSnap] * 100;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <FocusTrap active={isOpen} onEscape={onClose}>
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'bottom-sheet-title' : undefined}
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-transform"
          style={{ height: `${height}vh` }}
        >
          <div className="flex items-center justify-center py-2">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>

          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 id="bottom-sheet-title" className="text-lg font-semibold">
                {title}
              </h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          <div className="overflow-y-auto h-full pb-20 px-4">{children}</div>
        </div>
      </FocusTrap>
    </>
  );
}
