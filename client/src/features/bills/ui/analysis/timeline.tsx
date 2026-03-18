import { format } from 'date-fns';

import { cn } from '@lib/utils';

interface Action {
  title: string;
  date: string | Date;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface ActionTimelineProps {
  actions: Action[];
}

export };
