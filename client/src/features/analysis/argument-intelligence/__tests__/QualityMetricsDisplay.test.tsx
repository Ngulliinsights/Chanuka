/**
 * QualityMetricsDisplay Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityMetricsDisplay } from '../ui/QualityMetricsDisplay';
import type { QualityMetrics } from '../types';

describe('QualityMetricsDisplay', () => {
  const mockMetrics: QualityMetrics = {
    clarity: 0.85,
    evidence: 0.75,
    reasoning: 0.80,
    relevance: 0.90,
    constructiveness: 0.70,
  };

  it('renders quality metrics title', () => {
    render(<QualityMetricsDisplay metrics={mockMetrics} />);
    
    expect(screen.getByText('Quality Metrics')).toBeInTheDocument();
  });

  it('displays overall quality score', () => {
    render(<QualityMetricsDisplay metrics={mockMetrics} />);
    
    const average = (0.85 + 0.75 + 0.80 + 0.90 + 0.70) / 5;
    expect(screen.getByText(`${(average * 100).toFixed(0)}%`)).toBeInTheDocument();
  });

  it('shows all five quality dimensions', () => {
    render(<QualityMetricsDisplay metrics={mockMetrics} />);
    
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Reasoning')).toBeInTheDocument();
    expect(screen.getByText('Relevance')).toBeInTheDocument();
    expect(screen.getByText('Constructiveness')).toBeInTheDocument();
  });

  it('displays correct percentages for each metric', () => {
    render(<QualityMetricsDisplay metrics={mockMetrics} />);
    
    const percentages = screen.getAllByText('85%');
    expect(percentages.length).toBeGreaterThan(0);
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('70%').length).toBeGreaterThan(0);
  });

  it('shows quality profile visualization', () => {
    render(<QualityMetricsDisplay metrics={mockMetrics} />);
    
    expect(screen.getByText('Quality Profile')).toBeInTheDocument();
  });

  it('displays quality assessment for high quality', () => {
    const highQualityMetrics: QualityMetrics = {
      clarity: 0.9,
      evidence: 0.85,
      reasoning: 0.88,
      relevance: 0.92,
      constructiveness: 0.87,
    };
    
    render(<QualityMetricsDisplay metrics={highQualityMetrics} />);
    
    expect(screen.getByText(/Excellent quality argument/)).toBeInTheDocument();
  });

  it('displays quality assessment for moderate quality', () => {
    const moderateMetrics: QualityMetrics = {
      clarity: 0.5,
      evidence: 0.4,
      reasoning: 0.5,
      relevance: 0.6,
      constructiveness: 0.4,
    };
    
    render(<QualityMetricsDisplay metrics={moderateMetrics} />);
    
    expect(screen.getByText(/Moderate quality/)).toBeInTheDocument();
  });

  it('can hide labels when showLabels is false', () => {
    render(<QualityMetricsDisplay metrics={mockMetrics} showLabels={false} />);
    
    expect(screen.queryByText('Clarity')).not.toBeInTheDocument();
    expect(screen.queryByText('Evidence')).not.toBeInTheDocument();
  });
});
