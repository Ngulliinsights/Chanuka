/**
 * Political Neutrality Guidelines
 * ==============================
 *
 * Principles for presenting multiple perspectives without bias in
 * legislative analysis and governance tools.
 *
 * This system reflects Chanuka's commitment to democratic participation
 * by ensuring UI/UX does not favor any particular political viewpoint
 * while maintaining clarity and accessibility.
 */

export const PoliticalNeutralityPrinciples = {
  /**
   * Color Neutrality
   * ----------------
   * Use colors that represent perspectives, not values or bias
   */
  colorUsage: {
    perspective1: {
      color: '#3b82f6', // Perspective indicator (blue)
      usage: 'Primary legislative perspective or supporting argument',
      contrast: '4.5:1 WCAG AA compliant',
      avoid: 'Do not use red/green (implies good/bad)',
    },
    perspective2: {
      color: '#a855f7', // Perspective indicator (purple)
      usage: 'Alternative legislative perspective or opposing argument',
      contrast: '4.5:1 WCAG AA compliant',
      avoid: 'Do not use conflicting colors with perspective1',
    },
    neutralInfo: {
      color: '#22c55e', // Factual/informational (green-tinted)
      usage: 'Non-partisan facts, definitions, historical context',
      contrast: '4.5:1 WCAG AA compliant',
      avoid: 'Overuse for opinion content',
    },
    amendment: {
      color: '#f59e0b', // Amendment/modification (amber)
      usage: 'Changes, amendments, version differences',
      contrast: '4.5:1 WCAG AA compliant',
      avoid: 'Use consistently across all amendment types',
    },
  },

  /**
   * Layout Patterns for Balanced Presentation
   */
  layoutPatterns: {
    /**
     * Side-by-Side Comparison
     * Shows two perspectives with equal visual weight
     */
    sideBySideComparison: {
      layout: 'flex row with equal 50% widths',
      spacing: 'Consistent gap between columns',
      headers: 'Identical visual prominence',
      borders: 'Consistent weight on both sides',
      example: `
        <div class="flex gap-4">
          <div class="flex-1">Perspective A</div>
          <div class="flex-1">Perspective B</div>
        </div>
      `,
    },

    /**
     * Stacked Perspective View
     * For mobile or complex content
     */
    stackedPerspectives: {
      layout: 'flex column with consistent spacing',
      ordering: 'Alternate or randomize to avoid top-bias',
      indicators: 'Clear color-coded labels at top of each section',
      separation: 'Visual divider with neutral color (gray)',
      accessibility: 'Proper heading structure (h3 or h4)',
    },

    /**
     * Tabbed Perspective Switch
     * For detailed policy comparisons
     */
    tabbedPerspectives: {
      tabs: 'Equal-width tab buttons',
      indicators: 'Color dots matching perspective colors',
      content: 'Same styling regardless of active tab',
      keyboard: 'Arrow keys to switch tabs',
      announcement: 'Screen reader update on tab change',
    },

    /**
     * Layered/Toggle View
     * Show/hide perspectives based on user selection
     */
    toggleView: {
      controls: 'Checkboxes or toggles for each perspective',
      labels: 'Clear descriptive text, not "pro/con"',
      default: 'Show all perspectives by default',
      persistence: 'Remember user toggle preference',
      fallback: 'Accessible keyboard navigation if layers used',
    },
  },

  /**
   * Language & Microcopy Neutrality
   */
  languageGuidelines: {
    perspectives: {
      DON_T: [
        '"Pro" and "Con" - implies good/bad',
        '"Support" and "Oppose" - implies stance',
        '"Right" and "Left" - political labels',
        '"Traditional" and "Progressive" - value judgment',
      ],
      DO: [
        '"Perspective A" and "Perspective B"',
        '"Legislative Approach 1" and "Legislative Approach 2"',
        '"View supporting [policy]" and "View supporting [alternative]"',
        '"First consideration" and "Alternative consideration"',
      ],
    },

    descriptions: {
      DON_T: [
        'Radical, extreme, unrealistic, impractical',
        'Common sense, obvious, logical',
        'Foolish, reckless, dangerous',
        'Enlightened, progressive, modern',
      ],
      DO: [
        'Comprehensive, wide-ranging, extensive',
        'Focused, targeted, specific',
        'Precautionary, conservative, gradual',
        'Efficient, streamlined, expedited',
      ],
    },

    userGuidance: {
      DO: [
        'Help users understand impact of each perspective',
        'Explain reasoning without editorial comment',
        'Link to supporting facts and sources',
        'Acknowledge legitimate concerns on all sides',
        'Use "Some argue that..." to indicate perspective',
      ],
    },
  },

  /**
   * Component Patterns for Neutral Presentation
   */
  components: {
    /**
     * PerspectiveCard
     * Individual perspective presentation
     */
    perspectiveCard: {
      structure: `
        <article class="perspective-card" data-perspective="A">
          <header>
            <h3>Perspective</h3>
            <span class="indicator" style="color: #3b82f6">●</span>
          </header>
          <main>{content}</main>
          <footer>{sources}</footer>
        </article>
      `,
      styling: {
        border: 'Light gray, neutral',
        padding: 'Consistent with other cards',
        background: 'White or light gray, not colored',
        shadow: 'Subtle, equal to other cards',
      },
      accessibility: {
        role: 'article',
        ariaLabel: 'Perspective label, not "pro" or "con"',
        headingLevel: 'Consistent across all cards',
      },
    },

    /**
     * ComparisonTable
     * Side-by-side policy comparison
     */
    comparisonTable: {
      structure: `
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Policy Aspect</th>
              <th class="perspective-a">Perspective A</th>
              <th class="perspective-b">Perspective B</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      `,
      styling: {
        columnWidths: 'Equal for perspective columns',
        borders: 'Equal weight throughout',
        alignment: 'Center-aligned perspective columns',
        highlights: 'Avoid highlighting one perspective',
      },
      accessibility: {
        scope: 'col and row attributes for headers',
        captions: 'Table title describing comparison',
        headings: 'Clear, neutral language',
      },
    },

    /**
     * ArgumentTree
     * Hierarchical argument structure with sub-points
     */
    argumentTree: {
      structure: `
        <div class="argument-tree">
          <div class="argument-node">
            <h4 class="argument-title">Main point</h4>
            <ul class="supporting-points">
              <li>Supporting point 1</li>
              <li>Supporting point 2</li>
            </ul>
          </div>
        </div>
      `,
      neutrality: 'All branches shown with equal prominence',
      nesting: 'Up to 3 levels for accessibility',
      expansion: 'Progressive disclosure of complexity',
    },
  },

  /**
   * Icon and Visual Indicator Guidelines
   */
  visualIndicators: {
    // Use abstract shapes, not politically charged symbols
    perspectiveMarkers: [
      { symbol: '●', usage: 'Perspective indicator (color-coded)' },
      { symbol: '◆', usage: 'Alternative perspective' },
      { symbol: '□', usage: 'Factual/neutral information' },
      { symbol: '◇', usage: 'Amendment or modification' },
    ],

    DON_T_USE: [
      'Donkey or elephant symbols (partisan)',
      'Left/right arrows suggesting political spectrum',
      'Red/green color associations (good/bad)',
      'Thumbs up/down for perspectives',
      'Flags representing parties or factions',
    ],

    APPROPRIATE: [
      'Abstract dividing lines (neutral boundary)',
      'Balanced scale (equal weight)',
      'Circular flow (ongoing debate)',
      'Directional arrows (process flow)',
      'Geometric shapes (abstract, non-partisan)',
    ],
  },

  /**
   * Contrast and Accessibility for Political Content
   */
  a11yConsiderations: {
    colorDependence: 'Never convey political meaning through color alone',
    contrastRatios: {
      perspective1Ratio: '4.5:1 (WCAG AA)',
      perspective2Ratio: '4.5:1 (WCAG AA)',
      differentiation: 'Distinguishable by color-blind users',
    },

    labels: 'Always pair colors with text labels',
    patterns: 'Use patterns (dots, lines) in addition to color for distinction',
    icons: 'Provide text alternatives for all icon indicators',
  },

  /**
   * Testing Checklist for Political Neutrality
   */
  testingChecklist: {
    visualEquality: [
      '☐ Both perspectives have equal visual prominence',
      '☐ No color associations with good/bad',
      '☐ Text size identical for all perspectives',
      '☐ Border weights and spacing balanced',
      '☐ Shadows and effects applied equally',
    ],

    languageNeutrality: [
      '☐ No "pro/con", "support/oppose", or similar labels',
      '☐ Descriptions factual, not editorial',
      '☐ Both perspectives use consistent framing',
      '☐ Microcopy uses neutral, descriptive language',
      '☐ Links and CTAs treat all perspectives equally',
    ],

    interactionEquality: [
      '☐ Both perspectives expanded/collapsed together',
      '☐ No default expansion favoring one view',
      '☐ Tab order alternates or random between perspectives',
      '☐ Keyboard navigation works equally for all',
      "☐ Search/filter doesn't bias toward one perspective",
    ],

    userResearch: [
      '☐ Tested with users from diverse political backgrounds',
      '☐ Asked: Does any perspective seem favored?',
      '☐ Color-blind users can distinguish perspectives',
      '☐ Screen reader users perceive equal weight',
      '☐ No subtle bias in ordering or grouping detected',
    ],
  },

  /**
   * Implementation Examples
   */
  examples: {
    /**
     * Example 1: Bill Comparison
     */
    billComparison: `
      Comparing two versions of a bill:
      
      ✓ NEUTRAL: "Version A emphasizes [aspect], while Version B prioritizes [aspect]"
      ✗ BIASED: "Version A sensibly addresses [aspect], but Version B's approach to [aspect] is controversial"
      
      ✓ NEUTRAL: Show full text of both versions side-by-side
      ✗ BIASED: Highlight perceived flaws in one version
    `,

    /**
     * Example 2: Amendment Analysis
     */
    amendmentAnalysis: `
      Presenting arguments about an amendment:
      
      ✓ NEUTRAL: "Those supporting this amendment argue [reasoning]. Those opposing argue [reasoning]."
      ✗ BIASED: "Supporters wisely support this amendment because [reasoning]. Critics object because [weak argument]."
      
      ✓ NEUTRAL: Equal word count for each perspective
      ✗ BIASED: One perspective described in detail, other dismissed briefly
    `,

    /**
     * Example 3: Policy Impact
     */
    policyImpact: `
      Presenting policy impacts:
      
      ✓ NEUTRAL: "This policy is projected to increase [metric] by X% and decrease [metric] by Y%"
      ✗ BIASED: "This policy will boost the economy but hurt workers"
      
      ✓ NEUTRAL: Present projections from multiple sources with uncertainty ranges
      ✗ BIASED: Cherry-pick projections supporting one view
    `,
  },
};

/**
 * Helper function to validate component neutrality
 */
export function validatePoliticalNeutrality(config: {
  colorScheme?: 'perspective' | 'neutral' | 'governance';
  languageContent?: string;
  layoutType?: 'sideBySide' | 'stacked' | 'tabbed' | 'toggle';
}): {
  isNeutral: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for biased language
  const biasedTerms = [
    'pro',
    'con',
    'support',
    'oppose',
    'radical',
    'extreme',
    'traditional',
    'progressive',
  ];
  if (config.languageContent) {
    biasedTerms.forEach(term => {
      if (config.languageContent?.toLowerCase().includes(term)) {
        warnings.push(`Found potentially biased term: "${term}"`);
      }
    });
  }

  // Check layout equity
  if (config.layoutType === 'stacked') {
    suggestions.push('Consider randomizing order of stacked perspectives to avoid top-bias');
  }

  return {
    isNeutral: warnings.length === 0,
    warnings,
    suggestions,
  };
}
