/**
 * Sitemap Service
 * SEO-critical feature for site structure and navigation
 */
import { globalApiClient } from '@client/infrastructure/api/client';

export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export interface Sitemap {
  entries: SitemapEntry[];
  generatedAt: string;
}

export const sitemapService = {
  async fetchSitemap(): Promise<Sitemap> {
    const response = await globalApiClient.get('/sitemap.json');
    return response.data;
  },

  async generateSitemap(): Promise<void> {
    await globalApiClient.post('/api/sitemap/generate');
  },

  async validateSitemap(): Promise<{ valid: boolean; errors: string[] }> {
    const response = await globalApiClient.get('/api/sitemap/validate');
    return response.data;
  },

  getSitemapUrl(): string {
    return `${window.location.origin}/sitemap.xml`;
  },
};
