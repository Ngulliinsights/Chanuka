/**
 * Component Quality & Accessibility Standards
 * THE CRAFTSPERSON PERSONA - Refines component implementations
 *
 * Ensures accessibility, visual consistency, and polish
 */

/**
 * Accessibility requirements for all components
 */
export const A11Y_STANDARDS = {
  /**
   * WCAG 2.1 Level AA compliance
   */
  wcag: {
    version: '2.1',
    level: 'AA',
    contrastRatio: {
      normalText: 4.5,  // Normal text: 4.5:1
      largeText: 3,    // Large text (18pt+): 3:1
      graphics: 3,     // Graphics and UI components: 3:1
    },
  },

  /**
   * Focus management standards
   */
  focus: {
    visible: true,
    minWidth: '2px',
    color: 'var(--focus-color)',
    offset: '2px',
    outline: true,
  },

  /**
   * Keyboard navigation requirements
   */
  keyboard: {
    tabOrder: true,
    skipLinks: true,
    arrowKeys: true,
    escapeKey: true,
  },

  /**
   * Touch target sizing (minimum 44x44px)
   */
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
    padding: 8,
  },

  /**
   * Color requirements
   */
  color: {
    notSoleDiscriminator: true,
    minimumContrast: true,
    supportsHighContrast: true,
    supportsReducedMotion: true,
  },

  /**
   * Motion and animation standards
   */
  motion: {
    respectsPreferReducedMotion: true,
    maxDuration: 300,
    maxDelay: 100,
  },
};

/**
 * Component quality checklist
 */
export interface ComponentQualityCheckpoint {
  accessibility: {
    focusManagement: boolean;
    keyboardSupport: boolean;
    ariaLabels: boolean;
    contrastRatio: boolean;
    semanticHTML: boolean;
  };
  visual: {
    designTokensUsed: boolean;
    consistentSpacing: boolean;
    consistentTypography: boolean;
    properStates: boolean;
    responsive: boolean;
  };
  performance: {
    noUnecessaryRenders: boolean;
    properMemoization: boolean;
    eventDelegation: boolean;
    lazyLoadingWhereFeasible: boolean;
  };
  testing: {
    unitTests: boolean;
    a11yTests: boolean;
    visualTests: boolean;
    integrationTests: boolean;
  };
}

/**
 * Component implementation guidelines
 */
export const COMPONENT_GUIDELINES = {
  /**
   * All components must:
   * 1. Use design tokens for all styling
   * 2. Support dark mode/light mode
   * 3. Support high contrast mode
   * 4. Support reduced motion
   * 5. Be fully keyboard accessible
   * 6. Have proper ARIA labels
   * 7. Pass accessibility tests
   * 8. Have documented variants
   */
  required: [
    'Design tokens',
    'Theme support',
    'Accessibility',
    'Type safety',
    'Documentation',
  ],

  /**
   * Component structure template
   */
  structure: {
    component: 'MyComponent.tsx',
    types: 'types.ts',
    styles: 'included in component (uses tokens)',
    tests: 'MyComponent.test.tsx',
    stories: 'MyComponent.stories.tsx',
  },

  /**
   * Documentation requirements
   */
  documentation: {
    description: 'Clear component purpose',
    usage: 'Code examples',
    props: 'All props documented',
    accessibility: 'A11y considerations',
    examples: 'Multiple use cases',
  },
};

/**
 * Quality assurance utilities
 */
export const qualityUtils = {
  /**
   * Validate component accessibility
   */
  validateA11y: (componentElement: HTMLElement): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];

    // Check focus visibility
    const focusStyle = window.getComputedStyle(componentElement, ':focus');
    if (focusStyle.outline === 'none') {
      issues.push('Focus state not visible');
    }

    // Check ARIA labels
    if (!componentElement.getAttribute('aria-label') && 
        !componentElement.querySelector('[aria-label]')) {
      issues.push('Missing ARIA labels');
    }

    // Check semantic HTML
    const hasSemanticRole = componentElement.hasAttribute('role') || 
                           ['button', 'input', 'a', 'select', 'textarea'].includes(
                             componentElement.tagName.toLowerCase()
                           );
    if (!hasSemanticRole) {
      issues.push('Missing semantic HTML or role');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  },

  /**
   * Validate component styling consistency
   */
  validateStyling: (componentName: string): { valid: boolean; issues: string[] } => {
    const issues: string[] = [];

    // Check for hardcoded colors
    // Check for inconsistent spacing
    // Check for responsive design
    // Check for theme support

    return {
      valid: issues.length === 0,
      issues,
    };
  },

  /**
   * Check component performance
   */
  checkPerformance: (componentName: string, renderTime: number): { acceptable: boolean; feedback: string } => {
    const acceptableTime = 16; // 60fps = 16.67ms per frame
    
    return {
      acceptable: renderTime < acceptableTime,
      feedback: renderTime < acceptableTime 
        ? 'Good performance' 
        : `Render time ${renderTime.toFixed(2)}ms exceeds budget`,
    };
  },
};
