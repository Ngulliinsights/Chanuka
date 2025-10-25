import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ComponentTemplateGenerator,
  TemplateValidator,
  generateComponentTemplate,
  ComponentTemplateConfig,
  TemplateFile,
} from '../component-templates';

describe('ComponentTemplateGenerator', () => {
  const basicConfig: ComponentTemplateConfig = {
    componentName: 'test-component',
    directory: 'client/src/components/test-component',
    description: 'Test component for unit testing',
  };

  const fullConfig: ComponentTemplateConfig = {
    componentName: 'full-component',
    directory: 'client/src/components/full-component',
    hasValidation: true,
    hasErrorHandling: true,
    hasHooks: true,
    hasUtils: true,
    hasConfig: true,
    hasUI: true,
    hasCore: true,
    description: 'Full-featured test component',
  };

  describe('constructor', () => {
    it('should create generator with config', () => {
      const generator = new ComponentTemplateGenerator(basicConfig);
      expect(generator).toBeInstanceOf(ComponentTemplateGenerator);
    });
  });

  describe('generateAllFiles', () => {
    it('should generate basic files for minimal config', () => {
      const generator = new ComponentTemplateGenerator(basicConfig);
      const files = generator.generateAllFiles();

      expect(files.length).toBeGreaterThan(0);
      
      // Check for required files
      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('client/src/components/test-component/index.ts');
      expect(filePaths).toContain('client/src/components/test-component/types.ts');
      expect(filePaths).toContain('client/src/components/test-component/__tests__/testComponent.test.tsx');
    });

    it('should generate all files for full config', () => {
      const generator = new ComponentTemplateGenerator(fullConfig);
      const files = generator.generateAllFiles();

      expect(files.length).toBeGreaterThan(10);
      
      const filePaths = files.map(f => f.path);
      
      // Core files
      expect(filePaths).toContain('client/src/components/full-component/index.ts');
      expect(filePaths).toContain('client/src/components/full-component/types.ts');
      
      // Optional files
      expect(filePaths).toContain('client/src/components/full-component/validation.ts');
      expect(filePaths).toContain('client/src/components/full-component/errors.ts');
      expect(filePaths).toContain('client/src/components/full-component/recovery.ts');
      expect(filePaths).toContain('client/src/components/full-component/hooks/index.ts');
      expect(filePaths).toContain('client/src/components/full-component/hooks/useFullComponent.ts');
      expect(filePaths).toContain('client/src/components/full-component/utils/index.ts');
      expect(filePaths).toContain('client/src/components/full-component/utils/full-component-utils.ts');
      expect(filePaths).toContain('client/src/components/full-component/config/full-component-config.md');
      expect(filePaths).toContain('client/src/components/full-component/ui/index.ts');
      expect(filePaths).toContain('client/src/components/full-component/ui/FullComponentUI.tsx');
      expect(filePaths).toContain('client/src/components/full-component/core/fullComponentCore.ts');
      
      // Test files
      expect(filePaths).toContain('client/src/components/full-component/__tests__/fullComponent.test.tsx');
      expect(filePaths).toContain('client/src/components/full-component/__tests__/useFullComponent.test.ts');
      expect(filePaths).toContain('client/src/components/full-component/__tests__/full-component-utils.test.ts');
    });
  });

  describe('file content generation', () => {
    it('should generate valid TypeScript content', () => {
      const generator = new ComponentTemplateGenerator(fullConfig);
      const files = generator.generateAllFiles();

      files.forEach(file => {
        expect(file.content).toBeTruthy();
        expect(file.content.length).toBeGreaterThan(0);
        
        // Check for basic TypeScript/React patterns
        if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
          // Should not have obvious syntax errors
          expect(file.content).not.toContain('undefined');
          expect(file.content).not.toContain('null');
        }
      });
    });

    it('should include component name in generated content', () => {
      const generator = new ComponentTemplateGenerator(basicConfig);
      const files = generator.generateAllFiles();

      const indexFile = files.find(f => f.path.endsWith('index.ts'));
      expect(indexFile?.content).toContain('TestComponent');
      
      const typesFile = files.find(f => f.path.endsWith('types.ts'));
      expect(typesFile?.content).toContain('TestComponent');
    });

    it('should generate proper imports and exports', () => {
      const generator = new ComponentTemplateGenerator(fullConfig);
      const files = generator.generateAllFiles();

      const indexFile = files.find(f => f.path.endsWith('index.ts'));
      expect(indexFile?.content).toContain('export * from');
      
      const hooksIndex = files.find(f => f.path.includes('hooks/index.ts'));
      expect(hooksIndex?.content).toContain('export * from \'./useFullComponent\'');
    });
  });

  describe('naming conventions', () => {
    it('should handle kebab-case component names', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'multi-word-component',
        directory: 'test',
      };
      
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();
      
      const typesFile = files.find(f => f.path.endsWith('types.ts'));
      expect(typesFile?.content).toContain('MultiWordComponent');
      expect(typesFile?.content).toContain('multiWordComponent');
    });

    it('should handle snake_case component names', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'snake_case_component',
        directory: 'test',
      };
      
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();
      
      const typesFile = files.find(f => f.path.endsWith('types.ts'));
      expect(typesFile?.content).toContain('SnakeCaseComponent');
    });

    it('should handle single word component names', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'button',
        directory: 'test',
      };
      
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();
      
      const typesFile = files.find(f => f.path.endsWith('types.ts'));
      expect(typesFile?.content).toContain('Button');
    });
  });
});

describe('TemplateValidator', () => {
  describe('validateConfig', () => {
    it('should pass validation for valid config', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'valid-component',
        directory: 'client/src/components/valid-component',
      };
      
      const errors = TemplateValidator.validateConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing component name', () => {
      const config: ComponentTemplateConfig = {
        componentName: '',
        directory: 'test',
      };
      
      const errors = TemplateValidator.validateConfig(config);
      expect(errors).toContain('Component name is required');
    });

    it('should fail validation for missing directory', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'test',
        directory: '',
      };
      
      const errors = TemplateValidator.validateConfig(config);
      expect(errors).toContain('Directory is required');
    });

    it('should fail validation for invalid component name format', () => {
      const config: ComponentTemplateConfig = {
        componentName: '123-invalid',
        directory: 'test',
      };
      
      const errors = TemplateValidator.validateConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('must start with a letter');
    });

    it('should allow valid component name formats', () => {
      const validNames = [
        'component',
        'Component',
        'multi-word-component',
        'multi_word_component',
        'component123',
        'Component-With-Numbers123',
      ];

      validNames.forEach(name => {
        const config: ComponentTemplateConfig = {
          componentName: name,
          directory: 'test',
        };
        
        const errors = TemplateValidator.validateConfig(config);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('validateDirectoryStructure', () => {
    it('should pass validation for complete file structure', () => {
      const files: TemplateFile[] = [
        { path: 'test/index.ts', content: 'export' },
        { path: 'test/types.ts', content: 'interface' },
      ];
      
      const errors = TemplateValidator.validateDirectoryStructure(files);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing required files', () => {
      const files: TemplateFile[] = [
        { path: 'test/index.ts', content: 'export' },
        // Missing types.ts
      ];
      
      const errors = TemplateValidator.validateDirectoryStructure(files);
      expect(errors).toContain('Missing required file: types.ts');
    });

    it('should fail validation for empty file list', () => {
      const files: TemplateFile[] = [];
      
      const errors = TemplateValidator.validateDirectoryStructure(files);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('generateComponentTemplate', () => {
  it('should generate template successfully for valid config', () => {
    const config: ComponentTemplateConfig = {
      componentName: 'test-component',
      directory: 'test',
      hasValidation: true,
      hasErrorHandling: true,
    };
    
    const result = generateComponentTemplate(config);
    
    expect(result.errors).toHaveLength(0);
    expect(result.files.length).toBeGreaterThan(0);
    
    const filePaths = result.files.map(f => f.path);
    expect(filePaths).toContain('test/index.ts');
    expect(filePaths).toContain('test/types.ts');
    expect(filePaths).toContain('test/validation.ts');
    expect(filePaths).toContain('test/errors.ts');
  });

  it('should return errors for invalid config', () => {
    const config: ComponentTemplateConfig = {
      componentName: '',
      directory: '',
    };
    
    const result = generateComponentTemplate(config);
    
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.files).toHaveLength(0);
  });

  it('should generate different templates based on config options', () => {
    const minimalConfig: ComponentTemplateConfig = {
      componentName: 'minimal',
      directory: 'test-minimal',
    };
    
    const fullConfig: ComponentTemplateConfig = {
      componentName: 'full',
      directory: 'test-full',
      hasValidation: true,
      hasErrorHandling: true,
      hasHooks: true,
      hasUtils: true,
      hasConfig: true,
      hasUI: true,
      hasCore: true,
    };
    
    const minimalResult = generateComponentTemplate(minimalConfig);
    const fullResult = generateComponentTemplate(fullConfig);
    
    expect(minimalResult.errors).toHaveLength(0);
    expect(fullResult.errors).toHaveLength(0);
    
    expect(fullResult.files.length).toBeGreaterThan(minimalResult.files.length);
  });

  it('should generate consistent file structure', () => {
    const config: ComponentTemplateConfig = {
      componentName: 'consistent-test',
      directory: 'test-consistent',
      hasValidation: true,
      hasHooks: true,
      hasUtils: true,
    };
    
    const result1 = generateComponentTemplate(config);
    const result2 = generateComponentTemplate(config);
    
    expect(result1.files.length).toBe(result2.files.length);
    
    const paths1 = result1.files.map(f => f.path).sort();
    const paths2 = result2.files.map(f => f.path).sort();
    
    expect(paths1).toEqual(paths2);
  });
});