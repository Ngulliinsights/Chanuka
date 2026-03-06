/**
 * Kenya Gazette Scraper Service
 * 
 * Handles scraping of Kenya Gazette notices:
 * - Bill publications
 * - Government appointments
 * - Land notices
 * - General notices
 * 
 * Extracted from web-scraping.service.ts as part of scraping consolidation.
 * See: docs/chanuka/SCRAPING_CONSOLIDATION_PLAN.md
 */

import { logger } from '../../../infrastructure/observability';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface GazetteNotice {
  notice_number: string;
  publication_date: string;
  category: 'bill' | 'appointment' | 'land' | 'general';
  title: string;
  content: string;
  source_url: string;
  pdf_url?: string;
}

export interface ScrapingResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  metadata: {
    source: string;
    timestamp: string;
    records_found: number;
  };
}

// ============================================================================
// KENYA GAZETTE SCRAPER
// ============================================================================

export class KenyaGazetteScraper {
  private baseUrl = 'https://kenyagazette.go.ke';

  /**
   * Scrape Kenya Gazette notices
   */
  async scrapeGazetteNotices(
    category?: 'bill' | 'appointment' | 'land' | 'general',
    dateRange?: { start: string; end: string }
  ): Promise<ScrapingResult<GazetteNotice>> {
    const result: ScrapingResult<GazetteNotice> = {
      success: false,
      data: [],
      errors: [],
      metadata: {
        source: 'Kenya Gazette',
        timestamp: new Date().toISOString(),
        records_found: 0,
      },
    };

    try {
      logger.info({ component: 'GazetteScraper', category }, 'Scraping Kenya Gazette notices');

      // Fetch the gazette index page
      const response = await fetch(this.baseUrl, {
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChanukaBot/1.0; +https://chanuka.ke)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      // Extract gazette notice links
      const noticeLinks: Array<{ 
        noticeNumber: string; 
        date: string; 
        title: string; 
        url: string; 
        pdfUrl?: string;
        category: string;
      }> = [];

      $('.gazette-notice, .notice-item').each((_: number, element: unknown) => {
        const $el = $(element as any);
        const noticeNumber = $el.find('.notice-number').text().trim();
        const dateText = $el.find('.notice-date, .publication-date').text().trim();
        const title = $el.find('.notice-title, h3, h4').text().trim();
        const link = $el.find('a').attr('href');
        const pdfLink = $el.find('a[href$=".pdf"]').attr('href');
        const categoryText = $el.find('.notice-category, .category').text().trim().toLowerCase();

        if (noticeNumber && link && title) {
          noticeLinks.push({
            noticeNumber,
            date: this.parseDate(dateText),
            title,
            url: this.resolveUrl(link),
            pdfUrl: pdfLink ? this.resolveUrl(pdfLink) : undefined,
            category: this.categorizeNotice(categoryText, title),
          });
        }
      });

      // Filter by category and date range
      const filteredLinks = noticeLinks.filter(item => {
        const matchesCategory = !category || item.category === category;
        const matchesDateRange = !dateRange || (
          new Date(item.date) >= new Date(dateRange.start) &&
          new Date(item.date) <= new Date(dateRange.end)
        );
        return matchesCategory && matchesDateRange;
      });

      logger.info({ component: 'GazetteScraper' }, `Found ${filteredLinks.length} gazette notices`);

      // Process each notice
      for (const link of filteredLinks.slice(0, 20)) { // Limit to 20 for demo
        try {
          const notice = await this.extractGazetteContent(link);
          if (notice) {
            result.data.push(notice);
          }
        } catch (error) {
          const errorMsg = `Failed to extract gazette notice ${link.noticeNumber}: ${error}`;
          logger.error({ component: 'GazetteScraper' }, errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.data.length > 0;
      result.metadata.records_found = result.data.length;

      return result;
    } catch (error) {
      const errorMsg = `Failed to scrape Kenya Gazette: ${error}`;
      logger.error({ component: 'GazetteScraper' }, errorMsg);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Extract content from individual gazette notice
   */
  private async extractGazetteContent(link: {
    noticeNumber: string;
    date: string;
    title: string;
    url: string;
    pdfUrl?: string;
    category: string;
  }): Promise<GazetteNotice | null> {
    try {
      const response = await fetch(link.url, {
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChanukaBot/1.0; +https://chanuka.ke)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const cheerio = await import('cheerio');
      const $ = cheerio.load(html);

      // Extract notice content
      const content: string = $('.notice-content, .gazette-content, .content').text().trim();

      return {
        notice_number: link.noticeNumber,
        publication_date: link.date,
        category: link.category as 'bill' | 'appointment' | 'land' | 'general',
        title: link.title,
        content,
        source_url: link.url,
        pdf_url: link.pdfUrl,
      };
    } catch (error) {
      logger.error({ component: 'GazetteScraper', url: link.url }, `Failed to extract gazette content from ${link.url}`, error);
      return null;
    }
  }

  /**
   * Categorize notice based on content
   */
  private categorizeNotice(categoryText: string, title: string): string {
    const text = `${categoryText} ${title}`.toLowerCase();

    if (text.includes('bill') || text.includes('legislation')) return 'bill';
    if (text.includes('appointment') || text.includes('nomination')) return 'appointment';
    if (text.includes('land') || text.includes('property')) return 'land';
    return 'general';
  }

  /**
   * Parse date from various formats
   */
  private parseDate(dateText: string | undefined): string {
    if (!dateText) {
      const fallback = new Date().toISOString().split('T')[0];
      return fallback ?? '';
    }
    try {
      const date = new Date(dateText);
      if (isNaN(date.getTime())) {
        const fallback = new Date().toISOString().split('T')[0];
        return fallback ?? '';
      }
      const result = date.toISOString().split('T')[0];
      return result ?? '';
    } catch {
      const fallback = new Date().toISOString().split('T')[0];
      return fallback ?? '';
    }
  }

  /**
   * Resolve relative URLs
   */
  private resolveUrl(relativeUrl: string): string {
    if (relativeUrl.startsWith('http')) {
      return relativeUrl;
    }
    return new URL(relativeUrl, this.baseUrl).toString();
  }
}
