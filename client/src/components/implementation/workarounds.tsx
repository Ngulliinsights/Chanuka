
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowUp, ArrowDown, Plus, Clock, DollarSign, Users, CheckCircle2, AlertCircle } from 'lucide-react';

interface Workaround {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'proposed' | 'under_review' | 'approved' | 'implemented' | 'rejected';
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

export function ImplementationWorkarounds({ billId }: ImplementationWorkaroundsProps) {
  const [workarounds, setWorkarounds] = useState<Workaround[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'priority'>('popular');
  
  const [newWorkaround, setNewWorkaround] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as const,
    implementationCost: '',
    timelineEstimate: '',
  });

  useEffect(() => {
    fetchWorkarounds();
  }, [billId, filterStatus, sortBy]);

  const fetchWorkarounds = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}/workarounds?status=${filterStatus}&sort=${sortBy}`);
      if (response.ok) {
        const data = await response.json();
        setWorkarounds(data);
      }
    } catch (error) {
      console.error('Failed to fetch workarounds:', error);
    }
  };

  const handleCreateWorkaround = async () => {
    if (!newWorkaround.title.trim() || !newWorkaround.description.trim()) return;

    try {
      const response = await fetch(`/api/bills/${billId}/workarounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newWorkaround,
          implementationCost: newWorkaround.implementationCost ? parseFloat(newWorkaround.implementationCost) : null,
          timelineEstimate: newWorkaround.timelineEstimate ? parseInt(newWorkaround.timelineEstimate) : null,
        }),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setNewWorkaround({
          title: '',
          description: '',
          category: '',
          priority: 'medium',
          implementationCost: '',
          timelineEstimate: '',
        });
        await fetchWorkarounds();
      }
    } catch (error) {
      console.error('Failed to create workaround:', error);
    }
  };

  const handleVote = async (workaroundId: number, type: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/workarounds/${workaroundId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        await fetchWorkarounds();
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-green-100 text-green-800 border-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented': return <CheckCircle2 className="w-4 h-4" />;
      case 'approved': return <CheckCircle2 className="w-4 h-4" />;
      case 'under_review': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

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
                onChange={(e) => setNewWorkaround(prev => ({ ...prev, title: e.target.value }))}
              />
              
              <Textarea
                placeholder="Describe the implementation challenge and your proposed solution..."
                value={newWorkaround.description}
                onChange={(e) => setNewWorkaround(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px]"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Category (e.g., Compliance, Infrastructure)"
                  value={newWorkaround.category}
                  onChange={(e) => setNewWorkaround(prev => ({ ...prev, category: e.target.value }))}
                />
                
                <Select 
                  value={newWorkaround.priority} 
                  onValueChange={(value: any) => setNewWorkaround(prev => ({ ...prev, priority: value }))}
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
                  onChange={(e) => setNewWorkaround(prev => ({ ...prev, implementationCost: e.target.value }))}
                />
                
                <Input
                  placeholder="Timeline estimate (days)"
                  type="number"
                  value={newWorkaround.timelineEstimate}
                  onChange={(e) => setNewWorkaround(prev => ({ ...prev, timelineEstimate: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateWorkaround}>
                  Create Workaround
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
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

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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
        {workarounds.map((workaround) => (
          <Card key={workaround.id} className="p-6">
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
                  className="flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span className="text-sm">{workaround.upvotes}</span>
                </button>
                
                <button
                  onClick={() => handleVote(workaround.id, 'down')}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors"
                >
                  <ArrowDown className="w-4 h-4" />
                  <span className="text-sm">{workaround.downvotes}</span>
                </button>
              </div>
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed">
              {workaround.description}
            </p>

            {/* Implementation Details */}
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

            {/* Stakeholder Support */}
            {Object.keys(workaround.stakeholderSupport).length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Stakeholder Support</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(workaround.stakeholderSupport).map(([stakeholder, support]) => (
                    <Badge 
                      key={stakeholder} 
                      variant="outline"
                      className={
                        support === 'strong' ? 'border-green-300 text-green-700' :
                        support === 'moderate' ? 'border-yellow-300 text-yellow-700' :
                        support === 'neutral' ? 'border-gray-300 text-gray-700' :
                        'border-red-300 text-red-700'
                      }
                    >
                      {stakeholder.replace('_', ' ')}: {support}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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
        ))}

        {workarounds.length === 0 && (
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
