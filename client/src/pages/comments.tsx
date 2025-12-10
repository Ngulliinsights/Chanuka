import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Reply,
  Flag,
  Send,
  Filter,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/shared/design-system';
import { Separator } from '@client/shared/design-system';
import { Textarea } from '@client/shared/design-system';

interface Comment {
  id: string;
  author: {
    name: string;
    avatar?: string;
    verified: boolean;
    title?: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  dislikes: number;
  replies: Comment[];
  isExpert?: boolean;
}

interface BillInfo {
  id: string;
  title: string;
  billNumber: string;
}

export default function CommentsPage() {
  const { id } = useParams();
  const [comments, setComments] = useState<Comment[]>([]);
  const [billInfo, setBillInfo] = useState<BillInfo | null>(null);
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCommentsAndBill = async () => {
      setLoading(true);
      
      // Mock data
      const mockBill: BillInfo = {
        id: id || '1',
        title: 'Digital Privacy Protection and Data Rights Act',
        billNumber: 'HB-2024-001'
      };

      const mockComments: Comment[] = [
        {
          id: '1',
          author: {
            name: 'Dr. Sarah Kimani',
            verified: true,
            title: 'Privacy Law Expert'
          },
          content: 'This bill represents a significant step forward in protecting digital rights in Kenya. The provisions for data portability and the right to be forgotten align well with international standards like GDPR. However, I would recommend strengthening the enforcement mechanisms in Section 15.',
          timestamp: '2024-01-20T10:30:00Z',
          likes: 45,
          dislikes: 3,
          replies: [
            {
              id: '1-1',
              author: {
                name: 'Michael Chen',
                verified: false
              },
              content: 'Great point about enforcement. What specific mechanisms would you suggest?',
              timestamp: '2024-01-20T11:15:00Z',
              likes: 12,
              dislikes: 0,
              replies: []
            }
          ],
          isExpert: true
        },
        {
          id: '2',
          author: {
            name: 'Jane Wanjiku',
            verified: true,
            title: 'Small Business Owner'
          },
          content: 'As a small business owner, I\'m concerned about the compliance costs. While I support privacy protection, we need clear guidelines and perhaps a phased implementation for SMEs. The current timeline seems too aggressive.',
          timestamp: '2024-01-20T09:45:00Z',
          likes: 28,
          dislikes: 8,
          replies: [],
          isExpert: false
        },
        {
          id: '3',
          author: {
            name: 'Prof. David Mwangi',
            verified: true,
            title: 'Constitutional Law Professor'
          },
          content: 'From a constitutional perspective, this bill excellently balances individual privacy rights with legitimate business interests. The provisions in Article 31 are well-addressed, and the bill creates a robust framework for digital rights protection.',
          timestamp: '2024-01-20T08:20:00Z',
          likes: 67,
          dislikes: 2,
          replies: [
            {
              id: '3-1',
              author: {
                name: 'Mary Njeri',
                verified: false
              },
              content: 'Thank you for this analysis, Professor. Could you elaborate on how this compares to similar legislation in other African countries?',
              timestamp: '2024-01-20T09:00:00Z',
              likes: 15,
              dislikes: 1,
              replies: []
            }
          ],
          isExpert: true
        },
        {
          id: '4',
          author: {
            name: 'Tech Enthusiast',
            verified: false
          },
          content: 'Finally! Kenya is taking digital privacy seriously. This will put us ahead of many countries in the region. I especially like the provisions for algorithmic transparency.',
          timestamp: '2024-01-19T16:30:00Z',
          likes: 34,
          dislikes: 5,
          replies: []
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setBillInfo(mockBill);
      setComments(mockComments);
      setLoading(false);
    };

    loadCommentsAndBill();
  }, [id]);

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: {
        name: 'Current User',
        verified: false
      },
      content: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      replies: []
    };

    setComments(prev => [comment, ...prev]);
    setNewComment('');
  };

  const handleLike = (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, likes: comment.likes + 1 }
        : comment
    ));
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'popular':
        return (b.likes - b.dislikes) - (a.likes - a.dislikes);
      default: // newest
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });

  const filteredComments = sortedComments.filter(comment => {
    switch (filterBy) {
      case 'experts':
        return comment.isExpert;
      case 'verified':
        return comment.author.verified;
      default: // all
        return true;
    }
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to={`/bills/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bill Details
        </Link>
        <h1 className="text-3xl font-bold mb-2">Community Discussion</h1>
        {billInfo && (
          <div>
            <p className="text-lg text-muted-foreground">{billInfo.title}</p>
            <Badge variant="outline" className="mt-2">{billInfo.billNumber}</Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Comments Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Comment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Join the Discussion</span>
              </CardTitle>
              <CardDescription>Share your thoughts and engage with the community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Share your thoughts on this bill..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Be respectful and constructive in your comments
                  </p>
                  <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters and Sorting */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Comments</SelectItem>
                    <SelectItem value="experts">Expert Only</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <ChevronDown className="h-4 w-4" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {filteredComments.length} comment{filteredComments.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Comments List */}
          <div className="space-y-6">
            {filteredComments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-6">
                  {/* Comment Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    <Avatar>
                      <AvatarImage src={comment.author.avatar} />
                      <AvatarFallback>
                        {comment.author.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{comment.author.name}</h4>
                        {comment.author.verified && (
                          <Badge variant="secondary" className="text-xs">Verified</Badge>
                        )}
                        {comment.isExpert && (
                          <Badge variant="default" className="text-xs">Expert</Badge>
                        )}
                      </div>
                      {comment.author.title && (
                        <p className="text-sm text-muted-foreground">{comment.author.title}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(comment.timestamp)}</p>
                    </div>
                  </div>

                  {/* Comment Content */}
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                  </div>

                  {/* Comment Actions */}
                  <div className="flex items-center space-x-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleLike(comment.id)}
                      className="text-muted-foreground hover:text-green-600"
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {comment.likes}
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      {comment.dislikes}
                    </Button>
                    
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </Button>
                    
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <Flag className="h-4 w-4 mr-1" />
                      Report
                    </Button>
                  </div>

                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="mt-6 pl-8 border-l-2 border-gray-100 space-y-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-2">
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {reply.author.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h5 className="font-medium text-sm">{reply.author.name}</h5>
                                {reply.author.verified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(reply.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{reply.content}</p>
                              <div className="flex items-center space-x-3 mt-2">
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground p-0 h-auto">
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  {reply.likes}
                                </Button>
                                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground p-0 h-auto">
                                  <Reply className="h-3 w-3 mr-1" />
                                  Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discussion Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Keep discussions respectful and constructive</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Focus on the bill's content and implications</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Cite sources when making factual claims</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p>Report inappropriate content</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{comments.length}</div>
                <div className="text-xs text-muted-foreground">Total Comments</div>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {comments.filter(c => c.isExpert).length}
                </div>
                <div className="text-xs text-muted-foreground">Expert Contributions</div>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {comments.reduce((sum, c) => sum + c.likes, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Likes</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

