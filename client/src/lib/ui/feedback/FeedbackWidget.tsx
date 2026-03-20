import React, { useState } from 'react';
import { MessageCircle, X, Send, ThumbsUp, ThumbsDown, Bug, Lightbulb } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { useToast } from '@client/lib/hooks/use-toast';
import { logger } from '@client/lib/utils/logger';

interface FeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

type FeedbackType = 'positive' | 'negative' | 'bug' | 'feature' | null;

/**
 * Feedback Widget Component
 * 
 * Floating widget that allows users to provide feedback, report bugs,
 * or suggest features from anywhere in the application.
 * 
 * Features:
 * - Quick feedback (thumbs up/down)
 * - Bug reports
 * - Feature requests
 * - Context-aware (captures current page)
 * - Accessible keyboard navigation
 */
export function FeedbackWidget({
  position = 'bottom-right',
  className = '',
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const handleOpen = () => {
    setIsOpen(true);
    logger.info('Feedback widget opened', {
      component: 'FeedbackWidget',
      page: window.location.pathname,
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setFeedbackType(null);
    setMessage('');
    setEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackType || !message.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please select a feedback type and provide a message.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Collect context
      const context = {
        type: feedbackType,
        message: message.trim(),
        email: email.trim() || null,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timestamp: new Date().toISOString(),
      };

      // Log feedback (in production, send to backend API)
      logger.info('Feedback submitted', {
        component: 'FeedbackWidget',
        ...context,
      });

      // TODO: Send to backend API
      // await fetch('/api/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(context),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Thank you for your feedback!',
        description: 'We appreciate your input and will review it soon.',
      });

      handleClose();
    } catch (error) {
      logger.error('Failed to submit feedback', { component: 'FeedbackWidget' }, error);
      toast({
        title: 'Submission failed',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedbackTypes = [
    {
      id: 'positive' as const,
      label: 'Positive',
      icon: <ThumbsUp className="h-5 w-5" />,
      color: 'text-green-600 bg-green-50 hover:bg-green-100',
      description: 'Something worked well',
    },
    {
      id: 'negative' as const,
      label: 'Negative',
      icon: <ThumbsDown className="h-5 w-5" />,
      color: 'text-red-600 bg-red-50 hover:bg-red-100',
      description: 'Something needs improvement',
    },
    {
      id: 'bug' as const,
      label: 'Bug Report',
      icon: <Bug className="h-5 w-5" />,
      color: 'text-orange-600 bg-orange-50 hover:bg-orange-100',
      description: 'Report a technical issue',
    },
    {
      id: 'feature' as const,
      label: 'Feature Request',
      icon: <Lightbulb className="h-5 w-5" />,
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
      description: 'Suggest a new feature',
    },
  ];

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed ${positionClasses[position]} ${className} z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
          aria-label="Open feedback widget"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Feedback Panel */}
      {isOpen && (
        <div
          className={`fixed ${positionClasses[position]} ${className} z-50 w-96 max-w-[calc(100vw-2rem)]`}
        >
          <Card className="shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Share Your Feedback</CardTitle>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close feedback widget"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Feedback Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What would you like to share?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {feedbackTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFeedbackType(type.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          feedbackType === type.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${type.color}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {type.icon}
                          <span className="text-xs font-medium">{type.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {feedbackType && (
                    <p className="text-xs text-gray-500 mt-2">
                      {feedbackTypes.find((t) => t.id === feedbackType)?.description}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="feedback-message"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Your message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us more about your experience..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {message.length}/500 characters
                  </p>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label
                    htmlFor="feedback-email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email (optional)
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll only use this to follow up on your feedback
                  </p>
                </div>

                {/* Context Badge */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Badge variant="secondary" className="text-xs">
                    Page: {window.location.pathname}
                  </Badge>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2"
                  disabled={isSubmitting || !feedbackType || !message.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </form>

              {/* Privacy Note */}
              <p className="text-xs text-gray-500 mt-4 text-center">
                Your feedback helps us improve. We respect your privacy.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
