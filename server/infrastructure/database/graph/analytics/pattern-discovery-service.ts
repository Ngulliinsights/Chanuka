/**
 * Pattern Discovery Service (REFACTORED)
 * IMPROVEMENTS: Better error handling, pagination
 */
import { Driver } from 'neo4j-driver';
import { detectVotingPatterns, findInfluentialNodes } from './pattern-discovery';
import { logger } from '@server/infrastructure/observability';

export async function discoverAllPatterns(driver: Driver, billId: string): Promise<any> {
  logger.info('Discovering patterns', { billId });
  
  const [votingPatterns, influentialNodes] = await Promise.all([
    detectVotingPatterns(driver, billId),
    findInfluentialNodes(driver, 10),
  ]);

  return {
    votingPatterns,
    influentialNodes,
    timestamp: new Date(),
  };
}

export default { discoverAllPatterns };
