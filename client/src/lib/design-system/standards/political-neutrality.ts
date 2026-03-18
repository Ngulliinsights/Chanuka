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

export /**
 * Helper function to validate component neutrality
 */
function validatePoliticalNeutrality(config: {
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
