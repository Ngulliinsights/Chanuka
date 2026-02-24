/**
 * Pretext Repository
 * 
 * Data access layer for pretext detection
 */

import { db } from '@server/infrastructure/database';
import { logger } from '@server/infrastructure/observability';
import type { PretextAlert, PretextAnalysisResult } from '../domain/types';

export class PretextRepository {
  /**
   * Save analysis result
   */
  async saveAnalysis(result: PretextAnalysisResult): Promise<void> {
    try {
      // Store in database (using JSON for now - can be normalized later)
      await db.query(
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
    } catch (error) {
      logger.error({
        component: 'PretextRepository',
        error
      }, 'Failed to save analysis');
      throw error;
    }
  }

  /**
   * Get analysis for a bill
   */
  async getAnalysis(billId: string): Promise<PretextAnalysisResult | null> {
    try {
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
    } catch (error) {
      logger.error({
        component: 'PretextRepository',
        error
      }, 'Failed to get analysis');
      throw error;
    }
  }

  /**
   * Create alert
   */
  async createAlert(alert: Omit<PretextAlert, 'id' | 'createdAt'>): Promise<PretextAlert> {
    try {
      const result = await db.query(
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
    } catch (error) {
      logger.error({
        component: 'PretextRepository',
        error
      }, 'Failed to create alert');
      throw error;
    }
  }

  /**
   * Get alerts
   */
  async getAlerts(filters?: { status?: string; limit?: number }): Promise<PretextAlert[]> {
    try {
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

      return result.rows.map(row => ({
        id: row.id,
        billId: row.bill_id,
        detections: JSON.parse(row.detections),
        score: row.score,
        status: row.status,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      logger.error({
        component: 'PretextRepository',
        error
      }, 'Failed to get alerts');
      throw error;
    }
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      await db.query(
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
    } catch (error) {
      logger.error({
        component: 'PretextRepository',
        error
      }, 'Failed to update alert status');
      throw error;
    }
  }
}
