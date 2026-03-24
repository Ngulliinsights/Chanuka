/**
 * Mock Translation Data
 * Used for development/testing until OpenAI integration is ready
 */

export interface ClauseTranslation {
  clauseRef: string;
  legalText: string;
  plainLanguage: string;
  keyPoints: string[];
  complexity: 'low' | 'medium' | 'high';
}

const mockTranslations: Record<string, ClauseTranslation[]> = {
  'default': [
    {
      clauseRef: 'Section 1',
      legalText: 'Notwithstanding any other provision of law, the Cabinet Secretary may, by notice in the Gazette, prescribe regulations for the implementation of this Act.',
      plainLanguage: 'The Cabinet Secretary can create rules to put this law into action by publishing them in the official government newspaper.',
      keyPoints: [
        'Cabinet Secretary has power to make rules',
        'Rules must be published officially',
        'Rules help implement the law'
      ],
      complexity: 'medium'
    },
    {
      clauseRef: 'Section 2',
      legalText: 'Any person who contravenes the provisions of this section commits an offence and shall be liable, upon conviction, to a fine not exceeding one million shillings or to imprisonment for a term not exceeding two years, or to both.',
      plainLanguage: 'If you break this rule, you can be fined up to 1 million shillings, sent to jail for up to 2 years, or both.',
      keyPoints: [
        'Breaking this rule is a crime',
        'Maximum fine: 1 million shillings',
        'Maximum jail time: 2 years'
      ],
      complexity: 'high'
    },
    {
      clauseRef: 'Section 3',
      legalText: 'This Act shall come into operation on such date as the Cabinet Secretary may, by notice in the Gazette, appoint.',
      plainLanguage: 'This law will start working on a date that the Cabinet Secretary will announce in the official government newspaper.',
      keyPoints: [
        'Law doesn\'t start immediately',
        'Cabinet Secretary chooses start date',
        'Start date will be announced officially'
      ],
      complexity: 'low'
    }
  ]
};

export function getMockTranslation(billId: string, clauseRef?: string): ClauseTranslation[] {
  const translations = mockTranslations[billId] || mockTranslations['default'];
  
  if (clauseRef) {
    const found = translations!.find(t => t.clauseRef === clauseRef);
    return found ? [found] : [];
  }
  
  return translations;
}

export function getMockClauses(billId: string): string[] {
  const translations = mockTranslations[billId] || mockTranslations['default'];
  return translations!.map(t => t.clauseRef);
}
