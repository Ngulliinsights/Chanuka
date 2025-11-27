import { describe, it, expect } from 'vitest';
import { en, TranslationKey, Translations } from '@client/i18n';

describe('i18n', () => {
  describe('en translations', () => {
    it('should have all required translation keys', () => {
      expect(en).toHaveProperty('common');
      expect(en).toHaveProperty('navigation');
      expect(en).toHaveProperty('errors');
      expect(en).toHaveProperty('auth');
    });

    it('should have common translations', () => {
      const common = en.common;
      expect(common.loading).toBe('Loading...');
      expect(common.error).toBe('Error');
      expect(common.retry).toBe('Retry');
      expect(common.cancel).toBe('Cancel');
      expect(common.save).toBe('Save');
      expect(common.delete).toBe('Delete');
      expect(common.edit).toBe('Edit');
      expect(common.close).toBe('Close');
      expect(common.back).toBe('Back');
      expect(common.next).toBe('Next');
      expect(common.previous).toBe('Previous');
      expect(common.search).toBe('Search');
      expect(common.filter).toBe('Filter');
      expect(common.sort).toBe('Sort');
      expect(common.refresh).toBe('Refresh');
    });

    it('should have navigation translations', () => {
      const navigation = en.navigation;
      expect(navigation.home).toBe('Home');
      expect(navigation.dashboard).toBe('Dashboard');
      expect(navigation.bills).toBe('Bills');
      expect(navigation.analysis).toBe('Analysis');
      expect(navigation.settings).toBe('Settings');
      expect(navigation.profile).toBe('Profile');
      expect(navigation.logout).toBe('Logout');
      expect(navigation.menu).toBe('Menu');
    });

    it('should have error translations', () => {
      const errors = en.errors;
      expect(errors.generic).toBe('Something went wrong');
      expect(errors.network).toBe('Network error occurred');
      expect(errors.notFound).toBe('Page not found');
      expect(errors.unauthorized).toBe('Unauthorized access');
      expect(errors.forbidden).toBe('Access forbidden');
      expect(errors.validation).toBe('Validation error');
      expect(errors.timeout).toBe('Request timed out');
    });

    it('should have auth translations', () => {
      const auth = en.auth;
      expect(auth.login).toBe('Login');
      expect(auth.register).toBe('Register');
      expect(auth.email).toBe('Email');
      expect(auth.password).toBe('Password');
      expect(auth.confirmPassword).toBe('Confirm Password');
      expect(auth.forgotPassword).toBe('Forgot Password?');
      expect(auth.rememberMe).toBe('Remember Me');
      expect(auth.signIn).toBe('Sign In');
      expect(auth.signUp).toBe('Sign Up');
      expect(auth.signOut).toBe('Sign Out');
    });
  });

  describe('Type definitions', () => {
    it('should have correct TranslationKey type', () => {
      const keys: TranslationKey[] = ['common', 'navigation', 'errors', 'auth'];
      expect(keys).toEqual(['common', 'navigation', 'errors', 'auth']);
    });

    it('should have correct Translations type', () => {
      const translations: Translations = en;
      expect(translations).toEqual(en);
    });
  });

  describe('Translation structure', () => {
    it('should have consistent structure', () => {
      // All top-level keys should be strings
      Object.keys(en).forEach(key => {
        expect(typeof en[key as keyof typeof en]).toBe('object');
      });

      // All nested values should be strings
      Object.values(en).forEach(section => {
        Object.values(section).forEach(value => {
          expect(typeof value).toBe('string');
        });
      });
    });

    it('should not have empty translations', () => {
      Object.values(en).forEach(section => {
        Object.values(section).forEach(value => {
          expect(value.trim()).not.toBe('');
        });
      });
    });

    it('should have reasonable translation lengths', () => {
      Object.values(en).forEach(section => {
        Object.values(section).forEach(value => {
          expect(value.length).toBeGreaterThan(0);
          expect(value.length).toBeLessThan(100); // Reasonable max length
        });
      });
    });
  });

  describe('Translation content', () => {
    it('should use proper English', () => {
      // Basic checks for common English patterns
      expect(en.common.loading).toMatch(/^[A-Z][a-z]+/); // Capitalized
      expect(en.errors.generic).toMatch(/^[A-Z][a-z\s]+/); // Sentence case
    });

    it('should have appropriate punctuation', () => {
      expect(en.common.loading).toMatch(/\.\.\.$/); // Loading has ellipsis
      expect(en.errors.notFound).not.toMatch(/\.$/); // Error messages don't end with period
      expect(en.auth.forgotPassword).toMatch(/\?$/); // Questions end with ?
    });

    it('should have consistent terminology', () => {
      // Check for consistent use of terms
      const allText = JSON.stringify(en).toLowerCase();
      expect(allText).toMatch(/login/); // Has login
      expect(allText).toMatch(/email/); // Has email
    });
  });
});