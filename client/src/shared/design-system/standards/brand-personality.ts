/**
 * Brand Personality & Voice Guidelines
 * ===================================
 *
 * Personality traits for Chanuka: Transparent, Optimistic, Pragmatic
 * Tone: "Knowledgeable Friend"
 * Mission: Democratic participation through informed legislation
 */

export const BrandPersonality = {
  archetype: 'Knowledgeable Friend',
  traits: ['Transparent', 'Optimistic', 'Pragmatic', 'Helpful', 'Trustworthy'],
  mission: 'Empower citizens to understand and participate in the legislative process',
  values: {
    transparency: 'Always explain why, not just what',
    optimism: 'Encourage participation despite complexity',
    pragmatism: 'Realistic about challenges, solutions-focused',
    inclusivity: 'Speak to diverse audiences and education levels',
    accuracy: 'Verify information, acknowledge uncertainty',
  },
};

/**
 * Tone Matrix: Personality across contexts
 * How brand voice changes based on user situation
 */
export const ToneMatrix = {
  /**
   * Happy Path: User succeeding at task
   */
  success: {
    emotion: 'Encouraging',
    language: 'Affirming, positive',
    examples: {
      title: 'You found the bill!',
      body: "Here's what's being proposed—and how it might affect you.",
      cta: 'Explore the details',
      tone: 'Warm, celebratory, forward-looking',
    },
    DON_T: 'Over-the-top enthusiasm, patronizing',
  },

  /**
   * Error State: Something went wrong
   */
  error: {
    emotion: 'Empathetic',
    language: 'Clear, actionable, reassuring',
    examples: {
      title: "We couldn't find that bill",
      body: "This might happen if the bill number changed or it's from a previous session. Try searching for related bills or the sponsor's name.",
      cta: 'Try a different search',
      tone: 'Problem-solving, helpful, not blaming',
    },
    DON_T: 'Technical jargon, apologetic excess, dismissive',
  },

  /**
   * Confusion: User doesn't understand
   */
  educational: {
    emotion: 'Patient',
    language: 'Explanatory, breaking down complexity',
    examples: {
      title: 'What does "co-sponsor" mean?',
      body: 'A co-sponsor is a legislator who supports the bill. Multiple sponsors show broader support. The main sponsor introduced the bill; co-sponsors joined them.',
      cta: 'Learn about other bill terms',
      tone: 'Expert but accessible, no condescension',
    },
    DON_T: 'Oversimplification, jargon, talking down',
  },

  /**
   * Alert: Important information
   */
  alert: {
    emotion: 'Attentive',
    language: 'Direct, prioritized, factual',
    examples: {
      title: 'Bill vote scheduled for tomorrow',
      body: 'This bill is moving faster than most. If you want to contact your representative, now is the time.',
      cta: 'Find your representative',
      tone: 'Urgent but not alarming, action-oriented',
    },
    DON_T: 'Sensationalism, fear-mongering, manipulation',
  },

  /**
   * Empty State: No results
   */
  empty: {
    emotion: 'Encouraging',
    language: 'Constructive, re-directing',
    examples: {
      title: 'No bills match your search',
      body: "This doesn't mean there's nothing relevant. Try broader terms, or browse bills by topic.",
      cta: 'Browse all bills',
      tone: 'Helpful, solution-focused',
    },
    DON_T: 'Dismissive, overly apologetic',
  },

  /**
   * Complex Information: Dense content
   */
  complexity: {
    emotion: 'Confident',
    language: 'Breaking into digestible pieces, visual hierarchy',
    examples: {
      title: "Here's what this bill changes",
      body: 'First: What it affects | Second: How it affects it | Third: Who benefits',
      cta: 'Read the full text',
      tone: 'Guide-like, "I\'ve got this—let me explain"',
    },
    DON_T: 'Information dump, assuming prior knowledge',
  },
};

/**
 * Voice Consistency Rules
 */
export const VoiceConsistency = {
  /**
   * Person & Perspective
   */
  perspective: {
    userFacing: 'Second person ("You") to feel personal',
    contentDescriptions: 'Active voice when possible ("Sponsors support..." not "is supported by")',
    error: 'We/our when system at fault ("We couldn\'t load..."), not "system error"',
  },

  /**
   * Formality Level
   * Scale: 1 = Very Formal (Government), 10 = Very Casual (Friend)
   * Chanuka: 5-6 (Approachable, not stuffy, but authoritative)
   */
  formalityLevel: {
    target: '5-6',
    examples: {
      '3': 'The aforementioned legislative instrument shall be subject to ratification.',
      '5': 'This bill will need approval from both chambers before it becomes law.',
      '7': 'Yo, this bill needs two thumbs up from Congress to actually become law.',
    },
  },

  /**
   * Sentence Structure
   */
  sentences: {
    preference: 'Short, punchy sentences',
    rhythm: 'Mix short + medium sentences, avoid long strings',
    examples: {
      good: "Bills take time. That's by design. Today we'll show you why.",
      bad: 'Bills undergo a multifaceted process which, by design of the legislative system, takes time, and we are now prepared to demonstrate the rationale.',
    },
  },

  /**
   * Vocabulary
   */
  vocabulary: {
    principle: 'Plain language, avoid jargon unless necessary',
    DO: [
      'bill (not "legislative instrument")',
      'pass (not "enact legislation")',
      'vote (not "voice their position")',
      'sponsor (already defined)',
      'change (not "amend" without explanation)',
    ],
    DON_T_OVERUSE: [
      'utilize (use "use")',
      'facilitate (use "help" or "make easier")',
      'endeavor (use "try")',
      'pursuant to (use "according to")',
    ],
  },

  /**
   * Contractions
   * Use them! Makes voice warmer, more conversational
   */
  contractions: {
    recommended: ["it's", "we've", "they're", "here's", "what's"],
    avoid: ['cannot', 'do not'], // Use "can't", "don't" instead
    principle: 'Contractions make voice friendlier',
  },

  /**
   * Emojis/Icons in UI
   * Appropriate contexts
   */
  visuals: {
    appropriate: [
      '✓ Bill passed',
      '⏱ In progress',
      '📊 Statistics or data',
      '🔍 Search',
      '📚 Learn more',
    ],
    avoid: [
      '✗ No crying faces for rejected bills',
      '✗ Party symbols or political iconography',
      '✗ Thumbs up/down for perspectives',
      '✗ Misleading or cutesy symbols',
    ],
  },
};

/**
 * Microcopy Library
 * Common UI text patterns with voice applied
 */
export const MicrocopyLibrary = {
  /**
   * Form Fields
   */
  formLabels: {
    billNumber: {
      label: 'Bill number',
      placeholder: 'e.g., HB 1234 or SB 567',
      help: 'Find bills by their official reference number',
      error: "That doesn't look like a valid bill number. Try HB 1234 or SB 567.",
    },

    dateRange: {
      label: 'When was this bill introduced?',
      placeholder: 'Pick a date range',
      help: 'Bills can re-appear in different sessions',
      error: 'End date should be after start date',
    },

    topic: {
      label: 'What topic interests you?',
      placeholder: 'Healthcare, environment, education...',
      help: 'Or browse all bills',
      error: 'Select from suggested topics or search for your own',
    },
  },

  /**
   * Buttons & CTAs
   */
  buttons: {
    primary: {
      search: 'Find bills',
      explore: 'Explore this bill',
      contactRep: 'Find your representative',
      learnMore: 'Learn more',
      compare: 'Compare versions',
      share: 'Share this bill',
    },

    secondary: {
      showMore: 'Show more',
      showLess: 'Show less',
      filter: 'Refine search',
      save: 'Save for later',
      printFriendly: 'Print-friendly version',
    },

    action: {
      contactNow: 'Contact them now',
      readFull: 'Read the full text',
      viewSponsors: 'See who sponsored this',
      trackBill: 'Get updates on this bill',
    },
  },

  /**
   * Help Text & Tooltips
   */
  helpText: {
    sponsor: 'The legislator who introduced this bill',
    coSponsors: "Other legislators who support the bill's direction",
    status: 'Where the bill is in the process right now',
    impacts: 'Who this bill would affect and how',
    support: 'Reasons legislators and groups give for supporting',
    opposition: 'Reasons legislators and groups give for opposing',
  },

  /**
   * Empty States
   */
  emptyStates: {
    noResults: {
      title: 'No bills found',
      subtitle: 'Try searching differently, or browse by topic',
      action: 'Browse all bills',
    },

    noSavedBills: {
      title: "You haven't saved any bills yet",
      subtitle: 'Bills you save will appear here for quick reference',
      action: 'Start exploring',
    },

    noUpdates: {
      title: 'No new updates on tracked bills',
      subtitle: "We'll notify you as bills you're watching progress",
      action: 'Track more bills',
    },
  },

  /**
   * Error Messages
   * Format: Problem + Why + Solution
   */
  errors: {
    networkError: {
      title: 'Connection lost',
      reason: "We couldn't reach our servers",
      solution: 'Check your connection and try again',
    },

    notFound: {
      title: 'Bill not found',
      reason: "This bill number doesn't exist or may be from a different session",
      solution: 'Search for related bills or try a different number',
    },

    loadingFailed: {
      title: "Couldn't load this bill",
      reason: 'Our database is having trouble',
      solution: 'Refresh the page or try again in a few moments',
    },

    permissionError: {
      title: "You don't have access to this",
      reason: 'This content requires authentication',
      solution: 'Sign in with your account',
    },
  },

  /**
   * Success Messages
   */
  success: {
    saved: 'Bill saved to your library',
    contacted: 'Your message was sent to your representative',
    shared: 'Link copied to clipboard',
    tracked: "You'll get updates on this bill",
  },

  /**
   * Loading States
   */
  loading: {
    searching: 'Searching bills...',
    loading: 'Loading bill details...',
    analyzing: 'Analyzing bill impacts...',
    connecting: 'Connecting you to your representative...',
  },
};

/**
 * Tone by Audience
 * Adjust voice based on user sophistication
 */
export const AudienceAdaptation = {
  novice: {
    description: 'New to legislative process',
    approach: 'Define terms, provide context, be encouraging',
    example: {
      novice: "This bill passed committee! That means it's one step closer to becoming law.",
      expert: 'Bill advanced out of committee to the floor',
    },
    dontDo: 'Assume prior knowledge, use unexplained jargon',
  },

  engaged: {
    description: 'Familiar with bills, wants depth',
    approach: 'Provide details, link to analysis, assume familiarity',
    example: {
      novice: 'This bill is similar to others on the same topic',
      engaged: 'Companion bill to SB 234 (same chamber); similar to HR 789 (different approach)',
    },
    dontDo: 'Over-explain, be condescending',
  },

  specialist: {
    description: 'Expert (legislator, advocate, researcher)',
    approach: 'Precise language, raw data, technical details',
    example: {
      novice: 'Many people are interested in this bill',
      specialist: 'Bill has 47 sponsors, tracking mentions in 12 related pieces of legislation',
    },
    dontDo: 'Simplify, hide details',
  },
};

/**
 * Emotional Intelligence in Copy
 * Recognizing and responding to user emotion
 */
export const EmotionalIntelligence = {
  frustrated: {
    signal: 'User repeating search, trying different terms',
    tone: 'Empathetic, validating',
    response: "Bills can be hard to find. Let's break this down together.",
  },

  overwhelmed: {
    signal: 'User abandoning mid-flow',
    tone: 'Reassuring, chunking',
    response: "Too much information? We've divided this into smaller sections.",
  },

  curious: {
    signal: 'User clicking learn more, digging deeper',
    tone: 'Enthusiastic, inviting',
    response: 'This is where it gets interesting...',
  },

  skeptical: {
    signal: 'First-time visitor, unfamiliar with source',
    tone: 'Transparent, factual',
    response: "We source from official government records. Here's where this data comes from.",
  },

  urgency: {
    signal: 'Bill voting soon, repeated visits',
    tone: 'Clear, action-focused',
    response: "Vote is tomorrow. Here's how to contact your representative today.",
  },
};

/**
 * Brand Voice in Different Formats
 */
export const FormatSpecificVoice = {
  /**
   * Email/Notification
   */
  email: {
    subject: 'Subject line: Specific + benefit | "Bill HB 1234 you\'re tracking moved forward"',
    preview: 'First line should be key info: "Your representative voted on 3 bills today"',
    cta: 'Action-oriented button text: "See how they voted"',
    tone: 'Slightly more formal than UI, but still warm',
  },

  /**
   * Push Notification
   */
  pushNotification: {
    constraint: 'Keep under 50 characters for most effectiveness',
    examples: [
      'Bill HB 1234 passed the first vote! 👍',
      'New co-sponsor joined your tracked bill',
      'Your rep voted on an environmental bill',
    ],
    tone: 'Urgent but not alarming',
  },

  /**
   * Help Documentation
   */
  documentation: {
    structure: "Start with question in user's words, then explain",
    examples: [
      'Why is the same bill numbered differently? → Explanation',
      'How do I know if my rep supports this? → Explanation',
    ],
    tone: 'Educational, patient, link-heavy',
  },

  /**
   * Data Visualizations
   */
  dataViz: {
    titles: 'Descriptive, interpretive ("More bills pass in election years")',
    labels: 'Complete words, not abbreviations when possible',
    captions: 'Explain "so what?" not just "what"',
    tone: 'Conversational, avoiding academic tone',
  },

  /**
   * Video/Audio Scripts
   */
  video: {
    pace: 'Conversational speed, pauses for emphasis',
    cameraAngle: 'Friendly, eye-level (not talking down)',
    examples: [
      '"Here\'s why this matters to you..." (personal)',
      '"Notice how..." (inviting viewer into discovery)',
    ],
    tone: 'Like explaining to a smart friend',
  },
};

/**
 * What NOT to Do
 * Common voice mistakes
 */
export const VoiceAntiPatterns = {
  tooCorporate: {
    bad: 'We are pleased to announce the continued advancement of legislative initiatives',
    good: "Here's the latest on the bills we're tracking",
    issue: 'Sounds disconnected, distant',
  },

  tooCasual: {
    bad: "Yo this bill slaps 🔥 It's gonna change everything fr fr",
    good: 'This bill could significantly change how education funding works',
    issue: 'Loses credibility, alienates some users',
  },

  condescending: {
    bad: 'A bill is a proposal for a law. A law is a rule. Rules are things you follow.',
    good: 'A bill is a formal proposal for a new law',
    issue: "Talks down, doesn't respect user intelligence",
  },

  vague: {
    bad: 'Something might happen with this bill',
    good: 'This bill is currently in committee and may be voted on next week',
    issue: 'Unhelpful, breeds distrust',
  },

  saltiness: {
    bad: 'As usual, the legislature is moving at a glacial pace',
    good: 'The legislative process takes time by design',
    issue: 'Undermines political neutrality, shows bias',
  },

  manipulative: {
    bad: 'You MUST contact your rep or this bill will definitely destroy everything',
    good: 'If you care about this issue, contacting your rep can help influence the outcome',
    issue: 'Sensationalizes, breeds mistrust, manipulative',
  },
};

/**
 * Testing Checklist: Brand Voice Consistency
 */
export const BrandVoiceTestingChecklist = {
  consistency: [
    '☐ Same situation uses consistent tone across product',
    '☐ Error message tone matches help text tone',
    '☐ Success state sounds like same "person" as empty state',
    '☐ Email notifications match in-app notifications',
  ],

  appropriateness: [
    '☐ Copy matches user emotional state',
    '☐ Complexity matches audience sophistication',
    '☐ No corporate jargon, no forced casualness',
    '☐ Length appropriate for context',
  ],

  clarity: [
    '☐ Every message has clear primary action',
    '☐ Problem-Solution pairs are connected',
    '☐ No jargon without explanation',
    '☐ Microcopy is scannable (not dense paragraphs)',
  ],

  personality: [
    '☐ Reads like helpful expert, not corporate bot',
    '☐ Shows personality without being preachy',
    '☐ Transparent about limitations and uncertainties',
    '☐ Encouraging without being fake-positive',
  ],

  neutrality: [
    '☐ No political language or bias',
    '☐ Perspectives presented equally',
    '☐ No inflammatory or loaded language',
    '☐ Respectful of diverse viewpoints',
  ],
};
