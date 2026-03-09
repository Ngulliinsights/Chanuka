/**
 * Mock Comment Repository
 * Uses real database with simplified logic for MVP
 * Can be easily swapped for production implementation
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { readDatabase, writeDatabase, withTransaction } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
import type {
  ICommentRepository,
  Comment,
  CreateCommentData,
  UpdateCommentData,
  CommentFilters,
  CommentSort,
} from '../../domain/interfaces/ICommentRepository';

export class MockCommentRepository implements ICommentRepository {
  async create(data: CreateCommentData): Promise<AsyncServiceResult<Comment>> {
    return safeAsync(async () => {
      logger.info({ bill_id: data.bill_id }, 'Creating comment (mock)');
      
      const result = await withTransaction(async (tx) => {
        const [comment] = await tx
          .raw(`
            INSERT INTO comments (bill_id, user_id, content, parent_id)
            VALUES (?, ?, ?, ?)
            RETURNING *
          `, [data.bill_id, data.user_id, data.content, data.parent_id || null]);
        
        return comment;
      });
      
      return result as Comment;
    }, { service: 'MockCommentRepository', operation: 'create' });
  }

  async findById(id: string): Promise<AsyncServiceResult<Comment | null>> {
    return safeAsync(async () => {
      const db = await readDatabase();
      const [comment] = await db.raw(`
        SELECT * FROM comments
        WHERE id = ? AND is_deleted = FALSE
        LIMIT 1
      `, [id]);
      
      return comment || null;
    }, { service: 'MockCommentRepository', operation: 'findById' });
  }

  async find(
    filters: CommentFilters,
    sort?: CommentSort,
    limit: number = 50,
    offset: number = 0
  ): Promise<AsyncServiceResult<Comment[]>> {
    return safeAsync(async () => {
      const db = await readDatabase();
      
      // Build WHERE clause
      const conditions: string[] = ['is_deleted = FALSE'];
      const params: any[] = [];
      
      if (filters.bill_id) {
        conditions.push('bill_id = ?');
        params.push(filters.bill_id);
      }
      
      if (filters.user_id) {
        conditions.push('user_id = ?');
        params.push(filters.user_id);
      }
      
      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null) {
          conditions.push('parent_id IS NULL');
        } else {
          conditions.push('parent_id = ?');
          params.push(filters.parent_id);
        }
      }
      
      if (filters.min_upvotes) {
        conditions.push('upvotes >= ?');
        params.push(filters.min_upvotes);
      }
      
      // Build ORDER BY clause
      const sortField = sort?.field || 'created_at';
      const sortDir = sort?.direction || 'desc';
      
      // Add pagination params
      params.push(limit, offset);
      
      const query = `
        SELECT c.*
        FROM comments c
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortField} ${sortDir.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      
      const comments = await db.raw(query, params);
      
      return comments as Comment[];
    }, { service: 'MockCommentRepository', operation: 'find' });
  }

  async update(id: string, data: UpdateCommentData): Promise<AsyncServiceResult<Comment | null>> {
    return safeAsync(async () => {
      const result = await withTransaction(async (tx) => {
        const updates: string[] = [];
        const params: any[] = [];
        
        if (data.content !== undefined) {
          updates.push('content = ?');
          params.push(data.content);
        }
        
        if (data.is_verified !== undefined) {
          updates.push('is_verified = ?');
          params.push(data.is_verified);
        }
        
        if (data.is_flagged !== undefined) {
          updates.push('is_flagged = ?');
          params.push(data.is_flagged);
        }
        
        if (updates.length === 0) {
          return null;
        }
        
        updates.push('updated_at = NOW()');
        params.push(id);
        
        const [comment] = await tx.raw(`
          UPDATE comments
          SET ${updates.join(', ')}
          WHERE id = ? AND is_deleted = FALSE
          RETURNING *
        `, params);
        
        return comment;
      });
      
      return result || null;
    }, { service: 'MockCommentRepository', operation: 'update' });
  }

  async delete(id: string): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const result = await withTransaction(async (tx) => {
        const [updated] = await tx.raw(`
          UPDATE comments
          SET is_deleted = TRUE, deleted_at = NOW()
          WHERE id = ? AND is_deleted = FALSE
          RETURNING id
        `, [id]);
        
        return !!updated;
      });
      
      return result;
    }, { service: 'MockCommentRepository', operation: 'delete' });
  }

  async vote(id: string, vote: 'up' | 'down' | 'remove'): Promise<AsyncServiceResult<{ upvotes: number; downvotes: number }>> {
    return safeAsync(async () => {
      const result = await withTransaction(async (tx) => {
        let updateQuery = '';
        
        if (vote === 'up') {
          updateQuery = 'upvotes = upvotes + 1';
        } else if (vote === 'down') {
          updateQuery = 'downvotes = downvotes + 1';
        } else {
          // Remove vote - simplified (in production, track individual votes)
          updateQuery = 'upvotes = GREATEST(0, upvotes - 1)';
        }
        
        const [comment] = await tx.raw(`
          UPDATE comments
          SET ${updateQuery}
          WHERE id = ? AND is_deleted = FALSE
          RETURNING upvotes, downvotes
        `, [id]);
        
        return comment;
      });
      
      return result || { upvotes: 0, downvotes: 0 };
    }, { service: 'MockCommentRepository', operation: 'vote' });
  }

  async countByBillId(billId: string): Promise<AsyncServiceResult<number>> {
    return safeAsync(async () => {
      const db = await readDatabase();
      const [result] = await db.raw(`
        SELECT COUNT(*) as count
        FROM comments
        WHERE bill_id = ? AND is_deleted = FALSE
      `, [billId]);
      
      return parseInt(result.count, 10);
    }, { service: 'MockCommentRepository', operation: 'countByBillId' });
  }
}
