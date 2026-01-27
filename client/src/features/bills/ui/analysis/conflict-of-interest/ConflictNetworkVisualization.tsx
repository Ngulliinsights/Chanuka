/**
 * ConflictNetworkVisualization - Interactive D3.js network visualization
 *
 * Displays organizational connections, financial interests, and voting patterns
 * as an interactive network graph with accessibility fallbacks.
 */

import * as d3 from 'd3';
import { Network, Table, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback } from 'react';

import {
  NetworkData,
  NetworkNode,
  NetworkLink,
  ConflictVisualizationProps,
  AccessibilityFallbackData,
} from '@client/features/analysis/types';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';

interface ConflictNetworkVisualizationProps extends ConflictVisualizationProps {
  showAccessibilityFallback?: boolean;
}

export function ConflictNetworkVisualization({
  conflictAnalysis,
  onNodeClick,
  onLinkClick,
  width = 800,
  height = 600,
  interactive = true,
  showAccessibilityFallback = false,
}: ConflictNetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeView, setActiveView] = useState<'network' | 'table'>('network');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData>({ nodes: [], links: [] });

  // Generate network data from conflict analysis
  const generateNetworkData = useCallback((): NetworkData => {
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];

    // Add sponsor node
    nodes.push({
      id: `sponsor-${conflictAnalysis.sponsorId}`,
      name: conflictAnalysis.sponsorName,
      type: 'sponsor',
      size: 20,
      color: 'hsl(var(--civic-constitutional))',
    });

    // Add organization nodes and links
    conflictAnalysis.organizationalConnections.forEach((connection, index) => {
      const orgId = `org-${index}`;
      nodes.push({
        id: orgId,
        name: connection.organizationName,
        type: 'organization',
        size: 10 + connection.strength * 10,
        color: getOrganizationColor(connection.organizationType),
      });

      links.push({
        source: `sponsor-${conflictAnalysis.sponsorId}`,
        target: orgId,
        strength: connection.strength,
        type: 'organizational',
        description: `${connection.connectionType} - ${connection.description}`,
      });
    });

    // Add industry nodes from financial interests
    const industries = new Set<string>();
    conflictAnalysis.financialInterests.forEach(interest => {
      industries.add(interest.industry);
    });

    industries.forEach(industry => {
      const industryId = `industry-${industry.replace(/\s+/g, '-').toLowerCase()}`;
      const relatedInterests = conflictAnalysis.financialInterests.filter(
        interest => interest.industry === industry
      );
      const totalAmount = relatedInterests.reduce((sum, interest) => sum + interest.amount, 0);

      nodes.push({
        id: industryId,
        name: industry,
        type: 'industry',
        size: Math.min(5 + Math.log10(totalAmount + 1) * 2, 15),
        color: 'hsl(var(--civic-transparency))',
      });

      links.push({
        source: `sponsor-${conflictAnalysis.sponsorId}`,
        target: industryId,
        strength: Math.min(totalAmount / 100000, 1), // Normalize to 0-1
        type: 'financial',
        amount: totalAmount,
        description: `Financial interests totaling $${totalAmount.toLocaleString()}`,
      });
    });

    return { nodes, links };
  }, [conflictAnalysis]);

  // Get color for organization type
  const getOrganizationColor = (type: string): string => {
    const colors = {
      corporation: 'hsl(var(--status-high))',
      nonprofit: 'hsl(var(--civic-expert))',
      lobbyist: 'hsl(var(--status-critical))',
      trade_association: 'hsl(var(--status-moderate))',
      government: 'hsl(var(--civic-constitutional))',
    };
    return colors[type as keyof typeof colors] || 'hsl(var(--muted-foreground))';
  };

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current || activeView !== 'network') return;

    const data = generateNetworkData();
    setNetworkData(data);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const container = svg.append('g').attr('class', 'network-container');

    // Set up zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', event => {
        container.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(data.nodes)
      .force(
        'link',
        d3
          .forceLink<NetworkNode, NetworkLink>(data.links)
          .id(d => d.id)
          .distance(d => 50 + (1 - d.strength) * 100)
          .strength(d => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius(d => d.size + 5)
      );

    // Create links
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', d => getLinkColor(d.type))
      .attr('stroke-width', d => Math.max(1, d.strength * 4))
      .attr('stroke-opacity', 0.6)
      .style('cursor', interactive ? 'pointer' : 'default');

    // Create nodes
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', interactive ? 'pointer' : 'default');

    // Add labels
    const labels = container
      .append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(data.nodes)
      .enter()
      .append('text')
      .text(d => d.name)
      .attr('font-size', '12px')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.size + 15)
      .style('pointer-events', 'none');

    // Add interactivity
    if (interactive) {
      node
        .on('click', (event, d) => {
          event.stopPropagation();
          setSelectedNode(d);
          onNodeClick?.(d);
        })
        .on('mouseover', function (event, d) {
          d3.select(this).attr('stroke-width', 4);
          // Show tooltip
          const tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'network-tooltip')
            .style('position', 'absolute')
            .style('background', 'hsl(var(--popover))')
            .style('border', '1px solid hsl(var(--border))')
            .style('border-radius', 'var(--radius-md)')
            .style('padding', '8px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html(`<strong>${d.name}</strong><br/>Type: ${d.type}<br/>Size: ${d.size}`);

          tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px');
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke-width', 2);
          d3.selectAll('.network-tooltip').remove();
        });

      link
        .on('click', (event, d) => {
          event.stopPropagation();
          onLinkClick?.(d);
        })
        .on('mouseover', function (event, d) {
          d3.select(this).attr('stroke-opacity', 1);
          // Show link tooltip
          const tooltip = d3
            .select('body')
            .append('div')
            .attr('class', 'network-tooltip')
            .style('position', 'absolute')
            .style('background', 'hsl(var(--popover))')
            .style('border', '1px solid hsl(var(--border))')
            .style('border-radius', 'var(--radius-md)')
            .style('padding', '8px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html(
              `<strong>${d.type}</strong><br/>${d.description}<br/>Strength: ${(d.strength * 100).toFixed(1)}%`
            );

          tooltip.style('left', event.pageX + 10 + 'px').style('top', event.pageY - 10 + 'px');
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke-opacity', 0.6);
          d3.selectAll('.network-tooltip').remove();
        });

      // Add drag behavior
      const drag = d3
        .drag<SVGCircleElement, NetworkNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      node.call(drag);
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NetworkNode).x!)
        .attr('y1', d => (d.source as NetworkNode).y!)
        .attr('x2', d => (d.target as NetworkNode).x!)
        .attr('y2', d => (d.target as NetworkNode).y!);

      node.attr('cx', d => d.x!).attr('cy', d => d.y!);

      labels.attr('x', d => d.x!).attr('y', d => d.y!);
    });

    // Cleanup
    return () => {
      simulation.stop();
      d3.selectAll('.network-tooltip').remove();
    };
  }, [
    conflictAnalysis,
    activeView,
    width,
    height,
    interactive,
    generateNetworkData,
    onNodeClick,
    onLinkClick,
  ]);

  // Get link color based on type
  const getLinkColor = (type: string): string => {
    const colors = {
      financial: 'hsl(var(--civic-transparency))',
      organizational: 'hsl(var(--civic-community))',
      voting: 'hsl(var(--civic-constitutional))',
      industry: 'hsl(var(--status-moderate))',
    };
    return colors[type as keyof typeof colors] || 'hsl(var(--muted-foreground))';
  };

  // Zoom controls
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.5);
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1 / 1.5);
  };

  const handleResetZoom = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom<SVGSVGElement, unknown>().transform as any, d3.zoomIdentity);
  };

  // Generate accessibility fallback data
  const generateFallbackData = (): AccessibilityFallbackData => {
    return {
      sponsors: [
        {
          name: conflictAnalysis.sponsorName,
          riskLevel: conflictAnalysis.riskLevel,
          financialInterests: conflictAnalysis.financialInterests.length,
          organizationalConnections: conflictAnalysis.organizationalConnections.length,
          transparencyScore: conflictAnalysis.transparencyScore.overall,
        },
      ],
      connections: [
        ...conflictAnalysis.organizationalConnections.map(conn => ({
          from: conflictAnalysis.sponsorName,
          to: conn.organizationName,
          type: conn.connectionType,
          strength: conn.strength,
          description: conn.description,
        })),
        ...conflictAnalysis.financialInterests.map(interest => ({
          from: conflictAnalysis.sponsorName,
          to: interest.industry,
          type: interest.category,
          strength: Math.min(interest.amount / 100000, 1),
          description: `$${interest.amount.toLocaleString()} - ${interest.description}`,
        })),
      ],
      summary: {
        totalConnections:
          conflictAnalysis.organizationalConnections.length +
          conflictAnalysis.financialInterests.length,
        highRiskConnections: conflictAnalysis.organizationalConnections.filter(
          c => c.strength > 0.7
        ).length,
        averageTransparencyScore: conflictAnalysis.transparencyScore.overall,
        topIndustries: [...new Set(conflictAnalysis.financialInterests.map(f => f.industry))].slice(
          0,
          3
        ),
      },
    };
  };

  const fallbackData = generateFallbackData();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" style={{ color: 'hsl(var(--civic-transparency))' }} />
              Conflict of Interest Network
            </CardTitle>
            <CardDescription>
              Interactive visualization of organizational connections and financial interests
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView(activeView === 'network' ? 'table' : 'network')}
            >
              {activeView === 'network' ? (
                <Table className="h-4 w-4" />
              ) : (
                <Network className="h-4 w-4" />
              )}
              {activeView === 'network' ? 'Table View' : 'Network View'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeView}
          onValueChange={value => setActiveView(value as 'network' | 'table')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="network">Network Visualization</TabsTrigger>
            <TabsTrigger value="table">Accessibility Table</TabsTrigger>
          </TabsList>

          <TabsContent value="network" className="space-y-4">
            {/* Network Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Zoom: {(zoomLevel * 100).toFixed(0)}%</Badge>
                {selectedNode && <Badge variant="secondary">Selected: {selectedNode.name}</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Network Visualization */}
            <div className="border rounded-lg overflow-hidden" style={{ width, height }}>
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className="w-full h-full"
                role="img"
                aria-label="Conflict of interest network visualization"
              >
                <title>
                  Network showing connections between {conflictAnalysis.sponsorName} and
                  organizations/industries
                </title>
              </svg>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--civic-constitutional))' }}
                ></div>
                <span>Sponsor</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--status-high))' }}
                ></div>
                <span>Corporation</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--civic-expert))' }}
                ></div>
                <span>Nonprofit</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--civic-transparency))' }}
                ></div>
                <span>Industry</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            {/* Accessibility Table View */}
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{fallbackData.summary.totalConnections}</div>
                  <div className="text-sm text-muted-foreground">Total Connections</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {fallbackData.summary.highRiskConnections}
                  </div>
                  <div className="text-sm text-muted-foreground">High Risk</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {fallbackData.summary.averageTransparencyScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Transparency</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {fallbackData.summary.topIndustries.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Industries</div>
                </div>
              </div>

              {/* Connections Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border border-border p-2 text-left">From</th>
                      <th className="border border-border p-2 text-left">To</th>
                      <th className="border border-border p-2 text-left">Type</th>
                      <th className="border border-border p-2 text-left">Strength</th>
                      <th className="border border-border p-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fallbackData.connections.map((connection, index) => (
                      <tr key={index} className="hover:bg-muted/50">
                        <td className="border border-border p-2">{connection.from}</td>
                        <td className="border border-border p-2">{connection.to}</td>
                        <td className="border border-border p-2">
                          <Badge variant="outline">{connection.type}</Badge>
                        </td>
                        <td className="border border-border p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${connection.strength * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">
                              {(connection.strength * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="border border-border p-2 text-sm">
                          {connection.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
