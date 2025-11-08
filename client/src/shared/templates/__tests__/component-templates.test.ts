import { describe, it, expect } from 'vitest';
import {
  ComponentTemplateGenerator,
  TemplateValidator,
  generateComponentTemplate,
  type ComponentTemplateConfig,
  type TemplateFile
} from '../component-templates';

describe('Component Template System', () => {
  describe('ComponentTemplateGenerator', () => {
    const baseConfig: ComponentTemplateConfig = {
      componentName: 'test-component',
      directory: 'src/components/test-component',
      description: 'A test component for template generation'
    };

    it('should generate all required files for basic component', () => {
      const generator = new ComponentTemplateGenerator(baseConfig);
      const files = generator.generateAllFiles();

      expect(files.length).toBeGreaterThan(0);

      // Check for required files
      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/index.ts');
      expect(filePaths).toContain('src/components/test-component/types.ts');
      expect(filePaths).toContain('src/components/test-component/__tests__/test-component.test.tsx');
    });

    it('should generate validation files when hasValidation is true', () => {
      const config = { ...baseConfig, hasValidation: true };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/validation.ts');
    });

    it('should generate error handling files when hasErrorHandling is true', () => {
      const config = { ...baseConfig, hasErrorHandling: true };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/errors.ts');
      expect(filePaths).toContain('src/components/test-component/recovery.ts');
    });

    it('should generate hook files when hasHooks is true', () => {
      const config = { ...baseConfig, hasHooks: true };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/hooks/index.ts');
      expect(filePaths).toContain('src/components/test-component/hooks/useTestComponent.ts');
      expect(filePaths).toContain('src/components/test-component/__tests__/useTestComponent.test.ts');
    });

    it('should generate utility files when hasUtils is true', () => {
      const config = { ...baseConfig, hasUtils: true };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/utils/index.ts');
      expect(filePaths).toContain('src/components/test-component/utils/test-component-utils.ts');
      expect(filePaths).toContain('src/components/test-component/__tests__/test-component-utils.test.ts');
    });

    it('should generate config files when hasConfig is true', () => {
      const config = { ...baseConfig, hasConfig: true };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/config/test-component-config.md');
    });

    it('should generate UI files when hasUI is true', () => {
      const config = { ...baseConfig, hasUI: true };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/ui/index.ts');
      expect(filePaths).toContain('src/components/test-component/ui/TestComponentUI.tsx');
    });

    it('should generate core files when hasCore is true', () => {
      const config = { ...baseConfig, hasCore: true };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('src/components/test-component/core/testComponentCore.ts');
    });

    it('should generate proper PascalCase component names', () => {
      const config = { ...baseConfig, componentName: 'my-test-component' };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const typesFile = files.find(f => f.path.includes('types.ts'));
      expect(typesFile?.content).toContain('MyTestComponentProps');
      expect(typesFile?.content).toContain('MyTestComponentData');
    });

    it('should generate proper camelCase variable names', () => {
      const config = { ...baseConfig, componentName: 'my-test-component' };
      const generator = new ComponentTemplateGenerator(config);
      const files = generator.generateAllFiles();

      const indexFile = files.find(f => f.path.includes('index.ts'));
      expect(indexFile?.content).toContain('myTestComponentCore');
    });
  });

  describe('TemplateValidator', () => {
    describe('validateConfig', () => {
      it('should pass valid configuration', () => {
        const config: ComponentTemplateConfig = {
          componentName: 'valid-component',
          directory: 'src/components/valid-component'
        };

        const errors = TemplateValidator.validateConfig(config);
        expect(errors).toHaveLength(0);
      });

      it('should reject missing component name', () => {
        const config = {
          componentName: '',
          directory: 'src/components/test'
        } as ComponentTemplateConfig;

        const errors = TemplateValidator.validateConfig(config);
        expect(errors).toContain('Component name is required');
      });

      it('should reject missing directory', () => {
        const config = {
          componentName: 'test-component',
          directory: ''
        } as ComponentTemplateConfig;

        const errors = TemplateValidator.validateConfig(config);
        expect(errors).toContain('Directory is required');
      });

      it('should reject invalid component names', () => {
        const invalidNames = ['123component', '-component', '_component', 'component!'];

        invalidNames.forEach(name => {
          const config = {
            componentName: name,
            directory: 'src/components/test'
          } as ComponentTemplateConfig;

          const errors = TemplateValidator.validateConfig(config);
          expect(errors).toContain('Component name must start with a letter and contain only letters, numbers, hyphens, and underscores');
        });
      });

      it('should accept valid component names', () => {
        const validNames = ['component', 'myComponent', 'component123', 'my-component', 'my_component'];

        validNames.forEach(name => {
          const config = {
            componentName: name,
            directory: 'src/components/test'
          } as ComponentTemplateConfig;

          const errors = TemplateValidator.validateConfig(config);
          expect(errors).toHaveLength(0);
        });
      });
    });

    describe('validateDirectoryStructure', () => {
      it('should pass valid file structure', () => {
        const files: TemplateFile[] = [
          { path: 'src/components/test/index.ts', content: '' },
          { path: 'src/components/test/types.ts', content: '' },
          { path: 'src/components/test/__tests__/test.test.tsx', content: '' }
        ];

        const errors = TemplateValidator.validateDirectoryStructure(files);
        expect(errors).toHaveLength(0);
      });

      it('should reject missing required files', () => {
        const files: TemplateFile[] = [
          { path: 'src/components/test/types.ts', content: '' }
        ];

        const errors = TemplateValidator.validateDirectoryStructure(files);
        expect(errors).toContain('Missing required file: index.ts');
      });

      it('should accept files with different directory structures', () => {
        const files: TemplateFile[] = [
          { path: 'lib/components/test/index.ts', content: '' },
          { path: 'lib/components/test/types.ts', content: '' },
          { path: 'lib/components/test/hooks/index.ts', content: '' }
        ];

        const errors = TemplateValidator.validateDirectoryStructure(files);
        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('generateComponentTemplate', () => {
    it('should generate template successfully for valid config', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'test-component',
        directory: 'src/components/test-component',
        hasValidation: true,
        hasErrorHandling: true,
        hasHooks: true
      };

      const result = generateComponentTemplate(config);

      expect(result.errors).toHaveLength(0);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should return errors for invalid config', () => {
      const config = {
        componentName: '',
        directory: 'src/components/test'
      } as ComponentTemplateConfig;

      const result = generateComponentTemplate(config);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.files).toHaveLength(0);
    });

    it('should generate files with correct content structure', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'example-component',
        directory: 'src/components/example',
        description: 'An example component'
      };

      const result = generateComponentTemplate(config);

      expect(result.errors).toHaveLength(0);

      // Check that files contain expected content
      const indexFile = result.files.find(f => f.path.endsWith('index.ts'));
      expect(indexFile?.content).toContain('ExampleComponent');
      expect(indexFile?.content).toContain('An example component');

      const typesFile = result.files.find(f => f.path.endsWith('types.ts'));
      expect(typesFile?.content).toContain('ExampleComponentProps');
      expect(typesFile?.content).toContain('ExampleComponentData');
    });

    it('should handle complex component configurations', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'complex-component',
        directory: 'src/features/complex',
        hasValidation: true,
        hasErrorHandling: true,
        hasHooks: true,
        hasUtils: true,
        hasConfig: true,
        hasUI: true,
        hasCore: true,
        description: 'A complex component with all features'
      };

      const result = generateComponentTemplate(config);

      expect(result.errors).toHaveLength(0);
      expect(result.files.length).toBeGreaterThan(10); // Should have many files

      // Check for all expected file types
      const filePaths = result.files.map(f => f.path);
      expect(filePaths.some(p => p.includes('/validation.ts'))).toBe(true);
      expect(filePaths.some(p => p.includes('/errors.ts'))).toBe(true);
      expect(filePaths.some(p => p.includes('/recovery.ts'))).toBe(true);
      expect(filePaths.some(p => p.includes('/hooks/'))).toBe(true);
      expect(filePaths.some(p => p.includes('/utils/'))).toBe(true);
      expect(filePaths.some(p => p.includes('/config/'))).toBe(true);
      expect(filePaths.some(p => p.includes('/ui/'))).toBe(true);
      expect(filePaths.some(p => p.includes('/core/'))).toBe(true);
    });
  });

  describe('Template Content Quality', () => {
    it('should generate syntactically valid TypeScript', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'syntax-test',
        directory: 'src/components/syntax-test'
      };

      const result = generateComponentTemplate(config);

      // Basic syntax checks - files should not contain obvious syntax errors
      result.files.forEach(file => {
        expect(file.content).not.toContain('undefined');
        expect(file.content).not.toContain('null');
        // Check for proper imports/exports
        if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
          expect(file.content).toMatch(/import|export|interface|type|class|function/);
        }
      });
    });

    it('should generate consistent naming conventions', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'naming-test',
        directory: 'src/components/naming-test'
      };

      const result = generateComponentTemplate(config);

      const typesFile = result.files.find(f => f.path.endsWith('types.ts'));
      expect(typesFile?.content).toContain('NamingTestProps');
      expect(typesFile?.content).toContain('NamingTestData');
      expect(typesFile?.content).toContain('NamingTestError');
    });

    it('should include proper JSDoc comments', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'docs-test',
        directory: 'src/components/docs-test'
      };

      const result = generateComponentTemplate(config);

      result.files.forEach(file => {
        if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
          expect(file.content).toContain('/**');
          expect(file.content).toContain('*/');
        }
      });
    });

    it('should generate proper test file structure', () => {
      const config: ComponentTemplateConfig = {
        componentName: 'test-structure',
        directory: 'src/components/test-structure',
        hasHooks: true,
        hasUtils: true
      };

      const result = generateComponentTemplate(config);

      const testFiles = result.files.filter(f => f.path.includes('__tests__'));
      expect(testFiles.length).toBeGreaterThan(1);

      // Check for describe blocks and it blocks in test files
      testFiles.forEach(file => {
        expect(file.content).toContain('describe(');
        expect(file.content).toContain('it(');
      });
    });
  });
});
