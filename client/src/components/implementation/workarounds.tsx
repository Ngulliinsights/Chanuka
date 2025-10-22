import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Plus, Clock, DollarSign, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { logger } from '@/utils/browser-logger';

// Type definitions with improved specificity
type Priority = 'low' | 'medium' | 'high' | 'critical';
type Status = 'proposed' | 'under_review' | 'approved' | 'implemented' | 'rejected';
type SortOption = 'recent' | 'popular' | 'priority';
type VoteType = 'up' | 'down';

interface Workaround {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  upvotes: number;
  downvotes: number;
  implementationCost?: number;
  timelineEstimate?: number;
  stakeholderSupport: Record<string, string>;
  createdAt: Date;
  author: {
    name: string;
    expertise?: string;
  };
}

interface ImplementationWorkaroundsProps {
  billId: number;
}

// Type-safe form state interface
interface NewWorkaroundForm {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  implementationCost: string;
  timelineEstimate: string;
}

// Extracted constants for better maintainability and type safety
const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
} as const;

const STATUS_COLORS: Record<Status, string> = {
  implemented: 'bg-green-100 text-green-800 border-green-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  under_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  proposed: 'bg-gray-100 text-gray-800 border-gray-200',
} as const;

const STATUS_ICONS: Record<Status, typeof CheckCircle2> = {
  implemented: CheckCircle2,
  approved: CheckCircle2,
  under_review: Clock,
  rejected: AlertCircle,
  proposed: Clock,
} as const;

const STAKEHOLDER_SUPPORT_COLORS: Record<string, string> = {
  strong: 'border-green-300 text-green-700',
  moderate: 'border-yellow-300 text-yellow-700',
  neutral: 'border-gray-300 text-gray-700',
  weak: 'border-red-300 text-red-700',
} as const;

// Initial state for new workaround form with proper typing
const INITIAL_WORKAROUND_STATE: NewWorkaroundForm = {
  title: '',
  description: '',
  category: '',
  priority: 'medium',
  implementationCost: '',
  timelineEstimate: '',
};

// Type guards for runtime validation
const isValidSortOption = (value: string): value is SortOption => {
  return ['recent', 'popular', 'priority'].includes(value);
};

const isValidStatus = (value: string): value is Status => {
  return ['proposed', 'under_review', 'approved', 'implemented', 'rejected'].includes(value);
};

const isValidPriority = (value: string): value is Priority => {
  return ['low', 'medium', 'high', 'critical'].includes(value);
};

export function ImplementationWorkarounds({ billId }: ImplementationWorkaroundsProps) {
  const [workarounds, setWorkarounds] = useState<Workaround[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [votingStates, setVotingStates] = useState<Record<number, boolean>>({});
  const [newWorkaround, setNewWorkaround] = useState<NewWorkaroundForm>(INITIAL_WORKAROUND_STATE);

  // Type-safe handlers for Select components
  const handleSortChange = useCallback((value: string) => {
    if (isValidSortOption(value)) {
      setSortBy(value);
    }
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setFilterStatus(value);
  }, []);

  const handlePriorityChange = useCallback((value: string) => {
    if (isValidPriority(value)) {
      setNewWorkaround(prev => ({ ...prev, priority: value }));
    }
  }, []);

  // Memoized functions to prevent unnecessary re-renders
  const getPriorityColor = useCallback((priority: Priority) => {
    return PRIORITY_COLORS[priority];
  }, []);

  const getStatusColor = useCallback((status: Status) => {
    return STATUS_COLORS[status];
  }, []);

  const getStatusIcon = useCallback((status: Status) => {
    const IconComponent = STATUS_ICONS[status];
    return <IconComponent className="w-4 h-4" />;
  }, []);

  // Optimized fetch function with proper error handling and loading states
  const fetchWorkarounds = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        status: filterStatus,
        sort: sortBy,
      });

      const response = await fetch(`/api/bills/${billId}/workarounds?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setWorkarounds(data);
    } catch (error) {
      logger.error('Failed to fetch workarounds:', { component: 'Chanuka' }, error);
      // In a real app, you might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  }, [billId, filterStatus, sortBy]);

  useEffect(() => {
    fetchWorkarounds();
  }, [fetchWorkarounds]);

  // Optimized form validation with better type safety
  const isFormValid = useMemo(() => {
    return newWorkaround.title.trim().length > 0 && 
           newWorkaround.description.trim().length > 0;
  }, [newWorkaround.title, newWorkaround.description]);

  const handleCreateWorkaround = useCallback(async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...newWorkaround,
        implementationCost: newWorkaround.implementationCost ? parseFloat(newWorkaround.implementationCost) : null,
        timelineEstimate: newWorkaround.timelineEstimate ? parseInt(newWorkaround.timelineEstimate) : null,
      };

      const response = await fetch(`/api/bills/${billId}/workarounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Reset form and close dialog
      setShowCreateDialog(false);
      setNewWorkaround(INITIAL_WORKAROUND_STATE);

      // Refresh the workarounds list
      await fetchWorkarounds();
    } catch (error) {
      logger.error('Failed to create workaround:', { component: 'Chanuka' }, error);
      // In a real app, you might want to show an error toast here
    } finally {
      setIsSubmitting(false);
    }
  }, [isFormValid, newWorkaround, billId, fetchWorkarounds]);

  // Optimized voting with loading states to prevent double-clicks
  const handleVote = useCallback(async (workaroundId: number, type: VoteType) => {
    // Prevent multiple votes while one is in progress
    if (votingStates[workaroundId]) return;

    setVotingStates(prev => ({ ...prev, [workaroundId]: true }));

    try {
      const response = await fetch(`/api/workarounds/${workaroundId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchWorkarounds();
    } catch (error) {
      logger.error('Failed to vote:', { component: 'Chanuka' }, error);
    } finally {
      setVotingStates(prev => ({ ...prev, [workaroundId]: false }));
    }
  }, [votingStates, fetchWorkarounds]);

  // Type-safe form field update function
  const updateNewWorkaround = useCallback((field: keyof NewWorkaroundForm, value: string) => {
    setNewWorkaround(prev => ({ ...prev, [field]: value }));
  }, []);

  // Memoized stakeholder support rendering
  const renderStakeholderSupport = useCallback((stakeholderSupport: Record<string, string>) => {
    const entries = Object.entries(stakeholderSupport);
    if (entries.length === 0) return null;

    return (
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Stakeholder Support</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {entries.map(([stakeholder, support]) => (
            <Badge 
              key={stakeholder} 
              variant="outline"
              className={STAKEHOLDER_SUPPORT_COLORS[support] || 'border-gray-300 text-gray-700'}
            >
              {stakeholder.replace('_', ' ')}: {support}
            </Badge>
          ))}
        </div>
      </div>
    );
  }, []);

  // Memoized workaround card rendering
  const renderWorkaroundCard = useCallback((workaround: Workaround) => (
    <Card key={workaround.id} className="p-6 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{workaround.title}</h3>
            <Badge className={getPriorityColor(workaround.priority)}>
              {workaround.priority.toUpperCase()}
            </Badge>
            <Badge className={getStatusColor(workaround.status)}>
              {getStatusIcon(workaround.status)}
              <span className="ml-1">{workaround.status.replace('_', ' ').toUpperCase()}</span>
            </Badge>
          </div>

          {workaround.category && (
            <Badge variant="outline" className="mb-3">
              {workaround.category}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote(workaround.id, 'up')}
            disabled={votingStates[workaround.id]}
            className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {votingStates[workaround.id] ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
            <span className="text-sm">{workaround.upvotes}</span>
          </button>

          <button
            onClick={() => handleVote(workaround.id, 'down')}
            disabled={votingStates[workaround.id]}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {votingStates[workaround.id] ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
            <span className="text-sm">{workaround.downvotes}</span>
          </button>
        </div>
      </div>

      <p className="text-gray-700 mb-4 leading-relaxed">
        {workaround.description}
      </p>

      {/* Implementation Details */}
      {(workaround.implementationCost || workaround.timelineEstimate) && (
        <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
          {workaround.implementationCost && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>${workaround.implementationCost.toLocaleString()}</span>
            </div>
          )}

          {workaround.timelineEstimate && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{workaround.timelineEstimate} days</span>
            </div>
          )}
        </div>
      )}

      {/* Stakeholder Support */}
      {renderStakeholderSupport(workaround.stakeholderSupport)}

      {/* Author */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Proposed by <strong>{workaround.author.name}</strong></span>
          {workaround.author.expertise && (
            <Badge variant="secondary" className="text-xs">
              {workaround.author.expertise}
            </Badge>
          )}
        </div>

        <span className="text-sm text-gray-500">
          {new Date(workaround.createdAt).toLocaleDateString()}
        </span>
      </div>
    </Card>
  ), [getPriorityColor, getStatusColor, getStatusIcon, handleVote, votingStates, renderStakeholderSupport]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Implementation Workarounds</h2>
          <p className="text-gray-600 mt-1">
            Practical solutions to address implementation challenges
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Propose Workaround
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Propose Implementation Workaround</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Workaround title"
                value={newWorkaround.title}
                onChange={(e) => updateNewWorkaround('title', e.target.value)}
              />

              <Textarea
                placeholder="Describe the implementation challenge and your proposed solution..."
                value={newWorkaround.description}
                onChange={(e) => updateNewWorkaround('description', e.target.value)}
                className="min-h-[120px]"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Category (e.g., Compliance, Infrastructure)"
                  value={newWorkaround.category}
                  onChange={(e) => updateNewWorkaround('category', e.target.value)}
                />

                <Select 
                  value={newWorkaround.priority} 
                  onValueChange={handlePriorityChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Implementation cost (USD)"
                  type="number"
                  value={newWorkaround.implementationCost}
                  onChange={(e) => updateNewWorkaround('implementationCost', e.target.value)}
                />

                <Input
                  placeholder="Timeline estimate (days)"
                  type="number"
                  value={newWorkaround.timelineEstimate}
                  onChange={(e) => updateNewWorkaround('timelineEstimate', e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateWorkaround}
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Workaround'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="proposed">Proposed</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="priority">By Priority</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary">
          {workarounds.length} workarounds
        </Badge>
      </div>

      {/* Workarounds List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading workarounds...</span>
          </div>
        ) : workarounds.length > 0 ? (
          workarounds.map(renderWorkaroundCard)
        ) : (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No workarounds yet</h3>
            <p className="text-gray-600 mb-4">
              Be the first to propose an implementation workaround for this bill.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Propose Workaround
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}