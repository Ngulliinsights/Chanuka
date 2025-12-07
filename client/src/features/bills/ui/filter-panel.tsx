/**
 * Advanced Multi-Dimensional Filtering System
 *
 * This component provides a comprehensive filtering interface for legislative bills
 * with intelligent URL synchronization, responsive design, and optimized performance.
 *
 * Key Features:
 * - Responsive sidebar (desktop) and bottom sheet (mobile) layouts
 * - Multi-dimensional filtering across status, urgency, policy areas, and controversy
 * - Active filter chips with individual removal capabilities
 * - URL parameter synchronization for shareable filtered views
 * - Real-time result count feedback
 * - Optimized re-render prevention through memoization
 */

import {
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flag,
  Tag,
  Settings,
  RotateCcw,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { cn } from '@client/lib/utils';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '../../../components/ui/label';
import { Separator } from '../../../components/ui/separator';
import type { BillsQueryParams } from '../model/types';

// ============================================================================
// Type Definitions
// ============================================================================

interface FilterOption {
  value: string;
  label: string;
  description?: string;
}

interface FilterPanelProps {
  filters: BillsQueryParams;
  onFiltersChange: (filters: BillsQueryParams) => void;
  isMobile?: boolean;
  resultCount: number;
  totalCount: number;
  className?: string;
}

interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

type ArrayFilterKey = 'status' | 'urgency' | 'policyAreas' | 'sponsors' | 'controversyLevels';

// ============================================================================
// Filter Configuration Constants
// ============================================================================

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
  {
    value: 'high',
    label: 'High Controversy',
    description: 'Significant public debate and opposition',
  },
  {
    value: 'medium',
    label: 'Medium Controversy',
    description: 'Some public debate and mixed opinions',
  },
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

// Debounce delay for URL updates to prevent excessive history entries
const URL_UPDATE_DEBOUNCE_MS = 150;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely normalizes filter values to ensure they're always arrays.
 * This prevents type errors when filters are undefined or improperly formatted.
 */
const normalizeFilters = (filters: BillsQueryParams) => ({
  status: Array.isArray(filters.status) ? filters.status : [],
  urgency: Array.isArray(filters.urgency) ? filters.urgency : [],
  policyAreas: Array.isArray(filters.policyAreas) ? filters.policyAreas : [],
  sponsors: Array.isArray(filters.sponsors) ? filters.sponsors : [],
  constitutionalFlags: filters.constitutionalFlags || false,
  controversyLevels: Array.isArray(filters.controversyLevels) ? filters.controversyLevels : [],
  dateRange: filters.dateRange || { start: undefined, end: undefined },
});

/**
 * Parses URL search parameters into a structured filter object.
 * This enables shareable URLs with pre-applied filters.
 */
const parseUrlFilters = (searchParams: URLSearchParams): Partial<BillsQueryParams> => {
  const urlFilters: Partial<BillsQueryParams> = {};

  const statusParam = searchParams.get('status');
  if (statusParam) urlFilters.status = statusParam.split(',');

  const urgencyParam = searchParams.get('urgency');
  if (urgencyParam) urlFilters.urgency = urgencyParam.split(',');

  const policyAreasParam = searchParams.get('policyAreas');
  if (policyAreasParam) urlFilters.policyAreas = policyAreasParam.split(',');

  const sponsorsParam = searchParams.get('sponsors');
  if (sponsorsParam) urlFilters.sponsors = sponsorsParam.split(',');

  const constitutionalFlagsParam = searchParams.get('constitutionalFlags');
  if (constitutionalFlagsParam) urlFilters.constitutionalFlags = constitutionalFlagsParam === 'true';

  const controversyParam = searchParams.get('controversyLevels');
  if (controversyParam) urlFilters.controversyLevels = controversyParam.split(',');

  const dateStartParam = searchParams.get('dateStart');
  const dateEndParam = searchParams.get('dateEnd');
  if (dateStartParam || dateEndParam) {
    urlFilters.dateRange = {
      start: dateStartParam || undefined,
      end: dateEndParam || undefined,
    };
  }

  return urlFilters;
};

/**
 * Serializes filter objects into URL search parameters.
 * Only includes filters that have active values to keep URLs clean.
 */
const serializeFiltersToUrl = (filters: ReturnType<typeof normalizeFilters>): URLSearchParams => {
  const params = new URLSearchParams();

  if (filters.status.length > 0) params.set('status', filters.status.join(','));
  if (filters.urgency.length > 0) params.set('urgency', filters.urgency.join(','));
  if (filters.policyAreas.length > 0) params.set('policyAreas', filters.policyAreas.join(','));
  if (filters.sponsors.length > 0) params.set('sponsors', filters.sponsors.join(','));
  if (filters.constitutionalFlags) params.set('constitutionalFlags', 'true');
  if (filters.controversyLevels.length > 0) params.set('controversyLevels', filters.controversyLevels.join(','));
  if (filters.dateRange.start) params.set('dateStart', filters.dateRange.start);
  if (filters.dateRange.end) params.set('dateEnd', filters.dateRange.end);

  return params;
};

// ============================================================================
// Main Component
// ============================================================================

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  isMobile = false,
  resultCount,
  totalCount,
  className,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Track which filter sections are expanded (for better UX on long filter lists)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['status', 'urgency'])
  );
  
  // Controls mobile bottom sheet visibility
  const [isOpen, setIsOpen] = useState(false);

  // Normalize filters to ensure consistent array types throughout the component
  const safeFilters = useMemo(() => normalizeFilters(filters), [filters]);

  // Memoized callback to update filters with proper type safety
  const handleSetFilters = useCallback(
    (newFilters: Partial<BillsQueryParams>) => {
      onFiltersChange({ ...filters, ...newFilters } as BillsQueryParams);
    },
    [filters, onFiltersChange]
  );

  // Clear all active filters at once
  const clearFilters = useCallback(() => {
    onFiltersChange({} as BillsQueryParams);
  }, [onFiltersChange]);

  // ============================================================================
  // URL Synchronization Effect
  // ============================================================================
  
  /**
   * Syncs URL parameters to filters on component mount and when URL changes.
   * This allows users to share filtered views via URL.
   */
  useEffect(() => {
    const urlFilters = parseUrlFilters(searchParams);

    if (Object.keys(urlFilters).length > 0) {
      const filtersChanged = JSON.stringify(urlFilters) !== JSON.stringify(filters);
      if (filtersChanged) {
        onFiltersChange(urlFilters as BillsQueryParams);
      }
    }
  }, [searchParams, filters, onFiltersChange]);

  /**
   * Updates URL when filters change, with debouncing to prevent excessive updates.
   * Uses replace mode to avoid cluttering browser history.
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const newSearchParams = serializeFiltersToUrl(safeFilters);
      const currentParams = searchParams.toString();
      const newParams = newSearchParams.toString();

      if (currentParams !== newParams) {
        setSearchParams(newSearchParams, { replace: true });
      }
    }, URL_UPDATE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [safeFilters, searchParams, setSearchParams]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Calculates the total number of active filters for display in badges.
   * This gives users a quick visual indicator of how many filters are applied.
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += safeFilters.status.length;
    count += safeFilters.urgency.length;
    count += safeFilters.policyAreas.length;
    count += safeFilters.sponsors.length;
    count += safeFilters.constitutionalFlags ? 1 : 0;
    count += safeFilters.controversyLevels.length;
    count += safeFilters.dateRange.start || safeFilters.dateRange.end ? 1 : 0;
    return count;
  }, [safeFilters]);

  /**
   * Generates removable filter chips for all active filters.
   * Each chip shows the filter value and includes a remove button.
   */
  const activeFilterChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = [];

    // Add status filter chips
    safeFilters.status.forEach((status: string) => {
      const option = STATUS_OPTIONS.find(opt => opt.value === status);
      if (option) {
        chips.push({
          key: `status-${status}`,
          label: option.label,
          onRemove: () =>
            handleSetFilters({
              status: safeFilters.status.filter((s: string) => s !== status),
            }),
        });
      }
    });

    // Add urgency filter chips
    safeFilters.urgency.forEach((urgency: string) => {
      const option = URGENCY_LEVELS.find(opt => opt.value === urgency);
      if (option) {
        chips.push({
          key: `urgency-${urgency}`,
          label: `${option.label} Priority`,
          onRemove: () =>
            handleSetFilters({
              urgency: safeFilters.urgency.filter((u: string) => u !== urgency),
            }),
        });
      }
    });

    // Add policy area filter chips
    safeFilters.policyAreas.forEach((area: string) => {
      const option = POLICY_AREAS.find(opt => opt.value === area);
      if (option) {
        chips.push({
          key: `policy-${area}`,
          label: option.label,
          onRemove: () =>
            handleSetFilters({
              policyAreas: safeFilters.policyAreas.filter((p: string) => p !== area),
            }),
        });
      }
    });

    // Add constitutional flags chip if active
    if (safeFilters.constitutionalFlags) {
      chips.push({
        key: 'constitutional-flags',
        label: 'Constitutional Issues',
        onRemove: () => handleSetFilters({ constitutionalFlags: false }),
      });
    }

    // Add controversy level filter chips
    safeFilters.controversyLevels.forEach((level: string) => {
      const option = CONTROVERSY_LEVELS.find(opt => opt.value === level);
      if (option) {
        chips.push({
          key: `controversy-${level}`,
          label: option.label,
          onRemove: () =>
            handleSetFilters({
              controversyLevels: safeFilters.controversyLevels.filter((c: string) => c !== level),
            }),
        });
      }
    });

    // Add date range chip if active
    if (safeFilters.dateRange.start || safeFilters.dateRange.end) {
      const startDate = safeFilters.dateRange.start
        ? new Date(safeFilters.dateRange.start).toLocaleDateString()
        : '';
      const endDate = safeFilters.dateRange.end
        ? new Date(safeFilters.dateRange.end).toLocaleDateString()
        : '';
      const dateLabel =
        startDate && endDate
          ? `${startDate} - ${endDate}`
          : startDate
            ? `From ${startDate}`
            : `Until ${endDate}`;

      chips.push({
        key: 'date-range',
        label: dateLabel,
        onRemove: () =>
          handleSetFilters({
            dateRange: { start: undefined, end: undefined },
          }),
      });
    }

    return chips;
  }, [safeFilters, handleSetFilters]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Toggles the expansion state of a filter section.
   * This improves UX by allowing users to focus on relevant filters.
   */
  const toggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  }, []);

  /**
   * Handles checkbox changes for array-based filters.
   * Adds or removes values from the filter array based on checkbox state.
   */
  const handleArrayFilterChange = useCallback(
    (filterKey: ArrayFilterKey, value: string, checked: boolean) => {
      const currentArray = safeFilters[filterKey] as string[];
      const newArray = checked
        ? [...currentArray, value]
        : currentArray.filter((item: string) => item !== value);

      handleSetFilters({ [filterKey]: newArray });
    },
    [safeFilters, handleSetFilters]
  );

  // ============================================================================
  // Reusable Sub-Components
  // ============================================================================

  /**
   * Reusable collapsible section component for organizing filter groups.
   * Provides consistent styling and behavior across all filter sections.
   */
  const FilterSection = useCallback(
    ({
      title,
      icon: Icon,
      children,
      sectionKey,
      collapsible = true,
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
            className={cn('flex items-center justify-between', collapsible && 'cursor-pointer')}
            onClick={collapsible ? () => toggleSection(sectionKey) : undefined}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">{title}</Label>
            </div>
            {collapsible &&
              (isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ))}
          </div>

          {(!collapsible || isExpanded) && <div className="space-y-2 pl-6">{children}</div>}
        </div>
      );
    },
    [expandedSections, toggleSection]
  );

  /**
   * Main filter content component used in both mobile and desktop layouts.
   * Contains all filter sections and active filter display.
   */
  const FilterContent = useCallback(
    () => (
      <div className="space-y-6">
        {/* Results summary showing filter impact */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {resultCount === totalCount
              ? `Showing all ${totalCount} bills`
              : `Showing ${resultCount} of ${totalCount} bills`}
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear All ({activeFilterCount})
            </Button>
          )}
        </div>

        {/* Active filter chips for quick removal */}
        {activeFilterChips.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map(chip => (
                <Badge
                  key={chip.key}
                  variant="secondary"
                  className="flex items-center gap-1 text-xs"
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

        {/* Bill Status Filter Section */}
        <FilterSection title="Bill Status" icon={Flag} sectionKey="status">
          <div className="space-y-2">
            {STATUS_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={safeFilters.status.includes(option.value)}
                  onCheckedChange={(checked: boolean) =>
                    handleArrayFilterChange('status', option.value, checked)
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

        {/* Urgency Level Filter Section */}
        <FilterSection title="Urgency Level" icon={AlertTriangle} sectionKey="urgency">
          <div className="space-y-2">
            {URGENCY_LEVELS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`urgency-${option.value}`}
                  checked={safeFilters.urgency.includes(option.value)}
                  onCheckedChange={(checked: boolean) =>
                    handleArrayFilterChange('urgency', option.value, checked)
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

        {/* Policy Areas Filter Section */}
        <FilterSection title="Policy Areas" icon={Tag} sectionKey="policyAreas">
          <div className="space-y-2">
            {POLICY_AREAS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`policy-${option.value}`}
                  checked={safeFilters.policyAreas.includes(option.value)}
                  onCheckedChange={(checked: boolean) =>
                    handleArrayFilterChange('policyAreas', option.value, checked)
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

        {/* Constitutional Issues Filter Section */}
        <FilterSection
          title="Constitutional Issues"
          icon={Flag}
          sectionKey="constitutional"
          collapsible={false}
        >
          <div className="flex items-center space-x-2">
            <Checkbox
              id="constitutional-flags"
              checked={safeFilters.constitutionalFlags}
              onCheckedChange={(checked: boolean) =>
                handleSetFilters({ constitutionalFlags: checked })
              }
            />
            <Label htmlFor="constitutional-flags" className="text-sm font-normal cursor-pointer">
              Show only bills with constitutional concerns
            </Label>
          </div>
        </FilterSection>

        <Separator />

        {/* Controversy Level Filter Section */}
        <FilterSection title="Controversy Level" icon={AlertTriangle} sectionKey="controversy">
          <div className="space-y-2">
            {CONTROVERSY_LEVELS.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`controversy-${option.value}`}
                  checked={safeFilters.controversyLevels.includes(option.value)}
                  onCheckedChange={(checked: boolean) =>
                    handleArrayFilterChange('controversyLevels', option.value, checked)
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
    ),
    [
      resultCount,
      totalCount,
      activeFilterCount,
      activeFilterChips,
      safeFilters,
      clearFilters,
      handleArrayFilterChange,
      handleSetFilters,
      FilterSection,
    ]
  );

  // ============================================================================
  // Render Logic
  // ============================================================================

  // Mobile layout with collapsible bottom sheet
  if (isMobile) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-between"
        >
          <span className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {isOpen && (
          <Card className="mt-2">
            <CardContent className="p-4">
              <FilterContent />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Desktop layout with persistent sidebar
  return (
    <Card className={cn('chanuka-card', className)}>
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
};