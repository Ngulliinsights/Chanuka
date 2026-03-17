// Disclosure Processing Service
// Optimized, type-safe, production-ready

import type { FinancialDisclosure, SponsorInfo } from '../types';
import { db } from '@server/infrastructure/database';
import { sponsors } from '@server/infrastructure/schema';
import { financialDisclosures } from '@server/infrastructure/schema/transparency_intelligence';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@server/infrastructure/observability';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const RISK_THRESHOLDS = {
  HIGH_VALUE_AMOUNT: 100_000,
  HIGH_AMOUNT: 500_000,
  MEDIUM_AMOUNT: 25_000,
  SCORE_CRITICAL: 8,
  SCORE_HIGH: 5,
  SCORE_MEDIUM: 2,
  COMPLETENESS_MIN: 80,
} as const;

const REQUIRED_DISCLOSURE_FIELDS = ['description', 'amount'] as const;
const OPTIONAL_DISCLOSURE_FIELDS = ['source', 'category', 'notes'] as const;

/* ─── Types ─────────────────────────────────────────────────────────────────── */

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskAssessment {
  overallRisk: RiskLevel;
  riskFactors: string[];
  totalAmount: number;
}

interface CompletenessReport {
  isComplete: boolean;
  missingFields: string[];
  completenessScore: number;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const toNumber = (val: unknown): number =>
  typeof val === 'number' ? val : Number(val) || 0;

const toDate = (val: unknown): Date =>
  val instanceof Date ? val : new Date(val as string);

const isValidDisclosureType = (
  val: unknown
): val is FinancialDisclosure['disclosureType'] => {
  return [
    'income',
    'financial',
    'business',
    'investment',
    'real_estate',
    'gifts',
  ].includes(val as string);
};

/* ─── Service ───────────────────────────────────────────────────────────────── */

class DisclosureProcessingService {
  /* -------------------------------------------------------------------------- */
  /*  SPONSOR DATA                                                              */
  /* -------------------------------------------------------------------------- */

  async getSponsorBasicInfo(sponsorId: string): Promise<SponsorInfo | null> {
    try {
      const [sponsor] = await db
        .select({
          id: sponsors.id,
          name: sponsors.name,
          is_active: sponsors.is_active,
        })
        .from(sponsors)
        .where(eq(sponsors.id, sponsorId))
        .limit(1);

      if (!sponsor) return null;

      return {
        id: sponsor.id, // keep UUID as string
        name: sponsor.name,
        is_active: sponsor.is_active ?? true,
      };
    } catch (error) {
      logger.error({ sponsorId, error }, 'Failed to fetch sponsor info');
      return null;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  DISCLOSURE DATA FETCHING                                                  */
  /* -------------------------------------------------------------------------- */

  async getDisclosureData(sponsorId: string): Promise<FinancialDisclosure[]> {
    try {
      const rows = await db
        .select()
        .from(financialDisclosures)
        .where(eq(financialDisclosures.sponsorId, sponsorId))
        .orderBy(desc(financialDisclosures.filingDate));

      return rows.map((row) => this.transformDisclosure(row));
    } catch (error) {
      logger.error({ sponsorId, error }, 'Failed to fetch disclosures');
      return [];
    }
  }

  private transformDisclosure(row: any): FinancialDisclosure {
    const data = row.disclosureData ?? {};

    const amount = toNumber(data.amount);
    const isVerified = row.verificationStatus === 'verified';

    return {
      id: row.id, // UUID string
      sponsor_id: row.sponsorId,

      disclosureType: isValidDisclosureType(row.disclosureType)
        ? row.disclosureType
        : 'income',

      amount,
      source: row.source ?? data.source ?? 'Unknown',
      description: data.description ?? 'No description available',

      dateReported: toDate(row.filingDate),
      is_verified: isVerified,

      completenessScore: this.calculateCompletenessScore(data),
      riskLevel: this.calculateRiskLevel(amount, isVerified),

      lastUpdated: toDate(row.updatedAt),
    };
  }

  /* -------------------------------------------------------------------------- */
  /*  DERIVED METRICS                                                           */
  /* -------------------------------------------------------------------------- */

  getLatestDisclosureDate(disclosures: FinancialDisclosure[]): Date {
    if (disclosures.length === 0) return new Date();

    return disclosures.reduce(
      (latest, d) =>
        d.dateReported > latest ? d.dateReported : latest,
      disclosures[0]!.dateReported
    );
  }

  processDisclosureRisk(disclosures: FinancialDisclosure[]): RiskAssessment {
    if (disclosures.length === 0) {
      return {
        overallRisk: 'low',
        riskFactors: ['No disclosures found'],
        totalAmount: 0,
      };
    }

    let totalAmount = 0;
    let riskScore = 0;

    let highValueCount = 0;
    let unverifiedCount = 0;
    let criticalCount = 0;

    for (const d of disclosures) {
      const amount = d.amount ?? 0;
      totalAmount += amount;

      if (amount > RISK_THRESHOLDS.HIGH_VALUE_AMOUNT) {
        highValueCount++;
        riskScore += 2;
      }

      if (!d.is_verified) {
        unverifiedCount++;
        riskScore += 1;
      }

      if (d.riskLevel === 'critical') {
        criticalCount++;
        riskScore += 3;
      }
    }

    const riskFactors = [
      highValueCount ? `${highValueCount} high-value disclosure(s)` : null,
      unverifiedCount ? `${unverifiedCount} unverified disclosure(s)` : null,
      criticalCount ? `${criticalCount} critical disclosure(s)` : null,
    ].filter(Boolean) as string[];

    const overallRisk: RiskLevel =
      riskScore >= RISK_THRESHOLDS.SCORE_CRITICAL
        ? 'critical'
        : riskScore >= RISK_THRESHOLDS.SCORE_HIGH
        ? 'high'
        : riskScore >= RISK_THRESHOLDS.SCORE_MEDIUM
        ? 'medium'
        : 'low';

    return { overallRisk, riskFactors, totalAmount };
  }

  async validateDisclosureCompleteness(
    sponsorId: string
  ): Promise<CompletenessReport> {
    const disclosures = await this.getDisclosureData(sponsorId);

    if (disclosures.length === 0) {
      return {
        isComplete: false,
        missingFields: ['No disclosures found'],
        completenessScore: 0,
      };
    }

    const requiredFields: (keyof FinancialDisclosure)[] = [
      'disclosureType',
      'description',
      'dateReported',
    ];

    const optionalFields: (keyof FinancialDisclosure)[] = [
      'amount',
      'source',
    ];

    const fieldCount = requiredFields.length + optionalFields.length;

    let totalFields = 0;
    let completedFields = 0;
    const missingFields: string[] = [];

    disclosures.forEach((d, i) => {
      totalFields += fieldCount;

      requiredFields.forEach((field) => {
        if (!d[field]) {
          missingFields.push(
            `Disclosure ${i + 1}: Missing ${String(field)}`
          );
        } else {
          completedFields++;
        }
      });

      optionalFields.forEach((field) => {
        if (d[field]) completedFields++;
      });
    });

    const completenessScore = Math.round(
      (completedFields / totalFields) * 100
    );

    return {
      isComplete:
        completenessScore >= RISK_THRESHOLDS.COMPLETENESS_MIN &&
        missingFields.length === 0,
      missingFields,
      completenessScore,
    };
  }

  /* -------------------------------------------------------------------------- */
  /*  CORE SCORING LOGIC                                                        */
  /* -------------------------------------------------------------------------- */

  private calculateRiskLevel(
    amount: number,
    isVerified: boolean
  ): RiskLevel {
    if (!isVerified) {
      return amount > RISK_THRESHOLDS.HIGH_VALUE_AMOUNT
        ? 'critical'
        : 'high';
    }

    if (amount > RISK_THRESHOLDS.HIGH_AMOUNT) return 'critical';
    if (amount > RISK_THRESHOLDS.HIGH_VALUE_AMOUNT) return 'high';
    if (amount > RISK_THRESHOLDS.MEDIUM_AMOUNT) return 'medium';

    return 'low';
  }

  private calculateCompletenessScore(
    data: Record<string, unknown> | null | undefined
  ): number {
    if (!data) return 0;

    const maxScore =
      REQUIRED_DISCLOSURE_FIELDS.length * 2 +
      OPTIONAL_DISCLOSURE_FIELDS.length;

    let score = 0;

    for (const field of REQUIRED_DISCLOSURE_FIELDS) {
      if (data[field]) score += 2;
    }

    for (const field of OPTIONAL_DISCLOSURE_FIELDS) {
      if (data[field]) score += 1;
    }

    return Math.round((score / maxScore) * 100);
  }
}

export const disclosureProcessingService =
  new DisclosureProcessingService();