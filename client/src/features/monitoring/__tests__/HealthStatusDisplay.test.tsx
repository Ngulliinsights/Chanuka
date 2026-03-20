/**
 * Health Status Display Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthStatusDisplay } from '../ui/HealthStatusDisplay';

describe('HealthStatusDisplay', () => {
  it('renders healthy status', () => {
    render(<HealthStatusDisplay status="healthy" />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();
  });

  it('renders degraded status', () => {
    render(<HealthStatusDisplay status="degraded" />);
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('renders down status', () => {
    render(<HealthStatusDisplay status="down" />);
    expect(screen.getByText('Down')).toBeInTheDocument();
  });

  it('renders unknown status', () => {
    render(<HealthStatusDisplay status="unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { container: smallContainer } = render(<HealthStatusDisplay status="healthy" size="sm" />);
    expect(smallContainer.querySelector('.w-2')).toBeInTheDocument();

    const { container: mediumContainer } = render(<HealthStatusDisplay status="healthy" size="md" />);
    expect(mediumContainer.querySelector('.w-3')).toBeInTheDocument();

    const { container: largeContainer } = render(<HealthStatusDisplay status="healthy" size="lg" />);
    expect(largeContainer.querySelector('.w-4')).toBeInTheDocument();
  });
});
