import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpertBadge, ExpertBadgeGroup } from '../ExpertBadge';

describe('ExpertBadge', () => {
  it('renders official expert badge correctly', () => {
    render(
      <ExpertBadge 
        verificationType="official" 
        credibilityScore={0.92} 
        showScore={true} 
      />
    );
    
    expect(screen.getByText('Official Expert')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('renders domain expert badge correctly', () => {
    render(
      <ExpertBadge 
        verificationType="domain" 
        credibilityScore={0.78} 
        showScore={true} 
      />
    );
    
    expect(screen.getByText('Domain Expert')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('renders identity verified badge correctly', () => {
    render(
      <ExpertBadge 
        verificationType="identity" 
        credibilityScore={0.65} 
        showScore={true} 
      />
    );
    
    expect(screen.getByText('Verified Identity')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders without score when showScore is false', () => {
    render(
      <ExpertBadge 
        verificationType="official" 
        credibilityScore={0.92} 
        showScore={false} 
      />
    );
    
    expect(screen.getByText('Official Expert')).toBeInTheDocument();
    expect(screen.queryByText('92%')).not.toBeInTheDocument();
  });
});

describe('ExpertBadgeGroup', () => {
  it('renders badge group with specializations', () => {
    render(
      <ExpertBadgeGroup
        verificationType="official"
        credibilityScore={0.92}
        specializations={['Constitutional Law', 'Civil Rights', 'Federal Legislation']}
        affiliationType="academic"
      />
    );
    
    expect(screen.getByText('Official Expert')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Academic')).toBeInTheDocument();
    expect(screen.getByText('Constitutional Law')).toBeInTheDocument();
    expect(screen.getByText('Civil Rights')).toBeInTheDocument();
  });

  it('limits specializations display correctly', () => {
    render(
      <ExpertBadgeGroup
        verificationType="domain"
        credibilityScore={0.78}
        specializations={['Law 1', 'Law 2', 'Law 3', 'Law 4']}
        maxSpecializations={2}
      />
    );
    
    expect(screen.getByText('Law 1')).toBeInTheDocument();
    expect(screen.getByText('Law 2')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('Law 3')).not.toBeInTheDocument();
  });
});