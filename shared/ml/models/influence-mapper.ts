// ============================================================================
// INFLUENCE MAPPER - ML Model for Political Influence Network Analysis
// ============================================================================
// Maps and analyzes influence networks, power relationships, and lobbying patterns

import { z } from 'zod';

import { GraphAnalyzer, Statistics, Cache } from './shared_utils';

export const InfluenceInputSchema = z.object({
  analysisType: z.enum(['network_analysis', 'influence_prediction', 'lobbying_detection', 'power_mapping']),
  entities: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum(['politician', 'organization', 'company', 'lobbyist', 'donor', 'media']),
    name: z.string(),
    metadata: z.record(z.any()).optional(),
  })),
  relationships: z.array(z.object({
    sourceId: z.string().uuid(),
    targetId: z.string().uuid(),
    type: z.enum(['financial', 'employment', 'family', 'business', 'political', 'social']),
    strength: z.number().min(0).max(1),
    direction: z.enum(['bidirectional', 'source_to_target', 'target_to_source']),
    metadata: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      value: z.number().optional(),
      description: z.string().optional(),
    }).optional(),
  })),
  contextualData: z.object({
    timeframe: z.object({
      start: z.string(),
      end: z.string(),
    }),
    focusEntity: z.string().uuid().optional(),
    billsInScope: z.array(z.string().uuid()).optional(),
    eventsInScope: z.array(z.object({
      date: z.string(),
      type: z.string(),
      description: z.string(),
      participants: z.array(z.string().uuid()),
    })).optional(),
  }),
});

export const InfluenceOutputSchema = z.object({
  networkMetrics: z.object({
    totalNodes: z.number(),
    totalEdges: z.number(),
    density: z.number().min(0).max(1),
    clustering: z.number().min(0).max(1),
    averagePathLength: z.number(),
  }),
  influenceRankings: z.array(z.object({
    entityId: z.string().uuid(),
    entityName: z.string(),
    influenceScore: z.number().min(0).max(100),
    centrality: z.object({
      degree: z.number(),
      betweenness: z.number(),
      closeness: z.number(),
      eigenvector: z.number(),
    }),
    influenceType: z.enum(['broker', 'hub', 'authority', 'connector', 'isolate']),
  })),
  powerClusters: z.array(z.object({
    clusterId: z.string(),
    members: z.array(z.string().uuid()),
    clusterType: z.enum(['political_party', 'business_network', 'family_group', 'lobbying_coalition']),
    cohesion: z.number().min(0).max(1),
    influence: z.number().min(0).max(100),
    keyIssues: z.array(z.string()),
  })),
  influenceFlows: z.array(z.object({
    sourceId: z.string().uuid(),
    targetId: z.string().uuid(),
    flowStrength: z.number().min(0).max(1),
    flowType: z.enum(['financial', 'informational', 'political', 'social']),
    pathways: z.array(z.array(z.string().uuid())),
  })),
  lobbyingPatterns: z.object({
    detectedLobbying: z.array(z.object({
      lobbyistId: z.string().uuid(),
      targetId: z.string().uuid(),
      intensity: z.number().min(0).max(1),
      methods: z.array(z.enum(['direct_contact', 'financial_contribution', 'employment_offer', 'social_connection'])),
      effectiveness: z.number().min(0).max(1),
    })),
    lobbyingNetworks: z.array(z.object({
      networkId: z.string(),
      participants: z.array(z.string().uuid()),
      coordinationLevel: z.number().min(0).max(1),
      targetIssues: z.array(z.string()),
    })),
  }),
  riskAssessment: z.object({
    corruptionRisk: z.number().min(0).max(100),
    captureRisk: z.number().min(0).max(100),
    concentrationRisk: z.number().min(0).max(100),
    transparencyGaps: z.array(z.object({
      area: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
    })),
  }),
  recommendations: z.array(z.object({
    type: z.enum(['transparency', 'regulation', 'monitoring', 'investigation']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    description: z.string(),
    targetEntities: z.array(z.string().uuid()),
  })),
});

export type InfluenceInput = z.infer<typeof InfluenceInputSchema>;
export type InfluenceOutput = z.infer<typeof InfluenceOutputSchema>;

interface NetworkGraph {
  nodes: Map<string, NodeData>;
  edges: Map<string, EdgeData>;
  adjacencyMap: Map<string, Set<string>>;
}

interface NodeData {
  id: string;
  type: string;
  name: string;
  metadata?: any;
  connections: Set<string>;
  incomingConnections: Set<string>;
  outgoingConnections: Set<string>;
}

interface EdgeData {
  sourceId: string;
  targetId: string;
  type: string;
  strength: number;
  direction: string;
  metadata?: any;
}

export class InfluenceMapper {
  private modelVersion = '2.1.0';
  private centralityCache = new Cache<any>(3600);

  private readonly RELATIONSHIP_WEIGHTS = {
    financial: 0.8,
    employment: 0.7,
    business: 0.6,
    political: 0.9,
    family: 0.5,
    social: 0.3,
  };

  private readonly RISK_THRESHOLDS = {
    corruption: { low: 25, medium: 50, high: 75 },
    capture: { low: 30, medium: 60, high: 80 },
    concentration: { low: 40, medium: 70, high: 85 },
  };

  async analyze(input: InfluenceInput): Promise<InfluenceOutput> {
    const validatedInput = InfluenceInputSchema.parse(input);
    
    const network = this.buildNetworkGraph(validatedInput);
    const networkMetrics = this.calculateNetworkMetrics(network);
    const influenceRankings = this.calculateInfluenceRankings(network, validatedInput);
    const powerClusters = this.identifyPowerClusters(network, validatedInput);
    const influenceFlows = this.analyzeInfluenceFlows(network, validatedInput);
    const lobbyingPatterns = this.detectLobbyingPatterns(network, validatedInput);
    const riskAssessment = this.assessRisks(network, powerClusters, lobbyingPatterns);
    const recommendations = this.generateRecommendations(riskAssessment, powerClusters);

    return {
      networkMetrics,
      influenceRankings,
      powerClusters,
      influenceFlows,
      lobbyingPatterns,
      riskAssessment,
      recommendations,
    };
  }

  private buildNetworkGraph(input: InfluenceInput): NetworkGraph {
    const nodes = new Map<string, NodeData>();
    const edges = new Map<string, EdgeData>();
    const adjacencyMap = new Map<string, Set<string>>();
    
    // Initialize nodes
    for (const entity of input.entities) {
      nodes.set(entity.id, {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        metadata: entity.metadata,
        connections: new Set(),
        incomingConnections: new Set(),
        outgoingConnections: new Set(),
      });
      adjacencyMap.set(entity.id, new Set());
    }
    
    // Add edges
    for (const relationship of input.relationships) {
      const edgeId = `${relationship.sourceId}-${relationship.targetId}`;
      edges.set(edgeId, {
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        type: relationship.type,
        strength: relationship.strength,
        direction: relationship.direction,
        metadata: relationship.metadata,
      });
      
      const sourceNode = nodes.get(relationship.sourceId);
      const targetNode = nodes.get(relationship.targetId);
      
      if (sourceNode && targetNode) {
        sourceNode.connections.add(relationship.targetId);
        sourceNode.outgoingConnections.add(relationship.targetId);
        targetNode.connections.add(relationship.sourceId);
        targetNode.incomingConnections.add(relationship.sourceId);
        
        adjacencyMap.get(relationship.sourceId)!.add(relationship.targetId);
        
        if (relationship.direction === 'bidirectional') {
          sourceNode.incomingConnections.add(relationship.targetId);
          targetNode.outgoingConnections.add(relationship.sourceId);
          adjacencyMap.get(relationship.targetId)!.add(relationship.sourceId);
        }
      }
    }
    
    return { nodes, edges, adjacencyMap };
  }

  private calculateNetworkMetrics(network: NetworkGraph) {
    const totalNodes = network.nodes.size;
    const totalEdges = network.edges.size;
    
    // Network density
    const possibleEdges = (totalNodes * (totalNodes - 1)) / 2;
    const density = possibleEdges > 0 ? totalEdges / possibleEdges : 0;
    
    // Clustering coefficient
    let totalClustering = 0;
    let nodesWithNeighbors = 0;
    
    for (const [nodeId, node] of Array.from(network.nodes.entries())) {
      const neighbors = Array.from(node.connections);
      if (neighbors.length < 2) continue;
      
      nodesWithNeighbors++;
      let triangles = 0;
      const possibleTriangles = (neighbors.length * (neighbors.length - 1)) / 2;
      
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const adj1 = network.adjacencyMap.get(neighbors[i] as string);
          if (adj1?.has(neighbors[j] as string)) {
            triangles++;
          }
        }
      }
      
      totalClustering += possibleTriangles > 0 ? triangles / possibleTriangles : 0;
    }
    
    const clustering = nodesWithNeighbors > 0 ? totalClustering / nodesWithNeighbors : 0;
    
    // Average path length
    const averagePathLength = this.calculateAveragePathLength(network);
    
    return {
      totalNodes,
      totalEdges,
      density,
      clustering,
      averagePathLength,
    };
  }

  private calculateAveragePathLength(network: NetworkGraph): number {
    const nodes = Array.from(network.nodes.keys());
    let totalPaths = 0;
    let pathCount = 0;
    
    for (let i = 0; i < Math.min(nodes.length, 50); i++) {
      const distances = this.bfsDistances(nodes[i], network.adjacencyMap);
      
      for (const dist of Array.from(distances.values())) {
        if (dist !== Infinity && dist > 0) {
          totalPaths += dist;
          pathCount++;
        }
      }
    }
    
    return pathCount > 0 ? totalPaths / pathCount : 0;
  }

  private bfsDistances(startNode: string, adjacency: Map<string, Set<string>>): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: Array<{ node: string; dist: number }> = [{ node: startNode, dist: 0 }];
    const visited = new Set<string>([startNode]);
    
    distances.set(startNode, 0);
    
    while (queue.length > 0) {
      const { node, dist } = queue.shift()!;
      const neighbors = adjacency.get(node) || new Set();
      
      for (const neighbor of Array.from(neighbors)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          distances.set(neighbor, dist + 1);
          queue.push({ node: neighbor, dist: dist + 1 });
        }
      }
    }
    
    return distances;
  }

  private calculateInfluenceRankings(network: NetworkGraph, input: InfluenceInput) {
    const rankings = [];
    
    for (const [nodeId, node] of Array.from(network.nodes.entries())) {
      const centrality = this.calculateCentralityMeasures(nodeId, network);
      const influenceScore = this.calculateInfluenceScore(nodeId, network, input);
      const influenceType = this.determineInfluenceType(centrality);
      
      rankings.push({
        entityId: nodeId,
        entityName: node.name,
        influenceScore,
        centrality,
        influenceType,
      });
    }
    
    return rankings.sort((a, b) => b.influenceScore - a.influenceScore);
  }

  private calculateCentralityMeasures(nodeId: string, network: NetworkGraph) {
    const cacheKey = `centrality_${nodeId}`;
    const cached = this.centralityCache.get(cacheKey);
    if (cached) return cached;
    
    const node = network.nodes.get(nodeId)!;
    
    // Degree centrality
    const degree = node.connections.size;
    const maxDegree = network.nodes.size - 1;
    const degreeCentrality = maxDegree > 0 ? degree / maxDegree : 0;
    
    // Betweenness centrality
    const betweenness = GraphAnalyzer.calculateBetweenness(nodeId, network.adjacencyMap);
    
    // Closeness centrality
    const closeness = GraphAnalyzer.calculateCloseness(nodeId, network.adjacencyMap);
    
    // Eigenvector centrality
    const eigenvector = GraphAnalyzer.calculateEigenvector(nodeId, network.adjacencyMap, 50);
    
    const result = { degree: degreeCentrality, betweenness, closeness, eigenvector };
    this.centralityCache.set(cacheKey, result);
    
    return result;
  }

  private calculateInfluenceScore(nodeId: string, network: NetworkGraph, input: InfluenceInput): number {
    const node = network.nodes.get(nodeId)!;
    let score = 0;
    
    // Base score from connections
    score += node.connections.size * 10;
    
    // Weighted score from relationships
    for (const [edgeId, edge] of Array.from(network.edges.entries())) {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        const weight = this.RELATIONSHIP_WEIGHTS[edge.type as keyof typeof this.RELATIONSHIP_WEIGHTS] || 0.5;
        score += edge.strength * weight * 20;
      }
    }
    
    // Entity type bonus
    const entityTypeBonus = {
      politician: 20,
      organization: 15,
      company: 10,
      lobbyist: 15,
      donor: 12,
      media: 8,
    };
    score += entityTypeBonus[node.type as keyof typeof entityTypeBonus] || 0;
    
    // Centrality bonus
    const centrality = this.calculateCentralityMeasures(nodeId, network);
    score += (centrality.betweenness + centrality.eigenvector) * 20;
    
    return Math.min(100, score);
  }

  private determineInfluenceType(centrality: any): 'broker' | 'hub' | 'authority' | 'connector' | 'isolate' {
    if (centrality.degree < 0.1) return 'isolate';
    if (centrality.betweenness > 0.3) return 'broker';
    if (centrality.degree > 0.5 && centrality.eigenvector > 0.3) return 'hub';
    if (centrality.eigenvector > 0.4) return 'authority';
    return 'connector';
  }

  private identifyPowerClusters(network: NetworkGraph, input: InfluenceInput) {
    const clusters = [];
    const visited = new Set<string>();
    
    // Use Louvain-style community detection (simplified)
    for (const [nodeId, node] of Array.from(network.nodes.entries())) {
      if (visited.has(nodeId)) continue;
      
      const cluster = this.expandCluster(nodeId, network, visited, 0.5);
      if (cluster.length >= 3) {
        const clusterAnalysis = this.analyzeCluster(cluster, network, input);
        clusters.push({
          clusterId: `cluster_${clusters.length + 1}`,
          members: cluster,
          ...clusterAnalysis,
        });
      }
    }
    
    return clusters;
  }

  private expandCluster(startNodeId: string, network: NetworkGraph, visited: Set<string>, threshold: number = 0.6): string[] {
    const cluster = [];
    const queue = [startNodeId];
    const clusterNodes = new Set<string>();
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId) || clusterNodes.has(nodeId)) continue;
      
      visited.add(nodeId);
      clusterNodes.add(nodeId);
      cluster.push(nodeId);
      
      const node = network.nodes.get(nodeId)!;
      
      for (const neighborId of Array.from(node.connections)) {
        if (!clusterNodes.has(neighborId)) {
          const connectionStrength = this.getConnectionStrength(nodeId, neighborId, network);
          if (connectionStrength > threshold) {
            queue.push(neighborId);
          }
        }
      }
    }
    
    return cluster;
  }

  private getConnectionStrength(nodeId1: string, nodeId2: string, network: NetworkGraph): number {
    const edge1 = network.edges.get(`${nodeId1}-${nodeId2}`);
    const edge2 = network.edges.get(`${nodeId2}-${nodeId1}`);
    return edge1?.strength || edge2?.strength || 0;
  }

  private analyzeCluster(cluster: string[], network: NetworkGraph, input: InfluenceInput) {
    const entityTypes = cluster.map(nodeId => network.nodes.get(nodeId)!.type);
    const clusterType = this.determineClusterType(entityTypes);
    
    // Calculate cohesion
    let internalEdges = 0;
    let totalPossibleEdges = 0;
    
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        totalPossibleEdges++;
        const hasEdge = network.edges.has(`${cluster[i]}-${cluster[j]}`) ||
                       network.edges.has(`${cluster[j]}-${cluster[i]}`);
        if (hasEdge) internalEdges++;
      }
    }
    
    const cohesion = totalPossibleEdges > 0 ? internalEdges / totalPossibleEdges : 0;
    
    // Calculate cluster influence
    const influences = cluster.map(nodeId => this.calculateInfluenceScore(nodeId, network, input));
    const influence = Statistics.mean(influences);
    
    return {
      clusterType,
      cohesion,
      influence,
      keyIssues: this.identifyClusterIssues(cluster, network, input),
    };
  }

  private determineClusterType(entityTypes: string[]): 'political_party' | 'business_network' | 'family_group' | 'lobbying_coalition' {
    const counts = entityTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = entityTypes.length;
    if ((counts.politician || 0) > total * 0.6) return 'political_party';
    if ((counts.company || 0) > total * 0.5) return 'business_network';
    if ((counts.lobbyist || 0) > total * 0.4) return 'lobbying_coalition';
    return 'business_network';
  }

  private identifyClusterIssues(cluster: string[], network: NetworkGraph, input: InfluenceInput): string[] {
    const issues = new Set<string>();
    
    // Extract issues from event participation
    if (input.contextualData.eventsInScope) {
      for (const event of input.contextualData.eventsInScope) {
        const hasClusterMember = event.participants.some(p => cluster.includes(p));
        if (hasClusterMember) {
          issues.add(event.type);
        }
      }
    }
    
    return Array.from(issues).slice(0, 5);
  }

  private analyzeInfluenceFlows(network: NetworkGraph, input: InfluenceInput) {
    const flows = [];
    const maxFlows = 100;
    
    for (const [edgeId, edge] of Array.from(network.edges.entries())) {
      if (flows.length >= maxFlows) break;
      
      const sourceNode = network.nodes.get(edge.sourceId);
      const targetNode = network.nodes.get(edge.targetId);
      
      if (!sourceNode || !targetNode) continue;
      
      const flowStrength = this.calculateFlowStrength(edge, sourceNode, targetNode);
      
      if (flowStrength < 0.3) continue;
      
      const flowType = this.determineFlowType(edge);
      const pathways = GraphAnalyzer.findShortestPaths(edge.sourceId, edge.targetId, network.adjacencyMap, 3);
      
      flows.push({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        flowStrength,
        flowType,
        pathways,
      });
    }
    
    return flows.sort((a, b) => b.flowStrength - a.flowStrength);
  }

  private calculateFlowStrength(edge: EdgeData, sourceNode: NodeData, targetNode: NodeData): number {
    const baseStrength = edge.strength;
    const typeWeight = this.RELATIONSHIP_WEIGHTS[edge.type as keyof typeof this.RELATIONSHIP_WEIGHTS] || 0.5;
    
    // Consider node importance
    const sourceImportance = sourceNode.connections.size / 10;
    const targetImportance = targetNode.connections.size / 10;
    const importanceBonus = Math.min(1, (sourceImportance + targetImportance) / 2) * 0.2;
    
    return Math.min(1, baseStrength * typeWeight + importanceBonus);
  }

  private determineFlowType(edge: EdgeData): 'financial' | 'informational' | 'political' | 'social' {
    const mapping = {
      financial: 'financial',
      employment: 'informational',
      business: 'financial',
      political: 'political',
      family: 'social',
      social: 'social',
    };
    return (mapping as any)[edge.type as keyof typeof mapping] || 'informational';
  }

  private detectLobbyingPatterns(network: NetworkGraph, input: InfluenceInput) {
    const detectedLobbying = [];
    const lobbyingNetworks = [];
    
    // Detect lobbying relationships
    for (const [nodeId, node] of Array.from(network.nodes.entries())) {
      if (node.type === 'lobbyist' || node.type === 'company') {
        const activities = this.analyzeLobbyingActivity(nodeId, network, input);
        detectedLobbying.push(...activities);
      }
    }
    
    // Identify coordinated lobbying
    const coordinated = this.identifyCoordinatedLobbying(network, input, detectedLobbying);
    lobbyingNetworks.push(...coordinated);
    
    return {
      detectedLobbying: detectedLobbying.slice(0, 50),
      lobbyingNetworks: lobbyingNetworks.slice(0, 20),
    };
  }

  private analyzeLobbyingActivity(nodeId: string, network: NetworkGraph, input: InfluenceInput) {
    const activities = [];
    const node = network.nodes.get(nodeId)!;
    
    // Look for connections to politicians
    for (const targetId of Array.from(node.outgoingConnections)) {
      const target = network.nodes.get(targetId);
      if (target && target.type === 'politician') {
        const edge = network.edges.get(`${nodeId}-${targetId}`);
        if (edge) {
          const methods = this.identifyLobbyingMethods(edge);
          const intensity = edge.strength;
          const effectiveness = this.estimateEffectiveness(nodeId, targetId, network);
          
          activities.push({
            lobbyistId: nodeId,
            targetId,
            intensity,
            methods,
            effectiveness,
          });
        }
      }
    }
    
    return activities;
  }

  private identifyLobbyingMethods(edge: EdgeData): Array<'direct_contact' | 'financial_contribution' | 'employment_offer' | 'social_connection'> {
    const methods: Array<'direct_contact' | 'financial_contribution' | 'employment_offer' | 'social_connection'> = [];
    
    if (edge.type === 'financial') methods.push('financial_contribution');
    if (edge.type === 'employment') methods.push('employment_offer');
    if (edge.type === 'social') methods.push('social_connection');
    if (edge.type === 'political') methods.push('direct_contact');
    
    return methods.length > 0 ? methods : ['direct_contact'];
  }

  private estimateEffectiveness(lobbyistId: string, targetId: string, network: NetworkGraph): number {
    const edge = network.edges.get(`${lobbyistId}-${targetId}`);
    if (!edge) return 0;
    
    const strength = edge.strength;
    const lobbyistCentrality = this.calculateCentralityMeasures(lobbyistId, network);
    const targetCentrality = this.calculateCentralityMeasures(targetId, network);
    
    return Math.min(1, (strength + lobbyistCentrality.degree + targetCentrality.degree) / 3);
  }

  private identifyCoordinatedLobbying(network: NetworkGraph, input: InfluenceInput, activities: any[]) {
    const networks = [];
    const lobbyistGroups = new Map<string, Set<string>>();
    
    // Group lobbyists targeting same politicians
    for (const activity of activities) {
      const key = activity.targetId;
      if (!lobbyistGroups.has(key)) {
        lobbyistGroups.set(key, new Set());
      }
      lobbyistGroups.get(key)!.add(activity.lobbyistId);
    }
    
    // Identify coordinated groups
    for (const [targetId, lobbyists] of Array.from(lobbyistGroups.entries())) {
      if (lobbyists.size >= 3) {
        const coordinationLevel = this.assessCoordination(Array.from(lobbyists), network);
        
        networks.push({
          networkId: `lobby_net_${networks.length + 1}`,
          participants: Array.from(lobbyists),
          coordinationLevel,
          targetIssues: this.identifyTargetIssues(Array.from(lobbyists), input),
        });
      }
    }
    
    return networks;
  }

  private assessCoordination(lobbyists: string[], network: NetworkGraph): number {
    let connections = 0;
    let total = 0;
    
    for (let i = 0; i < lobbyists.length; i++) {
      for (let j = i + 1; j < lobbyists.length; j++) {
        total++;
        if (network.edges.has(`${lobbyists[i]}-${lobbyists[j]}`) ||
            network.edges.has(`${lobbyists[j]}-${lobbyists[i]}`)) {
          connections++;
        }
      }
    }
    
    return total > 0 ? connections / total : 0;
  }

  private identifyTargetIssues(lobbyists: string[], input: InfluenceInput): string[] {
    const issues = new Set<string>();
    
    if (input.contextualData.eventsInScope) {
      for (const event of input.contextualData.eventsInScope) {
        const hasLobbyist = event.participants.some(p => lobbyists.includes(p));
        if (hasLobbyist) {
          issues.add(event.type);
        }
      }
    }
    
    return Array.from(issues).slice(0, 3);
  }

  private assessRisks(network: NetworkGraph, powerClusters: any[], lobbyingPatterns: any) {
    const corruptionRisk = this.assessCorruptionRisk(network, lobbyingPatterns);
    const captureRisk = this.assessCaptureRisk(powerClusters, network);
    const concentrationRisk = this.assessConcentrationRisk(network, powerClusters);
    const transparencyGaps = this.identifyTransparencyGaps(network, powerClusters);
    
    return {
      corruptionRisk,
      captureRisk,
      concentrationRisk,
      transparencyGaps,
    };
  }

  private assessCorruptionRisk(network: NetworkGraph, lobbyingPatterns: any): number {
    let risk = 0;
    
    // High-value financial connections
    for (const [edgeId, edge] of Array.from(network.edges.entries())) {
      if (edge.type === 'financial' && edge.metadata?.value) {
        const value = edge.metadata.value;
        if (value > 1000000) risk += 15;
        else if (value > 100000) risk += 10;
        else if (value > 10000) risk += 5;
      }
    }
    
    // Lobbying intensity
    const highIntensityLobbying = lobbyingPatterns.detectedLobbying.filter((l: any) => l.intensity > 0.7);
    risk += highIntensityLobbying.length * 5;
    
    // Undisclosed connections
    const undisclosedCount = Array.from(network.edges.values())
      .filter(e => !e.metadata || Object.keys(e.metadata).length === 0)
      .length;
    risk += (undisclosedCount / network.edges.size) * 30;
    
    return Math.min(100, risk);
  }

  private assessCaptureRisk(powerClusters: any[], network: NetworkGraph): number {
    let risk = 0;
    
    // High cohesion clusters with politicians
    for (const cluster of powerClusters) {
      if (cluster.cohesion > 0.8 && cluster.clusterType === 'political_party') {
        risk += 20;
      }
      if (cluster.influence > 80) {
        risk += 15;
      }
    }
    
    // Revolving door patterns (employment -> political connections)
    for (const [edgeId, edge] of Array.from(network.edges.entries())) {
      if (edge.type === 'employment') {
        const source = network.nodes.get(edge.sourceId);
        const target = network.nodes.get(edge.targetId);
        if ((source?.type === 'politician' && target?.type === 'company') ||
            (target?.type === 'politician' && source?.type === 'company')) {
          risk += 5;
        }
      }
    }
    
    return Math.min(100, risk);
  }

  private assessConcentrationRisk(network: NetworkGraph, powerClusters: any[]): number {
    let risk = 0;
    
    // Top 10% of nodes controlling large portion of connections
    const influences = Array.from(network.nodes.values())
      .map(n => n.connections.size)
      .sort((a, b) => b - a);
    
    const topTenPercent = Math.ceil(influences.length * 0.1);
    const topInfluence = influences.slice(0, topTenPercent).reduce((sum, v) => sum + v, 0);
    const totalInfluence = influences.reduce((sum, v) => sum + v, 0);
    
    if (totalInfluence > 0) {
      const concentration = topInfluence / totalInfluence;
      risk += concentration * 60;
    }
    
    // Large dominant clusters
    const largestCluster = powerClusters.reduce((max, c) => 
      c.members.length > max ? c.members.length : max, 0
    );
    risk += (largestCluster / network.nodes.size) * 40;
    
    return Math.min(100, risk);
  }

  private identifyTransparencyGaps(network: NetworkGraph, powerClusters: any[]) {
    const gaps = [];
    
    // Missing relationship metadata
    const missingMetadata = Array.from(network.edges.values())
      .filter(e => !e.metadata || Object.keys(e.metadata).length < 2)
      .length;
    
    if (missingMetadata > network.edges.size * 0.3) {
      gaps.push({
        area: 'Relationship documentation',
        severity: missingMetadata > network.edges.size * 0.6 ? 'critical' : 'high' as const,
        description: `${Math.round((missingMetadata / network.edges.size) * 100)}% of relationships lack proper documentation`,
      });
    }
    
    // Undisclosed financial values
    const financialEdges = Array.from(network.edges.values()).filter(e => e.type === 'financial');
    const withoutValues = financialEdges.filter(e => !e.metadata?.value).length;
    
    if (withoutValues > financialEdges.length * 0.4) {
      gaps.push({
        area: 'Financial disclosure',
        severity: 'high' as const,
        description: `${withoutValues} financial relationships missing value information`,
      });
    }
    
    return gaps;
  }

  private generateRecommendations(riskAssessment: any, powerClusters: any[]) {
    const recommendations = [];
    
    if (riskAssessment.corruptionRisk > this.RISK_THRESHOLDS.corruption.high) {
      recommendations.push({
        type: 'investigation' as const,
        priority: 'urgent' as const,
        description: 'Investigate high-risk corruption patterns and financial relationships',
        targetEntities: [],
      });
    }
    
    if (riskAssessment.captureRisk > this.RISK_THRESHOLDS.capture.high) {
      recommendations.push({
        type: 'regulation' as const,
        priority: 'high' as const,
        description: 'Implement stricter regulations against regulatory capture',
        targetEntities: [],
      });
    }
    
    if (riskAssessment.concentrationRisk > this.RISK_THRESHOLDS.concentration.high) {
      recommendations.push({
        type: 'monitoring' as const,
        priority: 'high' as const,
        description: 'Monitor concentrated power structures for anti-competitive behavior',
        targetEntities: [],
      });
    }
    
    for (const gap of riskAssessment.transparencyGaps) {
      if (gap.severity === 'critical' || gap.severity === 'high') {
        recommendations.push({
          type: 'transparency' as const,
          priority: gap.severity === 'critical' ? 'urgent' : 'high' as const,
          description: `Improve transparency in ${gap.area}`,
          targetEntities: [],
        });
      }
    }
    
    return recommendations;
  }

  getModelInfo() {
    return {
      name: 'Influence Mapper',
      version: this.modelVersion,
      description: 'Maps and analyzes political influence networks with real graph algorithms',
      capabilities: [
        'Network analysis with real metrics',
        'Centrality measures (betweenness, closeness, eigenvector)',
        'Power cluster identification',
        'Influence flow analysis',
        'Lobbying pattern detection',
        'Risk assessment',
        'Performance optimization with caching'
      ]
    };
  }
}

export const influenceMapper = new InfluenceMapper();
