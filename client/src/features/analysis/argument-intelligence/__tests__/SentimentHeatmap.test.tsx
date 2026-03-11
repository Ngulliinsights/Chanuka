/**
 * SentimentHeatmap Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SentimentHeatmap } from '../ui/SentimentHeatmap';
import type { SentimentData } from '../types';

describe('SentimentHeatmap', () => {
  const mockSentimentData: SentimentData = {
    overall: 0.6,
    support: 0.8,
    oppose: -0.4,
    neutral: 0.1,
    distribution: [
      {
        position: 'support',
        count: 50,
        averageSentiment: 0.8,
      },
      {
        position: 'oppose',
        count: 30,
        averageSentiment: -0.4,
      },
      {
        position: 'neutral',
        count: 20,
        averageSentiment: 0.1,
      },
    ],
  };

  it('renders sentiment analysis title', () => {
    render(<SentimentHeatmap sentimentData={mockSentimentData} />);
    
    expect(screen.getByText('Sentiment Analysis')).toBeInTheDocument();
  });

  it('displays overall sentiment', () => {
    render(<SentimentHeatmap sentimentData={mockSentimentData} />);
    
    expect(screen.getByText('Overall Sentiment')).toBeInTheDocument();
    expect(screen.getByText('Positive')).toBeInTheDocument();
    expect(screen.getByText('0.60')).toBeInTheDocument();
  });

  it('shows position-based sentiment breakdown', () => {
    render(<SentimentHeatmap sentimentData={mockSentimentData} />);
    
    // Use case-insensitive regex to match capitalized text
    expect(screen.getByText(/support/i)).toBeInTheDocument();
    expect(screen.getByText(/oppose/i)).toBeInTheDocument();
    expect(screen.getByText(/neutral/i)).toBeInTheDocument();
  });

  it('displays correct counts and percentages', () => {
    render(<SentimentHeatmap sentimentData={mockSentimentData} />);
    
    expect(screen.getByText(/50 \(50\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/30 \(30\.0%\)/)).toBeInTheDocument();
    expect(screen.getByText(/20 \(20\.0%\)/)).toBeInTheDocument();
  });

  it('shows sentiment scale legend', () => {
    render(<SentimentHeatmap sentimentData={mockSentimentData} />);
    
    expect(screen.getByText('Sentiment Scale')).toBeInTheDocument();
    expect(screen.getAllByText('Very Negative').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Very Positive').length).toBeGreaterThan(0);
  });

  it('displays sentiment values for each position', () => {
    render(<SentimentHeatmap sentimentData={mockSentimentData} />);
    
    expect(screen.getByText('0.8')).toBeInTheDocument();
    expect(screen.getByText('-0.4')).toBeInTheDocument();
    expect(screen.getByText('0.1')).toBeInTheDocument();
  });
});
