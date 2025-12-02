import { useState, useEffect } from 'react';

// Define types locally
interface PretextScore {
  score: number;
  rationale: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface BillAnalysis {
  id: string;
  title: string;
  score: PretextScore;
}

interface CivicAction {
  id: string;
  type: 'foi' | 'petition' | 'complaint';
  title: string;
  description: string;
  template: string;
  requiredFields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>;
  localContacts: any[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  successRate: number;
}

interface RightsCard {
  id: string;
  scenario: string;
  title: string;
  description: string;
  steps: Array<{
    order: number;
    title: string;
    description: string;
    critical: boolean;
    timeframe?: string;
    legalBasis?: string;
  }>;
  contacts: any[];
  language: string;
  lastUpdated: Date;
}

// Mock service class
class PretextAnalysisService {
  constructor(private config: any) {}

  async analyzeBill(billId: string): Promise<PretextScore> {
    // Mock analysis - replace with actual API call
    return {
      score: Math.floor(Math.random() * 100),
      rationale: ['Timing concerns', 'Beneficiary analysis'],
      confidence: 0.8,
      riskLevel: 'medium'
    };
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  weights: {
    timing: 0.3,
    beneficiaryMismatch: 0.35,
    scopeCreep: 0.2,
    networkCentrality: 0.15
  },
  thresholds: {
    flagging: 40,
    highRisk: 70,
    reviewRequired: 60
  },
  timeWindows: {
    crisisToBill: 30,
    billToContract: 60,
    mediaCoordination: 14
  }
};

export const usePretextAnalysis = (billId?: string) => {
  const [analysis, setAnalysis] = useState<PretextScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [civicActions, setCivicActions] = useState<CivicAction[]>([]);
  const [rightsCards, setRightsCards] = useState<RightsCard[]>([]);

  const analysisService = new PretextAnalysisService(DEFAULT_CONFIG);

  const analyzeBill = async (targetBillId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await analysisService.analyzeBill(targetBillId);
      setAnalysis(result);
      
      // Load relevant civic actions based on analysis
      await loadCivicActions(result);
      await loadRightsCards();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const loadCivicActions = async (score: PretextScore) => {
    // Mock data - replace with actual API calls
    const actions: CivicAction[] = [
      {
        id: 'foi-1',
        type: 'foi',
        title: 'Request Bill Impact Assessment',
        description: 'Request detailed impact assessment and stakeholder consultation records',
        template: `Subject: Freedom of Information Request - Bill Impact Assessment

Dear [OFFICE],

Under the Access to Information Act, I request the following documents regarding [BILL_TITLE]:

1. Impact assessment reports
2. Stakeholder consultation records
3. Cost-benefit analysis
4. Public participation submissions

Please provide these within 21 days as required by law.

Regards,
[YOUR_NAME]`,
        requiredFields: [
          { name: 'office', type: 'select', label: 'Government Office', required: true, options: ['Parliament', 'Ministry', 'County Government'] },
          { name: 'billTitle', type: 'text', label: 'Bill Title', required: true },
          { name: 'yourName', type: 'text', label: 'Your Name', required: true },
          { name: 'email', type: 'email', label: 'Your Email', required: true }
        ],
        localContacts: [],
        estimatedTime: '15 minutes',
        difficulty: 'easy',
        successRate: 0.75
      },
      {
        id: 'petition-1',
        type: 'petition',
        title: 'Petition for Public Hearing',
        description: 'Demand public hearings on this bill with adequate notice',
        template: `PETITION FOR PUBLIC HEARING

We, the undersigned citizens, petition Parliament to:

1. Hold public hearings on [BILL_TITLE] with at least 14 days notice
2. Ensure hearings are accessible in multiple languages
3. Publish all submissions and responses online
4. Allow adequate time for public input before voting

This bill affects our fundamental rights and requires proper public consultation.`,
        requiredFields: [
          { name: 'billTitle', type: 'text', label: 'Bill Title', required: true },
          { name: 'constituency', type: 'text', label: 'Your Constituency', required: true },
          { name: 'signatures', type: 'textarea', label: 'Signatures (Name, ID, Signature)', required: true }
        ],
        localContacts: [],
        estimatedTime: '30 minutes + collection',
        difficulty: 'medium',
        successRate: 0.60
      }
    ];

    // Add more actions based on score severity
    if (score.score > 60) {
      actions.push({
        id: 'complaint-1',
        type: 'complaint',
        title: 'File Ethics Complaint',
        description: 'Report potential conflicts of interest to ethics authorities',
        template: `ETHICS COMPLAINT

I wish to report potential conflicts of interest regarding [BILL_TITLE]:

CONCERNS:
${score.rationale.map(r => `- ${r}`).join('\n')}

EVIDENCE:
[Attach relevant documents and sources]

I request investigation into these matters.`,
        requiredFields: [
          { name: 'billTitle', type: 'text', label: 'Bill Title', required: true },
          { name: 'evidence', type: 'textarea', label: 'Evidence Summary', required: true },
          { name: 'yourName', type: 'text', label: 'Your Name', required: true }
        ],
        localContacts: [],
        estimatedTime: '45 minutes',
        difficulty: 'hard',
        successRate: 0.40
      });
    }

    setCivicActions(actions);
  };

  const loadRightsCards = async () => {
    // Mock data - replace with actual API calls
    const cards: RightsCard[] = [
      {
        id: 'arrest-rights',
        scenario: 'arrest',
        title: 'Your Rights During Arrest',
        description: 'Essential steps to protect yourself if arrested',
        steps: [
          {
            order: 1,
            title: 'Remain calm and comply',
            description: 'Do not resist arrest, even if you believe it is unlawful',
            critical: true,
            timeframe: 'Immediately'
          },
          {
            order: 2,
            title: 'Ask for the reason',
            description: 'You have the right to know why you are being arrested',
            critical: true,
            timeframe: 'Immediately'
          },
          {
            order: 3,
            title: 'Request a lawyer',
            description: 'Ask to contact a lawyer before answering questions',
            critical: true,
            timeframe: 'Within 1 hour',
            legalBasis: 'Article 49(1)(c) of the Constitution'
          },
          {
            order: 4,
            title: 'Contact family/friends',
            description: 'Inform someone of your arrest and location',
            critical: false,
            timeframe: 'Within 4 hours'
          }
        ],
        contacts: [],
        language: 'en',
        lastUpdated: new Date()
      },
      {
        id: 'foi-rights',
        scenario: 'corruption_report',
        title: 'Reporting Corruption Safely',
        description: 'How to report corruption while protecting yourself',
        steps: [
          {
            order: 1,
            title: 'Document everything',
            description: 'Keep records of dates, amounts, people involved',
            critical: true
          },
          {
            order: 2,
            title: 'Report to EACC',
            description: 'File report with Ethics and Anti-Corruption Commission',
            critical: true,
            legalBasis: 'Ethics and Anti-Corruption Commission Act'
          },
          {
            order: 3,
            title: 'Seek whistleblower protection',
            description: 'Request protection under the Witness Protection Act',
            critical: false
          }
        ],
        contacts: [],
        language: 'en',
        lastUpdated: new Date()
      }
    ];

    setRightsCards(cards);
  };

  // Auto-analyze if billId provided
  useEffect(() => {
    if (billId) {
      analyzeBill(billId);
    }
  }, [billId]);

  return {
    analysis,
    loading,
    error,
    civicActions,
    rightsCards,
    analyzeBill,
    refetch: () => billId && analyzeBill(billId)
  };
};