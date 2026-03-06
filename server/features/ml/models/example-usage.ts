/**
 * MWANGA Stack Usage Examples
 * Demonstrates how to use the ML analyzers
 */

import {
  sentimentAnalyzer,
  constitutionalAnalyzer,
  analyzeSentiment,
  analyzeConstitutional,
  checkMLHealth,
} from './index';

/**
 * Example 1: Sentiment Analysis
 */
async function exampleSentimentAnalysis() {
  console.log('=== Sentiment Analysis Example ===\n');

  // Simple usage
  const result1 = await analyzeSentiment(
    'This bill promotes transparency and accountability in government spending.'
  );
  console.log('Result 1:', result1);

  // With context
  const result2 = await sentimentAnalyzer.analyze({
    text: 'Hii sheria ni mbaya sana! It will hurt ordinary Kenyans.',
    context: 'Comment on healthcare bill',
    language: 'mixed',
  });
  console.log('Result 2:', result2);

  // Kenyan political terms
  const result3 = await analyzeSentiment(
    'The cartels and tenderpreneurs are destroying our economy through corruption and embezzlement.'
  );
  console.log('Result 3:', result3);
}

/**
 * Example 2: Constitutional Analysis
 */
async function exampleConstitutionalAnalysis() {
  console.log('\n=== Constitutional Analysis Example ===\n');

  const billSection = `
    Section 5: Healthcare Access Restrictions
    
    (1) All healthcare facilities shall require proof of employment 
    before providing non-emergency services.
    
    (2) Persons without valid employment documentation shall be 
    referred to designated public facilities only.
  `;

  const result = await analyzeConstitutional(
    billSection,
    'Healthcare Access Bill 2026'
  );

  console.log('Constitutional Analysis Result:');
  console.log('- Risk Level:', result.result.riskLevel);
  console.log('- Risk Score:', result.result.riskScore);
  console.log('- Relevant Articles:', result.result.citations.join(', '));
  console.log('- Summary:', result.result.summary);
  console.log('- Tier Used:', result.tier);
  console.log('- Latency:', result.latencyMs, 'ms');
  console.log('- Cached:', result.cached);
}

/**
 * Example 3: Batch Processing
 */
async function exampleBatchProcessing() {
  console.log('\n=== Batch Processing Example ===\n');

  const comments = [
    'This is a great step forward for Kenya!',
    'Corruption must end now!',
    'I support this bill completely.',
    'This will hurt small businesses.',
    'Transparency and accountability are key.',
  ];

  console.log('Analyzing', comments.length, 'comments...\n');

  const results = await Promise.all(
    comments.map((text) => analyzeSentiment(text))
  );

  results.forEach((result, index) => {
    console.log(`Comment ${index + 1}:`);
    console.log(`  Sentiment: ${result.result.sentiment}`);
    console.log(`  Confidence: ${result.result.confidence.toFixed(2)}`);
    console.log(`  Tier: ${result.tier}`);
    console.log(`  Latency: ${result.latencyMs}ms`);
    console.log();
  });
}

/**
 * Example 4: Error Handling and Fallback
 */
async function exampleErrorHandling() {
  console.log('\n=== Error Handling Example ===\n');

  try {
    // This will trigger tier fallback if Tier 1 fails
    const result = await analyzeSentiment(
      'Complex political statement with no clear sentiment indicators'
    );
    console.log('Result:', result);
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

/**
 * Example 5: Cache Performance
 */
async function exampleCachePerformance() {
  console.log('\n=== Cache Performance Example ===\n');

  const text = 'This bill promotes transparency and accountability.';

  // First call - not cached
  const start1 = Date.now();
  const result1 = await analyzeSentiment(text);
  const time1 = Date.now() - start1;

  console.log('First call (not cached):');
  console.log('  Latency:', time1, 'ms');
  console.log('  Cached:', result1.cached);

  // Second call - should be cached
  const start2 = Date.now();
  const result2 = await analyzeSentiment(text);
  const time2 = Date.now() - start2;

  console.log('\nSecond call (cached):');
  console.log('  Latency:', time2, 'ms');
  console.log('  Cached:', result2.cached);
  console.log('  Speedup:', (time1 / time2).toFixed(1), 'x');
}

/**
 * Example 6: Health Check
 */
async function exampleHealthCheck() {
  console.log('\n=== Health Check Example ===\n');

  const health = await checkMLHealth();
  console.log('ML Services Health:', health);
}

/**
 * Example 7: Custom Configuration
 */
async function exampleCustomConfiguration() {
  console.log('\n=== Custom Configuration Example ===\n');

  const { SentimentAnalyzer } = await import('./sentiment-analyzer');

  // Create analyzer with custom config
  const customAnalyzer = new SentimentAnalyzer({
    enableCaching: false, // Disable caching
    enableFallback: true,
    maxRetries: 5,
    timeoutMs: 10000,
  });

  const result = await customAnalyzer.analyze({
    text: 'Test with custom configuration',
  });

  console.log('Result with custom config:', result);
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await exampleSentimentAnalysis();
    await exampleConstitutionalAnalysis();
    await exampleBatchProcessing();
    await exampleErrorHandling();
    await exampleCachePerformance();
    await exampleHealthCheck();
    await exampleCustomConfiguration();

    console.log('\n=== All Examples Completed ===');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  exampleSentimentAnalysis,
  exampleConstitutionalAnalysis,
  exampleBatchProcessing,
  exampleErrorHandling,
  exampleCachePerformance,
  exampleHealthCheck,
  exampleCustomConfiguration,
};
