/**
 * Advanced Multi-Dimensional Filtering System
 * 
 * Provides comprehensive filtering capabilities for bills with:
 * - Desktop sidebar and mobile bottom sheet interfaces
 * - Multi-dimensional filtering (bill type, policy areas, sponsors, urgency, controversy, constitutional flags)
 * - Active filter chips with individual removal and "Clear All" functionality
 * - URL synchronization for shareable filtered views
 * - Dynamic result counts showing filter impact
 * - Controversy level filtering and strategic importance categorization
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Flag,
  Tag,
  Settings,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setFilters, type BillsFilter } from '../../store/slices/billsSlice';

interface FilterPanelProps {
  className?: string;
  isMobile?: boolean;
  resultCount?: number;
  totalCount?: number;
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  description?: string;
}

// interface FilterSection {
//   key: keyof BillsFilter;
//   title: string;
//   icon: React.ComponentType<{ className?: string }>;
//   options: FilterOption[];
//   type: 'checkbox' | 'select' | 'toggle';
//   collapsible?: boolean;
// }

// Filter configuration data
// const BILL_TYPES: FilterOption[] = [
//   { value: 'public', label: 'Public Bills', description: 'Bills affecting the general public' },
//   { value: 'private', label: 'Private Bills', description: 'Bills affecting specific individuals or organizations' },
//   { value: 'money', label: 'Money Bills', description: 'Bills dealing with taxation or government spending' },
//   { value: 'constitutional', label: 'Constitutional Bills', description: 'Bills amending the constitution' },
// ];

const POLICY_AREAS: FilterOption[] = [
  { value: 'technology', label: 'Technology & Digital' },
  { value: 'environment', label: 'Environment & Climate' },
  { value: 'healthcare', label: 'Healthcare & Social Services' },
  { value: 'economy', label: 'Economy & Finance' },
  { value: 'education', label: 'Education & Training' },
  { value: 'infrastructure', label: 'Infrastructure & Transport' },
  { value: 'governance', label: 'Governance & Law' },
  { value: 'security', label: 'Security & Defense' },
  { value: 'agriculture', label: 'Agriculture & Food' },
  { value: 'energy', label: 'Energy & Resources' },
];

const URGENCY_LEVELS: FilterOption[] = [
  { value: 'critical', label: 'Critical', description: 'Requires immediate attention' },
  { value: 'high', label: 'High', description: 'Important and time-sensitive' },
  { value: 'medium', label: 'Medium', description: 'Standard priority' },
  { value: 'low', label: 'Low', description: 'Can be addressed later' },
];

const CONTROVERSY_LEVELS: FilterOption[] = [
  { value: 'high', label: 'High Controversy', description: 'Significant public debate and opposition' },
  { value: 'medium', label: 'Medium Controversy', description: 'Some public debate and mixed opinions' },
  { value: 'low', label: 'Low Controversy', description: 'Minimal public debate or opposition' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'introduced', label: 'Introduced' },
  { value: 'committee', label: 'In Committee' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'signed', label: 'Signed into Law' },
  { value: 'vetoed', label: 'Vetoed' },
];

export function FilterPanel({ className, isMobile = false, resultCount = 0, totalCount = 0 }: FilterPanelProps) {
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.bills.filters);
  
  const handleSetFilters = (newFilters: BillsFilter) => {
    dispatch(setFilters(newFilters));
  };
  
  const clearFilters = () => {
    dispatch(setFilters({}));
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['status', 'urgency']));
  const [isOpen, setIsOpen] = useState(false);

  // Sync filters with URL parameters
  useEffect(() => {
    const urlFilters: Partial<BillsFilter> = {};
    
    // Parse URL parameters into filters
    const statusParam = searchParams.get('status');
    if (statusParam) {
      urlFilters.status = statusParam.split(',');
    }
    
    const urgencyParam = searchParams.get('urgency');
    if (urgencyParam) {
      urlFilters.urgency = urgencyParam.split(',');
    }
    
    const policyAreasParam = searchParams.get('policyAreas');
    if (policyAreasParam) {
      urlFilters.policyAreas = policyAreasParam.split(',');
    }
    
    const sponsorsParam = searchParams.get('sponsors');
    if (sponsorsParam) {
      urlFilters.sponsors = sponsorsParam.split(',');
    }
    
    const constitutionalFlagsParam = searchParams.get('constitutionalFlags');
    if (constitutionalFlagsParam) {
      urlFilters.constitutionalFlags = constitutionalFlagsParam === 'true';
    }
    
    const controversyParam = searchParams.get('controversyLevels');
    if (controversyParam) {
      urlFilters.controversyLevels = controversyParam.split(',');
    }
    
    const dateStartParam = searchParams.get('dateStart');
    const dateEndParam = searchParams.get('dateEnd');
    if (dateStartParam || dateEndParam) {
      urlFilters.dateRange = {
        start: dateStartParam || null,
        end: dateEndParam || null,
      };
    }

    // Update filters if URL has parameters
    if (Object.keys(urlFilters).length > 0) {
      handleSetFilters(urlFilters as BillsFilter);
    }
  }, [searchParams]);

  // Update URL when filters change
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    
    if (filters.status.length > 0) {
      newSearchParams.set('status', filters.status.join(','));
    }
    
    if (filters.urgency.length > 0) {
      newSearchParams.set('urgency', filters.urgency.join(','));
    }
    
    if (filters.policyAreas.length > 0) {
      newSearchParams.set('policyAreas', filters.policyAreas.join(','));
    }
    
    if (filters.sponsors.length > 0) {
      newSearchParams.set('sponsors', filters.sponsors.join(','));
    }
    
    if (filters.constitutionalFlags) {
      newSearchParams.set('constitutionalFlags', 'true');
    }
    
    if (filters.controversyLevels.length > 0) {
      newSearchParams.set('controversyLevels', filters.controversyLevels.join(','));
    }
    
    if (filters.dateRange.start) {
      newSearchParams.set('dateStart', filters.dateRange.start);
    }
    
    if (filters.dateRange.end) {
      newSearchParams.set('dateEnd', filters.dateRange.end);
    }

    setSearchParams(newSearchParams, { replace: true });
  }, [filters, setSearchParams]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filters.status.length;
    count += filters.urgency.length;
    count += filters.policyAreas.length;
    count += filters.sponsors.length;
    count += filters.constitutionalFlags ? 1 : 0;
    count += filters.controversyLevels.length;
    count += (filters.dateRange.start || filters.dateRange.end) ? 1 : 0;
    return count;
  }, [filters]);

  // Generate active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    
    // Status chips
    filters.status.forEach(status => {
      const option = STATUS_OPTIONS.find(opt => opt.value === status);
      if (option) {
        chips.push({
          key: `status-${status}`,
          label: option.label,
          onRemove: () => handleSetFilters({ 
            ...filters,
            status: filters.status.filter(s => s !== status) 
          })
        });
      }
    });
    
    // Urgency chips
    filters.urgency.forEach(urgency => {
      const option = URGENCY_LEVELS.find(opt => opt.value === urgency);
      if (option) {
        chips.push({
          key: `urgency-${urgency}`,
          label: `${option.label} Priority`,
          onRemove: () => handleSetFilters({ 
            ...filters,
            urgency: filters.urgency.filter(u => u !== urgency) 
          })
        });
      }
    });
    
    // Policy area chips
    filters.policyAreas.forEach(area => {
      const option = POLICY_AREAS.find(opt => opt.value === area);
      if (option) {
        chips.push({
          key: `policy-${area}`,
          label: option.label,
          onRemove: () => handleSetFilters({ 
            ...filters,
            policyAreas: filters.policyAreas.filter(p => p !== area) 
          })
        });
      }
    });
    
    // Constitutional flags chip
    if (filters.constitutionalFlags) {
      chips.push({
        key: 'constitutional-flags',
        label: 'Constitutional Issues',
        onRemove: () => handleSetFilters({ ...filters, constitutionalFlags: false })
      });
    }
    
    // Controversy level chips
    filters.controversyLevels.forEach(level => {
      const option = CONTROVERSY_LEVELS.find(opt => opt.value === level);
      if (option) {
        chips.push({
          key: `controversy-${level}`,
          label: option.label,
          onRemove: () => handleSetFilters({ 
            ...filters,
            controversyLevels: filters.controversyLevels.filter(c => c !== level) 
          })
        });
      }
    });
    
    // Date range chip
    if (filters.dateRange.start || filters.dateRange.end) {
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start).toLocaleDateString() : '';
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end).toLocaleDateString() : '';
      const dateLabel = startDate && endDate 
        ? `${startDate} - ${endDate}`
        : startDate 
        ? `From ${startDate}`
        : `Until ${endDate}`;
      
      chips.push({
        key: 'date-range',
        label: dateLabel,
        onRemove: () => handleSetFilters({ 
          ...filters,
          dateRange: { start: null, end: null } 
        })
      });
    }
    
    return chips;
  }, [filters, setFilters]);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  const handleArrayFilterChange = (
    filterKey: keyof BillsFilter,
    value: string,
    checked: boolean
  ) => {
    const currentArray = filters[filterKey] as string[];
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    handleSetFilters({ ...filters, [filterKey]: newArray });
  };

  const FilterSection = ({ 
    title, 
    icon: Icon, 
    children, 
    sectionKey, 
    collapsible = true 
  }: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    sectionKey: string;
    collapsible?: boolean;
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="space-y-3">
        <div 
          className={cn(
            "flex items-center justify-between",
            collapsible && "cursor-pointer"
          )}
          onClick={collapsible ? () => toggleSection(sectionKey) : undefined}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">{title}</Label>
          </div>
          {collapsible && (
            isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )
          )}
        </div>
        
        {(!collapsible || isExpanded) && (
          <div className="space-y-2 pl-6">
            {children}
          </div>
        )}
      </div>
    );
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {resultCount === totalCount ? (
            `Showing all ${totalCount} bills`
          ) : (
            `Showing ${resultCount} of ${totalCount} bills`
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear All ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Active Filters</Label>
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map(chip => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="chanuka-status-badge flex items-center gap-1 text-xs"
              >
                {chip.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-auto p-0 hover:bg-transparent"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label} filter`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Bill Status Filter */}
      <FilterSection title="Bill Status" icon={Flag} sectionKey="status">
        <div className="space-y-2">
          {STATUS_OPTIONS.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${option.value}`}
                checked={filters.status.includes(option.value)}
                onCheckedChange={(checked) => 
                  handleArrayFilterChange('status', option.value, checked as boolean)
                }
              />
              <Label 
                htmlFor={`status-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      <Separator />

      {/* Urgency Level Filter */}
      <FilterSection title="Urgency Level" icon={AlertTriangle} sectionKey="urgency">
        <div className="space-y-2">
          {URGENCY_LEVELS.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`urgency-${option.value}`}
                checked={filters.urgency.includes(option.value)}
                onCheckedChange={(checked) => 
                  handleArrayFilterChange('urgency', option.value, checked as boolean)
                }
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`urgency-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
                {option.description && (
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </FilterSection>

      <Separator />

      {/* Policy Areas Filter */}
      <FilterSection title="Policy Areas" icon={Tag} sectionKey="policyAreas">
        <div className="space-y-2">
          {POLICY_AREAS.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`policy-${option.value}`}
                checked={filters.policyAreas.includes(option.value)}
                onCheckedChange={(checked) => 
                  handleArrayFilterChange('policyAreas', option.value, checked as boolean)
                }
              />
              <Label 
                htmlFor={`policy-${option.value}`}
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </FilterSection>

      <Separator />

      {/* Constitutional Flags Filter */}
      <FilterSection title="Constitutional Issues" icon={Flag} sectionKey="constitutional" collapsible={false}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="constitutional-flags"
            checked={filters.constitutionalFlags}
            onCheckedChange={(checked) => 
              handleSetFilters({ ...filters, constitutionalFlags: checked as boolean })
            }
          />
          <Label 
            htmlFor="constitutional-flags"
            className="text-sm font-normal cursor-pointer"
          >
            Show only bills with constitutional concerns
          </Label>
        </div>
      </FilterSection>

      <Separator />

      {/* Controversy Level Filter */}
      <FilterSection title="Controversy Level" icon={AlertTriangle} sectionKey="controversy">
        <div className="space-y-2">
          {CONTROVERSY_LEVELS.map(option => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`controversy-${option.value}`}
                checked={filters.controversyLevels.includes(option.value)}
                onCheckedChange={(checked) => 
                  handleArrayFilterChange('controversyLevels', option.value, checked as boolean)
                }
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`controversy-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
                {option.description && (
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  // Mobile bottom sheet interface
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="chanuka-btn">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Filter Bills
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FilterContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar interface
  return (
    <Card className={cn("chanuka-card", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Filter Bills
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activeFilterCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FilterContent />
      </CardContent>
    </Card>
  );
}