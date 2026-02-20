/**
 * Mock data for personal impact calculation
 * Replace this module with real calculation engine
 */

import type { KenyanCounty } from '../../../../infrastructure/schema/enum';

export interface PersonalImpact {
  billId: string;
  userId?: string;
  financialImpact: {
    annual: number;
    monthly: number;
    breakdown: Array<{
      provision: string;
      clauseRef: string;
      amount: number;
      explanation: string;
    }>;
  };
  affectedRights: string[];
  affectedServices: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  personalizedMessage: string;
  recommendations: string[];
}

export interface UserContext {
  county?: KenyanCounty;
  constituency?: string;
  monthlyIncome?: number;
  occupation?: string;
  householdSize?: number;
  useMobileMoney?: boolean;
  useOnlineServices?: boolean;
  isEmployed?: boolean;
}

/**
 * Calculate impact based on user context
 * This is a mock - replace with real calculation logic
 */
export function calculateMockImpact(
  billId: string,
  userContext: UserContext
): PersonalImpact {
  // Finance Bill 2026 - Mobile Money Tax
  if (billId === 'finance-bill-2026') {
    const monthlyIncome = userContext.monthlyIncome || 50000;
    const useMobileMoney = userContext.useMobileMoney !== false; // Default true
    
    if (!useMobileMoney) {
      return {
        billId,
        financialImpact: {
          annual: 0,
          monthly: 0,
          breakdown: []
        },
        affectedRights: [],
        affectedServices: [],
        severity: 'low',
        personalizedMessage: 'This bill has minimal impact on you since you don\'t use mobile money services.',
        recommendations: []
      };
    }

    // Estimate mobile money usage (conservative: 50% of income)
    const monthlyMobileMoneyVolume = monthlyIncome * 0.5;
    const monthlyTax = monthlyMobileMoneyVolume * 0.02; // 2% tax
    const annualTax = monthlyTax * 12;

    return {
      billId,
      userId: userContext.constituency,
      financialImpact: {
        annual: Math.round(annualTax),
        monthly: Math.round(monthlyTax),
        breakdown: [
          {
            provision: 'Mobile Money Transfer Tax',
            clauseRef: 'Section 47(3)(b)',
            amount: Math.round(annualTax),
            explanation: `Based on your estimated mobile money usage of KES ${monthlyMobileMoneyVolume.toLocaleString()}/month, you'll pay 2% tax`
          }
        ]
      },
      affectedRights: [
        'Right to affordable financial services',
        'Economic freedom'
      ],
      affectedServices: [
        'M-Pesa transfers',
        'Airtel Money',
        'Bill payments via mobile money',
        'Salary payments',
        'Business transactions'
      ],
      severity: annualTax > 10000 ? 'high' : annualTax > 5000 ? 'medium' : 'low',
      personalizedMessage: `Based on your income of KES ${monthlyIncome.toLocaleString()}/month and mobile money usage, this bill will cost you approximately KES ${Math.round(monthlyTax).toLocaleString()} per month (KES ${Math.round(annualTax).toLocaleString()} per year).`,
      recommendations: [
        'Submit a comment explaining how this affects your household budget',
        'Contact your MP to vote against this provision',
        'Join others from your constituency to oppose this tax',
        'Consider alternative payment methods (though limited in Kenya)'
      ]
    };
  }

  // Tax Laws Amendment Bill - Digital Service Tax
  if (billId === 'tax-laws-2026') {
    const useOnlineServices = userContext.useOnlineServices !== false;
    const monthlyIncome = userContext.monthlyIncome || 50000;
    
    if (!useOnlineServices) {
      return {
        billId,
        financialImpact: {
          annual: 0,
          monthly: 0,
          breakdown: []
        },
        affectedRights: [],
        affectedServices: [],
        severity: 'low',
        personalizedMessage: 'This bill has minimal impact on you since you don\'t use online services.',
        recommendations: []
      };
    }

    // Estimate online spending (conservative: 10% of income)
    const monthlyOnlineSpending = monthlyIncome * 0.1;
    const monthlyPriceIncrease = monthlyOnlineSpending * 0.015; // 1.5% passed to consumers
    const annualPriceIncrease = monthlyPriceIncrease * 12;

    return {
      billId,
      financialImpact: {
        annual: Math.round(annualPriceIncrease),
        monthly: Math.round(monthlyPriceIncrease),
        breakdown: [
          {
            provision: 'Digital Service Tax',
            clauseRef: 'Section 15(2)',
            amount: Math.round(annualPriceIncrease),
            explanation: `Businesses will pass the 1.5% tax to you through higher prices on online purchases`
          }
        ]
      },
      affectedRights: [
        'Access to affordable digital services',
        'Digital economy participation'
      ],
      affectedServices: [
        'Jumia and online shopping',
        'Uber and Bolt rides',
        'Food delivery (Glovo, Uber Eats)',
        'Online subscriptions',
        'Digital marketplace purchases'
      ],
      severity: annualPriceIncrease > 5000 ? 'medium' : 'low',
      personalizedMessage: `Based on your estimated online spending of KES ${monthlyOnlineSpending.toLocaleString()}/month, prices will increase by approximately KES ${Math.round(monthlyPriceIncrease).toLocaleString()} per month (KES ${Math.round(annualPriceIncrease).toLocaleString()} per year).`,
      recommendations: [
        'Comment on how this affects your access to digital services',
        'Support amendments to exempt small transactions',
        'Contact your MP about the impact on digital economy'
      ]
    };
  }

  // Housing Levy Bill
  if (billId === 'housing-levy-2026') {
    const isEmployed = userContext.isEmployed !== false;
    const monthlyIncome = userContext.monthlyIncome || 50000;
    
    if (!isEmployed) {
      return {
        billId,
        financialImpact: {
          annual: 0,
          monthly: 0,
          breakdown: []
        },
        affectedRights: [],
        affectedServices: [],
        severity: 'low',
        personalizedMessage: 'This bill doesn\'t affect you directly since you\'re not formally employed.',
        recommendations: []
      };
    }

    const monthlyDeduction = monthlyIncome * 0.015; // 1.5%
    const annualDeduction = monthlyDeduction * 12;

    return {
      billId,
      financialImpact: {
        annual: Math.round(annualDeduction),
        monthly: Math.round(monthlyDeduction),
        breakdown: [
          {
            provision: 'Affordable Housing Levy',
            clauseRef: 'Section 3(1)',
            amount: Math.round(annualDeduction),
            explanation: `1.5% deducted from your gross salary every month`
          }
        ]
      },
      affectedRights: [
        'Right to fair compensation',
        'Economic freedom'
      ],
      affectedServices: [
        'Take-home salary reduced',
        'Disposable income reduced',
        'Savings capacity reduced'
      ],
      severity: annualDeduction > 15000 ? 'high' : annualDeduction > 8000 ? 'medium' : 'low',
      personalizedMessage: `With a salary of KES ${monthlyIncome.toLocaleString()}/month, you'll lose KES ${Math.round(monthlyDeduction).toLocaleString()} per month (KES ${Math.round(annualDeduction).toLocaleString()} per year) to the Housing Levy.`,
      recommendations: [
        'Comment on whether you can afford this deduction',
        'Ask for opt-out provisions if you already own a home',
        'Request transparency on how the fund will be managed',
        'Contact your MP about the mandatory nature of this levy'
      ]
    };
  }

  // Default response for unknown bills
  return {
    billId,
    financialImpact: {
      annual: 0,
      monthly: 0,
      breakdown: []
    },
    affectedRights: [],
    affectedServices: [],
    severity: 'low',
    personalizedMessage: 'Impact calculation not available for this bill yet.',
    recommendations: [
      'Read the bill summary to understand potential impacts',
      'Submit a comment if you have concerns',
      'Contact your MP for more information'
    ]
  };
}
