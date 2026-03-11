/**
 * ArgumentClusterDisplay Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArgumentClusterDisplay } from '../ui/ArgumentClusterDisplay';
import type { ArgumentCluster } from '../types';

describe('ArgumentClusterDisplay', () => {
  const mockClusters: ArgumentCluster[] = [
    {
      id: 'cluster_1',
      name: 'Transparency concerns',
      size: 15,
      position: 'support',
      cohesion: 0.82,
      representativeClaims: [
        'This bill improves transparency',
        'Citizens will have better access to information',
      ],
      members: ['arg_1', 'arg_2', 'arg_3'],
    },
    {
      id: 'cluster_2',
      name: 'Privacy issues',
      size: 10,
      position: 'oppose',
      cohesion: 0.75,
      representativeClaims: [
        'This bill threatens privacy',
        'Data protection is insufficient',
      ],
      members: ['arg_4', 'arg_5'],
    },
  ];

  it('renders clusters correctly', () => {
    render(<ArgumentClusterDisplay clusters={mockClusters} />);
    
    expect(screen.getByText('Argument Clusters')).toBeInTheDocument();
    expect(screen.getByText('2 clusters found')).toBeInTheDocument();
    expect(screen.getByText('Transparency concerns')).toBeInTheDocument();
    expect(screen.getByText('Privacy issues')).toBeInTheDocument();
  });

  it('displays cluster statistics', () => {
    render(<ArgumentClusterDisplay clusters={mockClusters} />);
    
    expect(screen.getByText('15 args')).toBeInTheDocument();
    expect(screen.getByText('10 args')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows representative claims', () => {
    render(<ArgumentClusterDisplay clusters={mockClusters} />);
    
    expect(screen.getByText(/This bill improves transparency/)).toBeInTheDocument();
    expect(screen.getByText(/This bill threatens privacy/)).toBeInTheDocument();
  });

  it('handles cluster click', () => {
    const onClusterClick = vi.fn();
    render(<ArgumentClusterDisplay clusters={mockClusters} onClusterClick={onClusterClick} />);
    
    const firstCluster = screen.getByText('Transparency concerns').closest('div');
    fireEvent.click(firstCluster!);
    
    expect(onClusterClick).toHaveBeenCalledWith(mockClusters[0]);
  });

  it('highlights selected cluster', () => {
    render(
      <ArgumentClusterDisplay
        clusters={mockClusters}
        selectedClusterId="cluster_1"
      />
    );
    
    const firstCluster = screen.getByText('Transparency concerns').closest('div');
    expect(firstCluster).toHaveClass('ring-2', 'ring-blue-500');
  });

  it('displays empty state when no clusters', () => {
    render(<ArgumentClusterDisplay clusters={[]} />);
    
    expect(screen.getByText('No argument clusters available')).toBeInTheDocument();
  });

  it('applies correct position colors', () => {
    render(<ArgumentClusterDisplay clusters={mockClusters} />);
    
    const supportCluster = screen.getByText('Transparency concerns').closest('div');
    const opposeCluster = screen.getByText('Privacy issues').closest('div');
    
    expect(supportCluster).toHaveClass('bg-green-100');
    expect(opposeCluster).toHaveClass('bg-red-100');
  });
});
