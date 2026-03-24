/**
 * Mock Impact Calculation Data
 * Used for development/testing until real algorithms are implemented
 */

export interface UserContext {
  monthlyIncome?: number;
  county?: string;
  occupation?: string;
  householdSize?: number;
  useMobileMoney?: boolean;
  useOnlineServices?: boolean;
  isEmployed?: boolean;
}

export interface PersonalImpact {
  billId: string;
  overallImpact: 'positive' | 'negative' | 'neutral' | 'mixed';
  impactScore: number; // -100 to +100
  financialImpact: {
    estimatedCostPerMonth: number;
    estimatedCostPerYear: number;
    breakdown: Array<{
      category: string;
      amount: number;
      explanation: string;
    }>;
  };
  timeImpact: {
    estimatedHoursPerMonth: number;
    activities: string[];
  };
  benefits: string[];
  concerns: string[];
  recommendations: string[];
}

const mockImpacts: Record<string, PersonalImpact> = {
  'default': {
    billId: 'default',
    overallImpact: 'mixed',
    impactScore: 15,
    financialImpact: {
      estimatedCostPerMonth: 500,
      estimatedCostPerYear: 6000,
      breakdown: [
        {
          category: 'Mobile Money Transactions',
          amount: 200,
          explanation: 'Based on average 10 transactions per month at KES 20 per transaction'
        },
        {
          category: 'Digital Services',
          amount: 300,
          explanation: 'Estimated increase in online service costs'
        }
      ]
    },
    timeImpact: {
      estimatedHoursPerMonth: 2,
      activities: [
        'Registering for new services',
        'Learning new procedures',
        'Compliance activities'
      ]
    },
    benefits: [
      'Improved service delivery',
      'Better transparency',
      'Enhanced accountability'
    ],
    concerns: [
      'Increased costs for low-income households',
      'Digital divide may widen',
      'Implementation timeline unclear'
    ],
    recommendations: [
      'Monitor your monthly expenses closely',
      'Look for exemptions if you qualify',
      'Provide feedback during public participation'
    ]
  }
};

export function calculateMockImpact(billId: string, userContext: UserContext): PersonalImpact {
  const baseImpact = mockImpacts[billId] || mockImpacts['default'];
  
  // Adjust impact based on user context
  const adjustedImpact = { ...baseImpact };
  
  // Adjust financial impact based on income
  if (userContext.monthlyIncome) {
    const incomeMultiplier = userContext.monthlyIncome / 50000; // Normalize to 50k baseline
    adjustedImpact.financialImpact = {
      ...baseImpact!.financialImpact,
      estimatedCostPerMonth: Math.round(baseImpact!.financialImpact.estimatedCostPerMonth * incomeMultiplier),
      estimatedCostPerYear: Math.round(baseImpact!.financialImpact.estimatedCostPerYear * incomeMultiplier),
      breakdown: baseImpact!.financialImpact.breakdown.map(item => ({
        ...item,
        amount: Math.round(item.amount * incomeMultiplier)
      }))
    };
  }
  
  // Adjust based on mobile money usage
  if (userContext.useMobileMoney === false) {
    adjustedImpact.financialImpact!.breakdown = adjustedImpact.financialImpact!.breakdown.filter(
      item => item.category !== 'Mobile Money Transactions'
    );
    adjustedImpact.financialImpact!.estimatedCostPerMonth -= 200;
    adjustedImpact.financialImpact!.estimatedCostPerYear -= 2400;
  }
  
  // Adjust based on online services usage
  if (userContext.useOnlineServices === false) {
    adjustedImpact.financialImpact!.breakdown = adjustedImpact.financialImpact!.breakdown.filter(
      item => item.category !== 'Digital Services'
    );
    adjustedImpact.financialImpact!.estimatedCostPerMonth -= 300;
    adjustedImpact.financialImpact!.estimatedCostPerYear -= 3600;
  }
  
  // Adjust household impact
  if (userContext.householdSize && userContext.householdSize > 1) {
    const householdMultiplier = Math.sqrt(userContext.householdSize); // Economies of scale
    adjustedImpact.financialImpact!.estimatedCostPerMonth = Math.round(
      adjustedImpact.financialImpact!.estimatedCostPerMonth * householdMultiplier
    );
    adjustedImpact.financialImpact!.estimatedCostPerYear = Math.round(
      adjustedImpact.financialImpact!.estimatedCostPerYear * householdMultiplier
    );
  }
  
  return adjustedImpact;
}
