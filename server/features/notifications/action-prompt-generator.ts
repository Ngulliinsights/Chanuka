import type { Bill } from '../bills/types/analysis';

export interface ActionPrompt {
  action: 'comment' | 'vote' | 'attend_hearing' | 'contact_mp' | 'share';
  title: string;
  description: string;
  deadline: Date | null;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedTimeMinutes: number;
  steps: Array<{
    step: number;
    instruction: string;
    link?: string;
    estimatedTime: number;
  }>;
  templates?: {
    email?: string;
    sms?: string;
    comment?: string;
  };
}

export class ActionPromptGenerator {
  /**
   * Generate action prompts for a bill based on its current status
   */
  generatePrompts(bill: Bill, userContext?: {
    county?: string;
    constituency?: string;
    hasCommented?: boolean;
    hasVoted?: boolean;
  }): ActionPrompt[] {
    const prompts: ActionPrompt[] = [];

    // Comment prompt (if public comment period is open)
    if (this.isCommentPeriodOpen(bill) && !userContext?.hasCommented) {
      prompts.push(this.generateCommentPrompt(bill));
    }

    // Vote prompt (if voting is open)
    if (this.isVotingOpen(bill) && !userContext?.hasVoted) {
      prompts.push(this.generateVotePrompt(bill));
    }

    // Hearing attendance prompt
    if (this.hasUpcomingHearing(bill)) {
      prompts.push(this.generateHearingPrompt(bill));
    }

    // Contact MP prompt (always available)
    if (userContext?.constituency) {
      prompts.push(this.generateContactMPPrompt(bill, userContext.constituency));
    }

    // Share prompt (always available)
    prompts.push(this.generateSharePrompt(bill));

    return prompts;
  }

  private isCommentPeriodOpen(bill: Bill): boolean {
    // Check if bill is in committee stage and comment deadline hasn't passed
    return bill.status === 'in_committee' && 
           bill.public_comment_deadline ? 
           new Date(bill.public_comment_deadline) > new Date() : 
           false;
  }

  private isVotingOpen(bill: Bill): boolean {
    // Check if bill is in voting stage
    return bill.status === 'second_reading' || bill.status === 'third_reading';
  }

  private hasUpcomingHearing(bill: Bill): boolean {
    // Check if there's an upcoming committee hearing
    return bill.next_hearing_date ? new Date(bill.next_hearing_date) > new Date() : false;
  }

  private generateCommentPrompt(bill: Bill): ActionPrompt {
    const deadline = bill.public_comment_deadline ? new Date(bill.public_comment_deadline) : null;
    const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return {
      action: 'comment',
      title: 'Submit Your Comment',
      description: `Public comment period ${daysLeft ? `closes in ${daysLeft} days` : 'is open'}. Your voice matters!`,
      deadline,
      urgency: daysLeft && daysLeft <= 3 ? 'critical' : daysLeft && daysLeft <= 7 ? 'high' : 'medium',
      estimatedTimeMinutes: 10,
      steps: [
        {
          step: 1,
          instruction: 'Read the bill summary and key provisions',
          link: `/bills/${bill.id}`,
          estimatedTime: 5,
        },
        {
          step: 2,
          instruction: 'Review existing comments to see what others are saying',
          link: `/bills/${bill.id}#comments`,
          estimatedTime: 3,
        },
        {
          step: 3,
          instruction: 'Write your comment (be specific and constructive)',
          link: `/bills/${bill.id}#submit-comment`,
          estimatedTime: 5,
        },
        {
          step: 4,
          instruction: 'Submit your comment to the parliamentary committee',
          estimatedTime: 1,
        },
      ],
      templates: {
        comment: this.generateCommentTemplate(bill),
      },
    };
  }

  private generateVotePrompt(bill: Bill): ActionPrompt {
    return {
      action: 'vote',
      title: 'Cast Your Vote',
      description: 'Show your position on this bill. Your vote will be aggregated with others from your constituency.',
      deadline: null,
      urgency: 'medium',
      estimatedTimeMinutes: 3,
      steps: [
        {
          step: 1,
          instruction: 'Review the bill summary',
          link: `/bills/${bill.id}`,
          estimatedTime: 2,
        },
        {
          step: 2,
          instruction: 'Choose your position: Support, Oppose, or Abstain',
          link: `/bills/${bill.id}#vote`,
          estimatedTime: 1,
        },
        {
          step: 3,
          instruction: 'Optionally, explain your reasoning',
          estimatedTime: 2,
        },
      ],
    };
  }

  private generateHearingPrompt(bill: Bill): ActionPrompt {
    const hearingDate = bill.next_hearing_date ? new Date(bill.next_hearing_date) : null;

    return {
      action: 'attend_hearing',
      title: 'Attend Committee Hearing',
      description: `Public hearing scheduled for ${hearingDate?.toLocaleDateString('en-KE', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      deadline: hearingDate,
      urgency: 'medium',
      estimatedTimeMinutes: 120,
      steps: [
        {
          step: 1,
          instruction: 'Register to attend (if required)',
          link: bill.hearing_registration_link,
          estimatedTime: 5,
        },
        {
          step: 2,
          instruction: 'Prepare your statement or questions',
          estimatedTime: 30,
        },
        {
          step: 3,
          instruction: 'Attend the hearing at Parliament Buildings',
          estimatedTime: 120,
        },
      ],
    };
  }

  private generateContactMPPrompt(bill: Bill, constituency: string): ActionPrompt {
    return {
      action: 'contact_mp',
      title: 'Contact Your MP',
      description: `Let your MP know your position on this bill. They represent ${constituency}.`,
      deadline: null,
      urgency: 'low',
      estimatedTimeMinutes: 5,
      steps: [
        {
          step: 1,
          instruction: 'Find your MP\'s contact information',
          link: `/mps/${constituency}`,
          estimatedTime: 1,
        },
        {
          step: 2,
          instruction: 'Choose your contact method (email, phone, or office visit)',
          estimatedTime: 1,
        },
        {
          step: 3,
          instruction: 'Send your message using the template below',
          estimatedTime: 3,
        },
      ],
      templates: {
        email: this.generateMPEmailTemplate(bill, constituency),
        sms: this.generateMPSMSTemplate(bill),
      },
    };
  }

  private generateSharePrompt(bill: Bill): ActionPrompt {
    return {
      action: 'share',
      title: 'Share This Bill',
      description: 'Help others in your community understand this legislation.',
      deadline: null,
      urgency: 'low',
      estimatedTimeMinutes: 1,
      steps: [
        {
          step: 1,
          instruction: 'Choose your sharing platform',
          estimatedTime: 1,
        },
        {
          step: 2,
          instruction: 'Add your own commentary (optional)',
          estimatedTime: 2,
        },
      ],
    };
  }

  private generateCommentTemplate(bill: Bill): string {
    return `Dear Committee Members,

I am writing to comment on ${bill.title}.

[State your position: I support/oppose this bill because...]

[Provide specific reasons and evidence]

[Suggest amendments or alternatives if applicable]

Thank you for considering citizen input.

Sincerely,
[Your Name]
[Your County/Constituency]`;
  }

  private generateMPEmailTemplate(bill: Bill, constituency: string): string {
    return `Subject: Constituent Input on ${bill.title}

Dear Honourable Member,

I am your constituent from ${constituency}, and I am writing to share my views on ${bill.title}.

[State your position and reasoning]

I urge you to [support/oppose/amend] this bill when it comes to a vote.

Thank you for representing our interests in Parliament.

Sincerely,
[Your Name]
[Your Contact Information]`;
  }

  private generateMPSMSTemplate(bill: Bill): string {
    return `Hon. MP, I am your constituent. I [support/oppose] ${bill.title.substring(0, 50)}... Please vote accordingly. [Your Name]`;
  }

  /**
   * Calculate urgency level based on deadline
   */
  calculateUrgency(deadline: Date | null): 'low' | 'medium' | 'high' | 'critical' {
    if (!deadline) return 'low';

    const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 1) return 'critical';
    if (daysLeft <= 3) return 'high';
    if (daysLeft <= 7) return 'medium';
    return 'low';
  }

  /**
   * Format deadline for display
   */
  formatDeadline(deadline: Date | null): string {
    if (!deadline) return 'No deadline';

    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const hours = Math.ceil(diff / (1000 * 60 * 60));

    if (days < 1) {
      if (hours < 1) return 'Less than 1 hour left';
      return `${hours} hour${hours > 1 ? 's' : ''} left`;
    }

    if (days === 1) return 'Tomorrow';
    if (days <= 7) return `${days} days left`;

    return deadline.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export const actionPromptGenerator = new ActionPromptGenerator();
