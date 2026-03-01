/**
 * API Gateway Service - Main entry point for institutional clients
 * Modernized with validation schemas and Result types
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { z } from 'zod';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AuthenticateAPIKeySchema = z.object({
  apiKey: z.string().min(32).max(128),
});

const GetLegislativeBriefSchema = z.object({
  billId: z.string().uuid(),
  clientTier: z.enum(['basic', 'professional', 'enterprise']),
});

// ============================================================================
// TYPES
// ============================================================================

interface APIClient {
  id: string;
  name: string;
  tier: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'inactive';
  permissions: string[];
}

interface LegislativeBrief {
  billId: string;
  tier: string;
  summary: {
    totalArguments: number;
    supportPercentage: number;
    opposePercentage: number;
  };
  generatedAt: Date;
}

type AuthenticateAPIKeyInput = z.infer<typeof AuthenticateAPIKeySchema>;
type GetLegislativeBriefInput = z.infer<typeof GetLegislativeBriefSchema>;

// ============================================================================
// SERVICE
// ============================================================================

export class APIGatewayService {
  async authenticateAPIKey(input: AuthenticateAPIKeyInput): Promise<AsyncServiceResult<APIClient>> {
    return safeAsync(async () => {
      // Validate input
      const validatedInput = await validateData(AuthenticateAPIKeySchema, input);

      // Check cache first
      const cacheKey = cacheKeys.entity('api-client', validatedInput.apiKey);
      const cached = await cacheService.get<APIClient>(cacheKey);
      if (cached) return cached;

      // Mock authentication - In production, this would query a database
      const client: APIClient = {
        id: 'client-1',
        name: 'Budget Committee',
        tier: 'professional',
        status: 'active',
        permissions: ['briefs:read', 'analysis:read']
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, client, CACHE_TTL.LONG);

      return client;
    }, { service: 'APIGatewayService', operation: 'authenticateAPIKey' });
  }

  async getLegislativeBrief(input: GetLegislativeBriefInput): Promise<AsyncServiceResult<LegislativeBrief>> {
    return safeAsync(async () => {
      // Validate input
      const validatedInput = await validateData(GetLegislativeBriefSchema, input);

      // Check cache first
      const cacheKey = cacheKeys.query('legislative-brief', {
        billId: validatedInput.billId,
        tier: validatedInput.clientTier
      });
      const cached = await cacheService.get<LegislativeBrief>(cacheKey);
      if (cached) return cached;

      // Generate brief - In production, this would aggregate data from multiple sources
      const brief: LegislativeBrief = {
        billId: validatedInput.billId,
        tier: validatedInput.clientTier,
        summary: {
          totalArguments: 150,
          supportPercentage: 65,
          opposePercentage: 35
        },
        generatedAt: new Date()
      };

      // Cache for 30 minutes (briefs are relatively stable)
      await cacheService.set(cacheKey, brief, CACHE_TTL.MEDIUM);

      return brief;
    }, { service: 'APIGatewayService', operation: 'getLegislativeBrief' });
  }
}

export const apiGatewayService = new APIGatewayService();
