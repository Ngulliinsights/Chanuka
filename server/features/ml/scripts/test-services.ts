#!/usr/bin/env tsx
/**
 * Test MWANGA Stack External Services
 * 
 * Verifies that all external services are running and accessible:
 * - Ollama (local LLM)
 * - Python Service (ML/AI microservice)
 * - Database (PostgreSQL)
 */

import { ollamaClient } from '../services/ollama-client';
import { pythonServiceClient } from '../services/python-service-client';
import { Pool } from 'pg';
import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../../../.env') });

// ============================================================================
// Test Results
// ============================================================================

interface TestResult {
  service: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

// ============================================================================
// Test Functions
// ============================================================================

async function testDatabase(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });

    // Test connection
    await pool.query('SELECT NOW()');

    // Check if MWANGA tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'ml_interactions',
        'conflict_graph_nodes',
        'conflict_graph_edges',
        'sentiment_cache'
      )
      ORDER BY table_name
    `);

    await pool.end();

    const duration = Date.now() - startTime;

    if (tablesResult.rows.length === 4) {
      return {
        service: 'Database',
        status: 'pass',
        message: `✅ Connected successfully. ${tablesResult.rows.length}/4 MWANGA tables found.`,
        duration,
      };
    } else {
      return {
        service: 'Database',
        status: 'fail',
        message: `⚠️  Connected but only ${tablesResult.rows.length}/4 MWANGA tables found. Run migration?`,
        duration,
      };
    }
  } catch (error) {
    return {
      service: 'Database',
      status: 'fail',
      message: `❌ Connection failed: ${error}`,
      duration: Date.now() - startTime,
    };
  }
}

async function testOllama(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await ollamaClient.healthCheck();
    const duration = Date.now() - startTime;

    if (isHealthy) {
      // Try to list models
      const models = await ollamaClient.listModels();
      const hasLlama = models.some(m => m.name.startsWith('llama3.2'));

      if (hasLlama) {
        return {
          service: 'Ollama',
          status: 'pass',
          message: `✅ Running with ${models.length} models. Llama 3.2 available.`,
          duration,
        };
      } else {
        return {
          service: 'Ollama',
          status: 'fail',
          message: `⚠️  Running but Llama 3.2 not found. Run: ollama pull llama3.2`,
          duration,
        };
      }
    } else {
      return {
        service: 'Ollama',
        status: 'fail',
        message: '❌ Not running. Install from https://ollama.ai/download',
        duration,
      };
    }
  } catch (error) {
    return {
      service: 'Ollama',
      status: 'fail',
      message: `❌ Connection failed: ${error}`,
      duration: Date.now() - startTime,
    };
  }
}

async function testPythonService(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const isHealthy = await pythonServiceClient.healthCheck();
    const duration = Date.now() - startTime;

    if (isHealthy) {
      return {
        service: 'Python Service',
        status: 'pass',
        message: '✅ Running and healthy.',
        duration,
      };
    } else {
      return {
        service: 'Python Service',
        status: 'fail',
        message: '❌ Not running. Start with: cd server/features/ml/python-service && python app.py',
        duration,
      };
    }
  } catch (error) {
    return {
      service: 'Python Service',
      status: 'fail',
      message: `❌ Connection failed: ${error}`,
      duration: Date.now() - startTime,
    };
  }
}

async function testOllamaGeneration(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await ollamaClient.generate(
      'What is the capital of Kenya? Answer in one word.',
      { temperature: 0.1, maxTokens: 10 }
    );

    const duration = Date.now() - startTime;

    if (response.toLowerCase().includes('nairobi')) {
      return {
        service: 'Ollama Generation',
        status: 'pass',
        message: `✅ Generated correct response: "${response.trim()}"`,
        duration,
      };
    } else {
      return {
        service: 'Ollama Generation',
        status: 'fail',
        message: `⚠️  Generated unexpected response: "${response.trim()}"`,
        duration,
      };
    }
  } catch (error) {
    return {
      service: 'Ollama Generation',
      status: 'skip',
      message: `⏭️  Skipped (Ollama not available): ${error}`,
    };
  }
}

async function testPythonSentiment(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const response = await pythonServiceClient.analyzeSentiment({
      text: 'This bill is excellent for Kenya!',
      language: 'en',
    });

    const duration = Date.now() - startTime;

    if (response.sentiment && response.confidence) {
      return {
        service: 'Python Sentiment',
        status: 'pass',
        message: `✅ Analyzed sentiment: ${response.sentiment} (${(response.confidence * 100).toFixed(0)}% confidence)`,
        duration,
      };
    } else {
      return {
        service: 'Python Sentiment',
        status: 'fail',
        message: '⚠️  Invalid response format',
        duration,
      };
    }
  } catch (error) {
    return {
      service: 'Python Sentiment',
      status: 'skip',
      message: `⏭️  Skipped (Python service not available): ${error}`,
    };
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runTests() {
  console.log('🧪 Testing MWANGA Stack External Services\n');
  console.log('='.repeat(60));
  console.log('');

  // Test 1: Database
  console.log('Testing Database...');
  results.push(await testDatabase());
  console.log('');

  // Test 2: Ollama
  console.log('Testing Ollama...');
  results.push(await testOllama());
  console.log('');

  // Test 3: Python Service
  console.log('Testing Python Service...');
  results.push(await testPythonService());
  console.log('');

  // Test 4: Ollama Generation (if Ollama is available)
  if (results.find(r => r.service === 'Ollama')?.status === 'pass') {
    console.log('Testing Ollama Generation...');
    results.push(await testOllamaGeneration());
    console.log('');
  }

  // Test 5: Python Sentiment (if Python service is available)
  if (results.find(r => r.service === 'Python Service')?.status === 'pass') {
    console.log('Testing Python Sentiment Analysis...');
    results.push(await testPythonSentiment());
    console.log('');
  }

  // Print results
  console.log('='.repeat(60));
  console.log('\n📊 Test Results:\n');

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.service}${duration}`);
    console.log(`   ${result.message}`);
    console.log('');
  });

  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log('='.repeat(60));
  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);

  if (failed > 0) {
    console.log('⚠️  Some services are not available. See setup guide:');
    console.log('   server/features/ml/SETUP_GUIDE.md\n');
    process.exit(1);
  } else {
    console.log('✅ All required services are running!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
