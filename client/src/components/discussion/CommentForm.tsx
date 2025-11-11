import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Send, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { CommentFormData, CommentValidation } from '../../types/discussion';

interface CommentFormProps {
  billId: number;
  parentId?: string;
  placeholder?: string;
  initialContent?: string;
  isEditing?: boolean;
  onSubmit: (data: CommentFormData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
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
 * - Draft saving (future enhancement)
 */
export function CommentForm({
  billId,
  parentId,
  placeholder = "Share your thoughts on this bill...",
  initialContent = "",
  isEditing = false,
  onSubmit,
  onCancel,
  className,
  autoFocus = false
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Validation state
  const validation = useMemo((): CommentValidation => {
    const errors: CommentValidation['errors'] = {};
    const warnings: CommentValidation['warnings'] = {};

    // Content validation
    if (content.trim().length === 0) {
      errors.content = "Comment cannot be empty";
    } else if (content.trim().length < 10) {
      errors.length = "Comment is too short (minimum 10 characters)";
    } else if (content.trim().length < 50) {
      warnings.quality = "Consider adding more detail for a higher quality comment";
    }

    if (content.length > 2000) {
      errors.length = "Comment is too long (maximum 2000 characters)";
    }

    // Basic quality checks
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < 5 && content.trim().length > 0) {
      warnings.quality = "Very short comments may not contribute meaningfully to the discussion";
    }

    // Check for potential spam patterns
    const hasRepeatedChars = /(.)\1{4,}/.test(content);
    const hasExcessiveCaps = content.length > 20 && (content.match(/[A-Z]/g) || []).length / content.length > 0.5;
    
    if (hasRepeatedChars || hasExcessiveCaps) {
      warnings.tone = "Please use normal formatting for better readability";
    }

    return {
      isValid: Object.keys(errors).length === 0 && content.trim().length >= 10,
      errors,
      warnings
    };
  }, [content]);

  // Character count with color coding
  const characterCount = content.length;
  const getCharacterCountColor = () => {
    if (characterCount === 0) return 'text-gray-400';
    if (characterCount < 50) return 'text-amber-500';
    if (characterCount < 100) return 'text-blue-500';
    if (characterCount > 1800) return 'text-red-500';
    return 'text-green-600';
  };

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        content: content.trim(),
        parentId,
        billId
      });
      
      // Clear form after successful submission (unless editing)
      if (!isEditing) {
        setContent('');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      // Error handling would be managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  }, [validation.isValid, isSubmitting, content, parentId, billId, onSubmit, isEditing]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as any);
    }
    
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }, [handleSubmit, onCancel]);

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  // Quality indicator component
  const QualityIndicator = () => {
    if (content.trim().length === 0) return null;

    const getQualityLevel = () => {
      if (content.trim().length < 50) return { level: 'low', color: 'amber', label: 'Basic' };
      if (content.trim().length < 100) return { level: 'medium', color: 'blue', label: 'Good' };
      if (content.trim().length < 200) return { level: 'high', color: 'green', label: 'Detailed' };
      return { level: 'excellent', color: 'green', label: 'Comprehensive' };
    };

    const quality = getQualityLevel();
    
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            quality.color === 'amber' && "border-amber-200 text-amber-700",
            quality.color === 'blue' && "border-blue-200 text-blue-700",
            quality.color === 'green' && "border-green-200 text-green-700"
          )}
        >
          Quality: {quality.label}
        </Badge>
      </div>
    );
  };

  return (
    <div className={cn("chanuka-card", className)}>
      <div className="chanuka-card-content">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Form Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              {isEditing ? 'Edit Comment' : parentId ? 'Reply to Comment' : 'Add Comment'}
            </h4>
            
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={cn(
                "chanuka-textarea min-h-[80px] resize-none transition-all duration-200",
                validation.errors.content && "border-red-300 focus:border-red-500",
                validation.isValid && content.length > 0 && "border-green-300 focus:border-green-500"
              )}
              disabled={isSubmitting}
            />

            {/* Character Count and Quality Indicator */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <QualityIndicator />
                
                {/* Guidelines Link */}
                <button
                  type="button"
                  onClick={() => setShowGuidelines(!showGuidelines)}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Community Guidelines
                </button>
              </div>
              
              <span className={getCharacterCountColor()}>
                {characterCount}/2000
                {characterCount >= 50 && (
                  <CheckCircle className="inline h-3 w-3 ml-1 text-green-500" />
                )}
              </span>
            </div>
          </div>

          {/* Validation Messages */}
          {(Object.keys(validation.errors).length > 0 || Object.keys(validation.warnings).length > 0) && (
            <div className="space-y-2">
              {/* Errors */}
              {Object.entries(validation.errors).map(([key, message]) => (
                <div key={key} className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{message}</span>
                </div>
              ))}
              
              {/* Warnings */}
              {Object.entries(validation.warnings).map(([key, message]) => (
                <div key={key} className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Community Guidelines */}
          {showGuidelines && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <h5 className="font-medium text-blue-900 mb-2">Community Guidelines</h5>
              <ul className="space-y-1 text-blue-800">
                <li>• Be respectful and constructive in your comments</li>
                <li>• Focus on the bill's content and implications</li>
                <li>• Provide evidence or sources when making claims</li>
                <li>• Avoid personal attacks or inflammatory language</li>
                <li>• Stay on topic and contribute meaningfully to the discussion</li>
              </ul>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">
              Press Ctrl+Enter to submit quickly
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              
              <Button
                type="submit"
                size="sm"
                disabled={!validation.isValid || isSubmitting}
                className="chanuka-btn chanuka-btn-primary"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Posting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span>{isEditing ? 'Update' : 'Post'} Comment</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}