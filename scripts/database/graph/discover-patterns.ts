/**
 * Pattern Discovery Script - Phase 2
 *
 * Demonstrates pattern discovery, coalition detection, and influence analysis
 * Run with: npm run graph:discover-patterns
 */

import {
  findInfluencePaths,
  detectVotingCoalitions,
  detectPoliticalCommunities,
  findKeyInfluencers,
  analyzeBillInfluenceFlow,
  findFinancialInfluencePatterns,
} from '../shared/database/graph/pattern-discovery';

async function main() {
  console.log('='.repeat(80));
  console.log('Phase 2: Pattern Discovery & Influence Analysis');
  console.log('='.repeat(80));

  try {
    // 1. Detect Voting Coalitions
    console.log('\n1. DETECTING VOTING COALITIONS');
    console.log('-'.repeat(80));
    const coalitions = await detectVotingCoalitions(3);
    console.log(`Found ${coalitions.length} voting coalitions\n`);

    coalitions.slice(0, 3).forEach((coalition, idx) => {
      console.log(`Coalition ${idx + 1}:`);
      console.log(`  Members: ${coalition.member_count}`);
      console.log(`  Cohesion: ${(coalition.cohesion_score * 100).toFixed(1)}%`);
      console.log(`  Strength: ${coalition.coalition_strength}`);
      console.log(`  Member IDs: ${coalition.members.slice(0, 3).join(', ')}`);
      console.log();
    });

    // 2. Detect Political Communities
    console.log('2. DETECTING POLITICAL COMMUNITIES');
    console.log('-'.repeat(80));
    const communities = await detectPoliticalCommunities(5);
    console.log(`Found ${communities.length} political communities\n`);

    communities.slice(0, 3).forEach((community, idx) => {
      console.log(`Community ${idx + 1}: ${community.community_id}`);
      console.log(`  Size: ${community.size}`);
      console.log(`  Density: ${(community.density * 100).toFixed(1)}%`);
      console.log(`  Modularity: ${community.modularity.toFixed(3)}`);
      console.log();
    });

    // 3. Find Key Influencers (People)
    console.log('3. TOP INFLUENCERS - PEOPLE');
    console.log('-'.repeat(80));
    const personInfluencers = await findKeyInfluencers('Person', 10);
    console.log(`Found ${personInfluencers.length} key person influencers\n`);

    personInfluencers.slice(0, 5).forEach((influencer, idx) => {
      console.log(`${idx + 1}. ${influencer.name}`);
      console.log(`   ID: ${influencer.id}`);
      console.log(`   Network Centrality: ${influencer.centralityScore}`);
      console.log();
    });

    // 4. Find Key Influencers (Organizations)
    console.log('4. TOP INFLUENCERS - ORGANIZATIONS');
    console.log('-'.repeat(80));
    const orgInfluencers = await findKeyInfluencers('Organization', 10);
    console.log(`Found ${orgInfluencers.length} key organization influencers\n`);

    orgInfluencers.slice(0, 5).forEach((influencer, idx) => {
      console.log(`${idx + 1}. ${influencer.name}`);
      console.log(`   ID: ${influencer.id}`);
      console.log(`   Network Centrality: ${influencer.centralityScore}`);
      console.log();
    });

    // 5. Analyze Influence Paths (example)
    console.log('5. SAMPLE INFLUENCE PATH ANALYSIS');
    console.log('-'.repeat(80));
    if (personInfluencers.length > 0 && orgInfluencers.length > 0) {
      const samplePerson = personInfluencers[0];
      const sampleOrg = orgInfluencers[0];

      console.log(
        `Analyzing paths from ${sampleOrg.name} to ${samplePerson.name}`
      );
      console.log();

      const paths = await findInfluencePaths(sampleOrg.id, samplePerson.id, 4);

      if (paths.length > 0) {
        console.log(`Found ${paths.length} influence paths:\n`);
        paths.slice(0, 3).forEach((path, idx) => {
          console.log(`Path ${idx + 1}:`);
          console.log(
            `  Route: ${path.path.map((n) => n.entity_name).join(' → ')}`
          );
          console.log(`  Hops: ${path.hop_count}`);
          console.log(`  Relationships: ${path.relationship_types.join(', ')}`);
          console.log(`  Influence Score: ${path.influence_score}`);
          console.log(
            `  Confidence: ${(path.confidence * 100).toFixed(1)}%`
          );
          console.log();
        });
      } else {
        console.log('No direct influence paths found between selected entities.');
      }
    } else {
      console.log('Insufficient data to analyze influence paths.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('Pattern Discovery Analysis Complete');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error during pattern discovery:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
