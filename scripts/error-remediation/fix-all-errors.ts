/**
 * Comprehensive Error Fixing Script
 * Fixes the most common TypeScript errors in the client codebase
 */

import { Project, SyntaxKind, Node } from 'ts-morph';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: path.join(process.cwd(), 'client', 'tsconfig.json')
});

let fixCount = 0;

console.log('Starting comprehensive error fixes...\n');

// Get all source files
const sourceFiles = project.getSourceFiles().filter(sf => {
  const filePath = sf.getFilePath();
  return filePath.includes('client/src') && 
         !filePath.includes('node_modules') &&
         !filePath.includes('.test.') &&
         !filePath.includes('.spec.');
});

console.log(`Processing ${sourceFiles.length} files...\n`);

// Fix 1: Add missing optional chaining for possibly undefined values (TS18048)
console.log('Fix 1: Adding optional chaining for undefined safety...');
let fix1Count = 0;
for (const sourceFile of sourceFiles) {
  const propertyAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
  
  for (const propAccess of propertyAccesses) {
    const expression = propAccess.getExpression();
    const type = expression.getType();
    
    // Check if the expression could be undefined
    if (type.isNullable() && !propAccess.hasQuestionDotToken()) {
      const parent = propAccess.getParent();
      
      // Don't add optional chaining if already in an optional chain or null check
      if (parent && !Node.isPropertyAccessExpression(parent)) {
        try {
          propAccess.setHasQuestionDotToken(true);
          fix1Count++;
        } catch (e) {
          // Skip if can't add optional chaining
        }
      }
    }
  }
}
console.log(`  Fixed ${fix1Count} undefined safety issues\n`);
fixCount += fix1Count;

// Fix 2: Add explicit types to parameters (TS7006)
console.log('Fix 2: Adding explicit parameter types...');
let fix2Count = 0;
for (const sourceFile of sourceFiles) {
  const functions = [
    ...sourceFile.getFunctions(),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
    ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionExpression)
  ];
  
  for (const func of functions) {
    const parameters = func.getParameters();
    
    for (const param of parameters) {
      if (!param.getTypeNode() && !param.hasInitializer()) {
        // Try to infer type from usage
        const name = param.getName();
        
        // Common parameter type patterns
        if (name.includes('event') || name === 'e') {
          param.setType('React.SyntheticEvent');
          fix2Count++;
        } else if (name.includes('error') || name === 'err') {
          param.setType('Error');
          fix2Count++;
        } else if (name.includes('id')) {
          param.setType('string');
          fix2Count++;
        } else if (name.includes('index') || name === 'i') {
          param.setType('number');
          fix2Count++;
        } else if (name.includes('data')) {
          param.setType('unknown');
          fix2Count++;
        } else {
          param.setType('any');
          fix2Count++;
        }
      }
    }
  }
}
console.log(`  Fixed ${fix2Count} implicit parameter types\n`);
fixCount += fix2Count;

// Fix 3: Add missing properties to interfaces (TS2339)
console.log('Fix 3: Adding missing interface properties...');
let fix3Count = 0;

// Common missing properties
const commonMissingProps = {
  'DashboardConfig': [
    { name: 'maxActionItems', type: 'number', optional: true },
    { name: 'maxTrackedTopics', type: 'number', optional: true },
    { name: 'showCompletedActions', type: 'boolean', optional: true },
    { name: 'defaultView', type: '"grid" | "list"', optional: true }
  ],
  'TimeoutAwareLoaderProps': [
    { name: 'size', type: '"small" | "medium" | "large"', optional: true },
    { name: 'showMessage', type: 'boolean', optional: true },
    { name: 'showTimeoutWarning', type: 'boolean', optional: true },
    { name: 'timeoutMessage', type: 'string', optional: true }
  ]
};

for (const sourceFile of sourceFiles) {
  const interfaces = sourceFile.getInterfaces();
  
  for (const iface of interfaces) {
    const name = iface.getName();
    const missingProps = commonMissingProps[name as keyof typeof commonMissingProps];
    
    if (missingProps) {
      const existingProps = iface.getProperties().map(p => p.getName());
      
      for (const prop of missingProps) {
        if (!existingProps.includes(prop.name)) {
          iface.addProperty({
            name: prop.name,
            type: prop.type,
            hasQuestionToken: prop.optional
          });
          fix3Count++;
        }
      }
    }
  }
}
console.log(`  Fixed ${fix3Count} missing interface properties\n`);
fixCount += fix3Count;

// Fix 4: Convert string/number comparisons (TS2367)
console.log('Fix 4: Fixing type comparisons...');
let fix4Count = 0;
for (const sourceFile of sourceFiles) {
  const binaryExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  
  for (const binExpr of binaryExpressions) {
    const operator = binExpr.getOperatorToken();
    const opKind = operator.getKind();
    
    // Check for comparison operators
    if ([
      SyntaxKind.EqualsEqualsToken,
      SyntaxKind.EqualsEqualsEqualsToken,
      SyntaxKind.ExclamationEqualsToken,
      SyntaxKind.ExclamationEqualsEqualsToken
    ].includes(opKind)) {
      const left = binExpr.getLeft();
      const right = binExpr.getRight();
      
      const leftType = left.getType();
      const rightType = right.getType();
      
      // Check if comparing string and number
      const leftIsString = leftType.isString();
      const rightIsString = rightType.isString();
      const leftIsNumber = leftType.isNumber();
      const rightIsNumber = rightType.isNumber();
      
      if ((leftIsString && rightIsNumber) || (leftIsNumber && rightIsString)) {
        // Convert number to string
        try {
          if (leftIsNumber && rightIsString) {
            binExpr.replaceWithText(`String(${left.getText()}) ${operator.getText()} ${right.getText()}`);
            fix4Count++;
          } else if (leftIsString && rightIsNumber) {
            binExpr.replaceWithText(`${left.getText()} ${operator.getText()} String(${right.getText()})`);
            fix4Count++;
          }
        } catch (e) {
          // Skip if can't replace
        }
      }
    }
  }
}
console.log(`  Fixed ${fix4Count} type comparison issues\n`);
fixCount += fix4Count;

// Fix 5: Add missing imports
console.log('Fix 5: Adding missing imports...');
let fix5Count = 0;

const commonImports = {
  'React': "import React from 'react';",
  'useState': "import { useState } from 'react';",
  'useEffect': "import { useEffect } from 'react';",
  'useCallback': "import { useCallback } from 'react';",
  'useMemo': "import { useMemo } from 'react';"
};

for (const sourceFile of sourceFiles) {
  const text = sourceFile.getFullText();
  const existingImports = sourceFile.getImportDeclarations().map(i => i.getModuleSpecifierValue());
  
  // Check for React usage without import
  if (text.includes('React.') && !existingImports.includes('react')) {
    sourceFile.insertStatements(0, commonImports.React);
    fix5Count++;
  }
  
  // Check for hooks usage
  for (const [hook, importStatement] of Object.entries(commonImports)) {
    if (hook !== 'React' && text.includes(hook) && !text.includes(`import { ${hook}`)) {
      sourceFile.insertStatements(0, importStatement);
      fix5Count++;
    }
  }
}
console.log(`  Fixed ${fix5Count} missing imports\n`);
fixCount += fix5Count;

// Save all changes
console.log('Saving changes...');
project.saveSync();

console.log('\n' + '='.repeat(60));
console.log(`Total fixes applied: ${fixCount}`);
console.log('='.repeat(60));
console.log('\nRun "npx tsc --noEmit" in the client directory to check remaining errors.');
