/**
 * Comprehensive Copy System for Chanuka Platform
 *
 * Provides context-aware, user-level-appropriate messaging
 * with emotional resonance and clear value propositions
 */

export interface CopyContext {
  userLevel: 'novice' | 'intermediate' | 'expert';
  pageType: 'landing' | 'dashboard' | 'feature' | 'onboarding';
  emotionalTone: 'empowering' | 'informative' | 'urgent' | 'reassuring';
  contentComplexity: 'simple' | 'detailed' | 'technical';
}

export interface CopyVariant {
  headline: string;
  subheadline: string;
  description: string;
  cta: string;
  tooltip?: string;
  microcopy?: string;
}

class CopySystem {
  private static instance: CopySystem;

  public static getInstance(): CopySystem {
    if (!CopySystem.instance) {
      CopySystem.instance = new CopySystem();
    }
    return CopySystem.instance;
  }

  // Core Platform Messaging
  public readonly platformMission = {
    short:
      'Democracy requires informed citizens. We make information accessible, understandable, and actionable.',
    full: "Chanuka exists because democracy requires informed citizens, but information alone isn't enough. We make information accessible, understandable, and actionable—translating power into language and language into power.",
    tagline: 'Your voice in democracy, amplified by transparency',
  };

  // Feature-Specific Copy
  public readonly features = {
    billTracking: {
      novice: {
        headline: 'Never Miss Important Legislation',
        subheadline: 'Get notified when bills that matter to you are introduced or voted on',
        description:
          "Follow the bills that could impact your community, family, or interests. We'll send you updates in plain English, so you always know what's happening.",
        cta: 'Start Tracking Bills',
        tooltip:
          'Bill tracking helps you stay informed about legislation without having to constantly check for updates',
      },
      intermediate: {
        headline: 'Advanced Bill Monitoring & Analysis',
        subheadline: 'Track legislation with intelligent filtering and impact analysis',
        description:
          'Monitor bills across multiple policy areas with advanced filtering, voting pattern analysis, and community engagement metrics.',
        cta: 'Explore Advanced Tracking',
        tooltip:
          'Set up custom filters to track bills by sponsor, committee, policy area, or keywords',
      },
      expert: {
        headline: 'Comprehensive Legislative Intelligence',
        subheadline: 'Professional-grade bill tracking with constitutional analysis',
        description:
          'Full legislative monitoring with constitutional impact assessment, implementation workaround detection, and detailed voting analysis.',
        cta: 'Access Professional Tools',
        tooltip:
          'Includes API access, bulk data export, and advanced analytics for policy professionals',
      },
    },

    workaroundDetection: {
      novice: {
        headline: 'Spot Hidden Loopholes',
        subheadline: 'We help you identify when bills might not work as intended',
        description:
          'Sometimes laws have hidden ways around them. Our system flags potential loopholes so you can see the full picture.',
        cta: 'Learn About Loopholes',
        tooltip:
          'Workaround detection helps identify potential ways legislation might be circumvented',
      },
      intermediate: {
        headline: 'Implementation Workaround Analysis',
        subheadline: 'AI-powered detection of potential legislative bypass mechanisms',
        description:
          'Advanced analysis identifies potential implementation workarounds, regulatory gaps, and constitutional bypass tactics in proposed legislation.',
        cta: 'View Analysis Tools',
        tooltip: 'Uses pattern recognition to identify common legislative workaround strategies',
      },
      expert: {
        headline: 'Constitutional Bypass Detection System',
        subheadline: 'Professional-grade analysis of legislative implementation vulnerabilities',
        description:
          'Comprehensive constitutional analysis with machine learning-powered detection of implementation workarounds, regulatory capture risks, and enforcement gaps.',
        cta: 'Access Expert Analysis',
        tooltip: 'Includes detailed constitutional law analysis and precedent matching',
      },
    },

    communityEngagement: {
      novice: {
        headline: 'Join the Conversation',
        subheadline: 'Connect with others who care about the same issues',
        description:
          'Share your thoughts, ask questions, and learn from others in your community. Every voice matters in democracy.',
        cta: 'Join Community',
        tooltip: 'Community discussions help you understand different perspectives on legislation',
      },
      intermediate: {
        headline: 'Civic Engagement Network',
        subheadline: 'Participate in informed policy discussions with verified participants',
        description:
          'Engage in structured discussions with community members, policy experts, and civic leaders about legislation and its impacts.',
        cta: 'Start Engaging',
        tooltip: 'Verified participants ensure quality discussions with real civic stakeholders',
      },
      expert: {
        headline: 'Professional Policy Network',
        subheadline: 'Expert-level discourse with policy professionals and civic leaders',
        description:
          'Access to professional policy networks, expert verification system, and structured debate formats for serious civic engagement.',
        cta: 'Join Expert Network',
        tooltip: 'Includes access to policy professional networks and expert verification badges',
      },
    },
  };

  // Emotional Messaging for Key Moments
  public readonly emotionalMessaging = {
    firstBillSaved: {
      empowering:
        'You just took your first step toward informed citizenship. Every bill you track makes democracy a little more transparent.',
      informative:
        "Bill saved successfully. You'll receive notifications about updates to this legislation.",
      reassuring:
        "Great choice! We'll keep you updated on this bill's progress through the legislative process.",
    },

    firstComment: {
      empowering:
        'Your voice just joined thousands of others working toward better governance. Every comment contributes to the democratic process.',
      informative:
        'Comment posted successfully. Your input contributes to community understanding of this legislation.',
      reassuring:
        'Thank you for sharing your perspective. Community input helps everyone understand legislation better.',
    },

    workaroundDetected: {
      urgent:
        '⚠️ Potential Implementation Workaround Detected - This bill may have enforcement gaps that could limit its effectiveness.',
      informative:
        'Our analysis has identified potential implementation challenges with this legislation.',
      reassuring:
        "We've flagged some areas where this bill might face implementation challenges. This helps you understand the full picture.",
    },
  };

  // Progressive Disclosure Content
  public readonly progressiveDisclosure = {
    billAnalysis: {
      level1: 'This bill would change how [policy area] works in [jurisdiction]',
      level2: 'Key changes include: [specific provisions]. This could affect [stakeholder groups]',
      level3:
        'Detailed analysis: [constitutional implications], [implementation challenges], [enforcement mechanisms]',
    },

    votingRecords: {
      level1: 'See how your representatives voted on similar issues',
      level2:
        'Voting pattern analysis shows [representative] votes [alignment] with [constituency] interests',
      level3:
        'Comprehensive voting analysis including committee votes, amendments, and procedural votes',
    },
  };

  // Context-Aware Copy Generation
  public getCopy(feature: keyof typeof this.features, context: CopyContext): CopyVariant {
    const featureCopy = this.features[feature];
    if (!featureCopy) {
      throw new Error(`Feature ${feature} not found in copy system`);
    }

    const levelCopy = featureCopy[context.userLevel];
    if (!levelCopy) {
      throw new Error(`User level ${context.userLevel} not found for feature ${feature}`);
    }

    return levelCopy;
  }

  // Adaptive Messaging Based on User Journey
  public getAdaptiveCopy(baseText: string, context: CopyContext): string {
    // Adjust complexity based on user level
    if (context.userLevel === 'novice' && context.contentComplexity === 'technical') {
      return this.simplifyTechnicalLanguage(baseText);
    }

    // Add emotional resonance based on tone
    if (context.emotionalTone === 'empowering') {
      return this.addEmpoweringLanguage(baseText);
    }

    return baseText;
  }

  private simplifyTechnicalLanguage(text: string): string {
    const simplifications: Record<string, string> = {
      'constitutional analysis': 'checking if it follows the constitution',
      'implementation workaround': 'ways around the law',
      'regulatory capture': 'when industries influence their own rules',
      'legislative bypass': 'ways to avoid following the law',
      'policy implications': 'what this means for you',
      'stakeholder engagement': 'getting input from affected people',
      'constitutional compliance': 'following constitutional rules',
    };

    let simplified = text;
    Object.entries(simplifications).forEach(([technical, simple]) => {
      simplified = simplified.replace(new RegExp(technical, 'gi'), simple);
    });

    return simplified;
  }

  private addEmpoweringLanguage(text: string): string {
    const empoweringPrefixes = [
      'You have the power to',
      'Your voice can',
      'Together we can',
      "You're making a difference by",
    ];

    // Add empowering context where appropriate
    if (text.includes('track') || text.includes('monitor')) {
      return `${empoweringPrefixes[0]} ${text.toLowerCase()}`;
    }

    return text;
  }

  // Accessibility-Focused Copy
  public readonly accessibility = {
    screenReaderLabels: {
      billStatus: 'Bill status: {status}. Last updated {date}',
      urgencyLevel: 'Urgency level: {level} out of 5',
      votingRecord: 'Voting record for {representative}: {votes} votes analyzed',
      workaroundAlert: 'Alert: Potential implementation workaround detected in this bill',
    },

    plainLanguageAlternatives: {
      bicameral: 'both houses of legislature',
      quorum: 'minimum number of members needed to vote',
      filibuster: 'extended debate to delay voting',
      cloture: 'ending debate to force a vote',
      amendment: 'proposed change to the bill',
    },
  };

  // Confirmation Messages That Empower
  public readonly confirmations = {
    accountCreated:
      'You just made yourself harder to govern without your consent. Welcome to informed citizenship.',
    billShared:
      'You just extended the reach of civic knowledge. Every person who understands governance makes governance work differently.',
    commentPosted:
      'Your perspective just became part of the democratic record. Thank you for contributing to informed discourse.',
    expertVerified:
      "Your expertise is now part of our community's knowledge base. Thank you for strengthening democratic discourse.",
  };
}

export const copySystem = CopySystem.getInstance();
export default copySystem;
