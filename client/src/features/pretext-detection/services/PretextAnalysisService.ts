import { 
  PretextScore, 
  BillAnalysis, 
  AnalysisConfig, 
  TimelineEvent, 
  Stakeholder,
  Source 
} from '../types';

export class PretextAnalysisService {
  private config: AnalysisConfig;

  constructor(config: AnalysisConfig) {
    this.config = config;
  }

  /**
   * Analyze a bill for pretext indicators
   */
  async analyzeBill(billId: string): Promise<PretextScore> {
    const billData = await this.fetchBillData(billId);
    const timeline = await this.buildTimeline(billId);
    const stakeholders = await this.analyzeStakeholders(billId);
    
    const indicators = {
      timing: this.analyzeTimingIndicators(timeline),
      beneficiaryMismatch: this.analyzeBeneficiaryMismatch(stakeholders, billData),
      scopeCreep: this.analyzeScopeCreep(billData),
      networkCentrality: this.analyzeNetworkCentrality(stakeholders)
    };

    const score = this.calculateCompositeScore(indicators);
    const confidence = this.calculateConfidence(indicators, timeline.length);
    const rationale = this.generateRationale(indicators);
    const sources = this.aggregateSources(timeline, stakeholders);

    return {
      billId,
      score,
      confidence,
      lastUpdated: new Date(),
      indicators,
      rationale,
      sources,
      reviewStatus: score > this.config.thresholds.reviewRequired ? 'pending' : 'verified'
    };
  }

  /**
   * Analyze timing patterns between crises and policy responses
   */
  private analyzeTimingIndicators(timeline: TimelineEvent[]): {
    score: number;
    description: string;
    evidence: string[];
  } {
    const crises = timeline.filter(e => e.type === 'crisis');
    const bills = timeline.filter(e => e.type === 'bill_introduced');
    const evidence: string[] = [];
    let maxScore = 0;

    for (const crisis of crises) {
      for (const bill of bills) {
        const daysDiff = Math.abs(
          (bill.date.getTime() - crisis.date.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff <= this.config.timeWindows.crisisToBill) {
          const proximityScore = Math.max(0, 100 - (daysDiff / this.config.timeWindows.crisisToBill) * 100);
          maxScore = Math.max(maxScore, proximityScore);
          evidence.push(
            `Bill introduced ${Math.round(daysDiff)} days after ${crisis.title}`
          );
        }
      }
    }

    return {
      score: maxScore,
      description: maxScore > 50 
        ? 'Bill introduced shortly after crisis event' 
        : 'Normal timing pattern observed',
      evidence
    };
  }

  /**
   * Analyze beneficiary patterns vs stated rationale
   */
  private analyzeBeneficiaryMismatch(
    stakeholders: Stakeholder[], 
    billData: any
  ): {
    score: number;
    description: string;
    evidence: string[];
  } {
    const evidence: string[] = [];
    let score = 0;

    // Look for financial connections between sponsors and beneficiaries
    const sponsors = stakeholders.filter(s => s.role === 'sponsor');
    const contractors = stakeholders.filter(s => s.type === 'company');

    for (const sponsor of sponsors) {
      for (const contractor of contractors) {
        const connection = sponsor.connections.find(c => c.targetId === contractor.id);
        if (connection && connection.type === 'donor') {
          score += 30;
          evidence.push(
            `Sponsor ${sponsor.name} has financial ties to beneficiary ${contractor.name}`
          );
        }
      }
    }

    // Check for rapid procurement awards
    const procurementEvents = billData.timeline?.filter(
      (e: TimelineEvent) => e.type === 'procurement'
    ) || [];
    
    if (procurementEvents.length > 0) {
      score += 20;
      evidence.push(`${procurementEvents.length} procurement events linked to bill`);
    }

    return {
      score: Math.min(score, 100),
      description: score > 50 
        ? 'Significant beneficiary-sponsor connections detected' 
        : 'Limited beneficiary concerns identified',
      evidence
    };
  }

  /**
   * Analyze scope creep in bill text
   */
  private analyzeScopeCreep(billData: any): {
    score: number;
    description: string;
    evidence: string[];
  } {
    // This would use NLP to analyze bill text for scope beyond stated purpose
    // For now, return placeholder implementation
    const evidence: string[] = [];
    let score = 0;

    // Check for broad powers or vague language
    const broadTerms = ['emergency', 'necessary', 'appropriate', 'reasonable'];
    const billText = billData.text || '';
    
    broadTerms.forEach(term => {
      const matches = (billText.match(new RegExp(term, 'gi')) || []).length;
      if (matches > 3) {
        score += 15;
        evidence.push(`Frequent use of broad term "${term}" (${matches} times)`);
      }
    });

    return {
      score: Math.min(score, 100),
      description: score > 40 
        ? 'Bill contains broad or vague language' 
        : 'Bill scope appears focused',
      evidence
    };
  }

  /**
   * Analyze network centrality of key actors
   */
  private analyzeNetworkCentrality(stakeholders: Stakeholder[]): {
    score: number;
    description: string;
    evidence: string[];
  } {
    const evidence: string[] = [];
    let score = 0;

    // Calculate connection density
    const totalConnections = stakeholders.reduce(
      (sum, s) => sum + s.connections.length, 0
    );
    const avgConnections = totalConnections / stakeholders.length;

    if (avgConnections > 3) {
      score += 40;
      evidence.push(`High network density: ${avgConnections.toFixed(1)} avg connections per actor`);
    }

    // Look for central actors with many high-strength connections
    stakeholders.forEach(stakeholder => {
      const strongConnections = stakeholder.connections.filter(c => c.strength > 0.7);
      if (strongConnections.length > 2) {
        score += 20;
        evidence.push(`${stakeholder.name} has ${strongConnections.length} strong connections`);
      }
    });

    return {
      score: Math.min(score, 100),
      description: score > 50 
        ? 'Dense network of connected actors identified' 
        : 'Normal stakeholder network pattern',
      evidence
    };
  }

  /**
   * Calculate composite score from indicators
   */
  private calculateCompositeScore(indicators: any): number {
    const { weights } = this.config;
    
    return Math.round(
      indicators.timing.score * weights.timing +
      indicators.beneficiaryMismatch.score * weights.beneficiaryMismatch +
      indicators.scopeCreep.score * weights.scopeCreep +
      indicators.networkCentrality.score * weights.networkCentrality
    );
  }

  /**
   * Calculate confidence based on data quality and quantity
   */
  private calculateConfidence(indicators: any, timelineLength: number): number {
    let confidence = 0.5; // baseline
    
    // More timeline events = higher confidence
    confidence += Math.min(timelineLength * 0.05, 0.3);
    
    // Evidence count affects confidence
    const totalEvidence = Object.values(indicators).reduce(
      (sum: number, indicator: any) => sum + indicator.evidence.length, 0
    );
    confidence += Math.min(totalEvidence * 0.02, 0.2);
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate human-readable rationale
   */
  private generateRationale(indicators: any): string[] {
    const rationale: string[] = [];
    
    Object.entries(indicators).forEach(([key, indicator]: [string, any]) => {
      if (indicator.score > 30) {
        rationale.push(`${key}: ${indicator.description}`);
      }
    });

    return rationale;
  }

  /**
   * Aggregate sources from all analysis components
   */
  private aggregateSources(timeline: TimelineEvent[], stakeholders: Stakeholder[]): Source[] {
    const sources: Source[] = [];
    
    timeline.forEach(event => {
      sources.push(...event.sources);
    });
    
    stakeholders.forEach(stakeholder => {
      stakeholder.connections.forEach(connection => {
        sources.push(...connection.sources);
      });
    });

    // Deduplicate by URL
    const uniqueSources = sources.filter((source, index, self) => 
      index === self.findIndex(s => s.url === source.url)
    );

    return uniqueSources;
  }

  // Placeholder methods for data fetching
  private async fetchBillData(billId: string): Promise<any> {
    // Implementation would fetch from your existing bill API
    return {};
  }

  private async buildTimeline(billId: string): Promise<TimelineEvent[]> {
    // Implementation would build timeline from multiple data sources
    return [];
  }

  private async analyzeStakeholders(billId: string): Promise<Stakeholder[]> {
    // Implementation would analyze stakeholder networks
    return [];
  }
}