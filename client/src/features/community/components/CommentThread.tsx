import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Reply, MoreVertical, Edit, Trash } from 'lucide-react';
import { useComments } from '../hooks/useCommunity';
import type { Comment, CreateCommentRequest } from '../types';

interface CommentThreadProps {
  billId?: string;
  comments: Comment[];
  onCommentUpdate?: () => void;
}

export function CommentThread({ billId, comments, onCommentUpdate }: CommentThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState('');

  const { createComment, updateComment, voteOnComment, deleteComment } = useComments(billId);

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    const request: CreateCommentRequest = {
      content: replyContent,
      billId,
      parentId,
    };

    try {
      await createComment.mutateAsync(request);
      setReplyContent('');
      setReplyingTo(null);
      onCommentUpdate?.();
    } catch (error) {
      console.error('Failed to reply:', error);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateComment.mutateAsync({
        commentId,
        request: { content: editContent }
      });
      setEditContent('');
      setEditingComment(null);
      onCommentUpdate?.();
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleVote = async (commentId: string, vote: 'up' | 'down' | null) => {
    try {
      await voteOnComment.mutateAsync({ commentId, vote });
      onCommentUpdate?.();
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment.mutateAsync(commentId);
      onCommentUpdate?.();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isReplying = replyingTo === comment.id;
    const isEditing = editingComment === comment.id;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''} mb-4`}>
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
                <AvatarFallback>
                  {comment.authorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                  {comment.isEdited && (
                    <Badge variant="outline" className="text-xs">Edited</Badge>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Edit your comment..."
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(comment.id)}
                        disabled={updateComment.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingComment(null);
                          setEditContent('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mb-2">{comment.content}</p>
                )}

                {/* Attachments */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {comment.attachments.map((attachment) => (
                      <Badge key={attachment.id} variant="secondary" className="text-xs">
                        📎 {attachment.filename}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {!isEditing && (
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(comment.id, comment.userVote === 'up' ? null : 'up')}
                        className={`h-6 px-2 ${comment.userVote === 'up' ? 'text-green-600' : ''}`}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        {comment.votes}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(comment.id, comment.userVote === 'down' ? null : 'down')}
                        className={`h-6 px-2 ${comment.userVote === 'down' ? 'text-red-600' : ''}`}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(comment.id)}
                      className="h-6 px-2"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>

                    {/* Owner actions */}
                    {comment.authorId === 'current-user-id' && (
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditContent(comment.content);
                          }}
                          className="h-6 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(comment.id)}
                          className="h-6 px-2 text-red-600 hover:text-red-700"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Reply form */}
                {isReplying && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        disabled={createComment.isPending}
                      >
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Render replies */}
        {comment.replies && comment.replies.map(reply => renderComment(reply, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {comments.map(comment => renderComment(comment))}
    </div>
  );
}