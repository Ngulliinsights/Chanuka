import { database as db } from '../../../shared/database/connection.js';
import { 
  sponsors, sponsorAffiliations, sponsorTransparency, billSponsorships, bills,
  type Sponsor, type SponsorAffiliation, type SponsorTransparency 
} from '../../../shared/schema.js';
import { eq, and, sql, desc, gte, lte, count, avg } from 'drizzle-orm';

// Enhanced type definitions for conflict analysis
export interface ConflictDetectionResult {
  conflictId: string;
  sponsorId: number;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  description: string;
  affectedBills: number[];
  financialImpact: number;
  detectedAt: Date;
  confidence: number;
}

export interface ConflictMapping {
  nodes: ConflictNode[];
  edges: ConflictEdge[];
  clusters: ConflictCluster[];
  metrics: NetworkMetrics;
}

export interface ConflictTrend {
  sponsorId: number;
  timeframe: string;
  conflictCount: number;
  severityTrend: 'increasing' | 'decreasing' | 'stable';
  riskScore: number;
  predictions: ConflictPrediction[];
}

export interface ConflictNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill';
  name: string;
  conflictLevel: ConflictSeverity;
  size: number;
  color: string;
  metadata: Record<string, any>;
}

export interface ConflictEdge {
  source: string;
  target: string;
  type: ConflictType;
  weight: number;
  severity: ConflictSeverity;
  label: string;
}

export interface ConflictCluster {
  id: string;
  members: string[];
  centerNode: string;
  conflictDensity: number;
  riskLevel: ConflictSeverity;
}

export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  density: number;
  clustering: number;
  centralityScores: Record<string, number>;
  riskDistribution: Record<ConflictSeverity, number>;
}

export interface ConflictPrediction {
  billId: number;
  billTitle: string;
  predictedConflictType: ConflictType;
  probability: number;
  riskFactors: string[];
}

export type ConflictType = 
  | 'financial_direct'
  | 'financial_indirect' 
  | 'organizational'
  | 'family_business'
  | 'voting_pattern'
  | 'timing_suspicious'
  | 'disclosure_incomplete';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export class SponsorConflictAnalysisService {
  private readonly conflictThresholds = {
    financial: {
      critical: 10000000,
      high: 5000000,
      medium: 1000000,
      low: 100000
    },
    timing: {
      suspicious_days: 30,
      very_suspicious_days: 7
    },
    disclosure: {
      complete_threshold: 0.9,
      adequate_threshold: 0.7
    }
  };

  private readonly severityColors = {
    low: '#4CAF50',
    medium: '#FF9800', 
    high: '#FF5722',
    critical: '#D32F2F'
  };

  /**
   * Automated conflict detection algorithms
   * Analyzes sponsors for various types of conflicts using multiple detection methods
   */
  async detectConflicts(sponsorId?: number): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    
    // Get sponsors to analyze
    const sponsorsToAnalyze = sponsorId 
      ? await this.getSponsor(sponsorId)
      : await this.getAllActiveSponsors();

    if (!sponsorsToAnalyze.length) {
      return conflicts;
    }

    // Run parallel conflict detection algorithms
    const detectionPromises = sponsorsToAnalyze.map(async (sponsor) => {
      const sponsorConflicts = await Promise.all([
        this.detectFinancialConflicts(sponsor),
        this.detectOrganizationalConflicts(sponsor),
        this.detectVotingPatternConflicts(sponsor),
        this.detectTimingConflicts(sponsor),
        this.detectDisclosureConflicts(sponsor)
      ]);

      return sponsorConflicts.flat();
    });

    const allConflicts = await Promise.all(detectionPromises);
    return allConflicts.flat();
  }

  /**
   * Creates visual conflict mapping and relationship diagrams
   */
  async createConflictMapping(billId?: number): Promise<ConflictMapping> {
    const conflicts = await this.detectConflicts();
    
    // Filter conflicts by bill if specified
    const relevantConflicts = billId 
      ? conflicts.filter(c => c.affectedBills.includes(billId))
      : conflicts;

    const nodes = await this.buildConflictNodes(relevantConflicts);
    const edges = await this.buildConflictEdges(relevantConflicts);
    const clusters = await this.identifyConflictClusters(nodes, edges);
    const metrics = this.calculateNetworkMetrics(nodes, edges);

    return {
      nodes,
      edges,
      clusters,
      metrics
    };
  }

  /**
   * Severity scoring for different types of conflicts
   */
  calculateConflictSeverity(
    conflictType: ConflictType,
    financialImpact: number,
    additionalFactors: Record<string, any> = {}
  ): ConflictSeverity {
    let baseScore = 0;

    // Base scoring by conflict type
    switch (conflictType) {
      case 'financial_direct':
        baseScore = 40;
        break;
      case 'financial_indirect':
        baseScore = 25;
        break;
      case 'organizational':
        baseScore = 20;
        break;
      case 'family_business':
        baseScore = 35;
        break;
      case 'voting_pattern':
        baseScore = 30;
        break;
      case 'timing_suspicious':
        baseScore = 45;
        break;
      case 'disclosure_incomplete':
        baseScore = 15;
        break;
    }

    // Financial impact modifier
    if (financialImpact >= this.conflictThresholds.financial.critical) {
      baseScore += 30;
    } else if (financialImpact >= this.conflictThresholds.financial.high) {
      baseScore += 20;
    } else if (financialImpact >= this.conflictThresholds.financial.medium) {
      baseScore += 10;
    }

    // Additional factors
    if (additionalFactors.multipleAffiliations) {
      baseScore += 10;
    }
    if (additionalFactors.recentActivity) {
      baseScore += 15;
    }
    if (additionalFactors.publicScrutiny) {
      baseScore += 5;
    }

    // Convert to severity level
    if (baseScore >= 70) return 'critical';
    if (baseScore >= 50) return 'high';
    if (baseScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Conflict trend analysis over time
   */
  async analyzeConflictTrends(
    sponsorId?: number,
    timeframeMonths: number = 12
  ): Promise<ConflictTrend[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - timeframeMonths);

    const sponsors = sponsorId 
      ? await this.getSponsor(sponsorId)
      : await this.getAllActiveSponsors();

    const trends: ConflictTrend[] = [];

    for (const sponsor of sponsors) {
      const historicalConflicts = await this.getHistoricalConflicts(sponsor.id, startDate);
      const trend = await this.calculateTrendMetrics(sponsor.id, historicalConflicts, timeframeMonths);
      const predictions = await this.generateConflictPredictions(sponsor.id);

      trends.push({
        sponsorId: sponsor.id,
        timeframe: `${timeframeMonths} months`,
        conflictCount: historicalConflicts.length,
        severityTrend: trend.severityTrend,
        riskScore: trend.riskScore,
        predictions
      });
    }

    return trends.sort((a, b) => b.riskScore - a.riskScore);
  }

  // Private helper methods for conflict detection

  private async detectFinancialConflicts(sponsor: Sponsor): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    
    // Get sponsor's financial data
    const [affiliations, transparency, sponsorships] = await Promise.all([
      this.getSponsorAffiliations(sponsor.id),
      this.getSponsorTransparency(sponsor.id),
      this.getSponsorBills(sponsor.id)
    ]);

    // Direct financial conflicts
    const directFinancialAffiliations = affiliations.filter(
      a => a.conflictType === 'financial' && a.type === 'economic'
    );

    for (const affiliation of directFinancialAffiliations) {
      const financialImpact = this.estimateFinancialImpact(affiliation, sponsorships);
      
      if (financialImpact > this.conflictThresholds.financial.low) {
        conflicts.push({
          conflictId: `fin_direct_${sponsor.id}_${affiliation.id}`,
          sponsorId: sponsor.id,
          conflictType: 'financial_direct',
          severity: this.calculateConflictSeverity('financial_direct', financialImpact),
          description: `Direct financial interest in ${affiliation.organization} while sponsoring related legislation`,
          affectedBills: sponsorships.map(s => s.billId),
          financialImpact,
          detectedAt: new Date(),
          confidence: 0.9
        });
      }
    }

    // Indirect financial conflicts through family/business networks
    const indirectAffiliations = affiliations.filter(
      a => a.type === 'family' || a.type === 'business_network'
    );

    for (const affiliation of indirectAffiliations) {
      const financialImpact = this.estimateFinancialImpact(affiliation, sponsorships) * 0.6; // Reduced impact for indirect
      
      if (financialImpact > this.conflictThresholds.financial.medium) {
        conflicts.push({
          conflictId: `fin_indirect_${sponsor.id}_${affiliation.id}`,
          sponsorId: sponsor.id,
          conflictType: 'financial_indirect',
          severity: this.calculateConflictSeverity('financial_indirect', financialImpact),
          description: `Indirect financial interest through ${affiliation.organization}`,
          affectedBills: sponsorships.map(s => s.billId),
          financialImpact,
          detectedAt: new Date(),
          confidence: 0.7
        });
      }
    }

    return conflicts;
  }

  private async detectOrganizationalConflicts(sponsor: Sponsor): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    const affiliations = await this.getSponsorAffiliations(sponsor.id);
    const sponsorships = await this.getSponsorBills(sponsor.id);

    // Look for organizational conflicts where sponsor has leadership roles
    const leadershipRoles = affiliations.filter(
      a => a.role && ['director', 'board', 'executive', 'chairman', 'ceo'].some(
        role => a.role.toLowerCase().includes(role)
      )
    );

    for (const affiliation of leadershipRoles) {
      const relatedBills = await this.findBillsAffectingOrganization(affiliation.organization);
      const sponsoredRelatedBills = sponsorships.filter(s => 
        relatedBills.some(rb => rb.id === s.billId)
      );

      if (sponsoredRelatedBills.length > 0) {
        conflicts.push({
          conflictId: `org_${sponsor.id}_${affiliation.id}`,
          sponsorId: sponsor.id,
          conflictType: 'organizational',
          severity: this.calculateConflictSeverity('organizational', 0, {
            multipleAffiliations: leadershipRoles.length > 2,
            recentActivity: this.isRecentActivity(affiliation)
          }),
          description: `Leadership role in ${affiliation.organization} while sponsoring related legislation`,
          affectedBills: sponsoredRelatedBills.map(s => s.billId),
          financialImpact: 0,
          detectedAt: new Date(),
          confidence: 0.85
        });
      }
    }

    return conflicts;
  }

  private async detectVotingPatternConflicts(sponsor: Sponsor): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    
    // This would analyze voting patterns against financial interests
    // For now, implementing a simplified version
    const affiliations = await this.getSponsorAffiliations(sponsor.id);
    const votingAlignment = this.parseNumericValue(sponsor.votingAlignment);

    if (votingAlignment > 90 && affiliations.length > 3) {
      conflicts.push({
        conflictId: `voting_${sponsor.id}`,
        sponsorId: sponsor.id,
        conflictType: 'voting_pattern',
        severity: this.calculateConflictSeverity('voting_pattern', 0, {
          multipleAffiliations: true,
          publicScrutiny: true
        }),
        description: `Unusually high voting alignment (${votingAlignment}%) with financial interests`,
        affectedBills: [],
        financialImpact: 0,
        detectedAt: new Date(),
        confidence: 0.75
      });
    }

    return conflicts;
  }

  private async detectTimingConflicts(sponsor: Sponsor): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    const affiliations = await this.getSponsorAffiliations(sponsor.id);
    const sponsorships = await this.getSponsorBills(sponsor.id);

    // Check for suspicious timing between affiliations and bill sponsorship
    for (const sponsorship of sponsorships) {
      const bill = await this.getBill(sponsorship.billId);
      if (!bill) continue;

      const suspiciousAffiliations = affiliations.filter(affiliation => {
        if (!affiliation.startDate || !bill.introducedDate) return false;
        
        const daysDiff = Math.abs(
          (new Date(affiliation.startDate).getTime() - new Date(bill.introducedDate).getTime()) 
          / (1000 * 60 * 60 * 24)
        );

        return daysDiff <= this.conflictThresholds.timing.suspicious_days;
      });

      if (suspiciousAffiliations.length > 0) {
        const severity = suspiciousAffiliations.some(a => {
          const daysDiff = Math.abs(
            (new Date(a.startDate!).getTime() - new Date(bill.introducedDate!).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          return daysDiff <= this.conflictThresholds.timing.very_suspicious_days;
        }) ? 'high' : 'medium';

        conflicts.push({
          conflictId: `timing_${sponsor.id}_${sponsorship.billId}`,
          sponsorId: sponsor.id,
          conflictType: 'timing_suspicious',
          severity: severity as ConflictSeverity,
          description: `Suspicious timing between organizational affiliations and bill sponsorship`,
          affectedBills: [sponsorship.billId],
          financialImpact: 0,
          detectedAt: new Date(),
          confidence: 0.8
        });
      }
    }

    return conflicts;
  }

  private async detectDisclosureConflicts(sponsor: Sponsor): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = [];
    const transparency = await this.getSponsorTransparency(sponsor.id);
    const affiliations = await this.getSponsorAffiliations(sponsor.id);

    // Calculate disclosure completeness
    const expectedDisclosures = affiliations.filter(a => 
      a.type === 'economic' || a.conflictType === 'financial'
    ).length;

    const actualDisclosures = transparency.filter(t => 
      t.disclosureType === 'financial' && t.isVerified
    ).length;

    const completeness = expectedDisclosures > 0 ? actualDisclosures / expectedDisclosures : 1;

    if (completeness < this.conflictThresholds.disclosure.adequate_threshold) {
      conflicts.push({
        conflictId: `disclosure_${sponsor.id}`,
        sponsorId: sponsor.id,
        conflictType: 'disclosure_incomplete',
        severity: completeness < 0.5 ? 'high' : 'medium',
        description: `Incomplete financial disclosure (${Math.round(completeness * 100)}% complete)`,
        affectedBills: [],
        financialImpact: 0,
        detectedAt: new Date(),
        confidence: 0.95
      });
    }

    return conflicts;
  }

  // Helper methods for data access and calculations

  private async getSponsor(sponsorId: number): Promise<Sponsor[]> {
    const result = await db.select().from(sponsors).where(eq(sponsors.id, sponsorId));
    return result;
  }

  private async getAllActiveSponsors(): Promise<Sponsor[]> {
    return await db.select().from(sponsors).where(eq(sponsors.isActive, true));
  }

  private async getSponsorAffiliations(sponsorId: number): Promise<SponsorAffiliation[]> {
    return await db.select().from(sponsorAffiliations)
      .where(and(
        eq(sponsorAffiliations.sponsorId, sponsorId),
        eq(sponsorAffiliations.isActive, true)
      ));
  }

  private async getSponsorTransparency(sponsorId: number): Promise<SponsorTransparency[]> {
    return await db.select().from(sponsorTransparency)
      .where(eq(sponsorTransparency.sponsorId, sponsorId));
  }

  private async getSponsorBills(sponsorId: number) {
    return await db.select().from(billSponsorships)
      .where(and(
        eq(billSponsorships.sponsorId, sponsorId),
        eq(billSponsorships.isActive, true)
      ));
  }

  private async getBill(billId: number) {
    const result = await db.select().from(bills).where(eq(bills.id, billId));
    return result[0];
  }

  private estimateFinancialImpact(affiliation: SponsorAffiliation, sponsorships: any[]): number {
    // Simplified financial impact estimation
    // In a real implementation, this would analyze bill content and potential benefits
    const baseImpact = sponsorships.length * 1000000; // $1M per sponsored bill
    
    if (affiliation.type === 'economic') {
      return baseImpact * 2;
    }
    if (affiliation.conflictType === 'financial') {
      return baseImpact * 1.5;
    }
    
    return baseImpact;
  }

  private async findBillsAffectingOrganization(organization: string) {
    // Simplified - would use more sophisticated text analysis in practice
    return await db.select().from(bills)
      .where(sql`${bills.content} ILIKE ${'%' + organization + '%'} OR ${bills.title} ILIKE ${'%' + organization + '%'}`);
  }

  private isRecentActivity(affiliation: SponsorAffiliation): boolean {
    if (!affiliation.startDate) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(affiliation.startDate) > sixMonthsAgo;
  }

  private parseNumericValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private async buildConflictNodes(conflicts: ConflictDetectionResult[]): Promise<ConflictNode[]> {
    const nodes: ConflictNode[] = [];
    const seenSponsors = new Set<number>();
    const seenOrganizations = new Set<string>();

    for (const conflict of conflicts) {
      // Add sponsor node
      if (!seenSponsors.has(conflict.sponsorId)) {
        const sponsor = await this.getSponsor(conflict.sponsorId);
        if (sponsor.length > 0) {
          nodes.push({
            id: `sponsor_${conflict.sponsorId}`,
            type: 'sponsor',
            name: sponsor[0].name,
            conflictLevel: conflict.severity,
            size: this.calculateNodeSize(conflict.severity),
            color: this.severityColors[conflict.severity],
            metadata: {
              party: sponsor[0].party,
              constituency: sponsor[0].constituency,
              role: sponsor[0].role
            }
          });
          seenSponsors.add(conflict.sponsorId);
        }
      }

      // Add organization nodes from affiliations
      const affiliations = await this.getSponsorAffiliations(conflict.sponsorId);
      for (const affiliation of affiliations) {
        if (!seenOrganizations.has(affiliation.organization)) {
          nodes.push({
            id: `org_${affiliation.organization.replace(/\s+/g, '_')}`,
            type: 'organization',
            name: affiliation.organization,
            conflictLevel: conflict.severity,
            size: this.calculateNodeSize(conflict.severity) * 0.8,
            color: this.severityColors[conflict.severity],
            metadata: {
              type: affiliation.type,
              conflictType: affiliation.conflictType
            }
          });
          seenOrganizations.add(affiliation.organization);
        }
      }
    }

    return nodes;
  }

  private async buildConflictEdges(conflicts: ConflictDetectionResult[]): Promise<ConflictEdge[]> {
    const edges: ConflictEdge[] = [];

    for (const conflict of conflicts) {
      const affiliations = await this.getSponsorAffiliations(conflict.sponsorId);
      
      for (const affiliation of affiliations) {
        edges.push({
          source: `sponsor_${conflict.sponsorId}`,
          target: `org_${affiliation.organization.replace(/\s+/g, '_')}`,
          type: conflict.conflictType,
          weight: this.calculateEdgeWeight(conflict.severity),
          severity: conflict.severity,
          label: this.getConflictTypeLabel(conflict.conflictType)
        });
      }
    }

    return edges;
  }

  private async identifyConflictClusters(nodes: ConflictNode[], edges: ConflictEdge[]): Promise<ConflictCluster[]> {
    // Simplified clustering algorithm
    const clusters: ConflictCluster[] = [];
    const visited = new Set<string>();

    for (const node of nodes) {
      if (visited.has(node.id) || node.type !== 'sponsor') continue;

      const cluster = this.findConnectedComponents(node.id, nodes, edges, visited);
      if (cluster.length > 1) {
        const centerNode = this.findCenterNode(cluster, edges);
        const conflictDensity = this.calculateClusterDensity(cluster, edges);
        const riskLevel = this.calculateClusterRiskLevel(cluster, nodes);

        clusters.push({
          id: `cluster_${clusters.length + 1}`,
          members: cluster,
          centerNode,
          conflictDensity,
          riskLevel
        });
      }
    }

    return clusters;
  }

  private calculateNetworkMetrics(nodes: ConflictNode[], edges: ConflictEdge[]): NetworkMetrics {
    const totalNodes = nodes.length;
    const totalEdges = edges.length;
    const density = totalNodes > 1 ? (2 * totalEdges) / (totalNodes * (totalNodes - 1)) : 0;
    
    const centralityScores: Record<string, number> = {};
    nodes.forEach(node => {
      const connections = edges.filter(e => e.source === node.id || e.target === node.id).length;
      centralityScores[node.id] = connections;
    });

    const riskDistribution: Record<ConflictSeverity, number> = {
      low: nodes.filter(n => n.conflictLevel === 'low').length,
      medium: nodes.filter(n => n.conflictLevel === 'medium').length,
      high: nodes.filter(n => n.conflictLevel === 'high').length,
      critical: nodes.filter(n => n.conflictLevel === 'critical').length
    };

    return {
      totalNodes,
      totalEdges,
      density,
      clustering: this.calculateClusteringCoefficient(nodes, edges),
      centralityScores,
      riskDistribution
    };
  }

  private calculateNodeSize(severity: ConflictSeverity): number {
    const sizeMap = { low: 10, medium: 15, high: 20, critical: 25 };
    return sizeMap[severity];
  }

  private calculateEdgeWeight(severity: ConflictSeverity): number {
    const weightMap = { low: 1, medium: 2, high: 3, critical: 4 };
    return weightMap[severity];
  }

  private getConflictTypeLabel(type: ConflictType): string {
    const labelMap = {
      financial_direct: 'Direct Financial',
      financial_indirect: 'Indirect Financial',
      organizational: 'Organizational',
      family_business: 'Family/Business',
      voting_pattern: 'Voting Pattern',
      timing_suspicious: 'Suspicious Timing',
      disclosure_incomplete: 'Incomplete Disclosure'
    };
    return labelMap[type];
  }

  private findConnectedComponents(
    startNode: string, 
    nodes: ConflictNode[], 
    edges: ConflictEdge[], 
    visited: Set<string>
  ): string[] {
    const component: string[] = [];
    const stack = [startNode];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;

      visited.add(current);
      component.push(current);

      const neighbors = edges
        .filter(e => e.source === current || e.target === current)
        .map(e => e.source === current ? e.target : e.source)
        .filter(n => !visited.has(n));

      stack.push(...neighbors);
    }

    return component;
  }

  private findCenterNode(cluster: string[], edges: ConflictEdge[]): string {
    let maxConnections = 0;
    let centerNode = cluster[0];

    for (const node of cluster) {
      const connections = edges.filter(e => 
        (e.source === node || e.target === node) && 
        (cluster.includes(e.source) && cluster.includes(e.target))
      ).length;

      if (connections > maxConnections) {
        maxConnections = connections;
        centerNode = node;
      }
    }

    return centerNode;
  }

  private calculateClusterDensity(cluster: string[], edges: ConflictEdge[]): number {
    const clusterEdges = edges.filter(e => 
      cluster.includes(e.source) && cluster.includes(e.target)
    ).length;
    
    const maxPossibleEdges = (cluster.length * (cluster.length - 1)) / 2;
    return maxPossibleEdges > 0 ? clusterEdges / maxPossibleEdges : 0;
  }

  private calculateClusterRiskLevel(cluster: string[], nodes: ConflictNode[]): ConflictSeverity {
    const clusterNodes = nodes.filter(n => cluster.includes(n.id));
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    
    const avgScore = clusterNodes.reduce((sum, node) => 
      sum + severityScores[node.conflictLevel], 0
    ) / clusterNodes.length;

    if (avgScore >= 3.5) return 'critical';
    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private calculateClusteringCoefficient(nodes: ConflictNode[], edges: ConflictEdge[]): number {
    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const node of nodes) {
      const neighbors = this.getNeighbors(node.id, edges);
      if (neighbors.length < 2) continue;

      const possibleEdges = (neighbors.length * (neighbors.length - 1)) / 2;
      const actualEdges = edges.filter(e => 
        neighbors.includes(e.source) && neighbors.includes(e.target)
      ).length;

      totalCoefficient += actualEdges / possibleEdges;
      nodeCount++;
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  private getNeighbors(nodeId: string, edges: ConflictEdge[]): string[] {
    return edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);
  }

  private async getHistoricalConflicts(sponsorId: number, startDate: Date): Promise<ConflictDetectionResult[]> {
    // This would query historical conflict data
    // For now, returning current conflicts as a placeholder
    return await this.detectConflicts(sponsorId);
  }

  private async calculateTrendMetrics(
    sponsorId: number, 
    historicalConflicts: ConflictDetectionResult[], 
    timeframeMonths: number
  ) {
    // Simplified trend calculation
    const recentConflicts = historicalConflicts.filter(c => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return c.detectedAt > threeMonthsAgo;
    });

    const olderConflicts = historicalConflicts.filter(c => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return c.detectedAt <= threeMonthsAgo;
    });

    const recentSeverityAvg = this.calculateAverageSeverity(recentConflicts);
    const olderSeverityAvg = this.calculateAverageSeverity(olderConflicts);

    let severityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentSeverityAvg > olderSeverityAvg + 0.5) severityTrend = 'increasing';
    else if (recentSeverityAvg < olderSeverityAvg - 0.5) severityTrend = 'decreasing';

    const riskScore = Math.min(
      (historicalConflicts.length * 10) + (recentSeverityAvg * 20),
      100
    );

    return { severityTrend, riskScore };
  }

  private calculateAverageSeverity(conflicts: ConflictDetectionResult[]): number {
    if (conflicts.length === 0) return 0;
    
    const severityScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const total = conflicts.reduce((sum, c) => sum + severityScores[c.severity], 0);
    return total / conflicts.length;
  }

  private async generateConflictPredictions(sponsorId: number): Promise<ConflictPrediction[]> {
    // Simplified prediction algorithm
    // In practice, this would use machine learning models
    const upcomingBills = await db.select()
      .from(bills)
      .where(eq(bills.status, 'introduced'))
      .limit(5);

    const predictions: ConflictPrediction[] = [];
    const affiliations = await this.getSponsorAffiliations(sponsorId);

    for (const bill of upcomingBills) {
      const relevantAffiliations = affiliations.filter(a => 
        bill.content?.toLowerCase().includes(a.organization.toLowerCase()) ||
        bill.title.toLowerCase().includes(a.organization.toLowerCase())
      );

      if (relevantAffiliations.length > 0) {
        predictions.push({
          billId: bill.id,
          billTitle: bill.title,
          predictedConflictType: 'financial_direct',
          probability: Math.min(relevantAffiliations.length * 0.3, 0.9),
          riskFactors: relevantAffiliations.map(a => `${a.role} at ${a.organization}`)
        });
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }
}

export const sponsorConflictAnalysisService = new SponsorConflictAnalysisService();