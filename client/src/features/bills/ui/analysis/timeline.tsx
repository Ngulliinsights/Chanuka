import { format } from 'date-fns';

import { cn } from '@client/lib/utils';
import { logger } from '@client/utils/logger';
import React from 'react';

interface Action {
  title: string;
  date: string | Date;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface ActionTimelineProps {
  actions: Action[];
}

export const ActionTimeline = ({ actions }: ActionTimelineProps) => {
  return (
    <div className="relative border-l-2 border-slate-200 pl-6 ml-3 space-y-6">
      {actions.map((action, index) => (
        <div className="relative" key={index}>
          <div 
            className={cn(
              "absolute -left-8 mt-1.5 h-4 w-4 rounded-full border-2 bg-white",
              action.status === 'upcoming' 
                ? "border-slate-300" 
                : "border-primary-500"
            )}
          ></div>
          <div className={cn(
            action.status === 'upcoming' ? "text-slate-400" : ""
          )}>
            <h3 className="font-medium">{action.title}</h3>
            <time className="text-xs text-slate-500">
              {typeof action.date === 'string' 
                ? action.date 
                : format(new Date(action.date), 'MMMM d, yyyy')}
            </time>
            <p className={cn(
              "mt-1 text-sm",
              action.status === 'upcoming' ? "text-slate-400" : "text-slate-600"
            )}>
              {action.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

