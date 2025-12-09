/**
 * SearchFilters Component
 *
 * Advanced filtering component for search results with type filtering,
 * date ranges, categories, and other search criteria.
 */

import { format } from 'date-fns';
import {
  Filter,
  X,
  Calendar as CalendarIcon,
  FileText,
  Users,
  MessageSquare,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@client/shared/design-system/primitives/badge';
import { Button } from '@client/shared/design-system/primitives/button';
import { Calendar } from '@client/shared/design-system/primitives/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system/primitives/card';
import { Checkbox } from '@client/shared/design-system/primitives/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@client/shared/design-system/primitives/popover';
import { Separator } from '@client/shared/design-system/primitives/separator';
import { cn } from '@client/lib/utils';

// Define SearchFilters type locally
interface SearchFiltersType {
  categories?: string[];
  billStatus?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  location?: string;
  tags?: string[];
}

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  availableCategories?: string[];
  availableStatuses?: string[];
  className?: string;
  compact?: boolean;
}

const RESULT_TYPES = [
  { id: 'bills', label: 'Bills', icon: FileText, count: 0 },
  { id: 'sponsors', label: 'Sponsors', icon: Users, count: 0 },
  { id: 'comments', label: 'Comments', icon: MessageSquare, count: 0 }
] as const;

export function SearchFilters({
  filters,
  onFiltersChange,
  availableCategories = [],
  availableStatuses = [],
  className = '',
  compact = false
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const updateFilters = (updates: Partial<SearchFiltersType>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const handleTypeToggle = (_typeId: string, _checked: boolean) => {
    // For now, we'll handle this as a simple type filter
    // In a real implementation, you might have multiple types
    updateFilters({
      // This would need to be adapted based on your actual filter structure
    });
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const currentCategories = filters.categories || [];
    const newCategories = checked
      ? [...currentCategories, category]
      : currentCategories.filter(c => c !== category);

    updateFilters({ categories: newCategories });
  };

  const handleStatusToggle = (status: string, checked: boolean) => {
    const currentStatuses = filters.billStatus || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);

    updateFilters({ billStatus: newStatuses });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      updateFilters({
        dateRange: {
          start: range.from.toISOString().split('T')[0],
          end: range.to.toISOString().split('T')[0]
        }
      });
    } else if (range?.from) {
      updateFilters({
        dateRange: {
          start: range.from.toISOString().split('T')[0],
          end: range.from.toISOString().split('T')[0]
        }
      });
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories?.length) count += filters.categories.length;
    if (filters.billStatus?.length) count += filters.billStatus.length;
    if (filters.dateRange) count += 1;
    if (filters.location) count += 1;
    if (filters.tags?.length) count += filters.tags.length;
    return count;
  };

  const hasActiveFilters = getActiveFilterCount() > 0;

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
              {getActiveFilterCount()}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 ml-2" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-2" />
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Result Types */}
        <div>
          <h4 className="font-medium mb-3">Result Types</h4>
          <div className="space-y-2">
            {RESULT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.id}`}
                    checked={true} // For now, all types are selected by default
                    onCheckedChange={(checked) => handleTypeToggle(type.id, checked as boolean)}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <label
                    htmlFor={`type-${type.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {type.label}
                  </label>
                  {type.count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {type.count}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Categories */}
        {availableCategories.length > 0 && (
          <>
            <div>
              <h4 className="font-medium mb-3">Categories</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={filters.categories?.includes(category) || false}
                      onCheckedChange={(checked) => handleCategoryToggle(category, checked as boolean)}
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Status */}
        {availableStatuses.length > 0 && (
          <>
            <div>
              <h4 className="font-medium mb-3">Status</h4>
              <div className="space-y-2">
                {availableStatuses.map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filters.billStatus?.includes(status) || false}
                      onCheckedChange={(checked) => handleStatusToggle(status, checked as boolean)}
                    />
                    <label
                      htmlFor={`status-${status}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Date Range */}
        <div>
          <h4 className="font-medium mb-3">Date Range</h4>
          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange ? (
                  filters.dateRange.start === filters.dateRange.end ? (
                    format(new Date(filters.dateRange.start), 'PPP')
                  ) : (
                    `${format(new Date(filters.dateRange.start), 'LLL dd')} - ${format(new Date(filters.dateRange.end), 'LLL dd')}`
                  )
                ) : (
                  'Pick a date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={filters.dateRange ? {
                  from: new Date(filters.dateRange.start),
                  to: new Date(filters.dateRange.end)
                } : undefined}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Active Filters</h4>
              <div className="flex flex-wrap gap-2">
                {filters.categories?.map((category) => (
                  <Badge key={category} variant="secondary" className="flex items-center space-x-1">
                    <span>{category}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCategoryToggle(category, false)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}

                {filters.billStatus?.map((status) => (
                  <Badge key={status} variant="secondary" className="flex items-center space-x-1">
                    <span>{status}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusToggle(status, false)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}

                {filters.dateRange && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>
                      {filters.dateRange.start === filters.dateRange.end
                        ? format(new Date(filters.dateRange.start), 'MMM dd')
                        : `${format(new Date(filters.dateRange.start), 'MMM dd')} - ${format(new Date(filters.dateRange.end), 'MMM dd')}`
                      }
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateFilters({ dateRange: undefined })}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default SearchFilters;