/**
 * Shared types for action prompts
 */

export interface ActionStep {
  step: number;
  instruction: string;
  link?: string;
  estimatedTime: number;
}

export interface ActionPrompt {
  action: 'comment' | 'vote' | 'attend_hearing' | 'contact_mp' | 'share';
  title: string;
  description: string;
  deadline: Date | string | null;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedTimeMinutes: number;
  steps: ActionStep[];
  templates?: {
    email?: string;
    sms?: string;
    comment?: string;
  };
}
