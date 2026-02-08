/**
 * Phase 4: Interface Completion Integration Test
 * 
 * Validates that all interface completion fixes have been applied correctly
 * and that no TS2339 or TS2353 errors remain for the completed interfaces.
 */

import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

describe('Phase 4: Interface Completion Integration Test', () => {
  const clientRoot = path.resolve(__dirname, '../../../../client');
  
  it('should have all required properties in DashboardConfig interface', () => {
    const project = new Project({
      tsConfigFilePath: path.join(clientRoot, 'tsconfig.json'),
    });
    
    const dashboardBaseFile = project.getSourceFile(
      path.join(clientRoot, 'src/lib/types/dashboard/dashboard-base.ts')
    );
    
    expect(dashboardBaseFile).toBeDefined();
    
    const dashboardConfigInterface = dashboardBaseFile?.getInterface('DashboardConfig');
    expect(dashboardConfigInterface).toBeDefined();
    
    // Check for required properties
    const propertyNames = dashboardConfigInterface?.getProperties().map(p => p.getName()) || [];
    
    expect(propertyNames).toContain('maxActionItems');
    expect(propertyNames).toContain('maxTrackedTopics');
    expect(propertyNames).toContain('showCompletedActions');
    expect(propertyNames).toContain('defaultView');
    
    // Verify property types
    const maxActionItems = dashboardConfigInterface?.getProperty('maxActionItems');
    expect(maxActionItems?.getType().getText()).toMatch(/number/);
    
    const maxTrackedTopics = dashboardConfigInterface?.getProperty('maxTrackedTopics');
    expect(maxTrackedTopics?.getType().getText()).toMatch(/number/);
    
    const showCompletedActions = dashboardConfigInterface?.getProperty('showCompletedActions');
    expect(showCompletedActions?.getType().getText()).toMatch(/boolean/);
    
    const defaultView = dashboardConfigInterface?.getProperty('defaultView');
    expect(defaultView?.getType().getText()).toMatch(/DashboardSection/);
  });
  
  it('should have all required properties in TimeoutAwareLoaderProps interface', () => {
    const project = new Project({
      tsConfigFilePath: path.join(clientRoot, 'tsconfig.json'),
    });
    
    const loadingFile = project.getSourceFile(
      path.join(clientRoot, 'src/lib/types/loading.ts')
    );
    
    expect(loadingFile).toBeDefined();
    
    const timeoutAwareLoaderPropsInterface = loadingFile?.getInterface('TimeoutAwareLoaderProps');
    expect(timeoutAwareLoaderPropsInterface).toBeDefined();
    
    // Check for required properties
    const propertyNames = timeoutAwareLoaderPropsInterface?.getProperties().map(p => p.getName()) || [];
    
    expect(propertyNames).toContain('size');
    expect(propertyNames).toContain('showMessage');
    expect(propertyNames).toContain('showTimeoutWarning');
    expect(propertyNames).toContain('timeoutMessage');
    
    // Verify property types
    const size = timeoutAwareLoaderPropsInterface?.getProperty('size');
    expect(size?.getType().getText()).toMatch(/'small'|'medium'|'large'/);
    
    const showMessage = timeoutAwareLoaderPropsInterface?.getProperty('showMessage');
    expect(showMessage?.getType().getText()).toMatch(/boolean/);
    
    const showTimeoutWarning = timeoutAwareLoaderPropsInterface?.getProperty('showTimeoutWarning');
    expect(showTimeoutWarning?.getType().getText()).toMatch(/boolean/);
    
    const timeoutMessage = timeoutAwareLoaderPropsInterface?.getProperty('timeoutMessage');
    expect(timeoutMessage?.getType().getText()).toMatch(/string/);
  });
  
  it('should have all required properties in DashboardStackProps interface', () => {
    const project = new Project({
      tsConfigFilePath: path.join(clientRoot, 'tsconfig.json'),
    });
    
    const dashboardStackFile = project.getSourceFile(
      path.join(clientRoot, 'src/lib/ui/dashboard/widgets/DashboardStack.tsx')
    );
    
    expect(dashboardStackFile).toBeDefined();
    
    const dashboardStackPropsInterface = dashboardStackFile?.getInterface('DashboardStackProps');
    expect(dashboardStackPropsInterface).toBeDefined();
    
    // Check for required properties
    const propertyNames = dashboardStackPropsInterface?.getProperties().map(p => p.getName()) || [];
    
    expect(propertyNames).toContain('spacing');
    expect(propertyNames).toContain('className');
    expect(propertyNames).toContain('onSectionUpdate');
    
    // Verify property types
    const spacing = dashboardStackPropsInterface?.getProperty('spacing');
    expect(spacing?.getType().getText()).toMatch(/'tight'|'normal'|'loose'/);
    
    const className = dashboardStackPropsInterface?.getProperty('className');
    expect(className?.getType().getText()).toMatch(/string/);
  });
  
  it('should have all required properties in DashboardTabsProps interface', () => {
    const project = new Project({
      tsConfigFilePath: path.join(clientRoot, 'tsconfig.json'),
    });
    
    const dashboardTabsFile = project.getSourceFile(
      path.join(clientRoot, 'src/lib/ui/dashboard/widgets/DashboardTabs.tsx')
    );
    
    expect(dashboardTabsFile).toBeDefined();
    
    const dashboardTabsPropsInterface = dashboardTabsFile?.getInterface('DashboardTabsProps');
    expect(dashboardTabsPropsInterface).toBeDefined();
    
    // Check for required properties
    const propertyNames = dashboardTabsPropsInterface?.getProperties().map(p => p.getName()) || [];
    
    expect(propertyNames).toContain('defaultTab');
    expect(propertyNames).toContain('className');
    expect(propertyNames).toContain('onTabChange');
    expect(propertyNames).toContain('onSectionUpdate');
    
    // Verify property types
    const defaultTab = dashboardTabsPropsInterface?.getProperty('defaultTab');
    expect(defaultTab?.getType().getText()).toMatch(/string/);
    
    const className = dashboardTabsPropsInterface?.getProperty('className');
    expect(className?.getType().getText()).toMatch(/string/);
  });
  
  it('should have zodError, config, and retryCount in error constructor options', () => {
    const project = new Project({
      tsConfigFilePath: path.join(clientRoot, 'tsconfig.json'),
    });
    
    const dashboardErrorsFile = project.getSourceFile(
      path.join(clientRoot, 'src/lib/ui/dashboard/errors.ts')
    );
    
    expect(dashboardErrorsFile).toBeDefined();
    
    const baseErrorOptionsInterface = dashboardErrorsFile?.getInterface('BaseErrorOptions');
    expect(baseErrorOptionsInterface).toBeDefined();
    
    // Check for required properties
    const propertyNames = baseErrorOptionsInterface?.getProperties().map(p => p.getName()) || [];
    
    expect(propertyNames).toContain('zodError');
    expect(propertyNames).toContain('config');
    expect(propertyNames).toContain('retryCount');
    
    // Check DashboardValidationError constructor
    const dashboardValidationErrorClass = dashboardErrorsFile?.getClass('DashboardValidationError');
    expect(dashboardValidationErrorClass).toBeDefined();
    
    const constructor = dashboardValidationErrorClass?.getConstructors()[0];
    const optionsParam = constructor?.getParameter('options');
    const optionsType = optionsParam?.getType().getText();
    
    expect(optionsType).toMatch(/zodError/);
    expect(optionsType).toMatch(/config/);
    
    // Check DashboardConfigurationError constructor
    const dashboardConfigurationErrorClass = dashboardErrorsFile?.getClass('DashboardConfigurationError');
    expect(dashboardConfigurationErrorClass).toBeDefined();
    
    const configConstructor = dashboardConfigurationErrorClass?.getConstructors()[0];
    const configOptionsParam = configConstructor?.getParameter('options');
    const configOptionsType = configOptionsParam?.getType().getText();
    
    expect(configOptionsType).toMatch(/config/);
    expect(configOptionsType).toMatch(/baseConfig/);
    expect(configOptionsType).toMatch(/configJson/);
    expect(configOptionsType).toMatch(/overrides/);
    expect(configOptionsType).toMatch(/merged/);
  });
  
  it('should verify no TS2339 errors for completed interface properties', () => {
    const project = new Project({
      tsConfigFilePath: path.join(clientRoot, 'tsconfig.json'),
    });
    
    // Get all diagnostics
    const diagnostics = project.getPreEmitDiagnostics();
    
    // Filter for TS2339 errors related to our completed interfaces
    const interfacePropertyErrors = diagnostics.filter(d => {
      const code = d.getCode();
      const message = d.getMessageText().toString();
      
      return code === 2339 && (
        message.includes('maxActionItems') ||
        message.includes('maxTrackedTopics') ||
        message.includes('showCompletedActions') ||
        message.includes('defaultView') ||
        message.includes('size') && message.includes('TimeoutAwareLoader') ||
        message.includes('showMessage') ||
        message.includes('showTimeoutWarning') ||
        message.includes('timeoutMessage') ||
        message.includes('spacing') && message.includes('DashboardStack') ||
        message.includes('className') && (message.includes('DashboardStack') || message.includes('DashboardTabs')) ||
        message.includes('onTabChange') ||
        message.includes('onSectionUpdate')
      );
    });
    
    expect(interfacePropertyErrors.length).toBe(0);
  });
  
  it('should verify no TS2353 errors for error constructor options', () => {
    const project = new Project({
      tsConfigFilePath: path.join(clientRoot, 'tsconfig.json'),
    });
    
    // Get all diagnostics
    const diagnostics = project.getPreEmitDiagnostics();
    
    // Filter for TS2353 errors related to error constructor options
    const errorConstructorErrors = diagnostics.filter(d => {
      const code = d.getCode();
      const message = d.getMessageText().toString();
      
      return code === 2353 && (
        message.includes('zodError') ||
        (message.includes('config') && message.includes('Error')) ||
        message.includes('baseConfig') ||
        message.includes('configJson') ||
        message.includes('overrides') && message.includes('Error') ||
        message.includes('merged')
      );
    });
    
    expect(errorConstructorErrors.length).toBe(0);
  });
  
  it('should generate Phase 4 completion report', () => {
    const reportPath = path.join(__dirname, '../../reports/phase-4-interface-completion.md');
    
    // Verify report exists
    expect(fs.existsSync(reportPath)).toBe(true);
    
    // Read report content
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    
    // Verify report contains expected sections
    expect(reportContent).toContain('Phase 4: Interface Completion Report');
    expect(reportContent).toContain('DashboardConfig Interface');
    expect(reportContent).toContain('TimeoutAwareLoaderProps Interface');
    expect(reportContent).toContain('DashboardStackProps Interface');
    expect(reportContent).toContain('DashboardTabsProps Interface');
    expect(reportContent).toContain('Error Constructor Signatures');
    expect(reportContent).toContain('COMPLETED');
  });
});

// Tag: Feature: client-error-remediation, Phase 4: Interface Completion Integration Test
