#!/usr/bin/env ts-node
/**
 * Network Discovery Demonstration Script
 *
 * Demonstrates all 13 network discovery algorithms across the 15 relationship types
 * implemented in Phase 3 of the Graph Database implementation.
 *
 * Usage: npm run graph:discover-networks
 */

import { neo4jDriver } from '../../../shared/database/graph/driver';
import {
  NetworkDiscovery,
  NetworkQueries,
  type ParliamentaryNetworks,
  type InstitutionalNetworks,
  type EngagementNetworks,
} from '../../../shared/database/graph';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

interface DiscoveryResult {
  algorithm: string;
  domain: string;
  description: string;
  executionTime: number;
  resultsCount?: number;
  insights?: string[];
}

const results: DiscoveryResult[] = [];

/**
 * Print formatted header
 */
function printHeader(title: string): void {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

/**
 * Print section header
 */
function printSection(title: string, domain: string): void {
  console.log(`\n${colors.bright}${colors.magenta}📊 ${title} (${domain})${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);
}

/**
 * Print result summary
 */
function printResult(
  name: string,
  resultsCount: number,
  executionTime: number,
  insights: string[]
): void {
  console.log(`\n${colors.green}✓${colors.reset} ${name}`);
  console.log(`  ${colors.dim}Results: ${resultsCount} | Time: ${executionTime.toFixed(2)}ms${colors.reset}`);
  if (insights.length > 0) {
    console.log(`  ${colors.yellow}Insights:${colors.reset}`);
    insights.forEach((insight) => {
      console.log(`    • ${insight}`);
    });
  }
}

/**
 * Run all parliamentary network discovery algorithms
 */
async function discoverParliamentaryNetworks(): Promise<void> {
  printSection('Parliamentary Network Discovery', 'Legislative Process');

  try {
    // 1. Amendment Coalitions
    let start = Date.now();
    const coalitions = await NetworkDiscovery.detectAmendmentCoalitions(neo4jDriver);
    let time = Date.now() - start;
    printResult(
      'Amendment Coalitions',
      coalitions.length,
      time,
      [
        `${coalitions.length} coalitions detected`,
        'Analyzes amendment patterns and conflicts',
        'Identifies legislative collaboration patterns',
      ]
    );
    results.push({
      algorithm: 'detectAmendmentCoalitions',
      domain: 'Parliamentary',
      description: 'Amendment Coalitions',
      executionTime: time,
      resultsCount: coalitions.length,
    });

    // 2. Committee Bottlenecks
    start = Date.now();
    const bottlenecks = await NetworkDiscovery.analyzeCommitteeBottlenecks(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Committee Bottlenecks',
      bottlenecks.length,
      time,
      [
        `${bottlenecks.length} bottlenecks identified`,
        'Bills stuck in committee review',
        'Average duration analysis for legislative flow',
      ]
    );
    results.push({
      algorithm: 'analyzeCommitteeBottlenecks',
      domain: 'Parliamentary',
      description: 'Committee Bottlenecks',
      executionTime: time,
      resultsCount: bottlenecks.length,
    });

    // 3. Bill Evolution Patterns
    start = Date.now();
    const patterns = await NetworkDiscovery.identifyBillEvolutionPatterns(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Bill Evolution Patterns',
      patterns.length,
      time,
      [
        `${patterns.length} evolution patterns identified`,
        'Tracks bill modifications across versions',
        'Measures stability and controversy levels',
      ]
    );
    results.push({
      algorithm: 'identifyBillEvolutionPatterns',
      domain: 'Parliamentary',
      description: 'Bill Evolution Patterns',
      executionTime: time,
      resultsCount: patterns.length,
    });

    // 4. Sponsorship Patterns
    start = Date.now();
    const sponsorships = await NetworkDiscovery.findSponsorshipPatterns(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Sponsorship Patterns',
      sponsorships.length,
      time,
      [
        `${sponsorships.length} sponsorship patterns found`,
        'Primary and co-sponsorship relationships',
        'Policy focus and legislative priorities',
      ]
    );
    results.push({
      algorithm: 'findSponsorshipPatterns',
      domain: 'Parliamentary',
      description: 'Sponsorship Patterns',
      executionTime: time,
      resultsCount: sponsorships.length,
    });
  } catch (error) {
    console.error(`${colors.yellow}⚠${colors.reset} Parliamentary discovery error:`, error);
  }
}

/**
 * Run all institutional network discovery algorithms
 */
async function discoverInstitutionalNetworks(): Promise<void> {
  printSection('Institutional Network Discovery', 'Political Economy');

  try {
    // 1. Patronage Networks
    let start = Date.now();
    const patronage = await NetworkDiscovery.detectPatronageNetworks(neo4jDriver);
    let time = Date.now() - start;
    printResult(
      'Patronage Networks',
      patronage.length,
      time,
      [
        `${patronage.length} patronage networks detected`,
        'Multi-hop patron-client relationships',
        'Corruption risk assessment scores',
      ]
    );
    results.push({
      algorithm: 'detectPatronageNetworks',
      domain: 'Institutional',
      description: 'Patronage Networks',
      executionTime: time,
      resultsCount: patronage.length,
    });

    // 2. Ethnic Representation Analysis
    start = Date.now();
    const ethnic = await NetworkDiscovery.analyzeEthnicRepresentation(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Ethnic Representation',
      ethnic.length,
      time,
      [
        `${ethnic.length} ethnic groups analyzed`,
        'Representation gap detection',
        'Voting bloc alignment patterns',
      ]
    );
    results.push({
      algorithm: 'analyzeEthnicRepresentation',
      domain: 'Institutional',
      description: 'Ethnic Representation',
      executionTime: time,
      resultsCount: ethnic.length,
    });

    // 3. Tender Anomalies
    start = Date.now();
    const tenders = await NetworkDiscovery.detectTenderAnomalies(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Tender Anomalies',
      tenders.length,
      time,
      [
        `${tenders.length} suspicious tenders detected`,
        'Patron connection analysis',
        'Award justification scoring',
      ]
    );
    results.push({
      algorithm: 'detectTenderAnomalies',
      domain: 'Institutional',
      description: 'Tender Anomalies',
      executionTime: time,
      resultsCount: tenders.length,
    });

    // 4. Educational Networks
    start = Date.now();
    const education = await NetworkDiscovery.analyzeEducationalNetworks(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Educational Networks',
      education.length,
      time,
      [
        `${education.length} educational networks identified`,
        'Alumni in power analysis',
        'Prestige and sector influence scores',
      ]
    );
    results.push({
      algorithm: 'analyzeEducationalNetworks',
      domain: 'Institutional',
      description: 'Educational Networks',
      executionTime: time,
      resultsCount: education.length,
    });
  } catch (error) {
    console.error(`${colors.yellow}⚠${colors.reset} Institutional discovery error:`, error);
  }
}

/**
 * Run all engagement network discovery algorithms
 */
async function discoverEngagementNetworks(): Promise<void> {
  printSection('Engagement Network Discovery', 'Citizen & Advocacy');

  try {
    // 1. Sentiment Clusters
    let start = Date.now();
    const sentiment = await NetworkDiscovery.mapSentimentClusters(neo4jDriver);
    let time = Date.now() - start;
    printResult(
      'Sentiment Clusters',
      sentiment.length,
      time,
      [
        `${sentiment.length} sentiment clusters mapped`,
        'Comment network polarization analysis',
        'Topic-based discourse clusters',
      ]
    );
    results.push({
      algorithm: 'mapSentimentClusters',
      domain: 'Engagement',
      description: 'Sentiment Clusters',
      executionTime: time,
      resultsCount: sentiment.length,
    });

    // 2. Key Advocates
    start = Date.now();
    const advocates = await NetworkDiscovery.identifyKeyAdvocates(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Key Advocates',
      advocates.length,
      time,
      [
        `${advocates.length} key advocates identified`,
        'Campaign participation and reach',
        'Advocacy score calculation',
      ]
    );
    results.push({
      algorithm: 'identifyKeyAdvocates',
      domain: 'Engagement',
      description: 'Key Advocates',
      executionTime: time,
      resultsCount: advocates.length,
    });

    // 3. Campaign Effectiveness
    start = Date.now();
    const campaigns = await NetworkDiscovery.analyzeCampaignEffectiveness(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Campaign Effectiveness',
      campaigns.length,
      time,
      [
        `${campaigns.length} campaigns analyzed`,
        'Participant recruitment metrics',
        'Action completion rate tracking',
      ]
    );
    results.push({
      algorithm: 'analyzeCampaignEffectiveness',
      domain: 'Engagement',
      description: 'Campaign Effectiveness',
      executionTime: time,
      resultsCount: campaigns.length,
    });

    // 4. Constituency Mobilization
    start = Date.now();
    const mobilization = await NetworkDiscovery.detectConstituencyMobilization(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'Constituency Mobilization',
      mobilization.length,
      time,
      [
        `${mobilization.length} constituencies analyzed`,
        'Advocate density and engagement levels',
        'Mobilization potential scoring',
      ]
    );
    results.push({
      algorithm: 'detectConstituencyMobilization',
      domain: 'Engagement',
      description: 'Constituency Mobilization',
      executionTime: time,
      resultsCount: mobilization.length,
    });

    // 5. User Influence Networks
    start = Date.now();
    const influence = await NetworkDiscovery.mapUserInfluenceNetworks(neo4jDriver);
    time = Date.now() - start;
    printResult(
      'User Influence Networks',
      influence.length,
      time,
      [
        `${influence.length} influence networks mapped`,
        'Trust domain identification',
        'Cross-network influence propagation',
      ]
    );
    results.push({
      algorithm: 'mapUserInfluenceNetworks',
      domain: 'Engagement',
      description: 'User Influence Networks',
      executionTime: time,
      resultsCount: influence.length,
    });
  } catch (error) {
    console.error(`${colors.yellow}⚠${colors.reset} Engagement discovery error:`, error);
  }
}

/**
 * Print final summary and statistics
 */
function printSummary(): void {
  printHeader('Discovery Summary');

  // Group by domain
  const byDomain = results.reduce(
    (acc, result) => {
      if (!acc[result.domain]) {
        acc[result.domain] = [];
      }
      acc[result.domain].push(result);
      return acc;
    },
    {} as Record<string, DiscoveryResult[]>
  );

  // Print domain summaries
  for (const [domain, domainResults] of Object.entries(byDomain)) {
    const totalTime = domainResults.reduce((sum, r) => sum + r.executionTime, 0);
    const totalResults = domainResults.reduce((sum, r) => sum + (r.resultsCount || 0), 0);

    console.log(`\n${colors.bright}${domain}${colors.reset}`);
    console.log(`  Algorithms: ${domainResults.length}`);
    console.log(`  Total Results: ${totalResults}`);
    console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
  }

  // Overall statistics
  const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
  const totalResults = results.reduce((sum, r) => sum + (r.resultsCount || 0), 0);
  const avgTime = totalTime / results.length;

  console.log(`\n${colors.bright}${colors.cyan}Overall Statistics${colors.reset}`);
  console.log(`  Total Algorithms: ${results.length}`);
  console.log(`  Total Results Discovered: ${totalResults}`);
  console.log(`  Total Execution Time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average Algorithm Time: ${avgTime.toFixed(2)}ms`);

  console.log(
    `\n${colors.green}✓${colors.reset} Discovery complete. All 15 relationship types analyzed.`
  );
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  printHeader('Graph Network Discovery - Phase 3 Demonstration');

  console.log(`${colors.dim}Starting discovery of 15 relationship types across 3 domains...${colors.reset}`);
  console.log(
    `${colors.dim}This demonstrates all 13 discovery algorithms in the Phase 3 implementation.${colors.reset}`
  );

  try {
    // Run parliamentary discoveries
    await discoverParliamentaryNetworks();

    // Run institutional discoveries
    await discoverInstitutionalNetworks();

    // Run engagement discoveries
    await discoverEngagementNetworks();

    // Print summary
    printSummary();

    console.log(
      `\n${colors.bright}${colors.green}✓ All network discoveries completed successfully!${colors.reset}\n`
    );
  } catch (error) {
    console.error(`${colors.bright}${colors.yellow}Error during discovery:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Close Neo4j driver
    if (neo4jDriver) {
      await neo4jDriver.close();
    }
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
