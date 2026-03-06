/**
 * Government Data Services
 * 
 * Centralized exports for all government data scraping and processing services.
 */

// Parliament scraping (comprehensive implementation)
export * from './parliament-scraper.service';

// Gazette scraping
export { KenyaGazetteScraper, type GazetteNotice, type ScrapingResult } from './gazette-scraper.service';
