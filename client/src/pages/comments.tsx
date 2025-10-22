import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '..\components\ui\card';
import { Button } from '..\components\ui\button';
import { Badge } from '..\components\ui\badge';
import { Textarea } from '..\components\ui\textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '..\components\ui\select';
import { ArrowLeft, MessageSquare, User, Clock, Filter } from 'lucide-react';
import { logger } from '..\utils\browser-logger';

interface Comment {
  id: string;
  content: string;
  author: string;
  expertise: string;
  createdAt: string;
  section?: string;
  isExpert: boolean;
}

export default function CommentsPage() {
  const { id: billId } = useParams<{ id: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newExpertise, setNewExpertise] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterExpert, setFilterExpert] = useState('all');
  const [billSection, setBillSection] = useState('');

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/community/comments/${billId}?sort=${sortBy}&expert=${filterExpert}&section=${billSection || ''}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      logger.error('Failed to fetch comments:', { component: 'Chanuka' }, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/community/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          expertise: newExpertise,
          billId: billId?.toString(),
          section: billSection,
        }),
      });

      if (response.ok) {
        setNewComment('');
        setNewExpertise('');
        fetchComments();
      }
    } catch (error) {
      logger.error('Failed to submit comment:', { component: 'Chanuka' }, error);
    }
  };

  useEffect(() => {
    if (billId) {
      fetchComments();
    }
  }, [billId, sortBy, filterExpert, billSection]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/bills/${billId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Bill Details
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Community Comments
        </h1>
        <p className="text-muted-foreground">
          Share your insights and read expert analysis on this legislation
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="expert">Expert Comments First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Expertise</label>
              <Select value={filterExpert} onValueChange={setFilterExpert}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Comments</SelectItem>
                  <SelectItem value="expert">Expert Only</SelectItem>
                  <SelectItem value="citizen">Citizen Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Bill Section</label>
              <Select value={billSection} onValueChange={setBillSection}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sections</SelectItem>
                  <SelectItem value="1">Section 1</SelectItem>
                  <SelectItem value="2">Section 2</SelectItem>
                  <SelectItem value="3">Section 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Comment */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Your Comment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Share your thoughts on this bill..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
          />
          <div className="flex gap-4">
            <Select value={newExpertise} onValueChange={setNewExpertise}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Your expertise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="legal">Legal Expert</SelectItem>
                <SelectItem value="policy">Policy Analyst</SelectItem>
                <SelectItem value="citizen">Concerned Citizen</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="industry">Industry Professional</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
              Post Comment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Comments Yet</h3>
              <p className="text-muted-foreground">Be the first to share your thoughts on this bill.</p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{comment.author}</span>
                      {comment.isExpert && (
                        <Badge variant="secondary">Expert</Badge>
                      )}
                      {comment.expertise && (
                        <Badge variant="outline">{comment.expertise}</Badge>
                      )}
                      {comment.section && (
                        <Badge variant="outline">Section {comment.section}</Badge>
                      )}
                    </div>
                    <p className="text-gray-700 mb-3">{comment.content}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}