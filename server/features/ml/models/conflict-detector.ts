import { db } from '@server/infrastructure/database';
/**
 * Conflict Detector - MWANGA Stack
 * 
 * Three-tier conflict-of-interest detection:
 * - Tier 1: Direct matching rules (<1ms)
 * - Tier 2: NetworkX graph traversal (~10ms)
 * - Tier 3: Ollama narration (pre-solved conflicts) (~500ms)
 */

import { BaseAnalyzer } from './base-analyzer';
import type {
  ConflictDetectionInput,
  ConflictDetectionResult,
  ConflictPath,
  ConflictGraphNode,
  ConflictGraphEdge,
  AnalysisTier,
} from './types';

// Mock graph data (in production, this would come from PostgreSQL/NetworkX)
const MOCK_GRAPH_NODES: ConflictGraphNode[] = [
  {
    id: 1,
    nodeType: 'sponsor',
    entityId: 'MP-001',
    entityName: 'Hon. John Doe',
    metadata: { constituency: 'Nairobi', party: 'Party A' },
  },
  {
    id: 2,
    nodeType: 'company',
    entityId: 'COMP-001',
    entityName: 'Tech Corp Ltd',
    metadata: { sector: 'technology', revenue: 5000000 },
  },
  {
    id: 3,
    nodeType: 'industry',
    entityId: 'IND-001',
    entityName: 'Technology Sector',
    metadata: { size: 'large' },
  },
];

const MOCK_GRAPH_EDGES: ConflictGraphEdge[] = [
  {
    id: 1,
    sourceNodeId: 1,
    targetNodeId: 2,
    relationshipType: 'owns',
    strength: 0.8,
    confidence: 0.95,
    sourceDocument: 'Financial Disclosure 2025',
  },
  {
    id: 2,
    sourceNodeId: 2,
    targetNodeId: 3,
    relationshipType: 'operates_in',
    strength: 1.0,
    confidence: 1.0,
  },
];

export class ConflictDetector extends BaseAnalyzer<
  ConflictDetectionInput,
  ConflictDetectionResult
> {
  /**
   * Tier-specific analysis implementation
   */
  protected async analyzeWithTier(
    input: ConflictDetectionInput,
    tier: AnalysisTier
  ): Promise<ConflictDetectionResult> {
    switch (tier) {
      case 'tier1':
        return this.analyzeTier1(input);
      case 'tier2':
        return this.analyzeTier2(input);
      case 'tier3':
        return this.analyzeTier3(input);
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Tier 1: Direct matching rules
   * Fast lookup for obvious conflicts
   */
  private async analyzeTier1(
    input: ConflictDetectionInput
  ): Promise<ConflictDetectionResult> {
    // Simple rule: Check if sponsor directly owns company in bill sector
    const sponsorNode = MOCK_GRAPH_NODES.find(
      (n) => n.nodeType === 'sponsor' && n.entityId === `MP-${input.sponsorId.toString().padStart(3, '0')}`
    );

    if (!sponsorNode) {
      // No sponsor found, escalate to Tier 2
      throw new Error('Sponsor not found in graph, escalating to Tier 2');
    }

    // Check for direct ownership edges
    const directEdges = MOCK_GRAPH_EDGES.filter(
      (e) => e.sourceNodeId === sponsorNode.id && e.relationshipType === 'owns'
    );

    if (directEdges.length === 0) {
      // No direct conflicts, but might have indirect ones
      throw new Error('No direct conflicts found, escalating to Tier 2');
    }

    // Found direct conflict
    const conflictPath: ConflictPath = {
      nodes: [
        sponsorNode,
        MOCK_GRAPH_NODES.find((n) => n.id === directEdges[0].targetNodeId)!,
      ],
      edges: [directEdges[0]],
      pathStrength: directEdges[0].strength,
    };

    return {
      hasConflict: true,
      conflictType: 'direct',
      confidence: directEdges[0].confidence,
      conflictPaths: [conflictPath],
      narrative: `Direct conflict: ${sponsorNode.entityName} owns ${conflictPath.nodes[1].entityName}`,
    };
  }

  /**
   * Tier 2: NetworkX graph traversal
   * Find indirect conflicts through graph analysis
   */
  private async analyzeTier2(
    input: ConflictDetectionInput
  ): Promise<ConflictDetectionResult> {
    // TODO: Implement actual NetworkX graph traversal
    console.log('Tier 2: Traversing conflict graph with NetworkX...');

    // Simulate graph traversal
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Mock graph traversal results
    const sponsorNode = MOCK_GRAPH_NODES[0];
    const companyNode = MOCK_GRAPH_NODES[1];
    const industryNode = MOCK_GRAPH_NODES[2];

    const conflictPath: ConflictPath = {
      nodes: [sponsorNode, companyNode, industryNode],
      edges: [MOCK_GRAPH_EDGES[0], MOCK_GRAPH_EDGES[1]],
      pathStrength: 0.8,
    };

    // If conflict found, escalate to Tier 3 for narrative
    if (conflictPath.pathStrength > 0.5) {
      throw new Error('Conflict found, escalating to Tier 3 for narrative generation');
    }

    return {
      hasConflict: false,
      confidence: 0.9,
      conflictPaths: [],
      narrative: 'No conflicts of interest detected',
    };
  }

  /**
   * Tier 3: Ollama narration
   * Generate plain-English explanation of conflict
   */
  private async analyzeTier3(
    input: ConflictDetectionInput
  ): Promise<ConflictDetectionResult> {
    // TODO: Implement Ollama integration
    console.log('Tier 3: Generating conflict narrative with Ollama...');

    // Get Tier 2 results (graph traversal)
    let tier2Results: ConflictDetectionResult;
    try {
      tier2Results = await this.analyzeTier2(input);
    } catch {
      // Tier 2 threw error, meaning conflict was found
      // Reconstruct the conflict path
      const sponsorNode = MOCK_GRAPH_NODES[0];
      const companyNode = MOCK_GRAPH_NODES[1];
      const industryNode = MOCK_GRAPH_NODES[2];

      const conflictPath: ConflictPath = {
        nodes: [sponsorNode, companyNode, industryNode],
        edges: [MOCK_GRAPH_EDGES[0], MOCK_GRAPH_EDGES[1]],
        pathStrength: 0.8,
      };

      tier2Results = {
        hasConflict: true,
        conflictType: 'indirect',
        confidence: 0.85,
        conflictPaths: [conflictPath],
        narrative: '', // Will be generated by Ollama
      };
    }

    if (!tier2Results.hasConflict) {
      return tier2Results;
    }

    // Generate narrative with Ollama
    const prompt = `You are a Kenyan legislative transparency expert. Explain this conflict of interest in plain English for citizens.

Bill ID: ${input.billId}
Sponsor ID: ${input.sponsorId}

Conflict Path:
${tier2Results.conflictPaths[0].nodes.map((n, i) => {
  const edge = tier2Results.conflictPaths[0].edges[i];
  return `${i + 1}. ${n.entityName} (${n.nodeType})${edge ? ` --[${edge.relationshipType}]--> ` : ''}`;
}).join('\n')}

Source: ${tier2Results.conflictPaths[0].edges[0]?.sourceDocument || 'Financial disclosures'}

Write a clear, factual explanation of this conflict for Kenyan citizens. Include:
1. Who is involved
2. What the relationship is
3. Why this creates a conflict
4. What the implications are

Keep it under 150 words.`;

    // Simulate Ollama call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock narrative
    const narrative = `${tier2Results.conflictPaths[0].nodes[0].entityName} has a significant financial interest in ${tier2Results.conflictPaths[0].nodes[1].entityName}, which operates in the ${tier2Results.conflictPaths[0].nodes[2].entityName}. This bill directly affects this sector, creating a potential conflict of interest. The sponsor may benefit financially from the bill's passage, which could compromise their ability to act in the public interest. This relationship was disclosed in their 2025 financial disclosure statement.`;

    return {
      ...tier2Results,
      narrative,
    };
  }

  /**
   * Calculate confidence based on tier and result
   */
  protected getConfidence(
    result: ConflictDetectionResult,
    tier: AnalysisTier
  ): number {
    if (!result.hasConflict) return 0.9;

    const baseConfidence = result.confidence || 0.8;

    if (tier === 'tier3') return Math.min(baseConfidence * 1.1, 1.0);
    if (tier === 'tier2') return baseConfidence;
    return Math.min(baseConfidence * 0.9, 0.95);
  }

  /**
   * Helper: Build graph from database
   * In production, this would query PostgreSQL and build NetworkX graph
   */
  private async buildConflictGraph(): Promise<{
    nodes: ConflictGraphNode[];
    edges: ConflictGraphEdge[];
  }> {
    // TODO: Query database
    // const nodes = await db.select().from(conflictGraphNodes);
    // const edges = await db.select().from(conflictGraphEdges);

    return {
      nodes: MOCK_GRAPH_NODES,
      edges: MOCK_GRAPH_EDGES,
    };
  }

  /**
   * Helper: Find shortest path between two nodes
   * Uses BFS for unweighted shortest path
   */
  private findShortestPath(
    startNodeId: number,
    endNodeId: number,
    edges: ConflictGraphEdge[]
  ): ConflictGraphEdge[] | null {
    // Simple BFS implementation
    const queue: { nodeId: number; path: ConflictGraphEdge[] }[] = [
      { nodeId: startNodeId, path: [] },
    ];
    const visited = new Set<number>([startNodeId]);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (nodeId === endNodeId) {
        return path;
      }

      const outgoingEdges = edges.filter((e) => e.sourceNodeId === nodeId);

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.targetNodeId)) {
          visited.add(edge.targetNodeId);
          queue.push({
            nodeId: edge.targetNodeId,
            path: [...path, edge],
          });
        }
      }
    }

    return null;
  }
}

// Export singleton instance
export const conflictDetector = new ConflictDetector({
  enableCaching: true,
  cacheExpiryMs: 3600000, // 1 hour
  enableFallback: true,
});
