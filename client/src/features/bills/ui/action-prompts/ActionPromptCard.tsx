import React, { useState } from 'react';
import type { ActionPrompt, ActionStep } from '@shared/types/bills/action-prompts.types';

interface ActionPromptCardProps {
  prompt: ActionPrompt;
  onActionComplete?: () => void;
}

export function ActionPromptCard({ prompt, onActionComplete }: ActionPromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showTemplate, setShowTemplate] = useState(false);

  const getUrgencyStyles = () => {
    switch (prompt.urgency) {
      case 'critical':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'high':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      default:
        return 'bg-blue-50 border-blue-300 text-blue-900';
    }
  };

  const getActionIcon = () => {
    switch (prompt.action) {
      case 'comment': return '💬';
      case 'vote': return '🗳️';
      case 'attend_hearing': return '🏛️';
      case 'contact_mp': return '📧';
      case 'share': return '📤';
      default: return '📋';
    }
  };

  const getDeadlineText = () => {
    if (!prompt.deadline) return null;

    const deadline = typeof prompt.deadline === 'string' ? new Date(prompt.deadline) : prompt.deadline;
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const hours = Math.ceil(diff / (1000 * 60 * 60));

    if (days < 1) {
      if (hours < 1) return '⏰ Less than 1 hour left!';
      return `⏰ ${hours} hour${hours > 1 ? 's' : ''} left`;
    }

    if (days === 1) return '⏰ Deadline: Tomorrow';
    if (days <= 7) return `⏰ ${days} days left`;

    return `📅 ${deadline.toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
    })}`;
  };

  const toggleStep = (stepNumber: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepNumber)) {
      newCompleted.delete(stepNumber);
    } else {
      newCompleted.add(stepNumber);
    }
    setCompletedSteps(newCompleted);

    // If all steps completed, trigger callback
    if (newCompleted.size === prompt.steps.length && onActionComplete) {
      onActionComplete();
    }
  };

  const progress = (completedSteps.size / prompt.steps.length) * 100;

  return (
    <div className={`rounded-lg border-2 ${getUrgencyStyles()} overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-2xl">{getActionIcon()}</span>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{prompt.title}</h3>
              <p className="text-sm opacity-90 mt-1">{prompt.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                {getDeadlineText() && (
                  <span className="font-medium">{getDeadlineText()}</span>
                )}
                <span className="opacity-75">
                  ⏱️ {prompt.estimatedTimeMinutes} min
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-100 rounded transition-all"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {/* Progress Bar */}
        {completedSteps.size > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="opacity-75">Progress</span>
              <span className="font-medium">{completedSteps.size}/{prompt.steps.length} steps</span>
            </div>
            <div className="h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white bg-opacity-70 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-current border-opacity-20 bg-white bg-opacity-30 p-4 space-y-4">
          {/* Steps */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Steps to Complete:</h4>
            {prompt.steps.map((step) => (
              <div
                key={step.step}
                className="flex items-start gap-3 p-3 bg-white bg-opacity-50 rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={completedSteps.has(step.step)}
                  onChange={() => toggleStep(step.step)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div className="flex-1">
                  <p className={`text-sm ${completedSteps.has(step.step) ? 'line-through opacity-60' : ''}`}>
                    <span className="font-medium">Step {step.step}:</span> {step.instruction}
                  </p>
                  {step.link && (
                    <a
                      href={step.link}
                      className="text-xs underline opacity-75 hover:opacity-100 mt-1 inline-block"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Go to step →
                    </a>
                  )}
                </div>
                <span className="text-xs opacity-60 whitespace-nowrap">
                  {step.estimatedTime} min
                </span>
              </div>
            ))}
          </div>

          {/* Templates */}
          {prompt.templates && (
            <div>
              <button
                onClick={() => setShowTemplate(!showTemplate)}
                className="text-sm font-medium underline hover:no-underline"
              >
                {showTemplate ? 'Hide' : 'Show'} Template
              </button>
              {showTemplate && (
                <div className="mt-2 p-3 bg-white rounded-lg">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {prompt.templates.comment || prompt.templates.email || prompt.templates.sms}
                  </pre>
                  <button
                    onClick={() => {
                      const text = prompt.templates?.comment || prompt.templates?.email || prompt.templates?.sms || '';
                      navigator.clipboard.writeText(text);
                    }}
                    className="mt-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs transition-colors"
                  >
                    Copy Template
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => {
              // Navigate to action
              const firstStep = prompt.steps[0];
              if (firstStep?.link) {
                window.location.href = firstStep.link;
              }
            }}
            className="w-full px-4 py-3 bg-white hover:bg-opacity-90 rounded-lg font-medium transition-colors"
          >
            Start Action →
          </button>
        </div>
      )}
    </div>
  );
}
