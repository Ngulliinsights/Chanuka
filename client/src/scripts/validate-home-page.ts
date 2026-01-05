/**
 * Home Page Validation Script
 *
 * Validates that the home page implementation meets performance and accessibility requirements
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

class HomePageValidator {
  private homePagePath = join(process.cwd(), 'src/pages/StrategicHomePage.tsx');

  validate(): ValidationResult[] {
    const results: ValidationResult[] = [];

    try {
      const content = readFileSync(this.homePagePath, 'utf-8');

      // Check for performance optimizations
      results.push(this.checkPerformanceOptimizations(content));

      // Check for accessibility features
      results.push(this.checkAccessibilityFeatures(content));

      // Check for lazy loading
      results.push(this.checkLazyLoading(content));

      // Check for memoization
      results.push(this.checkMemoization(content));

      // Check for proper ARIA labels
      results.push(this.checkAriaLabels(content));

    } catch (error) {
      results.push({
        passed: false,
        message: 'Failed to read home page file',
        details: [error instanceof Error ? error.message : String(error)]
      });
    }

    return results;
  }

  private checkPerformanceOptimizations(content: string): ValidationResult {
    const optimizations = [
      'useCallback',
      'useMemo',
      'React.memo',
      'Suspense',
      'lazy'
    ];

    const found = optimizations.filter(opt => content.includes(opt));
    const missing = optimizations.filter(opt => !content.includes(opt));

    return {
      passed: found.length >= 4, // At least 4 out of 5 optimizations
      message: 'Performance optimizations check',
      details: [
        `Found: ${found.join(', ')}`,
        ...(missing.length > 0 ? [`Missing: ${missing.join(', ')}`] : [])
      ]
    };
  }

  private checkAccessibilityFeatures(content: string): ValidationResult {
    const features = [
      'aria-label',
      'aria-describedby',
      'role=',
      'data-testid',
      'aria-hidden'
    ];

    const found = features.filter(feature => content.includes(feature));

    return {
      passed: found.length >= 4, // At least 4 out of 5 features
      message: 'Accessibility features check',
      details: [`Found: ${found.join(', ')}`]
    };
  }

  private checkLazyLoading(content: string): ValidationResult {
    const lazyFeatures = [
      'lazy(',
      'Suspense',
      'import('
    ];

    const found = lazyFeatures.filter(feature => content.includes(feature));

    return {
      passed: found.length >= 2, // At least 2 lazy loading features
      message: 'Lazy loading implementation check',
      details: [`Found: ${found.join(', ')}`]
    };
  }

  private checkMemoization(content: string): ValidationResult {
    const memoFeatures = [
      'React.memo',
      'useCallback',
      'useMemo'
    ];

    const found = memoFeatures.filter(feature => content.includes(feature));

    return {
      passed: found.length >= 2, // At least 2 memoization techniques
      message: 'Memoization implementation check',
      details: [`Found: ${found.join(', ')}`]
    };
  }

  private checkAriaLabels(content: string): ValidationResult {
    const ariaCount = (content.match(/aria-label/g) || []).length;
    const roleCount = (content.match(/role=/g) || []).length;

    return {
      passed: ariaCount >= 3 && roleCount >= 2,
      message: 'ARIA labels and roles check',
      details: [
        `ARIA labels found: ${ariaCount}`,
        `Roles found: ${roleCount}`
      ]
    };
  }
}

// Run validation
const validator = new HomePageValidator();
const results = validator.validate();

console.log('\n🏠 Home Page Validation Results\n');
console.log('================================\n');

let allPassed = true;

results.forEach((result, index) => {
  const status = result.passed ? '✅' : '❌';
  console.log(`${status} ${result.message}`);

  if (result.details) {
    result.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
  }

  if (!result.passed) {
    allPassed = false;
  }

  console.log('');
});

console.log('================================\n');
console.log(`Overall Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}\n`);

if (allPassed) {
  console.log('🎉 Home page implementation meets performance and accessibility requirements!');
} else {
  console.log('⚠️  Some requirements are not met. Please review the failed checks above.');
}

process.exit(allPassed ? 0 : 1);
