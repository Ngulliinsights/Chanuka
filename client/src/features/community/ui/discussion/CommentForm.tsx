import { Send, AlertCircle, CheckCircle, X, MessageSquare, Eye, EyeOff } from 'lucide-react';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { cn } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { Alert, AlertDescription } from '@client/shared/design-system';
import { Separator } from '@client/shared/design-system';

interface CommentFormData {
  content: string;
  parentId?: string;
  isAnonymous?: boolean;
  billId?: string;
}

interface CommentValidation {
  isValid: boolean;
  errors: {
    content?: string;
    length?: string;
    quality?: string;
  };
  warnings: string[];
  score: number;
}

interface CommentFormProps {
  billId?: string;
  parentId?: string;
  placeholder?: string;
  initialContent?: string;
  isEditing?: boolean;
  onSubmit: (data: CommentFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
  allowAnonymous?: boolean;
  showGuidelines?: boolean;
}

/**
 * CommentForm - Form for creating and editing comments with quality validation
 *
 * Features:
 * - Real-time character count and validation
 * - Quality assessment (50+ character minimum)
 * - Content guidelines and warnings
 * - Auto-resize textarea
 * - Keyboard shortcuts (Ctrl+Enter to submit)
 * - Anonymous posting option
 */
export function CommentForm({
  billId,
  parentId,
  placeholder = 'Share your thoughts on this bill...',
  initialContent = '',
  isEditing = false,
  onSubmit,
  onCancel,
  className,
  autoFocus = false,
  allowAnonymous = true,
  showGuidelines = true,
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showGuidelinesPanel, setShowGuidelinesPanel] = useState(false);

  // Validation state
  const validation = useMemo((): CommentValidation => {
    const errors: CommentValidation['errors'] = {};
    const warnings: string[] = [];
    let score = 0;

    // Content validation
    if (!content.trim()) {
      errors.content = 'Comment cannot be empty';
    } else if (content.trim().length < 10) {
      errors.length = 'Comment must be at least 10 characters';
    } else if (content.trim().length < 50) {
      warnings.push('Consider adding more detail to improve comment quality');
      score = 60;
    } else {
      score = 85;
    }

    // Quality checks
    if (content.trim().length > 50) {
      if (content.includes('?')) score += 5; // Questions encourage discussion
      if (content.match(/\b(because|however|therefore|although)\b/i)) score += 5; // Reasoning
      if (content.match(/\b(source|study|research|data)\b/i)) score += 10; // Evidence-based
    }

    // Content warnings
    if (content.match(/\b(stupid|dumb|idiot)\b/i)) {
      warnings.push('Consider using more constructive language');
      score -= 20;
    }

    if (content.toUpperCase() === content && content.length > 20) {
      warnings.push('Avoid using all caps - it can appear aggressive');
      score -= 10;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, score)),
    };
  }, [content]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validation.isValid || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await onSubmit({
          content: content.trim(),
          parentId,
          isAnonymous,
          billId,
        });

        // Reset form after successful submission
        if (!isEditing) {
          setContent('');
          setIsAnonymous(false);
        }
      } catch (error) {
        console.error('Failed to submit comment:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [content, parentId, isAnonymous, billId, validation.isValid, isSubmitting, onSubmit, isEditing]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as any);
      }
    },
    [handleSubmit]
  );

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'High Quality';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {isEditing ? 'Edit Comment' : parentId ? 'Reply to Comment' : 'Add Comment'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main textarea */}
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={cn(
                'w-full min-h-[120px] p-3 border rounded-md resize-none',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'placeholder:text-muted-foreground',
                validation.errors.content || validation.errors.length ? 'border-red-300' : ''
              )}
              disabled={isSubmitting}
            />

            {/* Character count and quality indicator */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'text-muted-foreground',
                    content.length > 1000 ? 'text-red-600' : ''
                  )}
                >
                  {content.length}/1000 characters
                </span>

                {content.length >= 10 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Quality:</span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getQualityColor(validation.score))}
                    >
                      {getQualityLabel(validation.score)} ({validation.score}%)
                    </Badge>
                  </div>
                )}
              </div>

              {showGuidelines && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGuidelinesPanel(!showGuidelinesPanel)}
                >
                  {showGuidelinesPanel ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Guidelines
                </Button>
              )}
            </div>
          </div>

          {/* Validation errors */}
          {(validation.errors.content || validation.errors.length) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validation.errors.content || validation.errors.length}
              </AlertDescription>
            </Alert>
          )}

          {/* Validation warnings */}
          {validation.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <div key={index}>• {warning}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Guidelines panel */}
          {showGuidelinesPanel && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 text-blue-800">Comment Guidelines</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Be respectful and constructive in your comments</li>
                  <li>• Focus on the legislation and its implications</li>
                  <li>• Provide evidence or reasoning for your opinions</li>
                  <li>• Avoid personal attacks or inflammatory language</li>
                  <li>• Ask questions to encourage thoughtful discussion</li>
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {allowAnonymous && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={e => setIsAnonymous(e.target.checked)}
                    disabled={isSubmitting}
                    className="rounded"
                  />
                  Post anonymously
                </label>
              )}

              <div className="text-xs text-muted-foreground">Ctrl+Enter to submit</div>
            </div>
          </div>

          <Separator />

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {validation.isValid && (
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Ready to post
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                disabled={!validation.isValid || isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  'Posting...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update' : 'Post'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default CommentForm;
