/**
 * Time Filter Selector Component
 * 
 * Allows users to filter dashboard data by time periods.
 */

import { Calendar, Clock } from 'lucide-react';
import React from 'react';

import { TemporalFilter } from '@client/types/user-dashboard';

import { Button } from '../../ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

interface TimeFilterSelectorProps {
  value: TemporalFilter;
  onChange: (filter: TemporalFilter) => void;
  className?: string;
}

export function TimeFilterSelector({ 
  value, 
  onChange, 
  className = '' 
}: TimeFilterSelectorProps) {
  
  const timeOptions = [
    { value: 'day', label: 'Last 24 Hours' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'quarter', label: 'Last 3 Months' },
    { value: 'year', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ] as const;

  const handlePeriodChange = (period: TemporalFilter['period']) => {
    onChange({
      period,
      startDate: undefined,
      endDate: undefined
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value.period}
        onValueChange={handlePeriodChange}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}