// ============================================================================
// ADVOCACY COORDINATION - Campaign Repository Implementation
// ============================================================================

import { ICampaignRepository } from '../../domain/repositories/campaign-repository.js';
import { Campaign, NewCampaign } from '../../domain/entities/campaign.js';
import { CampaignFilters, PaginationOptions, CampaignMetrics } from '../../types/index.js';
import { BaseRepository } from '../../../infrastructure/database/repositories/base-repository.js';
import { logger } from '../../../../shared/core/index.js';
import { v4 as uuidv4 } from 'uuid';

export class CampaignRepositoryImpl extends BaseRepository implements ICampaignRepository {
  
  async findById(id: string): Promise<Campaign | null> {
    try {
      const result = await this.db.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCampaign(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find campaign by ID', error, { 
        campaignId: id,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findAll(filters: CampaignFilters = {}, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<Campaign[]> {
    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      const { limit, offset } = this.buildPagination(pagination);
      const orderBy = this.buildOrderBy(pagination.sortBy, pagination.sortOrder);

      const result = await this.db.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        ${whereClause}
        GROUP BY c.id
        ${orderBy}
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find campaigns', error, { 
        filters,
        pagination,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async create(campaign: NewCampaign): Promise<Campaign> {
    try {
      const id = uuidv4();
      const now = new Date();

      await this.db.execute(`
        INSERT INTO campaigns (
          id, title, description, bill_id, organizer_id, organization_name,
          status, category, tags, target_counties, objectives, strategy,
          is_public, requires_approval, max_participants, participant_count,
          start_date, end_date, resources, is_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        campaign.title,
        campaign.description,
        campaign.billId,
        campaign.organizerId,
        campaign.organizationName || null,
        'draft',
        campaign.category,
        JSON.stringify(campaign.tags || []),
        JSON.stringify(campaign.targetCounties || []),
        JSON.stringify(campaign.objectives),
        JSON.stringify(campaign.strategy),
        campaign.isPublic ?? true,
        campaign.requiresApproval ?? false,
        campaign.maxParticipants || null,
        0,
        campaign.startDate,
        campaign.endDate || null,
        JSON.stringify(campaign.resources || { documents: [], links: [], templates: [] }),
        false,
        now,
        now
      ]);

      // Add organizer as first participant
      await this.addParticipant(id, campaign.organizerId, {
        joinedAt: now,
        role: 'organizer'
      });

      const createdCampaign = await this.findById(id);
      if (!createdCampaign) {
        throw new Error('Failed to retrieve created campaign');
      }

      logger.info('Campaign created', { 
        campaignId: id,
        title: campaign.title,
        component: 'CampaignRepositoryImpl' 
      });

      return createdCampaign;
    } catch (error) {
      logger.error('Failed to create campaign', error, { 
        title: campaign.title,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
    try {
      const { setClause, params } = this.buildUpdateClause(updates);
      
      if (setClause.length === 0) {
        return await this.findById(id);
      }

      await this.db.execute(`
        UPDATE campaigns 
        SET ${setClause.join(', ')}, updated_at = ?
        WHERE id = ?
      `, [...params, new Date(), id]);

      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update campaign', error, { 
        campaignId: id,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Delete related data first
      await this.db.execute('DELETE FROM campaign_participants WHERE campaign_id = ?', [id]);
      await this.db.execute('DELETE FROM action_items WHERE campaign_id = ?', [id]);
      
      const result = await this.db.execute('DELETE FROM campaigns WHERE id = ?', [id]);
      
      const success = result.rowsAffected > 0;
      
      if (success) {
        logger.info('Campaign deleted', { 
          campaignId: id,
          component: 'CampaignRepositoryImpl' 
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to delete campaign', error, { 
        campaignId: id,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findByBillId(billId: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    return await this.findAll({ ...filters, billId });
  }

  async findByOrganizer(organizerId: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    return await this.findAll({ ...filters, organizerId });
  }

  async findByParticipant(userId: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      const additionalWhere = whereClause ? `${whereClause} AND` : 'WHERE';

      const result = await this.db.execute(`
        SELECT DISTINCT c.*, 
               COUNT(DISTINCT cp2.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        INNER JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN campaign_participants cp2 ON c.id = cp2.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        ${additionalWhere} cp.user_id = ?
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `, [...params, userId]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find campaigns by participant', error, { 
        userId,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findByCounty(county: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      const additionalWhere = whereClause ? `${whereClause} AND` : 'WHERE';

      const result = await this.db.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        ${additionalWhere} JSON_EXTRACT(c.target_counties, '$') LIKE ?
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `, [...params, `%"${county}"%`]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find campaigns by county', error, { 
        county,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findByCategory(category: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    return await this.findAll({ ...filters, category });
  }

  async findByStatus(status: Campaign['status']): Promise<Campaign[]> {
    return await this.findAll({ status });
  }

  async findActive(): Promise<Campaign[]> {
    return await this.findAll({ status: 'active' });
  }

  async findExpired(): Promise<Campaign[]> {
    try {
      const result = await this.db.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        WHERE c.end_date IS NOT NULL AND c.end_date < ? AND c.status = 'active'
        GROUP BY c.id
        ORDER BY c.end_date ASC
      `, [new Date()]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find expired campaigns', error, { 
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findRequiringAttention(): Promise<Campaign[]> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const result = await this.db.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        WHERE c.status = 'active' AND (
          c.updated_at < ? OR
          (c.end_date IS NOT NULL AND c.end_date < DATE_ADD(NOW(), INTERVAL 7 DAY))
        )
        GROUP BY c.id
        HAVING completion_rate < 0.3 OR participant_count < 5
        ORDER BY c.updated_at ASC
      `, [sevenDaysAgo]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find campaigns requiring attention', error, { 
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async addParticipant(campaignId: string, userId: string, metadata: Record<string, any> = {}): Promise<boolean> {
    try {
      await this.db.execute(`
        INSERT INTO campaign_participants (campaign_id, user_id, joined_at, role, metadata)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE updated_at = NOW()
      `, [
        campaignId,
        userId,
        metadata.joinedAt || new Date(),
        metadata.role || 'participant',
        JSON.stringify(metadata)
      ]);

      // Update participant count
      await this.db.execute(`
        UPDATE campaigns 
        SET participant_count = (
          SELECT COUNT(*) FROM campaign_participants WHERE campaign_id = ?
        )
        WHERE id = ?
      `, [campaignId, campaignId]);

      return true;
    } catch (error) {
      logger.error('Failed to add campaign participant', error, { 
        campaignId,
        userId,
        component: 'CampaignRepositoryImpl' 
      });
      return false;
    }
  }

  async removeParticipant(campaignId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.execute(`
        DELETE FROM campaign_participants 
        WHERE campaign_id = ? AND user_id = ?
      `, [campaignId, userId]);

      if (result.rowsAffected > 0) {
        // Update participant count
        await this.db.execute(`
          UPDATE campaigns 
          SET participant_count = (
            SELECT COUNT(*) FROM campaign_participants WHERE campaign_id = ?
          )
          WHERE id = ?
        `, [campaignId, campaignId]);
      }

      return result.rowsAffected > 0;
    } catch (error) {
      logger.error('Failed to remove campaign participant', error, { 
        campaignId,
        userId,
        component: 'CampaignRepositoryImpl' 
      });
      return false;
    }
  }

  async getParticipants(campaignId: string, pagination: PaginationOptions = { page: 1, limit: 10 }): Promise<any[]> {
    try {
      const { limit, offset } = this.buildPagination(pagination);

      const result = await this.db.execute(`
        SELECT cp.*, u.username, u.email, up.full_name
        FROM campaign_participants cp
        LEFT JOIN users u ON cp.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE cp.campaign_id = ?
        ORDER BY cp.joined_at ASC
        LIMIT ? OFFSET ?
      `, [campaignId, limit, offset]);

      return result.rows.map(row => ({
        userId: row.user_id,
        username: row.username,
        fullName: row.full_name,
        joinedAt: row.joined_at,
        role: row.role,
        contributionScore: this.calculateContributionScore(row),
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    } catch (error) {
      logger.error('Failed to get campaign participants', error, { 
        campaignId,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async getParticipantCount(campaignId: string): Promise<number> {
    try {
      const result = await this.db.execute(`
        SELECT COUNT(*) as count 
        FROM campaign_participants 
        WHERE campaign_id = ?
      `, [campaignId]);

      return result.rows[0]?.count || 0;
    } catch (error) {
      logger.error('Failed to get participant count', error, { 
        campaignId,
        component: 'CampaignRepositoryImpl' 
      });
      return 0;
    }
  }

  async isParticipant(campaignId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.execute(`
        SELECT 1 FROM campaign_participants 
        WHERE campaign_id = ? AND user_id = ?
      `, [campaignId, userId]);

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to check participant status', error, { 
        campaignId,
        userId,
        component: 'CampaignRepositoryImpl' 
      });
      return false;
    }
  }

  async updateMetrics(campaignId: string, metrics: Partial<CampaignMetrics>): Promise<boolean> {
    try {
      await this.db.execute(`
        UPDATE campaigns 
        SET metrics = ?, updated_at = ?
        WHERE id = ?
      `, [JSON.stringify(metrics), new Date(), campaignId]);

      return true;
    } catch (error) {
      logger.error('Failed to update campaign metrics', error, { 
        campaignId,
        component: 'CampaignRepositoryImpl' 
      });
      return false;
    }
  }

  async getMetrics(campaignId: string): Promise<CampaignMetrics | null> {
    try {
      const result = await this.db.execute(`
        SELECT metrics FROM campaigns WHERE id = ?
      `, [campaignId]);

      if (result.rows.length === 0) {
        return null;
      }

      const metricsJson = result.rows[0].metrics;
      return metricsJson ? JSON.parse(metricsJson) : null;
    } catch (error) {
      logger.error('Failed to get campaign metrics', error, { 
        campaignId,
        component: 'CampaignRepositoryImpl' 
      });
      return null;
    }
  }

  async getCampaignAnalytics(campaignId: string): Promise<any> {
    try {
      // This would be implemented with more complex analytics queries
      // For now, return basic analytics structure
      const [participationTrend, geographicDistribution, engagementMetrics] = await Promise.all([
        this.getParticipationTrend(campaignId),
        this.getGeographicDistribution(campaignId),
        this.getEngagementMetrics(campaignId)
      ]);

      return {
        participationTrend,
        actionCompletionRate: engagementMetrics.completionRate,
        geographicDistribution,
        demographicBreakdown: {},
        engagementMetrics
      };
    } catch (error) {
      logger.error('Failed to get campaign analytics', error, { 
        campaignId,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async search(query: string, filters: CampaignFilters = {}): Promise<Campaign[]> {
    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      const additionalWhere = whereClause ? `${whereClause} AND` : 'WHERE';

      const result = await this.db.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        ${additionalWhere} (
          c.title LIKE ? OR 
          c.description LIKE ? OR 
          JSON_EXTRACT(c.tags, '$') LIKE ?
        )
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `, [...params, `%${query}%`, `%${query}%`, `%${query}%`]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to search campaigns', error, { 
        query,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findSimilar(campaignId: string, limit: number = 5): Promise<Campaign[]> {
    try {
      // Find campaigns with similar tags, category, or bill
      const result = await this.db.execute(`
        SELECT c2.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c1
        JOIN campaigns c2 ON (
          c1.bill_id = c2.bill_id OR 
          c1.category = c2.category OR
          JSON_OVERLAPS(c1.tags, c2.tags)
        )
        LEFT JOIN campaign_participants cp ON c2.id = cp.campaign_id
        LEFT JOIN action_items ai ON c2.id = ai.campaign_id
        WHERE c1.id = ? AND c2.id != ? AND c2.status = 'active'
        GROUP BY c2.id
        ORDER BY (
          CASE WHEN c1.bill_id = c2.bill_id THEN 3 ELSE 0 END +
          CASE WHEN c1.category = c2.category THEN 2 ELSE 0 END +
          CASE WHEN JSON_OVERLAPS(c1.tags, c2.tags) THEN 1 ELSE 0 END
        ) DESC
        LIMIT ?
      `, [campaignId, campaignId, limit]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find similar campaigns', error, { 
        campaignId,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findTrending(limit: number = 10): Promise<Campaign[]> {
    try {
      const result = await this.db.execute(`
        SELECT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate,
               (COUNT(DISTINCT cp.user_id) * 0.4 + 
                COUNT(DISTINCT ai.id) * 0.3 + 
                AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) * 0.3) as trend_score
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        WHERE c.status = 'active' AND c.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY c.id
        ORDER BY trend_score DESC, c.updated_at DESC
        LIMIT ?
      `, [limit]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find trending campaigns', error, { 
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findRecommended(userId: string, limit: number = 10): Promise<Campaign[]> {
    try {
      // Find campaigns based on user's interests, past participation, and location
      const result = await this.db.execute(`
        SELECT DISTINCT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        LEFT JOIN user_profiles up ON up.user_id = ?
        WHERE c.status = 'active' 
          AND c.id NOT IN (
            SELECT campaign_id FROM campaign_participants WHERE user_id = ?
          )
          AND (
            JSON_OVERLAPS(c.target_counties, JSON_ARRAY(up.county)) OR
            c.category IN (
              SELECT DISTINCT c2.category 
              FROM campaigns c2 
              JOIN campaign_participants cp2 ON c2.id = cp2.campaign_id 
              WHERE cp2.user_id = ?
            )
          )
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        LIMIT ?
      `, [userId, userId, userId, limit]);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to find recommended campaigns', error, { 
        userId,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async bulkUpdateStatus(campaignIds: string[], status: Campaign['status']): Promise<number> {
    try {
      if (campaignIds.length === 0) return 0;

      const placeholders = campaignIds.map(() => '?').join(',');
      const result = await this.db.execute(`
        UPDATE campaigns 
        SET status = ?, updated_at = ?
        WHERE id IN (${placeholders})
      `, [status, new Date(), ...campaignIds]);

      return result.rowsAffected;
    } catch (error) {
      logger.error('Failed to bulk update campaign status', error, { 
        campaignIds,
        status,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async bulkDelete(campaignIds: string[]): Promise<number> {
    try {
      if (campaignIds.length === 0) return 0;

      const placeholders = campaignIds.map(() => '?').join(',');
      
      // Delete related data first
      await this.db.execute(`
        DELETE FROM campaign_participants WHERE campaign_id IN (${placeholders})
      `, campaignIds);
      
      await this.db.execute(`
        DELETE FROM action_items WHERE campaign_id IN (${placeholders})
      `, campaignIds);

      const result = await this.db.execute(`
        DELETE FROM campaigns WHERE id IN (${placeholders})
      `, campaignIds);

      return result.rowsAffected;
    } catch (error) {
      logger.error('Failed to bulk delete campaigns', error, { 
        campaignIds,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async getStats(): Promise<any> {
    try {
      const [totalResult, statusResult, categoryResult, avgParticipationResult] = await Promise.all([
        this.db.execute('SELECT COUNT(*) as total FROM campaigns'),
        this.db.execute(`
          SELECT status, COUNT(*) as count 
          FROM campaigns 
          GROUP BY status
        `),
        this.db.execute(`
          SELECT category, COUNT(*) as count 
          FROM campaigns 
          GROUP BY category
        `),
        this.db.execute(`
          SELECT AVG(participant_count) as avg_participation 
          FROM campaigns 
          WHERE status = 'active'
        `)
      ]);

      return {
        totalCampaigns: totalResult.rows[0]?.total || 0,
        activeCampaigns: statusResult.rows.find(r => r.status === 'active')?.count || 0,
        campaignsByStatus: statusResult.rows,
        campaignsByCategory: categoryResult.rows,
        averageParticipation: avgParticipationResult.rows[0]?.avg_participation || 0,
        successRate: 0.75 // This would be calculated based on actual success metrics
      };
    } catch (error) {
      logger.error('Failed to get campaign stats', error, { 
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async findPotentialCoalitions(campaignId: string): Promise<any[]> {
    try {
      const result = await this.db.execute(`
        SELECT c2.id as campaign_id,
               JSON_EXTRACT(c1.objectives, '$') as objectives1,
               JSON_EXTRACT(c2.objectives, '$') as objectives2,
               (
                 CASE WHEN c1.bill_id = c2.bill_id THEN 0.5 ELSE 0 END +
                 CASE WHEN c1.category = c2.category THEN 0.3 ELSE 0 END +
                 CASE WHEN JSON_OVERLAPS(c1.tags, c2.tags) THEN 0.2 ELSE 0 END
               ) as alignment_score
        FROM campaigns c1
        JOIN campaigns c2 ON c1.id != c2.id
        WHERE c1.id = ? AND c2.status = 'active'
        HAVING alignment_score > 0.3
        ORDER BY alignment_score DESC
        LIMIT 5
      `, [campaignId]);

      return result.rows.map(row => ({
        campaignId: row.campaign_id,
        sharedObjectives: this.findSharedObjectives(
          JSON.parse(row.objectives1 || '[]'),
          JSON.parse(row.objectives2 || '[]')
        ),
        alignmentScore: row.alignment_score,
        potentialSynergies: ['Resource sharing', 'Joint messaging', 'Coordinated actions']
      }));
    } catch (error) {
      logger.error('Failed to find potential coalitions', error, { 
        campaignId,
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  async flagForReview(campaignId: string, reason: string, reporterId: string): Promise<boolean> {
    try {
      await this.db.execute(`
        INSERT INTO campaign_reports (campaign_id, reporter_id, reason, created_at)
        VALUES (?, ?, ?, ?)
      `, [campaignId, reporterId, reason, new Date()]);

      return true;
    } catch (error) {
      logger.error('Failed to flag campaign for review', error, { 
        campaignId,
        reason,
        reporterId,
        component: 'CampaignRepositoryImpl' 
      });
      return false;
    }
  }

  async updateVerificationStatus(campaignId: string, isVerified: boolean, notes?: string): Promise<boolean> {
    try {
      await this.db.execute(`
        UPDATE campaigns 
        SET is_verified = ?, moderation_notes = ?, updated_at = ?
        WHERE id = ?
      `, [isVerified, notes || null, new Date(), campaignId]);

      return true;
    } catch (error) {
      logger.error('Failed to update verification status', error, { 
        campaignId,
        isVerified,
        component: 'CampaignRepositoryImpl' 
      });
      return false;
    }
  }

  async getModerationQueue(): Promise<Campaign[]> {
    try {
      const result = await this.db.execute(`
        SELECT DISTINCT c.*, 
               COUNT(DISTINCT cp.user_id) as participant_count,
               AVG(CASE WHEN ai.status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate
        FROM campaigns c
        LEFT JOIN campaign_participants cp ON c.id = cp.campaign_id
        LEFT JOIN action_items ai ON c.id = ai.campaign_id
        LEFT JOIN campaign_reports cr ON c.id = cr.campaign_id
        WHERE c.is_verified = false OR cr.id IS NOT NULL
        GROUP BY c.id
        ORDER BY c.created_at ASC
      `);

      return result.rows.map(row => this.mapRowToCampaign(row));
    } catch (error) {
      logger.error('Failed to get moderation queue', error, { 
        component: 'CampaignRepositoryImpl' 
      });
      throw error;
    }
  }

  // Private helper methods
  private mapRowToCampaign(row: any): Campaign {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      billId: row.bill_id,
      organizerId: row.organizer_id,
      organizationName: row.organization_name,
      status: row.status,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : [],
      targetCounties: row.target_counties ? JSON.parse(row.target_counties) : [],
      objectives: row.objectives ? JSON.parse(row.objectives) : [],
      strategy: row.strategy ? JSON.parse(row.strategy) : {},
      isPublic: row.is_public,
      requiresApproval: row.requires_approval,
      maxParticipants: row.max_participants,
      participantCount: row.participant_count || 0,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metrics: row.metrics ? JSON.parse(row.metrics) : {
        totalParticipants: row.participant_count || 0,
        activeParticipants: Math.floor((row.participant_count || 0) * 0.7),
        completedActions: 0,
        pendingActions: 0,
        engagementRate: row.completion_rate || 0,
        impactScore: 0,
        reachMetrics: {
          counties: 0,
          demographics: {},
          channels: {}
        }
      },
      impactScore: 0,
      resources: row.resources ? JSON.parse(row.resources) : { documents: [], links: [], templates: [] },
      isVerified: row.is_verified,
      moderationNotes: row.moderation_notes
    };
  }

  private buildWhereClause(filters: CampaignFilters): { whereClause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      conditions.push('c.status = ?');
      params.push(filters.status);
    }

    if (filters.billId) {
      conditions.push('c.bill_id = ?');
      params.push(filters.billId);
    }

    if (filters.organizerId) {
      conditions.push('c.organizer_id = ?');
      params.push(filters.organizerId);
    }

    if (filters.category) {
      conditions.push('c.category = ?');
      params.push(filters.category);
    }

    if (filters.county) {
      conditions.push('JSON_EXTRACT(c.target_counties, "$") LIKE ?');
      params.push(`%"${filters.county}"%`);
    }

    if (filters.startDate) {
      conditions.push('c.start_date >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('c.start_date <= ?');
      params.push(filters.endDate);
    }

    if (filters.minParticipants) {
      conditions.push('c.participant_count >= ?');
      params.push(filters.minParticipants);
    }

    if (filters.maxParticipants) {
      conditions.push('c.participant_count <= ?');
      params.push(filters.maxParticipants);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  }

  private buildUpdateClause(updates: Partial<Campaign>): { setClause: string[]; params: any[] } {
    const setClause: string[] = [];
    const params: any[] = [];

    const updateableFields = [
      'title', 'description', 'status', 'category', 'tags', 'target_counties',
      'objectives', 'strategy', 'is_public', 'requires_approval', 'max_participants',
      'start_date', 'end_date', 'resources', 'is_verified', 'moderation_notes'
    ];

    for (const [key, value] of Object.entries(updates)) {
      const dbField = this.camelToSnake(key);
      if (updateableFields.includes(dbField) && value !== undefined) {
        setClause.push(`${dbField} = ?`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    return { setClause, params };
  }

  private buildOrderBy(sortBy?: string, sortOrder?: 'asc' | 'desc'): string {
    const validSortFields = ['created_at', 'updated_at', 'start_date', 'participant_count', 'title'];
    const field = validSortFields.includes(sortBy || '') ? sortBy : 'updated_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    return `ORDER BY c.${this.camelToSnake(field!)} ${order}`;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  private calculateContributionScore(participant: any): number {
    // This would be calculated based on actions completed, engagement, etc.
    return 50; // Placeholder
  }

  private async getParticipationTrend(campaignId: string): Promise<Array<{ date: Date; count: number }>> {
    try {
      const result = await this.db.execute(`
        SELECT DATE(joined_at) as date, COUNT(*) as count
        FROM campaign_participants
        WHERE campaign_id = ?
        GROUP BY DATE(joined_at)
        ORDER BY date ASC
      `, [campaignId]);

      return result.rows.map(row => ({
        date: new Date(row.date),
        count: row.count
      }));
    } catch (error) {
      return [];
    }
  }

  private async getGeographicDistribution(campaignId: string): Promise<Record<string, number>> {
    try {
      const result = await this.db.execute(`
        SELECT up.county, COUNT(*) as count
        FROM campaign_participants cp
        JOIN user_profiles up ON cp.user_id = up.user_id
        WHERE cp.campaign_id = ? AND up.county IS NOT NULL
        GROUP BY up.county
      `, [campaignId]);

      const distribution: Record<string, number> = {};
      result.rows.forEach(row => {
        distribution[row.county] = row.count;
      });

      return distribution;
    } catch (error) {
      return {};
    }
  }

  private async getEngagementMetrics(campaignId: string): Promise<any> {
    try {
      const result = await this.db.execute(`
        SELECT 
          COUNT(*) as total_actions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_actions,
          AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) as completion_rate,
          COUNT(DISTINCT user_id) as active_participants
        FROM action_items
        WHERE campaign_id = ?
      `, [campaignId]);

      const row = result.rows[0] || {};
      return {
        averageActionsPerParticipant: row.total_actions / Math.max(row.active_participants, 1),
        retentionRate: 0.8, // This would be calculated based on actual retention data
        completionRate: row.completion_rate || 0
      };
    } catch (error) {
      return {
        averageActionsPerParticipant: 0,
        retentionRate: 0,
        completionRate: 0
      };
    }
  }

  private findSharedObjectives(objectives1: string[], objectives2: string[]): string[] {
    return objectives1.filter(obj1 => 
      objectives2.some(obj2 => 
        obj1.toLowerCase().includes(obj2.toLowerCase()) || 
        obj2.toLowerCase().includes(obj1.toLowerCase())
      )
    );
  }
}