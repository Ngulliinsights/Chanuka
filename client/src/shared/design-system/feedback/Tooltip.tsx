import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import React from 'react';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
}

export const TooltipProvider = React.memo<{ children: React.ReactNode }>(({ children }) => {
  return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>;
});

TooltipProvider.displayName = 'TooltipProvider';

export const Tooltip = React.memo<{ children: React.ReactNode }>(({ children }) => {
  return <TooltipPrimitive.Root>{children}</TooltipPrimitive.Root>;
});

Tooltip.displayName = 'Tooltip';

export const TooltipTrigger = React.memo<{ children: React.ReactNode; asChild?: boolean }>(
  ({ children, asChild = false }) => {
    return <TooltipPrimitive.Trigger asChild={asChild}>{children}</TooltipPrimitive.Trigger>;
  }
);

TooltipTrigger.displayName = 'TooltipTrigger';

export const TooltipContent = React.memo<{
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  hidden?: boolean;
}>(({ children, side = 'top', align = 'center', hidden = false }) => {
  if (hidden) return null;

  return (
    <TooltipPrimitive.Content
      side={side}
      align={align}
      className="z-50 overflow-hidden rounded-md border border-[hsl(var(--color-border))] bg-[hsl(var(--color-card))] px-3 py-1.5 text-sm text-[hsl(var(--color-card-foreground))] shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-[hsl(var(--color-card))]" />
    </TooltipPrimitive.Content>
  );
});

TooltipContent.displayName = 'TooltipContent';
