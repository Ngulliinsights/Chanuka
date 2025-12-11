#!/usr/bin/env tsx
/**
 * Error Management Integration Script
 * 
 * This script integrates the comprehensive but unused error management system
 * from shared/core into the client and server applications, replacing the
 * inconsistent error handling patterns identified in the bug report.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface FileReplacement {
  file: string;
  replacements: Array<{
    search: string | RegExp;
    replace: string;
    description: string;
  }>;
}

const CLIENT_INTEGRATIONS: FileReplacement[] = [
  {
    file: 'client/src/utils/logger.ts',
    replacements: [
      {
        search: /import { ErrorDomain, ErrorSeverity } from '@client\/core\/error\/constants';/g,
        replace: "import { ErrorDomain, ErrorSeverity, BaseError } from '@shared/core';",
        description: 'Replace client error imports with shared error management'
      },
      {
        search: /export { ErrorDomain, ErrorSeverity };/g,
        replace: "export { ErrorDomain, ErrorSeverity, BaseError };",
        description: 'Export shared error types'
      },
      {
        search: /export class BaseError extends Error \{[\s\S]*?\n\}/gm,
        replace: '// BaseError now imported from shared core',
        description: 'Remove duplicate BaseError class'
      }
    ]
  },
  {
    file: 'client/src/utils/unified-error-handler.ts',
    replacements: [
      {
        search: /import { logger, ErrorDomain, ErrorSeverity } from '\.\/logger';/g,
        replace: "import { logger } from './logger';\nimport { ErrorDomain, ErrorSeverity, BaseError, ValidationError, NetworkError } from '@shared/core';",
        description: 'Import error types from shared core'
      },
      {
        search: /export { ErrorDomain, ErrorSeverity } from '\.\/logger';/g,
        replace: "export { ErrorDomain, ErrorSeverity, BaseError, ValidationError, NetworkError };",
        description: 'Re-export shared error types'
      }
    ]
  }
];

const SERVER_INTEGRATIONS: FileReplacement[] = [
  {
    file: 'server/middleware/error-handler.ts',
    replacements: [
      {
        search: /class AppError extends Error/g,
        replace: 'class AppError extends BaseError',
        description: 'Extend shared BaseError instead of Error'
      }
    ]
  }
];

function applyFileReplacements(integrations: FileReplacement[], basePath: string = '.') {
  let totalReplacements = 0;
  
  for (const integration of integrations) {
    const filePath = join(basePath, integration.file);
    
    if (!existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }
    
    console.log(`🔧 Processing: ${integration.file}`);
    
    let content = readFileSync(filePath, 'utf-8');
    let fileReplacements = 0;
    
    for (const replacement of integration.replacements) {
      const beforeLength = content.length;
      content = content.replace(replacement.search, replacement.replace);
      const afterLength = content.length;
      
      if (beforeLength !== afterLength || content.includes(replacement.replace)) {
        fileReplacements++;
        console.log(`  ✅ ${replacement.description}`);
      } else {
        console.log(`  ⚠️  No match found for: ${replacement.description}`);
      }
    }
    
    if (fileReplacements > 0) {
      writeFileSync(filePath, content, 'utf-8');
      totalReplacements += fileReplacements;
      console.log(`  📝 Updated ${integration.file} with ${fileReplacements} changes`);
    } else {
      console.log(`  ℹ️  No changes needed for ${integration.file}`);
    }
  }
  
  return totalReplacements;
}

function createErrorBoundaryComponent() {
  const errorBoundaryPath = 'client/src/components/error/ErrorBoundary.tsx';
  
  if (existsSync(errorBoundaryPath)) {
    console.log(`ℹ️  ErrorBoundary already exists at ${errorBoundaryPath}`);
    return;
  }
  
  const errorBoundaryContent = `import React, { Component, ReactNode } from 'react';
import { BaseError, ErrorDomain, ErrorSeverity } from '@shared/core';
import { logger } from '../client/src/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Use the shared error management system
    const appError = new BaseError(error.message, {
      statusCode: 500,
      code: 'REACT_ERROR_BOUNDARY',
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.HIGH,
      cause: error,
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      },
      isOperational: false,
      retryable: false
    });

    logger.error('React Error Boundary caught error', {
      component: 'ErrorBoundary',
      errorId: appError.errorId
    }, appError);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={this.resetError}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
`;

  try {
    writeFileSync(errorBoundaryPath, errorBoundaryContent, 'utf-8');
    console.log(`✅ Created ErrorBoundary component at ${errorBoundaryPath}`);
  } catch (error) {
    console.error(`❌ Failed to create ErrorBoundary: ${error}`);
  }
}

function updateViteConfig() {
  const viteConfigPath = 'client/vite.config.ts';
  
  if (!existsSync(viteConfigPath)) {
    console.warn(`⚠️  Vite config not found: ${viteConfigPath}`);
    return;
  }
  
  let content = readFileSync(viteConfigPath, 'utf-8');
  
  // Add shared alias if not present
  if (!content.includes("'@shared'")) {
    content = content.replace(
      /alias: \{([^}]+)\}/,
      `alias: {$1,
        '@shared': path.resolve(rootDir, '../shared'),
        '@shared/core': path.resolve(rootDir, '../shared/core'),
      }`
    );
    
    writeFileSync(viteConfigPath, content, 'utf-8');
    console.log('✅ Updated Vite config with shared aliases');
  } else {
    console.log('ℹ️  Vite config already has shared aliases');
  }
}

function main() {
  console.log('🚀 Starting Error Management Integration...\n');
  
  // Apply client-side integrations
  console.log('📱 Integrating client-side error management...');
  const clientReplacements = applyFileReplacements(CLIENT_INTEGRATIONS);
  
  // Apply server-side integrations
  console.log('\n🖥️  Integrating server-side error management...');
  const serverReplacements = applyFileReplacements(SERVER_INTEGRATIONS);
  
  // Create ErrorBoundary component
  console.log('\n🛡️  Setting up React ErrorBoundary...');
  createErrorBoundaryComponent();
  
  // Update Vite configuration
  console.log('\n⚙️  Updating build configuration...');
  updateViteConfig();
  
  const totalReplacements = clientReplacements + serverReplacements;
  
  console.log(`\n✅ Integration complete!`);
  console.log(`   📊 Total replacements: ${totalReplacements}`);
  console.log(`   🔧 Files processed: ${CLIENT_INTEGRATIONS.length + SERVER_INTEGRATIONS.length}`);
  
  console.log('\n📋 Next steps:');
  console.log('   1. Run `npm run build:shared` to verify shared module builds');
  console.log('   2. Run `npm run type-check:client` to verify client types');
  console.log('   3. Update imports in remaining files to use shared error types');
  console.log('   4. Test error handling in development environment');
}

// Run main function
main();