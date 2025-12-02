import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Textarea } from '@client/components/ui/textarea';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import { Alert, AlertDescription } from '@client/components/ui/alert';
import AppLayout from '@client/components/layout/app-layout';
import CommunityHub from '@client/components/community/CommunityHub';
import { 
  MessageSquare, 
  BarChart3, 
  Megaphone, 
  Send, 
  Bell, 
  Calendar, 
  ExternalLink,
  Star,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'update' | 'maintenance' | 'feature' | 'policy';
  priority: 'low' | 'medium' | 'high';
  publishedAt: string;
  author: string;
  readCount: number;
}

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature' | 'improvement' | 'other';
  status: 'submitted' | 'reviewing' | 'planned' | 'completed';
  votes: number;
  submittedAt: string;
  author: string;
}

/**
 * Announcements Section Component
 */
function AnnouncementsSection() {
  const [announcements] = useState<Announcement[]>([
    {
      id: '1',
      title: 'New Bill Analysis Features Released',
      content: 'We\'ve launched enhanced bill analysis tools including constitutional impact assessment, economic analysis, and expert opinion integration. These features provide deeper insights into legislative proposals.',
      type: 'feature',
      priority: 'high',
      publishedAt: '2024-01-20T10:00:00Z',
      author: 'Platform Team',
      readCount: 1247
    },
    {
      id: '2',
      title: 'Scheduled Maintenance - January 25th',
      content: 'We will be performing scheduled maintenance on January 25th from 2:00 AM to 4:00 AM EAT. During this time, some features may be temporarily unavailable.',
      type: 'maintenance',
      priority: 'medium',
      publishedAt: '2024-01-18T14:30:00Z',
      author: 'Technical Team',
      readCount: 892
    },
    {
      id: '3',
      title: 'Community Guidelines Update',
      content: 'We\'ve updated our community guidelines to ensure respectful and constructive discussions. Please review the new guidelines in your account settings.',
      type: 'policy',
      priority: 'medium',
      publishedAt: '2024-01-15T09:00:00Z',
      author: 'Community Team',
      readCount: 2156
    }
  ]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'policy': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Announcements</h2>
          <p className="text-muted-foreground">Stay updated with the latest platform news and updates</p>
        </div>
        <Button variant="outline">
          <Bell className="h-4 w-4 mr-2" />
          Subscribe to Updates
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className={getPriorityColor(announcement.priority)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={getTypeColor(announcement.type)}>
                      {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                    </Badge>
                    {announcement.priority === 'high' && (
                      <Badge variant="destructive">Important</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{announcement.title}</CardTitle>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(announcement.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1">
                    {announcement.readCount.toLocaleString()} reads
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-4">{announcement.content}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  By {announcement.author}
                </span>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Read More
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Feedback Section Component
 */
function FeedbackSection() {
  const [feedbackItems] = useState<FeedbackItem[]>([
    {
      id: '1',
      title: 'Dark Mode Support',
      description: 'Add dark mode theme option for better user experience during night time usage.',
      category: 'feature',
      status: 'planned',
      votes: 156,
      submittedAt: '2024-01-18T16:20:00Z',
      author: 'Sarah K.'
    },
    {
      id: '2',
      title: 'Mobile App Development',
      description: 'Develop native mobile applications for iOS and Android platforms.',
      category: 'feature',
      status: 'reviewing',
      votes: 243,
      submittedAt: '2024-01-15T11:30:00Z',
      author: 'Michael O.'
    },
    {
      id: '3',
      title: 'Improved Search Filters',
      description: 'Add more granular search filters for bills including date ranges, sponsors, and policy areas.',
      category: 'improvement',
      status: 'completed',
      votes: 89,
      submittedAt: '2024-01-10T09:15:00Z',
      author: 'Jane W.'
    }
  ]);

  const [newFeedback, setNewFeedback] = useState({
    title: '',
    description: '',
    category: 'feature' as const
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'planned': return 'bg-blue-100 text-blue-800';
      case 'reviewing': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'bug': return 'bg-red-100 text-red-800';
      case 'feature': return 'bg-purple-100 text-purple-800';
      case 'improvement': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitFeedback = () => {
    if (!newFeedback.title.trim() || !newFeedback.description.trim()) return;
    
    // In real app, this would submit to API
    console.log('Submitting feedback:', newFeedback);
    
    // Reset form
    setNewFeedback({
      title: '',
      description: '',
      category: 'feature'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Community Feedback</h2>
        <p className="text-muted-foreground">Help us improve the platform by sharing your ideas and reporting issues</p>
      </div>

      {/* Submit New Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>Share your ideas for platform improvements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input
              placeholder="Brief description of your suggestion..."
              value={newFeedback.title}
              onChange={(e) => setNewFeedback(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <select
              className="w-full p-2 border rounded-md"
              title="Select feedback category"
              value={newFeedback.category}
              onChange={(e) => setNewFeedback(prev => ({ ...prev, category: e.target.value as any }))}
            >
              <option value="feature">New Feature</option>
              <option value="improvement">Improvement</option>
              <option value="bug">Bug Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Provide detailed information about your suggestion..."
              rows={4}
              value={newFeedback.description}
              onChange={(e) => setNewFeedback(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          
          <Button 
            onClick={handleSubmitFeedback}
            disabled={!newFeedback.title.trim() || !newFeedback.description.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
        </CardContent>
      </Card>

      {/* Existing Feedback */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Community Suggestions</h3>
        <div className="space-y-4">
          {feedbackItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                      </Badge>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-lg">{item.title}</h4>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{new Date(item.submittedAt).toLocaleDateString()}</div>
                    <div>by {item.author}</div>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{item.description}</p>
                
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="sm">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    {item.votes} votes
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Discuss
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Star className="h-4 w-4 mr-2" />
                    Follow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Alert>
        <Bell className="h-4 w-4" />
        <AlertDescription>
          Your feedback helps us prioritize development efforts. Popular suggestions are more likely to be implemented in future updates.
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Community Input Page - Integrated with real API and components
 * 
 * This page serves as the main hub for community engagement, featuring:
 * - Real-time discussions with voting and interaction
 * - Community polls for gathering opinions on legislation
 * - Feedback submission system for platform improvements
 * - Announcement viewing for official updates
 * 
 * The CommunityHub component handles all data fetching, state management,
 * and real-time updates through the API layer.
 */
export default function CommunityInput() {
  // Track which tab is currently active
  const [activeTab, setActiveTab] = useState('community');

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Main navigation tabs for different community features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab list with responsive design - shows icons on mobile, full text on desktop */}
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="community" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Community Hub</span>
              <span className="sm:hidden">Hub</span>
            </TabsTrigger>
            <TabsTrigger value="discussions" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Discussions</span>
              <span className="sm:hidden">Talk</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">Announcements</span>
              <span className="sm:hidden">News</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
              <span className="sm:hidden">Send</span>
            </TabsTrigger>
          </TabsList>

          {/* Community Hub Tab - Fully integrated with real API */}
          <TabsContent value="community" className="mt-0">
            <CommunityHub />
          </TabsContent>

          {/* Discussions Tab - Uses the same CommunityHub component */}
          <TabsContent value="discussions" className="mt-0">
            <CommunityHub />
          </TabsContent>

          {/* Announcements Tab - Official platform updates */}
          <TabsContent value="announcements" className="mt-0">
            <AnnouncementsSection />
          </TabsContent>

          {/* Feedback Tab - Platform improvement suggestions */}
          <TabsContent value="feedback" className="mt-0">
            <FeedbackSection />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}