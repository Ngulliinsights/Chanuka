
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock,
  Award,
  AlertCircle,
  CheckCircle2,
  Filter,
  Send,
  PlusCircle
} from "lucide-react";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useBills } from '@/hooks/use-bills';

interface CommunityStats {
  totalComments: number;
  activeParticipants: number;
  expertContributions: number;
  verifiedAnalyses: number;
  communityPolls: number;
  impactfulFeedback: number;
}

interface RecentActivity {
  type: string;
  billTitle: string;
  contributor: string;
  action: string;
  timestamp: Date;
  impact: 'low' | 'medium' | 'high';
}

export default function CommunityInput() {
  const [activeTab, setActiveTab] = useState('overview');
  const [newComment, setNewComment] = useState('');
  const [selectedBill, setSelectedBill] = useState<string>('');
  const [expertise, setExpertise] = useState('');
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const queryClient = useQueryClient();

  // Fetch community stats
  const { data: stats } = useQuery<CommunityStats>({
    queryKey: ['community-stats'],
    queryFn: async () => {
      const response = await fetch('/api/community/participation/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery<RecentActivity[]>({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const response = await fetch('/api/community/engagement/recent');
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    }
  });

  // Fetch bills for commenting
  const { data: bills } = useBills({});

  // Submit comment mutation
  const submitComment = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to submit comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      setNewComment('');
      setSelectedBill('');
      setExpertise('');
    }
  });

  // Submit poll mutation
  const submitPoll = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/community/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create poll');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-stats'] });
      setShowPollDialog(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    }
  });

  const handleSubmitComment = () => {
    if (!newComment.trim() || !selectedBill) return;

    submitComment.mutate({
      billId: selectedBill,
      content: newComment,
      expertise: expertise || undefined,
    });
  };

  const handleSubmitPoll = () => {
    if (!pollQuestion.trim() || !selectedBill || pollOptions.some(opt => !opt.trim())) return;

    submitPoll.mutate({
      billId: selectedBill,
      question: pollQuestion,
      options: pollOptions.filter(opt => opt.trim()),
    });
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Community Input Hub</h1>
              <p className="text-blue-100 text-lg">
                Your voice shapes legislation - participate in democratic governance
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</div>
                <div className="text-sm text-blue-100">Comments</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.activeParticipants.toLocaleString()}</div>
                <div className="text-sm text-blue-100">Participants</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.expertContributions}</div>
                <div className="text-sm text-blue-100">Expert Analyses</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.verifiedAnalyses}</div>
                <div className="text-sm text-blue-100">Verified</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.communityPolls}</div>
                <div className="text-sm text-blue-100">Polls</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{stats.impactfulFeedback}</div>
                <div className="text-sm text-blue-100">Bill Changes</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contribute">Contribute</TabsTrigger>
            <TabsTrigger value="polls">Community Polls</TabsTrigger>
            <TabsTrigger value="impact">Your Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Participation Call-to-Action */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Your participation matters!</strong> Community input has led to 67 bill amendments this year. 
                Join {stats?.activeParticipants.toLocaleString()} citizens shaping Kenya's laws.
              </AlertDescription>
            </Alert>

            {/* Recent Activity */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold">Recent Community Activity</h2>
              </div>

              {recentActivity && (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {activity.type === 'comment' ? <MessageSquare className="h-4 w-4 text-blue-600" /> : <BarChart3 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{activity.contributor}</span>
                          <span className="text-gray-600">{activity.action}</span>
                          <Badge className={`text-xs ${getImpactColor(activity.impact)}`}>
                            {activity.impact} impact
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">{activity.billTitle}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* How Your Input Makes a Difference */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="h-6 w-6 text-yellow-500" />
                How Your Input Makes a Difference
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Expert Analysis</h3>
                  <p className="text-sm text-gray-600">Legal experts and professionals provide detailed analysis that helps MPs understand complex implications.</p>
                </div>
                <div className="text-center">
                  <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Community Polls</h3>
                  <p className="text-sm text-gray-600">Polling data shows public opinion trends that influence legislative decisions and priorities.</p>
                </div>
                <div className="text-center">
                  <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Bill Amendments</h3>
                  <p className="text-sm text-gray-600">Direct feedback leads to bill improvements, with 67 successful amendments this year based on community input.</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contribute" className="space-y-6">
            {/* Contribution Form */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <PlusCircle className="h-6 w-6 text-blue-600" />
                Contribute Your Analysis
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Bill to Comment On</label>
                  <select
                    value={selectedBill}
                    onChange={(e) => setSelectedBill(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a bill...</option>
                    {bills?.map((bill: any) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Your Expertise (Optional)</label>
                  <Input
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    placeholder="e.g., Constitutional Law, Public Health, Environmental Policy"
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Your Analysis</label>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your detailed analysis, concerns, or insights about this legislation. Your expertise helps inform better policy decisions..."
                    className="min-h-[150px] focus:ring-2 focus:ring-blue-500"
                    maxLength={2000}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {newComment.length}/2000 characters
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || !selectedBill || submitComment.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submitComment.isPending ? 'Submitting...' : 'Submit Analysis'}
                    <Send className="h-4 w-4 ml-2" />
                  </Button>

                  <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={!selectedBill}>
                        Create Poll
                        <BarChart3 className="h-4 w-4 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create Community Poll</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Poll Question</label>
                          <Input
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="What would you like the community to vote on?"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Options</label>
                          <div className="space-y-2">
                            {pollOptions.map((option, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => updatePollOption(index, e.target.value)}
                                  placeholder={`Option ${index + 1}`}
                                  className="flex-1"
                                />
                                {pollOptions.length > 2 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removePollOption(index)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          {pollOptions.length < 6 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addPollOption}
                              className="mt-2"
                            >
                              Add Option
                            </Button>
                          )}
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            onClick={handleSubmitPoll}
                            disabled={!pollQuestion.trim() || pollOptions.some(opt => !opt.trim()) || submitPoll.isPending}
                          >
                            {submitPoll.isPending ? 'Creating...' : 'Create Poll'}
                          </Button>
                          <Button variant="outline" onClick={() => setShowPollDialog(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </Card>

            {/* Guidelines */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Community Guidelines</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Provide constructive, evidence-based analysis</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Respect diverse viewpoints and engage in civil discourse</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Share relevant expertise and lived experience</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Focus on policy implications and community impact</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="polls" className="space-y-6">
            <Card className="p-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Community Polls</h3>
                <p className="text-gray-600 mb-4">
                  Active polls will appear here. Create polls on the Contribute tab to gather community input.
                </p>
                <Button onClick={() => setActiveTab('contribute')} variant="outline">
                  Create Your First Poll
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="impact" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-6">Your Democratic Impact</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Participation Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Comments Submitted</span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Polls Created</span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Bills Tracked</span>
                      <Badge variant="secondary">0</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Community Recognition</span>
                      <Badge variant="secondary">New Member</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Civic Engagement Level</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Participation Score</span>
                        <span>5/100</span>
                      </div>
                      <Progress value={5} className="h-2" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Start contributing to increase your civic engagement score and unlock recognition badges!
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
