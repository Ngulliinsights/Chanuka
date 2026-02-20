import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@client/services/apiService';

interface ArgumentNode {
  id: string;
  text: string;
  position: 'support' | 'oppose' | 'neutral';
  strength: number;
  endorsements: number;
  cluster?: string;
}

interface ArgumentMapProps {
  billId: string;
}

export function ArgumentMap({ billId }: ArgumentMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = React.useState<ArgumentNode | null>(null);

  const { data: argumentMap, isLoading } = useQuery({
    queryKey: ['argument-map', billId],
    queryFn: async () => {
      const response = await api.get(`/api/argument-intelligence/argument-map/${billId}`);
      return response.data;
    },
  });

  useEffect(() => {
    if (!argumentMap || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 600;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw argument clusters
    const nodes: ArgumentNode[] = argumentMap.nodes || [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 3;

    // Group by position
    const supportNodes = nodes.filter(n => n.position === 'support');
    const opposeNodes = nodes.filter(n => n.position === 'oppose');
    const neutralNodes = nodes.filter(n => n.position === 'neutral');

    const drawCluster = (
      clusterNodes: ArgumentNode[],
      startAngle: number,
      color: string
    ) => {
      clusterNodes.forEach((node, idx) => {
        const angle = startAngle + (idx / clusterNodes.length) * (Math.PI * 2 / 3);
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const size = 5 + (node.strength * 20);

        // Draw node
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw connection to center
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Store node position for click detection
        (node as any).x = x;
        (node as any).y = y;
        (node as any).size = size;
      });
    };

    // Draw clusters
    drawCluster(supportNodes, 0, '#10b981'); // Green
    drawCluster(opposeNodes, Math.PI * 2 / 3, '#ef4444'); // Red
    drawCluster(neutralNodes, Math.PI * 4 / 3, '#6b7280'); // Gray

    // Draw center
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    // Draw legend
    const drawLegend = (text: string, color: string, y: number) => {
      ctx.beginPath();
      ctx.arc(20, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.font = '14px sans-serif';
      ctx.fillText(text, 35, y + 5);
    };

    drawLegend(`Support (${supportNodes.length})`, '#10b981', 30);
    drawLegend(`Oppose (${opposeNodes.length})`, '#ef4444', 55);
    drawLegend(`Neutral (${neutralNodes.length})`, '#6b7280', 80);

    // Handle clicks
    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Check if click is on a node
      const clickedNode = nodes.find(node => {
        const nx = (node as any).x;
        const ny = (node as any).y;
        const size = (node as any).size;
        const distance = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
        return distance <= size;
      });

      setSelectedNode(clickedNode || null);
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [argumentMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading argument map...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Argument Network</h3>
        <p className="text-sm text-gray-600 mb-4">
          Visual representation of argument clusters. Size indicates strength, position shows stance.
        </p>
        <canvas
          ref={canvasRef}
          className="w-full border border-gray-200 rounded-lg cursor-pointer"
          style={{ height: '600px' }}
        />
      </div>

      {selectedNode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-blue-900">Selected Argument</h4>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
          <p className="text-blue-800 mb-2">{selectedNode.text}</p>
          <div className="flex items-center gap-4 text-sm text-blue-700">
            <span>Position: {selectedNode.position}</span>
            <span>Strength: {(selectedNode.strength * 100).toFixed(0)}%</span>
            <span>Endorsements: {selectedNode.endorsements}</span>
          </div>
        </div>
      )}
    </div>
  );
}
