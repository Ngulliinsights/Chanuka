/**
 * Community Filters - Advanced filtering for community content
 * 
 * Features:
 * - Content type filtering (comments, discussions, expert insights, etc.)
 * - Policy area filtering
 * - Time range selection
 * - Geographic filtering
 * - Expert level filtering
 * - Sort options
 * - Local impact toggle
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { 
  Filter, 
  X, 
  MapPin, 
  Clock, 
  Users, 
  MessageSquare,
  Award,
  Megaphone,
  PenTool,
  FileText,
  TrendingUp,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCommunityStore } from '../../store/slices/communitySlice';
import { CommunityFilters as CommunityFiltersType } from '../../types/community';

interface CommunityFiltersProps {
  onClose?: () => void;
  className?: string;
}

export function CommunityFilters({ onClose, className }: CommunityFiltersProps) {
  const { filters, setFilters, clearFilters } = useCommunityStore();
  const [localFilters, setLocalFilters] = useState<CommunityFiltersType>(filters);

  // Mock data for policy areas - in real app, this would come from API
  const availablePolicyAreas = [
    'Healthcare',
    'Education',
    'Environment',
    'Economy',
    'Transportation',
    'Criminal Justice',
    'Immigration',
    'Technology',
    'Agriculture',
    'Energy',
    'Housing',
    'Labor',
    'Defense',
    'Foreign Policy',
    'Civil Rights'
  ];

  // Mock data for states - in real app, this would come from API
  const availableStates = [
    'California', 'Texas', 'Florida', 'New York', 'Pennsylvania',
    'Illinois', 'Ohio', 'Georgia', 'North Carolina', 'Michigan',
    'New Jersey', 'Virginia', 'Washington', 'Arizona', 'Massachusetts'
  ];

  const contentTypeOptions = [
    { value: 'comments', label: 'Comments', icon: MessageSquare },
    { value: 'discussions', label: 'Discussions', icon: Users },
    { value: 'expert_insights', label: 'Expert Insights', icon: Award },
    { value: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { value: 'petitions', label: 'Petitions', icon: PenTool }
  ] as const;

  const timeRangeOptions = [
    { value: 'hour', label: 'Last Hour' },
    { value: 'day', label: 'Last 24 Hours' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'all', label: 'All Time' }
  ] as const;

  const expertLevelOptions = [
    { value: 'official', label: 'Official Experts', color: 'text-green-600' },
    { value: 'domain', label: 'Domain Experts', color: 'text-blue-600' },
    { value: 'identity', label: 'Verified Identity', color: 'text-amber-600' },
    { value: 'community', label: 'Community Contributors', color: 'text-gray-600' }
  ] as const;

  const sortOptions = [
    { value: 'trending', label: 'Trending', icon: TrendingUp },
    { value: 'recent', label: 'Most Recent', icon: Clock },
    { value: 'popular', label: 'Most Popular', icon: Users },
    { value: 'local_impact', label: 'Local Impact', icon: MapPin }
  ] as const;

  const handleContentTypeChange = (contentType: string, checked: boolean) => {
    const newContentTypes = checked
      ? [...localFilters.contentTypes, contentType as any]
      : localFilters.contentTypes.filter(type => type !== contentType);
    
    setLocalFilters(prev => ({
      ...prev,
      contentTypes: newContentTypes
    }));
  };

  const handlePolicyAreaChange = (policyArea: string, checked: boolean) => {
    const newPolicyAreas = checked
      ? [...localFilters.policyAreas, policyArea]
      : localFilters.policyAreas.filter(area => area !== policyArea);
    
    setLocalFilters(prev => ({
      ...prev,
      policyAreas: newPolicyAreas
    }));
  };

  const handleExpertLevelChange = (expertLevel: string, checked: boolean) => {
    const newExpertLevels = checked
      ? [...localFilters.expertLevel, expertLevel as any]
      : localFilters.expertLevel.filter(level => level !== expertLevel);
    
    setLocalFilters(prev => ({
      ...prev,
      expertLevel: newExpertLevels
    }));
  };

  const handleStateChange = (state: string, checked: boolean) => {
    const newStates = checked
      ? [...localFilters.geography.states, state]
      : localFilters.geography.states.filter(s => s !== state);
    
    setLocalFilters(prev => ({
      ...prev,
      geography: {
        ...prev.geography,
        states: newStates
      }
    }));
  };

  const handleApplyFilters = () => {
    setFilters(localFilters);
    onClose?.();
  };

  const handleResetFilters = () => {
    clearFilters();
    setLocalFilters(filters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.contentTypes.length < contentTypeOptions.length) count++;
    if (localFilters.policyAreas.length > 0) count++;
    if (localFilters.timeRange !== 'week') count++;
    if (localFilters.geography.states.length > 0) count++;
    if (localFilters.expertLevel.length < expertLevelOptions.length) count++;
    if (localFilters.sortBy !== 'trending') count++;
    if (localFilters.showLocalOnly) count++;
    return count;
  };

  return (
    <Card className={cn('chanuka-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Community Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()} active
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Content Types */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Content Types</Label>
          <div className="space-y-2">
            {contentTypeOptions.map(({ value, label, icon: Icon }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`content-${value}`}
                  checked={localFilters.contentTypes.includes(value)}
                  onCheckedChange={(checked) => 
                    handleContentTypeChange(value, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={`content-${value}`}
                  className="text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Time Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Range
          </Label>
          <Select
            value={localFilters.timeRange}
            onValueChange={(value) => 
              setLocalFilters(prev => ({ ...prev, timeRange: value as any }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Sort Options */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Sort By</Label>
          <Select
            value={localFilters.sortBy}
            onValueChange={(value) => 
              setLocalFilters(prev => ({ ...prev, sortBy: value as any }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Expert Levels */}
        <div>
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Award className="h-4 w-4" />
            Expert Levels
          </Label>
          <div className="space-y-2">
            {expertLevelOptions.map(({ value, label, color }) => (
              <div key={value} className="flex items-center space-x-2">
                <Checkbox
                  id={`expert-${value}`}
                  checked={localFilters.expertLevel.includes(value)}
                  onCheckedChange={(checked) => 
                    handleExpertLevelChange(value, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={`expert-${value}`}
                  className={cn('text-sm cursor-pointer', color)}
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Policy Areas */}
        <div>
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Policy Areas
          </Label>
          
          {/* Selected Policy Areas */}
          {localFilters.policyAreas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {localFilters.policyAreas.map((area) => (
                <Badge
                  key={area}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handlePolicyAreaChange(area, false)}
                >
                  {area}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          {/* Policy Area Selection */}
          <div className="max-h-32 overflow-y-auto space-y-2">
            {availablePolicyAreas
              .filter(area => !localFilters.policyAreas.includes(area))
              .map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`policy-${area}`}
                    checked={false}
                    onCheckedChange={(checked) => 
                      handlePolicyAreaChange(area, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`policy-${area}`}
                    className="text-sm cursor-pointer"
                  >
                    {area}
                  </Label>
                </div>
              ))}
          </div>
        </div>

        <Separator />

        {/* Geographic Filters */}
        <div>
          <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Geographic Filters
          </Label>

          {/* Local Only Toggle */}
          <div className="flex items-center space-x-2 mb-3">
            <Checkbox
              id="local-only"
              checked={localFilters.showLocalOnly}
              onCheckedChange={(checked) => 
                setLocalFilters(prev => ({ ...prev, showLocalOnly: checked as boolean }))
              }
            />
            <Label htmlFor="local-only" className="text-sm cursor-pointer">
              Show local content only
            </Label>
          </div>

          {/* Selected States */}
          {localFilters.geography.states.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {localFilters.geography.states.map((state) => (
                <Badge
                  key={state}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleStateChange(state, false)}
                >
                  {state}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          {/* State Selection */}
          <div className="max-h-32 overflow-y-auto space-y-2">
            {availableStates
              .filter(state => !localFilters.geography.states.includes(state))
              .map((state) => (
                <div key={state} className="flex items-center space-x-2">
                  <Checkbox
                    id={`state-${state}`}
                    checked={false}
                    onCheckedChange={(checked) => 
                      handleStateChange(state, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`state-${state}`}
                    className="text-sm cursor-pointer"
                  >
                    {state}
                  </Label>
                </div>
              ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-border/50">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters
          </Button>
          
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}