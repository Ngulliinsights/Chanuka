import { 
  determineNavigationSection, 
  getSectionDisplayName, 
  getSectionDescription,
  sectionRequiresAuth,
  sectionRequiresAdmin
} from '../section-detector';

describe('section-detector', () => {
  describe('determineNavigationSection', () => {
    it('should detect legislative section for home page', () => {
      expect(determineNavigationSection('/')).toBe('legislative');
    });

    it('should detect legislative section for bills pages', () => {
      expect(determineNavigationSection('/bills')).toBe('legislative');
      expect(determineNavigationSection('/bills/123')).toBe('legislative');
      expect(determineNavigationSection('/bills/456/analysis')).toBe('legislative');
      expect(determineNavigationSection('/bill-sponsorship-analysis')).toBe('legislative');
    });

    it('should detect community section for community pages', () => {
      expect(determineNavigationSection('/community')).toBe('community');
      expect(determineNavigationSection('/expert-verification')).toBe('community');
      expect(determineNavigationSection('/comments')).toBe('community');
    });

    it('should detect user section for user pages', () => {
      expect(determineNavigationSection('/dashboard')).toBe('user');
      expect(determineNavigationSection('/profile')).toBe('user');
      expect(determineNavigationSection('/user-profile')).toBe('user');
      expect(determineNavigationSection('/onboarding')).toBe('user');
      expect(determineNavigationSection('/auth')).toBe('user');
    });

    it('should detect admin section for admin pages', () => {
      expect(determineNavigationSection('/admin')).toBe('admin');
      expect(determineNavigationSection('/admin/database')).toBe('admin');
    });

    it('should detect tools section for search pages', () => {
      expect(determineNavigationSection('/search')).toBe('tools');
    });

    it('should handle query parameters and hash fragments', () => {
      expect(determineNavigationSection('/bills?search=test')).toBe('legislative');
      expect(determineNavigationSection('/community#section1')).toBe('community');
      expect(determineNavigationSection('/dashboard?tab=profile#settings')).toBe('user');
    });

    it('should default to legislative for unknown paths', () => {
      expect(determineNavigationSection('/unknown/path')).toBe('legislative');
      expect(determineNavigationSection('/random')).toBe('legislative');
    });
  });

  describe('getSectionDisplayName', () => {
    it('should return correct display names', () => {
      expect(getSectionDisplayName('legislative')).toBe('Legislative Data');
      expect(getSectionDisplayName('community')).toBe('Community');
      expect(getSectionDisplayName('user')).toBe('User Account');
      expect(getSectionDisplayName('admin')).toBe('Administration');
      expect(getSectionDisplayName('tools')).toBe('Tools');
    });
  });

  describe('getSectionDescription', () => {
    it('should return correct descriptions', () => {
      expect(getSectionDescription('legislative')).toBe('Browse bills, analysis, and sponsorship information');
      expect(getSectionDescription('community')).toBe('Community input, discussions, and expert verification');
      expect(getSectionDescription('user')).toBe('Personal dashboard, profile, and account settings');
      expect(getSectionDescription('admin')).toBe('Administrative tools and system management');
      expect(getSectionDescription('tools')).toBe('Search, discovery, and utility tools');
    });
  });

  describe('sectionRequiresAuth', () => {
    it('should correctly identify sections requiring authentication', () => {
      expect(sectionRequiresAuth('legislative')).toBe(false);
      expect(sectionRequiresAuth('community')).toBe(false);
      expect(sectionRequiresAuth('tools')).toBe(false);
      expect(sectionRequiresAuth('user')).toBe(true);
      expect(sectionRequiresAuth('admin')).toBe(true);
    });
  });

  describe('sectionRequiresAdmin', () => {
    it('should correctly identify sections requiring admin privileges', () => {
      expect(sectionRequiresAdmin('legislative')).toBe(false);
      expect(sectionRequiresAdmin('community')).toBe(false);
      expect(sectionRequiresAdmin('tools')).toBe(false);
      expect(sectionRequiresAdmin('user')).toBe(false);
      expect(sectionRequiresAdmin('admin')).toBe(true);
    });
  });
});