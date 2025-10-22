import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download,
  Info,
  AlertTriangle
} from 'lucide-react';
import { logger } from '@/utils/browser-logger';

interface ConflictNode {
  id: string;
  type: 'sponsor' | 'organization' | 'bill';
  name: string;
  conflictLevel: 'low' | 'medium' | 'high' | 'critical';
  size: number;
  color: string;
  metadata: Record<string, any>;
}

interface ConflictEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  label: string;
}

interface ConflictMapping {
  nodes: ConflictNode[];
  edges: ConflictEdge[];
  clusters: Array<{
    id: string;
    members: string[];
    centerNode: string;
    conflictDensity: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }>;
  metrics: {
    totalNodes: number;
    totalEdges: number;
    density: number;
    clustering: number;
    centralityScores: Record<string, number>;
    riskDistribution: Record<string, number>;
  };
}

interface NetworkVisualizationProps {
  billId?: number;
  sponsorId?: number;
  height?: number;
}

const ConflictNetworkVisualization: React.FC<NetworkVisualizationProps> = ({ 
  billId, 
  sponsorId, 
  height = 600 
}) => {
  const [mapping, setMapping] = useState<ConflictMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConflictNode | null>(null);
  const [layoutType, setLayoutType] = useState<string>('force-directed');
  const [showClusters, setShowClusters] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    fetchMappingData();
  }, [billId, sponsorId]);

  const fetchMappingData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (billId) params.append('billId', billId.toString());
      if (sponsorId) params.append('sponsorId', sponsorId.toString());

      const response = await fetch(`/api/sponsor-conflict-analysis/mapping?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conflict mapping data');
      }

      const result = await response.json();
      setMapping(result.data.mapping);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getNodeColor = (node: ConflictNode) => {
    const severityColors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#FF5722',
      critical: '#D32F2F'
    };
    return severityColors[node.conflictLevel];
  };

  const getEdgeColor = (edge: ConflictEdge) => {
    const severityColors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#FF5722',
      critical: '#D32F2F'
    };
    return severityColors[edge.severity];
  };

  const getNodeSize = (node: ConflictNode) => {
    const baseSizes = {
      sponsor: 20,
      organization: 15,
      bill: 12
    };
    const severityMultiplier = {
      low: 1,
      medium: 1.2,
      high: 1.5,
      critical: 2
    };
    return baseSizes[node.type] * severityMultiplier[node.conflictLevel];
  };

  const calculateNodePositions = (nodes: ConflictNode[], edges: ConflictEdge[]) => {
    // Simplified force-directed layout calculation
    const positions = new Map<string, { x: number; y: number }>();
    const width = 800;
    const height = 600;
    
    // Initialize random positions
    nodes.forEach((node, index) => {
      positions.set(node.id, {
        x: Math.random() * width,
        y: Math.random() * height
      });
    });

    // Simple clustering for sponsors and organizations
    let sponsorX = width * 0.2;
    let orgX = width * 0.8;
    let yOffset = 0;

    nodes.forEach((node) => {
      if (node.type === 'sponsor') {
        positions.set(node.id, { x: sponsorX, y: 100 + yOffset });
        yOffset += 80;
      } else if (node.type === 'organization') {
        positions.set(node.id, { x: orgX, y: 100 + (yOffset % 400) });
      }
    });

    return positions;
  };

  const handleNodeClick = (node: ConflictNode) => {
    setSelectedNode(node);
  };

  const handleZoomIn = () => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 3) }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.3) }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const exportVisualization = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `conflict-network-${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Network className="h-8 w-8 animate-pulse mr-2" />
          <span>Loading network visualization...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading network visualization: {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={fetchMappingData}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!mapping || mapping.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Info className="h-8 w-8 text-gray-400 mr-2" />
          <span>No conflict relationships found</span>
        </CardContent>
      </Card>
    );
  }

  const filteredNodes = filterSeverity === 'all' 
    ? mapping.nodes 
    : mapping.nodes.filter(n => n.conflictLevel === filterSeverity);
  
  const filteredEdges = mapping.edges.filter(e => 
    filteredNodes.some(n => n.id === e.source) && 
    filteredNodes.some(n => n.id === e.target)
  );

  const nodePositions = calculateNodePositions(filteredNodes, filteredEdges);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Network className="h-5 w-5 mr-2" />
                Conflict Network Visualization
              </CardTitle>
              <CardDescription>
                Interactive network showing sponsor conflicts and relationships
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportVisualization}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative border rounded-lg overflow-hidden" style={{ height }}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 800 600`}
              className="bg-gray-50"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#666"
                  />
                </marker>
              </defs>
              
              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                {/* Render clusters if enabled */}
                {showClusters && mapping.clusters.map((cluster) => {
                  const clusterNodes = filteredNodes.filter(n => cluster.members.includes(n.id));
                  if (clusterNodes.length < 2) return null;
                  
                  const positions = clusterNodes.map(n => nodePositions.get(n.id)!);
                  const minX = Math.min(...positions.map(p => p.x)) - 30;
                  const maxX = Math.max(...positions.map(p => p.x)) + 30;
                  const minY = Math.min(...positions.map(p => p.y)) - 30;
                  const maxY = Math.max(...positions.map(p => p.y)) + 30;
                  
                  return (
                    <rect
                      key={cluster.id}
                      x={minX}
                      y={minY}
                      width={maxX - minX}
                      height={maxY - minY}
                      fill="rgba(59, 130, 246, 0.1)"
                      stroke="rgba(59, 130, 246, 0.3)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      rx="10"
                    />
                  );
                })}

                {/* Render edges */}
                {filteredEdges.map((edge, index) => {
                  const sourcePos = nodePositions.get(edge.source);
                  const targetPos = nodePositions.get(edge.target);
                  
                  if (!sourcePos || !targetPos) return null;
                  
                  return (
                    <g key={`edge-${index}`}>
                      <line
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke={getEdgeColor(edge)}
                        strokeWidth={edge.weight}
                        opacity={0.7}
                        markerEnd="url(#arrowhead)"
                      />
                      <text
                        x={(sourcePos.x + targetPos.x) / 2}
                        y={(sourcePos.y + targetPos.y) / 2}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#666"
                        className="pointer-events-none"
                      >
                        {edge.label}
                      </text>
                    </g>
                  );
                })}

                {/* Render nodes */}
                {filteredNodes.map((node) => {
                  const position = nodePositions.get(node.id);
                  if (!position) return null;
                  
                  const nodeSize = getNodeSize(node);
                  const isSelected = selectedNode?.id === node.id;
                  
                  return (
                    <g key={node.id}>
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={nodeSize}
                        fill={getNodeColor(node)}
                        stroke={isSelected ? "#000" : "#fff"}
                        strokeWidth={isSelected ? 3 : 2}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleNodeClick(node)}
                      />
                      <text
                        x={position.x}
                        y={position.y + nodeSize + 15}
                        textAnchor="middle"
                        fontSize="12"
                        fill="#333"
                        className="pointer-events-none font-medium"
                      >
                        {node.name.length > 15 ? `${node.name.substring(0, 15)}...` : node.name}
                      </text>
                      {node.type === 'sponsor' && (
                        <text
                          x={position.x}
                          y={position.y + nodeSize + 30}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#666"
                          className="pointer-events-none"
                        >
                          {node.metadata.party || 'Unknown Party'}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Network Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Network Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Nodes:</span>
              <span className="font-semibold">{filteredNodes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Connections:</span>
              <span className="font-semibold">{filteredEdges.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Density:</span>
              <span className="font-semibold">{Math.round(mapping.metrics.density * 100)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Clusters:</span>
              <span className="font-semibold">{mapping.clusters.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(mapping.metrics.riskDistribution).map(([level, count]) => (
              <div key={level} className="flex justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getNodeColor({ conflictLevel: level } as ConflictNode) }}
                  />
                  <span className="capitalize">{level}:</span>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span>Sponsor</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Organization</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Bill</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Selected: {selectedNode.name}</span>
              <Badge className={`${selectedNode.conflictLevel === 'critical' ? 'bg-red-100 text-red-800' :
                selectedNode.conflictLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                selectedNode.conflictLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'}`}>
                {selectedNode.conflictLevel.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Type:</span> {selectedNode.type}
              </div>
              <div>
                <span className="font-medium">Conflict Level:</span> {selectedNode.conflictLevel}
              </div>
              {selectedNode.metadata.party && (
                <div>
                  <span className="font-medium">Party:</span> {selectedNode.metadata.party}
                </div>
              )}
              {selectedNode.metadata.constituency && (
                <div>
                  <span className="font-medium">Constituency:</span> {selectedNode.metadata.constituency}
                </div>
              )}
              {selectedNode.metadata.role && (
                <div>
                  <span className="font-medium">Role:</span> {selectedNode.metadata.role}
                </div>
              )}
              {selectedNode.metadata.type && (
                <div>
                  <span className="font-medium">Organization Type:</span> {selectedNode.metadata.type}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConflictNetworkVisualization;