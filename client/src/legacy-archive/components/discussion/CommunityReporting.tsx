import { 
  Flag, 
  AlertTriangle, 
  Shield, 
  MessageSquare, 
  User,
  FileText,
  X,
  Send
} from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { cn } from '@client/lib/utils';
import { ModerationViolationType, CommentReport } from '@client/types/community';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';


interface CommunityReportingProps {
  commentId: string;
  commentContent: string;
  commentAuthor: string;
  onSubmitReport: (violationType: ModerationViolationType, reason: string, description?: string) => Promise<void>;
  className?: string;
}

/**
 * CommunityReporting - Component for reporting comments with clear violation categories
 * 
 * Features:
 * - Clear violation categories with descriptions
 * - Detailed reporting form with examples
 * - Community guidelines reference
 * - Transparent reporting process explanation
 */
export function CommunityReporting({
  commentId,
  commentContent,
  commentAuthor,
  onSubmitReport,
  className
}: CommunityReportingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<ModerationViolationType | null>(null);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Violation types with detailed information
  const violationTypes: Array<{
    type: ModerationViolationType;
    label: string;
    description: string;
    examples: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      type: 'spam',
      label: 'Spam or Unwanted Content',
      description: 'Repetitive, promotional, or irrelevant content that doesn\'t contribute to the discussion',
      examples: [
        'Repeated identical or similar comments',
        'Promotional content or advertisements',
        'Off-topic links or content',
        'Excessive self-promotion'
      ],
      severity: 'medium',
      icon: MessageSquare
    },
    {
      type: 'harassment',
      label: 'Harassment or Bullying',
      description: 'Targeted harassment, bullying, or intimidation of other users',
      examples: [
        'Personal attacks or insults',
        'Threats or intimidation',
        'Doxxing or sharing personal information',
        'Coordinated harassment campaigns'
      ],
      severity: 'critical',
      icon: AlertTriangle
    },
    {
      type: 'misinformation',
      label: 'Misinformation or False Claims',
      description: 'Deliberately false or misleading information about the bill or legislative process',
      examples: [
        'False claims about bill contents',
        'Misleading statistics or data',
        'Conspiracy theories without evidence',
        'Deliberate misrepresentation of facts'
      ],
      severity: 'high',
      icon: Shield
    },
    {
      type: 'off_topic',
      label: 'Off-Topic or Irrelevant',
      description: 'Content that doesn\'t relate to the bill or legislative discussion',
      examples: [
        'Unrelated political discussions',
        'Personal anecdotes without relevance',
        'General complaints not about the bill',
        'Discussions about other bills or topics'
      ],
      severity: 'low',
      icon: FileText
    },
    {
      type: 'inappropriate_language',
      label: 'Inappropriate Language',
      description: 'Profanity, hate speech, or language that violates community standards',
      examples: [
        'Excessive profanity or vulgar language',
        'Hate speech or discriminatory language',
        'Slurs or derogatory terms',
        'Sexually explicit content'
      ],
      severity: 'high',
      icon: AlertTriangle
    },
    {
      type: 'personal_attack',
      label: 'Personal Attack',
      description: 'Attacks on individuals rather than addressing their arguments or positions',
      examples: [
        'Ad hominem attacks on other users',
        'Attacks on politicians\' character vs. policies',
        'Name-calling or personal insults',
        'Questioning motives rather than arguments'
      ],
      severity: 'medium',
      icon: User
    },
    {
      type: 'duplicate_content',
      label: 'Duplicate Content',
      description: 'Identical or substantially similar content posted multiple times',
      examples: [
        'Copy-pasted comments',
        'Multiple identical responses',
        'Repeated posting of same links',
        'Automated or bot-like behavior'
      ],
      severity: 'low',
      icon: MessageSquare
    },
    {
      type: 'other',
      label: 'Other Violation',
      description: 'Other violations of community guidelines not covered above',
      examples: [
        'Impersonation of others',
        'Copyright violations',
        'Privacy violations',
        'Other community guideline violations'
      ],
      severity: 'medium',
      icon: Flag
    }
  ];

  // Handle violation selection
  const handleViolationSelect = useCallback((violationType: ModerationViolationType) => {
    setSelectedViolation(violationType);
    const violation = violationTypes.find(v => v.type === violationType);
    if (violation) {
      setReason(violation.label);
    }
  }, [violationTypes]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedViolation || !reason.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmitReport(selectedViolation, reason.trim(), description.trim() || undefined);
      
      // Reset form and close dialog
      setSelectedViolation(null);
      setReason('');
      setDescription('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to submit report:', error);
      // Error handling would be managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedViolation, reason, description, isSubmitting, onSubmitReport]);

  // Get severity styling
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("text-gray-500 hover:text-red-600", className)}>
          <Flag className="h-4 w-4 mr-1" />
          Report
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-600" />
            Report Comment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Comment Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Comment by {commentAuthor}:</span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-3">
              {commentContent}
            </p>
          </div>

          {/* Reporting Process Explanation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How Community Reporting Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Reports are reviewed by our moderation team within 24 hours</li>
              <li>• Multiple reports on the same content are consolidated</li>
              <li>• False or malicious reports may result in restrictions</li>
              <li>• You'll be notified of the outcome via your account notifications</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Violation Type Selection */}
            <div>
              <h4 className="font-medium mb-3">What type of violation is this?</h4>
              <div className="grid gap-3">
                {violationTypes.map((violation) => {
                  const IconComponent = violation.icon;
                  const isSelected = selectedViolation === violation.type;
                  
                  return (
                    <button
                      key={violation.type}
                      type="button"
                      onClick={() => handleViolationSelect(violation.type)}
                      className={cn(
                        "text-left p-4 border rounded-lg transition-all duration-200",
                        isSelected 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <IconComponent className="h-5 w-5 mt-0.5 text-gray-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{violation.label}</span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getSeverityColor(violation.severity))}
                            >
                              {violation.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {violation.description}
                          </p>
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Examples:</span>
                            <ul className="mt-1 space-y-0.5">
                              {violation.examples.slice(0, 2).map((example, index) => (
                                <li key={index}>• {example}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Details */}
            {selectedViolation && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reason for reporting (required)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief reason for this report"
                    className="chanuka-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide any additional context or details that would help moderators understand this report"
                    rows={3}
                    className="chanuka-textarea"
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={!selectedViolation || !reason.trim() || isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span>Submit Report</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}