/**
 * Safeguards Networks (REFACTORED)
 * IMPROVEMENTS: Fixed Cypher injection, added error handling
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from './utils/session-manager';
import { GraphErrorHandler, GraphErrorCode, GraphError } from './error-adapter-v2';
import { logger } from '@/core/observability';

const errorHandler = new GraphErrorHandler();

export async function detectConflictOfInterest(driver: Driver, personId: string, billId: string): Promise<boolean> {
  if (!personId || !billId) {
    throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'personId and billId required' });
  }
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (p:Person {id: $personId})-[:HAS_FINANCIAL_INTEREST]->(o:Organization)
       MATCH (b:Bill {id: $billId})
       WHERE b.primary_sector = o.industry OR o.name IN b.affected_companies
       RETURN count(o) > 0 as has_conflict`,
      { personId, billId },
      { mode: 'READ' }
    );
    return result.records[0]?.get('has_conflict') || false;
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'detectConflictOfInterest', personId, billId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Conflict detection failed', cause: error as Error });
  }
}

export async function getFinancialDisclosures(driver: Driver, personId: string): Promise<unknown[]> {
  if (!personId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'personId required' });
  
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (p:Person {id: $personId})-[r:HAS_FINANCIAL_INTEREST]->(o:Organization)
       RETURN o.id as org_id, o.name as org_name, r.type as interest_type,
              r.value_range as value_range, r.verified as verified
       ORDER BY r.disclosure_date DESC`,
      { personId },
      { mode: 'READ' }
    );
    return result.records.map(r => ({
      org_id: r.get('org_id'),
      org_name: r.get('org_name'),
      interest_type: r.get('interest_type'),
      value_range: r.get('value_range'),
      verified: r.get('verified')
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getFinancialDisclosures', personId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get disclosures', cause: error as Error });
  }
}
