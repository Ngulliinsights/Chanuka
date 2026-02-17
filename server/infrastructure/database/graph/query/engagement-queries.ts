/**
 * Engagement Queries (REFACTORED)
 * IMPROVEMENTS: Fixed missing LIMIT clauses, added pagination, error handling
 */
import type { Driver } from 'neo4j-driver';

import { GraphErrorHandler, GraphErrorCode, GraphError } from '../error-adapter-v2';
import { QUERY_CONFIG } from '../config/graph-config';
import { executeCypherSafely } from '../utils/session-manager';
import { withPagination, type PaginationOptions } from '../utils/query-builder';

const errorHandler = new GraphErrorHandler();

export async function getMostEngagedUsers(driver: Driver, options: PaginationOptions = {}): Promise<unknown[]> {
  const baseQuery = `
    MATCH (u:User)
    RETURN u.id as id, u.email as email,
           coalesce(u.total_engagement_score, 0) as engagement_score
    ORDER BY engagement_score DESC
  `;

  const { query, params } = withPagination(baseQuery, options);

  try {
    const result = await executeCypherSafely(driver, query, params, { mode: 'READ' });
    return result.records.map((r: unknown) => ({
      id: r.get('id'),
      email: r.get('email'),
      engagement_score: Number(r.get('engagement_score'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getMostEngagedUsers' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get engaged users', cause: error as Error });
  }
}

export async function getTrendingBills(driver: Driver, limit: number = QUERY_CONFIG.DEFAULT_LIMIT): Promise<unknown[]> {
  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (b:Bill)
       RETURN b.id as id, b.title as title,
              coalesce(b.trending_score, 0) as trending_score,
              coalesce(b.view_count, 0) as views
       ORDER BY trending_score DESC
       LIMIT $limit`,
      { limit },
      { mode: 'READ' }
    );
    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title'),
      trending_score: Number(r.get('trending_score')),
      views: Number(r.get('views'))
    }));
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getTrendingBills' });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get trending bills', cause: error as Error });
  }
}

export async function getUserActivity(driver: Driver, userId: string): Promise<any> {
  if (!userId) throw new GraphError({ code: GraphErrorCode.INVALID_INPUT, message: 'userId required' });

  try {
    const result = await executeCypherSafely(
      driver,
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[v:VOTED_ON]-()
       WITH u, count(v) as votes
       OPTIONAL MATCH (u)-[:AUTHORED]->(c:Comment)
       WITH u, votes, count(c) as comments
       OPTIONAL MATCH (u)-[b:BOOKMARKED]-()
       RETURN votes, comments, count(b) as bookmarks,
              coalesce(u.total_engagement_score, 0) as total_score`,
      { userId },
      { mode: 'READ' }
    );

    if (result.records.length === 0) return null;

    const r: any = result.records[0];
    return {
      votes: Number(r.get('votes')),
      comments: Number(r.get('comments')),
      bookmarks: Number(r.get('bookmarks')),
      total_score: Number(r.get('total_score'))
    };
  } catch (error) {
    errorHandler.handle(error as Error, { operation: 'getUserActivity', userId });
    throw new GraphError({ code: GraphErrorCode.QUERY_FAILED, message: 'Failed to get user activity', cause: error as Error });
  }
}
