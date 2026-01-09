#!/usr/bin/env node

/**
 * WebSocket Field Usage Counter
 * 
 * Counts usage of 'data' vs 'payload' fields in WebSocket message contexts
 * to determine which field name is more prevalent in the codebase.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CLIENT_DIR = join(__dirname, 'client/src');
const SERVER_DIR = join(__dirname, 'server');
const SHARED_DIR = join(__dirname, 'shared');

function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
            traverse(fullPath);
          }
        } else if (extensions.includes(extname(item))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  traverse(dir);
  return files;
}

function countFieldUsage(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const relativePath = filePath.replace(__dirname + '/', '');
    
    const results = {
      file: relativePath,
      dataCount: 0,
      payloadCount: 0,
      dataMatches: [],
      payloadMatches: []
    };

    // Patterns to look for WebSocket-related field usage
    const patterns = {
      data: [
        /message\.data/g,
        /\.data\s*:/g,
        /WebSocketMessage.*data\s*:/g,
        /\bdata\s*\?\s*:/g,
        /\{[^}]*data\s*:/g
      ],
      payload: [
        /message\.payload/g,
        /\.payload\s*:/g,
        /WebSocketMessage.*payload\s*:/g,
        /\bpayload\s*\?\s*:/g,
        /\{[^}]*payload\s*:/g
      ]
    };

    // Count data field usage
    patterns.data.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.dataCount += matches.length;
        results.dataMatches.push(...matches);
      }
    });

    // Count payload field usage
    patterns.payload.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        results.payloadCount += matches.length;
        results.payloadMatches.push(...matches);
      }
    });

    return results;
  } catch (error) {
    return {
      file: filePath,
      dataCount: 0,
      payloadCount: 0,
      dataMatches: [],
      payloadMatches: [],
      error: error.message
    };
  }
}

function main() {
  console.log('🔍 Counting WebSocket field usage patterns...\n');
  
  // Get all TypeScript files
  const allFiles = [
    ...getAllFiles(CLIENT_DIR),
    ...getAllFiles(SERVER_DIR),
    ...getAllFiles(SHARED_DIR)
  ];

  console.log(`📁 Scanning ${allFiles.length} files...\n`);

  let totalDataCount = 0;
  let totalPayloadCount = 0;
  const filesWithData = [];
  const filesWithPayload = [];

  // Count usage in each file
  allFiles.forEach(file => {
    const result = countFieldUsage(file);
    
    if (result.dataCount > 0) {
      totalDataCount += result.dataCount;
      filesWithData.push(result);
    }
    
    if (result.payloadCount > 0) {
      totalPayloadCount += result.payloadCount;
      filesWithPayload.push(result);
    }
  });

  // Print results
  console.log('📊 USAGE STATISTICS\n');
  console.log(`🔵 DATA field usage: ${totalDataCount} instances in ${filesWithData.length} files`);
  console.log(`🟡 PAYLOAD field usage: ${totalPayloadCount} instances in ${filesWithPayload.length} files\n`);

  if (totalDataCount > totalPayloadCount) {
    console.log(`✅ RECOMMENDATION: Use 'data' field (${totalDataCount} vs ${totalPayloadCount})`);
  } else if (totalPayloadCount > totalDataCount) {
    console.log(`✅ RECOMMENDATION: Use 'payload' field (${totalPayloadCount} vs ${totalDataCount})`);
  } else {
    console.log(`⚖️  EQUAL USAGE: Both fields used equally (${totalDataCount} each)`);
  }

  console.log('\n📋 DETAILED BREAKDOWN\n');

  if (filesWithData.length > 0) {
    console.log('🔵 Files using DATA field:');
    filesWithData
      .sort((a, b) => b.dataCount - a.dataCount)
      .slice(0, 10) // Top 10
      .forEach(result => {
        console.log(`   ${result.file}: ${result.dataCount} instances`);
      });
    if (filesWithData.length > 10) {
      console.log(`   ... and ${filesWithData.length - 10} more files`);
    }
    console.log('');
  }

  if (filesWithPayload.length > 0) {
    console.log('🟡 Files using PAYLOAD field:');
    filesWithPayload
      .sort((a, b) => b.payloadCount - a.payloadCount)
      .slice(0, 10) // Top 10
      .forEach(result => {
        console.log(`   ${result.file}: ${result.payloadCount} instances`);
      });
    if (filesWithPayload.length > 10) {
      console.log(`   ... and ${filesWithPayload.length - 10} more files`);
    }
    console.log('');
  }

  // Show some example matches
  if (filesWithData.length > 0) {
    console.log('🔍 Example DATA usage patterns:');
    const examples = filesWithData[0]?.dataMatches?.slice(0, 3) || [];
    examples.forEach(match => console.log(`   "${match}"`));
    console.log('');
  }

  if (filesWithPayload.length > 0) {
    console.log('🔍 Example PAYLOAD usage patterns:');
    const examples = filesWithPayload[0]?.payloadMatches?.slice(0, 3) || [];
    examples.forEach(match => console.log(`   "${match}"`));
    console.log('');
  }

  console.log(`🎯 CONCLUSION: ${totalPayloadCount > totalDataCount ? 'PAYLOAD' : 'DATA'} field is more prevalent`);
}

main();