/**
 * Pretext Repository
 * 
 * Data access layer for pretext detection
 */

import { BaseRepository } from '@server/infrastructure/database/repository/base-repository';
import type { Result } from '@shared/core/result';
import { logger } from '@server/infrastructure/observability';
import type { PretextAlert, PretextAnalysisResult } from '../domain/types';

export class PretextRepository extends BaseRepository<PretextAnalysisResult> {
  constructor() {
    super({
      entityName: 'PretextDetection',
      enableCache: true,
      cacheTTL: 900, // 15 minutes (analysis results, medium volatility)
      enableLogging: true,
    });
  }

  /**
   * Save analysis result
   */
  async saveAnalysis(result: PretextAnalysisResult): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx) => {
        // Store in database (using JSON for now - can be normalized later)
        await tx.query(
          `INSERT INTO pretext_analyses (bill_id, detections, score, confidence, analyzed_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (bill_id) 
           DO UPDATE SET 
             detections = $2,
             score = $3,
             confidence = $4,
             analyzed_at = $5`,
          [
            result.billId,
            JSON.stringify(result.detections),
            result.score,
            result.confidence,
            result.analyzedAt
          ]
        );

        logger.info({
          component: 'PretextRepository',
          billId: result.billId
        }, 'Analysis saved');
      },
      [`pretext:analysis:${result.billId}`, 'pretext:analysis:*']
    );
  }

  /**
   * Get analysis for a bill
   */
  async getAnalysis(billId: string): Promise<Result<PretextAnalysisResult | null, Error>> {
    return this.executeRead(
      async (db) => {
        const result = await db.query(
          `SELECT bill_id, detections, score, confidence, analyzed_at
           FROM pretext_analyses
           WHERE bill_id = $1`,
          [billId]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        return {
          billId: row.bill_id,
          detections: JSON.parse(row.detections),
          score: row.score,
          confidence: row.confidence,
          analyzedAt: new Date(row.analyzed_at)
        };
      },
      `pretext:analysis:${billId}`
    );
  }

  /**
   * Create alert
   */
  async createAlert(alert: Omit<PretextAlert, 'id' | 'createdAt'>): Promise<Result<PretextAlert, Error>> {
    return this.executeWrite(
      async (tx) => {
        const result = await tx.query(
          `INSERT INTO pretext_alerts (bill_id, detections, score, status, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id, bill_id, detections, score, status, reviewed_by, reviewed_at, created_at`,
          [
            alert.billId,
            JSON.stringify(alert.detections),
            alert.score,
            alert.status
          ]
        );

        const row = result.rows[0];
        return {
          id: row.id,
          billId: row.bill_id,
          detections: JSON.parse(row.detections),
          score: row.score,
          status: row.status,
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
          createdAt: new Date(row.created_at)
        };
      },
      ['pretext:alerts:*']
    );
  }

  /**
   * Get alerts
   */
  async getAlerts(filters?: { status?: string; limit?: number }): Promise<Result<PretextAlert[], Error>> {
    return this.executeRead(
      async (db) => {
        let query = `
          SELECT id, bill_id, detections, score, status, reviewed_by, reviewed_at, created_at
          FROM pretext_alerts
        `;
        const params: any[] = [];

        if (filters?.status) {
          query += ` WHERE status = $1`;
          params.push(filters.status);
        }

        query += ` ORDER BY created_at DESC`;

        if (filters?.limit) {
          query += ` LIMIT $${params.length + 1}`;
          params.push(filters.limit);
        }

        const result = await db.query(query, params);

        return result.rows.map((row: any) => ({
          id: row.id,
          billId: row.bill_id,
          detections: JSON.parse(row.detections),
          score: row.score,
          status: row.status,
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
          createdAt: new Date(row.created_at)
        }));
      },
      filters?.status ? `pretext:alerts:status:${filters.status}` : 'pretext:alerts:all'
    );
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    notes?: string
  ): Promise<Result<void, Error>> {
    return this.executeWrite(
      async (tx) => {
        await tx.query(
          `UPDATE pretext_alerts
           SET status = $1, reviewed_by = $2, reviewed_at = NOW(), notes = $3
           WHERE id = $4`,
          [status, reviewedBy, notes, alertId]
        );

        logger.info({
          component: 'PretextRepository',
          alertId,
          status
        }, 'Alert status updated');
      },
      ['pretext:alerts:*', `pretext:alert:${alertId}`]
    );
  }

  /**
   * Get admin users
   */
  async getAdminUsers(): Promise<Result<Array<{ id: string; email: string }>, Error>> {
    return this.executeRead(
      async (db) => {
        const result = await db.query(
          `SELECT id, email
           FROM users
           WHERE role = 'admin' AND is_active = true`
        );

        return result.rows.map((row: any) => ({
          id: row.id,
          email: row.email
        }));
      },
      'pretext:admin:users'
    );
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId: string): Promise<Result<PretextAlert | null, Error>> {
    return this.executeRead(
      async (db) => {
        const result = await db.query(
          `SELECT id, bill_id, detections, score, status, reviewed_by, reviewed_at, created_at
           FROM pretext_alerts
           WHERE id = $1`,
          [alertId]
        );

        if (result.rows.length === 0) {
          return null;
        }

        const row = result.rows[0];
        return {
          id: row.id,
          billId: row.bill_id,
          detections: JSON.parse(row.detections),
          score: row.score,
          status: row.status,
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
          createdAt: new Date(row.created_at)
        };
      },
      `pretext:alert:${alertId}`
    );
  }

  /**
   * Get users interested in a bill (followers, commenters, etc.)
   */
  async getUsersInterestedInBill(billId: string): Promise<Result<Array<{ id: string; email: string }>, Error>> {
    return this.executeRead(
      async (db) => {
        const result = await db.query(
          `SELECT DISTINCT u.id, u.email
           FROM users u
           WHERE u.id IN (
             -- Users who commented on the bill
             SELECT DISTINCT user_id FROM comments WHERE bill_id = $1
             UNION
             -- Users who voted on the bill
             SELECT DISTINCT user_id FROM votes WHERE bill_id = $1
             UNION
             -- Users tracking the bill
             SELECT DISTINCT user_id FROM bill_tracking WHERE bill_id = $1
           )
           AND u.is_active = true`,
          [billId]
        );

        return result.rows.map((row: any) => ({
          id: row.id,
          email: row.email
        }));
      },
      `pretext:interested:${billId}`
    );
  }
}
