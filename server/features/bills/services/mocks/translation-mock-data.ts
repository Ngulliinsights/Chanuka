/**
 * Mock data for plain-language translation
 * Replace this module with real OpenAI/NLP integration
 */

export interface ClauseTranslation {
  clauseRef: string;
  originalText: string;
  plainLanguage: string;
  keyPoints: string[];
  affectedGroups: string[];
  examples: string[];
}

export const mockTranslations: Record<string, ClauseTranslation[]> = {
  // Finance Bill 2026 - Mobile Money Tax
  'finance-bill-2026': [
    {
      clauseRef: 'Section 47(3)(b)',
      originalText: 'The Finance Act is amended by inserting the following new section immediately after section 12A— "12B. Excise duty on mobile money transfer services. (1) There shall be charged, levied and paid an excise duty at the rate of two per centum on the value of mobile money transfer services."',
      plainLanguage: 'Every time you send money using M-Pesa, Airtel Money, or any mobile money service, you will pay an extra 2% tax on top of the normal charges.',
      keyPoints: [
        'New 2% tax on all mobile money transfers',
        'Applies to M-Pesa, Airtel Money, T-Kash, and all mobile money services',
        'Tax is on top of existing transaction fees',
        'Affects both sending and receiving money'
      ],
      affectedGroups: [
        'Mobile money users (40+ million Kenyans)',
        'Small businesses that use mobile payments',
        'Rural communities with limited banking access',
        'Informal sector workers',
        'Mama mbogas and small traders'
      ],
      examples: [
        'Send KES 1,000 → Pay KES 20 extra tax (plus normal fees)',
        'Receive salary of KES 50,000 → Pay KES 1,000 tax',
        'Pay rent of KES 20,000 → Pay KES 400 extra tax'
      ]
    },
    {
      clauseRef: 'Section 23(4)',
      originalText: 'The principal Act is amended in section 23 by inserting the following new subsection immediately after subsection (3)— "(4) Notwithstanding subsection (1), the Cabinet Secretary may, by notice in the Gazette, vary the rate of excise duty on mobile money transfer services."',
      plainLanguage: 'The government can increase the mobile money tax at any time without going back to Parliament. They just need to publish a notice.',
      keyPoints: [
        'Tax rate can be changed without Parliament approval',
        'Cabinet Secretary has unilateral power',
        'No public consultation required',
        'Could go from 2% to 5% or 10% overnight'
      ],
      affectedGroups: [
        'All mobile money users',
        'Parliament (loses oversight)',
        'Citizens (lose democratic input)'
      ],
      examples: [
        'Today: 2% tax on KES 1,000 = KES 20',
        'Tomorrow: CS changes to 5% = KES 50',
        'No vote, no debate, just a gazette notice'
      ]
    }
  ],

  // Tax Laws Amendment Bill
  'tax-laws-2026': [
    {
      clauseRef: 'Section 15(2)',
      originalText: 'The Income Tax Act is amended by inserting a new section 15A to impose a digital service tax at the rate of one and one-half per centum on the gross transaction value of digital marketplace services.',
      plainLanguage: 'Online businesses like Jumia, Uber, Glovo, and even small online shops will pay 1.5% tax on all sales. This cost will likely be passed to you as higher prices.',
      keyPoints: [
        '1.5% tax on all online sales and services',
        'Applies to Jumia, Uber, Glovo, food delivery, online shops',
        'Businesses will likely increase prices to cover the tax',
        'Affects both local and international platforms'
      ],
      affectedGroups: [
        'Online shoppers',
        'Uber/Bolt riders',
        'Food delivery users (Glovo, Uber Eats)',
        'Small online businesses',
        'Digital entrepreneurs'
      ],
      examples: [
        'Jumia order KES 5,000 → Business pays KES 75 tax → You pay higher prices',
        'Uber ride KES 500 → Uber pays KES 7.50 tax → Fare increases',
        'Online shop sale KES 2,000 → Shop pays KES 30 → Prices go up'
      ]
    }
  ],

  // Housing Levy Bill
  'housing-levy-2026': [
    {
      clauseRef: 'Section 3(1)',
      originalText: 'Every employer shall deduct from the gross salary of each employee a contribution equal to one and one-half per centum of the gross salary and remit the same to the Fund within nine days after the end of every month.',
      plainLanguage: 'Your employer will deduct 1.5% from your salary every month for the Affordable Housing Fund. If you earn KES 50,000, you lose KES 750 per month (KES 9,000 per year).',
      keyPoints: [
        '1.5% deducted from your salary every month',
        'Mandatory - you cannot opt out',
        'Employer also contributes 1.5% (total 3%)',
        'Money goes to Affordable Housing Fund'
      ],
      affectedGroups: [
        'All salaried employees',
        'Middle-income earners hit hardest',
        'Young professionals',
        'Civil servants'
      ],
      examples: [
        'Salary KES 30,000 → Lose KES 450/month (KES 5,400/year)',
        'Salary KES 50,000 → Lose KES 750/month (KES 9,000/year)',
        'Salary KES 100,000 → Lose KES 1,500/month (KES 18,000/year)'
      ]
    }
  ]
};

/**
 * Get translation for a specific bill and clause
 */
export function getMockTranslation(billId: string, clauseRef?: string): ClauseTranslation[] {
  const translations = mockTranslations[billId] || [];
  
  if (clauseRef) {
    return translations.filter(t => t.clauseRef === clauseRef);
  }
  
  return translations;
}

/**
 * Get all clauses for a bill
 */
export function getMockClauses(billId: string): string[] {
  const translations = mockTranslations[billId] || [];
  return translations.map(t => t.clauseRef);
}
