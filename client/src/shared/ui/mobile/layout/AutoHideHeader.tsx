import { BarChart3 } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/shared/design-system/utils/cn';
import { Button } from '@/shared/design-system';
import React from 'react';

interface AutoHideHeaderProps {
  visible: boolean;
  onMenuClick: () => void;
  showFilterButton: boolean;
}

export function AutoHideHeader({ visible, onMenuClick }: AutoHideHeaderProps): JSX.Element {
  const headerId = useId();

  return (
    <header
      id={headerId}
      className={cn(
        'sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b',
        'transition-transform duration-300 ease-in-out',
        visible ? 'translate-y-0' : '-translate-y-full'
      )}
      role="banner"
      aria-label="Application header"
    >
      <div className="flex items-center justify-between h-14 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="h-10 w-10 p-0 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open navigation menu"
          aria-controls="navigation-drawer"
        >
          <BarChart3 className="h-5 w-5" />
        </Button>
        {/* Additional header content */}
      </div>
    </header>
  );
}
