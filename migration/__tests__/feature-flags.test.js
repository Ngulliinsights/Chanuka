const { FeatureFlagManager, featureFlagManager } = require('../feature-flags');
const fs = require('fs');
const path = require('path');

// Mock fs
jest.mock('fs');

describe('Feature Flag Manager', () => {
  let manager;
  const configPath = './migration/feature-flags.json';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new FeatureFlagManager(configPath);
  });

  describe('constructor', () => {
    it('should load config if file exists', () => {
      const mockConfig = { TEST_FLAG: { enabled: true } };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const newManager = new FeatureFlagManager();

      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should handle missing config file', () => {
      fs.existsSync.mockReturnValue(false);

      const newManager = new FeatureFlagManager();

      expect(newManager.flags).toBeDefined();
    });
  });

  describe('isEnabled', () => {
    it('should return false for non-existent flags', () => {
      expect(manager.isEnabled('NON_EXISTENT')).toBe(false);
    });

    it('should return false for disabled flags', () => {
      manager.flags.TEST_FLAG = { enabled: false };
      expect(manager.isEnabled('TEST_FLAG')).toBe(false);
    });

    it('should return true for enabled flags at 100%', () => {
      manager.flags.TEST_FLAG = { enabled: true, rollout_percentage: 100 };
      expect(manager.isEnabled('TEST_FLAG')).toBe(true);
    });

    it('should handle rollout percentages', () => {
      manager.flags.TEST_FLAG = { enabled: true, rollout_percentage: 50 };

      // Mock hash function to return consistent values
      manager.simpleHash = jest.fn();
      manager.simpleHash.mockReturnValueOnce(25); // Within 50%
      manager.simpleHash.mockReturnValueOnce(75); // Outside 50%

      expect(manager.isEnabled('TEST_FLAG', { rolloutKey: 'user1' })).toBe(true);
      expect(manager.isEnabled('TEST_FLAG', { rolloutKey: 'user2' })).toBe(false);
    });
  });

  describe('enableFlag', () => {
    it('should enable flag and save config', () => {
      manager.flags.TEST_FLAG = { enabled: false };

      manager.enableFlag('TEST_FLAG', 75);

      expect(manager.flags.TEST_FLAG.enabled).toBe(true);
      expect(manager.flags.TEST_FLAG.rollout_percentage).toBe(75);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('disableFlag', () => {
    it('should disable flag and save config', () => {
      manager.flags.TEST_FLAG = { enabled: true };

      manager.disableFlag('TEST_FLAG');

      expect(manager.flags.TEST_FLAG.enabled).toBe(false);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('setRolloutPercentage', () => {
    it('should set rollout percentage within bounds', () => {
      manager.flags.TEST_FLAG = { rollout_percentage: 0 };

      manager.setRolloutPercentage('TEST_FLAG', 150); // Over 100
      expect(manager.flags.TEST_FLAG.rollout_percentage).toBe(100);

      manager.setRolloutPercentage('TEST_FLAG', -10); // Under 0
      expect(manager.flags.TEST_FLAG.rollout_percentage).toBe(0);

      manager.setRolloutPercentage('TEST_FLAG', 75); // Valid
      expect(manager.flags.TEST_FLAG.rollout_percentage).toBe(75);
    });
  });

  describe('canProceedWithMigration', () => {
    it('should check migration phase and validation flags', () => {
      manager.flags.MIGRATION_PHASE_1 = { enabled: true };
      manager.flags.VALIDATION_STRICT = { enabled: true };

      expect(manager.canProceedWithMigration(1)).toBe(true);
    });

    it('should return false if phase not enabled', () => {
      manager.flags.MIGRATION_PHASE_1 = { enabled: false };
      manager.flags.VALIDATION_STRICT = { enabled: true };

      expect(manager.canProceedWithMigration(1)).toBe(false);
    });

    it('should return false if validation not strict', () => {
      manager.flags.MIGRATION_PHASE_1 = { enabled: true };
      manager.flags.VALIDATION_STRICT = { enabled: false };

      expect(manager.canProceedWithMigration(1)).toBe(false);
    });
  });

  describe('simpleHash', () => {
    it('should generate consistent hash values', () => {
      const hash1 = manager.simpleHash('test');
      const hash2 = manager.simpleHash('test');
      const hash3 = manager.simpleHash('different');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(typeof hash1).toBe('number');
    });
  });

  describe('displayStatus', () => {
    it('should log flag status', () => {
      manager.flags.TEST_FLAG = {
        name: 'Test Flag',
        description: 'A test flag',
        enabled: true,
        rollout_percentage: 50
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      manager.displayStatus();

      expect(consoleSpy).toHaveBeenCalledWith('Feature Flag Status:');
      expect(consoleSpy).toHaveBeenCalledWith('===================');
      expect(consoleSpy).toHaveBeenCalledWith('✅ TEST_FLAG (50%): A test flag');

      consoleSpy.mockRestore();
    });
  });

  describe('saveConfig', () => {
    it('should create directory if needed', () => {
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});

      manager.saveConfig();

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(configPath), { recursive: true });
    });
  });
});




































