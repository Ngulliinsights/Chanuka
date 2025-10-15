import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  ThumbsUp, 
  ThumbsDown, 
  Users, 
  TrendingUp,
  Send,
  Filter,
  Search,
  Heart,
  Share2
} from 'lucide-react';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  dislikes: number;
  replies: number;
  category: 'concern' | 'support' | 'question' | 'amendment';
}

interface Bill {
  id: string;
  title: string;
  status: string;
  category: string;
  comments: number;
  engagement: number;
}

const CommunityInputPage: React.FC = () => {
  const [selectedBill, setSelectedBill] = useState<string>('all');
  const [commentFilter, setCommentFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [commentCategory, setCommentCategory] = useState<string>('concern');

  const bills: Bill[] = [
    {
      id: '1',
      title: 'Digital Economy Enhancement Act 2024',
      status: 'Committee Review',
      category: 'Technology',
      comments: 147,
      engagement: 89
    },
    {
      id: '2',
      title: 'Healthcare Accessibility Reform Bill',
      status: 'Second Reading',
      category: 'Healthcare',
      comments: 203,
      engagement: 92
    },
    {
      id: '3',
      title: 'Environmental Protection Amendment',
      status: 'Public Participation',
      category: 'Environment',
      comments: 89,
      engagement: 76
    }
  ];

  const comments: Comment[] = [
    {
      id: '1',
      author: 'Jane Doe',
      content: 'This bill needs stronger provisions for data privacy protection. Small businesses should have affordable compliance options.',
      timestamp: '2 hours ago',
      likes: 23,
      dislikes: 2,
      replies: 8,
      category: 'concern'
    },
    {
      id: '2',
      author: 'John Smith',
      content: 'I fully support this initiative. It will create more opportunities for young entrepreneurs in the digital space.',
      timestamp: '4 hours ago',
      likes: 41,
      dislikes: 1,
      replies: 12,
      category: 'support'
    },
    {
      id: '3',
      author: 'Mary Johnson',
      content: 'How will this bill affect existing small-scale digital service providers? Need clarification on transition period.',
      timestamp: '6 hours ago',
      likes: 15,
      dislikes: 0,
      replies: 5,
      category: 'question'
    }
  ];

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      // Implement citizen verification
      const citizenData = await verifyCitizenStatus();
      
      const comment = {
        content: newComment,
        category: commentCategory,
        bill: selectedBill,
        citizenId: citizenData.id,
        verificationLevel: citizenData.verificationLevel,
        demographics: {
          constituency: citizenData.constituency,
          ageGroup: citizenData.ageGroup,
          economicStatus: citizenData.economicStatus
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(comment)
      });

      if (response.ok) {
        setNewComment('');
        // Update local state with new comment
        // Trigger re-fetch of comments
      } else {
        throw new Error('Failed to submit comment');
      }
    } catch (error) {
      logger.error('Comment submission failed:', { component: 'Chanuka' }, error);
      alert('Unable to submit comment. Please try again.');
    }
  };

  const verifyCitizenStatus = async () => {
    // This would integrate with Kenya's identity verification systems
    // For demo purposes, return mock data
    return {
      id: 'citizen-' + Math.random().toString(36).substr(2, 9),
      verificationLevel: 'verified',
      constituency: 'Nairobi Central',
      ageGroup: '25-34',
      economicStatus: 'middle-income'
    };
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'concern': return 'bg-red-100 text-red-800';
      case 'support': return 'bg-green-100 text-green-800';
      case 'question': return 'bg-blue-100 text-blue-800';
      case 'amendment': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community Input</h1>
          <p className="text-muted-foreground">
            Participate in the democratic process by sharing your views on proposed legislation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Active Bills for Comment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Bills Seeking Public Input
          </CardTitle>
          <CardDescription>
            Bills currently open for public participation and community feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold">{bill.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">{bill.status}</Badge>
                    <Badge variant="outline">{bill.category}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {bill.comments}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {bill.engagement}%
                  </div>
                  <Button size="sm" onClick={() => setSelectedBill(bill.id)}>
                    Participate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Comment Submission */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Submit Your Input</CardTitle>
              <CardDescription>
                Share your thoughts, concerns, or suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedBill} onValueChange={setSelectedBill}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bills</SelectItem>
                  {bills.map((bill) => (
                    <SelectItem key={bill.id} value={bill.id}>
                      {bill.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={commentCategory} onValueChange={setCommentCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Comment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concern">Concern</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="amendment">Amendment Suggestion</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                placeholder="Share your input on this legislation..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={6}
              />

              <Button onClick={handleSubmitComment} className="w-full">
                Submit Comment
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Community Feedback */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Community Feedback</CardTitle>
              <CardDescription>
                Recent comments and discussions from citizens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="recent" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="popular">Most Popular</TabsTrigger>
                  <TabsTrigger value="concerns">Concerns</TabsTrigger>
                  <TabsTrigger value="support">Support</TabsTrigger>
                </TabsList>

                <div className="flex gap-2 mb-4">
                  <Select value={commentFilter} onValueChange={setCommentFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Comments</SelectItem>
                      <SelectItem value="concern">Concerns</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="question">Questions</SelectItem>
                      <SelectItem value="amendment">Amendments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <TabsContent value="recent" className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {comment.author.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{comment.author}</p>
                            <p className="text-sm text-muted-foreground">{comment.timestamp}</p>
                          </div>
                        </div>
                        <Badge className={getCategoryColor(comment.category)}>
                          {comment.category}
                        </Badge>
                      </div>

                      <p className="text-sm leading-relaxed">{comment.content}</p>

                      <div className="flex items-center gap-4 pt-2">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {comment.likes}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ThumbsDown className="w-4 h-4" />
                          {comment.dislikes}
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {comment.replies} replies
                        </Button>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="popular">
                  <p className="text-muted-foreground">Most popular comments will be displayed here.</p>
                </TabsContent>

                <TabsContent value="concerns">
                  <p className="text-muted-foreground">Comments expressing concerns will be displayed here.</p>
                </TabsContent>

                <TabsContent value="support">
                  <p className="text-muted-foreground">Supportive comments will be displayed here.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommunityInputPage;