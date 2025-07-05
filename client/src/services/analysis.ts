
export interface BillAnalysis {
  id: string;
  billId: number;
  conflictScore: number;
  transparencyRating: number;
  stakeholderAnalysis: StakeholderImpact[];
  constitutionalConcerns: string[];
  publicBenefit: number;
  corporateInfluence: CorporateConnection[];
}

interface StakeholderImpact {
  group: string;
  impactLevel: 'high' | 'medium' | 'low';
  description: string;
  affectedPopulation: number;
}

interface CorporateConnection {
  organization: string;
  connectionType: 'financial' | 'advisory' | 'employment';
  influenceLevel: number;
  potentialConflict: boolean;
}

class AnalysisService {
  async analyzeBill(billId: number): Promise<BillAnalysis> {
    try {
      const response = await fetch(`/api/bills/${billId}/analysis`);
      if (!response.ok) {
        throw new Error('Analysis service unavailable');
      }
      return await response.json();
    } catch (error) {
      // Fallback to mock analysis for demonstration
      return this.generateMockAnalysis(billId);
    }
  }

  private generateMockAnalysis(billId: number): BillAnalysis {
    return {
      id: `analysis-${billId}`,
      billId,
      conflictScore: Math.floor(Math.random() * 100),
      transparencyRating: Math.floor(Math.random() * 100),
      stakeholderAnalysis: [
        {
          group: 'Small Businesses',
          impactLevel: 'high',
          description: 'New compliance requirements may burden small enterprises',
          affectedPopulation: 150000
        },
        {
          group: 'Healthcare Workers',
          impactLevel: 'medium',
          description: 'Changes to certification processes',
          affectedPopulation: 45000
        }
      ],
      constitutionalConcerns: [
        'Potential federalism issues with state authority',
        'Due process considerations in enforcement mechanisms'
      ],
      publicBenefit: 75,
      corporateInfluence: [
        {
          organization: 'TechCorp Industries',
          connectionType: 'financial',
          influenceLevel: 8,
          potentialConflict: true
        }
      ]
    };
  }

  async getConflictAnalysis(billId: number) {
    const analysis = await this.analyzeBill(billId);
    return {
      overallRisk: analysis.conflictScore > 70 ? 'high' : 
                  analysis.conflictScore > 40 ? 'medium' : 'low',
      conflicts: analysis.corporateInfluence.filter(c => c.potentialConflict),
      recommendations: this.generateRecommendations(analysis)
    };
  }

  private generateRecommendations(analysis: BillAnalysis): string[] {
    const recommendations = [];
    
    if (analysis.conflictScore > 70) {
      recommendations.push('Recommend independent ethics review');
    }
    
    if (analysis.transparencyRating < 50) {
      recommendations.push('Require additional disclosure documentation');
    }
    
    if (analysis.corporateInfluence.some(c => c.influenceLevel > 7)) {
      recommendations.push('Consider recusal from voting by affected sponsors');
    }
    
    return recommendations;
  }
}

export const analysisService = new AnalysisService();
