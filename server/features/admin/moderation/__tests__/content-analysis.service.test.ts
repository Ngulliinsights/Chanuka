/**
 * Unit tests for ContentAnalysisService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentAnalysisService } from '../content-analysis.service.js';

describe('ContentAnalysisService', () => {
  let service: ContentAnalysisService;

  beforeEach(() => {
    service = ContentAnalysisService.getInstance();
  });

  describe('analyzeContent', () => {
    it('should detect profanity in content', async () => {
      const content = 'This is fucking terrible content';
      const result = await service.analyzeContent('comment', content);

      expect(result.shouldFlag).toBe(false); // Low severity shouldn't auto-flag
      expect(result.detectedIssues).toHaveLength(1);
      expect(result.detectedIssues[0].type).toBe('inappropriate');
      expect(result.detectedIssues[0].description).toContain('explicit language');
    });

    it('should detect spam characteristics', async () => {
      const content = 'BUY NOW!!! CLICK HERE!!! AMAZING DEAL!!! https://spam1.com https://spam2.com https://spam3.com https://spam4.com CLICK CLICK CLICK CLICK CLICK';
      const result = await service.analyzeContent('comment', content);

      expect(result.detectedIssues.some(issue => issue.type === 'spam')).toBe(true);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.severity).toBe('info'); // Score of 0.66 is below flagging threshold
    });

    it('should detect hate speech', async () => {
      const content = 'I hate those people, they should all die and be destroyed';
      const result = await service.analyzeContent('comment', content);

      expect(result.shouldFlag).toBe(true);
      expect(result.detectedIssues.some(issue => issue.type === 'harassment')).toBe(true);
      expect(result.severity).toBe('critical'); // This content is actually quite severe
    });

    it('should detect harassment patterns', async () => {
      const content = 'You are such an idiot, you moron';
      const result = await service.analyzeContent('comment', content);

      expect(result.shouldFlag).toBe(true);
      expect(result.detectedIssues.some(issue => issue.type === 'harassment')).toBe(true);
    });

    it('should detect misinformation markers', async () => {
      const content = 'They don\'t want you to know the truth about big pharma';
      const result = await service.analyzeContent('comment', content);

      expect(result.detectedIssues.some(issue => issue.type === 'misinformation')).toBe(true);
    });

    it('should flag very short content as low quality', async () => {
      const content = 'ok';
      const result = await service.analyzeContent('comment', content);

      expect(result.detectedIssues.some(issue => 
        issue.type === 'inappropriate' && issue.description.includes('short')
      )).toBe(true);
    });

    it('should return clean analysis for appropriate content', async () => {
      const content = 'This is a thoughtful and well-reasoned comment about the legislative process.';
      const result = await service.analyzeContent('comment', content);

      expect(result.shouldFlag).toBe(false);
      expect(result.detectedIssues).toHaveLength(0);
      expect(result.severity).toBe('info');
      expect(result.recommendations).toContain('Content appears to meet community guidelines');
    });

    it('should calculate overall severity correctly', async () => {
      const content = 'You fucking idiot moron, I hate you and you should die and be destroyed, you subhuman scum';
      const result = await service.analyzeContent('comment', content);

      expect(result.shouldFlag).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.overallScore).toBeGreaterThan(3);
    });
  });

  describe('calculateSeverity', () => {
    it('should return critical for harassment', () => {
      expect(service.calculateSeverity('harassment')).toBe('critical');
    });

    it('should return high for misinformation', () => {
      expect(service.calculateSeverity('misinformation')).toBe('high');
    });

    it('should return medium for spam', () => {
      expect(service.calculateSeverity('spam')).toBe('medium');
    });

    it('should return low for other', () => {
      expect(service.calculateSeverity('other')).toBe('low');
    });

    it('should return info for unknown types', () => {
      expect(service.calculateSeverity('unknown')).toBe('info');
    });
  });
});
