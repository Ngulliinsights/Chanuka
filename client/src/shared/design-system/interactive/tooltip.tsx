import React from 'react';

export const TooltipProvider = ({ children }: { children?: React.ReactNode }) => (
  <div>{children}</div>
);

export const Tooltip = ({ children }: { children?: React.ReactNode }) => (
  <div>{children}</div>
);

export const TooltipTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />
);
TooltipTrigger.displayName = 'TooltipTrigger';

export const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />
);
TooltipContent.displayName = 'TooltipContent';
