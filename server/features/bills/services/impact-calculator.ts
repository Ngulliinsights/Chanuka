/**
 * Personal Impact Calculator Service
 * Calculates how a bill affects individual citizens
 * 
 * PRODUCTION: Replace mock calculations with real algorithms
 */

import { calculateMockImpact, type PersonalImpact, type UserContext } from './mocks/impact-mock-data';

export interface ImpactRequest {
  billId: string;
  userContext: UserContext;
}

export interface ImpactResponse extends PersonalImpact {
  calculatedAt: Date;
  confidence: 'low' | 'medium' | 'high';
  methodology: string;
}

export class ImpactCalculator {
  /**
   * Calculate personal impact of a bill
   * 
   * @param request - Impact calculation request
   * @returns Personalized impact assessment
   */
  async calculateImpact(request: ImpactRequest): Promise<ImpactResponse> {
    const { billId, userContext } = request;

    // Validate user context
    this.validateUserContext(userContext);

    // MOCK: Calculate using mock data
    // PRODUCTION: Use real calculation algorithms
    const impact = calculateMockImpact(billId, userContext);

    return {
      ...impact,
      calculatedAt: new Date(),
      confidence: this.calculateConfidence(userContext),
      methodology: this.getMethodology(billId)
    };
  }

  /**
   * Calculate confidence level based on available user data
   */
  private calculateConfidence(userContext: UserContext): 'low' | 'medium' | 'high' {
    let dataPoints = 0;
    
    if (userContext.monthlyIncome) dataPoints++;
    if (userContext.county) dataPoints++;
    if (userContext.occupation) dataPoints++;
    if (userContext.householdSize) dataPoints++;
    if (userContext.useMobileMoney !== undefined) dataPoints++;
    if (userContext.useOnlineServices !== undefined) dataPoints++;
    if (userContext.isEmployed !== undefined) dataPoints++;

    if (dataPoints >= 5) return 'high';
    if (dataPoints >= 3) return 'medium';
    return 'low';
  }

  /**
   * Get methodology description
   */
  private getMethodology(billId: string): string {
    return `Impact calculated based on user profile data and bill provisions. Estimates are conservative and based on typical usage patterns for Kenyan citizens.`;
  }

  /**
   * Validate user context
   */
  private validateUserContext(userContext: UserContext): void {
    if (!userContext) {
      throw new Error('User context is required');
    }

    // Validate income if provided
    if (userContext.monthlyIncome !== undefined) {
      if (userContext.monthlyIncome < 0) {
        throw new Error('Monthly income cannot be negative');
      }
      if (userContext.monthlyIncome > 10000000) {
        throw new Error('Monthly income seems unrealistic');
      }
    }

    // Validate household size if provided
    if (userContext.householdSize !== undefined) {
      if (userContext.householdSize < 1 || userContext.householdSize > 20) {
        throw new Error('Household size must be between 1 and 20');
      }
    }
  }

  /**
   * Get default user context from user profile
   */
  async getUserContextFromProfile(userId: string): Promise<UserContext> {
    // PRODUCTION: Fetch from database
    // For now, return empty context
    return {
      useMobileMoney: true,
      useOnlineServices: true,
      isEmployed: true
    };
  }

  /**
   * PRODUCTION: Real calculation algorithms
   * Implement these when ready to replace mocks
   */
  
  /*
  private calculateMobileMoneyImpact(
    monthlyIncome: number,
    usagePattern: 'low' | 'medium' | 'high'
  ): number {
    // Real calculation based on:
    // - Transaction frequency
    // - Average transaction size
    // - Usage patterns by income bracket
    // - Regional variations
    return 0;
  }

  private calculateDigitalServiceImpact(
    monthlyIncome: number,
    onlineSpending: number
  ): number {
    // Real calculation based on:
    // - Online shopping frequency
    // - Service subscriptions
    // - Ride-hailing usage
    // - Food delivery usage
    return 0;
  }

  private calculateHousingLevyImpact(
    monthlyIncome: number,
    isEmployed: boolean
  ): number {
    // Real calculation based on:
    // - Gross salary
    // - Employment type
    // - Existing housing status
    return 0;
  }
  */
}

export const impactCalculator = new ImpactCalculator();
